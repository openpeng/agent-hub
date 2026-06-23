# Skill & MCP 独立打包与引用机制 SPEC

**版本**: 1.0.0  
**状态**: Draft  
**日期**: 2026-06-23  
**关联规范**: agent.json v3, Skill System, MCP Integration, Market Skills & MCP Support

---

## 1. 问题陈述

### 1.1 当前架构的痛点

| 痛点 | 现状 | 影响 |
|------|------|------|
| Skill 内容丢失 | `/api/v1/skills` 只存元数据，无 instructions/content 字段 | SKILL.md 的详细指令（角色定位、设计约束、工作流程）无法通过 API 获取 |
| Skill 无法独立分发 | 无 `/skills/{id}/download` 端点，无 `pack_skill()` 函数 | Skill 只能随 Agent 包一起下载，无法独立安装和复用 |
| Agent 包臃肿 | Skill 内联在 agent.json `skills` 数组或打包在 `skills/` 目录 | 多个 Agent 引用同一 Skill 时重复打包，版本更新需重新发布所有 Agent |
| 无版本引用机制 | agent.json 中 skills 是完整内联定义，无 `ref`/`version`/`market_url` | Skill 更新后，引用它的 Agent 无法自动获取新版本 |
| MCP 同理 | MCP 配置内联在 agent.json 或打包在 `mcp/` 目录 | 重复配置，无法共享和更新 |

### 1.2 目标

- Skill 可独立打包、独立发布、独立下载
- Agent 通过引用（而非内联）使用 Skill 和 MCP Server
- 运行时自动解析引用、下载依赖、缓存复用
- 市场更新 Skill/MCP 新版本后，引用方自动获取（或显式升级）

---

## 2. 核心设计

### 2.1 三种使用模式对比

```
模式 A: 内联打包（现有）          模式 B: 市场引用（新增）           模式 C: 混合（推荐）
┌─────────────────────┐          ┌─────────────────────┐          ┌─────────────────────┐
│ my-agent/           │          │ my-agent/           │          │ my-agent/           │
│ ├── agent.json      │          │ ├── agent.json      │          │ ├── agent.json      │
│ │   └── skills: [   │          │ │   └── skills: [   │          │ │   └── skills: [   │
│ │       {name,      │          │ │       {ref,       │          │ │       {ref,       │
│ │        display,   │          │ │        version,   │          │ │        version},  │
│ │        desc,      │          │ │        market_url}│          │ │       {name,      │
│ │        version,   │          │ │   ]               │          │ │        display,   │
│ │        category,  │          │ └── (无 skills/ 目录)│         │ │        ...}       │
│ │        icon}      │          │                     │          │ │   ]               │
│ │   ]               │          │ 运行时自动下载:      │          │ ├── skills/         │
│ └── skills/         │          │ ~/.agent-hub/cache/ │          │ │   └── local-skill/│
│     └── skill-a/    │          │   └── skills/       │          │ └── mcp/            │
│         ├── agent.json│        │       └── skill-a/  │          │     └── local-mcp/  │
│         └── worker.yaml│       │           └── ...   │          └─────────────────────┘
└─────────────────────┘          └─────────────────────┘          └─────────────────────┘
     自包含但臃肿                    精简但依赖网络                      灵活可控
```

### 2.2 引用格式规范

#### SkillRef（agent.json 中 skills 数组元素）

```typescript
interface SkillRef {
  // 模式 A: 内联完整定义（向后兼容）
  name?: string;
  display_name?: string;
  description?: string;
  version?: string;
  category?: string;
  icon?: string;
  parameters?: Record<string, any>;

  // 模式 B: 市场引用（新增）
  ref?: string;           // 引用标识: "html-anything" 或 "openpeng/html-anything"
  version?: string;       // 版本约束: "^1.0.0", ">=2.0.0", "*"
  market_url?: string;    // 市场地址: "https://market.aitboy.cn"
  source?: "inline" | "market" | "local";  // 来源类型
}
```

**解析规则**:
- 如果 `ref` 存在 → 市场引用模式
- 如果 `name` 存在且无 `ref` → 内联模式（向后兼容）
- `source` 显式声明时以 `source` 为准

#### MCPRef（agent.json 中 mcp_servers 数组元素，新增）

