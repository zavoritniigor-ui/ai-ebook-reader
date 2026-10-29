"""The offline French -> Ukrainian dictionary with the REAL Bergamot engine and the REAL Mozilla models (fr>en, en>uk; downloaded
once, SHA-256 checked, cached like tests/offline_translation_browser.py) and the REAL generated dictionary (dict/fr-uk.json,
dict/uk-forms.json). The direction is installed from the app's own code; then every sentence of dict/review_sentences.tsv is
translated by the engine alone ("before") and with the dictionary ("after"), and its tapped word likewise. The results are printed
as REVIEW lines (they fill the before/after table of dict/REVIEW_SAMPLE.md). Checked: the dictionary is installed with the pack and
its files are the pinned ones, every result is plain text (no leaked markup), a sentence the dictionary changed reads differently and
the dictionary changes at least one, the tapped word's popup lists the dictionary's meanings for most words, nothing is cached, no
CSP violation. Then the 100 unusual sentences of dict/test_sentences_hard.tsv likewise (HARD lines; a word marked #2 is tapped at its
first occurrence, as the app finds it): all translated as plain text, and the dictionary never doubles a word or cuts a sentence to
less than half. Needs the network once (Mozilla's model storage)."""
import hashlib, http.server, json, os, re, socketserver, tempfile, threading, time, urllib.request
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from browser_cdp import CDP

ROOT = Path(__file__).resolve().parents[1]
SENTENCES = [l.split('\t') for l in (ROOT / 'dict/review_sentences.tsv').read_text(encoding='utf-8').splitlines() if l.strip() and not l.startswith('#')]
HARD = [l.split('\t')[:2] for l in (ROOT / 'dict/test_sentences_hard.tsv').read_text(encoding='utf-8').splitlines() if l.strip() and not l.startswith('#')]
CDN = 'https://firefox-settings-attachments.cdn.mozilla.net/'
CACHE = Path(os.environ.get('READER_OFFLINE_MODEL_CACHE') or Path(tempfile.gettempdir()) / 'ai-reader-offline-test-models')
CACHE.mkdir(parents=True, exist_ok=True)
FILES = {m.group(1): (m.group(2), int(m.group(3))) for m in re.finditer(
    r'"path": "([^"]+)", "sha256": "([0-9a-f]{64})", "size": (\d+)', (ROOT / 'js/offline-catalog.js').read_text())}
CSP = next(line.split(':', 1)[1].strip() for line in (ROOT / '_headers').read_text().splitlines() if line.strip().startswith('Content-Security-Policy:'))
LOG = []   # every model or dictionary file the page asked for


def model_bytes(path):
    """A model file of the pinned catalog: from the cache of the offline-translation tests, else from Mozilla (checked)."""
    sha, size = FILES[path]
    cached = CACHE / sha
    if not cached.is_file() or cached.stat().st_size != size:
        for attempt in range(4):
            try:
                data = urllib.request.urlopen(urllib.request.Request(CDN + path, headers={'user-agent': 'ai-ebook-reader-test'}), timeout=120).read()
                break
            except Exception:
                if attempt == 3: raise
                time.sleep(2 * (attempt + 1))
        assert hashlib.sha256(data).hexdigest() == sha and len(data) == size, 'Mozilla served a file that does not match the pinned catalog: ' + path
        cached.write_bytes(data)
    return cached.read_bytes()


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def end_headers(self):
        self.send_header('Content-Security-Policy', CSP)
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *args):
        pass
    def do_GET(self):
        url = urlparse(self.path)
        if url.path == '/api/offline-model':
            path = parse_qs(url.query).get('f', [''])[0]
            LOG.append(path)
            if path not in FILES: return self.send_error(400)
            data = model_bytes(path)
            self.send_response(200); self.send_header('Content-Type', 'application/octet-stream'); self.send_header('Content-Length', str(len(data))); self.end_headers()
            return self.wfile.write(data)
        if url.path.startswith('/dict/'): LOG.append(url.path[1:])
        return super().do_GET()


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True


