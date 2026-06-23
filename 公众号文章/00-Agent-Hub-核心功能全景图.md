# Agent Hub 核心功能全景图：从创建到分发到执行

> Agent Hub 产品解读系列（二）

---

## 一张图看懂 Agent Hub

Agent Hub 的产品能力覆盖了 Agent 的完整生命周期：**创建 → 分发 → 部署 → 执行**。

```
创建层                    分发层                  部署层                 执行层
─────────────────────────────────────────────────────────────────────────────
Builder (可视化)                                 Deploy (CLI/MCP)
  · AI 自动填写         Market (FastAPI)           · 9 平台适配          Runtime (Pipeline)
  · Skill 选择            · 搜索/下载/评分           · 7 平台导入            · YAML 步骤编排
  · MCP 工具配置          · 安全扫描                 · use 一键闭环          · 8 个内置工具
  · 实时预览              · 版本管理                 · MCP Server 22工具     · 子 Agent 调用
  · 浏览器端打包           · 5 种资源类型                                   · Docker 沙箱
                                                                         · OpenTelemetry
```

四个层次通过 agent.json 串联——创建层生成 agent.json，分发层存储和传播 agent.json，部署层翻译 agent.json，执行层消费 agent.json。

---

## Market：Agent 的发现与分发

### 五种资源类型

Market 不只是 Agent 的仓库，它支持五种资源类型：

| 类型 | 用途 | 典型场景 |
|------|------|----------|
| **Agent** | 独立的 AI 助手 | 代码审查、文档生成、测试编写 |
| **Team** | 多 Agent 协作团队 | 技术文档生产团队（研究+写作+审校） |
| **Workflow** | 跨 Agent 任务流水线 | 内容创作流水线（研究→写作→翻译→发布） |
| **Skill** | 可复用的能力模块 | 代码搜索、日志分析、API 调试 |
| **MCP Server** | 外部工具服务 | 数据库查询、JIRA 集成、Slack 通知 |

Team 和 Workflow 是 Agent Hub 的差异化能力。市面上大多数 Agent 平台只支持单个 Agent，Agent Hub 支持多 Agent 组成协作团队（team.json 定义成员关系和协作模式），以及跨 Agent/Team 的任务编排（workflow.json 定义步骤序列和数据流）。

### 搜索与发现

Market 提供两种搜索方式：

- **分类搜索**：按 Agent/Team/Workflow 类型筛选，再按关键词、分类、标签过滤
- **统一搜索**：一次查询跨所有类型返回结果，适合不确定需要什么类型资源的场景

评分系统采用 1-5 星制，评分数据直接影响搜索排序。版本管理支持 SemVer，用户可以查看所有历史版本并回滚。

### 安全保障

从 Market 下载的每个包都经过三重安全检查：

1. **tar 成员列表检查**：检测路径遍历和符号链接攻击（不解压）
2. **内容完整性校验**：验证 agent.json 结构和必填字段（解压后）
3. **SHA-256 校验**：服务端计算摘要，客户端下载后二次验证

---

## Deploy：跨平台部署引擎

### 部署能力

Deploy 是 Agent Hub 最核心的产品能力。它解决的问题是：**agent.json 写好了，怎么让它在不同工具里跑起来？**

```bash
# 部署到所有已安装的工具
agent-deploy deploy ./my-agent

# 部署到指定工具
agent-deploy deploy ./my-agent --tool cursor

# 从 Market 搜索并一键安装
agent-deploy use code-reviewer
```

`deploy` 命令会自动检测本地安装了哪些 AI 工具，逐一适配并安装。`use` 命令实现了"搜索 → 下载 → 适配 → 安装"的完整闭环，一条命令完成从发现到使用。

### 导入能力

如果你已经有其他平台的配置，可以反向导入为标准 agent.json：

```bash
agent-deploy import ./cursor-rules --from cursor
agent-deploy import ./claude-skills --from claude
agent-deploy import ./copilot-instructions --from github
agent-deploy import ./vscode-config --from vscode
agent-deploy import ./jetbrains-config --from jetbrains
agent-deploy import ./gpts-definition --from openai
```

导入后生成的 agent.json 可以直接部署到其他平台，实现跨平台迁移。

### MCP Server 模式

Deploy 可以作为 MCP Server 运行，为 AI 工具提供 22 个标准工具。这意味着你可以在 Cursor 中直接通过对话来操作 Agent Hub：

