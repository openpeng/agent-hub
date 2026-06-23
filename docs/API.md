# Market REST API 参考

**Base URL**: `http://tx.aitboy.cn:15795/api/v1`

---

## 认证

所有写操作需要 API Key 认证。在请求头中携带：

```
Authorization: Bearer pd_mkt_xxxxxxxxxxxxxxxx
```

### 角色权限

| 角色 | 上传 | 评分 | 删除 | 管理 Key |
|------|------|------|------|----------|
| `publisher` | ✅ | ✅ | ❌ | ❌ |
| `admin` | ✅ | ✅ | ✅ | ✅ |

---

## Agent API

### 注册/上传 Agent

```
POST /api/v1/agents
Content-Type: multipart/form-data
Authorization: Bearer <api-key>
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | file | ✅ | .tar.gz 或 .zip 包 |
| `force` | bool | ❌ | 覆盖同版本 (默认 false) |

**响应 201**:
```json
{
  "id": "agent-abc123",
  "name": "code-reviewer",
  "version": "1.0.0",
  "display_name": "Code Reviewer",
  "author": "Peng Xiao",
  "category": "development",
  "tags": ["code", "review"],
  "download_count": 0,
  "rating": 0,
  "review_count": 0
}
```

**错误**: 400 (校验失败), 401 (未认证), 409 (版本冲突)

### 查询 Agent 列表

```
GET /api/v1/agents
```

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `q` | string | - | 搜索关键词 |
| `category` | string | - | 按分类筛选 |
| `type` | string | - | 按类型筛选 (agent/subagent/skill/workflow) |
| `tags` | string | - | 按标签筛选 (逗号分隔) |
| `skill` | string | - | 按 Skill 名称筛选 |
| `mcp` | string | - | 按 MCP Server 名称筛选 |
| `sort` | string | downloads | 排序 (downloads/rating/created/name) |
| `order` | string | desc | 排序方向 (asc/desc) |
| `page` | int | 1 | 页码 |
| `page_size` | int | 20 | 每页数量 (最大 100) |

**响应 200**:
```json
{
  "total": 42,
  "page": 1,
  "page_size": 20,
  "items": [
    {
      "id": "agent-abc123",
      "display_name": "Code Reviewer",
      "version": "1.0.0",
      "description": "Comprehensive code review agent",
      "category": "development",
      "tags": ["code", "review"],
      "download_count": 156,
      "rating": 4.5,
      "package_size": 0,
      "skill_count": 3,
      "mcp_server_count": 1,
      "created_at": "2026-06-07T10:00:00Z"
    }
  ]
}
```

### 获取 Agent 详情

```
GET /api/v1/agents/{id}
```

**响应 200**:
```json
{
  "id": "code-reviewer",
  "name": "code-reviewer",
  "version": "1.0.0",
  "display_name": "Code Reviewer",
  "description": "Comprehensive code review agent",
  "author": "Peng Xiao",
  "category": "development",
  "type": "agent",
  "tags": ["code", "review"],
  "license": "MIT",
  "homepage_url": "https://github.com/...",
  "source_url": "https://github.com/...",
  "dependencies": {},
  "download_count": 156,
  "rating": 4.5,
  "review_count": 23,
  "skills_info": [
    {
      "id": "code-reviewer/syntax-check",
      "original_name": "syntax-check",
      "display_name": "语法检查",
      "description": "Checks code syntax",
      "version": "1.0.0",
      "category": "development",
      "icon": "🔍"
    }
  ],
  "mcp_info": [
    {
      "id": "code-reviewer/sonarqube",
      "original_name": "sonarqube",
      "description": "SonarQube code quality analysis",
      "command": "npx",
      "args": ["-y", "@scope/mcp-sonarqube"],
      "required_env": ["SONAR_TOKEN", "SONAR_HOST_URL"]
    }
  ],
  "created_at": "2026-06-07T10:00:00Z",
  "updated_at": "2026-06-07T10:00:00Z"
}
```

### 下载 Agent

```
GET /api/v1/agents/{id}/download
```

**响应 200**: `application/gzip` 流，携带 `Digest: sha-256=...` 响应头

### 删除 Agent

```
DELETE /api/v1/agents/{id}
Authorization: Bearer <admin-api-key>
```

**响应 200**: `{"ok": true}`  
**错误**: 401 (非管理员)

### 弃用 Agent

```
POST /api/v1/agents/{id}/deprecate
Authorization: Bearer <api-key>
Content-Type: application/json
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `message` | string | ✅ | 弃用原因 |
| `replaced_by` | string | ❌ | 替代 Agent ID |

---

## 评分 API

### 评分

```
POST /api/v1/agents/{agent_id}/ratings
Authorization: Bearer <api-key>
Content-Type: application/json
```

```json
{
  "score": 5,
  "comment": "Excellent code review quality"
}
```

**限制**: 同用户对一个 Agent 只能评分一次

### 查看评分

```
GET /api/v1/agents/{agent_id}/ratings
```

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `page` | int | 1 | 页码 |
| `page_size` | int | 20 | 每页数量 |

**响应 200**:
```json
{
  "total": 23,
  "average": 4.5,
  "page": 1,
  "page_size": 20,
  "items": [
    {
      "id": 1,
      "agent_id": "agent-abc123",
      "score": 5,
      "comment": "Excellent code review quality",
      "created_at": "2026-06-07T12:00:00"
    }
  ]
}
```

---

## Skills API

### 全市场 Skills 列表

