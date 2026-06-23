# 端到端示例

本示例演示从 Agent 定义到执行到部署的完整流程。

## 场景：代码审查 Agent

创建一个能自动审查代码的 Agent，它可以：
1. 读取项目中的 Python 文件
2. 使用 LLM 分析代码质量
3. 生成审查报告

## 步骤 1: 创建 Agent 定义

### agent.json

```json
{
  "schema_version": "2.0",
  "identity": {
    "name": "code-reviewer",
    "version": "1.0.0",
    "display_name": "Code Reviewer",
    "description": "自动审查 Python 代码质量",
    "author": "Your Name",
    "tags": ["code-review", "python", "quality"]
  },
  "instructions": {
    "format": "markdown",
    "source": "inline",
    "content": "# Code Reviewer\n\n你是一个专业的代码审查助手。请分析代码的质量、安全性和可维护性。\n\n## 审查维度\n\n1. **代码风格**: 是否符合 PEP 8\n2. **安全性**: 是否存在常见安全漏洞\n3. **可维护性**: 函数复杂度、注释完整性\n4. **性能**: 明显的性能问题\n\n## 输出格式\n\n对每个文件输出：\n- 评分（1-10）\n- 发现的问题列表\n- 改进建议"
  },
  "capabilities": ["read_file", "llm_chat", "write_file", "glob"],
  "compatibility": {
    "source": "custom"
  }
}
```

### worker.yaml

```yaml
tools:
  - name: glob
  - name: read_file
  - name: llm_chat
  - name: write_file

shared_context:
  project_dir: "./src"
  report_path: "./code-review-report.md"

pipeline:
  - step: find_files
    tool: glob
    args:
      pattern: "**/*.py"
      cwd: "{{project_dir}}"
      ignore: ["**/__pycache__/**", "**/venv/**", "**/.git/**"]
    result: python_files

  - step: read_files
    tool: read_file
    args:
      path: "{{python_files.files[0]}}"
    when: "{{python_files.count}} > 0"
    result: first_file_content

  - step: analyze_code
    tool: llm_chat
    args:
      system_prompt: "你是一个专业的 Python 代码审查助手。请分析代码质量、安全性和可维护性。"
      prompt: "请审查以下 Python 代码：\n\n```python\n{{first_file_content}}\n```\n\n请提供：\n1. 总体评分（1-10）\n2. 发现的问题\n3. 改进建议"
      model: "gpt-4o"
      temperature: 0.3
    result: review_result

  - step: generate_report
    tool: write_file
    args:
      path: "{{report_path}}"
      content: |
        # 代码审查报告

        ## 审查文件
        - {{python_files.files[0]}}

        ## 审查结果
        {{review_result.content}}

        ---
        生成时间: {{env.TIME}}
```

## 步骤 2: 验证配置

使用 agent-deploy 验证 Agent 配置：

```bash
# 验证 agent.json
agent-deploy validate ./code-reviewer

# 预览 pipeline 执行流程
agent-deploy preview ./code-reviewer
```

预期输出：

```
Agent: code-reviewer v1.0.0
Pipeline Preview:
  1. find_files (glob) -> python_files
  2. read_files (read_file) -> first_file_content [conditional: python_files.count > 0]
  3. analyze_code (llm_chat) -> review_result
  4. generate_report (write_file) -> output

Estimated steps: 4
Tools used: glob, read_file, llm_chat, write_file
```

## 步骤 3: 执行 Agent

使用 agent-compose 执行 Agent：

```bash
# 启动 AgentRuntimeServer
agent-compose serve --port 8080

# 创建会话并执行
curl -X POST http://localhost:8080/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "code-reviewer",
    "metadata": {
      "project_dir": "./my-project",
      "report_path": "./review-report.md"
    }
  }'
```

响应：

```json
{
  "session_id": "sess-xyz789",
  "agent_id": "code-reviewer",
  "status": "created",
  "created_at": 1705312200
}
```

发送消息触发执行：

```bash
curl -X POST http://localhost:8080/sessions/sess-xyz789/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Start code review"
  }'
```

## 步骤 4: 使用 Python API 执行

