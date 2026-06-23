import tarfile, json, hashlib, asyncio, os
from pathlib import Path
from datetime import datetime

agent_dir = Path('F:/mycode/agent-market/test-agents/tapd-mcp')
packages_dir = Path('F:/mycode/agent-market/agent-market/data/market/packages')
packages_dir.mkdir(parents=True, exist_ok=True)

with open(agent_dir / 'agent.json', encoding='utf-8') as f:
    config = json.load(f)

identity = config['identity']
name = identity['name']
version = identity['version']

tar_path = packages_dir / f'{name}-v{version}.tar.gz'
with tarfile.open(str(tar_path), 'w:gz') as tar:
    for f in sorted(agent_dir.rglob('*')):
        if f.is_file():
            rel = f.relative_to(agent_dir)
            arcname = str(rel).replace(os.sep, '/')
            tar.add(str(f), arcname=arcname)

sha256 = hashlib.sha256()
with open(str(tar_path), 'rb') as ff:
    while True:
        chunk = ff.read(8192)
        if not chunk:
            break
        sha256.update(chunk)

print(f'Package: {tar_path.stat().st_size} bytes, SHA256: {sha256.hexdigest()[:16]}')
print('Package created successfully')
