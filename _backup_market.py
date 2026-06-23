#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""备份云端市场所有 Agent/Skill/MCP Server 包到本地

用法:
    python _backup_market.py

环境变量:
    MARKET_API_KEY: 市场 API Key（可选，公开资源无需认证）
"""
import json
import os
import sys
from pathlib import Path
from datetime import datetime

import requests

MARKET_URL = "https://market.aitboy.cn"
BACKUP_DIR = Path(__file__).parent / "market-backup"
API_KEY = os.environ.get("MARKET_API_KEY", "")


def ensure_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)
    return path


def fetch_list(endpoint: str) -> list:
    """获取列表，处理分页"""
    all_items = []
    page = 1
    while True:
        url = f"{MARKET_URL}/api/v1/{endpoint}?page={page}&page_size=100"
        headers = {}
        if API_KEY:
            headers["Authorization"] = f"Bearer {API_KEY}"
        try:
            resp = requests.get(url, headers=headers, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            # 尝试多种可能的 key 名
            for key in ["items", endpoint.replace("-", "_"), endpoint]:
                items = data.get(key, [])
                if items:
                    break
            if not items:
                break
            all_items.extend(items)
            if len(items) < data.get("page_size", 20):
                break
            page += 1
        except Exception as e:
            print(f"  ✗ 获取 {endpoint} 第 {page} 页失败: {e}")
            break
    return all_items


def download_package(item_id: str, item_type: str, output_dir: Path) -> bool:
    """下载单个包"""
    url = f"{MARKET_URL}/api/v1/{item_type}/{item_id}/download"
    headers = {}
    if API_KEY:
        headers["Authorization"] = f"Bearer {API_KEY}"

    try:
        resp = requests.get(url, headers=headers, timeout=60, stream=True)
        if resp.status_code == 404:
            print(f"    ⚠️ {item_id} 无下载包（可能只有元数据）")
            return False
        resp.raise_for_status()

        # 确定文件名
        content_disp = resp.headers.get("Content-Disposition", "")
        if "filename=" in content_disp:
            filename = content_disp.split("filename=")[-1].strip('"')
        else:
            filename = f"{item_id}.tar.gz"

        output_path = output_dir / filename
        with open(output_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)

        size = output_path.stat().st_size
        print(f"    ✓ {filename} ({size} bytes)")
        return True
    except Exception as e:
        print(f"    ✗ 下载失败: {e}")
        return False


def save_metadata(items: list, output_dir: Path, name: str):
    """保存元数据 JSON"""
    meta_path = output_dir / f"_{name}_metadata.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    print(f"  ✓ 元数据保存: {meta_path} ({len(items)} 条)")


def backup_agents():
    print("\n" + "=" * 60)
    print("📦 备份 Agents")
    print("=" * 60)

    agents = fetch_list("agents")
    if not agents:
        print("  ⚠️ 无 Agent 数据")
        return

    agents_dir = ensure_dir(BACKUP_DIR / "agents")
    save_metadata(agents, agents_dir, "agents")

    success = 0
    for agent in agents:
        agent_id = agent["id"]
        print(f"  → {agent_id} ({agent.get('display_name', '')})")
        if download_package(agent_id, "agents", agents_dir):
            success += 1

    print(f"\n  完成: {success}/{len(agents)} 个 Agent 包下载成功")


def backup_skills():
    print("\n" + "=" * 60)
    print("🔧 备份 Skills")
    print("=" * 60)

    skills = fetch_list("skills")
    if not skills:
        print("  ⚠️ 无 Skill 数据")
        return

    skills_dir = ensure_dir(BACKUP_DIR / "skills")
    save_metadata(skills, skills_dir, "skills")

    # Skills 目前无独立下载端点，只保存元数据
    print(f"  ⚠️ Skills 暂无独立下载端点，仅保存元数据 ({len(skills)} 条)")
    print(f"  提示: Skill 内容包含在 Agent 包中，可通过 Agent 下载获取")


def backup_mcp_servers():
    print("\n" + "=" * 60)
    print("🔌 备份 MCP Servers")
    print("=" * 60)

    servers = fetch_list("mcp-servers")
    if not servers:
        print("  ⚠️ 无 MCP Server 数据")
        return

    mcp_dir = ensure_dir(BACKUP_DIR / "mcp-servers")
    save_metadata(servers, mcp_dir, "mcp_servers")

    # MCP Servers 目前无独立下载端点，只保存元数据
    print(f"  ⚠️ MCP Servers 暂无独立下载端点，仅保存元数据 ({len(servers)} 条)")
    print(f"  提示: MCP 配置包含在 Agent 包中，可通过 Agent 下载获取")


def create_index():
    """创建备份索引文件"""
    index = {
        "backup_time": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "market_url": MARKET_URL,
        "api_key_used": bool(API_KEY),
        "contents": {
            "agents": {
                "description": "Agent 包（tar.gz 格式）",
                "path": "agents/",
                "metadata": "agents/_agents_metadata.json"
            },
            "skills": {
                "description": "Skill 元数据（JSON 格式，内容在 Agent 包中）",
                "path": "skills/",
                "metadata": "skills/_skills_metadata.json"
            },
            "mcp_servers": {
                "description": "MCP Server 元数据（JSON 格式，配置在 Agent 包中）",
                "path": "mcp-servers/",
                "metadata": "mcp-servers/_mcp_servers_metadata.json"
            }
        },
        "restore_guide": {
            "agent_restore": "将 agents/*.tar.gz 上传到市场: agent-deploy upload <file>",
            "skill_restore": "Skills 随 Agent 包一起恢复",
            "mcp_restore": "MCP Servers 随 Agent 包一起恢复"
        }
    }

    index_path = BACKUP_DIR / "_index.json"
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    print(f"\n✓ 备份索引: {index_path}")


def main():
    print("=" * 60)
    print("☁️  云端市场备份工具")
    print(f"   市场地址: {MARKET_URL}")
    print(f"   备份目录: {BACKUP_DIR}")
    print(f"   API Key: {'已设置' if API_KEY else '未设置（公开资源）'}")
    print("=" * 60)

    ensure_dir(BACKUP_DIR)

    backup_agents()
    backup_skills()
    backup_mcp_servers()
    create_index()

    print("\n" + "=" * 60)
    print("✅ 备份完成")
    print(f"   备份目录: {BACKUP_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    main()
