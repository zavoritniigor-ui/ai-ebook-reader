"""Module graph guard (no browser needed; listed with the browser suites so CI runs it — tests/ci_browser_suites.txt).

All js/*.js share one global scope (ARCHITECTURE.md). tools/module_graph.mjs parses every script of index.html with acorn
and fails when a top-level name is declared by two files, or when a top-level statement uses a name from a file that
loads later (a ReferenceError on page load), or when the foundation (js/core*.js) uses a name of a feature file. Added 2026-11-14 with the split of core.js, grammar-svo.js and selection.js.
"""
import subprocess, sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
result = subprocess.run(['node', str(root / 'tools/module_graph.mjs')], capture_output=True, text=True)
print(result.stdout.strip() or result.stderr.strip(), flush=True)
assert result.returncode == 0, result.stderr
# The guard really fails on both problems: a scratch tree whose a.js calls b() at top level (b.js loads later) and
# declares `dup`, which c.js declares again.
import tempfile
with tempfile.TemporaryDirectory() as tmp:
    t = Path(tmp); (t / 'js').mkdir()
    (t / 'index.html').write_text('<script src="js/a.js?v=1"></script><script src="js/b.js?v=1"></script><script src="js/c.js?v=1"></script>')
    (t / 'js/a.js').write_text('b();\nfunction later() { b(); }\nfunction dup() {}\n')
    (t / 'js/b.js').write_text('function b() {}\n')
    (t / 'js/c.js').write_text('const dup = 1;\n')
    bad = subprocess.run(['node', str(root / 'tools/module_graph.mjs'), '--root', str(t)], capture_output=True, text=True)
    assert bad.returncode == 1 and 'top-level use of «b» from js/b.js' in bad.stderr and '«dup» is declared at top level in js/a.js and js/c.js' in bad.stderr \
        and 'later' not in bad.stderr.replace('loads later', ''), bad.stderr
print('PASS the guard fails on a top-level forward reference and on a name declared twice (and not on a call inside a function)', flush=True)
# ...and on the foundation calling a feature, even from inside a function; a feature calling the foundation is fine.
with tempfile.TemporaryDirectory() as tmp:
    t = Path(tmp); (t / 'js').mkdir()
    (t / 'index.html').write_text('<script src="js/core.js?v=1"></script><script src="js/core-i18n.js?v=1"></script><script src="js/feature.js?v=1"></script>')
    (t / 'js/core.js').write_text('function base() {}\n')
    (t / 'js/core-i18n.js').write_text('function applyI18n() { base(); refreshFeature(); }\n')
    (t / 'js/feature.js').write_text('function refreshFeature() { base(); applyI18n(); }\n')
    bad = subprocess.run(['node', str(root / 'tools/module_graph.mjs'), '--root', str(t)], capture_output=True, text=True)
    assert bad.returncode == 1 and bad.stderr.strip() == 'FAIL js/core-i18n.js: the foundation uses «refreshFeature» from the feature file js/feature.js', bad.stderr
print('PASS the guard fails when the foundation calls a feature (and not when a feature calls the foundation)', flush=True)
print('ALL MODULE GRAPH CHECKS PASSED')
