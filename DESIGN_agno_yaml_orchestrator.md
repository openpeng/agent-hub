# Agno YAML Orchestrator 设计文档

**版本**: 1.0.0
**日期**: 2026-06-19
**状态**: Draft

---

## 1. 架构设计

### 1.1 系统架构图

```
┌──────────────────────────────────────────────────────────────────────┐
│                        YamlOrchestrator                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │
│  │DefinitionLoader│    │ConfigResolver │    │RemoteAgentLoader      │ │
│  │  加载可复用定义 │    │  解析引用    │    │  远程 Agent 加载       │ │
│  └─────────────┘    └─────────────┘    └─────────────────────────┘ │
│          │                  │                      │                │
│          └──────────────────┼──────────────────────┘                │
│                             ▼                                        │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │
│  │  AgentLoader │    │  TeamLoader │    │  WorkflowLoader         │ │
│  │  构建 Agent  │    │  构建 Team  │    │  构建 Workflow           │ │
│  └─────────────┘    └─────────────┘    └─────────────────────────┘ │
│          │                  │                      │                │
│          └──────────────────┼──────────────────────┘                │
│                             ▼                                        │
│                     ┌─────────────┐                                  │
│                     │ MCPBuilder  │                                  │
│                     │ 构建 MCP 工具│                                  │
│                     └─────────────┘                                  │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      Agno Runtime                                    │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────────────┐  │
│  │  Agent  │    │  Team   │    │Workflow │    │    AgentOS      │  │
│  │         │    │         │    │         │    │  Web 服务        │  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.2 数据流

```
YAML 文件 ──▶ DefinitionLoader ──▶ 注册表
                              │
                              ▼
YAML 文件 ──▶ ConfigResolver ◀──────▶ RemoteAgentLoader
    │              │
    │              ▼
    │      解析 $ref / $file / $remote / $market
    │
    ▼
AgentLoader ──▶ Agent 对象 ──▶ AgentOS
TeamLoader ───▶ Team 对象 ──▶ AgentOS
WorkflowLoader▶ Workflow 对象──▶ AgentOS
```

---

## 2. 核心组件设计

### 2.1 DefinitionLoader

**职责**: 加载 definitions/ 目录下的可复用定义

```python
class DefinitionLoader:
    def __init__(self, defs_dir: Path):
        self.defs_dir = defs_dir
        self.skills: dict = {}
        self.mcps: dict = {}
        self.agent_templates: dict = {}
        self.tool_templates: dict = {}
        self._load_all()

    def get_skill(self, name: str) -> dict | None
    def get_mcp(self, name: str) -> dict | None
    def get_agent_template(self, name: str) -> dict | None
    def get_tool_template(self, name: str) -> dict | None
```

**文件加载顺序**:
1. `definitions/skills.yml`
2. `definitions/mcps.yml`
3. `definitions/agents.yml` (agent_templates)
4. `definitions/tools.yml`

### 2.2 ConfigResolver

**职责**: 解析配置中的引用机制

```python
class ConfigResolver:
    def __init__(self, defs_loader: DefinitionLoader, base_dir: Path,
                 remote_loader: RemoteAgentLoader = None):
        self.defs = defs_loader
        self.base_dir = base_dir
        self.remote_loader = remote_loader

    def resolve(self, cfg: dict) -> dict:
        """递归解析配置中的所有引用"""
```

**解析优先级**:
1. `$ref` — 查找可复用定义（Skill > MCP > Agent模板 > Tool模板）
2. `$file` — 加载外部文件内容
3. `$remote` — 从 HTTP URL 获取 agent.json
4. `$market` — 从 Market 拉取 agent.json

### 2.3 RemoteAgentLoader

**职责**: 从远程加载 Agent 定义

```python
class RemoteAgentLoader:
    def __init__(self, cache_dir: Path = None, market_url: str = None):
        self.cache_dir = cache_dir or Path(".remote_cache")
        self.market_url = market_url or os.getenv("MARKET_API_URL", "")
        self._cache: dict = {}

    def fetch_from_market(self, market_ref: str) -> dict:
        """从 Market 下载 Agent"""

    def fetch_from_url(self, url: str) -> dict:
        """从 URL 下载 Agent"""
```

**缓存策略**: 下载的 agent.json 缓存到 `.remote_cache/` 目录

### 2.4 MCPBuilder

**职责**: 构建 MCP 工具

```python
class MCPBuilder:
    def build(self, mcp_cfg: dict) -> list:
        """构建 MCP 工具列表"""

    def _build_stdio(self, cfg: dict) -> MCPTools
    def _build_sse(self, cfg: dict) -> MCPTools
    def _build_multi(self, cfg: dict) -> list[MCPTools]
