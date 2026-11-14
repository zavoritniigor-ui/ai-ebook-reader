"""The vendored libraries' versions are declared for the Security Gate (no browser needed; listed with the browser suites
so CI runs it — tests/ci_browser_suites.txt).

vendor/ holds third-party code copied in by hand (no package manager), so Trivy and OSV-Scanner in the Security Gate
had no lockfile to read and checked none of it for known vulnerabilities. vendor/package-lock.json now declares each
library and version; the gate scans it on every PR. This test keeps it honest: every versioned file or folder in
vendor/ must be declared with the same version, and every declared library must exist in vendor/. (Bergamot is
Mozilla's engine taken from Firefox's source, not an npm package; no advisory database covers it.) Added 2026-11-14.
"""
import json, re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
lock = json.loads((root / 'vendor/package-lock.json').read_text())
declared = {k[len('node_modules/'):]: v['version'] for k, v in lock['packages'].items() if k.startswith('node_modules/')}
assert lock['packages']['']['dependencies'] == declared, 'the root dependencies and the package entries differ'
# vendor file/folder name prefix -> npm package(s) it is
NAMES = {'jszip': ['jszip'], 'mammoth': ['mammoth'], 'marked': ['marked'], 'pdf': ['pdfjs-dist'], 'pdfjs': ['pdfjs-dist'],
         'tesseract': ['tesseract.js', 'tesseract.js-core'], 'mediapipe-genai': ['@mediapipe/tasks-genai']}
seen = set()
for entry in sorted((root / 'vendor').iterdir()):
    m = re.match(r'^([a-z-]+?)-(\d+\.\d+(?:\.\d+)?)(?:\.|$)', entry.name)
    if not m or m.group(1) == 'bergamot':
        continue
    prefix, version = m.groups()
    assert prefix in NAMES, f'vendor/{entry.name}: an unknown library — declare it in vendor/package-lock.json and here'
    for pkg in NAMES[prefix]:
        assert declared.get(pkg) == version, f'vendor/{entry.name} is {version}, vendor/package-lock.json says {pkg} {declared.get(pkg)}'
        seen.add(pkg)
assert seen == set(declared), 'declared but not in vendor/: ' + ', '.join(sorted(set(declared) - seen))
print(f'PASS vendor/package-lock.json declares exactly the {len(declared)} vendored npm libraries at their vendored versions', flush=True)
print('ALL VENDOR LOCK CHECKS PASSED')
