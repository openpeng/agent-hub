# Vercel Eve 适配可行性分析报告

## 项目概述

**Vercel Eve** 是 Vercel 于 2026 年 6 月 17 日发布的开源 Agent 框架，定位是"Agent 时代的 Next.js"。它不是一个简单的模型调用 SDK，而是一套面向生产的 Agent 基础设施框架。

**核心定位**: 解决 Agent 从 Demo 到生产环境之间的工程鸿沟

---

## Eve 架构深度解析

### 1. 文件系统优先的设计哲学

```
my-agent/
└── agent/
    ├── agent.ts          # 模型与运行时配置
    ├── instructions.md   # 系统指令（始终生效）
    ├── tools/            # 类型化工具函数
    ├── skills/           # 按需加载的操作手册
    ├── subagents/        # 可委派任务的子 Agent
    ├── channels/         # HTTP、Slack、Discord 等入口
    ├── connections/      # MCP/OAuth 连接定义
    └── schedules/        # 定时任务
```

**设计意图**:
- Agent = 一个目录，可用 Git 管理、PR 审查、版本回滚
- 文件即定义，无需注册代码
- 与低代码平台形成鲜明对比

### 2. 六大核心能力

| 能力 | 说明 | 技术基础 |
|------|------|----------|
| **Durable Execution** | 会话作为持久化工作流，可暂停/恢复/容错 | Workflow SDK (开源) |
| **Sandboxed Compute** | Agent 生成代码在隔离环境执行 | Docker/microsandbox/Vercel Sandbox |
| **Human-in-the-loop** | 工具可配置审批，工作流暂停等待 | 工作流中断恢复机制 |
| **Subagents** | 子 Agent 作为工具被调用，独立上下文 | 目录递归结构 |
| **Channels** | 同一 Agent 服务多入口 (HTTP/Slack/Discord) | 通道适配器模式 |
| **Tracing & Evals** | OpenTelemetry 追踪 + 评分测试套件 | OTel 标准 |

### 3. 技术栈

- **语言**: TypeScript (96.5%)
- **包管理**: pnpm workspace
- **运行时**: Node.js (Durable Workflow)
- **部署**: Vercel 优先，支持 Docker
- **模型**: 通过 AI Gateway 支持多提供商
- **认证**: Vercel Connect (OAuth)

---

## 与 agent-hub 的对比分析

### 架构理念对比

| 维度 | Vercel Eve | agent-hub |
|------|-----------|-----------|
| **设计哲学** | 文件系统优先，约定优于配置 | 模块化设计，配置与运行时分离 |
| **Agent 定义** | 目录结构即定义 | agent.json + worker.yaml |
| **工具系统** | TypeScript 文件，自动发现 | ToolRegistry 注册表模式 |
| **持久化** | Durable Workflow (内置) | SessionStore (Memory/File/Redis) |
| **沙箱** | 多后端适配器 (Docker/Vercel) | bash 工具直接执行 |
| **审批** | 内置，可配置 per-tool | 暂无 |
| **子 Agent** | 目录递归，独立上下文 | PipelineEngine 步骤编排 |
| **渠道** | Channel 适配器 (内置多平台) | HTTP Server + 适配器 |
| **可观测性** | OpenTelemetry (内置) | Observability 模块 |
| **评测** | evals 文件，可 CI 集成 | 暂无 |
| **部署** | Vercel 原生 + Docker | AgentOS + Market |

### 能力矩阵

```
                    Eve    agent-compose    agent-deploy
                    ---    -------------    ------------
Agent Loop          ★★★    ★★★              ★☆☆
Durable Execution   ★★★    ★★☆              ☆☆☆
Sandbox             ★★★    ★☆☆              ☆☆☆
Human Approval      ★★★    ☆☆☆              ☆☆☆
Subagents           ★★★    ★★☆              ☆☆☆
Multi-channel       ★★★    ★★☆              ☆☆☆
Tracing             ★★★    ★★★              ☆☆☆
Evals               ★★★    ☆☆☆              ☆☆☆
Config Validation   ★★☆    ★★☆              ★★★
Market/Distribution ★☆☆    ★★☆              ★★★
Cross-platform      ★☆☆    ★★★              ★★★
Import Adapters     ☆☆☆    ★★★              ★★★
```

---

## 适配可行性评估

### 高适配性领域 (可直接借鉴)

#### 1. 文件系统优先的 Agent 定义

**Eve 的做法**:
- `agent/instructions.md` -> 系统提示词
- `agent/tools/*.ts` -> 自动注册为工具
- `agent/skills/*.md` -> 按需加载的知识

**agent-hub 可借鉴**:
- 在现有 agent.json 基础上，支持从目录结构自动推导配置
- 工具目录扫描（类似 Eve 的 `tools/` 自动发现）
- skills 按需加载机制

**实现建议**:
```python
# 新增 filesystem_loader 模块
class FilesystemAgentLoader:
    def load_from_directory(self, agent_dir: str) -> AgentJsonV2:
        # 读取 agent/instructions.md
        # 扫描 tools/ 目录
        # 扫描 skills/ 目录
        # 生成 AgentJsonV2
```

#### 2. Durable Workflow 模式

