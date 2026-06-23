# agent-deploy Team & Workflow 扩展规范

**版本**: 1.0.0  
**日期**: 2026-06-19  
**状态**: Draft

---

## 1. 概述

### 1.1 项目背景

agent-deploy 是一个完整的 Agent 生态工具，实现了从导入到 Market 再到部署的完整闭环。当前已支持：

- **多格式导入**：从 Cursor、Claude Code、CodeBuddy、GitHub Copilot 等平台导入 Agent 定义
- **Market 分享**：将 Agent 打包为 agent.json v2.0 格式，上传到 Market
- **跨平台部署**：一键部署到 8+ AI 工具
- **Market 生态**：搜索、上传、下载、评分

### 1.2 扩展目标

在现有 Agent (agent.json v2.0) 基础上，扩展 Team 和 Workflow 的定义规范及市场管理能力：

| 层级 | 打包格式 | 职责范围 | 状态 |
|------|----------|----------|------|
| Agent | agent.json v2.0 | 定义规范 + Market 管理 | ✅ 已有 |
| Team | team.json | 定义规范 + Market 管理 | 🔴 待实现 |
| Workflow | workflow.json | 定义规范 + Market 管理 | 🔴 待实现 |

**设计原则**：Team 和 Workflow 的**执行**由外部框架（如 Agno）负责，我们专注于**定义规范**和**市场资源管理**。

### 1.3 核心能力

- **定义管理**：team.json、workflow.json 格式规范
- **打包上传**：将 Team/Workflow 打包并上传到 Market
- **下载解析**：从 Market 下载并递归解析所有依赖
- **搜索发现**：多维度搜索 Team/Workflow
- **版本管理**：SemVer 版本控制

---

## 2. 系统架构

### 2.1 架构定位

```
┌─────────────────────────────────────────────────────────────────┐
│                    agent-deploy (定义 + Market)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   定义层                    Market 层              外部执行层    │
│   ─────                    ─────────              ──────────   │
│                                                                  │
│   team.json              Market API              Agno Runtime    │
│   workflow.json    →     上传/下载/搜索    →    Team/Workflow   │
│                          依赖解析              执行              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 模块划分

```
agent-deploy
│
├── cli.ts                     # CLI 入口
│   ├── agent                  # 已有
│   ├── team                   # 新增
│   │   ├── package
│   │   ├── upload
│   │   ├── download
│   │   ├── deploy
│   │   └── list
│   └── workflow               # 新增
│       ├── package
│       ├── upload
│       ├── download
│       ├── deploy
│       └── list
│
├── packager/                  # 打包层
│   ├── agent-packager.ts     # 已有
│   ├── team-packager.ts      # 新增
│   └── workflow-packager.ts   # 新增
│
└── market.ts                  # Market 客户端
    ├── upload_agent()         # 已有
    ├── upload_team()          # 新增
    ├── upload_workflow()      # 新增
    ├── download_team()        # 新增
    ├── download_workflow()    # 新增
    └── search_*()             # 扩展
```

### 2.3 数据流

```
作者端：
  编写 team.json/workflow.json → 打包 → 上传到 Market

用户端：
  Market 搜索 → 下载 Team/Workflow → 交给外部 Runtime 执行
                    ↓
             递归解析依赖
             (下载所有引用的 Agent/Team)
