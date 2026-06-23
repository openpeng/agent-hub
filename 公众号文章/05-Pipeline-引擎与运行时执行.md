# Pipeline 运行时架构：步骤调度、模板变量与 OpenTelemetry 集成

> 跨平台 AI Agent 互操作系统深度解析系列（五）

---

## PipelineEngine 的设计定位

PipelineEngine 是 agent-deploy 运行时的核心，负责执行 worker.yaml 中定义的步骤序列。它不是简单的脚本执行器，而是一个集成了条件分支、并行调度、错误重试、配额管理、审计日志和链路追踪的任务编排引擎。

```typescript
export class PipelineEngine {
  constructor(
    private toolRegistry: ToolRegistry,
    private logger: Logger = new ConsoleLogger(),
    quotaOptions?: QuotaOptions,
    auditOptions?: AuditLoggerOptions
  ) {}
}
```

构造函数接收四个依赖：`ToolRegistry`（工具注册表）、`Logger`（日志）、`QuotaOptions`（配额配置）、`AuditLoggerOptions`（审计配置）。这种依赖注入的设计让引擎可以在不同场景（CLI、MCP Server、测试）中复用。

---

## 执行流程

`execute()` 方法是引擎的主循环，流程如下：

```
1. 创建 AbortController（全局超时，默认 5 分钟）
2. 恢复父级 OTel trace context
3. 创建 pipeline.execute span
4. 遍历 steps 数组：
   a. QuotaManager.checkLimits() — 配额预检
   b. evaluateCondition(step.when, context) — 条件评估
   c. expandInvokeShorthand(step) — 语法糖展开
   d. TemplateResolver.resolve(step.args, context) — 变量解析
   e. ToolRegistry.get(step.tool) — 工具查找
   f. tool.execute(resolvedArgs) — 执行工具
   g. applyResultMapping(step.as, result, context) — 结果映射
5. 返回最终 ExecutionContext
```

### 条件执行

每个步骤可以声明 `when` 条件，支持逻辑运算和比较运算：

```yaml
- name: notify_on_failure
  tool: bash
  when: "steps.lint.status == 'failed' && input.notify == true"
  args:
    command: "echo 'Lint failed' | notify-send -"
```

`evaluateCondition` 解析条件表达式，支持 `&&`、`||` 逻辑运算和 `==`、`!=`、`>`、`<` 比较运算。条件为 false 时步骤被跳过，不消耗配额。

### invoke 语法糖展开

```yaml
# 语法糖
- name: lint
  invoke: linter-agent
  input: "{{steps.read_source.output}}"

# 展开为
- name: lint
  tool: invoke_agent
  args:
    agent: linter-agent
    input: "{{steps.read_source.output}}"
```

`expandInvokeShorthand` 将简洁的 `invoke` 语法展开为完整的 `tool: invoke_agent + args` 格式，降低 YAML 的冗余度。

---

## 模板变量解析

`TemplateResolver` 负责将 `{{...}}` 占位符替换为 ExecutionContext 中的实际值：

```typescript
class TemplateResolver {
  resolve(args: Record<string, any>, context: ExecutionContext): Record<string, any> {
    // 递归遍历 args 对象的所有字符串值
    // 匹配 /\{\{([^}]+)\}\}/g 正则
    // 从 context 中按点路径深取值
    // 返回替换后的新对象（不修改原对象）
  }
}
```

支持三种变量来源：

| 语法 | 解析路径 | 示例 |
|------|----------|------|
| `{{input.key}}` | `context.initialArgs.key` | 用户传入的参数 |
| `{{shared.key}}` | `context.sharedContext.key` | 步骤间共享数据 |
| `{{steps.name.output}}` | `context.steps[name].output` | 指定步骤的输出 |

变量解析是递归的——如果一个步骤的输出本身包含 `{{...}}` 占位符，引擎会继续解析直到没有剩余占位符（有最大深度限制防止无限递归）。

`applyResultMapping` 中还有一个内联的简化版模板解析器，用于将步骤输出通过 `as` 字段映射到 `shared_context`：

```typescript
function applyResultMapping(mapping, result, context) {
  for (const [key, template] of Object.entries(mapping)) {
    const resolved = template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
      return getNestedValue(result, path);
    });
    context.sharedContext[key] = resolved;
  }
}
```

---

## 并行调度

当步骤声明 `invoke_parallel` 时，引擎使用 `Promise.allSettled` 并发执行所有子代理：

```yaml
- name: parallel_checks
  invoke_parallel:
    - agent: grammar-agent
      input: "{{steps.draft.output}}"
    - agent: fact-checker
      input: "{{steps.draft.output}}"
    - agent: style-agent
      input: "{{steps.draft.output}}"
```

```typescript
private async executeParallel(agents, context): Promise<void> {
  const promises = agents.map(agent =>
    this.executeStep({ tool: 'invoke_agent', args: agent }, context)
  );
  const results = await Promise.allSettled(promises);
  // 收集所有结果，部分失败不影响整体
}
```

`Promise.allSettled` 而非 `Promise.all` 的选择是有意的——并行任务中单个子代理的失败不应中断其他子代理的执行。所有结果（成功和失败）都会被收集到 ExecutionContext 中。

---

## 错误处理与重试

每个步骤可以声明 `on_fail` 策略：