**Eve 的做法**:
- 每个会话是一个持久化工作流
- 步骤 checkpoint，可暂停恢复
- 基于开源 Workflow SDK

**agent-hub 现状**:
- SessionStore 支持三种后端
- 但会话恢复粒度较粗

**适配方案**:
- 引入 Workflow SDK 或类似库
- 在 PipelineEngine 中增加 checkpoint 机制
- 将 `execute_pipeline` 改造为可恢复的工作流

#### 3. Human-in-the-loop 审批

**Eve 的做法**:
```typescript
export default defineTool({
  needsApproval: ({ toolInput }) => estimateScanGb(toolInput.sql) > 50,
  async execute({ sql }) { ... }
});
```

**agent-hub 可借鉴**:
- 在 ToolRegistry 中增加 `needs_approval` 钩子
- 在 PipelineEngine 中增加工作流暂停/恢复逻辑
- 结合 HTTP Server 提供审批端点

#### 4. Evals 评测系统

**Eve 的做法**:
```typescript
export default defineEval({
  async test(t) {
    await t.send("What was revenue last week?");
    t.calledTool("run_sql");
    t.check(t.reply, includes("net of refunds"));
  }
});
```

**agent-hub 可借鉴**:
- 新增 evals 模块
- 支持断言式测试（工具调用检查、回复内容检查）
- CI 集成能力

### 中等适配性领域 (需要架构调整)

#### 5. Sandbox 沙箱执行

**Eve 的做法**:
- 多后端适配器（Docker/microsandbox/Vercel Sandbox）
- Agent 生成代码默认不信任

**agent-hub 现状**:
- bash 工具直接在当前环境执行
- 无隔离机制

**适配难度**: 中等
- 需要引入容器化或进程隔离
- 可复用 Eve 的适配器设计

#### 6. Channel 多渠道接入

**Eve 的做法**:
- 同一 Agent 服务多入口
- 内置 Slack/Discord/Teams/Telegram/GitHub/Linear

**agent-hub 现状**:
- HTTP Server 提供 API
- 适配器系统支持导入导出

**适配方案**:
- 将 Channel 作为新的适配器类型
- 复用现有 AdapterRegistry 机制

### 低适配性领域 (生态差异)

#### 7. Vercel 生态深度绑定

Eve 深度依赖:
- Vercel AI Gateway
- Vercel Connect (OAuth)
- Vercel Sandbox
- Vercel 部署平台

这些与 agent-hub 的 Python 生态和自托管定位差异较大。

---

## 具体适配建议

### 短期 (1-2 周)

1. **Filesystem Loader**
   - 实现从目录结构加载 Agent 配置
   - 兼容 Eve 的目录约定

2. **Tool Auto-discovery**
   - 扫描 `tools/` 目录自动注册
   - 减少手动注册代码

3. **Skills 按需加载**
   - 实现 skills 模块
   - 在 PipelineEngine 中支持动态加载

### 中期 (1 个月)

4. **Workflow Checkpoint**
   - 在 PipelineEngine 中增加步骤级 checkpoint
   - 支持会话暂停/恢复

5. **Approval 机制**
   - ToolRegistry 增加审批钩子
   - HTTP Server 增加审批端点

6. **Evals 系统**
   - 实现评测框架
   - 支持断言和评分

### 长期 (2-3 个月)

7. **Sandbox 适配器**
   - 引入 Docker 隔离
   - 复用 Eve 的适配器设计

8. **Channel 系统**
   - 将多渠道接入作为一级概念
   - 实现 Slack/Discord 适配器

---

## 风险评估

| 风险 | 等级 | 说明 |
|------|------|------|
| Eve 处于 Beta | 中 | API 可能变化，需跟踪更新 |
| 技术栈差异 | 中 | TypeScript vs Python，需要桥接 |
| 生态锁定 | 低 | agent-hub 定位自托管，不受 Vercel 生态限制 |
| 维护成本 | 中 | 引入新能力会增加代码复杂度 |

---

## 结论

**总体评估**: agent-hub 可以适配 Eve 的核心设计理念，特别是文件系统优先的 Agent 定义、Durable Workflow、Human-in-the-loop 和 Evals 等能力。这些适配将显著提升 agent-hub 的生产就绪程度。

**建议优先级**:
1. **Filesystem Loader** - 提升开发者体验，与现有架构兼容
2. **Workflow Checkpoint** - 解决生产环境核心痛点
3. **Approval 机制** - 安全合规必备
4. **Evals 系统** - 质量保证基础设施

**不建议直接适配**:
- Vercel 生态专属能力（AI Gateway、Connect、Sandbox 后端）
- 保持 agent-hub 的自托管和跨平台定位

---

## 参考资料

[cite:1] [官方] Vercel Eve 产品页: https://vercel.com/eve
[cite:2] [官方] Vercel 发布博客: https://vercel.com/blog/introducing-eve
[cite:3] [官方] Eve GitHub 仓库: https://github.com/vercel/eve
[cite:4] [官方] Eve 文档: https://beta.eve.dev/docs
[cite:5] [行业报道] 微信公众号技术解读: https://mp.weixin.qq.com/s/6alf73ZucqXa0ZEOsJyPuw