```python
import asyncio
from agent_compose import (
    PipelineEngine,
    ExecutionContext,
    ToolRegistry,
    register_builtin_tools,
    Observability,
)

async def main():
    # 初始化组件
    registry = ToolRegistry()
    register_builtin_tools(registry)

    engine = PipelineEngine()
    obs = Observability()

    # 创建执行上下文
    context = ExecutionContext(
        agent_id="code-reviewer",
        initial_args={},
        env={"TIME": "2024-01-15 10:00"},
        cwd="./my-project"
    )

    # 加载 worker.yaml
    import yaml
    with open("./code-reviewer/worker.yaml", "r") as f:
        worker_config = yaml.safe_load(f)

    # 记录开始
    obs.log_pipeline_start("code-reviewer", "code-review")

    # 执行 pipeline
    result = await engine.execute(
        pipeline_config=worker_config,
        context=context,
        registry=registry,
        timeout_ms=120000
    )

    # 记录结束
    obs.log_pipeline_end(
        agent_id="code-reviewer",
        success=result["success"],
        duration_ms=result["duration_ms"],
        step_count=len(result["steps"])
    )

    # 输出结果
    if result["success"]:
        print("Code review completed successfully!")
        print(f"Duration: {result['duration_ms']:.0f}ms")

        # 读取生成的报告
        if os.path.exists("./review-report.md"):
            with open("./review-report.md", "r") as f:
                print("\nReport preview:")
                print(f.read()[:500])
    else:
        print(f"Code review failed: {result['output']}")

if __name__ == "__main__":
    asyncio.run(main())
```

## 步骤 5: 发布到 Market

```python
import asyncio
from agent_compose import MarketClient

async def publish():
    client = MarketClient(
        base_url="http://localhost:8321",
        api_key="your-api-key"
    )

    # 发布 Agent
    result = await client.upload_agent(
        agent_dir="./code-reviewer",
        force=False
    )

    print(f"Published: {result.market_url}")

    # 搜索已发布的 Agent
    search = await client.search_agents(query="code-review")
    for agent in search.items:
        print(f"- {agent.name} ({agent.version}): {agent.description}")

asyncio.run(publish())
```

## 步骤 6: 从 Market 安装并使用

```bash
# 从 Market 下载
agent-deploy install code-reviewer --version 1.0.0

# 执行
agent-compose run code-reviewer --context project_dir=./my-project
```

## 完整项目结构

```
code-reviewer/
├── agent.json          # Agent 定义
├── worker.yaml         # Pipeline 定义
├── CHANGELOG.md        # 版本日志
└── README.md           # 使用说明

my-project/
├── src/
│   ├── main.py
│   └── utils.py
└── review-report.md    # 生成的报告
```

## 进阶：添加自定义工具

创建 `custom_tools.py`：

```python
import ast
from typing import Any, Dict

async def analyze_complexity(args: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """分析 Python 代码复杂度"""
    code = args.get("code", "")

    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return {"error": f"Syntax error: {e}"}

    functions = []
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            # 简单复杂度：代码行数
            lines = node.end_lineno - node.lineno if node.end_lineno else 0
            functions.append({
                "name": node.name,
                "lines": lines,
                "args": len(node.args.args),
            })

    return {
        "total_functions": len(functions),
        "functions": functions,
        "average_lines": sum(f["lines"] for f in functions) / len(functions) if functions else 0,
    }
```

在 `worker.yaml` 中使用：

```yaml
tools:
  - name: glob
  - name: read_file
  - name: llm_chat
  - name: write_file
  - name: analyze_complexity  # 自定义工具

pipeline:
  - step: find_files
    tool: glob
    args:
      pattern: "**/*.py"
    result: files

  - step: analyze
    tool: analyze_complexity
    args:
      code: "{{steps.read_first_file.output}}"
    result: complexity

  - step: report
    tool: llm_chat
    args:
      prompt: |
        代码复杂度分析：
        - 函数数量: {{complexity.total_functions}}
        - 平均行数: {{complexity.average_lines}}

        请给出改进建议。
```

注册自定义工具：

```python
from custom_tools import analyze_complexity
registry.register("analyze_complexity", analyze_complexity)
```