```typescript
interface MCPRef {
  // 模式 A: 内联完整定义（向后兼容）
  name?: string;
  description?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;

  // 模式 B: 市场引用（新增）
  ref?: string;           // 引用标识: "tapd" 或 "openpeng/tapd"
  version?: string;       // 版本约束
  market_url?: string;    // 市场地址
  source?: "inline" | "market" | "local";

  // 运行时覆盖（可选）
  env_override?: Record<string, string>;  // 覆盖引用的 env
}
```

### 2.3 版本约束语法

| 语法 | 含义 | 示例 |
|------|------|------|
| `1.0.0` | 精确版本 | 只匹配 1.0.0 |
| `^1.0.0` | 兼容版本 | 匹配 1.x.x，不匹配 2.0.0 |
| `~1.0.0` | 近似版本 | 匹配 1.0.x，不匹配 1.1.0 |
| `>=1.0.0` | 大于等于 | 匹配 1.0.0 及以上 |
| `*` | 任意版本 | 匹配最新版本 |
| `1.0.0 <= 2.0.0` | 范围 | 匹配 1.0.0 到 2.0.0 之间 |

---

## 3. Skill 包规范

### 3.1 Skill 包结构

```
html-anything-skill/
├── skill.json          # Skill 元数据（必需）
├── SKILL.md            # Skill 指令内容（必需）
├── scripts/            # 可执行脚本（可选）
│   ├── pre-install.sh  # 安装前钩子
│   └── post-run.py     # 运行后钩子
├── templates/          # 模板文件（可选）
│   └── default.html
└── README.md           # 使用说明（可选）
```

### 3.2 skill.json 格式

```json
{
  "schema_version": "1.0.0",
  "identity": {
    "name": "html-anything",
    "version": "1.0.0",
    "display_name": "HTML Anything",
    "description": "将 Markdown、CSV、Excel 等内容转换为精美可发布的 HTML",
    "author": "Open Design Team",
    "license": "MIT",
    "tags": ["html", "design", "publish", "markdown"]
  },
  "content": {
    "format": "markdown",
    "source": "file",
    "file": "SKILL.md"
  },
  "capabilities": [
    "html-generation",
    "markdown-to-html",
    "presentation-creation"
  ],
  "scripts": {
    "pre_install": "scripts/pre-install.sh",
    "post_run": "scripts/post-run.py"
  },
  "dependencies": {
    "nodejs": ">=18.0.0"
  }
}
```

### 3.3 Skill 打包

```bash
# 打包命令
agent-deploy skill pack ./html-anything-skill -o html-anything-skill-v1.0.0.tar.gz

# 包内容验证
agent-deploy skill verify ./html-anything-skill-v1.0.0.tar.gz
```

**打包规则**:
- tar.gz 格式，顶层目录名为 `{name}-v{version}/`
- 必须包含 `skill.json` 和 `SKILL.md`
- 可选包含 `scripts/`、`templates/`、`README.md`
- 总大小不超过 10MB

---

## 4. MCP Server 包规范

### 4.1 MCP Server 包结构

```
tapd-mcp-server/
├── mcp-server.json     # MCP Server 元数据（必需）
├── mcp-config.json     # MCP 配置（Claude Desktop 兼容格式，必需）
├── README.md           # 配置说明（必需）
└── scripts/
    └── install.sh      # 安装脚本（可选）
```

### 4.2 mcp-server.json 格式

```json
{
  "schema_version": "1.0.0",
  "identity": {
    "name": "tapd",
    "version": "1.0.0",
    "display_name": "TAPD MCP Server",
    "description": "TAPD project management MCP server",
    "author": "OpenPeng",
    "package": "@openpeng/mcp-tapd"
  },
  "config": {
    "source": "file",
    "file": "mcp-config.json"
  },
  "tools": [
    "tapd_create_story",
    "tapd_list_stories",
    "tapd_update_story"
  ],
  "required_env": [
    "TAPD_API_KEY",
    "TAPD_WORKSPACE_ID"
  ]
}
```

---

## 5. 市场 API 扩展

### 5.1 Skill 市场端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/v1/skills/upload` | 上传 Skill 包（multipart/form-data） |
| `GET` | `/api/v1/skills` | 搜索 Skills |
| `GET` | `/api/v1/skills/{id}` | Skill 详情 |
| `GET` | `/api/v1/skills/{id}/download` | 下载 Skill 包 |
| `DELETE` | `/api/v1/skills/{id}` | 删除 Skill |

