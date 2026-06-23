# Agent 开发指南

从零开始创建、测试、发布一个 Agent。

---

## Agent 结构

```
my-agent/
├── agent.json         # 元数据（必填）
├── worker.yaml        # Pipeline 定义（必填）
├── skills/            # Skills（可选，*.yaml WorkerYaml 定义）
├── mcp/               # MCP 配置（可选，config.json / servers.json）
└── README.md          # 文档（推荐）
```

## 1. 初始化

```bash
agent-deploy templates              # 查看可用模板
agent-deploy init agent-builder -n my-agent
cd my-agent
```

生成的文件：
- `agent.json` — 名称、版本、作者、标签
- `worker.yaml` — 空的 Pipeline 模板
- `README.md` — 自动生成的文档

## 2. 编写 agent.json

```json
{
  "schema_version": "3.0",
  "identity": {
    "name": "my-agent",
    "version": "1.0.0",
    "display_name": "我的Agent",
    "description": "简洁描述 Agent 的功能（50-200字符）",
    "author": "Your Name",
    "tags": ["code", "review", "quality"]
  },
  "entry": { "main_subagent": "worker" },
  "subagents": [
    { "name": "worker", "path": "worker.yaml", "description": "主流程" }
  ],
  "category": "development",
  "type": "agent"
}
```

## 3. 编写 worker.yaml

### 单步 Agent（最简单）

```yaml
pipeline:
  - step: do_work
    tool: read_file           # 使用内置工具
    args:
      path: "{{input_file}}"  # 从参数读取
```

### 多步 Agent（Pipeline）

```yaml
pipeline:
  - step: step1
    tool: read_file
    args:
      path: "{{input_file}}"
    output: content

  - step: step2
    tool: write_file
    args:
      path: "output.txt"
      content: "{{steps.step1.output}}"
```

### LLM 调用

```yaml
pipeline:
  - step: analyze
    tool: llm_chat
    args:
      system_prompt: "你是代码分析专家"
      prompt: "分析以下代码:\n\n{{code}}"
      temperature: 0.3
    output: analysis_result
    on_fail:
      retry:
        max_attempts: 3
        backoff: "exponential"
        initial_delay_ms: 2000
```

### 调用其他 Agent (invoke)

```yaml
pipeline:
  # 单个调用
  - step: do_summary
    invoke: text-summarizer
    with:
      input_file: "{{file}}"
    on_fail: skip

  # 并行调用
  - step: parallel_tasks
    invoke_parallel:
      - agent: agent-a
        with: { param: "val1" }
      - agent: agent-b
        with: { param: "val2" }
    on_fail: continue
```

### 条件执行

```yaml
pipeline:
  - step: try_llm
    tool: llm_chat
    args:
      prompt: "分析: {{input}}"
    output: result

  - step: fallback
    when: "{{steps.try_llm.success}} == false"
    tool: write_file
    args:
      path: "error.log"
      content: "LLM failed: {{steps.try_llm.error}}"
    on_fail: skip
```

## 4. 内置工具列表

| 工具 | 说明 | 关键参数 |
|------|------|---------|
| `read_file` | 读取文件 | `path` |
| `write_file` | 写入文件 | `path`, `content`, `mode` |
| `bash` | 执行命令（需--trusted） | `command`, `cwd`, `timeout` |
| `glob` | 文件匹配 | `pattern` |
| `llm_chat` | LLM 调用 | `prompt`, `system_prompt`, `model` |
| `web_fetch` | HTTP 请求（需--trusted） | `url`, `method` |
| `web_search` | 网络搜索 | `query` |
| `invoke_agent` | 调用子Agent | `agent`, `input` |
| `list_agents` | 列出可用Agent | 无 |

## 5. 子Agent 声明

agent.json 中声明依赖的子Agent：

```json
{
  "subagents": [
    { "name": "text-summarizer", "path": "../text-summarizer",
      "description": "LLM 文本总结" },
    { "name": "notification-agent", "path": "../../downloaded-agents/notification-agent",
      "description": "Bark 消息推送" }
  ]
}
```

声明后 worker.yaml 中直接用名称调用：
```yaml
- step: notify
  invoke: notification-agent
  with:
    title: "完成"
    body: "任务执行完毕"
```

## 5a. Skills 定义

### 方式一：agent.json 顶层 skills 数组（agent-builder 格式）

```json
{
  "skills": [
    {
      "name": "text-summarizer",
      "display_name": "文本摘要",
      "version": "1.0.0",
      "description": "Summarizes text into concise bullet points",
      "icon": "📝",
      "category": "nlp",
      "parameters": { "max_length": 200, "format": "bullets" }
    }
  ]
}
```

### 方式二：skills/*.yaml 文件（Runtime Loader 格式）

```
my-agent/
└── skills/
    └── text-summarizer.yaml   # 完整的 WorkerYaml Pipeline 定义
```

## 5b. MCP Server 定义

### 方式一：agent.json 顶层 mcp_servers 数组（agent-builder 格式）

```json
{
  "mcp_servers": [
    {
      "name": "tapd",
      "description": "TAPD project management",
      "command": "npx",
      "args": ["-y", "@openpeng/mcp-tapd@^1.0.0"],
      "env": {
        "TAPD_API_KEY": "${TAPD_API_KEY}",
        "TAPD_WORKSPACE_ID": "${TAPD_WORKSPACE_ID}"
      }
    }
  ]
}
```

### 方式二：mcp/config.json 文件（Claude Desktop 兼容格式）

```json
{
  "mcpServers": {
    "aliyun-log": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@openpeng/alilog-mcp"],
      "env": {
        "CRED_SOURCE": "consul"
      }
    }
  }
}
```

> **注意**：Skills 和 MCP Server 定义在上传到 Market 时会自动提取并归一化存储，支持全市场搜索和发现。

## 6. 测试运行

```bash
# 基础运行
agent-deploy run ./my-agent --args "key=value"

# 调试模式（查看每步详情）
agent-deploy run ./my-agent --verbose --trusted

# Dry-run（只解析不执行）
agent-deploy run ./my-agent --dry-run
```

## 7. 发布

```bash
agent-deploy upload ./my-agent -m http://localhost:8321 -k your-api-key
```

## 8. 调试技巧

- `--verbose` 输出每步执行时间和详情
- `--dry-run` 验证 worker.yaml 语法
- JSON 日志追踪：每步输出 `{"trace_id":"xxx","step":"name","success":true,"duration_ms":123}`
- `list_agents` 工具查看运行时可用Agent