server = Server(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{server.server_address[1]}'
c = CDP(); c.sock.settimeout(600)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.addScriptToEvaluateOnNewDocument', source='''
window.__errors = []; addEventListener('error', e => __errors.push(String(e.message)));
addEventListener('unhandledrejection', e => __errors.push(String(e.reason && e.reason.message || e.reason)));
window.__csp = []; document.addEventListener('securitypolicyviolation', e => __csp.push(e.violatedDirective + ' ' + e.blockedURI));
try { delete self.Translator; } catch (e) {}
''')
js = c.js
READY = "document.readyState==='complete' && !document.body.inert && typeof offlineTranslateSentence==='function'"


def check(name, expression):
    result = js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def ok(name, condition, detail=''):
    assert condition, (name, detail)
    print('PASS', name, flush=True)


try:
    c.call('Page.navigate', url=BASE + '/index.html')
    c.wait(READY, timeout=60)
    js("state.targetLang = 'uk'; translateLocally = async () => null; deviceLlmTranslate = async () => null; 1")
    js("offlineTrInstall('fr', 'uk').then(() => { window.__installed = true; }, e => { window.__installed = String(e && e.offlineTr || e); }); 1")
    c.wait("window.__installed !== undefined", timeout=600)
    check('1 the fr -> uk pack installs with its dictionary (both files pinned by the catalog)',
          "window.__installed === true && offlineTrPack.dicts['fr>uk'] && OFFLINE_DICTS['fr>uk'].files.every(f => offlineTrPack.dicts['fr>uk'].versions[f.type] === f.version)")
    ok('2 the dictionary files came from the site, the model files through the model proxy', any(p.startswith('dict/') for p in LOG) and sum(1 for p in LOG if p.startswith('main-workspace/')) == 6, LOG)
    def run(sentence, word):
        name, _, nth = word.partition('#')
        return js(f"""(async () => {{
            const s = {json.dumps(sentence)}, w = {json.dumps(name)};
            const before = await offlineTranslate(s, 'fr', 'uk');
            const after = await offlineTranslateSentence(s, 'fr', 'uk');
            const sentenceDid = offlineDictLast;
            // the word the way the app showed it before the dictionary (offlineTranslateWord without offlineDictWord)
            const alone = await offlineTranslate(w, 'fr', 'uk'), marked = offlineTrMarked(w, s);
            const picked = marked ? offlineTrPicked(await offlineTranslate(marked, 'fr', 'uk', null, true), w) : null;
            const word = await offlineTranslateWord(w, s, 'fr', 'uk');
            return {{ sentence: s, word: w, before, after, changed: sentenceDid && sentenceDid.changed, wordBefore: picked || alone,
                wordAfter: word && word.text, note: word && word.note || '', senses: word && word.senses || [] }};
        }})()""")
    rows = []
    for sentence, word in SENTENCES:
        r = run(sentence, word)
        print('REVIEW ' + json.dumps(r, ensure_ascii=False), flush=True)
        rows.append(r)
    ok('3 every sentence and word is translated, as plain text', all(r['before'] and r['after'] and r['wordAfter'] and not any(ch in r['after'] + r['wordAfter'] for ch in '<>') for r in rows), rows)
    ok('4 a sentence the dictionary changed reads differently from the engine\'s, and at least one sentence was changed', all(r['after'] != r['before'] for r in rows if r['changed']) and any(r['changed'] for r in rows), rows)
    ok('5 the tapped word lists the dictionary\'s meanings for most words', sum(1 for r in rows if r['senses'] or r['note']) >= len(rows) // 2, rows)
    # the 100 unusual sentences of tests/offline_dict_hard_browser.py, with the engine
    hard = []
    for sentence, word in HARD:
        r = run(sentence, word)
        print('HARD ' + json.dumps(r, ensure_ascii=False), flush=True)
        hard.append(r)
    ok('5b the 100 unusual sentences: every sentence and word translated, as plain text', all(r['before'] and r['after'] and r['wordAfter'] and not any(ch in r['after'] + r['wordAfter'] for ch in '<>') for r in hard), hard)
    doubled = lambda t: re.search(r'(?<!\w)(\w+) \1(?!\w)', t.lower())
    ok('5c ... the dictionary never doubles a word and never cuts a sentence to less than half its words',
       all((doubled(r['after']) is None or doubled(r['before']) is not None) and len(r['after'].split()) * 2 >= len(r['before'].split()) for r in hard),
       [r for r in hard if not ((doubled(r['after']) is None or doubled(r['before']) is not None) and len(r['after'].split()) * 2 >= len(r['before'].split()))])
    neg = lambda t: len(re.findall(r'(?<!\w)(не|ні|ніколи|нічого|ніхто|немає)(?!\w)', t.lower()))
    ok('5d ... and never drops a negation of the engine\'s translation', all(neg(r['after']) >= neg(r['before']) for r in rows + hard),
       [r for r in rows + hard if neg(r['after']) < neg(r['before'])])
    check('6 nothing of the pack was cached as a translation', "Object.keys(state.translationCache).length === 0")
    check('7 no CSP violation, nothing threw', "__errors.length === 0 && __csp.length === 0 ? true : JSON.stringify({csp: __csp, errors: __errors})")
    print('ALL PASS offline_dict_real_browser', flush=True)
finally:
    server.shutdown()