### 5.2 MCP Server 市场端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/v1/mcp-servers/upload` | 上传 MCP Server 包 |
| `GET` | `/api/v1/mcp-servers` | 搜索 MCP Servers |
| `GET` | `/api/v1/mcp-servers/{id}` | MCP Server 详情 |
| `GET` | `/api/v1/mcp-servers/{id}/download` | 下载 MCP Server 包 |
| `DELETE` | `/api/v1/mcp-servers/{id}` | 删除 MCP Server |

### 5.3 数据库扩展

```sql
-- Skill 包存储表（扩展现有 skills 表）
ALTER TABLE skills ADD COLUMN package_path TEXT;
ALTER TABLE skills ADD COLUMN package_size INTEGER DEFAULT 0;
ALTER TABLE skills ADD COLUMN package_format TEXT DEFAULT 'tar.gz';
ALTER TABLE skills ADD COLUMN content_format TEXT DEFAULT 'markdown';
ALTER TABLE skills ADD COLUMN content_source TEXT DEFAULT 'inline';
ALTER TABLE skills ADD COLUMN content TEXT DEFAULT '';  -- SKILL.md 内容缓存

-- MCP Server 包存储表（扩展现有 mcp_servers 表）
ALTER TABLE mcp_servers ADD COLUMN package_path TEXT;
ALTER TABLE mcp_servers ADD COLUMN package_size INTEGER DEFAULT 0;
ALTER TABLE mcp_servers ADD COLUMN package_format TEXT DEFAULT 'tar.gz';
ALTER TABLE mcp_servers ADD COLUMN config_content TEXT DEFAULT '';  -- mcp-config.json 内容缓存
```

---

## 6. 运行时引用解析

### 6.1 解析流程

```
Agent 启动
  │
  ▼
读取 agent.json
  │
  ▼
解析 skills 数组 ──┬── 内联定义 → 直接使用
                  └── 引用定义 → 解析引用
                                    │
                                    ▼
                              检查本地缓存
                              ~/.agent-hub/cache/skills/{ref}@{version}/
                                    │
                          ┌─────────┴─────────┐
                          ▼                   ▼
                      缓存命中            缓存未命中
                          │                   │
                          ▼                   ▼
                      直接使用          从市场下载
                      加载 SKILL.md     解压到缓存目录
                      加载 scripts      验证 skill.json
                          │                   │
                          └─────────┬─────────┘
                                    ▼
                              合并到 Agent 上下文
                              (SKILL.md → system prompt)
```

### 6.2 缓存策略

```
~/.agent-hub/cache/
├── skills/
│   ├── html-anything@1.0.0/
│   │   ├── skill.json
│   │   ├── SKILL.md
│   │   └── scripts/
│   ├── text-summarizer@2.1.0/
│   └── ...
├── mcp-servers/
│   ├── tapd@1.0.0/
│   │   ├── mcp-server.json
│   │   ├── mcp-config.json
│   │   └── README.md
│   └── ...
└── index.json          # 缓存索引: {ref: {version, path, downloaded_at, etag}}
```

**缓存规则**:
- 按 `ref@resolved_version` 目录存储
- 下载时记录 `etag`，启动时检查是否需要更新
- `version: "*"` 或 `^x.x.x` 时，每日检查一次最新版本
- 缓存清理: `agent-deploy cache clean --unused-for 30d`

### 6.3 版本解析算法

```python
def resolve_version(ref: str, constraint: str, market_url: str) -> str:
    """
    解析版本约束为具体版本号
    """
    # 1. 查询市场获取该 ref 的所有版本
    versions = market_client.list_versions(ref, market_url)
    # versions = ["1.0.0", "1.1.0", "1.2.0", "2.0.0"]

    # 2. 按语义化版本排序
    versions = sorted(versions, key=semver.parse, reverse=True)

    # 3. 匹配版本约束
    if constraint == "*":
        return versions[0]  # 最新版本

    if constraint.startswith("^"):
        base = semver.parse(constraint[1:])
        for v in versions:
            parsed = semver.parse(v)
            if parsed.major == base.major and parsed >= base:
                return v

    if constraint.startswith("~"):
        base = semver.parse(constraint[1:])
        for v in versions:
            parsed = semver.parse(v)
            if parsed.major == base.major and parsed.minor == base.minor and parsed >= base:
                return v

    if constraint.startswith(">="):
        base = semver.parse(constraint[2:])
        for v in versions:
            if semver.parse(v) >= base:
                return v

    # 精确版本
    if constraint in versions:
        return constraint

    raise VersionNotFoundError(f"No version matches {constraint} for {ref}")
```

