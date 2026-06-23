# Market 后端工程：SQLite WAL、三阶段安全扫描与滑动窗口限流

> 跨平台 AI Agent 互操作系统深度解析系列（六）

---

## 架构概览

agent-market 是一个 FastAPI 应用，提供 Agent/Team/Workflow/Skill/MCP Server 五种实体的注册、搜索、下载、评分和版本管理服务。后端约 1300 行 Python 代码，16 个模块，11 张数据库表。

```
请求 → CORS → NoCache → RateLimiter → Auth → Router → Service → Database
```

中间件按注册顺序逆序执行（ASGI 标准），请求经过 CORS → NoCache → RateLimiter → Auth 四层过滤后到达路由。

---

## SQLite WAL 模式与异步访问

```python
async def connect(self):
    self._conn = await aiosqlite.connect(self.db_path)
    self._conn.row_factory = aiosqlite.Row
    await self._conn.execute("PRAGMA journal_mode=WAL")
    await self._conn.execute("PRAGMA foreign_keys=ON")
```

WAL（Write-Ahead Logging）模式的关键优势：**读写不互相阻塞**。默认的 DELETE 模式下，写操作会锁定整个数据库文件，读操作必须等待。WAL 模式下，写操作追加到 WAL 文件，读操作继续从主文件读取，两者可以并发进行。

对于一个读多写少的 Market 服务（搜索/下载远多于上传），WAL 模式的性能提升是显著的。

`aiosqlite` 提供了异步的 SQLite 访问接口，所有数据库操作都是 `async` 方法。`row_factory = aiosqlite.Row` 让查询结果以字典风格访问（`row['name']` 而非 `row[0]`）。

---

## 数据模型：11 张表的设计

| 表名 | 用途 | 关键设计 |
|------|------|----------|
| `agents` | Agent 主表 | TEXT PK, tags/dependencies 以 JSON 字符串存储 |
| `teams` | Team 主表 | 与 agents 同构 |
| `workflows` | Workflow 主表 | 与 agents 同构 |
| `ratings` | 评分表 | `UNIQUE(agent_id, user_id)`, FK CASCADE 删除 |
| `downloads` | 下载记录 | 记录 IP + User-Agent |
| `api_keys` | API Key 表 | 仅存 `key_hash`，不存明文 |
| `skills` | 技能定义 | 独立表 |
| `mcp_servers` | MCP 服务定义 | args/tools/required_env 以 JSON 存储 |
| `agent_skills` | Agent-Skill 关联 | 复合 PK `(agent_id, skill_id)` |
| `agent_mcp_servers` | Agent-MCP 关联 | 复合 PK `(agent_id, mcp_server_id)` |
| `versions` | 版本历史 | 三实体共用, `UNIQUE(entity_type, entity_id, version)` |

Agent/Team/Workflows 三张主表采用**同构设计**——相同的字段结构，相同的 CRUD 操作。这种设计减少了代码重复，新增实体类型只需创建一张新表和对应的路由，不需要重写业务逻辑。

`versions` 表通过 `entity_type` 字段区分三种实体，实现 SemVer 多版本共存。每次上传新版本时，旧版本保留在数据库中，用户可以回滚到任意历史版本。

### 评分聚合

```python
async def _update_rating_aggregate(self, entity_id: str, entity_type: str):
    cursor = await self._conn.execute(
        "SELECT AVG(score), COUNT(*) FROM ratings WHERE entity_id=? AND entity_type=?",
        (entity_id, entity_type)
    )
    avg = round(row[0], 1) if row and row[0] else 0.0
    cnt = row[1] if row else 0
    await self._conn.execute(
        f"UPDATE {entity_type}s SET rating=?, review_count=? WHERE id=?",
        (avg, cnt, entity_id)
    )
```

每次评分后实时重算 AVG 和 COUNT 写回主表。这种"写时聚合"策略在评分频率远低于查询频率的场景下是合理的。

### 关联表同步

