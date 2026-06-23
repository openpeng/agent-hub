# AI Agent 生态的巴别塔困局，需要一个翻译官

> Agent Hub 产品解读系列（一）

---

## 一个正在发生的生态碎片化

2025 年是 AI 编码工具爆发的元年。Cursor 凭借 `.cursorrules` 建立了第一批 Agent 生态，Claude Code 用 skill 格式跟进，GitHub Copilot 推出 agent instruction，紧接着 Trae、Windsurf、Aider、OpenCode 各自定义了配置方式。

每家都在做正确的事——给自己的工具建立 Agent 扩展能力。但一个副作用正在显现：**Agent 生态正在碎片化。**

举一个具体的例子。你是一个前端团队的技术负责人，花了两周打磨出一套 React 代码审查 Agent，覆盖了 Hooks 规范、性能反模式、无障碍检查。团队里 5 个人用 Cursor，效果很好。

然后公司要求统一使用 Claude Code。你的 Agent 无法直接迁移——Cursor 的 `.cursorrules` 是纯 Markdown，Claude Code 的 skill 需要 YAML frontmatter，格式、存放路径、加载机制全都不一样。你得重写一遍。

三个月后，新来的同事习惯用 Trae。你又得写第三遍。

这不是假设，这是 2026 年初很多团队的真实处境。

---

## N×M 问题

从产品角度看，这是一个经典的 N×M 问题：

- N 个 Agent 定义（每个团队或个人积累的 Agent 资产）
- M 个 AI 工具平台（每个平台有自己的配置格式）

维护成本 = N × M。每新增一个平台或修改一个 Agent，成本线性增长。

更深层的问题在于**知识资产的不可迁移性**。Agent 的核心价值不在配置格式，而在 instructions 中沉淀的领域知识——代码规范、审查策略、架构原则。这些知识被锁死在特定平台的格式里，无法跨工具复用。

npm 之于 Node.js、pip 之于 Python、Docker Hub 之于容器——每个成熟的生态都有自己的包管理和分发标准。AI Agent 生态目前缺少这一层基础设施。

---

## Agent Hub 的产品定位

Agent Hub 定位为 **AI Agent 的跨平台互操作层**。它不做 AI 工具，不做 LLM，只做一件事：**让 Agent 定义与执行平台解耦。**

核心理念用一句话概括：

> **agent.json 是唯一真相来源。写一次，处处运行。**

Agent Hub 不取代任何 AI 工具。它是一个中间层，上游对接 Agent 定义（agent.json），下游对接各平台的配置格式。创作者只需维护一份 agent.json，Agent Hub 负责翻译成各平台的"方言"并安装到位。

---

## 三个产品模块

Agent Hub 由三个面向用户的产品模块组成：

### Market：Agent 的发现与分发

Market 是一个开放的 Agent 分发平台，类似 npm Registry 或 Docker Hub。创作者上传 Agent，使用者搜索、下载、评分。

与简单的文件托管不同，Market 内置了安全扫描（路径遍历检测、符号链接检测、SHA-256 完整性校验）和版本管理（SemVer 多版本共存）。使用者可以信赖从 Market 下载的 Agent 是安全的、可追溯的。

Market 目前支持五种资源类型：Agent、Team、Workflow、Skill、MCP Server。从单个 Agent 到多 Agent 协作团队，再到跨 Agent 的任务流水线，Market 都能承载。

### Deploy：一键跨平台部署

Deploy 是 Agent Hub 的核心能力。一条命令，将 agent.json 适配并安装到本地已安装的 AI 工具。

目前已支持 9 个部署目标：Cursor、Claude Code、CodeBuddy、GitHub Copilot、OpenCode、Windsurf、Trae、Aider、AGENTS.md。支持从 7 个平台反向导入：Cursor、Claude Code、CodeBuddy、GitHub Copilot、VS Code、JetBrains、OpenAI GPTs。

Deploy 还可以作为 MCP Server 运行，暴露 22 个标准工具。这意味着你可以在 Cursor 里直接让 AI "帮我从 Market 搜索并安装一个代码审查 Agent"，全程不离开当前工具。

### Builder：可视化 Agent 创建

不是每个人都会写 JSON。Builder 提供了一个 Web 界面，让非技术用户通过填表单的方式创建 Agent。

Builder 内置了 AI 自动填写功能——你用自然语言描述想要的能力，AI 自动生成配置，你再微调即可。还支持从 Market 导入已有 Agent 进行二次开发。

打包完全在浏览器端完成，无需后端服务。

---

## 谁需要 Agent Hub

**个人开发者**：你可能在多个 AI 工具之间切换（工作用 Cursor，个人项目用 Claude Code），Agent Hub 让你的 Agent 资产跟着你走，而不是跟着工具走。

**技术团队**：团队统一 Agent 规范，成员可以用不同工具但共享同一套 Agent 资产。新人入职一条命令就能配置好所有工具。

**Agent 创作者**：你写了一个好用的 Agent，想分享给社区。上传到 Market，所有人都能搜索到并一键安装到自己的工具里。

**企业**：内部积累的代码规范、审查策略、部署流程都可以封装为 Agent，通过 Market 在组织内部分发和管理。

---

## 产品哲学

Agent Hub 的设计遵循三个原则：

**平台中立**。不绑定任何 AI 工具或 LLM 提供商。agent.json 描述的是 Agent 的能力，不关心它在哪个工具里运行。

**渐进式采用**。不需要一次性迁移所有 Agent。旧格式的 Agent（SKILL.md、.cursorrules）可以直接导入转换为 agent.json，4 层 fallback 策略保证兼容性。

**安全优先**。所有从 Market 下载的 Agent 默认在受限模式下运行，敏感操作需要显式授权。上传包经过三阶段安全扫描，下载经过 SHA-256 完整性校验。

---

## 接下来

本系列将依次介绍 Agent Hub 的核心功能、使用场景和上手指南：

- **核心功能全景图**：Market、Deploy、Builder 三大模块的完整能力地图
- **快速上手指南**：从安装到创建第一个 Agent，5 分钟入门

---

**项目地址**：[https://github.com/openpeng/agent-hub](https://github.com/openpeng/agent-hub)

**下一篇**：《Agent Hub 核心功能全景图：从创建到分发到执行》
