# Agent Hub

**跨平台 AI Agent 互操作平台 — 部署、发现、执行，一个 JSON 就够了**

[![Status](https://img.shields.io/badge/Phase_8-完成-brightgreen.svg)](./STATUS.md)
[![Tests](https://img.shields.io/badge/Tests-345+-brightgreen.svg)](./agent-deploy/node/tests/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Security](https://img.shields.io/badge/Security-Read_First-red.svg)](./docs/SECURITY.md)

> 仓库地址: [https://github.com/openpeng/agent-hub](https://github.com/openpeng/agent-hub)

---

## 核心理念

**agent.json 为唯一真相来源**，消除 AI 工具厂商锁定。

Agent Hub 提供三大核心能力：

```
┌────────────┐    ┌────────────┐    ┌────────────┐
│   市场      │    │   部署      │    │   执行      │
│ Market     │    │ Deploy     │    │ Execute    │
├────────────┤    ├────────────┤    ├────────────┤
│ 搜索/下载   │    │ agent.json │    │ 管道引擎    │
│ 上传/评分   │ →  │ → 9种工具   │ →  │ 动态覆盖    │
│ Agent 仓库  │    │ 跨平台分发   │    │ 子Agent编排 │
└────────────┘    └────────────┘    └────────────┘
```

- **Market** — 上传、搜索、下载、评分 Agent
- **Deploy** — agent.json 一键导出到 10 种 AI 编码工具格式
- **Execute** — YAML Pipeline 引擎 + 7 内置工具 + 子 Agent 编排 + 动态覆盖

> **安全提示**: 从 Market 下载的 Agent 默认在受限模式下运行。使用 `--trusted` 标志前请确保信任来源。详见 [SECURITY.md](./docs/SECURITY.md)。

---

## Agent 可视化构建器

通过直观的可视化界面，零代码构建、配置并发布自定义 Agent 到市场。

### 功能特性

- **Agent 介绍配置** - 名称、图标、描述、分类标签、欢迎语
- **Skill 选择** - 从 Skill 库浏览、搜索、多选、拖拽排序、参数配置
- **MCP 工具选择** - 配置外部工具调用能力、权限管理、连接测试
- **预览发布** - 配置校验、对话测试、一键发布到市场

### 技术栈

- React 18 + TypeScript
- Zustand 状态管理
- React Router v7 路由
- @dnd-kit 拖拽排序
- Lucide React 图标
- Vite 构建工具

---

## 当前进度

| Phase | 内容 | 状态 |
|-------|------|------|
| Phase 1 | Export — 部署到 AI 工具 | ✅ 完成 |
| Phase 2 | Import — 从 AI 工具导入 | ✅ 完成 |
| Phase 3 | Market Integration — 上传/下载 | ✅ 完成 |
| Phase 4 | Enhanced UX — 列表/搜索/错误处理 | ✅ 完成 |
| Phase 5 | Runtime Engine — Pipeline + 内置工具 | ✅ 完成 |
| Phase 6 | Agent Composition — 依赖/缓存/编排 | ✅ 完成 |
| Phase 7 | Security & Quality — 安全/质量治理 | ✅ 完成 |
| Phase 8 | Agent Gateway — execute/list + Overrides | ✅ 完成 |

---

## 文档导航

| 文档 | 用途 |
|------|------|
| [架构设计](ARCHITECTURE.md) | Agent Gateway 架构详解，上下文模型、通信链路、合并策略 |
| [状态跟踪](STATUS.md) | 项目进度、测试覆盖、经验总结 |
| [开发者指南](CODEBUDDY.md) | 开发环境、架构约定、模板变量系统 |
| [快速开始](docs/QUICK_START.md) | 5 分钟上手 |
| [Agent 开发指南](docs/AGENT_DEV_GUIDE.md) | 从零创建 Agent |
| [排错手册](docs/TROUBLESHOOTING.md) | 常见问题与解决方案 |
| [安全模型](docs/SECURITY.md) | 安全策略与沙箱机制 |
| [Market API](docs/API.md) | REST API 参考 |

---

## 快速开始

### Agent 可视化构建器

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

### 部署 Agent

```bash
# 自动检测工具并部署
agent-deploy deploy ./my-agent
agent-deploy deploy ./my-agent --tool cursor
```

### 从 Market 获取

```bash
# 一键下载 + 适配 + 安装
agent-deploy use agent-maker-tutorial
agent-deploy search "code review"
```

### 执行 Agent（Runtime Engine）

```bash
# 执行 Agent Pipeline
agent-deploy run ./my-agent --args "file=src/app.ts"
agent-deploy run ./my-agent --verbose --trusted

# 清理全局安装（自动跳过系统工具）
agent-deploy clean
```

### MCP Server 模式

```bash
# 作为 MCP Server 运行，提供 9 个 MCP 工具
agent-deploy          # stdio transport

# 核心 MCP 工具:
#   execute_agent  — 执行 Agent，支持动态覆盖
#   list_agents    — 发现可用 Agent
#   deploy_agent   — 部署到 AI 工具
#   import_agent   — 从 AI 工具导入
#   upload_agent   — 上传到 Market
#   download_agent — 从 Market 下载
```

### execute_agent 动态覆盖

```json
{
  "agent": "code-reviewer",
  "input": { "file_path": "src/app.ts" },
  "overrides": {
    "instructions": "你是 Go 并发安全专家...",
    "skills": [{ "name": "go-lint", "workerYaml": {} }],
    "mcp_servers": { "file-mcp": { "type": "http", "url": "http://localhost:3001" } },
    "trusted": true
  }
}
```

---

## 架构概览

```
agent.json (唯一真相来源)
    │
    ├──→ [Deploy] adapt.ts → 10 AI 工具格式
    ├──→ [Import] import-manager.ts → agent.json
    ├──→ [Market] upload/download/search
    └──→ [Runtime] AgentExecutor + PipelineEngine
              ├── 7 内置工具（bash, read_file, write_file, glob, llm_chat, web_search, web_fetch）
              ├── MCP 工具集成（从配置文件 / 运行时注入）
              ├── Skill 集成（从目录 / 运行时注入）
              ├── 子 Agent 编排（串行 / 并行）
              ├── 动态覆盖（instructions / skills / mcp）
              ├── 安全沙箱（trusted / restricted）
              └── 依赖解析 + Agent 缓存
```

---

## 支持的工具

| 方向 | 工具 | 数量 |
|------|------|------|
| Export | Cursor, Claude Code, CodeBuddy, codebuddy_agent, GitHub Copilot, OpenCode, Windsurf, Trae, Aider, AGENTS.md | 10 |
| Import | Cursor, Claude Code, CodeBuddy, GitHub Copilot, VSCode, JetBrains, OpenAI GPTs | 7 |

### MCP 工具 (9 个)

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

---

## 测试

| 测试套件 | 测试数 | 状态 |
|----------|--------|------|
| Export (adapt) | 22 | ✅ |
| Import | 31 | ✅ |
| Pipeline Engine | 87 | ✅ |
| Built-in Tools | 127 | ✅ |
| Subagent | 36 | ✅ |
| V2 Compat | 18 | ✅ |
| CLI / E2E | 13 | ✅ |
| Other | 11+ | ✅ |
| **总计** | **345+** | **✅** |

```bash
cd agent-deploy/node && npm test
```

---

## 项目结构

```
agent-hub/
├── src/                    # Agent 可视化构建器前端
│   ├── components/Layout/  # 布局组件（三栏布局、步骤导航、预览面板）
│   ├── data/               # 模拟数据（Skills、MCP工具）
│   ├── pages/              # 页面组件
│   │   ├── AgentIntro.tsx  # Agent介绍配置
│   │   ├── SkillSelector.tsx # Skill选择
│   │   ├── McpToolSelector.tsx # MCP工具选择
│   │   └── PreviewPublish.tsx  # 预览与发布
│   ├── store/              # Zustand状态管理
│   ├── styles/             # 全局样式
│   ├── types/              # TypeScript类型定义
│   ├── App.tsx             # 应用入口
│   └── main.tsx            # React根节点
├── agent-deploy/           # CLI + MCP Server (TypeScript, Node.js)
│   └── node/src/
│       ├── cli.ts          # CLI 入口
│       ├── index.ts        # MCP Server (9 工具)
│       ├── adapt.ts        # Export: agent.json → AI 工具
│       ├── import.ts       # Import: AI 工具 → agent.json
│       ├── market.ts       # Market 客户端
│       └── runtime/        # Runtime Engine
│           ├── agent-executor.ts   # Agent 执行编排
│           ├── pipeline.ts         # Pipeline 引擎
│           ├── tools/              # 7 内置工具
│           ├── builtin-tools/      # invoke_agent / list_agents
│           ├── mcp-integration.ts  # MCP 工具集成
│           └── skill-integration.ts # Skill 集成
├── agent-market/           # Market 服务 (Python, FastAPI)
│   └── src/market/
│       ├── server.py       # REST API
│       ├── database.py     # SQLite
│       └── auth.py         # API Key 认证
├── agent-compose/          # 运行态引擎 (Python, v1.3.0) — 含运行时、Import 适配器、部署器
│   └── agent_compose/
│       ├── agent_runtime.py       # Agent JSON v2 执行引擎
│       ├── cli.py                 # 命令行主入口
│       ├── orchestrator.py        # YAML 编排统一入口
│       ├── pipeline_engine.py     # Pipeline 执行引擎
│       ├── tool_registry.py      # 工具注册与查找
│       ├── session_store.py      # 会话状态持久化
│       ├── market_client.py      # Market 客户端
│       ├── mcp_builder.py         # MCP 工具构建
│       ├── llm_client.py          # LLM 客户端
│       ├── deployer.py            # 部署器
│       ├── deploy_cli.py          # 部署 CLI
│       ├── resilience.py          # 弹性机制（重试/熔断）
│       ├── resource_limits.py     # 资源限制管理
│       ├── hot_reload.py          # 配置热重载
│       ├── log_rotation.py        # 日志轮转
│       ├── wizard.py              # 交互式创建向导
│       ├── templates.py           # 模板管理
│       ├── i18n.py                # 国际化
│       ├── adapters/             # Import 适配器（Cursor, Claude, VSCode 等）
│       └── mcp_servers/           # MCP Server 配置
├── agent-protocol/         # Agent 协议规范
│   └── specs/              # agent-json-v3, worker-yaml, etc.
├── docs/                   # 文档
└── test-agents/            # 测试用例
```

---

## 路线图

### ✅ Phase 1-7: 已完成
- Export (agent.json → 10 AI 工具格式)
- Import (7 AI 工具格式 → agent.json)
- Market (上传/下载/搜索)
- UX 增强 (list/search/info/init/templates + 12 错误处理器)
- Runtime (Pipeline + 7 内置工具 + 子 Agent 编排)
- Composition (Market 依赖解析 + Agent 缓存)
- Security & Quality (沙箱 + API Key 哈希 + 上传扫描 + SHA-256 + Rate Limit + 评分系统)

### ✅ Phase 8: Agent Gateway
- agent-executor 核心编排模块
- execute_agent MCP 工具（8 种动态覆盖）
- list_agents MCP 工具（本地 + Market 发现）
- invoke_agent 扩展（支持 overrides）
- CLI run 重构（共用 agent-executor）

---

## 贡献

欢迎贡献。开发环境要求：

- Node.js 18+
- Python 3.10+
- TypeScript 5.7+

```bash
cd agent-deploy/node && npm install && npm test
cd agent-market && pip install -r requirements.txt && pytest
```

---

## License

MIT License

---

**最后更新**: 2026-06-15
**维护者**: Peng Xiao
**仓库**: [https://github.com/openpeng/agent-hub](https://github.com/openpeng/agent-hub)
