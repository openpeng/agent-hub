# CODEBUDDY.md

## 项目概述

Agent Hub 是一个跨平台 AI Agent 互操作系统，现已升级为 **部署 + 发现 + 执行** 三合一 Agent 网关。核心理念: **agent.json 为唯一真相来源**，消除 AI 工具锁定。

## 关键路径

| 组件 | 路径 | 技术栈 |
|------|------|--------|
| 部署工具 (主) | `agent-deploy/node/` | TypeScript 5.7, Node.js 18+ |
| Runtime 引擎 | `agent-deploy/node/src/runtime/` | TypeScript, YAML Pipeline |
| Market 服务 | `agent-market/` | Python 3.10, FastAPI, aiosqlite |
| Agent 协议 | `agent-protocol/specs/` | Markdown 规范文档 |

## 常用命令

```bash
cd agent-deploy/node
npm run build      # tsc && cp src/templates/*.json dist/templates/
npm test           # Vitest, 345+ tests
npm run lint       # ESLint
npm run format     # Prettier

cd agent-market
pip install -r requirements.txt && pytest
```

## 核心文件

| 文件 | 职责 |
|------|------|
| `agent-deploy/node/src/cli.ts` | CLI 入口，11 命令 |
| `agent-deploy/node/src/adapt.ts` | Export (agent.json → AI 工具) |
| `agent-deploy/node/src/import.ts` | Import (AI 工具 → agent.json) |
| `agent-deploy/node/src/runtime/agent-executor.ts` | Agent 执行编排（新增）- CLI 和 MCP 共用 |
| `agent-deploy/node/src/runtime/pipeline.ts` | Pipeline 执行引擎 |
| `agent-deploy/node/src/runtime/tools/` | 8 内置工具 |
| `agent-deploy/node/src/runtime/policy.ts` | 安全策略与沙箱 |
| `agent-market/src/market/server.py` | REST API |
| `agent-market/src/market/database.py` | SQLite 数据库 |

## 架构约定

1. **agent.json 是唯一真相来源** — 所有操作以此为基准
2. **零破坏性变更** — 保持 100% 向后兼容
3. **Context-based ToolRegistry** — 无全局状态，通过 ExecutionContext 传递
4. **默认不信任** — 所有 Agent 默认受限，需 `--trusted` 显式授权
5. **工具可返回Error** — 一般工具返回 `{success:false,error}`；invoke_agent 子Agent失败应 throw 让 Pipeline on_fail/retry 接管
6. **agent context 双路径** — 同时设置 `{ name }` 和 `{ identity: { name } }`

## 开发注意事项

### Agent 协作模式

```yaml
# 串行调用（独立步骤）
- step: step_a
  invoke: agent-a
  with: { key: "{{val}}" }
- step: step_b
  invoke: agent-b
  with: { key: "{{steps.step_a.output}}" }

# 并行调用（同时启动，耗时 = max(各自耗时)）
- step: parallel_work
  invoke_parallel:
    - agent: agent-a
      with: { key: "val1" }
    - agent: agent-b
      with: { key: "val2" }
  on_fail: continue    # 部分失败继续
  as:                  # 提取结果到 shared_context
    total: "{{total}}"
    ok: "{{succeeded}}"

# 调用级重试（应对 LLM 503 瞬时故障）
- step: call_llm
  invoke: agent-with-llm
  with: { input: "{{val}}" }
  on_fail:
    retry:
      max_attempts: 3
      backoff: "exponential"
      initial_delay_ms: 2000
```

### Context/Env 传递链路

```
process.env → cli.ts envVars → ExecutionContext.env → invoke_agent getAllEnv → 子Agent.env
```

- **必须**在创建 ExecutionContext 时传入 `env: { ...process.env }`
- invoke_agent 创建子 context **必须**调用 `getAllEnv(parentCtx)` 继承环境变量
- 子Agent 创建时必须同步调用 `getPolicyRegistry().propagateTrust(parent, child)`

### 模板变量系统

- 支持 `{{var}}`、`{{steps.X.output}}`、`{{shared.key}}`、`{{env.KEY}}`
- 支持深层属性 `{{steps.X.output.content.field}}`（TemplateResolver 级联访问）
- 单变量 `{{var}}` 保持类型；多变量字符串中执行 `String(value)` 转换
- worker.yaml 变量名与 Pipeline 参数命名空间共享，避免冲突

### LLM 工具配置