```

---

## 3. team.json 格式规范

### 3.1 设计原则

team.json 的顶层结构与 agent.json v2.0 保持一致，便于统一解析：

```json
{
  "schema_version": "1.0.0",
  "identity": { ... },           // 与 agent.json v2.0 一致
  "classification": { ... },    // type = "team"
  "instructions": { ... },      // Team 全局指令
  "definition": {               // Team 核心定义
    "mode": "coordinate",
    "leader": { ... },
    "members": [ ... ],
    "shared_state": { ... }
  },
  "dependencies": { ... }       // 与 agent.json v2.0 一致
}
```

### 3.2 完整示例

```json
{
  "schema_version": "1.0.0",
  "identity": {
    "name": "doc-production-team",
    "version": "1.0.0",
    "display_name": "文档生产团队",
    "description": "技术文档自动化生产团队，包含研究员、写手、审核员",
    "author": "team-author",
    "license": "MIT"
  },
  "classification": {
    "category": "utility",
    "type": "team",
    "tags": ["documentation", "content", "automation"]
  },
  "instructions": {
    "format": "markdown",
    "source": "inline",
    "content": "# 文档生产团队\n\n协作流程：\n1. 研究员调研技术主题\n2. 写手基于调研结果创作\n3. 审核员审核质量"
  },
  "definition": {
    "mode": "coordinate",
    "leader": {
      "name": "team-leader",
      "model": "claude-sonnet-4-20250514",
      "instructions": "你是文档生产团队的 Leader，负责分配任务并审核最终结果。"
    },
    "members": [
      {
        "ref": "market://tech-researcher@^1.0.0",
        "alias": "researcher",
        "role": "负责技术调研和信息收集"
      },
      {
        "ref": "market://tech-writer@^1.0.0",
        "alias": "writer",
        "role": "负责文档撰写"
      },
      {
        "ref": "local://./agents/reviewer.json",
        "alias": "reviewer",
        "role": "负责质量审核"
      }
    ],
    "shared_state": {
      "enabled": true,
      "storage": "memory",
      "fields": ["topic", "research_notes", "draft", "feedback"]
    }
  },
  "dependencies": {
    "agents": [
      { "ref": "market://tech-researcher", "version": "^1.0.0" },
      { "ref": "market://tech-writer", "version": "^1.0.0" }
    ]
  }
}
```

### 3.3 字段说明

#### 顶层字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| schema_version | string | 是 | 固定为 "1.0.0" |
| identity | object | 是 | 身份信息，与 agent.json v2.0 一致 |
| classification | object | 否 | 分类信息，type 固定为 "team" |
| instructions | object | 否 | Team 全局指令 |
| definition | object | 是 | Team 核心定义 |
| dependencies | object | 是 | 依赖的 Agent |

#### identity 子字段（与 agent.json v2.0 一致）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | Team 唯一标识，kebab-case |
| version | string | 是 | SemVer 版本号 |
| display_name | string | 否 | 人类可读名称 |
| description | string | 是 | 功能描述，用于 Market 搜索 |
| author | string | 否 | 作者 |
| license | string | 否 | MIT 等 |

#### definition 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| mode | string | 是 | 协作模式：route / collaborate / coordinate |
| leader | object | 条件 | coordinate 模式必填 |
| members | array | 是 | 团队成员列表 |
| shared_state | object | 否 | 共享状态配置 |

#### definition.mode 协作模式

| 模式 | 说明 | 适用场景 | Leader |
|------|------|----------|--------|
| route | 按能力路由任务到合适成员 | 客服分流、问题分类 | 可选 |
| collaborate | 多成员同时处理同一任务 | 头脑风暴、多角度分析 | 可选 |
| coordinate | Leader 控制全局状态 | 复杂流水线、风控审批 | 必填 |

#### definition.leader 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | Leader 名称 |
| model | string | 是 | LLM 模型 |
| instructions | string | 是 | Leader 系统指令 |

#### definition.members[].member 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ref | string | 是 | Agent 引用路径 |
| alias | string | 是 | Team 内的别名 |
| role | string | 否 | 角色描述 |

#### Agent 引用方式

| 协议 | 格式 | 说明 |
|------|------|------|
| market:// | market://agent-name@version | 从 Market 引用 |
| local:// | local://./path/to/agent.json | 本地文件引用 |
| inline:// | inline://{...} | 内联 agent.json |

### 3.4 Team 目录结构

```
doc-production-team/
├── team.json              # Team 定义
└── agents/
    └── reviewer/
        └── agent.json     # 本地 Agent 定义（可选）
