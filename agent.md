# Agent 制作 → 推送 → 验证完整工作流

> 本指南指导 AI 助手完成以下端到端流程：**接收用户地址 → 制作 Agent/Skill/MCP → 推送至云端市场 → 本地运行验证**。
>
> 核心工具：
> - **agent-deploy**（`agent-deploy.sh`）— 一键导入/导出/上传/部署 Agent 到任意 AI 编码工具及云端市场
> - **agent-compose**（`python -m agent_compose.cli`）— YAML 编排器 + AgentRuntime 执行引擎

---

## 工作流总览

```
用户提供地址
     │
     ▼
┌─ 第 1 步：接收地址与研究 ──────────────────────┐
│  从用户获取云端市场地址，研究需求与相关资料        │
└─────────────────────────────────────────────────┘
     │
     ▼
┌─ 第 2 步：制作 Agent ──────────────────────────┐
│  创建 agent.json（Agent 元数据 + 指令）          │
│  可选：SKILL.md、MCP 配置                        │
└─────────────────────────────────────────────────┘
     │
     ▼
┌─ 第 3 步：本地验证 ────────────────────────────┐
│  使用 agent-deploy adapt 预览适配结果            │
│  使用 agent-compose run 本地运行验证             │
└─────────────────────────────────────────────────┘
     │
     ▼
┌─ 第 4 步：推送至云端市场 ───────────────────────┐
│  使用 agent-deploy upload 上传 Agent             │
│  确认上传成功，获取 Market URL                    │
└─────────────────────────────────────────────────┘
     │
     ▼
┌─ 第 5 步：从市场下载并运行确认 ─────────────────┐
│  使用 agent-compose market download 下载         │
│  使用 agent-compose market run 运行验证           │
└─────────────────────────────────────────────────┘
```

---

## 第 1 步：接收地址与研究

用户会提供一个云端市场地址（如 `https://market.aitboy.cn` 或自定义地址）。

你需要做三件事：

### 1.1 确认市场地址可用

```bash
# 检查市场服务是否在线
curl -s <用户提供的市场地址>/health
# 或
curl -s <用户提供的市场地址>/api/v1/status
```

### 1.2 了解需求

通过追问明确以下信息：

| 问题 | 目的 |
|------|------|
| Agent 的名称和用途是什么？ | 确定 identity.name 和 description |
| 需要哪些能力？（搜索、文件操作、浏览器控制等） | 确定 capabilities 和 tools |
| 目标用户是谁？（开发者、运营、普通用户） | 调整指令风格 |
| 是否需要外部工具/API 集成？ | 确定 MCP Server 配置 |
| 部署目标有哪些 AI 工具？ | 确定 adapter 选择 |

### 1.3 研究相关资料

根据需求搜索相关资料（API 文档、竞品分析、技术方案），为后续制作提供依据。

---

## 第 2 步：制作 Agent

核心产出物是一个**标准 Agent 目录**，包含以下文件：

```
my-agent/
├── agent.json        # ★ 必需：Agent 元数据 + 指令（v2.0 格式）
├── SKILL.md          # 可选：Skill 定义（Legacy 兼容格式）
├── mcp_config.json   # 可选：MCP Server 配置
└── instructions.md   # 可选：长指令文件（agent.json 中 source: "file" 引用）
```

### 2.1 创建 agent.json

使用 **Agent JSON v2.0 规范**，这是最推荐的格式，跨平台兼容性最好。

**最小模板：**

```json
{
  "schema_version": "2.0",
  "identity": {
    "name": "<agent-name>",
    "version": "1.0.0",
    "display_name": "<展示名>",
    "description": "<一句话描述>",
    "author": "<作者>",
    "tags": ["<tag1>", "<tag2>"],
    "icon": "🎯",
    "category": "<分类>"
  },
  "instructions": {
    "format": "markdown",
    "source": "inline",
    "content": "# Agent 名称\n\n## 角色定位\n你是一个...\n\n## 核心能力\n1. ...\n2. ...\n\n## 工作规范\n- ...\n\n## 输出格式\n- ..."
  },
  "capabilities": [],
  "compatibility": {}
}
```

**关键字段说明：**

| 字段 | 说明 |
|------|------|
| `schema_version` | 固定 `"2.0"` |
| `identity.name` | Agent 唯一标识符（英文、短横线命名法） |
| `identity.version` | 语义化版本号 |
| `instructions.content` | Agent 的系统提示词/指令（Markdown 格式） |
| `capabilities` | 能力声明（可空数组，实际能力由 MCP 和 tools 提供） |

**两种指令引用方式：**

- **`source: "inline"`** — 指令直接嵌入 agent.json 的 content 字段。适合短小精悍的 Agent。
- **`source: "file"`** — 指令存储在独立的 `instructions.md` 文件中。适合超长指令。

