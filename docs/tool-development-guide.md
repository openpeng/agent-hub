# 工具开发指南

## 概述

工具（Tool）是 Agent 执行 pipeline 步骤时调用的功能单元。每个工具是一个异步函数，接收参数和执行上下文，返回执行结果。

## 工具接口

### 基本接口

```python
from typing import Any, Dict

async def my_tool(args: Dict[str, Any], context: Any) -> Any:
    """
    工具函数签名

    Args:
        args: 工具参数，由 pipeline 步骤的 args 字段传入
        context: ExecutionContext，包含执行状态、环境变量、工作目录等

    Returns:
        任意类型的执行结果，会被存入 StepResult.output
    """
    # 实现工具逻辑
    return result
```

### 参数说明

**args 参数**:

| 字段 | 类型 | 说明 |
|------|------|------|
| 自定义字段 | Any | 由 pipeline 步骤定义 |

**context 对象**:

| 属性 | 类型 | 说明 |
|------|------|------|
| `agent_id` | str | 当前 Agent ID |
| `cwd` | str | 当前工作目录 |
| `env` | Dict[str, str] | 环境变量 |
| `initial_args` | Dict | 初始参数 |
| `shared_context` | Dict | 共享上下文 |
| `steps` | Dict[str, StepResult] | 已执行步骤的结果 |

## 创建自定义工具

### 步骤 1: 实现工具函数

```python
# my_tools.py
import os
from typing import Any, Dict

async def count_lines(args: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """统计文件行数"""
    path = args.get("path")
    if not path:
        raise ValueError("count_lines: 'path' parameter is required")

    # 使用 context.cwd 解析相对路径
    cwd = getattr(context, "cwd", os.getcwd())
    abs_path = os.path.join(cwd, path) if not os.path.isabs(path) else path

    if not os.path.exists(abs_path):
        raise FileNotFoundError(f"File not found: {path}")

    with open(abs_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    return {
        "path": abs_path,
        "line_count": len(lines),
        "non_empty_lines": len([l for l in lines if l.strip()]),
    }
```

### 步骤 2: 注册到 ToolRegistry

```python
from agent_compose import ToolRegistry, PipelineEngine, ExecutionContext

# 创建注册表
registry = ToolRegistry()

# 注册自定义工具
from my_tools import count_lines
registry.register("count_lines", count_lines)

# 使用注册表执行 pipeline
engine = PipelineEngine()
context = ExecutionContext()

result = await engine.execute(
    pipeline_config={
        "pipeline": [
            {
                "step": "count",
                "tool": "count_lines",
                "args": {"path": "main.py"},
                "result": "line_stats"
            }
        ]
    },
    context=context,
    registry=registry
)

# 结果会存入 shared_context
print(context.shared_context["line_stats"])
# {"path": "/abs/path/main.py", "line_count": 42, "non_empty_lines": 35}
```

### 步骤 3: 在 worker.yaml 中使用

```yaml
tools:
  - name: count_lines  # 声明工具

pipeline:
  - step: count_src
    tool: count_lines
    args:
      path: "src/main.py"
    result: stats

  - step: report
    tool: llm_chat
    args:
      prompt: "File has {{stats.line_count}} lines, {{stats.non_empty_lines}} non-empty"
```

## 工具最佳实践

### 1. 参数验证

始终验证必需参数：

```python
async def safe_tool(args, context):
    required = ["path", "content"]
    for field in required:
        if field not in args:
            raise ValueError(f"safe_tool: '{field}' parameter is required")
    # ...
```

### 2. 路径安全

使用 `context.cwd` 解析相对路径，避免目录遍历：

```python
import os

def resolve_path(path: str, cwd: str) -> str:
    if os.path.isabs(path):
        return os.path.normpath(path)
    return os.path.normpath(os.path.join(cwd or os.getcwd(), path))
```

### 3. 错误处理

抛出明确的异常，PipelineEngine 会捕获并生成失败的 StepResult：

```python
async def robust_tool(args, context):
    try:
        # 执行操作
        result = await do_something()
        return result
    except FileNotFoundError as e:
        raise FileNotFoundError(f"robust_tool: File not found: {e}")
    except PermissionError as e:
        raise PermissionError(f"robust_tool: Permission denied: {e}")
    except Exception as e:
        raise RuntimeError(f"robust_tool: Unexpected error: {e}")
```

### 4. 超时控制

长时间运行的工具应支持超时：

```python
import asyncio

async def slow_tool(args, context):
    timeout = args.get("timeout", 30)  # 默认 30 秒
    try:
        result = await asyncio.wait_for(
            long_running_operation(),
            timeout=timeout
        )
        return result
    except asyncio.TimeoutError:
        raise TimeoutError(f"slow_tool: Operation timed out after {timeout}s")
```

### 5. 结果结构化

返回字典而不是原始字符串，便于后续步骤引用：

```python
# 好：结构化结果
return {
    "success": True,
    "data": processed_data,
    "metadata": {"count": len(processed_data)}
}

# 避免：非结构化结果
return f"Processed {len(processed_data)} items"
```

## 内置工具参考

| 工具名 | 功能 | 关键参数 |
|--------|------|----------|
| `bash` | Shell 命令执行 | `command`, `timeout`, `cwd`, `env` |
| `read_file` | 文件读取 | `path`, `encoding`, `max_size` |
| `write_file` | 文件写入 | `path`, `content`, `mode`, `create_dirs` |
| `glob` | 文件匹配 | `pattern`, `cwd`, `ignore`, `absolute` |
| `llm_chat` | LLM 对话 | `prompt`, `model`, `temperature`, `provider` |
| `web_search` | 网络搜索 | `query`, `engine`, `max_results` |
| `web_fetch` | HTTP 请求 | `url`, `method`, `headers`, `timeout` |

### 注册所有内置工具

```python
from agent_compose import ToolRegistry, register_builtin_tools

registry = ToolRegistry()
register_builtin_tools(registry)

# 现在可以使用所有内置工具
print(registry.list_tools())
# ['bash', 'read_file', 'write_file', 'glob', 'llm_chat', 'web_search', 'web_fetch']
```

## 高级：工具组合

创建复合工具，内部调用其他工具：

```python
async def analyze_project(args, context):
    """分析项目：查找所有 Python 文件并统计代码行数"""
    from agent_compose.tools.glob_tool import glob_tool
    from agent_compose.tools.read_file import read_file_tool

    # 查找所有 Python 文件
    glob_result = await glob_tool(
        {"pattern": "**/*.py", "cwd": args.get("project_dir", ".")},
        context
    )

    total_lines = 0
    file_stats = []

    for file_path in glob_result["files"]:
        content = await read_file_tool({"path": file_path}, context)
        lines = len(content.split("\n"))
        total_lines += lines
        file_stats.append({"path": file_path, "lines": lines})

    return {
        "total_files": len(file_stats),
        "total_lines": total_lines,
        "files": file_stats,
    }
```

## 测试工具

使用 pytest 测试自定义工具：

```python
import pytest
from agent_compose.pipeline_engine import ExecutionContext
from my_tools import count_lines

@pytest.mark.asyncio
async def test_count_lines():
    ctx = ExecutionContext()
    result = await count_lines({"path": "test_file.py"}, ctx)
    assert "line_count" in result
    assert result["line_count"] > 0
```
