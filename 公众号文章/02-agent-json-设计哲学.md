# agent.json v3.0 协议深度解析：subagent 模型与 4 层 fallback 策略

> 跨平台 AI Agent 互操作系统深度解析系列（二）

---

## 从 v2 到 v3：一次架构级演进

agent.json v2.0 的模型很直观：一个 Agent = 一段 instructions + 若干 capabilities。这足以描述简单的对话式 Agent，但当 Agent 需要执行多步骤任务、调用外部工具、与其他 Agent 协作时，v2 的扁平结构就显得力不从心。

v3.0 引入了两个关键概念：**subagent 模型** 和 **entry 入口声明**。

```json
{
  "schema_version": "3.0",
  "identity": {
    "name": "code-reviewer",
    "version": "1.2.3",
    "description": "Automated code review with multi-pipeline analysis",
    "author": "team@example.com"
  },
  "entry": {
    "main_subagent": "review-pipeline"
  },
  "subagents": [
    {
      "name": "review-pipeline",
      "path": "workers/review.yaml",
      "description": "Main review pipeline orchestrator"
    },
    {
      "name": "security-scanner",
      "path": "workers/security.yaml",
      "description": "Security vulnerability detection"
    }
  ],
  "dependencies": {
    "python3": ">=3.10",
    "llm_provider": "anthropic"
  }
}
```

`entry.main_subagent` 指定执行入口，`subagents` 数组声明所有子代理及其对应的 `worker.yaml`。每个 subagent 拥有独立的 Pipeline 定义、工具集和执行策略。运行时通过 `AgentExecutor.resolveAgentDir()` 解析入口，加载对应的 worker.yaml 启动执行。

这种设计的优势在于：一个 Agent 可以内部组合多个专业化的子代理（审查、安全扫描、性能分析），每个子代理有独立的 YAML Pipeline，但对外暴露统一的 agent.json 接口。

---

## identity 字段的工程约束

`identity` 不是简单的元数据，它携带了工程约束：

```json
{
  "identity": {
    "name": "code-reviewer",
    "version": "1.2.3",
    "description": "Automated code review with multi-pipeline analysis",
    "author": "team@example.com"
  }
}
```

Schema 层面施加了严格的正则约束：

- `name`：`^[a-z0-9]+(-[a-z0-9]+)*$`（kebab-case，用于文件路径和 URL 安全）
- `version`：`^\d+\.\d+\.\d+(-[a-z0-9]+)?$`（SemVer，支持预发布标识）
- `description`：10-200 字符（确保 Market 搜索结果有足够信息量）
- `tags`：1-10 个 kebab-case 字符串

这些约束不是随意设定的。kebab-case 的 name 可以直接用作文件名（`code-reviewer/`）和 URL 路径（`/api/v1/agents/code-reviewer`），无需额外转义。SemVer 的 version 支持语义化版本比较（`>=1.2.0 <2.0.0`），是依赖解析的基础。

---

## instructions 的三种格式

v3.0 的 `instructions` 字段支持三种格式，对应不同的使用场景：

**内联字符串（v2 兼容）**：
```json
{ "instructions": "You are a code review assistant..." }
```

**结构化对象（推荐）**：
```json
{
  "instructions": {
    "format": "markdown",
    "source": "inline",
    "content": "# Code Reviewer\n\n## Review Criteria\n\n..."
  }
}
```

**外部文件引用**：
```json
{
  "instructions": {
    "format": "markdown",
    "source": "file",
    "file": "instructions.md"
  }
}
```

`format` 支持 markdown、yaml、json、text。`source` 可以是 `inline` 或 `file`。当使用 `file` 模式时，路径相对于 agent.json 所在目录，整个 Agent 目录可以整体移动而不丢失引用。

---

## 4 层 fallback 指令加载策略

这是 adapt.ts 中最精巧的设计。当系统需要获取一个 Agent 的指令内容时，按以下优先级逐层尝试，前一层成功则跳过后续层：

```
Layer 1: agent.json 的 instructions 字段
    ↓ (失败或不存在)
Layer 2: 从 subagents 自动生成（拼接子代理列表为 Markdown）
    ↓ (失败或不存在)
Layer 3: SKILL.md 文件（已废弃，stripFrontmatter 去除 YAML 头）
    ↓ (失败或不存在)
Layer 4: README.md 文件（最终兜底）
```

外层还有一层文件级 fallback：先尝试加载 `agent.json`，解析失败则 fallback 到 `SKILL.md`。这意味着即使没有 agent.json，一个只有 SKILL.md 的旧项目也能被系统识别和适配。

这个策略的价值在于：**零迁移成本**。存量项目无需任何修改就能被 Agent Hub 识别，同时新项目可以享受 v3.0 的完整能力。V2CompatibilityLayer 在运行时自动处理格式检测和转换。

---

## dependencies：运行时依赖声明

```json
{
  "dependencies": {
    "python3": ">=3.10",
    "nodejs": ">=18.0.0",
    "llm_provider": "anthropic",
    "agents": [
      { "ref": "market://linter-agent", "version": "^1.0.0" }
    ]
  }
}
```

