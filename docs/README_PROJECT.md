# Agent Hub — 项目概述

> 跨平台 AI Agent 互操作平台：部署 + 发现 + 执行，一个 agent.json 就够了

**状态**: Phase 1-8 全部完成
**日期**: 2026-06-12

---

## 项目目标

构建以 **agent.json** 为唯一真相来源的跨平台 AI Agent 互操作系统，消除 AI 编码工具厂商锁定。

### 核心理念
- agent.json 是唯一真相来源
- 支持 3 种 Agent 格式 (v3 inline / v3 file-based / v2 legacy)
- 100% 向后兼容
- 跨 9 平台 AI 工具互操作

---

## 三大核心能力

```
┌────────────┐    ┌────────────┐    ┌────────────┐
│   市场      │    │   部署      │    │   执行      │
│ Market     │    │ Deploy     │    │ Execute    │
├────────────┤    ├────────────┤    ├────────────┤
│ 搜索/下载   │    │ agent.json │    │ Pipeline   │
│ 上传/评分   │ →  │ → 9种工具   │ →  │ 动态覆盖    │
│ Agent 仓库  │    │ 跨平台分发   │    │ 子Agent编排 │
└────────────┘    └────────────┘    └────────────┘
```

---

## 已完成的工作

### Phase 1-2: Export + Import
- agent.json 核心化，消除 SKILL.md 硬依赖
- 跨平台部署到 9 个 AI 工具 (22 tests)
- 从 4 平台导入 Agent (31 tests)

### Phase 3-4: Market + UX
- Agent 上传/下载/搜索 (FastAPI + SQLite)
- CLI 11 命令 + 12 错误处理器
- 5 个 Agent 模板 + init 命令
- 自举能力：系统可用 Agent 创建 Agent

### Phase 5-6: Runtime + Composition
- YAML Pipeline 解析和执行引擎 (87 tests)
- 9 个内置工具: llm_chat, read_file, write_file, bash, glob, web_fetch, web_search, invoke_agent, list_agents (127 tests)
- 子Agent 调用 + invoke_parallel 并行
- Market 依赖解析 + Agent 缓存 + DFS 循环检测

### Phase 7: Security & Quality
- Runtime 沙箱 (ExecutionPolicy + 默认受限)
- API Key SHA-256 哈希存储
- 上传包安全扫描 (路径遍历/符号链接/大小)
- 下载包 SHA-256 完整性校验
- Rate Limiting 分层防护
- Agent 弃用/下架机制
- 评分系统
- Docker 部署支持

### Phase 8: Agent Gateway
- agent-executor 核心编排模块 (CLI + MCP 共用)
- execute_agent MCP 工具 (8 种动态覆盖)
- list_agents MCP 工具 (本地 + Market 发现)
- invoke_agent 扩展 (支持 overrides)
- 上下文四层模型

## 技术成就

1. **消除厂商锁定** — 同一 agent.json 可部署到 9 种 AI 工具
2. **多格式统一** — 一套代码适配 3 种 Agent 格式
3. **智能 fallback** — 自动降级，永不失败
4. **安全优先** — 默认受限 + 显式授权，Zero Trust 模型
5. **生态融合** — 支持从 Cursor/Claude Code/CodeBuddy/GitHub Copilot 导入

## 测试覆盖

| 测试套件 | 测试数 | 状态 |
|----------|--------|------|
| Export (adapt) | 22 | ✅ |
| Import | 31 | ✅ |
| Pipeline Engine | 87 | ✅ |
| Built-in Tools | 127 | ✅ |
| Subagent | 36 | ✅ |
| V2 Compat | 18 | ✅ |
| CLI / E2E | 13 | ✅ |
| **总计** | **345+** | **✅** |

---

## 关键决策

### 1. 向后兼容性
**决策**: 保留所有 fallback 机制，零破坏性变更
**原因**: 保护现有用户和 agents

### 2. 多格式支持  
**决策**: 同时支持 v3 inline, v3 file-based, v2 legacy 三种范式
**原因**: 最大化生态兼容性

### 3. 默认不信任
**决策**: 所有 Agent 默认受限运行，需 --trusted 显式授权
**原因**: 安全第一，保护用户环境

### 4. Context-based 无全局状态
**决策**: ToolRegistry 通过 ExecutionContext 传递，无全局单例
**原因**: 支持并发执行和嵌套 Agent

---

## 相关资源

- [GitHub](https://github.com/openpeng/agent-hub)
- [主 README](README.md) — 完整项目文档
- [架构设计](ARCHITECTURE.md) — Agent Gateway 架构
- [状态跟踪](STATUS.md) — 项目进度
- [快速开始](docs/QUICK_START.md) — 5 分钟上手

---

**最后更新**: 2026-06-12
**维护者**: Peng Xiao
