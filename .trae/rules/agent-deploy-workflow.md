# Agent Deploy Workflow — TRAE Rules

当用户要求制作 Agent 并推送到云端市场时，按以下步骤执行：

## 步骤概览

1. **接收地址** — 获取用户提供的市场地址，确认可用（`curl <地址>/health`）
2. **研究需求** — 追问明确 Agent 名称、用途、能力、目标用户、MCP 需求
3. **制作 Agent** — 创建 `agent.json`（v2.0 规范），参考 `d:\mycode\agent-hub\agent.md` 模板
4. **本地验证** — `agent-deploy.sh adapt --dry-run` + `agent-compose market run` 测试
5. **推送市场** — 设 `$env:MARKET_API_URL` 为用户地址，`agent-deploy.sh upload`
6. **下载确认** — `agent-compose market download` + `market run` 二次验证

## 关键命令速查

| 操作 | 命令 |
|------|------|
| 适配预览 | `./agent-deploy.sh adapt ./<agent> cursor --dry-run` |
| 上传 Agent | `./agent-deploy.sh upload ./<agent>` |
| 覆盖上传 | `./agent-deploy.sh upload ./<agent> --force` |
| 上传 Skill 包 | `./agent-deploy.sh skill upload ./<skill-dir>` |
| 上传 MCP 包 | `./agent-deploy.sh mcp upload ./<mcp-dir>` |
| 从市场下载 | `python -m agent_compose.cli market download <name> -o ./verify-agents/` |
| 从市场运行 | `python -m agent_compose.cli market run <name> -m "..." ...` |
| 本地运行 | `python -m agent_compose.cli market run ./<agent> -m "..." ...` |

## Skill/MCP 市场引用（v3.1）

Agent 的 skills 和 mcp_servers 支持两种模式：
- **内联模式**：直接在 agent.json 中定义（向后兼容）
- **引用模式**：通过 `ref` + `version` + `market_url` 引用市场已发布的 Skill/MCP 包

```json
{
  "skills": [
    { "ref": "html-anything", "version": "^1.0.0", "market_url": "https://market.aitboy.cn", "source": "market" }
  ],
  "mcp_servers": [
    { "ref": "tapd", "version": "^1.0.0", "market_url": "https://market.aitboy.cn", "source": "market", "env_override": { "TAPD_WORKSPACE_ID": "12345" } }
  ]
}
```

> 参考文档：
> - `d:\mycode\agent-hub\agent.md`（完整工作流指南）
> - `d:\mycode\agent-hub\SPEC_skill_mcp_reference.md`（Skill/MCP 引用机制 SPEC）
> - `d:\mycode\agent-hub\agent-protocol\specs\skill-system.md`（Skill System v3.1 规范）
> - `d:\mycode\agent-hub\agent-protocol\specs\mcp-integration.md`（MCP Integration v3.1 规范）