```python
async def sync_agent_skills(self, agent_id: str, skill_ids: list[str]):
    await self._conn.execute("DELETE FROM agent_skills WHERE agent_id=?", (agent_id,))
    for skill_id in skill_ids:
        await self._conn.execute(
            "INSERT OR IGNORE INTO agent_skills (agent_id, skill_id) VALUES (?, ?)",
            (agent_id, skill_id)
        )
```

采用"先删后插"策略——每次同步时先清除旧关联，再插入新关联。简单粗暴但可靠，避免了复杂的 diff 计算。

---

## 三阶段安全扫描

Market 的安全扫描分为三个阶段，逐层深入：

### 阶段一：tar 成员列表检查（不解压）

```python
def verify_tar_safety(tar_path: Path):
    errors = []
    total_size = 0
    with tarfile.open(tar_path, "r:gz") as tar:
        for member in tar.getmembers():
            name = member.name
            # 路径遍历检测
            if name.startswith("/") or ".." in name.split("/"):
                errors.append(f"禁止的路径: {name}")
            # 符号链接检测
            if member.issym() or member.islnk():
                errors.append(f"禁止的符号链接: {name}")
            total_size += member.size
    if total_size > 50 * 1024 * 1024:
        errors.append(f"压缩包解压后体积过大: {total_size/1024/1024:.1f}MB")
    return len(errors) == 0, errors
```

这一阶段在**不解压**的情况下检查 tar 成员列表，检测三类威胁：
- **路径遍历**：绝对路径（`/etc/passwd`）和 `..` 父目录引用（`../../secret`）
- **符号链接**：软链接和硬链接都可能指向敏感文件
- **大小限制**：解压后总大小不超过 50MB

### 阶段二：解压后内容校验

```python
def verify_package(pkg_dir: Path):
    errors = []
    # agent.json 存在且可解析
    agent_json = pkg_dir / "agent.json"
    if not agent_json.exists():
        errors.append("缺少 agent.json")
    # 必填字段检查
    config = json.loads(agent_json.read_text())
    for field in ["identity.name", "identity.version", "identity.description", "identity.author"]:
        if not get_nested(config, field):
            errors.append(f"缺少必填字段: {field}")
    # instructions 质量检查（>= 50 字符）
    instructions = get_nested(config, "instructions.content", "")
    if len(instructions) < 50:
        errors.append("instructions 内容过短（至少 50 字符）")
    # Skills name 格式校验
    for skill in config.get("skills", []):
        if not re.match(r'^[a-zA-Z0-9_\-]+$', skill.get("name", "")):
            errors.append(f"Skill 名称格式无效: {skill.get('name')}")
    return len(errors) == 0, errors
```

### 阶段三：SHA-256 完整性校验

```python
def compute_sha256(file_path: Path) -> str:
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()
```

8KB 分块读取避免大文件内存溢出。校验值通过 HTTP `Digest` 头传递给客户端，客户端下载后重新计算并比对，实现**端到端完整性验证**。

---

## API Key 认证

```python
def generate_api_key() -> str:
    random_bytes = secrets.token_hex(16)  # CSPRNG
    return f"pd_mkt_{random_bytes}"

def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()

def verify_api_key_hash(key: str, stored_hash: str) -> bool:
    computed = hash_api_key(key)
    return hmac.compare_digest(computed, stored_hash)
```

三个关键设计决策：

1. **`secrets.token_hex(16)`**：使用 CSPRNG（密码学安全的伪随机数生成器），而非 `random` 模块
2. **SHA-256 哈希存储**：数据库仅存哈希值，明文 Key 仅在创建时返回一次
3. **`hmac.compare_digest()`**：常量时间比对，防止时序攻击——无论匹配与否，比对耗时相同

认证通过依赖注入实现：

```python
verify_publisher = make_api_key_dependency(get_db)   # publisher 或 admin
verify_admin = make_admin_key_dependency(get_db)       # 仅 admin

@app.post("/api/v1/agents", dependencies=[Depends(verify_publisher)])
async def register_agent(file: UploadFile, ...):
    ...
```

