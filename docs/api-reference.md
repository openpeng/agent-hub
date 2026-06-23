# API 参考文档

## AgentRuntimeServer HTTP API

AgentRuntimeServer 提供 RESTful API 用于会话管理和 Agent 执行。

### 基础信息

- **Base URL**: `http://localhost:8080`（默认）
- **Content-Type**: `application/json`

### 端点列表

#### 1. 创建会话

```http
POST /sessions
```

创建一个新的 Agent 执行会话。

**请求体**:

```json
{
  "agent_id": "my-agent",
  "agent_json": { ... },
  "api_key": "sk-xxx",
  "model_provider": "openai",
  "model_id": "gpt-4",
  "base_url": "https://api.openai.com/v1",
  "webbridge_token": "wb-token",
  "metadata": { "project": "demo" }
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agent_id | string | 是 | Agent 标识符 |
| agent_json | object | 否 | Agent 配置 JSON |
| api_key | string | 否 | 模型 API 密钥 |
| model_provider | string | 否 | 模型提供商 |
| model_id | string | 否 | 模型 ID |
| base_url | string | 否 | 模型 API 基础 URL |
| webbridge_token | string | 否 | WebBridge 认证令牌 |
| metadata | object | 否 | 自定义元数据 |

**响应**:

```json
{
  "session_id": "sess-abc123",
  "agent_id": "my-agent",
  "status": "created",
  "mcp_connections": [],
  "created_at": 1705312200
}
```

**状态码**:

| 状态码 | 含义 |
|--------|------|
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 404 | Agent 不存在 |

---

#### 2. 获取会话列表

```http
GET /sessions
```

获取所有活跃会话列表。

**响应**:

```json
{
  "sessions": [
    {
      "session_id": "sess-abc123",
      "agent_id": "my-agent",
      "status": "active",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

---

#### 3. 获取会话详情

```http
GET /sessions/{session_id}
```

获取指定会话的详细状态。

**路径参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| session_id | string | 会话 ID |

**响应**:

```json
{
  "session_id": "sess-abc123",
  "agent_id": "my-agent",
  "status": "active",
  "messages": [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi! How can I help?"}
  ],
  "mcp_connections": [],
  "metadata": {},
  "created_at": 1705312200,
  "updated_at": 1705312205
}
```

---

#### 4. 发送消息

```http
POST /sessions/{session_id}/message
```

向会话发送消息并获取回复。

**路径参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| session_id | string | 会话 ID |

**请求体**:

```json
{
  "message": "Analyze this code",
  "max_turns": 10
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | string | 是 | 发送的消息内容 |
| max_turns | int | 否 | 最大执行轮次 |

**响应**:

```json
{
  "session_id": "sess-abc123",
  "history": [
    {"role": "user", "content": "Analyze this code"},
    {"role": "assistant", "content": "The code looks good..."}
  ],
  "message_count": 2
}
```

---

#### 5. 删除会话

```http
DELETE /sessions/{session_id}
```

删除指定会话。

**路径参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| session_id | string | 会话 ID |

**响应**:

```json
{
  "session_id": "sess-abc123",
  "status": "destroyed"
}
```

---

#### 6. 恢复会话

```http
POST /sessions/{session_id}/restore
```

从持久化存储恢复会话状态。

**路径参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| session_id | string | 会话 ID |

**响应**:

```json
{
  "session_id": "sess-abc123",
  "status": "restored"
}
```

---

#### 9. Prometheus 指标

```http
GET /metrics
```

导出 Prometheus 格式的服务指标。

**响应** (text/plain):

```
# HELP agenthub_sessions_total Total sessions created
# TYPE agenthub_sessions_total counter
agenthub_sessions_total 42

# HELP agenthub_active_sessions Current active sessions
# TYPE agenthub_active_sessions gauge
agenthub_active_sessions 5

# HELP agenthub_requests_total Total HTTP requests
# TYPE agenthub_requests_total counter
agenthub_requests_total 120

# HELP agenthub_request_duration_seconds Request duration in seconds
# TYPE agenthub_request_duration_seconds histogram
agenthub_request_duration_seconds_bucket{le="0.1"} 80
agenthub_request_duration_seconds_bucket{le="0.5"} 115
agenthub_request_duration_seconds_bucket{le="1.0"} 119
agenthub_request_duration_seconds_bucket{le="+Inf"} 120
agenthub_request_duration_seconds_sum 15.3
agenthub_request_duration_seconds_count 120
```

**状态码**:

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |

---

#### 7. 健康检查

```http
GET /health
```

检查服务健康状态。

**响应**:

```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime_seconds": 3600,
  "active_sessions": 5,
  "total_requests": 120,
  "agentos_registered": 3,
  "session_backend": "MemorySessionStore"
}
```

---

#### 8. 就绪检查

```http
GET /ready
```

检查服务是否就绪（已加载所有配置和依赖）。

**响应**:

```json
{
  "status": "ready",
  "session_store": "ok"
}
```

---

### 错误响应格式

所有错误响应遵循统一格式：

```json
{
  "error": "Session sess-abc123 not found"
}
```

**错误码列表**:

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| INVALID_REQUEST | 400 | 请求参数错误 |
| SESSION_NOT_FOUND | 404 | 会话不存在 |
| AGENT_NOT_FOUND | 404 | Agent 不存在 |
| EXECUTION_TIMEOUT | 408 | 执行超时 |
| INTERNAL_ERROR | 500 | 内部错误 |

---

## PipelineEngine Python API

### PipelineEngine

```python
from agent_compose import PipelineEngine, ExecutionContext, ToolRegistry

engine = PipelineEngine()
registry = ToolRegistry()
# 注册工具...

context = ExecutionContext(
    agent_id="my-agent",
    initial_args={"input": "hello"}
)

result = await engine.execute(
    pipeline_config={
        "pipeline": [
            {"step": "s1", "tool": "echo", "args": {"message": "hello"}}
        ]
    },
    context=context,
    registry=registry,
    timeout_ms=30000
)
```

### ExecutionContext

```python
from agent_compose import ExecutionContext

context = ExecutionContext(
    agent_id="my-agent",
    initial_args={"key": "value"},
    shared_context={},
    env={"MY_VAR": "value"},
    cwd="/path/to/workdir"
)

# 设置步骤结果
context.set_step_result("step1", StepResult("step1", True, "output"))

# 获取共享数据
context.set_shared("key", "value")
value = context.get_shared("key")
```

### ToolRegistry

```python
from agent_compose import ToolRegistry

registry = ToolRegistry()

# 注册工具
async def my_tool(args, context):
    return f"Hello {args.get('name')}"

registry.register("my_tool", my_tool)

# 获取工具
handler = registry.get("my_tool")

# 创建子注册表（继承父注册表）
child = ToolRegistry(parent=registry)

# 列出所有工具
tools = registry.list_tools()
```

### TemplateResolver

```python
from agent_compose import TemplateResolver, ExecutionContext

context = ExecutionContext()
context.set_shared("name", "world")
context.set_step_result("step1", StepResult("step1", True, "result"))

resolver = TemplateResolver(context)

# 解析变量
result = resolver.resolve("Hello {{name}}")  # "Hello world"
result = resolver.resolve("{{steps.step1.output}}")  # "result"

# 解析字典
result = resolver.resolve({"message": "Hello {{name}}"})
# {"message": "Hello world"}
```

---

## Observability API

### StructuredLogger

```python
from agent_compose import get_logger, LogLevel

logger = get_logger("my-module")
logger.info("Operation completed", extra={"duration_ms": 150})
logger.error("Operation failed", exc_info=exception)
```

### Tracer

```python
from agent_compose import Tracer

tracer = Tracer("my-service")

# 手动追踪
span = tracer.start_span("operation", attributes={"key": "value"})
span.add_event("checkpoint")
tracer.end_span(span)

# 上下文管理器
with tracer.trace_span("operation") as span:
    span.add_event("midpoint")
    # do work...
```

### MetricsCollector

```python
from agent_compose import MetricsCollector

metrics = MetricsCollector(prefix="my_app")

metrics.counter("requests", 1, {"method": "GET"})
metrics.gauge("active_sessions", 5)
metrics.histogram("latency", 150.5)

# 导出 Prometheus 格式
prometheus_text = metrics.export_prometheus()
```

---

## MarketClient API

```python
from agent_compose import MarketClient

client = MarketClient(
    base_url="http://localhost:8321",
    api_key="your-api-key"
)

# 搜索 Agent
result = await client.search_agents(query="code-review", limit=10)

# 下载 Agent
result = await client.download_agent(
    agent_id="code-reviewer",
    output_dir="./agents",
    version="1.2.0"
)

# 上传 Agent
result = await client.upload_agent("./my-agent", force=True)

# 版本对比
diff = await client.compare_versions(
    agent_id="code-reviewer",
    version_a="1.0.0",
    version_b="1.1.0"
)

# 发布流水线
result = await client.publish_pipeline(
    agent_dir="./my-agent",
    bump_type="patch",
    changelog="Fixed bug in step 3"
)
```

---

## AdapterRegistry API

```python
from agent_compose import create_default_registry

registry = create_default_registry()

# 自动检测并导入
agent_json = registry.import_agent(".cursor/commands/my-agent.md")

# 扫描目录
paths = registry.scan_directory("./agents")

# 列出适配器
adapters = registry.list_adapters()
```
