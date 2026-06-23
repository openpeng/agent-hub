# CHANGELOG — Skill/MCP 独立打包与引用机制 (v3.1)

**日期**: 2026-06-23  
**状态**: 开发中  
**关联 SPEC**: `SPEC_skill_mcp_reference.md`

---

## Phase 1: Skill 统一 skill.json (Breaking Change)

**状态**: ✅ 已完成（2026-06-23）

### 1.1 agent-market 数据库扩展

**文件**: `agent-market/src/market/database.py`

#### 变更 1: skills 表扩展 ✅
- **新增字段**:
  - `package_path TEXT` — Skill 包文件路径
  - `package_size INTEGER DEFAULT 0` — 包大小
  - `package_format TEXT DEFAULT 'tar.gz'` — 包格式
  - `content_format TEXT DEFAULT 'markdown'` — 内容格式
  - `content_source TEXT DEFAULT 'inline'` — 内容来源
  - `content TEXT DEFAULT ''` — SKILL.md 内容缓存
- **原因**: 支持 Skill 独立包存储和内容检索

#### 变更 2: mcp_servers 表扩展 ✅
- **新增字段**:
  - `package_path TEXT` — MCP Server 包文件路径
  - `package_size INTEGER DEFAULT 0` — 包大小
  - `package_format TEXT DEFAULT 'tar.gz'` — 包格式
  - `config_content TEXT DEFAULT ''` — mcp-config.json 内容缓存
- **原因**: 支持 MCP Server 独立包存储

#### 变更 3: upsert_skill() 方法更新 ✅
- **变更**: 增加 package_path, content 等字段的写入
- **原因**: 支持 Skill 独立包注册时存储包路径和内容

#### 变更 4: upsert_mcp_server() 方法更新 ✅
- **变更**: 增加 package_path, config_content 等字段的写入
- **原因**: 支持 MCP Server 独立包注册时存储包路径和配置

### 1.2 agent-market API 端点扩展 ✅

**文件**: `agent-market/src/market/server.py`

#### 变更 5: 新增 `POST /api/v1/skills/upload` ✅
- **功能**: 上传 Skill 包（multipart/form-data）
- **处理**: 验证 skill.json → 安全检查 → 存储包文件 → 提取元数据 → 写入数据库
- **状态码**: 201 Created

#### 变更 6: 新增 `GET /api/v1/skills/{id}/download` ✅
- **功能**: 下载 Skill 包文件
- **返回**: tar.gz 流
- **状态码**: 200 OK / 404 Not Found

#### 变更 7: 新增 `POST /api/v1/mcp-servers/upload` ✅
- **功能**: 上传 MCP Server 包
- **处理**: 验证 mcp-server.json → 安全检查 → 存储包文件 → 提取配置 → 写入数据库
- **状态码**: 201 Created

#### 变更 8: 新增 `GET /api/v1/mcp-servers/{id}/download` ✅
- **功能**: 下载 MCP Server 包文件
- **返回**: tar.gz 流
- **状态码**: 200 OK / 404 Not Found

### 1.3 agent-market 包验证逻辑更新 ✅

**文件**: `agent-market/src/market/verify.py`

#### 变更 9: 新增 verify_skill_package() ✅
- **功能**: 验证 Skill 包结构
- **检查项**:
  - skill.json 存在且可解析
  - identity.name 和 identity.version 必填
  - SKILL.md 存在（当 content.source == "file" 时）
  - scripts/ 中的文件可执行（可选）
  - 包大小不超过 10MB

#### 变更 10: 新增 verify_mcp_package() ✅
- **功能**: 验证 MCP Server 包结构
- **检查项**:
  - mcp-server.json 存在且可解析
  - mcp-config.json 存在且可解析
  - identity.name 和 identity.version 必填

### 1.4 agent-market 包提取逻辑更新 ✅

**文件**: `agent-market/src/market/skills_mcp.py`

#### 变更 11: extract_skills_info() 更新 ✅
- **删除**: 从 subagents 中解析 type: "skill" 的逻辑（移至向后兼容段）
- **新增**: 从 skills/ 目录下扫描 skill.json 文件（格式 C，v3.1 推荐）
- **新增**: 从 agent.json 顶层 skills 数组（source: "local"）解析（格式 A）
- **新增**: 提取 content 和 capabilities 字段
- **保留**: v3.0 subagents type: "skill" 向后兼容（标记 deprecated）

#### 变更 12: extract_mcp_info() 更新
- **新增**: 从 mcp/ 目录下扫描 mcp-server.json 文件
- **新增**: 提取 config_content 字段

### 1.5 agent-market 打包函数扩展 ✅

**文件**: `agent-market/src/market/package.py`

#### 变更 13: 新增 pack_skill() ✅
- **功能**: 将 Skill 目录打包为 tar.gz
- **输入**: Skill 目录（含 skill.json + SKILL.md）
- **输出**: `{name}-v{version}.tar.gz`

#### 变更 14: 新增 pack_mcp_server() ✅
- **功能**: 将 MCP Server 目录打包为 tar.gz
- **输入**: MCP Server 目录（含 mcp-server.json + mcp-config.json）
- **输出**: `{name}-v{version}.tar.gz`

#### 变更 15: 新增 extract_skill_metadata() ✅
- **功能**: 从 tar.gz 中提取 skill.json

#### 变更 16: 新增 extract_mcp_metadata() ✅
- **功能**: 从 tar.gz 中提取 mcp-server.json

---

## Phase 2: Skill 独立打包 CLI

### 2.1 agent-deploy CLI 扩展

**文件**: `agent-deploy/legacy/src/agent_deploy/skill_mcp_cli.py` (新增)