```

---

## 4. workflow.json 格式规范

### 4.1 设计原则

workflow.json 定义跨 Agent/Team 的工作流编排，执行由外部框架负责：

```json
{
  "schema_version": "1.0.0",
  "identity": { ... },           // 与 agent.json v2.0 一致
  "classification": { ... },    // type = "workflow"
  "instructions": { ... },      // Workflow 全局指令
  "definition": {               // Workflow 核心定义
    "inputs": { ... },
    "outputs": { ... },
    "steps": [ ... ]
  },
  "dependencies": { ... }        // 与 agent.json v2.0 一致
}
```

### 4.2 完整示例

```json
{
  "schema_version": "1.0.0",
  "identity": {
    "name": "content-pipeline",
    "version": "1.0.0",
    "display_name": "内容生产流水线",
    "description": "端到端内容生产流水线：调研 → 创作 → 审核 → 发布",
    "author": "workflow-author",
    "license": "MIT"
  },
  "classification": {
    "category": "utility",
    "type": "workflow",
    "tags": ["content", "pipeline", "automation"]
  },
  "instructions": {
    "format": "markdown",
    "source": "inline",
    "content": "# 内容生产流水线\n\n完整流程：\n1. 研究员调研主题\n2. 写手基于调研创作\n3. 审核员质量检查\n4. 达到质量标准则发布"
  },
  "definition": {
    "inputs": {
      "topic": { "type": "string", "required": true, "description": "内容主题" },
      "style": { "type": "string", "default": "professional", "description": "写作风格" }
    },
    "outputs": {
      "final_article": { "type": "string", "description": "最终发布的文章" },
      "quality_score": { "type": "number", "description": "质量评分 0-100" }
    },
    "steps": [
      {
        "name": "research",
        "type": "team",
        "ref": "market://doc-production-team@^1.0.0",
        "inputs": {
          "topic": "{{inputs.topic}}"
        }
      },
      {
        "name": "write",
        "type": "agent",
        "ref": "market://tech-writer@^1.0.0",
        "inputs": {
          "topic": "{{inputs.topic}}",
          "notes": "{{steps.research.notes}}"
        }
      },
      {
        "name": "quality_check",
        "type": "condition",
        "condition": "{{steps.review.quality_score}} >= 80",
        "then": "publish",
        "else": "rewrite"
      },
      {
        "name": "review",
        "type": "agent",
        "ref": "market://reviewer-agent@^1.0.0",
        "inputs": {
          "draft": "{{steps.write.draft}}"
        }
      },
      {
        "name": "parallel_checks",
        "type": "parallel",
        "steps": [
          { "name": "grammar", "ref": "market://grammar-agent@^1.0.0" },
          { "name": "fact_check", "ref": "market://fact-checker-agent@^1.0.0" }
        ]
      },
      {
        "name": "iterate",
        "type": "loop",
        "max_iterations": 3,
        "until": "{{steps.review.quality_score}} >= 90",
        "step": "rewrite"
      },
      {
        "name": "publish",
        "type": "function",
        "ref": "local://./functions/publish.py:publish_article"
      }
    ]
  },
  "dependencies": {
    "agents": [
      { "ref": "market://tech-writer", "version": "^1.0.0" },
      { "ref": "market://reviewer-agent", "version": "^1.0.0" },
      { "ref": "market://grammar-agent", "version": "^1.0.0" },
      { "ref": "market://fact-checker-agent", "version": "^1.0.0" }
    ],
    "teams": [
      { "ref": "market://doc-production-team", "version": "^1.0.0" }
    ]
  }
}
```

### 4.3 字段说明

#### 顶层字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| schema_version | string | 是 | 固定为 "1.0.0" |
| identity | object | 是 | 身份信息，与 agent.json v2.0 一致 |
| classification | object | 否 | type 固定为 "workflow" |
| instructions | object | 否 | Workflow 全局指令 |
| definition | object | 是 | Workflow 核心定义 |
| dependencies | object | 是 | 依赖的 Agent/Team |

#### definition 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| inputs | object | 否 | Workflow 输入参数 |
| outputs | object | 否 | Workflow 输出定义 |
| steps | array | 是 | 工作流步骤定义 |

#### definition.steps[].step 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 步骤唯一名称 |
| type | string | 是 | 步骤类型 |
| ref | string | 条件 | 引用路径（agent/team/function 类型必填） |
| inputs | object | 否 | 输入参数映射 |
| condition | string | 条件 | 条件表达式（condition 类型必填） |
| then | string | 条件 | 条件为真时跳转（condition 类型必填） |
| else | string | 条件 | 条件为假时跳转（condition 类型必填） |
| steps | array | 条件 | 子步骤数组（parallel 类型必填） |
| max_iterations | number | 条件 | 最大迭代次数（loop 类型必填） |
| until | string | 条件 | 退出条件表达式（loop 类型必填） |
| step | string | 条件 | 循环体步骤名（loop 类型必填） |

#### Step 类型

| 类型 | 说明 | 必填字段 |
|------|------|----------|
| agent | 执行单个 Agent | ref, inputs |
| team | 执行整个 Team | ref, inputs |
| function | 执行函数 | ref |
| condition | 条件分支 | condition, then, else |
| parallel | 并行执行多个子步骤 | steps |
| loop | 循环执行 | step, until, max_iterations |

### 4.4 变量引用语法

| 表达式 | 说明 |
|--------|------|
| {{inputs.topic}} | 引用 Workflow 输入参数 |
| {{steps.step_name.output}} | 引用指定步骤的输出 |
| {{env.VAR_NAME}} | 引用环境变量 |

### 4.5 Workflow 目录结构

```
content-pipeline/
├── workflow.json            # Workflow 定义
└── functions/
    └── publish.py           # 发布函数（可选）
