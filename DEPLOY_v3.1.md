# Agent Market v3.1 部署说明

**版本**: v3.1 (Skill/MCP 独立打包与引用)  
**日期**: 2026-06-23  
**部署目标**: 云端市场 (https://market.aitboy.cn)  
**代码路径**: `d:\mycode\agent-hub\agent-market/`

---

## 一、部署前准备

### 1.1 确认代码修改

本次部署包含以下代码变更（已修改 5 个文件）：

| 文件 | 变更内容 | 影响 |
|------|---------|------|
| `src/market/database.py` | skills/mcp_servers 表扩展 6+4 个字段；upsert 方法更新 | 数据库 schema 变更，需要重建或迁移 |
| `src/market/server.py` | 新增 4 个 API 端点（skills/upload, skills/download, mcp-servers/upload, mcp-servers/download） | 新增功能 |
| `src/market/package.py` | 新增 pack_skill, pack_mcp_server, extract_skill_metadata, extract_mcp_metadata | 新增功能 |
| `src/market/verify.py` | 新增 verify_skill_package, verify_mcp_package | 新增功能 |
| `src/market/skills_mcp.py` | extract_skills_info 重构：支持 skill.json 扫描、content/capabilities 提取、v3.0 向后兼容 | 功能增强 |

### 1.2 环境要求

| 项目 | 要求 |
|------|------|
| Python | 3.10+ |
| 依赖 | fastapi>=0.100, uvicorn>=0.22, pydantic>=2.0, aiosqlite>=0.19, httpx>=0.24, pyyaml>=6.0, python-multipart |
| 端口 | 8321 (HTTP) |
| 存储 | 数据持久化目录（SQLite + 包文件） |

### 1.3 备份现有数据

**重要**：部署前务必备份现有数据库和包文件！

```bash
# 备份数据库
ssh <服务器>
cd /path/to/agent-market
cp data/market/market.db data/market/market.db.bak.$(date +%Y%m%d)

# 备份包文件
tar czf packages-backup-$(date +%Y%m%d).tar.gz data/market/packages/
```

---

## 二、部署方式（二选一）

### 方式 A: Docker 部署（推荐）

#### 步骤 1: 构建镜像

```bash
cd /path/to/agent-market

# 更新版本号
sed -i 's/version = "1.0.0"/version = "1.1.0"/' pyproject.toml

# 构建镜像
docker build -t agent-market:v3.1 .
```

#### 步骤 2: 准备数据目录

```bash
# 创建数据目录（如果尚未存在）
mkdir -p /data/agent-market/market/packages

# 如果已有数据，复制到数据目录
cp -r /path/to/old-data/market/* /data/agent-market/market/
```

#### 步骤 3: 运行容器

```bash
docker run -d \
  --name agent-market \
  -p 8321:8321 \
  -v /data/agent-market:/app/data \
  -e MARKET_MASTER_KEY="your-master-key" \
  -e MARKET_DB_PATH="data/market/market.db" \
  -e MARKET_PACKAGES_DIR="data/market/packages" \
  --restart unless-stopped \
  agent-market:v3.1
```

#### 步骤 4: 验证部署

```bash
# 健康检查
curl -s http://localhost:8321/api/v1/health

# 查看新端点是否可用
curl -s http://localhost:8321/api/v1/skills | head -c 200
```

---

### 方式 B: 直接部署（Python 环境）

#### 步骤 1: 安装依赖

```bash
cd /path/to/agent-market

# 创建虚拟环境（推荐）
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# 或: venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt
```

#### 步骤 2: 设置环境变量

```bash
export MARKET_MASTER_KEY="your-master-key"
export MARKET_DB_PATH="data/market/market.db"
export MARKET_PACKAGES_DIR="data/market/packages"
export MARKET_API_URL="https://market.aitboy.cn"
```

#### 步骤 3: 启动服务

```bash
# 开发模式（带热重载）
python -m uvicorn src.market.server:app --reload --host 0.0.0.0 --port 8321

# 生产模式
python -m uvicorn src.market.server:app --host 0.0.0.0 --port 8321 --workers 4
```

#### 步骤 4: 使用 systemd 管理（Linux）

```ini
# /etc/systemd/system/agent-market.service
[Unit]
Description=Agent Market Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/agent-market
Environment=MARKET_MASTER_KEY=your-master-key
Environment=MARKET_DB_PATH=data/market/market.db
Environment=MARKET_PACKAGES_DIR=data/market/packages
ExecStart=/path/to/agent-market/venv/bin/python -m uvicorn src.market.server:app --host 0.0.0.0 --port 8321
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable agent-market
sudo systemctl start agent-market
sudo systemctl status agent-market
```

---

## 三、数据库迁移（重要）

由于数据库 schema 有变更（skills/mcp_servers 表新增字段），需要处理现有数据：

### 方案 1: 自动迁移（推荐）

代码中已包含 schema 的 `CREATE TABLE IF NOT EXISTS`，SQLite 的 `ALTER TABLE` 可以在启动时自动添加新列。但如果已有数据，需要手动迁移：

```bash
# 连接到 SQLite 数据库
sqlite3 data/market/market.db

# 执行迁移 SQL
ALTER TABLE skills ADD COLUMN package_path TEXT DEFAULT '';
ALTER TABLE skills ADD COLUMN package_size INTEGER DEFAULT 0;
ALTER TABLE skills ADD COLUMN package_format TEXT DEFAULT 'tar.gz';
ALTER TABLE skills ADD COLUMN content_format TEXT DEFAULT 'markdown';
ALTER TABLE skills ADD COLUMN content_source TEXT DEFAULT 'inline';
ALTER TABLE skills ADD COLUMN content TEXT DEFAULT '';

ALTER TABLE mcp_servers ADD COLUMN package_path TEXT DEFAULT '';
ALTER TABLE mcp_servers ADD COLUMN package_size INTEGER DEFAULT 0;
ALTER TABLE mcp_servers ADD COLUMN package_format TEXT DEFAULT 'tar.gz';
ALTER TABLE mcp_servers ADD COLUMN config_content TEXT DEFAULT '';

.quit
```

### 方案 2: 重建数据库（如果数据可重建）

```bash
# 备份旧数据库
mv data/market/market.db data/market/market.db.v1.0.bak

# 启动服务，自动创建新 schema
python -m uvicorn src.market.server:app --host 0.0.0.0 --port 8321

# 然后重新上传所有 Agent/Skill/MCP
```

---

## 四、验证清单

部署完成后，按以下清单验证：

### 4.1 基础功能验证

```bash
# 1. 健康检查
curl -s http://localhost:8321/api/v1/health
# 期望: {"status":"ok"}

# 2. Agent 列表
curl -s http://localhost:8321/api/v1/agents | python -m json.tool | head -20

# 3. Skill 列表
curl -s http://localhost:8321/api/v1/skills | python -m json.tool | head -20

# 4. MCP Server 列表
curl -s http://localhost:8321/api/v1/mcp-servers | python -m json.tool | head -20
```

### 4.2 新端点验证

```bash
# 5. Skill 上传端点（需要 API Key）
curl -X POST http://localhost:8321/api/v1/skills/upload \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@./test-skill.tar.gz" \
  -F "force=false"

# 6. Skill 下载端点
curl -s http://localhost:8321/api/v1/skills/test-skill/download \
  -o test-skill-downloaded.tar.gz

# 7. MCP Server 上传端点
curl -X POST http://localhost:8321/api/v1/mcp-servers/upload \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@./test-mcp.tar.gz" \
  -F "force=false"

# 8. MCP Server 下载端点
curl -s http://localhost:8321/api/v1/mcp-servers/test-mcp/download \
  -o test-mcp-downloaded.tar.gz
```

### 4.3 端到端验证

```bash
# 9. 上传一个测试 Skill 包
# 先创建测试 Skill 包
mkdir -p test-skill
cat > test-skill/skill.json << 'EOF'
{
  "schema_version": "1.0.0",
  "identity": {
    "name": "test-skill",
    "version": "1.0.0",
    "display_name": "Test Skill",
    "description": "A test skill for deployment verification"
  },
  "content": {
    "format": "markdown",
    "source": "inline",
    "content": "# Test Skill\n\nThis is a test skill."
  },
  "capabilities": ["test"]
}
EOF
tar czf test-skill.tar.gz test-skill/

# 上传
curl -X POST http://localhost:8321/api/v1/skills/upload \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@./test-skill.tar.gz"

# 10. 验证 Skill 详情包含 content 字段
curl -s http://localhost:8321/api/v1/skills/test-skill | python -m json.tool
```

---

## 五、Nginx 反向代理配置（生产环境）

```nginx
server {
    listen 80;
    server_name market.aitboy.cn;

    location / {
        proxy_pass http://127.0.0.1:8321;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 上传文件大小限制
        client_max_body_size 50M;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

---

## 六、常见问题

### Q1: 数据库迁移失败怎么办？

A: 如果 `ALTER TABLE` 失败（例如列已存在），可以：
1. 检查错误信息：`sqlite3 data/market/market.db ".schema skills"`
2. 如果列已存在，跳过该列的 ALTER
3. 如果表结构混乱，使用方案 2（重建数据库）

### Q2: 新端点返回 404？

A: 确认：
1. 服务已重启（代码变更需要重启）
2. 访问的是正确的 URL（注意 `/api/v1/` 前缀）
3. 查看日志：`docker logs agent-market` 或 `journalctl -u agent-market`

### Q3: 上传 Skill 包返回 400？

A: 检查：
1. 包格式是否为 tar.gz 或 zip
2. 包内是否包含 skill.json
3. skill.json 是否包含 identity.name 和 identity.version
4. 查看详细错误信息：`curl -v ...`

### Q4: 如何回滚？

A: 如果部署失败，可以：
```bash
# Docker 方式
docker stop agent-market
docker rm agent-market
docker run -d --name agent-market -p 8321:8321 -v /data/agent-market:/app/data agent-market:v1.0

# 或直接恢复数据库
cp data/market/market.db.bak.20260623 data/market/market.db
```

---

## 七、部署后检查清单

- [ ] 服务启动无报错
- [ ] `/api/v1/health` 返回 `{"status":"ok"}`
- [ ] `/api/v1/agents` 返回现有 Agent 列表
- [ ] `/api/v1/skills` 返回现有 Skill 列表
- [ ] `/api/v1/mcp-servers` 返回现有 MCP Server 列表
- [ ] `POST /api/v1/skills/upload` 可上传 Skill 包
- [ ] `GET /api/v1/skills/{id}/download` 可下载 Skill 包
- [ ] `POST /api/v1/mcp-servers/upload` 可上传 MCP Server 包
- [ ] `GET /api/v1/mcp-servers/{id}/download` 可下载 MCP Server 包
- [ ] 数据库包含新字段（package_path, content 等）
- [ ] Nginx 配置正确（如果使用）
- [ ] 防火墙/安全组允许 8321 端口（或 80/443）

---

**部署完成后，请确认上述检查清单全部通过，然后通知开发团队进行客户端（agent-deploy/agent-compose）的配套更新。**