```yaml
- name: fetch_api
  tool: web_fetch
  args:
    url: "{{input.api_url}}"
  on_fail:
    strategy: retry
    max_retries: 3
    backoff: exponential
    initial_delay_ms: 1000
    max_delay_ms: 30000
    jitter: 0.25
```

`handleError` 方法支持四种策略：

| 策略 | 行为 |
|------|------|
| `abort` | 终止整个 Pipeline，返回错误 |
| `skip` | 跳过当前步骤，**不记录错误**（后续 `when` 条件不会检测到失败） |
| `continue` | 继续执行，**记录错误**（后续 `when` 条件可检测到失败） |
| `retry` | 指数退避重试，支持 jitter |

退避算法实现：

```typescript
function computeBackoff(attempt, config) {
  const { initial_delay_ms, max_delay_ms, backoff, jitter } = config;
  let delay;
  if (backoff === 'exponential') {
    delay = initial_delay_ms * Math.pow(2, attempt - 1);
  } else {
    delay = initial_delay_ms; // fixed
  }
  // 应用 jitter: ±25%
  if (jitter) {
    const factor = 1 + (Math.random() * 2 - 1) * jitter;
    delay = delay * factor;
  }
  return Math.min(delay, max_delay_ms);
}
```

jitter 的作用是防止多个 Agent 同时重试时产生"惊群效应"——随机化退避时间让重试请求分散开来。

---

## ToolRegistry：原型链模式的工具查找

```typescript
class ToolRegistry {
  private tools = new Map<string, Tool>();
  private parent: ToolRegistry | null = null;

  get(name: string): Tool | undefined {
    const tool = this.tools.get(name);
    if (tool) return tool;
    if (this.parent) return this.parent.get(name);
    return undefined;
  }

  createChild(): ToolRegistry {
    const child = new ToolRegistry();
    child.parent = this;
    return child;
  }
}
```

ToolRegistry 的查找机制类似 JavaScript 的原型链：子注册表优先查找本地工具，找不到则递归向上查找父级。这保证了子 Agent 继承父级的全部工具，同时可以覆盖同名工具而不影响父级。

`ToolRegistry.attach(registry, context)` 将注册表实例挂载到 ExecutionContext 上，使嵌套的 `invoke_agent` 调用能访问到父级的工具集。

---

## Docker 沙箱

bash 工具的命令执行通过 Docker 沙箱隔离：

```typescript
interface SandboxRuntime {
  execute(command: string, options: SandboxOptions): Promise<SandboxResult>;
  cleanup(): Promise<void>;
}
```

当前实现为 `DockerSandbox`，通过 Docker CLI 参数实现多层隔离：

| 安全措施 | Docker 参数 | 作用 |
|----------|------------|------|
| 网络隔离 | `--network none` | 禁止网络访问 |
| CPU 限制 | `--cpus {limit}` | 限制 CPU 使用 |
| 内存限制 | `--memory {limit}` + `--memory-swap {limit}` | 限制内存且禁止 swap |
| 禁止提权 | `--security-opt no-new-privileges:true` | 防止获取额外权限 |
| 最小权限 | `--cap-drop ALL` | 丢弃所有 Linux capabilities |
| 自动清理 | `--rm` | 容器退出后自动删除 |

容器名使用 `crypto.randomBytes(8)` 生成，避免命名冲突。`activeContainers: Set<string>` 跟踪所有活跃容器，`cleanup()` 方法强制清理。

---

## OpenTelemetry 集成

Pipeline 引擎在关键节点创建 OTel span：

```typescript
// pipeline 级别 span
const span = tracer.startSpan('pipeline.execute', {
  attributes: { 'pipeline.name': agentName, 'pipeline.steps': steps.length }
});

// 每个步骤 span
const stepSpan = tracer.startSpan(`step.${step.name}`, {
  attributes: { 'step.tool': step.tool, 'step.index': index }
});
```

trace context 通过 `ExecutionContext.otelContext` 在父子 Agent 间传播，实现分布式链路追踪。配合 Prometheus + Grafana，可以监控 Agent 的执行频率、成功率、延迟分布和资源消耗。

---

## AgentExecutor：运行时的统一入口

`AgentExecutor.execute()` 是整个运行时的外观模式（Facade），封装了完整的执行流程：

```
resolveAgentDir() → 加载 agent.json
    ↓
V2CompatibilityLayer → 格式兼容处理
    ↓
WorkerYamlParser.validate() → YAML 校验
    ↓
注册 9 个内置工具（ReadFile, WriteFile, Bash, Glob, LLMChat, WebFetch, WebSearch, invokeAgent, listAgents）
    ↓
MCPToolLoader → 加载外部 MCP 工具
    ↓
SkillLoader → 加载 Skills
    ↓
PolicyEngine → 加载安全策略
    ↓
构建 ExecutionContext（合并 overrides）
    ↓
PipelineEngine.execute() → 执行 Pipeline
```

`AgentOverrides` 接口定义了 8 个可覆盖维度：instructions、skills、mcp_servers、shared_context、trusted、policyLevel、cwd、env。合并逻辑采用"基础 + 覆盖"模式，overrides 优先于原始配置。

---

**项目地址**：[https://github.com/openpeng/agent-hub](https://github.com/openpeng/agent-hub)

**上一篇**：《adapt.ts 适配引擎：策略模式与 Pipeline-to-Prompt 翻译》

**下一篇**：《Market 后端工程：SQLite WAL、三阶段安全扫描与滑动窗口限流》
