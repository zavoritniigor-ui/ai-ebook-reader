"""Which browser suites one CI shard runs.

    python3 tests/ci_browser_shard.py <shard> <total>   # prints the suites of shard <shard> (1-based) of <total>, one per line
    python3 tests/ci_browser_shard.py --all              # every suite, in list order

The suites are listed in tests/ci_browser_suites.txt. When tests/ci_suite_seconds.json has measured durations
({"tests/x_browser.py": seconds, ...}, taken from the «SUITE … s» lines that tests/ci_run_browser.sh prints), the
suites are spread so that every shard takes about as long (longest first, each to the shard with the least time so
far); a suite without a measurement counts as the median. Without the file they are dealt out in turn. Inside a
shard the suites keep their list order, so a shard runs them in the same order as the old single job did.
"""
import json, statistics, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def suites():
    lines = (ROOT / 'tests/ci_browser_suites.txt').read_text().splitlines()
    return [l.strip() for l in lines if l.strip() and not l.lstrip().startswith('#')]


def shards(total):
    names = suites()
    seconds_file = ROOT / 'tests/ci_suite_seconds.json'
    if not seconds_file.exists():
        return [[n for i, n in enumerate(names) if i % total == k] for k in range(total)]
    measured = json.loads(seconds_file.read_text())
    fallback = statistics.median(measured.values()) if measured else 10
    cost = {n: float(measured.get(n, fallback)) for n in names}
    load, chosen = [0.0] * total, [set() for _ in range(total)]
    for n in sorted(names, key=lambda n: -cost[n]):
        k = load.index(min(load))
        load[k] += cost[n]; chosen[k].add(n)
    return [[n for n in names if n in chosen[k]] for k in range(total)]


if __name__ == '__main__':
    if sys.argv[1:] == ['--all']:
        print('\n'.join(suites()))
    else:
        shard, total = int(sys.argv[1]), int(sys.argv[2])
        assert 1 <= shard <= total, 'shard must be 1..total'
        print('\n'.join(shards(total)[shard - 1]))
