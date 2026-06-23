# Agent Hub 项目状态

**最后更新**: 2026-06-17
**当前阶段**: Phase 9 ✅ **完成** | Market Skills & MCP 支持
**完成度**: Phase 1-8: 100% ✅ | Phase 9: 100% ✅

---

## 进度总览

| Phase | 内容 | 状态 |
|-------|------|------|
| Phase 1 | Export — 部署到 AI 工具 | ✅ 完成 (2026-06-06) |
| Phase 2 | Import — 从 AI 工具导入 | ✅ 完成 (2026-06-06) |
| Phase 3 | Market Integration — 上传/下载 | ✅ 完成 (2026-06-07) |
| Phase 4 | Enhanced UX — 列表/搜索/错误处理/模板 | ✅ 完成 (2026-06-07) |
| Phase 5 | Runtime Engine — Pipeline + 内置工具 | ✅ 完成 (2026-06-07) |
| Phase 6.0 | Agent Composition — 依赖/缓存/编排 | ✅ 完成 (2026-06-07) |
| Phase 7 | Security & Quality — 安全/质量治理 | ✅ 完成 (2026-06-08) |
| Phase 8 | Agent Gateway — execute/list + Overrides | ✅ 完成 (2026-06-08) |
| Phase 9 | Market Skills & MCP — 技能/MCP 市场管理 | ✅ 完成 (2026-06-17) |

---

## Phase 9: Market Skills & MCP ✅ (2026-06-17)

- **4 张新表**：skills / mcp_servers / agent_skills / agent_mcp_servers（多对多关联 + 级联删除）
- **3+3 种格式归一化**：支持 3 种 skills 格式 + 3 种 MCP 格式统一提取
- **8 个新 REST 端点**：Skills/MCP 的 CRUD + 市场级列表/详情
- **Agent 命名空间**：`agent-name/skill-name` 全局唯一标识
- **搜索增强**：`?skill=` / `?mcp=` JOIN 筛选替代 LIKE 全表扫描
- **发现协议扩展**：`skill` / `mcp_server` / `has_skill` / `has_mcp` 维度
- **19 个测试** (10 单元 + 9 集成)，100% Pass
- **独立注册**：支持 POST /skills 和 POST /mcp-servers 独立注册
- **规范文档**：[market-skill-mcp-support.md](agent-protocol/specs/market-skill-mcp-support.md)

---

## Phase 1: Export ✅

- agent.json 核心化，消除 SKILL.md 硬依赖
- 多格式 Agent 支持 (inline / file-based / subagents)
- 跨平台部署到 9 个 AI 编码工具
- 4 层 fallback 策略，100% 向后兼容
- 22 个测试全部通过

## Phase 2: Import ✅

- 从 4 平台 (Cursor, Claude Code, CodeBuddy, GitHub Copilot) 导入
- 自动检测源格式，强制指定适配器
- CLI `import` 命令 + MCP `import_agent` 工具
- Dry-run 预览模式
- 31 个测试全部通过

## Phase 3: Market Integration ✅

- Upload Agent 到 Market (CLI + MCP)
- Download Agent 从 Market
- Deploy 命令 (自动检测工具 → 适配 → 安装)
- 完整双向闭环: Import → Market → Download → Deploy
- 7 个 MCP 工具，用户友好错误处理

## Phase 4: Enhanced UX ✅

- `list` 命令 — 列出本地 Agent
- `search` 命令 — 搜索 Market Agent
- `info` 命令 — Agent 详细信息
- 12 个错误处理器 (UserFriendlyError 框架)
- 5 个 Agent 模板 + `init` / `templates` 命令
- 自举能力：系统可用 Agent 创建 Agent

## Phase 5: Runtime Engine ✅

- YAML Pipeline 解析器和执行引擎 (87 tests)
- 8 个内置工具: read_file, write_file, bash, glob, llm_chat, web_fetch, web_search, invoke_agent (127 tests)
- 子 Agent 机制，ToolRegistry 继承 (36 tests)
- CLI `run` 命令 + V2 兼容层 (18 tests)
- MCP/Skill/Memory 集成接口
- `use` 命令: 一键下载 + 适配 + 安装

## Phase 6.0: Agent Composition ✅

- Context-based ToolRegistry (无全局状态)
- Market Agent Loader (`market://` URL)
- Agent 缓存 (manifest + semver)
- 递归依赖解析 + DFS 循环检测
- `use` 命令增强 (Market → 本地缓存)

### Phase 6.1+ 待开发
- 并发调用 (invoke_agent_parallel)
- Pipeline 错误恢复增强 (指数退避重试 / 条件求值)
- 资源管理与监控

---

## 测试覆盖