---

## 7. Agent.json 引用示例

### 7.1 纯引用模式

```json
{
  "schema_version": "3.0",
  "identity": {
    "name": "content-processor",
    "version": "1.0.0",
    "description": "Content processing with referenced skills"
  },
  "entry": {"main_subagent": "orchestrator"},
  "subagents": [
    {"name": "orchestrator", "path": "orchestrator.yaml"}
  ],
  "skills": [
    {
      "ref": "html-anything",
      "version": "^1.0.0",
      "market_url": "https://market.aitboy.cn",
      "source": "market"
    },
    {
      "ref": "text-summarizer",
      "version": "~2.1.0",
      "market_url": "https://market.aitboy.cn",
      "source": "market"
    }
  ],
  "mcp_servers": [
    {
      "ref": "tapd",
      "version": "^1.0.0",
      "market_url": "https://market.aitboy.cn",
      "source": "market",
      "env_override": {
        "TAPD_WORKSPACE_ID": "12345"
      }
    }
  ]
}
```

### 7.2 混合模式（推荐）

```json
{
  "schema_version": "3.0",
  "identity": {
    "name": "my-agent",
    "version": "1.0.0",
    "description": "Mixed inline and referenced skills"
  },
  "skills": [
    {
      "ref": "html-anything",
      "version": "^1.0.0",
      "market_url": "https://market.aitboy.cn",
      "source": "market"
    },
    {
      "name": "custom-skill",
      "display_name": "Custom Skill",
      "description": "Agent-specific custom skill",
      "version": "1.0.0",
      "source": "inline"
    }
  ],
  "subagents": [
    {"name": "orchestrator", "path": "orchestrator.yaml"},
    {"name": "custom-skill", "path": "skills/custom-skill/worker.yaml", "type": "skill"}
  ]
}
```

---

## 8. CLI 命令扩展

### 8.1 Skill 命令

```bash
# 打包 Skill
agent-deploy skill pack <path> [-o, --output <file>]

# 验证 Skill 包
agent-deploy skill verify <file>

# 上传 Skill 到市场
agent-deploy skill upload <path> [-m, --market <url>] [-k, --api-key <key>] [-f, --force]

# 从市场下载 Skill
agent-deploy skill download <ref> [-v, --version <ver>] [-o, --output <dir>]

# 列出已缓存的 Skills
agent-deploy skill list --cached

# 搜索市场 Skills
agent-deploy skill search <query> [-m, --market <url>]

# 清理 Skill 缓存
agent-deploy skill cache clean [--unused-for <days>] [--ref <ref>]
```

### 8.2 MCP Server 命令

```bash
# 打包 MCP Server
agent-deploy mcp pack <path> [-o, --output <file>]

# 上传 MCP Server 到市场
agent-deploy mcp upload <path> [-m, --market <url>] [-k, --api-key <key>]

# 从市场下载 MCP Server
agent-deploy mcp download <ref> [-v, --version <ver>] [-o, --output <dir>]

# 列出已缓存的 MCP Servers
agent-deploy mcp list --cached
```

### 8.3 缓存管理命令

```bash
# 查看缓存状态
agent-deploy cache status

# 清理所有缓存
agent-deploy cache clean [--all] [--unused-for <days>]

# 更新引用（检查并下载新版本）
agent-deploy cache update [--agent <path>] [--dry-run]
```

---

## 9. Skill 统一使用 skill.json（Breaking Change）

### 9.1 问题陈述

当前 v3 规范中，**Skill 使用 `agent.json` 定义**，存在以下问题：

| 问题 | 说明 |
|------|------|
| **语义混淆** | `agent.json` 字面意思是"Agent 配置"，但 Skill 不是 Agent |
| **字段冗余** | Skill 不需要 `entry`、`subagents` 等 Agent 专属字段 |
| **类型标记是补丁** | 用 `"type": "skill"` 区分，说明底层格式本不该相同 |
| **内外不一致** | 独立 Skill 包用 `skill.json`，内联 Skill 却用 `agent.json` |

