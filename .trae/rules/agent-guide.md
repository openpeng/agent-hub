# Agent 制作 → 推送 → 验证完整工作流

> 核心工具：
> - **agent-deploy**（`agent-deploy.sh`）— 一键导入/导出/上传/部署 Agent 到任意 AI 编码工具及云端市场
> - **agent-compose**（`python -m agent_compose.cli`）— YAML 编排器 + AgentRuntime 执行引擎
> - **工作区路径**：`d:\mycode\agent-hub`

---

## 工作流总览

```
用户提供地址 → 第1步:接收与研究 → 第2步:制作Agent → 第3步:本地验证 → 第4步:推送市场 → 第5步:下载确认
```

---

## 第 1 步：接收地址与研究

用户会提供一个云端市场地址。执行：

```bash
# 确认市场在线
curl -s <市场地址>/health
# 或
curl -s <市场地址>/api/v1/status
```

追问明确需求：Agent名称与用途、核心能力、目标用户、是否需要MCP集成、部署目标工具。

根据需求搜索相关资料（API文档、竞品分析、技术方案）。

---

## 第 2 步：制作 Agent

标准 Agent 目录结构：

```
my-agent/
├── agent.json        # ★ 必需：Agent 元数据 + 指令（v2.0 格式）
├── SKILL.md          # 可选：Skill 定义
├── mcp_config.json   # 可选：MCP Server 配置
└── instructions.md   # 可选：长指令文件
```

### agent.json 模板

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
    "content": "# Agent 名称\n\n## 角色定位\n你是一个...\n\n## 核心能力\n1. ...\n2. ...\n\n## 工作规范\n- ..."
  },
  "capabilities": [],
  "compatibility": {}
}
```

### MCP Server 配置（可选）

```json
{
  "mcp_servers": [
    {
      "name": "my-service",
      "type": "stdio",
      "command": "node",
      "args": ["path/to/mcp-server/dist/index.js"],
      "env": { "API_KEY": "${API_KEY}" }
    }
  ]
}
```

支持三种 MCP 模式：`stdio`（子进程）、`sse`（HTTP SSE）、`kimi-webbridge`（浏览器自动化，端口10086）。

---

## 第 3 步：本地验证

```bash
# 适配预览
./agent-deploy.sh adapt ./my-agent cursor --dry-run

# 本地运行测试（需要 OPENROUTER_API_KEY）
$env:OPENROUTER_API_KEY='sk-or-v1-...'
python -m agent_compose.cli market run ./my-agent `
  -m "测试指令" --model-provider openrouter --model-id openrouter/free `
  --base-url https://openrouter.ai/api/v1
```

---

## 第 4 步：推送至云端市场

```bash
$env:MARKET_API_URL='<用户提供的市场地址>'
$env:MARKET_API_KEY='<如果需要>'

./agent-deploy.sh upload ./my-agent

# 覆盖已有版本
./agent-deploy.sh upload ./my-agent --force
```

上传失败处理：

| 错误 | 原因 | 方案 |
|------|------|------|
| Connection refused | 市场未启动 | 确认地址正确 |
| 401 Unauthorized | API Key 无效 | 检查 KEY |
| 400 Bad Request | agent.json 格式错误 | 检查 v2.0 规范 |
| 409 Conflict | 版本冲突 | 使用 --force |

---

## 第 5 步：从市场下载并运行验证

```bash
# 下载
python -m agent_compose.cli market download <agent-name> -o ./verify-agents/

# 运行验证
python -m agent_compose.cli market run <agent-name> `
  -m "请自我介绍并说明核心能力" --model-provider openrouter --model-id openrouter/free `
  --base-url https://openrouter.ai/api/v1
```

验证成功标志：Agent 加载无误，能正确回应用户指令，MCP 工具正常响应。

---

## 注意事项

1. **agent-deploy.sh** 位于 `d:\mycode\agent-hub\agent-deploy.sh`，预置市场地址 `https://market.aitboy.cn`
2. **agent-compose** 入口：`python -m agent_compose.cli`，位于 `d:\mycode\agent-hub\agent-compose/`
3. 运行 Agent 需要设置 `OPENROUTER_API_KEY` 或等效 LLM API Key
4. Agent 命名规范：`identity.name` 使用 kebab-case（如 `code-reviewer`）
5. 版本管理遵循语义化版本号
6. 参考案例：`agent-builder/content-creator-agent.json`、`requirement-interviewer-agent.json`

---

## Skill/MCP 市场引用（v3.1 扩展）

Agent 的 `skills` 和 `mcp_servers` 字段支持**内联定义**和**市场引用**两种模式，可混合使用。

### 引用格式

```json
{
  "skills": [
    {
      "ref": "html-anything",
      "version": "^1.0.0",
      "market_url": "https://market.aitboy.cn",
      "source": "market"
    },
    {
      "name": "custom-skill",
      "display_name": "Custom Skill",
      "description": "Agent-specific skill",
      "version": "1.0.0",
      "source": "inline"
    }
  ],
  "mcp_servers": [
    {
      "ref": "tapd",
      "version": "^1.0.0",
      "market_url": "https://market.aitboy.cn",
      "source": "market",
      "env_override": { "TAPD_WORKSPACE_ID": "12345" }
    }
  ]
}
```

### Skill 独立包结构

```
my-skill/
├── skill.json          # Skill 元数据（必需）
├── SKILL.md            # Skill 指令内容（必需）
├── scripts/            # 可执行脚本（可选）
└── templates/          # 模板文件（可选）
```

### MCP Server 独立包结构

```
my-mcp/
├── mcp-server.json     # MCP Server 元数据（必需）
├── mcp-config.json     # MCP 配置（必需）
└── README.md           # 配置说明（必需）
```

### 关键命令

| 操作 | 命令 |
|------|------|
| 打包 Skill | `agent-deploy skill pack ./<skill-dir>` |
| 上传 Skill | `agent-deploy skill upload ./<skill-dir>` |
| 下载 Skill | `agent-deploy skill download <ref> -v <version>` |
| 打包 MCP | `agent-deploy mcp pack ./<mcp-dir>` |
| 上传 MCP | `agent-deploy mcp upload ./<mcp-dir>` |
| 缓存管理 | `agent-deploy cache status` / `agent-deploy cache clean` |

### 参考文档

- `SPEC_skill_mcp_reference.md` — Skill/MCP 独立打包与引用机制完整 SPEC
- `agent-protocol/specs/skill-system.md` — Skill System v3.1 规范
- `agent-protocol/specs/mcp-integration.md` — MCP Integration v3.1 规范
- `agent-protocol/specs/agent-json-v3.md` — agent.json v3.1 规范（含 SkillRef/MCPRef）
- `agent-protocol/specs/market-skill-mcp-support.md` — 市场独立打包端点规范