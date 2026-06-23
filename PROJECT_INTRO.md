# Agent Hub 项目介绍

> **跨平台 AI Agent 互操作平台 — 部署、发现、执行，一个 JSON 就够了**

## 项目定位

Agent Hub 是一个 **部署 + 发现 + 执行** 三合一的 AI Agent 网关平台。核心理念：**agent.json 为唯一真相来源**，消除 AI 工具厂商锁定。

## 三大核心能力

| 能力 | 说明 |
|------|------|
| **Market（市场）** | 上传、搜索、下载、评分 Agent |
| **Deploy（部署）** | agent.json 一键导出到 10 种 AI 编码工具格式 |
| **Execute（执行）** | YAML Pipeline 引擎 + 7 内置工具 + 子 Agent 编排 + 动态覆盖 |

## 技术栈

| 组件 | 技术栈 | 路径 |
|------|--------|------|
| CLI + MCP Server | TypeScript 5.7, Node.js 18+ | `agent-deploy/node/` |
| Runtime Engine | TypeScript, YAML Pipeline | `agent-deploy/node/src/runtime/` |
| Market 服务 | Python 3.10, FastAPI, aiosqlite | `agent-market/` |
| Agent 协议规范 | Markdown 规范文档 | `agent-protocol/specs/` |
| 可视化构建器 | React 18, TypeScript, Zustand, Vite | `src/` |
| 运行态引擎 (Python) | Python 3.10, v1.3.0 | `agent-compose/` |

## 项目结构

```
agent-hub/
├── src/                    # Agent 可视化构建器前端 (React + TypeScript)
├── agent-deploy/           # CLI + MCP Server (TypeScript, Node.js) — 主实现
│   └── node/src/
│       ├── cli.ts          # CLI 入口 (11 命令)
│       ├── index.ts        # MCP Server (9 工具)
│       ├── adapt.ts        # Export: agent.json → AI 工具
│       ├── import.ts       # Import: AI 工具 → agent.json
│       ├── market.ts       # Market 客户端
│       └── runtime/        # Runtime Engine
├── agent-deploy-temp/      # agent-deploy 旧版/备份 (Python + Node.js 双实现)
├── agent-market/           # Market 服务 (Python, FastAPI)
├── agent-compose/          # 运行态引擎 (Python, v1.3.0) — YAML 编排 + AgentRuntime
├── agent-builder/          # Agent 可视化构建器 (React 18 + Vite)
├── agent-protocol/         # Agent 协议规范
├── docs/                   # 项目文档
└── test-agents/            # 测试用例
```

## 核心模块详解

### 1. agent-deploy — 部署与运行时引擎（主模块）

**定位**：CLI 工具 + MCP Server，负责 Agent 的导入、部署、执行全生命周期。

**技术栈**：TypeScript 5.7, Node.js 18+, Vitest

**核心能力**：
- **Export**：agent.json 一键导出到 10 种 AI 编码工具（Cursor、Claude Code、CodeBuddy、GitHub Copilot、OpenCode、Windsurf、Trae、Aider、AGENTS.md 等）
- **Import**：从 7 种 AI 工具格式导入为 agent.json（Cursor、Claude Code、CodeBuddy、GitHub Copilot、VSCode、JetBrains、OpenAI GPTs）
- **Runtime Engine**：YAML Pipeline 执行引擎，8 内置工具（read_file、write_file、bash、glob、llm_chat、web_fetch、web_search、invoke_agent、list_agents）
- **MCP Server**：9 个 MCP 工具（execute_agent、list_agents、deploy_agent、adapt_agent、install_agent、import_agent、upload_agent、download_agent、list_installed_tools）
- **动态覆盖 (Overrides)**：执行时覆盖 instructions、skills、mcp_servers、shared_context、trusted、cwd、env
- **安全沙箱**：默认受限模式，危险命令拦截，内网 IP 拦截

**关键文件**：
| 文件 | 职责 |
|------|------|
| `agent-deploy/node/src/cli.ts` | CLI 入口，11 命令 |
| `agent-deploy/node/src/index.ts` | MCP Server (9 工具) |
| `agent-deploy/node/src/adapt.ts` | Export 适配器 |
| `agent-deploy/node/src/import.ts` | Import 适配器 |
| `agent-deploy/node/src/runtime/agent-executor.ts` | Agent 执行编排（CLI 和 MCP 共用） |
| `agent-deploy/node/src/runtime/pipeline.ts` | Pipeline 执行引擎 |
| `agent-deploy/node/src/runtime/policy.ts` | 安全策略与沙箱 |