#### 变更 17: 新增 `skill` 子命令 ✅
- `agent-deploy skill pack <path>` — 打包 Skill
- `agent-deploy skill verify <file>` — 验证 Skill 包
- `agent-deploy skill upload <path>` — 上传 Skill 到市场
- `agent-deploy skill download <ref>` — 从市场下载 Skill
- `agent-deploy skill list --cached` — 列出已缓存 Skills
- `agent-deploy skill cache-clean` — 清理 Skill 缓存

#### 变更 18: 新增 `mcp` 子命令 ✅
- `agent-deploy mcp pack <path>` — 打包 MCP Server
- `agent-deploy mcp upload <path>` — 上传 MCP Server 到市场
- `agent-deploy mcp download <ref>` — 从市场下载 MCP Server
- `agent-deploy mcp list --cached` — 列出已缓存 MCP Servers

#### 变更 19: 新增 `cache` 子命令 ✅
- `agent-deploy cache status` — 查看缓存状态
- `agent-deploy cache clean` — 清理缓存（支持 `--all`, `--unused-for`, `--kind`）

---

## Phase 3: Agent 引用机制

### 3.1 agent-compose 运行时解析器

**文件**: `agent-compose/agent_compose/skill_mcp_resolver.py` (新增)

#### 变更 20: SkillMCPResolver 类 ✅
- **功能**: 统一解析 agent.json 中的 skills 和 mcp_servers 数组引用
- **方法**:
  - `resolve_agent(agent_json) -> ResolutionResult` — 解析所有引用
  - `_resolve_skill_ref(ref_item) -> ResolvedSkill` — 解析 Skill 引用
  - `_resolve_mcp_ref(ref_item) -> ResolvedMCP` — 解析 MCP 引用
  - `merge_to_agent(agent_json, result) -> Dict` — 合并解析结果到 agent.json

#### 变更 21: VersionConstraint 类 ✅
- **功能**: 语义化版本约束解析
- **支持**: `^`, `~`, `>=`, `>`, `*`, 精确版本, 范围约束
- **方法**: `match(version) -> bool`, `find_best(versions) -> str`

### 3.2 agent-compose 缓存管理

**文件**: `agent-compose/agent_compose/skill_mcp_resolver.py` (CacheManager)

#### 变更 22: CacheManager 类 ✅
- **功能**: 管理 ~/.agent-hub/cache/ 目录
- **方法**:
  - `get_skill_path(ref, version) -> Path` — 获取 Skill 缓存路径
  - `get_mcp_path(ref, version) -> Path` — 获取 MCP 缓存路径
  - `store_skill(ref, version, package_path)` — 存储 Skill 包
  - `store_mcp(ref, version, package_path)` — 存储 MCP 包
  - `check_update_needed(ref, version)` — 检查是否需要更新
  - `clean_unused(days)` — 清理未使用的缓存
  - `list_cached(kind)` — 列出已缓存条目

---

## Phase 4: 向后兼容与迁移

### 4.1 运行时兼容层

**文件**: `agent-compose/agent_compose/compat_v30.py` (新增)

#### 变更 23: v3.0 兼容加载器 ✅
- **功能**: 同时支持 v3.0（subagents type: "skill"）和 v3.1（skills 数组）格式
- **行为**: 检测到 v3.0 格式时发出 deprecation warning，自动转换为 v3.1 内部表示
- **方法**:
  - `detect_v30_format(agent_json) -> bool` — 检测 v3.0 格式
  - `migrate_v30_to_v31(agent_json) -> Dict` — 内存中迁移
  - `compat_load_agent(agent_json, agent_dir) -> Dict` — 兼容加载入口

### 4.2 迁移工具

**文件**: `agent-deploy/legacy/src/agent_deploy/migrate.py` (新增)

#### 变更 24: migrate 命令 ✅
- `python -m agent_deploy.migrate --from 3.0 --to 3.1 <path>`
- **功能**:
  - 将 skills/*/agent.json 重命名为 skill.json
  - 将 agent.json 中的 subagents type: "skill" 迁移到 skills 数组
  - 更新 schema_version 为 "3.1"
- **选项**: `--dry-run` 预览变更

---

## 文档更新记录

| 文件 | 版本变更 | 更新内容 |
|------|---------|---------|
| `SPEC_skill_mcp_reference.md` | 1.0.0 | 新增 SPEC 文档 |
| `agent-protocol/specs/skill-system.md` | 3.0.0 → 3.1.0 | Skill 统一 skill.json、市场引用模式 |
| `agent-protocol/specs/mcp-integration.md` | 3.0.0 → 3.1.0 | MCP 市场引用模式 |
| `agent-protocol/specs/market-skill-mcp-support.md` | 1.0.0 → 1.1.0 | 独立打包端点、数据库扩展 |
| `agent-protocol/specs/agent-json-v3.md` | 3.0.0 → 3.1.0 | skills 数组、SkillRef/MCPRef |
| `.trae/rules/agent-deploy-workflow.md` | — | 新增 Skill/MCP 上传命令 |
| `.trae/rules/agent-guide.md` | — | 新增 Skill/MCP 市场引用章节 |

---

## 测试清单

- [x] Skill 包上传/下载/验证
- [x] MCP Server 包上传/下载/验证
- [x] Agent 引用市场 Skill（本地缓存命中）
- [x] Agent 引用市场 Skill（本地缓存未命中，从市场下载）
- [x] 版本约束解析（^, ~, >=, *, 精确版本）
- [x] 混合模式（内联 + 引用共存）
- [x] v3.0 向后兼容（subagents type: "skill"）
- [x] 迁移工具（3.0 → 3.1）
- [x] 缓存管理（存储、更新、清理）
- [x] env_override 覆盖机制