`make_api_key_dependency` 是一个工厂函数，通过闭包捕获 `db_provider`，生成可注入 FastAPI `Depends` 的异步依赖函数。

---

## 滑动窗口限流

```python
class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._buckets: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str) -> bool:
        now = time.time()
        cutoff = now - self.window_seconds
        # 清理过期记录
        self._buckets[key] = [t for t in self._buckets[key] if t > cutoff]
        # 检查是否超限
        if len(self._buckets[key]) >= self.max_requests:
            return False
        # 记录本次请求
        self._buckets[key].append(now)
        return True
```

算法本质是**滑动窗口计数器**：每个 key 维护一个时间戳列表，每次请求先淘汰窗口外的记录，再判断是否超限。

三层限流配置：

| 限流器 | 限制 | 窗口 | Key 策略 |
|--------|------|------|----------|
| 上传 | 20 次/小时 | 3600s | `upload:{publisher}` |
| 下载 | 100 次/分钟 | 60s | `download:{client_ip}` |
| Key 创建 | 5 次/小时 | 3600s | `keycreate:{client_ip}` |

按操作类型分层，按身份区分 key：上传按 publisher 身份限流（防止滥用发布权限），下载和 Key 创建按 IP 限流（防止未认证滥用）。

---

## 流式下载与元数据提取

### 元数据提取（不解压全包）

```python
def extract_metadata(package_path: Path) -> dict:
    with tarfile.open(package_path, "r:gz") as tar:
        for m in tar.getmembers():
            parts = m.name.split("/")
            if len(parts) == 2 and parts[1] == "agent.json":
                f = tar.extractfile(m)
                return json.loads(f.read().decode("utf-8"))
```

`len(parts) == 2` 确保只匹配顶层目录下的 `agent.json`，不匹配嵌套的 `templates/full-agent.json`。这种"流式提取"避免了解压整个包，对于大包尤其重要。

### 流式下载响应

```python
def create_package_stream(package_path: Path, filename: str):
    def iter_file():
        with open(package_path, "rb") as f:
            yield from f
    return StreamingResponse(
        iter_file(),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(package_path.stat().st_size),
            "Digest": f"sha-256={compute_sha256(package_path)}"
        }
    )
```

使用 Python 生成器实现流式传输，`Content-Length` 头让客户端知道文件大小，`Digest` 头提供完整性校验值。

---

## 统一搜索

```python
@app.get("/api/v1/search")
async def unified_search(
    q: str = "",
    types: str = "agent,team,workflow",
    page: int = 1,
    page_size: int = 20
):
    results = {}
    for entity_type in types.split(","):
        results[entity_type] = await db.search_entities(entity_type, q, page, page_size)
    return results
```

一次查询，同时返回多种实体的匹配结果。`types` 参数控制搜索范围，默认搜索 Agent、Team、Workflow 三种类型。

---

## 写在最后

agent-market 的工程实践体现了几个值得关注的决策：

- **同构表设计**：三种实体共享字段结构，减少代码重复，新增实体类型成本低
- **三阶段安全扫描**：从 tar 成员列表到内容校验到完整性验证，逐层深入
- **CSPRNG + SHA-256 + 常量时间比对**：API Key 安全的三重保障
- **WAL 模式 + aiosqlite**：在读多写少的场景下获得接近于数据库的并发性能
- **流式下载 + 流式元数据提取**：避免大文件内存压力

这些决策不是孤立的，它们共同构成了一个"安全优先、性能兼顾"的 Market 服务。

---

**项目地址**：[https://github.com/openpeng/agent-hub](https://github.com/openpeng/agent-hub)

**上一篇**：《Pipeline 运行时架构：步骤调度、模板变量与 OpenTelemetry 集成》

**系列完结**

---

*Agent Hub 核心能力深度解析系列到此结束。后续将根据项目进展，推出 Team/Workflow 实战、安全沙箱配置、可观测性看板搭建等进阶主题。*
