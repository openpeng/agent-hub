# Aliyun Log Analyzer Agent

从阿里云 SLS 读取日志 → LLM 智能分析 → 输出结构化诊断报告。

## 功能

- **环境自适应**: 一键切换生产/测试/开发环境
- **错误识别**: 自动提取 ERROR 日志并按频次分类
- **性能分析**: 慢请求 SQL 聚合，Top N 接口定位
- **异常检测**: 突发错误识别、周期性波动研判
- **结构化报告**: Markdown 格式诊断报告，含修复建议

## 环境对照表

| 环境 | Project ID |
|------|-----------|
| 生产 / prod | `k8s-log-c564a98cd8c2049bfab65cb77d60fb990` |
| 测试 / test | `k8s-log-cc268be26b9ab44ea9e5cfe557d994c99` |
| 预发 / pre | `k8s-log-c463c611544914d0f9ab32a2607276526` |
| 开发 / dev | `gaodun-dev` |

## 快速使用

```bash
# 基础用法: 查看生产环境某服务的最近报错
agent-deploy run ./test-agents/aliyun-log-analyzer --trusted --args \
  project=k8s-log-c564a98cd8c2049bfab65cb77d60fb990 \
  logstore=your-service-logstore \
  query="level:ERROR" \
  lookback_minutes=30

# 追踪特定 traceId
agent-deploy run ./test-agents/aliyun-log-analyzer --trusted --args \
  project=k8s-log-cc268be26b9ab44ea9e5cfe557d994c99 \
  logstore=test-sail-ep-backend \
  query="traceId:abc123def456" \
  lookback_minutes=60

# 性能分析模式
agent-deploy run ./test-agents/aliyun-log-analyzer --trusted --args \
  project=k8s-log-c564a98cd8c2049bfab65cb77d60fb990 \
  logstore=your-service-logstore \
  query="level:ERROR" \
  lookback_minutes=120 \
  max_lines=100
```

## 输入参数

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `project` | 是 | - | SLS Project ID |
| `logstore` | 是 | - | 目标 LogStore 名称 |
| `query` | 否 | `level:ERROR` | SLS 查询语句 |
| `lookback_minutes` | 否 | `30` | 回溯时间（分钟） |
| `max_lines` | 否 | `100` | 最大返回行数（1-100） |
| `project_filter` | 否 | `""` | Project 模糊过滤关键字 |
| `service_filter` | 否 | `""` | LogStore 模糊过滤关键字 |

## Pipeline 流程

```
check_config (验证凭证)
    ↓
list_projects (环境发现)
    ↓
find_logstores (服务发现)
    ↓
collect_errors (采集错误日志)
    ↓
error_stats (错误统计 SQL)
    ↓
slow_queries (慢请求分析 SQL)
    ↓
analyze (LLM 诊断分析)
    ↓
save_report (输出 Markdown 报告)
```

## 输出示例

生成的报告包含以下章节：
- **诊断摘要** — 时间范围、数据量、健康度评级
- **错误分析** — 错误级别分布、Top N 错误类型、新增错误检测
- **性能分析** — 慢接口 Top 5、耗时异常检测
- **异常检测** — 突发错误、周期性波动、关联分析
- **处理建议** — 按优先级排列的修复方向

## 依赖

- **MCP Server**: `@openpeng/alilog-mcp` (全局安装推荐)
- **LLM**: 需要配置 `ANTHROPIC_API_KEY` 环境变量
- **认证**: SLS 凭证通过 Consul 自动获取（或环境变量）
