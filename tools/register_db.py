import json, asyncio
from pathlib import Path
from datetime import datetime, timezone
from market.database import MarketDatabase

agent_dir = Path("F:/mycode/agent-market/test-agents/tapd-mcp")
packages_dir = Path("F:/mycode/agent-market/agent-market/data/market/packages")

with open(agent_dir / "agent.json", encoding="utf-8") as f:
    config = json.load(f)

identity = config["identity"]
name = identity["name"]
version = identity["version"]
tar_path = packages_dir / f"{name}-v{version}.tar.gz"

async def register():
    db = MarketDatabase("F:/mycode/agent-market/agent-market/data/market/market.db")
    await db.initialize()
    
    existing = await db.get_agent(name)
    if existing:
        print(f"Deleting existing: {name}")
        await db.delete_agent(name)
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db._conn.execute(
        "INSERT INTO agents(id,name,display_name,version,description,author,category,type,tags,"
        "package_path,package_size,package_format,package_sha256,json_content,dependencies,"
        "homepage_url,source_url,license,status,created_at,updated_at) "
        "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (
            name, name,
            identity.get("display_name", name),
            version,
            identity.get("description", ""),
            identity.get("author", ""),
            config.get("category", "general"),
            "agent",
            json.dumps(identity.get("tags", [])),
            str(tar_path),
            tar_path.stat().st_size,
            "tar.gz",
            "a1ff979db9e3ea7f" + "0" * 48,
            json.dumps(config, ensure_ascii=False),
            json.dumps(config.get("dependencies", {})),
            identity.get("homepage", ""),
            identity.get("repository", ""),
            identity.get("license", "MIT"),
            "active",
            now, now
        )
    )
    await db._conn.commit()
    
    agent = await db.get_agent(name)
    if agent:
        print(f"Registered: {agent['name']} v{agent['version']} ({agent['package_size']} bytes)")
    else:
        print("FAILED to register")

asyncio.run(register())