```

### 2.5 AgentLoader

**职责**: 从 YAML 配置构建 Agent 对象

```python
class AgentLoader:
    # 内置工具注册表
    TOOL_REGISTRY = {
        "duckduckgo": ("agno.tools.duckduckgo", "DuckDuckGoTools"),
        "tavily": ("agno.tools.tavily", "TavilyTools"),
        "yfinance": ("agno.tools.yfinance", "YFinanceTools"),
        "github": ("agno.tools.github", "GithubTools"),
        "python": ("agno.tools.python", "PythonTools"),
    }

    def load(self, agent_ref: str) -> Agent:
        """加载 Agent（带缓存）"""

    def _build_model(self, model_cfg: dict) -> Any
    def _build_all_tools(self, cfg: dict) -> list
    def _build_knowledge(self, knowledge_cfg: dict) -> Any
    def _deep_merge(self, base: dict, override: dict) -> dict
```

### 2.6 TeamLoader

**职责**: 从 YAML 配置构建 Team 对象

```python
class TeamLoader:
    def __init__(self, teams_config: dict, agent_loader: AgentLoader):
        self.config = teams_config
        self.agent_loader = agent_loader
        self._cache: dict = {}

    def load(self, team_ref: str) -> Team:
        """加载 Team（带缓存）"""

    def _build_mode(self, mode: str) -> str
    def _build_leader(self, leader_cfg: Any) -> Agent
    def _build_members(self, members: list) -> list[Agent]
```

### 2.7 WorkflowLoader

**职责**: 从 YAML 配置构建 Workflow 对象

```python
class WorkflowLoader:
    def __init__(self, workflows_config: dict,
                 agent_loader: AgentLoader, team_loader: TeamLoader):
        self.config = workflows_config
        self.agent_loader = agent_loader
        self.team_loader = team_loader
        self._cache: dict = {}

    def load(self, workflow_ref: str) -> Workflow:
        """加载 Workflow（带缓存）"""

    def _build_step(self, step_cfg: dict) -> Step
    def _build_condition(self, cfg: dict) -> Condition
    def _build_parallel(self, cfg: dict) -> Parallel
    def _build_loop(self, cfg: dict) -> Loop
    def _resolve_function(self, func_ref: str) -> callable
```

### 2.8 YamlOrchestrator

**职责**: 统一入口，协调所有 Loader

```python
class YamlOrchestrator:
    def __init__(self,
                 config_dir: str = "./configs",
                 defs_dir: str = "./definitions",
                 market_url: str = None):
        # 1. 加载可复用定义
        self.defs_loader = DefinitionLoader(self.defs_dir)

        # 2. 创建远程 Agent 加载器
        self.remote_loader = RemoteAgentLoader(market_url=market_url)

        # 3. 创建配置解析器
        self.resolver = ConfigResolver(
            self.defs_loader, self.config_dir.parent, self.remote_loader
        )

        # 4. 创建 MCP 构建器
        self.mcp_builder = MCPBuilder(self.defs_loader)

        # 5. 加载实例配置
        self._load_configs()

        # 6. 创建各层级 Loader
        self.agent_loader = AgentLoader(
            self.agents_config, self.resolver, self.mcp_builder
        )
        self.team_loader = TeamLoader(
            self.teams_config, self.agent_loader
        )
        self.workflow_loader = WorkflowLoader(
            self.workflows_config, self.agent_loader, self.team_loader
        )

    def get_agent(self, name: str) -> Agent
    def get_team(self, name: str) -> Team
    def get_workflow(self, name: str) -> Workflow
    def run_workflow(self, name: str, message: str)
    def load_all(self) -> tuple[list[Agent], list[Team], list[Workflow]]
    def deploy_to_agentos(self, host: str = "0.0.0.0", port: int = 8000)
```

---

## 3. 打包器设计

### 3.1 AgentPackager

```python
class AgentPackager:
    def __init__(self, orchestrator: YamlOrchestrator):
        self.orchestrator = orchestrator

    def package_agent(self, agent_ref: str, output_dir: Path) -> Path:
        """打包单个 Agent 为 agent.json"""
```

**输出结构**:
```
dist/
└── researcher/
    ├── agent.json
    └── prompts/
        └── researcher.md
```

### 3.2 TeamPackager

```python
class TeamPackager:
    def __init__(self, orchestrator: YamlOrchestrator):
        self.orchestrator = orchestrator

    def package_team(self, team_ref: str, output_dir: Path) -> Path:
        """打包 Team 为 team.json"""
```

**输出结构**:
```
dist/
└── content_team/
    ├── team.json
    └── agents/
        └── researcher/
            └── agent.json (依赖的 Agent)
```

### 3.3 WorkflowPackager

```python
class WorkflowPackager:
    def __init__(self, orchestrator: YamlOrchestrator):
        self.orchestrator = orchestrator

    def package_workflow(self, workflow_ref: str, output_dir: Path) -> Path:
        """打包 Workflow 为 workflow.json"""
```

**输出结构**:
```
dist/
└── article_pipeline/
    ├── workflow.json
    ├── agents/
    │   └── researcher/
    │       └── agent.json
    └── teams/
        └── content_team/
            └── team.json
