# 贡献指南

感谢你对 Agent Market 的关注！

---

## 开发环境

### 要求

- **Node.js** 18+
- **Python** 3.10+
- **TypeScript** 5.7+
- **Git**

### 克隆项目

```bash
git clone <repo-url> agent-market
cd agent-market
```

### Node.js (agent-deploy)

```bash
cd agent-deploy/node
npm install
npm run build    # 编译 TypeScript
npm test         # 运行测试 (345+ tests)
```

### Python (agent-market)

```bash
cd agent-market
pip install -r requirements.txt
pytest           # 运行测试
```

---

## 项目结构

```
agent-hub/
├── agent-deploy/node/    # 部署 + 运行时 (TypeScript, 主要开发区域)
│   ├── src/
│   │   ├── cli.ts          # CLI 命令入口 (11 命令)
│   │   ├── index.ts        # MCP Server (9 工具)
│   │   ├── adapt.ts        # Export: agent.json → 9 AI 工具
│   │   ├── import.ts       # Import: AI 工具 → agent.json
│   │   ├── market.ts       # Market HTTP 客户端
│   │   └── runtime/        # Runtime Engine
│   │       ├── agent-executor.ts  # 核心编排 (Phase 8)
│   │       ├── pipeline.ts        # Pipeline 引擎
│   │       ├── tools/             # 7 内置工具
│   │       └── builtin-tools/     # invoke_agent + list_agents
│   └── tests/              # 测试 (Vitest, 345+)
├── agent-market/          # Market 服务 (Python, FastAPI)
│   └── src/market/
│       ├── server.py      # REST API
│       ├── database.py    # SQLite (aiosqlite)
│       ├── verify.py      # 安全扫描
│       └── rate_limit.py  # 分层限流
├── agent-protocol/        # Agent 协议规范 (v3.0)
│   └── specs/             # 7 规范文档 + 2 JSON Schema
└── docs/                  # 项目文档
```

---

## 代码风格

### TypeScript

- 使用 TypeScript 严格模式
- 遵循已有代码风格
- 保持 0 编译错误和警告
- 函数和导出添加 JSDoc 注释

### Python

- 遵循 PEP 8
- 使用类型注解
- 函数添加 docstring

### 通用规则

- 所有新功能需要测试
- 保持向后兼容
- 破坏性变更需要讨论

---

## 测试

### 运行测试

```bash
# Node.js
cd agent-deploy/node
npm test

# Python
cd agent-market
pytest -v
```

### 编写测试

- 单元测试使用 Vitest (Node.js) 或 pytest (Python)
- 测试文件放在对应的 `tests/` 目录
- 测试命名: `功能名.test.ts` 或 `test_功能名.py`

### 测试覆盖要求

- 新功能: >= 80% 覆盖率
- Bug 修复: 添加回归测试

---

## 提交规范

### Commit Message 格式

```
<type>: <简短描述>

<详细说明 (可选)>
```

**类型**:
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `test`: 测试相关
- `refactor`: 重构
- `security`: 安全修复

**示例**:
```
feat: add --watch mode to run command

- Add chokidar for file watching
- Auto re-run pipeline on changes
- Support --watch flag in CLI
```

---

## 添加新平台支持

### Export (新 AI 工具格式)

1. 在 `tools-registry.yaml` 添加工具定义
2. 在 `adapt.ts` 的 `adaptAgent()` 添加格式分支
3. 编写测试
4. 更新文档

### Import (新 AI 工具格式)

1. 创建 `src/adapters/<tool>-import.ts`
2. 实现 `ImportAdapter` 接口
3. 在 `import-manager.ts` 注册新适配器
4. 编写测试
5. 更新文档

---

## 报告问题

- **Bug**: 附带复现步骤和环境信息
- **Feature Request**: 描述使用场景和期望行为
- **Security**: 见 `docs/SECURITY.md` 中的漏洞报告流程

---

## Code Review 检查项

- [ ] 代码编译通过，无错误
- [ ] 所有测试通过
- [ ] 新增功能有测试覆盖
- [ ] 文档已更新
- [ ] 向后兼容 (无破坏性变更)
- [ ] 无明显性能问题
