# 5 分钟上手 Agent Hub：从安装到创建你的第一个 Agent

> Agent Hub 产品解读系列（三）

---

## 前置条件

Agent Hub 的核心工具是 agent-deploy，一个 Node.js CLI。你需要：

- Node.js >= 18
- 至少安装了一个 AI 编码工具（Cursor、Claude Code、Trae 等）

如果你只想浏览 Market 或创建 Agent，不需要安装任何 AI 工具。

---

## 第一步：安装 agent-deploy

```bash
npm install -g agent-deploy
```

安装完成后，CLI 自动检测系统语言。中文环境下所有提示信息都是中文，英文环境下自动切换为英文。

验证安装：

```bash
agent-deploy --version
```

---

## 第二步：用 init 向导创建第一个 Agent

```bash
agent-deploy init
```

init 会启动一个交互式向导，引导你完成以下步骤：

1. **选择模板**（可选）— 内置 5 个常用模板：
   - `code-reviewer`：代码审查
   - `doc-generator`：文档生成
   - `test-writer`：测试编写
   - `refactor-helper`：重构助手
   - `quality-checker`：质量检查

2. **填写基本信息**：
   - Agent 名称（kebab-case，如 `my-reviewer`）
   - 版本号（默认 `1.0.0`）
   - 描述（一句话简介）
   - 作者信息

3. **编写指令**：这是 Agent 的核心——告诉它该做什么、不该做什么、遵循什么规范。支持 Markdown 格式。

4. **选择 Skills 和 MCP 工具**（可选）：按需添加能力模块

完成后，init 会在当前目录生成一个标准的 Agent 项目结构：

```
my-reviewer/
├── agent.json        # Agent 定义（唯一真相来源）
├── instructions.md    # 行为指令（外部文件引用）
└── workers/
    └── main.yaml     # Pipeline 定义（可选）
```

---

## 第三步：部署到你的 AI 工具

```bash
cd my-reviewer
agent-deploy deploy .
```

agent-deploy 会自动扫描系统，检测已安装的 AI 工具，并逐一适配安装。

如果你想指定目标工具：

```bash
agent-deploy deploy . --tool cursor
agent-deploy deploy . --tool claude_code
agent-deploy deploy . --tool trae
```

部署完成后，打开你的 AI 工具，Agent 就已经就绪了。在 Cursor 中它会出现在 commands 列表里，在 Claude Code 中它会出现在 skills 目录下。

---

## 第四步：从 Market 发现和安装 Agent

如果你不想自己创建，Market 上可能有现成的：

```bash
# 搜索
agent-deploy search "code review"

# 查看详情
agent-deploy info code-reviewer

# 一键安装
agent-deploy use code-reviewer
```

`use` 命令会自动完成：搜索 → 下载 → 解析依赖 → 适配格式 → 安装到本地工具。一条命令，从发现到使用。

给喜欢的 Agent 评分：

```bash
agent-deploy rate code-reviewer --stars 5 --comment "帮我发现了三个潜在 bug"
```

---

## 第五步：导入已有的 Agent 配置

如果你已经在其他平台有积累，可以直接导入：

```bash
# 从 Cursor 导入
agent-deploy import .cursorrules --from cursor

# 从 Claude Code 导入
agent-deploy import ./claude-skills --from claude

# 从 GitHub Copilot 导入
agent-deploy import ./copilot-instructions --from github
```

导入后会在当前目录生成标准的 agent.json。你可以直接部署，也可以修改后再部署。

---

## 第六步：运行 Pipeline Agent

如果你的 Agent 包含 Pipeline 定义（worker.yaml），可以独立运行：

```bash
agent-deploy run ./my-reviewer --args "file=src/app.ts"
```

添加 `--verbose` 查看详细执行日志：

```bash
agent-deploy run ./my-reviewer --args "file=src/app.ts" --verbose
```

用 `preview` 命令预览 Pipeline 执行流程（生成 Mermaid 图）：

```bash
agent-deploy preview ./my-reviewer
```

---

## 用 Builder 创建 Agent（无需命令行）

如果你更喜欢图形界面，可以启动 Builder：

```bash
git clone https://github.com/openpeng/agent-hub.git
cd agent-hub
npm install
npm run dev
```

打开 `http://localhost:5173`，你会看到 Builder 的首页。

Builder 的创建流程：

1. 点击"创建 Agent"进入向导
2. 填写名称、图标、描述、分类
3. 从 Skill 库选择能力模块（支持搜索和多选）
4. 配置 MCP 外部工具（可选）
5. 实时预览 Agent 效果
6. 点击"发布"上传到 Market

Builder 还支持两个快捷入口：

- **AI 自动填写**：用自然语言描述需求，AI 生成配置
- **从 Market 导入**：选择已有 Agent，在此基础上修改

---

## 常用命令速查

| 命令 | 用途 |
|------|------|
| `agent-deploy init` | 交互式创建 Agent |
| `agent-deploy init --template code-reviewer` | 基于模板创建 |
| `agent-deploy deploy ./my-agent` | 部署到所有工具 |
| `agent-deploy deploy ./my-agent --tool cursor` | 部署到指定工具 |
| `agent-deploy use code-reviewer` | 从 Market 一键安装 |
| `agent-deploy search "keyword"` | 搜索 Market |
| `agent-deploy info agent-name` | 查看详情 |
| `agent-deploy import ./rules --from cursor` | 从平台导入 |
| `agent-deploy upload ./my-agent` | 上传到 Market |
| `agent-deploy run ./my-agent --args "key=value"` | 运行 Pipeline |
| `agent-deploy preview ./my-agent` | 预览 Pipeline 流程 |
| `agent-deploy validate ./my-agent` | 校验 agent.json 格式 |
| `agent-deploy check-updates` | 检查已部署 Agent 的更新 |
| `agent-deploy clean` | 清理缓存 |
| `agent-deploy team upload ./my-team` | 上传 Team |
| `agent-deploy workflow list` | 列出 Workflow |
| `agent-deploy templates` | 查看可用模板 |

---

## 下一步

完成 5 分钟上手后，你可以：

- 阅读 agent.json v3.0 协议规范，了解完整的 Schema 定义
- 浏览 Market，发现社区贡献的 Agent
- 尝试创建 Team 和 Workflow，体验多 Agent 协作
- 阅读技术深度解析系列，了解底层实现

---

**项目地址**：[https://github.com/openpeng/agent-hub](https://github.com/openpeng/agent-hub)

**上一篇**：《Agent Hub 核心功能全景图：从创建到分发到执行》

**后续**：技术深度解析系列（6篇），从源码层面解析各模块的设计与实现
