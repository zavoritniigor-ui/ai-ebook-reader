"""Prevent browser regression suites from existing without a CI invocation.

Since 2026-11-14 CI runs the suites listed in tests/ci_browser_suites.txt (in parallel shards, tests/ci_run_browser.sh);
every tests/*_browser.py must be listed there exactly once, every listed file must exist, and the shards together
must run each suite exactly once.
"""
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / 'tests'))
from ci_browser_shard import shards, suites  # noqa: E402

listed = suites()
on_disk = {p.relative_to(root).as_posix() for p in (root / 'tests').glob('*_browser.py')}
assert len(listed) == len(set(listed)), 'A suite is listed twice in tests/ci_browser_suites.txt'
assert not on_disk - set(listed), 'Browser suites missing from tests/ci_browser_suites.txt: ' + ', '.join(sorted(on_disk - set(listed)))
assert all((root / p).is_file() for p in listed), 'tests/ci_browser_suites.txt lists a missing file'
workflow = (root / '.github/workflows/ci.yml').read_text()
assert 'tests/ci_run_browser.sh' in workflow, 'CI no longer runs tests/ci_run_browser.sh'
for total in (1, 6):
    dealt = [s for shard in shards(total) for s in shard]
    assert sorted(dealt) == sorted(listed), f'{total} shards do not run every suite exactly once'
print(f'PASS all {len(on_disk)} browser suites are listed for GitHub Actions and every shard set runs each once')
