# Agent Hub：用一份 Schema 统治 9 个 AI 编码工具的 Agent 生态

> 跨平台 AI Agent 互操作系统深度解析系列（一）

---

## 问题域：N 个工具，N 种方言

2025 年以来，AI 编码工具呈爆发式增长。Cursor、Claude Code、GitHub Copilot、Windsurf、Trae、Aider、OpenCode……每个工具都在构建自己的 Agent 生态，但各自定义了一套互不兼容的 Agent 描述格式。

从工程角度看，这造成了一个典型的 **N×M 问题**：N 个 Agent 定义 × M 个平台格式 = N×M 份配置文件。每新增一个平台或修改一个 Agent，维护成本呈线性增长。

更深层的问题在于 **知识资产的不可迁移性**。一个精心调优的代码审查 Agent，其核心价值在于 instructions 中的领域知识和推理策略，但这些知识被锁死在特定平台的配置格式里，无法跨工具复用。

Agent Hub 的工程目标是：**用一份 Schema 定义 Agent，通过自动化适配层消除 N×M 问题，实现一次编写、处处运行。**

---

## 系统架构

Agent Hub 由五个核心模块组成，各司其职：

```
agent-protocol    ← Schema 定义层（agent.json / team.json / workflow.json）
    ↓
agent-builder     ← 前端构建层（React SPA，可视化创建 + AI 辅助填写）
    ↓
agent-deploy      ← 适配与执行层（9 平台适配 + Pipeline 运行时 + MCP Server）
    ↓
agent-market      ← 分发层（FastAPI 后端，搜索/评分/版本管理/安全扫描）
    ↓
agent-compose     ← 编排层（子 Agent 调用 + 动态覆盖 + 依赖解析）
```

数据流方向是单向的：Schema 定义 → 构建 → 适配/执行 → 分发。每个模块通过明确的接口契约与上下游交互。

---

## agent-protocol：三种 Schema，覆盖单 Agent 到多 Agent 协作

协议层定义了三种 JSON Schema，分别对应不同的抽象层级：

| Schema | 版本 | 解决的问题 |
|--------|------|------------|
| `agent.schema.json` | v3.0 | 单 Agent 的身份、行为、能力、子代理定义 |
| `team.schema.json` | v1.0 | 多 Agent 协作团队的成员关系和协作模式 |
| `workflow.schema.json` | v1.0 | 跨 Agent/Team 的任务流水线编排 |

agent.json v3.0 的核心设计引入了 **subagent 模型**：一个 Agent 由多个 subagent 组成，每个 subagent 对应一个 `worker.yaml`，通过 `entry.main_subagent` 指定入口。这与传统"一个 Agent = 一段 prompt"的模型有本质区别——它允许一个 Agent 内部包含多个专业化的子代理，各自拥有独立的工具集和执行策略。

team.json 定义了三种协作模式：`route`（按任务特征路由到成员）、`collaborate`（多成员平等协作）、`coordinate`（Leader 统筹协调）。成员引用支持三种协议：`market://`（市场资源）、`local://`（本地路径）、内联定义。

workflow.json 支持 6 种步骤类型：`agent`、`team`、`function`、`condition`、`parallel`、`loop`，通过 `${stepName.outputField}` 语法实现步骤间的数据传递。

---

## agent-deploy：适配引擎 + 运行时 + MCP Server 三位一体

agent-deploy 是系统的工程核心，承担三个职责：

**适配引擎（adapt.ts）**：将 `AgentDescriptor` 翻译为 9 种平台格式。核心是一个策略模式的 switch 分支，每个分支处理目标平台的格式差异——输出路径、文件命名、内容结构。对于不支持某些特性的平台，4 层 fallback 指令加载策略（agent.json instructions → subagents 自动生成 → SKILL.md → README.md）确保 100% 向后兼容。