dependencies 分两类：

- **运行时环境**：`python3`、`nodejs`、`llm_provider`（anthropic/openai/azure/any），用于执行前检查环境是否满足要求
- **Agent 依赖**：`agents` 数组，声明依赖的其他 Agent。`ref` 支持 `market://` 协议，`version` 支持 SemVer 范围。运行时通过 `DependencyResolver` 自动从 Market 下载并缓存

---

## team.json：三种协作模式的工程实现

team.json 的核心是 `definition` 字段，定义了团队的协作模式：

```json
{
  "definition": {
    "mode": "coordinate",
    "leader": {
      "name": "team-leader",
      "model": "claude-sonnet-4",
      "instructions": "Coordinate the team to produce a technical document."
    },
    "members": [
      { "ref": "market://tech-researcher", "alias": "researcher", "role": "research" },
      { "ref": "market://tech-writer", "alias": "writer", "role": "writing" }
    ],
    "shared_state": {
      "enabled": true,
      "storage": "memory",
      "fields": ["topic", "outline", "draft", "final"]
    }
  }
}
```

三种模式的工程差异：

| 模式 | Leader | 路由逻辑 | 适用场景 |
|------|--------|----------|----------|
| `route` | 无 | 按任务特征匹配成员能力 | 简单分发 |
| `collaborate` | 可选 | 多成员平等参与，结果聚合 | 头脑风暴、评审 |
| `coordinate` | 必选 | Leader 分配任务、收集结果、综合输出 | 复杂多步任务 |

`shared_state` 是一个可选的共享状态机制，支持 `memory`（进程内）、`file`（文件系统）、`redis`（分布式）三种存储后端。成员通过声明的 `fields` 进行状态读写，实现无直接通信的协作。

---

## workflow.json：6 种步骤类型与数据流

workflow.json 的 `definition.steps` 定义了执行流水线：

```json
{
  "definition": {
    "inputs": [
      { "name": "topic", "type": "string", "required": true },
      { "name": "depth", "type": "number", "default": 3 }
    ],
    "outputs": [
      { "name": "report", "type": "string" }
    ],
    "steps": [
      {
        "name": "research",
        "type": "team",
        "ref": "market://doc-production-team"
      },
      {
        "name": "quality_check",
        "type": "condition",
        "condition": "${research.score} >= 80",
        "then": { "name": "publish", "type": "agent", "ref": "market://publisher" },
        "else": { "name": "revise", "type": "agent", "ref": "market://editor" }
      },
      {
        "name": "batch_process",
        "type": "parallel",
        "steps": [
          { "name": "translate", "type": "agent", "ref": "market://translator" },
          { "name": "format", "type": "agent", "ref": "market://formatter" }
        ]
      },
      {
        "name": "iterate",
        "type": "loop",
        "step": { "name": "improve", "type": "agent", "ref": "market://improver" },
        "max_iterations": 5,
        "until": "${improve.score} >= 95"
      }
    ]
  }
}
```

6 种步骤类型覆盖了常见的编排模式：

- `agent` / `team`：调用外部实体，通过 `ref` 引用 Market 或本地资源
- `function`：调用自定义函数（用户定义的扩展点）
- `condition`：条件分支，支持 `${expr}` 表达式
- `parallel`：并行执行子步骤数组
- `loop`：循环执行直到满足 `until` 条件，`max_iterations` 防止无限循环（1-100，默认 10）

数据流通过 `${stepName.outputField}` 语法实现。`${input.topic}` 引用 Workflow 输入，`${research.notes}` 引用 research 步骤的输出字段。这种语法与 Pipeline 引擎的 `{{steps.xxx.output}}` 语法不同——前者用于 Workflow 层的步骤间引用，后者用于 Pipeline 内部的模板变量解析。

---

## 为什么是 JSON 而不是 YAML

一个常见的问题是：为什么不使用 YAML 定义 Agent？

工程考量有三点：

1. **Schema 验证**：JSON Schema 是 W3C 标准，有成熟的验证工具链（ajv、jsonschema）。YAML 的 schema 验证生态相对薄弱
2. **安全性**：JSON 不支持执行任意代码、不引用外部文件（除非显式声明）。YAML 的标签系统曾导致过远程代码执行漏洞（如 PyYAML 的 `!!python/object`）
3. **解析确定性**：JSON 的类型系统是明确的（string/number/boolean/null/array/object）。YAML 的类型推断（`true` vs `"true"`、`1.0` vs `"1.0"`）在不同解析器间可能不一致

而 Pipeline 定义使用 YAML，是因为 YAML 的缩进结构更适合表达步骤序列和嵌套关系，且 Pipeline 在受控环境中执行，安全性风险可控。

---

**项目地址**：[https://github.com/openpeng/agent-hub](https://github.com/openpeng/agent-hub)

**上一篇**：《Agent Hub：用一份 Schema 统治 9 个 AI 编码工具的 Agent 生态》

**下一篇**：《adapt.ts 适配引擎：策略模式与 Pipeline-to-Prompt 翻译》