**测试**：345+ tests，100% pass

```bash
cd agent-deploy/node
npm install && npm run build && npm test
```

---

### 2. agent-market — Agent 市场服务

**定位**：轻量级 AI Agent 市场服务，支持 Agent 包的注册、发布、搜索、下载、评分，内置完整安全扫描机制。

**技术栈**：Python 3.10, FastAPI, aiosqlite, SQLite + WAL

**核心能力**：
- **Agent 注册与发布**：上传 `.tar.gz` / `.zip` 格式的 Agent 包，自动解析元数据
- **语义搜索**：基于关键词、分类、标签的多维度过滤查询
- **下载与缓存**：流式下载，SHA-256 完整性校验，客户端缓存 + LRU 清理
- **评分与评论**：1-5 星评分系统，支持评论
- **API Key 认证**：Bearer Token 认证，SHA-256 哈希存储，支持 publisher / admin 两种角色
- **安全扫描**：上传包自动检测路径遍历、符号链接、大小限制，拒绝恶意包
- **Rate Limiting**：分层限流（上传 20次/小时，下载 100次/分钟，Key创建 5次/小时）
- **生命周期管理**：Agent 弃用/下架机制
- **Web 管理后台**：内建 SPA 前端界面
- **Docker 部署**：提供 Dockerfile + docker-compose.yml

**API 端点**：
| Method | Path | 说明 | 认证 |
|--------|------|------|------|
| `GET` | `/api/v1/agents` | 搜索/列出 Agent | 无 |
| `POST` | `/api/v1/agents` | 注册 Agent（含安全扫描） | publisher |
| `GET` | `/api/v1/agents/{id}/download` | 下载 Agent 包 | 无 |
| `POST` | `/api/v1/agents/{id}/ratings` | 评分 | publisher |
| `GET` | `/api/v1/discover` | Agent 发现（按能力匹配） | 无 |

**关键文件**：
| 文件 | 职责 |
|------|------|
| `agent-market/src/market/server.py` | FastAPI REST API |
| `agent-market/src/market/database.py` | SQLite 异步数据库 |
| `agent-market/src/market/auth.py` | API Key 认证 |
| `agent-market/src/market/verify.py` | 包安全扫描 |
| `agent-market/src/market/rate_limit.py` | 分层限流 |

```bash
cd agent-market
pip install -r requirements.txt
python -m uvicorn src.market.server:app --reload --port 8321
```

---

### 3. agent-protocol — Agent 协议规范

**定位**：一套完整的 AI Agent 定义、开发、运行和分发的标准协议。定义 agent.json v3、worker.yaml、Builtin Tools、Subagent System、Dynamic Overrides 等规范。

**版本**：v3.0.0（向后兼容 v2）

**核心规范**：
| 规范 | 说明 |
|------|------|
| `agent.json v3` | Agent 元数据和结构定义（identity、entry、subagents、dependencies） |
| `worker.yaml` | Pipeline 工作流编排（串行/并行、条件执行、错误处理、模板变量） |
| `Builtin Tools` | 9 个标准内置工具（llm_chat、read_file、write_file、bash、glob、web_fetch、web_search、invoke_agent、list_agents） |
| `Subagent System` | 多子 Agent 组合 + invoke_parallel 并行调用 |
| `Dynamic Overrides` | 运行时 instructions/skills/MCP 覆盖 |
| `Deployment Targets` | 跨 9 平台部署适配 |

**设计原则**：
1. **声明式优于命令式** — 用 YAML 描述想要什么，而非如何做
2. **组合优于单体** — 多个小 Agent 组合，而非一个巨大 Agent
3. **显式优于隐式** — 明确的依赖声明
4. **兼容优于重写** — 平滑升级路径，v2 字段仍然支持

**规范文档**：
| 文件 | 说明 |
|------|------|
| `specs/agent-json-v3.md` | agent.json v3 完整规范 |
| `specs/worker-yaml.md` | Pipeline 工作流规范 |
| `specs/builtin-tools.md` | 内置工具系统规范 |
| `specs/skill-system.md` | Skill 系统规范 |
| `specs/mcp-integration.md` | MCP 集成规范 |
| `schemas/agent.schema.json` | agent.json JSON Schema |
| `schemas/worker.schema.json` | worker.yaml JSON Schema |

---

### 4. agent-compose — Python 运行态引擎