- API Key 回退链: `args.api_key → env.ANTHROPIC_API_KEY → env.ANTHROPIC_AUTH_TOKEN`
- API Base 回退链: `args.api_base → env.ANTHROPIC_BASE_URL → env.OPENAI_BASE_URL`
- 模型回退链: `args.model → env.ANTHROPIC_MODEL → env.OPENAI_MODEL → 硬编码默认`
- 默认模型: `claude-3-5-sonnet-latest`（兼容性优于 `-20241022`）

### 构建流程

```bash
# 编译 + 复制模板资源（tsc 不会自动复制 .json）
tsc && cp src/templates/*.json dist/templates/
```

### 路径处理

- Windows 环境使用正斜杠 `/`
- 使用 `path.resolve()` 统一规范化
- 子Agent路径解析: 兄弟目录 → cwd → Market 回退

## 当前状态

- Phase 1-8 全部完成 (345+ tests, 100% pass)
- 详见 `STATUS.md`

### 场景演练经验

**daily-report 模板**:
```
子Agent路径: invoke子Agent时子Agent cwd=自身目录 → 文件引用需传相对路径
invoke_parallel: text-summarizer(100s) 与 notification-agent(1s) 并行 → 总耗100s
Trace ID: 父Agent生成 → invoke_agent 透传 → 所有子Agent日志共享同一 trace_id
Provider降级: llm_chat 捕获 5xx → 自动尝试下一个 provider → 日志清晰
on_fail continue: LLM失败后 pipeline 继续 → save_report 仍正常执行

关键约定:
- 跨Agent文件引用: `../calling-agent-dir/file.md` (相对于子Agent cwd)
- Trace ID 透传: invoke_agent 自动从 parent context 复制到 child context
- LLM 降级链: FALLBACK_ORDER = [anthropic, openai_compatible]

### 文档位置

- 项目概览: `agent-deploy/docs/PROJECT_OVERVIEW.md` (Markdown) / `agent-deploy/docs/index.html` (网页)
- 快速开始: `docs/QUICK_START.md`
- Agent开发: `docs/AGENT_DEV_GUIDE.md`
- 排错手册: `docs/TROUBLESHOOTING.md`
- Market API: `docs/API.md`
- 安全模型: `docs/SECURITY.md`

### 常用工作流

**下载Agent并运行**:
```bash
agent-deploy use <agent-id> -m http://localhost:8321
agent-deploy run ./agents/<agent-id> --trusted --args "key=value"
```

**本地开发Agent**:
```bash
agent-deploy init agent-builder -n my-agent
cd my-agent && vim worker.yaml
agent-deploy run . --verbose --trusted
```

**验证环境隔离**: `agent-deploy use` 默认只下载到 `./agents/`，不污染全局配置。
**清理全局**: `agent-deploy clean`（自动跳过 tapd/flow-mcp/codebuddy/claude/cursor 等保护列表中的系统工具）

---

## Agent Gateway (Phase 8 新增)

### MCP 工具扩展（7 → 9 个）

| 新增工具 | 功能 |
|----------|------|
| `execute_agent` | 执行 Agent，支持 8 种动态覆盖 |
| `list_agents` | 发现可用 Agent（本地 + Market） |

### execute_agent 动态覆盖（Overrides）

| 字段 | 策略 | 说明 |
|------|------|------|
| `instructions` | 直接替换 | 覆盖 agent.json 的 instructions → llm_chat 的 system_prompt |
| `skills` | 同名覆盖 | 与 agent 默认 skills 合并，不同名追加 |
| `mcp_servers` | 同名覆盖 | 与 agent 默认 MCP 合并，不同名追加 |
| `shared_context` | 合并 | 注入 ExecutionContext.sharedContext |
| `trusted` | 直接替换 | 安全模式切换 |
| `cwd` | 直接替换 | 工作目录 |
| `env` | 合并 | 环境变量 |

### 核心模块

| 文件 | 职责 |
|------|------|
| `node/src/runtime/agent-executor.ts` | Agent 执行编排（新增） |
| `node/src/runtime/mcp-integration.ts` | MCP 工具集成（扩展 +registerFromConfig） |
| `node/src/runtime/skill-integration.ts` | Skill 集成（扩展 +registerFromDefs） |
| `node/src/runtime/builtin-tools/invoke-agent.ts` | 子Agent调用（扩展 overrides） |
| `node/src/runtime/builtin-tools/list-agents.ts` | Agent发现（扩展市场） |
| `node/src/index.ts` | MCP Server（扩展 +2 工具） |

### 架构文档

详见 `ARCHITECTURE.md`。
