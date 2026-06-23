#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""打包并发布 Agent 到 market.aitboy.cn

用法:
    python _publish_webbridge.py

环境变量:
    MARKET_API_KEY: 市场 API Key（Bearer token）

此脚本专门用于快速打包和发布 kimi-webbridge-operator 到市场。
如需发布其他 Agent，可参考此脚本的逻辑重写 AGENT_DIR 和 AGENT_JSON 变量。
"""
import json
import os
import sys
import tarfile
import tempfile
from pathlib import Path
import shutil

import requests  # pip install requests

HERE = Path(__file__).parent
AGENT_DIR = HERE / "hot-skills-converted" / "kimi-webbridge-operator"
AGENT_JSON = AGENT_DIR / "kimi-webbridge-operator.json"
MARKET_URL = "https://market.aitboy.cn"


def build_tarball() -> Path:
    """将 agent.json 打包成 tar.gz - 格式：顶层同时包含 agent.json 和 {name}-v{version}/agent.json"""
    agent = json.loads(AGENT_JSON.read_text(encoding="utf-8"))
    name = agent["identity"]["name"]
    version = agent["identity"]["version"]
    tarball_path = AGENT_DIR / f"{name}-v{version}.tar.gz"

    inner_dir_name = f"{name}-v{version}"

    # 准备内容字节
    json_bytes = AGENT_JSON.read_bytes()

    with tarfile.open(tarball_path, "w:gz") as tar:
        # 1) 顶层 agent.json
        info1 = tarfile.TarInfo(name="agent.json")
        info1.size = len(json_bytes)
        info1.mode = 0o644
        import io
        tar.addfile(info1, io.BytesIO(json_bytes))

        # 2) 子目录版本 + agent.json
        info2 = tarfile.TarInfo(name=inner_dir_name)
        info2.type = tarfile.DIRTYPE
        info2.mode = 0o755
        tar.addfile(info2)

        info3 = tarfile.TarInfo(name=f"{inner_dir_name}/agent.json")
        info3.size = len(json_bytes)
        info3.mode = 0o644
        tar.addfile(info3, io.BytesIO(json_bytes))

    print(f"  ✓ 打包完成: {tarball_path} ({tarball_path.stat().st_size} bytes)")
    with tarfile.open(tarball_path, "r:gz") as tar:
        names = tar.getnames()
        print(f"    包内容: {names}")
    return tarball_path


def publish(tarball: Path, api_key: str = "", force: bool = True) -> dict:
    """上传到 market.aitboy.cn"""
    import requests
    url = f"{MARKET_URL}/api/v1/agents"

    headers = {}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    files = {"file": (tarball.name, open(tarball, "rb"), "application/gzip")}
    data = {"force": "true" if force else "false"}

    print(f"  → 正在上传到 {url} ...")
    try:
        resp = requests.post(url, files=files, data=data, headers=headers, timeout=120)
        if resp.status_code >= 400:
            print(f"  ✗ HTTP {resp.status_code}: {resp.text[:400]}")
            return {"error": f"HTTP {resp.status_code}", "detail": resp.text}
        return resp.json()
    except Exception as e:
        print(f"  ✗ 上传失败: {e}")
        return {"error": str(e)}


def main():
    print("=" * 60)
    print("📦 打包 & 发布 kimi-webbridge-operator 到市场")
    print("=" * 60)

    # 1. 读取并验证 agent.json
    agent = json.loads(AGENT_JSON.read_text(encoding="utf-8"))
    print(f"\n[1/3] 读取 Agent: {agent['identity']['display_name']}")
    print(f"    ID: {agent['identity']['name']}")
    print(f"    版本: {agent['identity']['version']}")
    print(f"    Capabilities: {len(agent['capabilities'])} 个")
    print(f"    MCP Servers: {len(agent['mcp_servers'])} 个")

    # 2. 打包
    print(f"\n[2/3] 打包...")
    tarball = build_tarball()

    # 3. 上传
    print(f"\n[3/3] 发布到市场 {MARKET_URL} ...")
    api_key = os.environ.get("MARKET_API_KEY", "")
    if api_key:
        print(f"    使用 MARKET_API_KEY (len={len(api_key)})")
    else:
        print(f"    未设置 MARKET_API_KEY，以公开模式尝试")
    result = publish(tarball, api_key=api_key, force=True)
    print(f"\n  结果: {json.dumps(result, ensure_ascii=False, indent=2)}")

    if "id" in result or ("error" not in result and result):
        print("\n✅ 发布成功！")
    else:
        print("\n⚠️ 发布过程结束（可能由于缺少 API key 或版本冲突，但从市场拉取仍可验证现有版本）")


if __name__ == "__main__":
    main()