**定位**：基于 YAML 配置的 Agent 编排器，支持 Agent / Team / Workflow 三层架构。同时提供 `AgentRuntime` — 直接从市场拉取 Agent JSON v2 并运行的轻量执行引擎。

**技术栈**：Python 3.10, v1.3.0

**核心能力**：
- **YAML 声明式配置**：定义 Agent、Team、Workflow，无需硬编码
- **可复用定义**：Skill、MCP、Agent 模板集中管理
- **引用机制**：`$ref`、`$file`、`${VAR}` 环境变量
- **完整打包**：Agent/Team/Workflow 均可打包为标准 JSON
- **Market 集成**：`agent-compose market download <id>` 下载市场 Agent，`market run` 直接运行
- **AgentRuntime**：标准 Agent JSON v2 直接运行，不依赖 YAML 定义
- **Kimi WebBridge 集成**：通过 HTTP JSON (127.0.0.1:10086) 驱动浏览器，12 个浏览器操作工具
- **MCP 工具链**：stdio 子进程、SSE、Kimi WebBridge HTTP 三种模式
- **弹性机制**：重试/熔断/降级
- **配置热重载**：无需重启即可更新配置

**CLI 命令**：
```bash
# 本地 YAML 编排
agent-compose -d examples/workflow_example list
agent-compose -d examples/workflow_example run article_pipeline
agent-compose -d examples/workflow_example package workflow article_pipeline

# Market 集成
agent-compose market health
agent-compose market search kimi --limit 5
agent-compose market download kimi-webbridge-operator -o ./agents
agent-compose market run kimi-webbridge-operator -m "打开 https://example.com 并截图"
```

**关键文件**：
| 文件 | 职责 |
|------|------|
| `agent_compose/cli.py` | 命令行主入口 |
| `agent_compose/agent_runtime.py` | Agent JSON v2 执行引擎（含 WebBridge） |
| `agent_compose/orchestrator.py` | YAML 编排统一入口 |
| `agent_compose/market_client.py` | market.aitboy.cn 客户端 |
| `agent_compose/kimi_webbridge_client.py` | Kimi WebBridge HTTP 客户端 |
| `agent_compose/resilience.py` | 弹性机制（重试/熔断/降级） |
| `agent_compose/hot_reload.py` | 配置热重载 |

---

### 5. agent-builder — Agent 可视化构建器

**定位**：通过直观的可视化界面，零代码构建、配置并发布自定义 Agent 到市场。

**技术栈**：React 18 + TypeScript + Zustand + React Router v7 + @dnd-kit + Lucide React + Vite

**功能特性**：
- **Agent 介绍配置**：名称、图标、描述、分类标签、欢迎语
- **Skill 选择**：从 Skill 库浏览、搜索、多选、拖拽排序、参数配置
- **MCP 工具选择**：配置外部工具调用能力、权限管理、连接测试
- **预览发布**：配置校验、对话测试、一键发布到市场

**包含的示例 Agent**：
| Agent | 说明 |
|-------|------|
| `aliyun-sls-agent.json` | 阿里云 SLS 日志分析 Agent |
| `content-creator-agent.json` | 内容创作 Agent |
| `data-analyst-agent.json` | 数据分析 Agent |
| `dev-toolkit-agent.json` | 开发工具箱 Agent |
| `feishu-assistant-agent.json` | 飞书助手 Agent |
| `office-assistant-agent.json` | 办公助手 Agent |

**部署方式**：
```bash
cd agent-builder
npm install
npm run dev      # 开发服务器
npm run build    # 生产构建
```

支持 Docker Compose 部署（含 Nginx 反向代理）。

---

## 常用命令

```bash
# 构建与测试 (TypeScript)
cd agent-deploy/node
npm install && npm run build && npm test    # 345+ tests

# 测试 (Python)
cd agent-market && pip install -r requirements.txt && pytest

# 部署 Agent
agent-deploy deploy ./my-agent
agent-deploy deploy ./my-agent --tool cursor

# 从 Market 获取
agent-deploy use agent-maker-tutorial
agent-deploy search "code review"

# 执行 Agent
agent-deploy run ./my-agent --args "file=src/app.ts"
agent-deploy run ./my-agent --verbose --trusted

# MCP Server 模式
agent-deploy    # stdio transport, 提供 9 个 MCP 工具

# Market 服务
cd agent-market
python -m uvicorn src.market.server:app --reload --port 8321

# agent-compose 运行 Market Agent
python -m agent_compose.cli market run kimi-webbridge-operator \
  -m "打开 https://example.com 并截图" \
  --model-provider openrouter --model-id openrouter/free
```

