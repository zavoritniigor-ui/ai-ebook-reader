"""Prevent browser regression suites from existing without a CI invocation."""
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
workflow = (root / '.github/workflows/ci.yml').read_text()
invoked = set(re.findall(r'^\s+python3\s+(?:-u\s+)?(tests/[\w_]+\.py)\s*$', workflow, re.M))
suites = {p.relative_to(root).as_posix() for p in (root / 'tests').glob('*_browser.py')}
assert not suites - invoked, 'Browser suites missing from CI: ' + ', '.join(sorted(suites - invoked))
assert all((root / p).is_file() for p in invoked), 'CI invokes a missing test file'
print(f'PASS all {len(suites)} browser suites are explicitly invoked by GitHub Actions')