```

---

## 5. 打包器实现

### 5.1 TeamPackager

```typescript
// packager/team-packager.ts

export interface TeamPackage {
  teamJson: TeamJson;
  agents: AgentPackage[];  // 依赖的 Agent
}

export class TeamPackager {
  /**
   * 打包 Team
   * 1. 读取并验证 team.json
   * 2. 解析并下载所有依赖的 Agent
   * 3. 生成打包产物
   */
  async package(teamDir: string, options?: PackageOptions): Promise<TeamPackage> {
    // 1. 读取并验证 team.json
    const teamJson = await this.loadAndValidateTeamJson(teamDir);

    // 2. 解析依赖
    const agents = await this.resolveDependencies(teamJson.dependencies);

    return {
      teamJson,
      agents
    };
  }

  /**
   * 生成 .tar.gz 归档
   */
  async archive(pkg: TeamPackage, outputPath: string): Promise<string> {
    return createTarball({
      'team.json': JSON.stringify(pkg.teamJson, null, 2),
      'agents/': pkg.agents.map(a => a.name)
    }, outputPath);
  }
}
```

### 5.2 WorkflowPackager

```typescript
// packager/workflow-packager.ts

export interface WorkflowPackage {
  workflowJson: WorkflowJson;
  agents: AgentPackage[];   // 依赖的 Agent
  teams: TeamPackage[];     // 依赖的 Team
  functions: Map<string, string>;  // 内联函数文件
}

export class WorkflowPackager {
  /**
   * 打包 Workflow
   * 1. 读取并验证 workflow.json
   * 2. 解析并下载所有依赖
   * 3. 收集内联函数文件
   * 4. 生成打包产物
   */
  async package(workflowDir: string, options?: PackageOptions): Promise<WorkflowPackage> {
    // 1. 读取并验证 workflow.json
    const workflowJson = await this.loadAndValidateWorkflowJson(workflowDir);

    // 2. 解析依赖
    const agents = await this.resolveAgentDependencies(workflowJson.dependencies);
    const teams = await this.resolveTeamDependencies(workflowJson.dependencies);

    // 3. 收集内联函数
    const functions = await this.collectInlineFunctions(workflowDir, workflowJson);

    return {
      workflowJson,
      agents,
      teams,
      functions
    };
  }
}
```

---

## 6. Market API 扩展

### 6.1 API 端点

```typescript
// Team API
POST   /api/teams/upload           // 上传 Team
GET    /api/teams/search           // 搜索 Team
GET    /api/teams/:name/:version   // 获取 Team 详情
GET    /api/teams/:name/download   // 下载 Team 包

// Workflow API
POST   /api/workflows/upload        // 上传 Workflow
GET    /api/workflows/search        // 搜索 Workflow
GET    /api/workflows/:name/:version
GET    /api/workflows/:name/download

// 统一搜索
GET    /api/search?q=...&type=agent|team|workflow&tags=...
```

### 6.2 Market 客户端

```typescript
// market.ts

export interface MarketClient {
  // ========== Agent (已有) ==========
  uploadAgent(agentPath: string): Promise<UploadResult>;
  downloadAgent(name: string, version?: string): Promise<AgentPackage>;
  searchAgents(query: SearchQuery): Promise<Agent[]>;