**解决方案**：Skill 统一使用 `skill.json`，彻底与 Agent 格式解耦。

### 9.2 改动范围

#### A. 规范文档层（4 个文件）

| 文件 | 改动内容 |
|------|---------|
| `agent-protocol/specs/skill-system.md` | Skill 定义从 `agent.json` 改为 `skill.json`；删除 `type: "skill"`、`entry`、`subagents`；新增 `content`、`capabilities`、`scripts` |
| `agent-protocol/specs/agent-json-v3.md` | `subagents` 中 `type: "skill"` 改为引用 `skills/` 目录下的 `skill.json` |
| `agent-protocol/specs/market-skill-mcp-support.md` | 提取逻辑从解析 `agent.json` + `type: "skill"` 改为解析 `skill.json` |
| `SPEC_skill_mcp_reference.md`（本文档） | 更新 skill.json 为 Skill 唯一格式 |

#### B. Agent 目录结构变更

```
# 变更前（v3.0）
content-processor/
├── agent.json
├── orchestrator.yaml
├── skills/
│   ├── text-summarizer/
│   │   ├── agent.json      ← type: "skill"（❌ 语义错误）
│   │   └── worker.yaml
│   └── translator/
│       ├── agent.json
│       └── worker.yaml

# 变更后（v3.1）
content-processor/
├── agent.json
├── orchestrator.yaml
├── skills/
│   ├── text-summarizer/
│   │   ├── skill.json      ← Skill 专用格式（✅ 语义正确）
│   │   └── worker.yaml
│   └── translator/
│       ├── skill.json
│       └── worker.yaml
```

#### C. skill.json 格式（Skill 专用）

```json
{
  "schema_version": "1.0.0",
  "identity": {
    "name": "text-summarizer",
    "version": "1.0.0",
    "display_name": "Text Summarizer",
    "description": "Summarizes text into concise bullet points",
    "author": "Your Name",
    "license": "MIT",
    "tags": ["nlp", "summary"]
  },
  "content": {
    "format": "markdown",
    "source": "file",
    "file": "SKILL.md"
  },
  "capabilities": ["text-summarization"],
  "parameters": {
    "text": { "type": "string", "required": true },
    "max_length": { "type": "number", "default": 200 }
  },
  "scripts": {
    "pre_install": "scripts/pre-install.sh"
  }
}
```

**与 agent.json 的关键区别**：

| 字段 | agent.json | skill.json | 说明 |
|------|-----------|-----------|------|
| `schema_version` | `"3.0"` | `"1.0.0"` | Skill 独立版本号 |
| `type` | `"agent"` / `"skill"` | 无 | 不再需要类型标记 |
| `entry` | 有 | 无 | Skill 无入口点概念 |
| `subagents` | 有 | 无 | Skill 不是 Agent 组合 |
| `content` | 无 | 有 | Skill 核心：指令内容 |
| `capabilities` | 无 | 有 | Skill 声明的能力列表 |
| `scripts` | 无 | 有 | 生命周期钩子 |
| `parameters` | 无 | 有 | 参数 Schema（原 worker.yaml 中） |

#### D. agent.json 中 Skill 引用方式变更

```json
{
  "schema_version": "3.1",
  "identity": { "name": "content-processor", "version": "1.0.0" },
  "entry": { "main_subagent": "orchestrator" },
  "subagents": [
    { "name": "orchestrator", "path": "orchestrator.yaml" }
  ],
  "skills": [
    {
      "name": "text-summarizer",
      "path": "skills/text-summarizer/skill.json",
      "source": "local"
    },
    {
      "ref": "html-anything",
      "version": "^1.0.0",
      "market_url": "https://market.aitboy.cn",
      "source": "market"
    }
  ]
}
```

**变更点**：
- 删除 `subagents` 中 `type: "skill"` 的项
- 新增顶层 `skills` 数组，专门声明 Skill 引用
- `skills[].path` 指向 `skill.json` 文件
- `skills[].source` 标识来源：`local`（本地）/`market`（市场引用）

#### E. Runtime 加载逻辑变更