```json
{
  "instructions": {
    "format": "markdown",
    "source": "file",
    "file": "instructions.md"
  }
}
```

### 2.2 创建 SKILL.md（可选，用于 Legagy 兼容）

如果 Agent 需要兼容旧版工具，同时创建 SKILL.md 文件：

```markdown
---
name: <agent-name>
description: <一句话描述>
version: 1.0.0
author: <作者>
tags:
  - <tag1>
  - <tag2>
license: MIT
compatibility:
  - claude-code
  - cursor
  - codebuddy
allowed-tools: read, write, web_search, bash
user-invocable: true
---

# Agent 名称

## 角色定位
...

## 核心能力
...
```

> **注意**：agent-deploy 的 fallback 策略是：agent.json instructions > 子 Agent 生成 > SKILL.md > README.md。有 agent.json 时 SKILL.md 不参与部署适配，仅作备案。

### 2.3 配置 MCP Server（可选）

如果 Agent 需要调用外部服务（数据库、GitHub、浏览器等），配置 MCP Server：

```json
{
  "mcp_servers": [
    {
      "name": "my-service",
      "type": "stdio",
      "command": "node",
      "args": ["path/to/mcp-server/dist/index.js"],
      "env": {
        "API_KEY": "${API_KEY}"
      }
    }
  ]
}
```

支持三种 MCP 模式：

| 模式 | type 值 | 说明 |
|------|---------|------|
| 子进程 | `stdio` | 通过 stdio 启动子进程通信 |
| SSE | `sse` | 通过 HTTP SSE 端点通信 |
| Kimi WebBridge | `kimi-webbridge` | 浏览器自动化（端口 10086） |

---

## 第 3 步：本地验证（部署前）

在推送到云端之前，先在本地验证 Agent 格式正确性。

### 3.1 验证 agent.json 格式

```bash
# 使用 agent-deploy 检查适配结果
# （Windows 下使用 agent-deploy.sh 包装脚本）
./agent-deploy.sh adapt ./my-agent cursor --dry-run

# 查看部署到 Cursor 的预览效果
./agent-deploy.sh adapt ./my-agent claude_code --dry-run
```

预期输出应显示适配后的 Markdown 内容和目标路径，无错误信息。

### 3.2 使用 agent-compose 本地运行

```bash
# 设置 LLM API Key（用 OpenRouter 免费额度即可测试）
$env:OPENROUTER_API_KEY='sk-or-v1-...'

# 通过 market run 从本地路径运行
python -m agent_compose.cli market run ./my-agent `
  -m "测试指令：执行一次功能验证" `
  --model-provider openrouter `
  --model-id openrouter/free `
  --base-url https://openrouter.ai/api/v1
```

如果 Agent 不需要 LLM 调用（纯工具类），可以直接通过 agent-deploy 的 deploy 命令部署到本地工具测试：

```bash
# 部署到本地 Cursor 测试
./agent-deploy.sh deploy ./my-agent -t cursor -l project

# 在 Cursor 中触发测试
# 打开项目，输入 //<agent-name> 查看效果
```

---

## 第 4 步：推送至云端市场

使用 agent-deploy 的 `upload` 命令将 Agent 推送到市场。

### 4.1 配置市场地址

用户提供的地址通过环境变量传递给 agent-deploy：

```bash
# Windows PowerShell
$env:MARKET_API_URL='<用户提供的市场地址>'
$env:MARKET_API_KEY='<如果需要>'

# 查看环境变量是否生效
echo $env:MARKET_API_URL
```

> agent-deploy.sh 默认配置了 `https://market.aitboy.cn`，如有用户指定地址，需在执行时覆盖。

### 4.2 上传 Agent

```bash
# 上传到市场
./agent-deploy.sh upload ./my-agent

# 如果需要指定自定义市场地址
$env:MARKET_API_URL='<用户提供的地址>'
./agent-deploy.sh upload ./my-agent

# 强制覆盖已存在的版本
./agent-deploy.sh upload ./my-agent --force
```

**成功输出示例：**

```
📤 Uploading agent to Market...
✅ Successfully uploaded agent!

Agent ID:     my-agent
Market URL:   https://market.aitboy.cn/agents/my-agent
```

### 4.3 上传失败处理

| 错误 | 可能原因 | 解决方案 |
|------|----------|----------|
| `Connection refused` | 市场服务未启动 | 确认市场地址正确且服务在线 |
| `401 Unauthorized` | API Key 无效 | 检查 MARKET_API_KEY 是否正确 |
| `400 Bad Request` | agent.json 格式错误 | 检查 agent.json 是否符合 v2.0 规范 |
| `409 Conflict` | 版本冲突 | 使用 `--force` 覆盖 |
| `agent.json not found` | 目录结构错误 | 确认 ./my-agent/ 下包含 agent.json |