| 测试套件 | 文件 | 测试数 | 状态 |
|----------|------|--------|------|
| Export | adapt.test.ts | 22 | ✅ |
| Import Unit | import.test.ts | 20 | ✅ |
| Import MCP | import-mcp.test.ts | 11 | ✅ |
| Server | server.test.ts | 9 | ✅ |
| Pipeline Engine | runtime-pipeline.test.ts | 87 | ✅ |
| Built-in Tools | tools/*.test.ts | 127 | ✅ |
| Subagent | runtime/subagent.test.ts | 36 | ✅ |
| V2 Compat | runtime/v2-compat.test.ts | 18 | ✅ |
| CLI Run | integration/cli-run.test.ts | 6 | ✅ |
| E2E | integration/e2e.test.ts | 7 | ✅ |
| Other | context/parser/template/registry | 11+ | ✅ |
| **总计** | | **345+** | **✅** |

---

## CLI 命令总览 (11 个)

| 命令 | Phase | 功能 |
|------|-------|------|
| `import` | 2 | 从 AI 工具导入 Agent |
| `upload` | 3 | 上传 Agent 到 Market |
| `deploy` | 3 | 部署 Agent 到 AI 工具 |
| `list` | 4 | 列出本地 Agent |
| `search` | 4 | 搜索 Market Agent |
| `info` | 4 | 查看 Agent 详细信息 |
| `init` | 4 | 从模板创建 Agent |
| `templates` | 4 | 列出可用模板 |
| `run` | 5 | 执行 Agent Pipeline |
| `use` | 5-6 | 一键下载 + 适配 + 安装 |
| `clean` | 7 | 清理全局安装（自动跳过系统工具） |

---

## MCP 工具 (9 个)

| 工具 | 功能 |
|------|------|
| `adapt_agent` | Agent 适配到 AI 工具 |
| `deploy_agent` | 部署 Agent |
| `import_agent` | 从 AI 工具导入 |
| `install_agent` | 安装已适配的 Agent |
| `upload_agent` | 上传到 Market |
| `download_agent` | 从 Market 下载 |
| `list_installed_tools` | 列出已安装工具 |
| `execute_agent` | 执行 Agent（支持 overrides） |
| `list_agents` | 发现可用 Agent（本地 + Market） |


---

## Phase 7: Security & Quality ✅

### 安全模型
- [x] Runtime 沙箱 (ExecutionPolicy + 默认受限)
- [x] API Key SHA-256 哈希存储
- [x] 上传包安全扫描 (路径遍历/大小/符号链接)
- [x] Agent 下载完整性校验 (SHA-256)
- [x] Rate Limiting

### 质量治理
- [x] Agent 生命周期状态 (deprecate API)
- [x] 发布前验证门禁 (schema + 引用完整性)
- [x] 评分系统 (ratings API)
- [ ] 模板扩展

### 基础设施
- [x] Docker 化 (Dockerfile + docker-compose.yml)
- [ ] GitHub Actions CI/CD
- [ ] 安全测试套件
- [x] 文档更新 (README/STATUS/新增)

## Phase 8: Agent Gateway ✅

### Agent 执行能力
- `agent-executor.ts` — 核心编排模块，CLI 和 MCP 共用
- Agent 来源解析: local → market:// → sibling → cwd
- 上下文四层模型: agent.json → worker.yaml → ToolRegistry → ExecutionContext

### 动态覆盖 (Overrides)
- `instructions` — 覆盖 agent system_prompt
- `skills` — 注入自定义 skill（与默认合并，同名覆盖）
- `mcp_servers` — 挂载外部 MCP server（与默认合并，同名覆盖）
- `shared_context` — 注入共享上下文
- `trusted` / `cwd` / `env` — 安全模式/工作目录/环境变量

### MCP 工具扩展 (7 → 9)
- `execute_agent` — 执行 Agent，支持 8 种动态覆盖
- `list_agents` — 发现可用 Agent（本地 + Market）

### 扩展文件
| 文件 | 操作 |
|------|------|
| `runtime/agent-executor.ts` | 新增 — 核心编排模块 |
| `runtime/types.ts` | 扩展 — ExecutionContext +instructions |
| `runtime/context.ts` | 扩展 — instructions 存取 |
| `runtime/mcp-integration.ts` | 扩展 — +registerFromConfig() |
| `runtime/skill-integration.ts` | 扩展 — +registerFromDefs() |
| `runtime/builtin-tools/invoke-agent.ts` | 扩展 — 支持 overrides |
| `runtime/builtin-tools/list-agents.ts` | 扩展 — 支持市场发现 |
| `index.ts` | 扩展 — +execute_agent +list_agents MCP 工具 |
| `cli.ts` | 重构 — run 命令改用 agent-executor |

详见 `ARCHITECTURE.md`。


---

## 里程碑

| 日期 | 事件 |
|------|------|
| 2026-06-03 | 项目启动 |
| 2026-06-06 | Phase 1 + Phase 2 完成 (Export + Import) |
| 2026-06-07 | Phase 3 完成 (Market Integration) |
| 2026-06-07 | Phase 4 完成 (Enhanced UX) |
| 2026-06-07 | Phase 5 完成 (Runtime Engine) |
| 2026-06-07 | Phase 6.0 完成 (Agent Composition) |
| 2026-06-08 | Phase 7 完成 (Security & Quality) |
| 2026-06-08 | Phase 8 完成 (Agent Gateway) |
| 2026-06-08 | 生态导入: 3 个社区 Agent (code-reviewer/debugger/git-workflow-manager) |

---

**状态**: ✅ Phase 1-8 全部完成  **测试**: 345+ tests, 100% pass  **生产就绪**: ✅ 是  **下一步**: Phase 6.1+ 并发调用增强 + Pipeline 优化

---

## 经验总结

### 安全模型

| 经验 | 详情 |
|------|------|
| **默认受限 + 显式授权** | Agent 默认不能执行 bash/web_fetch/跨目录文件操作，需 `--trusted` 标志 |
| **子Agent信任传播** | invoke_agent 需调用 `PolicyRegistry.propagateTrust(parent, child)` |
| **危险命令 denyList** | 全局生效，即使 trusted 也拦截 rm -rf /, chmod 777, dd if= |
| **内网 IP 拦截** | web_fetch 硬编码拒绝 127., 10., 172.16-31., 192.168. |

### Pipeline 执行

| 经验 | 详情 |
|------|------|
| **环境变量继承链** | process.env → ExecutionContext.env → 子Agent(getAllEnv) → 孙Agent |
| **skip vs continue** | skip 不记录 error(仅warn); continue 记录 error 供后面 when: 检测 |
| **Retry 指数退避** | config: max_attempts/backoff:exponential/initial_delay_ms/max_delay_ms + 25%抖动 |
| **嵌套变量访问** | TemplateResolver 支持 {{steps.X.output.content.field}} 级联属性 |
| **Pipeline 超时** | Step级 timeout_ms(Promise.race) + Pipeline级 execute(timeoutMs)(AbortController) |
| **when 条件求值** | `== != > < >= <= && ||` 安全求值 |

### LLM 工具

| 经验 | 详情 |
|------|------|
| **多命名约定兼容** | ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN 均识别 |
| **自定义 endpoint** | 自动从 ANTHROPIC_BASE_URL / OPENAI_BASE_URL 读取 |
| **模型回退链** | args.model → env.ANTHROPIC_MODEL → env.OPENAI_MODEL → 硬编码默认 |
| **默认模型** | claude-3-5-sonnet-latest (比 -20241022 更兼容代理) |

### 生态验证发现的 Bug (2026-06-07)

| Bug | 根因 | 修复文件 |
|-----|------|---------|
| --trusted 下 web_fetch 仍被拦截 | `context.agent?.identity?.name` undefined | cli.ts + 各工具.ts |
| process.env 未透传给 Agent | envVars 初始化为 {} | cli.ts |
| {{steps.X.output.content}} 深层访问失败 | resolveStepPath 只访问一级属性 | template.ts |
| 子Agent 无父环境变量 | invoke_agent 未传 env | invoke-agent.ts |
| 子Agent 无父信任策略 | 无信任传播机制 | policy.ts + invoke-agent.ts |
| 模板 JSON 编译后未同步 dist | tsc 不复制 .json | package.json build 脚本 |

### Agent 协作协调 (2026-06-07)

| 机制 | 写法 | 效果 |
|------|------|------|
| invoke 语法糖 | `invoke: agent-name` + `with: {}` | 4行→2行，无需记 tool+args |
| invoke_parallel | `invoke_parallel: [{agent,with}]` | N个Agent并行，耗时=max |
| 结果映射 `as` | `as: { key: "{{output.field}}" }` | 提取子Agent输出到 shared_context |
| 错误传播修复 | invoke_agent throw 而非 return error | Pipeline on_fail/retry 生效 |
| 子Agent自动注册 | agent.json subagents → agent/name 工具 | 不写路径，名称引用 |

### 错误传播修复

### 开发约定

1. Context 中 agent 对象同时含 `name` 和 `identity: { name }`
2. invoke_agent 失败应 throw 让 Pipeline on_fail 接管
3. Windows 路径使用正斜杠 `/`
4. 构建: `tsc && cp src/templates/*.json dist/templates/`
5. 模板变量与 Pipeline 参数命名空间共享，避免冲突
6. `invoke_parallel` 中 on_fail: continue 可实现部分失败容忍

### 场景演练 (2026-06-08)

**daily-report Agent**: 读取数据 → invoke_parallel(文本总结+消息通知) → 保存报告

演练关键日志:
- trace_id: b7f20c42 全链路统一传播
- read_data(1ms) → parallel{ text-summarizer(LM 503→降级) + notification-agent(549ms) }
- on_fail: continue 生效，部分失败后继续执行 save_report
- Provider 自动降级日志: "↳ llm_chat: 'anthropic' failed, trying next provider..."

验证通过: invoke_parallel 并行、Provider 自动降级、Trace ID 全链路、on_fail continue、JSON 结构化日志
