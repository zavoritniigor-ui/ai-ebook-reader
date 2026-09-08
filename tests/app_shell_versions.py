"""Require matching content versions in HTML and the offline shell."""
import hashlib
import re
from pathlib import Path
root = Path(__file__).resolve().parents[1]
html, sw = (root/'index.html').read_text(), (root/'sw.js').read_text()
scripts = re.findall(r'<script src="(js/[^"?]+)(\?v=[a-f0-9]+)?"', html)
assert scripts and len({p for p, _ in scripts}) == len(scripts)
for name, version in scripts:
    expected = '?v=' + hashlib.sha256((root/name).read_bytes()).hexdigest()[:12]
    assert version == expected, f'{name}: run python3 tools/version_app_shell.py'
    assert "'./" + name + version + "'" in sw, name
assert 'ai-reader-shell-' + hashlib.sha256(html.encode()).hexdigest()[:12] in sw, 'Run python3 tools/version_app_shell.py after HTML changes'
print('PASS HTML / offline shell content versions')
