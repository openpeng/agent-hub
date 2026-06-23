import os
import sys

# Monkey-patch os.scandir to ignore missing directories (broken symlinks)
_orig_scandir = os.scandir

def safe_scandir(*args, **kwargs):
    try:
        return _orig_scandir(*args, **kwargs)
    except FileNotFoundError:
        return iter([])

os.scandir = safe_scandir

import pytest

args = sys.argv[1:] if len(sys.argv) > 1 else ["tests/e2e", "-v", "--tb=short"]
sys.exit(pytest.main(args))
