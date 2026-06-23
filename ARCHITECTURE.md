# Agent Gateway Architecture

> Agent Hub 架构：从「部署工具」升级为「部署 + 发现 + 执行」三合一 Agent 网关

## 一、上下文四层模型

Agent 执行时看到的上下文是四层叠加：

```
Layer 4: ExecutionContext (运行时状态)
  · sharedContext   ← 管道步骤间共享数据 {{shared.key}}
  · steps           ← Map<步骤名, StepResult>
  · initialArgs     ← execute_agent 传入的 input
  · instructions    ← ★ 新增：被覆盖后的 system_prompt

Layer 3: ToolRegistry (工具集)
  · builtin tools   ← 8个内置工具
  · MCP tools       ← 外部MCP server挂载的工具
  · skills          ← 管道片段注册为可调用工具
  · sub-agents      ← agent/xxx 形式的子agent包装器

Layer 2: worker.yaml (管道定义)
  · pipeline        ← 步骤序列
  · shared_context  ← 管道级共享变量初始值

Layer 1: agent.json (Agent元数据)
  · instructions    ← Agent行为定义 → llm_chat 的 system_prompt
  · dependencies    ← 依赖的其他agent
  · subagents       ← 声明的子agent列表
```

### 四层属性一览

| 层 | 数据来源 | 生命周期 | 可被 overrides 覆盖 |
|----|---------|---------|-------------------|
| Layer 1: agent.json | 文件 / market 下载 | 持久化 | instructions ↔ overrides.instructions |
| Layer 2: worker.yaml | 同上 | 持久化 | 一般不变 |
| Layer 3: ToolRegistry | builtin + config 文件 | 每次执行新建 | skills ↔ overrides.skills, mcp ↔ overrides.mcp_servers |
| Layer 4: ExecutionContext | 执行时创建 | 单次执行 | shared_context ↔ overrides.shared_context |

## 二、进程通信全景

```
                 stdio (JSON-RPC 2.0)
  ┌──────────┐ ◄───────────────────► ┌───────────────────────────────────────┐
  │ MCP Host │                        │ agent-hub MCP Server (index.ts)     │
  │(CB,Cur..)│                        │                                       │
  └──────────┘                        │ 已有工具(7): deploy/import/upload...   │
                                      │                                       │
                                      │ ★ 新增工具(2):                         │
                                      │  · list_agents   → 发现可用agent       │
                                      │  · execute_agent → 执行agent(带覆盖)  │
                                      │                                       │
                                      │ 内部链路 (全进程内函数调用):            │
                                      │  execute_agent                         │
                                      │    → AgentExecutor.execute()           │
                                      │      → AgentResolver.resolve() 来源    │
                                      │      → load agent.json + worker.yaml   │
                                      │      → mergeOverrides() 覆盖合并       │
                                      │      → ToolRegistry 构建               │
                                      │      → ExecutionContext 创建           │
                                      │      → PipelineEngine.execute() 执行   │
                                      └───────────────────────────────────────┘
```

| 通信层 | 协议 | 边界 |
|--------|------|------|
| MCP Host ↔ agent-hub | JSON-RPC 2.0 / stdio | 进程间 |
| agent-hub 内部 | 函数调用 | 同进程 |
| invoke_agent 子agent | 函数调用 | 同进程 |
| MCP 外部工具 | JSON-RPC 2.0 / HTTP | 跨进程 |
| Market 下载 | HTTP REST | 跨进程 |

## 三、模块架构

```
agent-hub/node/src/
│
├── index.ts                 ← MCP Server 入口
│   ★ list_agents 工具
│   ★ execute_agent 工具
│
├── runtime/
│   ├── agent-executor.ts    ← ★ 核心编排（新增）
│   │   被 CLI 和 MCP 共用
│   │
│   ├── pipeline.ts           ← 管道引擎（已有）
│   ├── types.ts              ← ★ 扩展 instructions 字段
│   ├── context.ts            ← ★ 扩展 instructions 存取
│   ├── tool-registry.ts      ← 分层工具注册表（已有）
│   ├── policy.ts             ← 安全策略（已有）
│   │
│   ├── mcp-integration.ts    ← ★ 扩展 registerFromConfig()
│   ├── skill-integration.ts  ← ★ 扩展 registerFromDefs()
│   ├── memory-integration.ts ← 不变
│   │
│   ├── builtin-tools/
│   │   ├── invoke-agent.ts   ← ★ 扩展 overrides 支持
│   │   └── list-agents.ts    ← ★ 扩展市场发现
│   │
│   └── tools/                ← 8个内置工具（不变）
│
└── cli.ts                    ← run 命令改用 agent-executor
```

## 四、覆盖合并策略

### execute_agent 接口

```typescript
interface AgentExecuteOptions {
  agent: string;           // 名称 / 路径 / market://URL
  input?: Record<string, any>;
  overrides?: {
    instructions?: string;                         // 直接替换
    skills?: SkillDefinition[];                    // 同名覆盖，不同名追加
    mcp_servers?: Record<string, MCPServerEntry>;  // 同名覆盖，不同名追加
    shared_context?: Record<string, any>;          // 按key合并
    trusted?: boolean;                             // 直接替换
    cwd?: string;
    env?: Record<string, string>;                  // 按key合并
  };
}
```

### 合并规则

| 字段 | 策略 | 示例 |
|------|------|------|
| instructions | 直接替换 | "代码助手" → "Go专家" |
| skills | Map<name> 同名覆盖 | [a,b] + [b,c] → [a,b*,c] |
| mcp_servers | Map<key> 同名覆盖 | {x,y} + {x*,z} → {x*,y,z} |
| shared_context | Object.assign | {a:1} + {a:2,b:3} → {a:2,b:3} |
| trusted | 直接替换 | false → true |
| env | Object.assign | 同上 |

## 五、关键数据流

### instructions 覆盖

```
execute_agent({ overrides: { instructions: "您是Go专家..." } })
  → AgentExecutor 读取 agent.json 默认 instructions（兜底）
  → overrides.instructions 非空 → 替换
  → 存入 ExecutionContext.instructions
  → llm_chat 工具读取: context.instructions || agent_default
  → SystemMessage(instructions) + HumanMessage(prompt) → LLM
```

### Agent 来源解析

```
"code-reviewer"     → 兄弟目录 → cwd → market:// 下载 → 报错
"./agents/cr"        → 相对路径解析
"/absolute/path"     → 绝对路径
"market://cr@1.0"   → AgentCache 检查 → HTTP 下载 → 缓存
```

## 六、改动清单

| # | 文件 | 操作 |
|---|------|------|
| 1 | ARCHITECTURE.md | 新增 |
| 2 | runtime/types.ts | 修改: ExecutionContext +instructions |
| 3 | runtime/context.ts | 修改: create/存取 instructions |
| 4 | runtime/mcp-integration.ts | 修改: +registerFromConfig() |
| 5 | runtime/skill-integration.ts | 修改: +registerFromDefs() |
| 6 | runtime/agent-executor.ts | 新增: 核心编排 |
| 7 | runtime/builtin-tools/invoke-agent.ts | 修改: 支持 overrides |
| 8 | runtime/builtin-tools/list-agents.ts | 修改: 市场发现 |
| 9 | index.ts | 修改: +2个MCP工具 |
| 10 | cli.ts | 修改: run改用agent-executor |