---

## 第 5 步：从市场下载并运行验证

推送成功后，使用 agent-compose 从市场下载并运行，确认部署成功。

### 5.1 从市场下载

```bash
# 设置市场地址
$env:MARKET_API_URL='<用户提供的地址>'

# 下载刚推送的 Agent
python -m agent_compose.cli market download <agent-name> -o ./verify-agents/

# 查看下载结果
ls ./verify-agents/<agent-name>/
```

### 5.2 从市场运行验证

```bash
# 设置 LLM API Key
$env:OPENROUTER_API_KEY='sk-or-v1-...'

# 直接从市场下载并运行
python -m agent_compose.cli market run <agent-name> `
  -m "请自我介绍，并说明你的核心能力" `
  --model-provider openrouter `
  --model-id openrouter/free `
  --base-url https://openrouter.ai/api/v1
```

**验证成功的标志：**
- Agent 成功加载，没有格式错误
- Agent 能够正确回应用户的测试指令
- 所有配置的 MCP 工具正常响应

### 5.3 验证失败回滚方案

如果验证不通过：

1. 从市场删除（如果支持）：
   ```bash
   # agent-deploy 暂未提供 market delete 命令
   # 可通过市场 API 直接操作
   curl -X DELETE "<市场地址>/api/v1/agents/<agent-name>" \
     -H "Authorization: Bearer $env:MARKET_API_KEY"
   ```

2. 修正本地 Agent 目录后重新上传:
   ```bash
   # 修复 agent.json 或指令
   # 然后重新上传
   ./agent-deploy.sh upload ./my-agent --force
   ```

3. 再次运行验证，直到通过。

---

## 完整示例：从零到一

以下是一个完整的端到端执行示例：

### 场景：制作并推送一个"代码审查助手" Agent

```bash
# ===== 第 1 步：创建 Agent 目录 =====
mkdir -p ./code-reviewer
cd ./code-reviewer

# ===== 第 2 步：创建 agent.json =====
# 写入 agent.json（见上方 2.1 模板）

# ===== 第 3 步：本地验证 =====
cd ..
# 检查适配
./agent-deploy.sh adapt ./code-reviewer cursor --dry-run

# agent-compose 本地运行测试
$env:OPENROUTER_API_KEY='sk-or-v1-...'
python -m agent_compose.cli market run ./code-reviewer `
  -m "审查以下 Python 代码：\ndef add(a,b):\n    return a+b" `
  --model-provider openrouter `
  --model-id openrouter/free `
  --base-url https://openrouter.ai/api/v1

# ===== 第 4 步：推送至市场 =====
$env:MARKET_API_URL='<用户提供的地址>'
./agent-deploy.sh upload ./code-reviewer

# ===== 第 5 步：下载并验证 =====
# 重新下载验证
python -m agent_compose.cli market download code-reviewer -o ./verify-agents/

# 运行验证
python -m agent_compose.cli market run code-reviewer `
  -m "自我介绍并审查一段代码" `
  --model-provider openrouter `
  --model-id openrouter/free `
  --base-url https://openrouter.ai/api/v1

echo "✅ 推送完成！Market URL: $env:MARKET_API_URL/agents/code-reviewer"
```

---

## 参考

| 资源 | 路径 |
|------|------|
| agent-deploy 完整文档 | `agent-deploy/README.md` |
| agent-deploy 使用手册 | `agent-deploy/SKILL.md` |
| Agent JSON v2.0 规范 | `agent-deploy/AGENT_FORMATS.md` |
| MCP 配置示例 | `agent-deploy/mcp_config.example.json` |
| agent-compose 文档 | `agent-compose/README.md` |
| 完成案例 | `agent-builder/content-creator-agent.json` |
| 完成案例 | `requirement-interviewer-agent.json` |
| 部署脚本 | `agent-deploy.sh` |

---

## 注意事项

1. **agent-deploy.sh 已预置市场地址**：默认指向 `https://market.aitboy.cn`。如果用户提供了自定义地址，通过 `$env:MARKET_API_URL` 环境变量覆盖。
2. **Windows 路径处理**：agent-deploy.sh 自动处理 Cygwin→Windows 路径转换。在 PowerShell 中使用绝对路径时使用反斜杠（`\`）。
3. **agent-compose 需要 LLM Key**：运行 Agent 需要设置 `OPENROUTER_API_KEY` 或等效的 LLM API Key。用 OpenRouter 的免费模型即可完成验证。
4. **版本管理**：推送新版本前更新 `agent.json` 中的 `identity.version` 字段，遵循语义化版本号。
5. **Agent 命名规范**：`identity.name` 使用英文小写、短横线连接（kebab-case），如 `code-reviewer`、`data-analyst`。