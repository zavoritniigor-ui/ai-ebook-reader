"""Update content-versioned classic script URLs and the matching offline shell."""
import hashlib
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
html_path, sw_path = root / 'index.html', root / 'sw.js'
html, sw = html_path.read_text(), sw_path.read_text()
for path in sorted((root / 'js').glob('*.js')):
    name = path.relative_to(root).as_posix()
    version = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
    html = re.sub(re.escape(name) + r'(?:\?v=[a-f0-9]+)?(?=")', name + '?v=' + version, html)
    sw = re.sub(re.escape(name) + r"(?:\?v=[a-f0-9]+)?(?=')", name + '?v=' + version, sw)
shell_version = hashlib.sha256(html.encode()).hexdigest()[:12]
sw = re.sub(r"const CACHE_NAME = '[^']+';", "const CACHE_NAME = 'ai-reader-shell-" + shell_version + "';", sw)
html_path.write_text(html)
sw_path.write_text(sw)