**Pipeline 运行时**：基于 YAML 定义的步骤序列执行引擎。通过 `TemplateResolver` 解析 `{{steps.xxx.output}}`、`{{shared_context.xxx}}` 等模板变量，支持条件执行（`when` 字段）、并行调用（`invoke_parallel` + `Promise.allSettled`）、错误重试（指数退避 + 25% jitter）。工具注册表采用原型链模式，子 Agent 继承父级工具集并可覆盖。

**MCP Server 模式**：作为 MCP Server 运行时暴露 22 个标准工具，覆盖 Agent/Team/Workflow 三种实体的完整生命周期管理。AI 工具可以通过 MCP 协议直接调用 agent-deploy 的能力。

安全方面，运行时集成了 Docker 沙箱（`--network none`、`--cap-drop ALL`、`--memory limit`）、ExecutionPolicy 策略引擎（白名单/黑名单）、配额管理（步骤数/token/文件大小/网络请求限制）、审计日志和 OpenTelemetry 遥测。

---

## agent-market：FastAPI 后端 + SQLite WAL + 三阶段安全扫描

Market 后端基于 FastAPI 构建，采用 SQLite WAL 模式实现读写并发。数据层设计为 11 张表，其中 Agent/Team/Workflows 三张主表同构，通过 `versions` 表实现 SemVer 多版本共存。

安全扫描分为三个阶段：tar 成员列表检查（路径遍历 + 符号链接 + 大小限制）→ 解压后内容校验（agent.json 结构完整性 + instructions 质量检查 + 引用完整性）→ SHA-256 完整性校验（服务端计算 + HTTP Digest 头 + 客户端二次验证）。

API Key 使用 `secrets.token_hex(16)` 生成，SHA-256 哈希存储，`hmac.compare_digest()` 常量时间比对防时序攻击。限流采用滑动窗口计数器算法，按操作类型和身份分层。

---

## agent-builder：浏览器端 tar.gz 打包 + AI 辅助配置生成

构建器前端基于 React 19 + TypeScript 6 + Vite 8，采用 Zustand 状态管理 + React Router 7 路由。构建流程是线性步骤式（intro → skills → mcp-tools → preview-publish），通过 URL 驱动状态同步。

一个有趣的技术细节是：**tar.gz 打包完全在浏览器端完成**。`packageBuilder.ts` 手动构建 POSIX tar 格式（512 字节 header + 数据 + 对齐填充），通过 `CompressionStream('gzip')` API 压缩，无需后端参与。

AI 自动填写功能通过本地 agent-bridge 服务（`localhost:3210`）调用 LLM，返回的配置经过 `sanitizeAIConfig()` 清洗——name 转小写 + 正则白名单、icon 8 个有效 emoji 校验、categories 6 个有效分类映射、skills/mcpTools 自动补全缺失字段。

---

## 工程规模

| 模块 | 语言 | 文件数 | 测试 |
|------|------|--------|------|
| agent-deploy | TypeScript | 60+ | 200+ |
| agent-market | Python | 16 | 80+ |
| agent-builder | TypeScript/React | 21 | 60+ |
| agent-protocol | JSON Schema | 3 | — |
| **合计** | — | **100+** | **345+** |

---

## 本系列预告

本系列将深入 Agent Hub 的每个核心模块，从源码层面解析设计决策和实现细节：

1. **agent.json v3.0 协议深度解析** — subagent 模型、4 层 fallback、v2 兼容层
2. **adapt.ts 适配引擎** — 策略模式、Pipeline-to-Prompt 翻译、9 平台差异处理
3. **Pipeline 运行时架构** — 步骤调度、模板变量、错误重试、OpenTelemetry 集成
4. **Market 后端工程** — SQLite WAL、三阶段安全扫描、滑动窗口限流
5. **ToolRegistry 原型链** — 层级工具查找、ExecutionContext 构建、动态覆盖

---

**项目地址**：[https://github.com/openpeng/agent-hub](https://github.com/openpeng/agent-hub)

**下一篇**：《agent.json v3.0 协议深度解析：subagent 模型与 4 层 fallback 策略》