- "帮我搜索 Market 上的代码审查 Agent"
- "下载并安装到我的工具里"
- "运行这个 Agent 审查当前文件"

AI 工具通过 MCP 协议调用 agent-deploy，全程不离开当前环境。

### CLI 体验

CLI 支持中英文自动切换、ANSI 彩色输出、进度动画。内置交互式 `init` 向导和 5 个常用模板，帮助新用户快速创建第一个 Agent。`preview` 命令可以生成 Pipeline 执行流程的 Mermaid 图，方便在部署前预览。

---

## Builder：可视化 Agent 创建

Builder 是一个 Web 应用，面向不想手写 JSON 的用户。

### 创建流程

1. **配置 Agent 信息**：名称、图标、描述、分类标签、欢迎语
2. **选择 Skills**：从 Skill 库浏览、搜索、多选、拖拽排序
3. **配置 MCP 工具**：选择外部工具、设置权限、测试连通性
4. **预览与发布**：沙箱测试、校验完整性、上传到 Market

### AI 辅助

Builder 的 AI 自动填写功能是一个亮点。你用自然语言描述想要的能力：

> "我需要一个能分析 React 组件性能的 Agent，检查不必要的重渲染和 Hooks 依赖问题"

AI 自动生成完整的 Agent 配置——名称、简介、推荐 Skills、MCP 工具、欢迎语、输入示例。你在此基础上微调即可。

### 从市场导入

看到 Market 上有不错的 Agent，想基于它做定制？Builder 支持从 Market 导入，自动填充配置到表单中。修改、扩展、重新发布，保留原作品署名。

---

## Runtime：Agent 执行引擎

Runtime 让 Agent 不只是聊天助手，而是能执行复杂任务流水线的自动化工具。

### Pipeline 编排

通过 YAML 定义步骤序列，Agent 可以：

- 读取和分析代码文件
- 执行 shell 命令
- 调用 LLM 进行推理
- 搜索网络获取信息
- 调用其他 Agent 协作
- 将前一步的结果传递给下一步

```yaml
pipeline:
  - name: read_code
    tool: read_file
    args: { path: "{{input.file}}" }
  - name: analyze
    tool: llm_chat
    args:
      prompt: "Review: {{steps.read_code.output}}"
  - name: report
    tool: write_file
    args:
      path: "review.md"
      content: "{{steps.analyze.output}}"
```

### 子 Agent 协作

单个 Agent 能力有限，但可以组合。Runtime 支持串行调用、并行调用和动态覆盖。

动态覆盖是一个强大的能力：调用一个 Agent 时，可以在运行时修改它的指令、注入新的 Skills、挂载额外的 MCP 工具。同一个"代码审查 Agent"，在 Go 项目里自动变成并发安全专家，在 Python 项目里变成类型检查专家。

### 安全沙箱

从 Market 下载的 Agent 默认在受限模式下运行。敏感操作（文件写入、网络请求、命令执行）需要 `--trusted` 显式授权。Docker 沙箱提供进程级隔离，限制 CPU、内存、网络访问。

---

## 典型使用场景

### 场景一：团队统一代码规范

技术负责人创建一套代码审查 Agent，上传到 Market。团队成员通过 `agent-deploy use code-reviewer` 一条命令安装到各自的工具里。无论团队用 Cursor 还是 Claude Code，审查标准完全一致。

### 场景二：跨平台迁移

开发者从 Cursor 切换到 Claude Code，用 `agent-deploy import ./cursor-rules --from cursor` 导入已有配置，再用 `agent-deploy deploy ./converted-agent` 部署到新工具。零手动修改。

### 场景三：多 Agent 协作

创建一个技术文档生产 Team（team.json），包含研究员、写手、审校三个角色。再创建一个 Workflow（workflow.json），编排"研究 → 写作 → 审校 → 发布"的流水线。一条命令执行整个流程。

### 场景四：非技术用户创建 Agent

产品经理通过 Builder 的 AI 自动填写功能，用自然语言描述需求，生成"竞品分析 Agent"。选择几个 MCP 工具（网页抓取、数据整理），一键发布到 Market，供团队使用。

---

**项目地址**：[https://github.com/openpeng/agent-hub](https://github.com/openpeng/agent-hub)

**上一篇**：《AI Agent 生态的巴别塔困局，需要一个翻译官》

**下一篇**：《5 分钟上手 Agent Hub：从安装到创建你的第一个 Agent》
