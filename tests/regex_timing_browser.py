"""Regular expressions that read outside data stay linear (no ReDoS). No browser needed; listed with the browser suites so
CI runs it (tests/ci_browser_suites.txt).

Semgrep's detect-redos flagged five uses (2026-11-14 audit): the Standard Ebooks book id
^[a-z0-9_-]{1,120}(\\/[a-z0-9_-]{1,120}){1,4}$ (functions/api/library.js twice, js/library.js twice) and the reading-stats
word ^[\\p{L}\\p{M}]+(?:['’ʼ-][\\p{L}\\p{M}]+)*$ (js/learning-stats.js). Both are unambiguous — the separator (/ or an
apostrophe/hyphen) is not in the repeated class — so a match is tried one way only. This suite takes each expression
from the source as it is now and times it on 100 000-character worst cases; a future edit that makes one exponential
fails here.
"""
import json, re, subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
WATCH = {
    'se-id': (['functions/api/library.js', 'js/library.js'], r"/\^\[a-z0-9_-\]\{1,120\}\(\\/\[a-z0-9_-\]\{1,120\}\)\{1,4\}\$/[a-z]*"),
    'word': (['js/learning-stats.js'], r"/\^\[\\p\{L\}\\p\{M\}\]\+\(\?:\['’ʼ-\]\[\\p\{L\}\\p\{M\}\]\+\)\*\$/[a-z]*"),
}
found = {}
for name, (files, pattern) in WATCH.items():
    for f in files:
        hits = re.findall(pattern, (root / f).read_text())
        assert hits, f'{name}: the expression is no longer in {f} — update this suite with the new one'
        found.setdefault(name, set()).update(hits)
literals = sorted(lit for lits in found.values() for lit in lits)
script = """
const res = %s.map(s => { const m = s.match(/^\\/(.*)\\/([a-z]*)$/s); return new RegExp(m[1], m[2]); });
const evil = ['a'.repeat(100000) + '!', 'a/'.repeat(50000) + '!', ('a'.repeat(120) + '/').repeat(800) + '!', 'a-'.repeat(50000) + '!',
              ("aaa'").repeat(25000) + '-!', 'é'.repeat(100000) + '1'];
let worst = 0;
for (const re of res) for (const s of evil) { const t = performance.now(); re.test(s); worst = Math.max(worst, performance.now() - t); }
console.log(JSON.stringify({ n: res.length, worst }));
""" % json.dumps(literals)
out = json.loads(subprocess.run(['node', '-e', script], capture_output=True, text=True, check=True).stdout)
assert out['n'] == len(literals) and out['worst'] < 100, out
print('PASS %d flagged expressions stay linear: worst case %.2f ms on 100 000 characters' % (out['n'], out['worst']), flush=True)
print('ALL REGEX TIMING CHECKS PASSED')
