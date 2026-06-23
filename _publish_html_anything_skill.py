#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""打包并发布 HTML Anything Skill 到 market.aitboy.cn

用法:
    python _publish_html_anything_skill.py

环境变量:
    MARKET_API_KEY: 市场 API Key（Bearer token）
"""
import json
import os
import sys
import tarfile
import io
from pathlib import Path

import requests

HERE = Path(__file__).parent
SKILL_DIR = HERE / "publish" / "html-anything-skill"
SKILL_FILE = SKILL_DIR / "SKILL.md"
MARKET_URL = "https://market.aitboy.cn"


def build_tarball() -> Path:
    """将 SKILL.md 打包成 tar.gz"""
    tarball_path = SKILL_DIR / "html-anything-skill-v1.0.0.tar.gz"

    inner_dir_name = "html-anything-skill-v1.0.0"
    skill_bytes = SKILL_FILE.read_bytes()

    with tarfile.open(tarball_path, "w:gz") as tar:
        # 1) 顶层 SKILL.md
        info1 = tarfile.TarInfo(name="SKILL.md")
        info1.size = len(skill_bytes)
        info1.mode = 0o644
        tar.addfile(info1, io.BytesIO(skill_bytes))

        # 2) 子目录版本 + SKILL.md
        info2 = tarfile.TarInfo(name=inner_dir_name)
        info2.type = tarfile.DIRTYPE
        info2.mode = 0o755
        tar.addfile(info2)

        info3 = tarfile.TarInfo(name=f"{inner_dir_name}/SKILL.md")
        info3.size = len(skill_bytes)
        info3.mode = 0o644
        tar.addfile(info3, io.BytesIO(skill_bytes))

    print(f"  ✓ 打包完成: {tarball_path} ({tarball_path.stat().st_size} bytes)")
    with tarfile.open(tarball_path, "r:gz") as tar:
        names = tar.getnames()
        print(f"    包内容: {names}")
    return tarball_path


def publish(tarball: Path, api_key: str = "", force: bool = True) -> dict:
    """上传到 market.aitboy.cn /api/v1/skills"""
    url = f"{MARKET_URL}/api/v1/skills"

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
    print("📦 打包 & 发布 HTML Anything Skill 到市场")
    print("=" * 60)

    # 1. 读取并验证 SKILL.md
    content = SKILL_FILE.read_text(encoding="utf-8")
    print(f"\n[1/3] 读取 Skill: html-anything")
    print(f"    文件: {SKILL_FILE}")
    print(f"    大小: {len(content)} 字符")

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
        print("\n✅ Skill 发布成功！")
    else:
        print("\n⚠️ 发布过程结束（可能由于缺少 API key 或版本冲突）")


if __name__ == "__main__":
    main()