```
GET /api/v1/skills
```

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `q` | string | - | 搜索 Skill 名称/描述 |
| `category` | string | - | 按分类筛选 |
| `page` | int | 1 | 页码 |
| `page_size` | int | 20 | 每页数量 (最大 100) |

**响应 200**:
```json
{
  "total": 8,
  "page": 1,
  "page_size": 20,
  "skills": [
    {
      "id": "wecom-assistant/wecom-message",
      "original_name": "wecom-message",
      "display_name": "企微消息助手",
      "description": "企业微信消息管理助手",
      "category": "企业协作",
      "agent_count": 1
    }
  ]
}
```

### Skill 详情

```
GET /api/v1/skills/{id}
```

**响应 200**:
```json
{
  "id": "code-reviewer/syntax-check",
  "original_name": "syntax-check",
  "display_name": "语法检查",
  "description": "Checks code syntax",
  "version": "1.0.0",
  "category": "development",
  "agents": [
    { "id": "code-reviewer", "name": "Code Reviewer", "version": "1.0.0" }
  ]
}
```

### 独立注册 Skill

```
POST /api/v1/skills
Authorization: Bearer <api-key>
Content-Type: application/json
```

```json
{
  "id": "standalone/text-summarizer",
  "original_name": "text-summarizer",
  "display_name": "文本摘要",
  "description": "Summarizes text into concise bullet points",
  "version": "1.0.0",
  "category": "nlp"
}
```

**响应 201**: `{"ok": true, "id": "standalone/text-summarizer"}`

### 删除 Skill

```
DELETE /api/v1/skills/{id}
Authorization: Bearer <admin-api-key>
```

**响应 204**: 无内容

---
## MCP Servers API

### 全市场 MCP Servers 列表

```
GET /api/v1/mcp-servers
```

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `q` | string | - | 搜索 Server 名称/描述 |
| `page` | int | 1 | 页码 |
| `page_size` | int | 20 | 每页数量 (最大 100) |

**响应 200**:
```json
{
  "total": 5,
  "page": 1,
  "page_size": 20,
  "servers": [
    {
      "id": "tapd-task-manager/tapd",
      "original_name": "tapd",
      "description": "TAPD project management",
      "command": "npx",
      "agent_count": 2
    }
  ]
}
```

### MCP Server 详情

```
GET /api/v1/mcp-servers/{id}
```

**响应 200**:
```json
{
  "id": "wecom-assistant/wecom-api",
  "original_name": "wecom-api",
  "description": "企业微信开放平台 API",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-wecom"],
  "required_env": ["WECOM_CORPID", "WECOM_CORPSECRET"],
  "agents": [
    { "id": "wecom-assistant", "name": "企微智能助手", "version": "1.0.0" }
  ]
}
```

### 独立注册 MCP Server

```
POST /api/v1/mcp-servers
Authorization: Bearer <api-key>
Content-Type: application/json
```

```json
{
  "id": "standalone/my-mcp",
  "original_name": "my-mcp",
  "description": "Custom MCP server",
  "command": "node",
  "args": ["dist/server.js"],
  "required_env": ["API_TOKEN"]
}
```

**响应 201**: `{"ok": true, "id": "standalone/my-mcp"}`

### 删除 MCP Server

```
DELETE /api/v1/mcp-servers/{id}
Authorization: Bearer <admin-api-key>
```

**响应 204**: 无内容

---
## Agent 发现协议

```
GET /api/v1/discover
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `capability` | string | 按能力筛选 |
| `category` | string | 按分类筛选 |
| `format` | string | 按格式筛选 |
| `skill` | string | 按 Skill 名称筛选 Agent |
| `mcp_server` | string | 按 MCP Server 名称筛选 Agent |
| `has_skill` | string | 过滤有 Skill 的 Agent (值: true) |
| `has_mcp` | string | 过滤有 MCP 依赖的 Agent (值: true) |

**响应 200**:
```json
{
  "total": 42,
  "agents": [
    {
      "id": "wecom-assistant",
      "name": "企微智能助手",
      "version": "1.0.0",
      "display_name": "企微智能助手",
      "description": "基于企业微信生态的智能办公助手",
      "category": "企业协作",
      "type": "agent",
      "tags": ["企业微信", "办公自动化"],
      "skills": [
        { "id": "wecom-assistant/wecom-message", "display_name": "企微消息助手" }
      ],
      "mcp_servers": [
        { "id": "wecom-assistant/wecom-api", "description": "企业微信开放平台 API" }
      ]
    }
  ]
}
```

---

## API Key 管理

### 创建 API Key

```
POST /api/v1/api-keys
Content-Type: application/json
```

```json
{
  "owner": "your-name",
  "role": "publisher"
}
```

**认证方式**:
- 携带 `MARKET_MASTER_KEY` 环境变量
- 或使用已有 admin API Key

### 列出 API Keys

```
GET /api/v1/api-keys
Authorization: Bearer <admin-api-key>
```

### 删除 API Key

```
DELETE /api/v1/api-keys/{key}
Authorization: Bearer <admin-api-key>
```

---

## Agent Discovery

### 发现可用 Agent

```
GET /api/v1/discover
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `capability` | string | 按能力筛选 |
| `format` | string | 按输出格式筛选 |

**响应 200**: 符合能力的 Agent 列表 + 参数 schema

---

## Health Check

```
GET /api/v1/health
```

**响应 200**:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "agent_count": 42
}
```

---

## 错误码

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 / 校验失败 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 版本冲突 |
| 429 | 请求频率超限 |
| 500 | 服务器内部错误 |