  // ========== Team (新增) ==========
  uploadTeam(teamPath: string): Promise<UploadResult>;
  downloadTeam(name: string, version?: string): Promise<TeamPackage>;
  searchTeams(query: SearchQuery): Promise<Team[]>;

  // ========== Workflow (新增) ==========
  uploadWorkflow(workflowPath: string): Promise<UploadResult>;
  downloadWorkflow(name: string, version?: string): Promise<WorkflowPackage>;
  searchWorkflows(query: SearchQuery): Promise<Workflow[]>;
}

export interface TeamPackage {
  teamJson: TeamJson;
  agents: AgentPackage[];  // 依赖的 Agent
}

export interface WorkflowPackage {
  workflowJson: WorkflowJson;
  agents: AgentPackage[];   // 依赖的 Agent
  teams: TeamPackage[];      // 依赖的 Team
  functions: Record<string, string>;  // 内联函数文件
}
```

### 6.3 依赖解析

```typescript
// 依赖解析：在下载时自动递归解析所有依赖

async function resolveDependencies(
  pkg: TeamPackage | WorkflowPackage,
  market: MarketClient,
  cache: Map<string, Package>
): Promise<void> {
  // 1. 解析 Agent 依赖
  for (const dep of pkg.dependencies?.agents || []) {
    if (!cache.has(dep.ref)) {
      const agent = await market.downloadAgent(dep.ref, dep.version);
      cache.set(dep.ref, agent);
      await resolveDependencies(agent, market, cache);
    }
  }

  // 2. 解析 Team 依赖 (Workflow 专属)
  for (const dep of pkg.dependencies?.teams || []) {
    if (!cache.has(dep.ref)) {
      const team = await market.downloadTeam(dep.ref, dep.version);
      cache.set(dep.ref, team);
      await resolveDependencies(team, market, cache);
    }
  }
}
```

---

## 7. CLI 命令扩展

### 7.1 team 子命令

```bash
# 打包 Team
agent-deploy team package <path> [-o, --output <dir>]

# 上传 Team 到 Market
agent-deploy team upload <path> [-m, --market <url>] [-k, --api-key <key>] [-f, --force]

# 从 Market 下载 Team（含依赖解析）
agent-deploy team download <name> [-o, --output <dir>] [--version <ver>] [--no-deps]

# 列出 Market 中的 Team
agent-deploy team list [--tag <tag>] [--author <author>]

# 本地 Team 验证
agent-deploy team validate <path>
```

### 7.2 workflow 子命令

```bash
# 打包 Workflow
agent-deploy workflow package <path> [-o, --output <dir>]

# 上传 Workflow 到 Market
agent-deploy workflow upload <path> [-m, --market <url>] [-k, --api-key <key>] [-f, --force]

# 从 Market 下载 Workflow（含依赖解析）
agent-deploy workflow download <name> [-o, --output <dir>] [--version <ver>] [--no-deps]

# 列出 Market 中的 Workflow
agent-deploy workflow list [--tag <tag>] [--author <author>]

# 本地 Workflow 验证
agent-deploy workflow validate <path>
```

### 7.3 统一命令结构

```
agent-deploy
├── agent                    # 已有
│   ├── import
│   ├── upload
│   ├── download
│   ├── deploy
│   ├── list
│   └── validate
│
├── team                     # 新增
│   ├── package
│   ├── upload
│   ├── download
│   ├── list
│   └── validate
│
└── workflow                 # 新增
    ├── package
    ├── upload
    ├── download
    ├── list
    └── validate
