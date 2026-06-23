# Agno YAML Orchestrator 规范

**版本**: 1.0.0
**日期**: 2026-06-19
**状态**: Draft

---

## 1. 概述

### 1.1 项目背景

Agno 框架采用三层递进架构：Agent（单智能体）→ Team（多智能体协作）→ Workflow（步骤式工作流编排）。当前 Agno 的任务编排完全通过 Python 代码实现，存在以下痛点：

- **配置与代码耦合** — Agent 定义、工具配置、流程编排全部硬编码
- **非技术人员门槛高** — 产品经理、运营无法直接调整业务流程
- **版本管理困难** — 不同环境配置差异需要通过环境变量或分支管理

### 1.2 项目目标

在 Agno 框架之上增加 **YAML 配置解析层**，将 Agent、Team、Workflow 的定义和编排全部声明在 YAML 文件中，运行时由引擎自动解析并构建对应的 Agno 对象，实现：

- 配置与代码分离
- 非技术人员可调整编排流程
- 支持热更新
- 与 agent-deploy 生态融合，实现打包和部署

### 1.3 核心能力

| 层级 | YAML 文件 | 职责 |
|------|-----------|------|
| Agent | configs/agents.yml, definitions/agents.yml | Agent 实例定义、模板定义 |
| Team | configs/teams.yml | Team 协作定义 |
| Workflow | configs/workflows.yml | 工作流编排定义 |
| 可复用定义 | definitions/*.yml | Skill、MCP、Agent 模板可复用定义 |

---

## 2. YAML 配置规范

### 2.1 目录结构

```
fagent/
├── configs/                      # YAML 配置目录
│   ├── agents.yml               # Agent 实例定义
│   ├── teams.yml                # Team 定义
│   └── workflows.yml            # Workflow 编排
├── definitions/                  # 可复用定义目录
│   ├── skills.yml               # Skill 定义
│   ├── mcps.yml                 # MCP Server 定义
│   ├── agents.yml               # Agent 模板定义
│   └── tools.yml                # 工具模板定义
├── prompts/                      # 外部提示词文件
├── skills/                       # Skill Python 实现
├── evaluators/                   # 条件评估函数
├── handlers/                     # 自定义处理函数
├── yaml_orchestrator.py          # 编排引擎
├── main.py
└── requirements.txt
```

### 2.2 配置引用机制

| 机制 | 语法 | 说明 |
|------|------|------|
| $ref | `$ref: "definition_name"` | 引用可复用定义 |
| $file | `$file: "path/to/file.md"` | 引用外部文件 |
| $remote | `$remote: "https://..."` | 引用远程 URL 的 agent.json |
| $market | `$market: "owner/agent@version"` | 引用 Market Agent |

### 2.3 环境变量

YAML 配置中支持 `${VAR}` 语法，运行时替换为环境变量值。

### 2.4 深度合并

模板继承支持深度合并，子配置可覆盖父模板的特定字段。

---

## 3. definitions/ 可复用定义层

### 3.1 definitions/skills.yml — Skill 定义

Skill 是一组相关工具的集合，可被多个 Agent 复用。

```yaml
skills:
  web_search:
    name: "WebSearchSkill"
    description: "网络搜索能力套件"
    tools:
      - type: duckduckgo
      - type: tavily
        params:
          api_base_url: "${TAVILY_API_BASE}"
```

### 3.2 definitions/mcps.yml — MCP Server 定义

MCP（Model Context Protocol）用于连接外部工具服务器。

```yaml
mcps:
  filesystem_mcp:
    name: "FileSystem MCP"
    type: stdio
    command: "npx -y @modelcontextprotocol/server-filesystem"
    args: ["/workspace/data"]
    include_tools: ["read_file", "write_file", "list_directory"]
```

支持的 MCP 类型：stdio、SSE、multi

### 3.3 definitions/agents.yml — Agent 模板定义

```yaml
agent_templates:
  base_researcher:
    model:
      provider: openai
      id: gpt-4o
    skills:
      - $ref: "web_search"
    memory: true
    markdown: true
```

---

## 4. configs/ 实例配置层

### 4.1 configs/agents.yml — Agent 实例定义

```yaml
agents:
  researcher:
    $ref: "base_researcher"        # 继承模板
    name: "Researcher"
    description:
      $file: "prompts/researcher_desc.md"
    instructions:
      $file: "prompts/researcher.md"
    skills:
      - $ref: "web_search"
      - $ref: "file_ops"
    deploy:
      version: "1.0.0"
      author: "team@company.com"
      category: "research"
      tags: ["research", "agno"]
      targets:
        - platform: "agentos"
        - platform: "market"
          upload: true
          public: false
```

### 4.2 configs/teams.yml — Team 定义

```yaml
teams:
  content_team:
    name: "ContentTeam"
    mode: coordinate
    leader: researcher
    agents:
      - researcher
      - writer
      - editor
    instructions:
      $file: "prompts/content_team.md"
    deploy:
      version: "1.0.0"
      author: "team@company.com"
      category: "content"
      targets:
        - platform: "agentos"
        - platform: "market"
          upload: true
```

### 4.3 configs/workflows.yml — Workflow 编排

```yaml
workflows:
  article_pipeline:
    name: "Article Creation Pipeline"
    steps:
      - name: research
        type: agent
        ref: researcher

      - name: quality_check
        type: condition
        evaluator: "evaluators.is_quality_pass"
        then:
          - name: editing
            type: agent
            ref: editor
        else:
          - name: rewrite
            type: agent
            ref: writer

      - name: publish
        type: function
        ref: "handlers.publish_article"

    deploy:
      version: "1.0.0"
      author: "workflow@company.com"
      targets:
        - platform: "agentos"
```

---

## 5. Workflow Step 类型

| 类型 | 说明 | 必填字段 |
|------|------|----------|
| agent | 执行单个 Agent | ref, inputs |
| team | 执行整个 Team | ref, inputs |
| function | 执行 Python 函数 | ref |
| condition | 条件分支 | condition, then, else |
| parallel | 并行执行多个子步骤 | steps |
| loop | 循环执行直到满足条件 | step, until, max_iterations |

---

## 6. 与 agent-deploy 融合

### 6.1 打包体系

| 层级 | 打包格式 | 打包器 |
|------|----------|--------|
| Agent | agent.json v2.0 | AgentPackager |
| Team | team.json | TeamPackager |
| Workflow | workflow.json | WorkflowPackager |

### 6.2 team.json 格式

```json
{
  "schema_version": "1.0.0",
  "name": "research-writing-team",
  "version": "1.0.0",
  "description": "研究-写作协作团队",
  "mode": "coordinate",
  "leader": {
    "model": "claude-sonnet-4-20250514",
    "instructions": "你是团队领导者"
  },
  "agents": [
    { "ref": "market://research-agent@^1.2.0", "alias": "researcher" }
  ],
  "shared_state": {
    "enabled": true,
    "fields": ["topic", "research_notes", "draft"]
  },
  "dependencies": {
    "agents": [
      { "ref": "market://research-agent", "version": "^1.2.0" }
    ]
  }
}
```

### 6.3 workflow.json 格式

```json
{
  "schema_version": "1.0.0",
  "name": "content-pipeline",
  "version": "1.0.0",
  "inputs": {
    "topic": { "type": "string", "required": true }
  },
  "steps": [
    {
      "name": "research",
      "type": "agent",
      "ref": "market://research-agent@^1.2.0",
      "inputs": { "topic": "{{inputs.topic}}" }
    },
    {
      "name": "quality_check",
      "type": "condition",
      "condition": "{{steps.review.score}} >= 80",
      "then": "publish",
      "else": "rewrite"
    }
  ],
  "dependencies": {
    "agents": [
      { "ref": "market://research-agent", "version": "^1.2.0" }
    ]
  }
}
```

---

## 7. YamlOrchestrator 引擎接口

### 7.1 初始化

```python
from yaml_orchestrator import YamlOrchestrator

orchestrator = YamlOrchestrator(
    config_dir="./configs",
    defs_dir="./definitions",
    market_url="http://market.example.com"
)
```

### 7.2 核心方法

| 方法 | 说明 |
|------|------|
| `get_agent(name)` | 获取单个 Agent 对象 |
| `get_team(name)` | 获取 Team 对象 |
| `get_workflow(name)` | 获取 Workflow 对象 |
| `run_workflow(name, message)` | 运行指定 Workflow |
| `load_all()` | 加载所有 Agent、Team、Workflow |
| `deploy_to_agentos(host, port)` | 部署到 AgentOS |

### 7.3 打包器接口

```python
# Agent 打包
packager = AgentPackager(orchestrator)
packager.package_agent("researcher", Path("./dist"))

# Team 打包
team_packer = TeamPackager(orchestrator)
team_packer.package_team("content_team", Path("./dist"))

# Workflow 打包
workflow_packer = WorkflowPackager(orchestrator)
workflow_packer.package_workflow("article_pipeline", Path("./dist"))
```

---

## 8. CLI 命令

### 8.1 agent 子命令

```bash
agent-deploy agent package <path>
agent-deploy agent upload <path>
agent-deploy agent download <name>
agent-deploy agent deploy <path>
```

### 8.2 team 子命令

```bash
agent-deploy team package ./configs/teams.yml
agent-deploy team upload ./dist/team.json
agent-deploy team download content-team
agent-deploy team deploy ./configs/teams.yml
```

### 8.3 workflow 子命令

```bash
agent-deploy workflow package ./configs/workflows.yml
agent-deploy workflow upload ./dist/workflow.json
agent-deploy workflow download article-pipeline
agent-deploy workflow deploy ./configs/workflows.yml
```

---

## 9. 实现计划

### Phase 1: 核心引擎

| 任务 | 优先级 | 依赖 |
|------|--------|------|
| DefinitionLoader 实现 | P0 | - |
| ConfigResolver 实现（含 $ref/$file） | P0 | DefinitionLoader |
| AgentLoader 实现 | P0 | ConfigResolver |
| TeamLoader 实现 | P0 | AgentLoader |
| WorkflowLoader 实现 | P0 | AgentLoader, TeamLoader |
| YamlOrchestrator 统一入口 | P0 | 以上全部 |

### Phase 2: 高级特性

| 任务 | 优先级 | 依赖 |
|------|--------|------|
| $remote/$market 远程引用 | P1 | RemoteAgentLoader |
| MCPBuilder 实现 | P1 | DefinitionLoader |
| 环境变量替换 | P1 | ConfigResolver |

### Phase 3: agent-deploy 融合

| 任务 | 优先级 | 依赖 |
|------|--------|------|
| TeamPackager | P2 | YamlOrchestrator |
| WorkflowPackager | P2 | YamlOrchestrator |
| CLI team/workflow 命令 | P2 | TeamPackager, WorkflowPackager |
| AgentOS 部署集成 | P2 | YamlOrchestrator |

---

## 10. 向后兼容

- 不修改 Agno 源码，纯上层封装
- 现有代码定义的 Agent/Team/Workflow 可与 YAML 定义混合使用
- 与 agent-deploy 版本升级解耦

---

## 11. 参考资料

1. [agno-yaml-orchestrator.html](./agno-yaml-orchestrator.html)
2. [agent-deploy SPEC](../SPEC.md)
3. [agent-deploy Team & Workflow Guide](./agent-deploy-team-workflow-guide.html)