## 支持的 AI 工具

| 方向 | 工具 | 数量 |
|------|------|------|
| Export | Cursor, Claude Code, CodeBuddy, GitHub Copilot, OpenCode, Windsurf, Trae, Aider, AGENTS.md 等 | 10 |
| Import | Cursor, Claude Code, CodeBuddy, GitHub Copilot, VSCode, JetBrains, OpenAI GPTs | 7 |

## MCP 工具 (9 个)

| 工具 | 功能 |
|------|------|
| `execute_agent` | 执行 Agent，支持 8 种动态覆盖 |
| `list_agents` | 发现可用 Agent（本地 + Market） |
| `deploy_agent` | 部署 Agent 到 AI 工具 |
| `adapt_agent` | Agent 适配到目标工具 |
| `install_agent` | 安装适配后的 Agent |
| `import_agent` | 从 AI 工具导入 |
| `upload_agent` | 上传到 Market |
| `download_agent` | 从 Market 下载 |
| `list_installed_tools` | 列出已安装工具 |

## 架构要点

### 上下文四层模型
1. **Layer 1: agent.json** — Agent 元数据（instructions, dependencies, subagents）
2. **Layer 2: worker.yaml** — 管道定义（pipeline, shared_context）
3. **Layer 3: ToolRegistry** — 工具集（builtin + MCP + skills + sub-agents）
4. **Layer 4: ExecutionContext** — 运行时状态（sharedContext, steps, env）

### 动态覆盖 (Overrides)
execute_agent 支持 8 种动态覆盖：instructions（直接替换）、skills（同名覆盖）、mcp_servers（同名覆盖）、shared_context（合并）、trusted、cwd、env。

### 安全模型
- 默认受限 + 显式授权（`--trusted`）
- 子 Agent 信任传播
- 危险命令拦截（rm -rf /, chmod 777 等）
- 内网 IP 拦截
- API Key SHA-256 哈希存储
- 上传包安全扫描 + SHA-256 完整性校验

## 当前状态

- **Phase 1-8 全部完成** (345+ tests, 100% pass)
- **生产就绪**: 是
- **下一步**: Phase 6.1+ 并发调用增强 + Pipeline 优化 + Team/Workflow 扩展

## 扩展规划

### Team & Workflow (Draft)
- `team.json` — Team 定义规范（route/collaborate/coordinate 三种协作模式）
- `workflow.json` — Workflow 编排规范（agent/team/function/condition/parallel/loop 步骤类型）
- Market API 扩展（上传/下载/搜索 Team/Workflow）
- CLI 子命令扩展（team/workflow 的 package/upload/download/list/validate）

### Agno YAML Orchestrator (Draft)
- 在 Agno 框架之上增加 YAML 配置解析层
- 将 Agent、Team、Workflow 定义声明在 YAML 中
- 配置与代码分离，支持热更新

## 社区生态

- 社区 Agent 资源可通过 Market 搜索获取，覆盖 engineering、design、marketing、sales、security、GIS、game-development 等 20+ 领域

## 关键文档

| 文档 | 用途 |
|------|------|
| `README.md` | 项目主文档 |
| `ARCHITECTURE.md` | Agent Gateway 架构详解 |
| `STATUS.md` | 项目进度、测试覆盖、经验总结 |
| `CODEBUDDY.md` | 开发环境、架构约定、模板变量系统 |
| `SPEC.md` | Team & Workflow 扩展规范 |
| `DESIGN_agno_yaml_orchestrator.md` | Agno YAML 编排器设计 |
| `SPEC_agno_yaml_orchestrator.md` | Agno YAML 编排器规范 |
| `CONTRIBUTING.md` | 贡献指南 |

## 开发约定

1. **agent.json 是唯一真相来源** — 所有操作以此为基准
2. **零破坏性变更** — 保持 100% 向后兼容
3. **Context-based ToolRegistry** — 无全局状态
4. **默认不信任** — Agent 默认受限，需 `--trusted` 显式授权
5. **构建**: `tsc && cp src/templates/*.json dist/templates/`
6. **路径**: Windows 环境使用正斜杠 `/`
7. **Commit**: `<type>: <描述>` 格式（feat/fix/docs/test/refactor/security）

## 仓库信息

- **仓库**: https://github.com/openpeng/agent-hub
- **协议**: MIT License
- **维护者**: Peng Xiao
- **最后更新**: 2026-06-22