```typescript
// 变更前：遍历 subagents，找 type: "skill"
for (const sa of agent.subagents) {
  if (sa.type === "skill") {
    const skill = await loadAgent(path.join(dir, "agent.json"));
  }
}

// 变更后：直接读取 skills 数组，加载 skill.json
for (const skillRef of agent.skills || []) {
  if (skillRef.source === "local") {
    const skill = await loadSkill(path.resolve(skillRef.path));
  } else if (skillRef.source === "market") {
    const skill = await resolveMarketSkill(skillRef.ref, skillRef.version);
  }
}

async function loadSkill(skillJsonPath: string): Promise<Skill> {
  const content = await fs.readFile(skillJsonPath, "utf-8");
  const skill = JSON.parse(content);
  // 验证 schema_version 为 "1.0.0"
  // 加载 SKILL.md 内容
  // 加载 parameters
  return skill;
}
```

#### F. 市场提取逻辑变更

```python
# 变更前：从 subagents 中提取 type: "skill"
def extract_skills_info(metadata: dict, extract_dir: Path = None) -> list[dict]:
    for sa in metadata.get("subagents", []):
        if sa.get("type") == "skill":
            # 提取为 skill

# 变更后：从 skills 数组提取，或扫描 skills/ 目录下的 skill.json
def extract_skills_info(metadata: dict, extract_dir: Path = None) -> list[dict]:
    # 1. 从 agent.json 顶层 skills 数组提取
    for skill in metadata.get("skills", []):
        if skill.get("source") == "local":
            # 读取 skill.json 文件
            skill_json = load_skill_json(skill["path"])
            # 提取元数据

    # 2. 扫描 skills/ 目录下的 skill.json
    if extract_dir:
        skills_dir = extract_dir / "skills"
        for skill_json_file in skills_dir.rglob("skill.json"):
            skill = load_skill_json(skill_json_file)
            # 提取元数据
```

### 9.3 向后兼容性策略

这是一个 **Breaking Change**，需要明确的迁移策略：

| 策略 | 说明 |
|------|------|
| **版本号跳跃** | agent.json 从 `3.0` 直接跳到 `3.1`，skill.json 从 `1.0.0` 开始 |
| **运行时兼容** | agent-compose v3.1 同时支持读取 `agent.json` + `type: "skill"`（deprecated）和 `skill.json`（推荐） |
| **迁移工具** | `agent-deploy migrate --from 3.0 --to 3.1 ./my-agent` 自动转换 |
| **文档标注** | v3.0 的 `type: "skill"` 方式标记为 deprecated，v3.1 文档只展示 `skill.json` 方式 |
| **市场处理** | 已上传的 v3.0 Agent 继续可用，新上传的 Agent 要求使用 v3.1 格式 |

### 9.4 迁移工具示例

```bash
# 自动将 v3.0 的 skills/agent.json 转换为 v3.1 的 skills/skill.json
agent-deploy migrate --from 3.0 --to 3.1 ./content-processor

# 输出:
# ✅ 迁移完成: content-processor/
#    - skills/text-summarizer/agent.json → skill.json
#    - skills/translator/agent.json → skill.json
#    - agent.json: subagents type:"skill" → skills 数组
```

---

## 10. 实现计划

### Phase 1: Skill 统一 skill.json（优先级：最高 — Breaking Change）

| 任务 | 工作量 | 说明 |
|------|--------|------|
| 定义 skill.json v1.0.0 规范 | 0.5 天 | 本文档 §9 |
| 更新 skill-system.md | 0.5 天 | 所有 Skill 定义改为 skill.json |
| 更新 agent-json-v3.md | 0.5 天 | skills 数组替代 subagents type:"skill" |
| 更新 market-skill-mcp-support.md | 0.5 天 | 提取逻辑改为解析 skill.json |
| 更新 SPEC（本文档） | 0.5 天 | 统一引用 skill.json |
| Runtime SkillLoader 重构 | 1 天 | agent-compose 支持 skill.json |
| 运行时兼容层 | 0.5 天 | 同时支持 agent.json + type:"skill"（deprecated） |
| 迁移工具 | 1 天 | `agent-deploy migrate --from 3.0 --to 3.1` |
| 测试 | 1 天 | skill.json 加载、迁移工具、兼容性 |

### Phase 2: Skill 独立打包（优先级：高）