```

---

## 4. 错误处理

### 4.1 异常类型

| 异常 | 说明 |
|------|------|
| `YAMLNotFoundError` | YAML 文件不存在 |
| `DefinitionNotFoundError` | $ref 引用的定义不存在 |
| `FileNotFoundError` | $file 引用的文件不存在 |
| `RemoteFetchError` | 远程 Agent 获取失败 |
| `ValidationError` | 配置校验失败 |
| `BuildError` | Agno 对象构建失败 |

### 4.2 错误处理策略

```python
try:
    orchestrator.get_agent("researcher")
except DefinitionNotFoundError as e:
    logger.error(f"未找到定义: {e.ref}")
    raise
except FileNotFoundError as e:
    logger.error(f"文件不存在: {e.path}")
    raise
```

---

## 5. 缓存策略

| 组件 | 缓存内容 | 缓存方式 |
|------|---------|----------|
| AgentLoader | 已构建的 Agent 对象 | `_cache: dict` |
| TeamLoader | 已构建的 Team 对象 | `_cache: dict` |
| WorkflowLoader | 已构建的 Workflow 对象 | `_cache: dict` |
| RemoteAgentLoader | 下载的 agent.json | `.remote_cache/` 目录 |

---

## 6. 部署设计

### 6.1 AgentOS 部署

```python
def deploy_to_agentos(self, host="0.0.0.0", port=8000):
    from agno.server import AgentOS

    app = AgentOS(
        agents=[self.agent_loader.load(k) for k in self.agents_config],
        teams=[self.team_loader.load(k) for k in self.teams_config],
        workflows=[self.workflow_loader.load(k) for k in self.workflows_config],
    )
    uvicorn.run(app, host=host, port=port)
```

### 6.2 部署模式

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| 本地开发 | 直接运行 AgentOS | 开发调试 |
| Docker | 打包为容器镜像 | 测试环境 |
| Kubernetes | 横向扩展部署 | 生产环境 |

---

## 7. CLI 设计

### 7.1 主命令

```bash
fagent                      # YAML 编排入口
  orch run <workflow>       # 运行 Workflow
  orch agent <name>         # 获取 Agent
  orch team <name>          # 获取 Team
  orch deploy               # 部署到 AgentOS

agent-deploy                # agent-deploy 入口
  team package <path>       # 打包 Team
  team upload <path>        # 上传 Team
  team download <name>      # 下载 Team
  workflow package <path>   # 打包 Workflow
  workflow upload <path>    # 上传 Workflow
  workflow download <name> # 下载 Workflow
```

---

## 8. 配置校验

### 8.1 校验规则

| 字段 | 校验规则 |
|------|----------|
| name | 非空，kebab-case |
| model | 必须指定 provider 和 id |
| mode | 必须是 route/collaborate/coordinate |
| ref | 引用的定义必须存在 |
| $file | 文件路径必须存在且可读 |
| $market | 格式必须为 owner/name@version |

### 8.2 校验时机

- 加载 YAML 时立即校验
- 构建 Agno 对象前再次校验

---

## 9. 性能考虑

### 9.1 延迟加载

- DefinitionLoader 一次性加载所有定义
- Agent/Team/Workflow 按需加载
- 已加载的对象缓存复用

### 9.2 并行处理

- 远程 Agent 下载可并行
- Workflow 中 parallel 步骤并行执行

---

## 10. 扩展点

### 10.1 自定义工具

通过 `definitions/tools.yml` 定义工具模板：

```yaml
tool_templates:
  my_tool:
    name: "MyTool"
    module: "my_tools.custom"
    class: "MyToolClass"
    params:
      api_key: "${MY_TOOL_API_KEY}"
```

### 10.2 自定义评估器

在 `evaluators/` 目录实现评估函数：

```python
# evaluators/quality.py
def is_quality_pass(context: dict) -> bool:
    return context.get("quality_score", 0) >= 80
```

### 10.3 自定义处理函数

在 `handlers/` 目录实现处理函数：

```python
# handlers/publish.py
def publish_article(context: dict) -> dict:
    article = context.get("article")
    # 发布逻辑
    return {"status": "published", "url": "..."}
```

---

## 11. 测试策略

### 11.1 单元测试

| 组件 | 测试内容 |
|------|---------|
| DefinitionLoader | YAML 加载、定义查找 |
| ConfigResolver | $ref/$file 解析、深度合并 |
| AgentLoader | Agent 对象构建、工具解析 |
| TeamLoader | Team 对象构建、成员解析 |
| WorkflowLoader | Workflow 对象构建、步骤解析 |

### 11.2 集成测试

| 场景 | 测试内容 |
|------|---------|
| 完整流程 | YAML → Agno 对象 → AgentOS 运行 |
| 远程引用 | $market 拉取并构建 |
| 打包流程 | Agent/Team/Workflow 打包 |