```

### 7.4 通用选项

| 选项 | 说明 |
|------|------|
| -m, --market <url> | 指定 Market API 地址 |
| -k, --api-key <key> | API 认证密钥 |
| -f, --force | 强制覆盖已有版本 |
| -o, --output <dir> | 输出目录 |
| --no-deps | 跳过依赖解析 |
| --dry-run | 预览操作结果但不执行 |
| --version <ver> | 指定版本 |

---

## 8. MCP 工具扩展

### 8.1 新增 MCP 工具

| MCP 工具 | 说明 |
|----------|------|
| package_team | 将 Team 打包 |
| upload_team | 上传 Team 到 Market |
| download_team | 从 Market 下载 Team（含依赖） |
| list_teams | 列出 Market 中的 Team |
| validate_team | 验证 team.json 格式 |
| package_workflow | 将 Workflow 打包 |
| upload_workflow | 上传 Workflow 到 Market |
| download_workflow | 从 Market 下载 Workflow（含依赖） |
| list_workflows | 列出 Market 中的 Workflow |
| validate_workflow | 验证 workflow.json 格式 |

---

## 9. 实现计划

### Phase 1: Team 支持 (优先级：高)

| 任务 | 工作量 | 依赖 |
|------|--------|------|
| 定义 team.json JSON Schema | 1 天 | - |
| 实现 TeamPackager | 2 天 | JSON Schema |
| 扩展 Market API (Team) | 2 天 | TeamPackager |
| CLI team 子命令 | 2 天 | TeamPackager |
| MCP 工具 (Team) | 1 天 | CLI |
| 单元测试 | 2 天 | 以上 |

### Phase 2: Workflow 支持 (优先级：高)

| 任务 | 工作量 | 依赖 |
|------|--------|------|
| 定义 workflow.json JSON Schema | 1 天 | - |
| 实现 WorkflowPackager | 2 天 | JSON Schema |
| 扩展 Market API (Workflow) | 2 天 | WorkflowPackager |
| CLI workflow 子命令 | 2 天 | WorkflowPackager |
| MCP 工具 (Workflow) | 1 天 | CLI |
| 单元测试 | 2 天 | 以上 |

### Phase 3: 集成与完善 (优先级：中)

| 任务 | 工作量 | 依赖 |
|------|--------|------|
| 端到端测试 | 2 天 | Phase 1, 2 |
| 文档完善 | 1 天 | Phase 1, 2 |
| Market 前端集成 | 3 天 | Market API 扩展 |
| 示例 Team/Workflow | 1 天 | - |

---

## 10. 向后兼容性

### 10.1 与现有 agent.json v2.0 兼容

team.json 和 workflow.json 的顶层结构与 agent.json v2.0 完全一致：

```json
{
  "schema_version": "1.0.0",  // 独立版本号
  "identity": { ... },       // 结构一致
  "classification": { ... }, // type = "team"/"workflow"
  "instructions": { ... },   // 结构一致
  "dependencies": { ... }    // 结构一致
}
```

### 10.2 Market 兼容

- 现有 Market API 保持不变
- 新增 /api/teams/* 和 /api/workflows/* 端点
- 统一搜索 API 支持 type 过滤

---

## 11. 与外部 Runtime 的协作

### 11.1 职责边界

| 层面 | 负责方 | 说明 |
|------|--------|------|
| 定义规范 | agent-deploy | team.json、workflow.json 格式 |
| 市场资源 | agent-deploy | 上传、下载、搜索、版本管理 |
| 执行引擎 | 外部框架 | Agno 等负责 Team/Workflow 执行 |

### 11.2 交接流程

```
1. 用户从 Market 下载 Team/Workflow
   agent-deploy download_team doc-production-team

2. agent-deploy 递归下载所有依赖
   ✓ doc-production-team@1.0.0
   ✓ tech-researcher@1.0.0
   ✓ tech-writer@1.0.0

3. 生成可被外部 Runtime 识别的文件结构
   doc-production-team/
   ├── team.json
   └── agents/
       ├── tech-researcher/
       └── tech-writer/

4. 用户将文件交给外部 Runtime 执行
   agno run doc-production-team --input '{"topic": "AI"}'
```

### 11.3 外部 Runtime 要求

外部 Runtime（如 Agno）需要：

1. **解析 team.json/workflow.json**：读取定义文件
2. **理解依赖声明**：从 dependencies 字段解析所需 Agent/Team
3. **支持引用协议**：market://、local://、inline://

---

## 12. 参考资料

1. [agent-deploy - GitHub](https://github.com/openpeng/agent-deploy)
2. [agent.json v2.0 规范](./docs/specs/AGENT_JSON_SPEC_V2.md)
3. [架构设计](./ARCHITECTURE.md)
4. [Phase 5 实现计划](./docs/phase5/PHASE5_PLAN.md)