| 任务 | 工作量 | 说明 |
|------|--------|------|
| 实现 `pack_skill()` | 1 天 | agent-market package.py |
| 扩展 skills 表 | 0.5 天 | 增加 package_path, content 等字段 |
| 新增 `/skills/{id}/download` | 0.5 天 | server.py |
| CLI `skill pack/upload/download` | 1 天 | agent-deploy |
| 运行时 Skill 加载器 | 1 天 | agent-compose |
| 缓存管理 | 0.5 天 | ~/.agent-hub/cache/ |
| 测试 | 1 天 | 打包、上传、下载、缓存 |

### Phase 3: MCP Server 独立打包（优先级：高）

| 任务 | 工作量 | 说明 |
|------|--------|------|
| 定义 mcp-server.json 规范 | 0.5 天 | 本文档 §4 |
| 实现 `pack_mcp_server()` | 1 天 | agent-market |
| 扩展 mcp_servers 表 | 0.5 天 | 增加 package_path, config_content 等字段 |
| 新增 `/mcp-servers/{id}/download` | 0.5 天 | server.py |
| CLI `mcp pack/upload/download` | 1 天 | agent-deploy |
| 运行时 MCP 引用解析 | 1 天 | agent-compose |
| 测试 | 1 天 | |

### Phase 4: Agent 引用机制（优先级：高）

| 任务 | 工作量 | 说明 |
|------|--------|------|
| 扩展 agent.json v3.1 规范 | 0.5 天 | SkillRef, MCPRef |
| 运行时引用解析器 | 1 天 | resolve_version, download, cache |
| 版本约束解析器 | 0.5 天 | semver 匹配 |
| Agent 启动时依赖加载 | 1 天 | 先解析引用，再启动 Agent |
| 测试 | 1 天 | 引用解析、版本匹配、缓存更新 |

### Phase 5: 混合模式与迁移（优先级：中）

| 任务 | 工作量 | 说明 |
|------|--------|------|
| 混合模式支持 | 0.5 天 | 内联 + 引用共存 |
| 现有 Agent 迁移工具 | 1 天 | 内联 skill → 引用转换 |
| 文档更新 | 0.5 天 | 所有规范文档 |
| 端到端测试 | 1 天 | |

---

## 10. 向后兼容性

| 场景 | 兼容性 |
|------|--------|
| 现有内联 skills 数组 | 完全兼容，无 `ref` 字段时按内联处理 |
| 现有 `skills/` 目录打包 | 完全兼容，`type: "skill"` 的 subagent 正常加载 |
| 现有 MCP 内联配置 | 完全兼容，无 `ref` 字段时按内联处理 |
| 现有 `/api/v1/skills` POST | 兼容，继续支持 JSON Body 独立注册 |
| 现有 Agent 包下载 | 兼容，下载内容不变 |
| 新引用模式 Agent | 需要运行时支持引用解析（agent-compose 升级后） |

---

## 11. 开放问题

1. **Skill 内容更新策略**: 当市场 Skill 更新后，本地缓存的 Skill 何时自动更新？
   - 建议: `version: "*"` 或 `^x.x.x` 时每次启动检查；精确版本时不自动更新。

2. **离线模式**: 无网络时如何处理市场引用？
   - 建议: 缓存命中时直接使用；缓存未命中时报错并提示 `agent-deploy skill download`。

3. **Skill 间依赖**: Skill 是否可以引用其他 Skill？
   - 建议: Phase 1 不支持，避免循环依赖复杂度。后续在 skill.json 中增加 `dependencies` 字段。

4. **权限与安全**: 下载的 Skill 脚本（`scripts/`）如何安全执行？
   - 建议: 执行前校验签名或沙箱隔离；`scripts/` 中的脚本默认不自动执行，需显式配置。

5. **命名空间**: `ref` 是否支持命名空间（如 `@openpeng/html-anything`）？
   - 建议: 支持，格式为 `{namespace}/{name}`，无 namespace 时默认使用市场默认命名空间。

---

## 12. 参考

- [agent.json v3 规范](./agent-protocol/specs/agent-json-v3.md)
- [Skill System 规范](./agent-protocol/specs/skill-system.md)
- [MCP Integration 规范](./agent-protocol/specs/mcp-integration.md)
- [Market Skills & MCP Support 规范](./agent-protocol/specs/market-skill-mcp-support.md)
- [Team & Workflow 扩展规范](./SPEC.md)

---

**Skill & MCP 独立打包与引用机制 — 从"打包一切"到"按需引用"** 🔗
