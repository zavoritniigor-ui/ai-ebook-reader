"""Offline translation end to end (js/offline-translate.js): a language pack is installed from Settings, then words and sentences are
translated with no network at all by the REAL Bergamot engine and REAL Mozilla models (downloaded once, SHA-256 checked against the
pinned catalog, and kept in $READER_OFFLINE_MODEL_CACHE or the temp dir). The app is served by a small server of this test that adds
the production Content-Security-Policy from _headers and stands in for the Pages Function /api/offline-model (the Function itself is
unit-tested by tests/offline_model_proxy_test.mjs); the service worker is NOT bypassed, so the offline reload is the installed-PWA
path. Chrome's own Translator is removed (Android has none), so the pack is the only on-device translator. Needs the network once,
to fetch the models from Mozilla.

Cases: catalog routes (direct / through English / none); no pack -> nothing translated + a one-time hint; install from the UI with
progress; offline reload + word + sentence + pivot + direct route; the slow-AI preview; remove and the shared-model rule; a download
cut mid-file resumes without re-fetching what is verified; a corrupted file is refused and never installed; cancel; a damaged
store heals; unsupported device; diagnostics; all strings in every language."""
import hashlib, http.server, json, os, re, socket, socketserver, sys, tempfile, threading, time, urllib.request
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from browser_cdp import CDP

ROOT = Path(__file__).resolve().parents[1]
CDN = 'https://firefox-settings-attachments.cdn.mozilla.net/'
CACHE = Path(os.environ.get('READER_OFFLINE_MODEL_CACHE') or Path(tempfile.gettempdir()) / 'ai-reader-offline-test-models')
CACHE.mkdir(parents=True, exist_ok=True)

FILES = {m.group(1): (m.group(2), int(m.group(3))) for m in re.finditer(
    r'"path": "([^"]+)", "sha256": "([0-9a-f]{64})", "size": (\d+)', (ROOT / 'js/offline-catalog.js').read_text())}
CSP = next(line.split(':', 1)[1].strip() for line in (ROOT / '_headers').read_text().splitlines() if line.strip().startswith('Content-Security-Policy:'))
# The Function's own path pattern, so this stand-in refuses what the real one refuses.
PATH_RE = re.compile(re.search(r'const PATH = /(.+)/;', (ROOT / 'functions/api/offline-model.js').read_text()).group(1).replace('\\/', '/'))
HOOK = {'sleep': 0.0, 'corrupt': set(), 'cut': {}}   # faults the test switches on
LOG = []                                              # every model file the page asked for


def model_bytes(path):
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
        if url.path == '/api/offline-model': return self.serve_model(parse_qs(url.query).get('f', [''])[0])
        return super().do_GET()
    def serve_model(self, path):
        LOG.append(path)
        if not PATH_RE.fullmatch(path) or path not in FILES: return self.send_error(400)
        data = model_bytes(path)
        if path in HOOK['corrupt']: data = bytes([data[0] ^ 1]) + data[1:]
        self.send_response(200); self.send_header('Content-Type', 'application/octet-stream'); self.send_header('Content-Length', str(len(data))); self.end_headers()
        try:
            for at in range(0, len(data), 65536):
                if path in HOOK['cut'] and at >= HOOK['cut'][path]:
                    self.connection.shutdown(socket.SHUT_RDWR)   # the connection drops with the file half sent
                    return
                self.wfile.write(data[at:at + 65536])
                if HOOK['sleep']: time.sleep(HOOK['sleep'])
        except (BrokenPipeError, ConnectionResetError):
            pass


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True


server = Server(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{server.server_address[1]}'

c = CDP(); c.sock.settimeout(180)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Page.addScriptToEvaluateOnNewDocument', source='''
window.__errors = []; addEventListener('error', e => __errors.push(String(e.message)));
addEventListener('unhandledrejection', e => __errors.push(String(e.reason && e.reason.message || e.reason)));
window.__csp = []; document.addEventListener('securitypolicyviolation', e => __csp.push(e.violatedDirective + ' ' + e.blockedURI));
try { delete self.Translator; } catch (e) {}   // Android has no built-in translator
''')
READY = "document.readyState==='complete' && !document.body.inert && typeof handleWordOrSelection==='function' && typeof offlineTranslate==='function'"
js = c.js


def network(offline):
    c.call('Network.emulateNetworkConditions', offline=offline, latency=0, downloadThroughput=-1, uploadThroughput=-1)


def check(name, expression):
    result = js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def ok(name, condition, detail=''):
    assert condition, (name, detail)
    print('PASS', name, flush=True)


def tooltip():
    return js("els.ttTranslation.textContent")


def wait_tooltip(predicate_js, timeout=20):
    c.wait(predicate_js, timeout=timeout)
    return tooltip()


def open_settings(source=None):
    """Open the dialog like the reader and let the section catch up with the current target language, then choose the book language."""
    pick = f"; document.getElementById('offline-src').value = '{source}'; document.getElementById('offline-src').dispatchEvent(new Event('change')); await offlineTrRefreshBox()" if source else ''
    js(f"(async () => {{ openKeySettings(); await offlineTrRefreshBox(){pick}; return 1; }})()")


def reload_page():
    c.call('Page.reload')
    c.wait(READY + " && offlineTrPack !== null", timeout=60)   # the stored state is read asynchronously at start
    js("state.targetLang = 'hi'; 1")


DEVANAGARI = "/\\p{Script=Devanagari}/u"
SENTENCE = 'Старий чоловік читає цікаву книгу в саду.'
WORD = 'читає'

try:
    c.call('Page.navigate', url=BASE + '/index.html')
    c.wait(READY, timeout=60)
    c.wait("navigator.serviceWorker.controller !== null", timeout=60)   # the shell is precached and the worker controls this page
    js("state.targetLang = 'hi'; 1")

    # ---- 0. the pinned catalog: routes -------------------------------------------------------------------------------------------
    route = lambda a, b: json.dumps(js(f"offlineTrRoute('{a}', '{b}')"))
    ok('0a a direct model is used when Mozilla has one', route('en', 'uk') == '["en>uk"]' and route('uk', 'en') == '["uk>en"]', route('en', 'uk'))
    ok('0b otherwise the route goes through English (the French book -> Ukrainian case)', route('fr', 'uk') == '["fr>en", "en>uk"]' and route('uk', 'fr') == '["uk>en", "en>fr"]')
    ok('0c the app\'s "zh" is Mozilla\'s "zh-Hans"', route('zh', 'uk') == '["zh-Hans>en", "en>uk"]')
    ok('0d no model: Irish both ways, the same language, an unknown one', route('ga', 'uk') == 'null' and route('uk', 'ga') == 'null' and route('uk', 'uk') == 'null' and route('xx', 'uk') == 'null')
    check('0e every model is complete and pinned (model + shortlist + vocabulary, size, SHA-256) and comes from Mozilla\'s model storage',
          "Object.values(OFFLINE_CATALOG.models).length >= 20 && Object.values(OFFLINE_CATALOG.models).every(m => { const types = m.files.map(f => f.type); "
          "return types.includes('model') && types.includes('lex') && (types.includes('vocab') || (types.includes('srcvocab') && types.includes('trgvocab'))) "
          "&& m.files.every(f => f.size > 0 && /^[0-9a-f]{64}$/.test(f.sha256) && /^main-workspace\\/translations-models\\//.test(f.path)); })")
    check('0f this Chrome can run the engine (Worker, Cache Storage, WebCrypto, WebAssembly SIMD) and has no built-in Translator, like Android',
          "offlineTrSupported() === true && !('Translator' in self)")

    check('0g merely starting the app creates no cache of its own (a pack that was never installed costs no storage entry)',
          "caches.has(OFFLINE_TR_CACHE).then(has => has === false)")

    # ---- 1. no pack: nothing is translated, and the reader is told once where to get one ------------------------------------------
    network(True)
    js(f"navigator.onLine === false && (handleWordOrSelection({json.dumps(SENTENCE)}, 200, 200), 1)")
    time.sleep(2.5)
    check('1a offline without a pack: no translation is invented, the usual reason is shown',
          f"els.ttTranslation.textContent === t('sentenceNeedsAi') && !els.ttTranslation.textContent.includes('⌂')")
    check('1b ... and a toast points to Settings -> Offline translation', "document.getElementById('reader-toast').textContent === t('offNeedsPack') && offlineTrSuggested.has('uk>hi')")
    js(f"document.getElementById('reader-toast').textContent = ''; state.translationCache = {{}}; handleWordOrSelection({json.dumps(WORD)}, 200, 200); 1"); time.sleep(2)
    check('1c a word without a pack fails the same way and the hint is NOT repeated', "!els.ttTranslation.textContent.includes('⌂') && document.getElementById('reader-toast').textContent === ''")
    network(False)

    # ---- 2. install from Settings, with progress ---------------------------------------------------------------------------------
    open_settings()
    check('2a the section is in the Settings dialog with the book languages that can reach the target',
          "document.getElementById('offline-box') && document.querySelectorAll('#offline-src option').length >= 8 && !document.querySelector('#offline-src option[value=\"hi\"]') "
          "&& [...document.querySelectorAll('#offline-src option')].some(o => o.value === 'uk')")
    open_settings('uk')
    check('2b the button says how much will be downloaded (engine + two models through English)',
          "/^⬇ .*[0-9]+/.test(document.getElementById('offline-install').textContent) && !document.getElementById('offline-install').disabled")
    HOOK['sleep'] = 0.004
    js("""(() => { window.__samples = []; const st = document.getElementById('offline-status'), pr = document.getElementById('offline-progress');
        new MutationObserver(() => __samples.push({text: st.textContent, value: pr.value, max: pr.max, hidden: pr.hidden})).observe(st, {childList: true, characterData: true, subtree: true});
        document.getElementById('offline-install').click(); return 1; })()""")
    c.wait("document.getElementById('offline-status').textContent.startsWith(t('offDone').split('{pair}')[0])", timeout=170)
    HOOK['sleep'] = 0; time.sleep(.6)
    check('2c while it downloaded the progress moved forward and never went back',
          "__samples.length >= 3 && __samples.some(s => s.value > 0 && s.value < s.max) && __samples.filter(s => s.max > 1).every((s, i, all) => !i || s.value >= all[i - 1].value)")
    check('2d installed: the engine and both models are recorded, the direction is remembered, the progress bar is gone',
          "offlineTrPack.engine === '3.0' && Object.keys(offlineTrPack.models).sort().join() === 'en>hi,uk>en' && offlineTrPack.directions.join() === 'uk>hi' "
          "&& document.getElementById('offline-progress').hidden && document.getElementById('offline-install').textContent === t('offHave') && document.getElementById('offline-install').disabled")
    ok('2e only the six model files were fetched through the proxy, each once (the engine is a static file of the site)',
       len(LOG) == 6 and len(set(LOG)) == 6 and all(p in FILES for p in LOG), LOG)
    check('2f the list shows the installed direction with its size', "document.querySelectorAll('#offline-list li[data-direction]').length === 1 && /[0-9]+ MB|[0-9]+ МБ/.test(document.querySelector('#offline-list li[data-direction] span').textContent)")
    check('2g the files really are in the app\'s own cache, not in the shell cache',
          """caches.open(OFFLINE_TR_CACHE).then(async cache => { const keys = (await cache.keys()).map(r => decodeURIComponent(r.url)); return keys.length === 8 && keys.some(k => k.endsWith('/state')) && keys.some(k => k.endsWith('/engine/3.0'))
              && (await caches.keys()).some(k => k.startsWith('ai-reader-shell-')) && !(await (await caches.open((await caches.keys()).find(k => k.startsWith('ai-reader-shell-')))).keys()).some(r => r.url.includes('__offline-translation')); })""")
    js("closeKeySettings(); 1")

    # ---- 3. no network at all: the installed PWA starts offline and translates ----------------------------------------------------
    network(True)
    LOG.clear()
    reload_page()
    check('3a the app started offline from its service worker, with the pack still installed', "navigator.onLine === false && navigator.serviceWorker.controller !== null && offlineTrPack.engine === '3.0'")
    js(f"handleWordOrSelection({json.dumps(WORD)}, 200, 200); 1")
    text = wait_tooltip(f"{DEVANAGARI}.test(els.ttTranslation.textContent)", timeout=60)
    ok('3b a WORD is translated by the pack (Ukrainian -> Hindi through English), marked ⌂', '⌂' in text, text)
    js(f"state.translationCache = {{}}; handleWordOrSelection({json.dumps(SENTENCE)}, 200, 200); 1")
    c.wait("els.ttTranslation.textContent.length > 12 && els.ttTranslation.textContent.includes('⌂') && !els.ttTranslation.textContent.includes(t('translating'))", timeout=60)
    text = tooltip()
    ok('3c a SENTENCE is translated by the pack, marked ⌂', bool(js(f"{DEVANAGARI}.test(els.ttTranslation.textContent)")) and '⌂' in text, text)
    check('3d it ran the engine in a worker through the two models, and nothing was asked of the network',
          "offlineTrReport().last.route === 'uk>en ; en>hi' && offlineTrReport().last.ms > 0 && offlineTrReport().workerRunning && offlineTrReport().failure === ''")
    ok('3e ... no model was requested from the server while offline', LOG == [], LOG)
    check('3f the pack\'s rougher translation is neither kept in memory nor stored: the next tap online asks the AI again', "Object.keys(state.translationCache).length === 0")
    check('3g the production CSP (no unsafe-eval) blocked nothing and nothing threw', "__csp.length === 0 && __errors.length === 0 ? true : JSON.stringify({csp: __csp, errors: __errors})")
    check('3h a direct model works too (en -> hi), the worker switches models',
          "offlineTranslate('The old man is reading a book in the garden.', 'en', 'hi').then(out => /\\p{Script=Devanagari}/u.test(out) && offlineTrReport().last.route === 'en>hi')")
    check('3h2 a word is marked in its sentence as a whole word only, safely escaped; what the mark landed on is cleaned, and a lost mark, a scrap or most of the sentence is refused', """(() =>
        offlineTrMarked('temps', 'Il fait beau temps, pas longtemps.') === 'Il fait beau <b>temps</b>, pas longtemps.'
        && offlineTrMarked('temps', 'Depuis longtemps.') === null
        && offlineTrMarked('a', 'x < y & a > b') === 'x &lt; y &amp; <b>a</b> &gt; b'
        && offlineTrPicked('Сьогодні гарна <b>погода</b>.', 'temps') === 'погода'
        && offlineTrPicked('Я встаю<b>, обідаю,</b> трохи', 'déjeune') === 'обідаю'
        && offlineTrPicked('Слухайте <b>та</b> асоціюйте', 'associez') === null
        && offlineTrPicked('Слухайте та асоціюйте', 'associez') === null
        && offlineTrPicked('<b></b> я живу', 'habite') === null
        && offlineTrPicked('<b>a b c d e f</b>', 'mot') === null
        && offlineTrCase('Ключі', 'clés') === 'ключі' && offlineTrCase('Париж', 'Paris') === 'Париж')()""")
    check('3h3 a WORD is translated in its sentence by the real engine (the markup survives the model) and gives its own translation besides when it differs', """(async () => {
        const r = await offlineTranslateWord('bank', 'We sat on the bank of the river and watched the boats.', 'en', 'hi');
        const ok = r && /\\p{Script=Devanagari}/u.test(r.text) && !/[<>]/.test(r.text) && (r.alone === null || /\\p{Script=Devanagari}/u.test(r.alone));
        const html = r ? offlineTrWordHtml(r) : '';
        return ok && html.includes('⌂') && (!r.alone || html.includes(t('offAlone'))) || JSON.stringify({ r, html });
    })()""")
    check('3i a translation for a direction that is not installed is refused, not guessed', "offlineTranslate('Le chat dort.', 'fr', 'hi').then(out => out === null)")
    check('3j the Test button translates a sample and shows the time',
          """(async () => { openKeySettings(); await new Promise(r => setTimeout(r, 300)); document.querySelector('#offline-list li[data-direction] button[data-act=test]').click();
              for (let i = 0; i < 100 && !/→/.test(document.getElementById('offline-status').textContent.replace(t('translating'), '')); i++) await new Promise(r => setTimeout(r, 200));
              const text = document.getElementById('offline-status').textContent; closeKeySettings(); return /\\p{Script=Devanagari}/u.test(text) && text.trim().endsWith(' с'); })()""")
    check('3k the engine can be dropped (idle timer) and starts again by itself', "(offlineTrStop(), !offlineTrReport().workerRunning) && offlineTranslate('The old man is reading.', 'en', 'hi').then(out => !!out && offlineTrReport().workerRunning)")
    network(False)

    # ---- 4. a network that only looks alive: the pack answers while the AI is silent ----------------------------------------------
    js("""(() => { window.__aiResolve = null; aiAvailable = () => true; translationProviders = () => ['groq']; ensureSharedAiProviders = () => null;
        aiTranslateText = () => new Promise(resolve => { window.__aiResolve = resolve; }); machineTranslate = async () => ({html: '', plain: '', extras: ''});
        state.translationCache = {}; handleWordOrSelection('Старий чоловік читає цікаву книгу в саду.', 200, 200); return 1; })()""")
    text = wait_tooltip(f"{DEVANAGARI}.test(els.ttTranslation.textContent)", timeout=30)
    ok('4a after a few seconds without an AI answer the installed pack shows its translation (⌂)', '⌂' in text, text)
    js("window.__aiResolve('Відповідь ШІ'); 1"); time.sleep(.5)
    check('4b a late AI answer replaces the preview', "els.ttTranslation.textContent.includes('Відповідь ШІ') && !els.ttTranslation.textContent.includes('⌂')")
    reload_page()

    # ---- 5. remove, and a model that two directions share -------------------------------------------------------------------------
    LOG.clear()
    js("offlineTrInstall('en', 'hi').then(() => 1)")
    c.wait("offlineTrPack.directions.length === 2", timeout=30)
    ok('5a a second direction that needs only a model already installed downloads nothing', LOG == [], LOG)
    js("offlineTrRemove('uk', 'hi').then(() => 1)")
    c.wait("offlineTrPack.directions.length === 1", timeout=30)
    check('5b removing uk->hi drops the model only it used (uk>en) and keeps the shared one (en>hi) in memory and in the cache',
          """caches.open(OFFLINE_TR_CACHE).then(async cache => { const keys = (await cache.keys()).map(r => decodeURIComponent(r.url));
              return Object.keys(offlineTrPack.models).join() === 'en>hi' && offlineTrPack.engine === '3.0' && keys.length === 5 && !keys.some(k => k.includes('uk>en')); })""")
    check('5c en -> hi still translates after that', "offlineTranslate('The old man is reading a book in the garden.', 'en', 'hi').then(out => /\\p{Script=Devanagari}/u.test(out))")
    js("offlineTrRemove('en', 'hi').then(() => 1)")
    c.wait("offlineTrPack.directions.length === 0", timeout=30)
    check('5d removing the last direction leaves only the state record: models AND the engine are gone',
          "caches.open(OFFLINE_TR_CACHE).then(async cache => (await cache.keys()).length === 1 && offlineTrPack.engine === '' && Object.keys(offlineTrPack.models).length === 0)")
    check('5e ... and translation is refused again', "offlineTranslate('The old man is reading.', 'en', 'hi').then(out => out === null)")

    # ---- 6. a download that breaks half way resumes, a damaged one is refused -----------------------------------------------------
    en_hi_lex = next(f['path'] for f in js("OFFLINE_CATALOG.models['en>hi'].files") if f['type'] == 'lex')
    en_hi_model = next(f['path'] for f in js("OFFLINE_CATALOG.models['en>hi'].files") if f['type'] == 'model')
    uk_en_vocab = next(f['path'] for f in js("OFFLINE_CATALOG.models['uk>en'].files") if f['type'] == 'vocab')
    LOG.clear(); HOOK['cut'][en_hi_lex] = 100_000
    failure = js("offlineTrInstall('uk', 'hi').then(() => 'installed', e => e.offlineTr)")
    ok('6a the connection dropping in the middle of a file is reported as a network error', failure == 'network', failure)
    check('6b what was complete is kept (engine, uk>en, the first file of en>hi); the unfinished model is not recorded as installed',
          "offlineTrPack.engine === '3.0' && Object.keys(offlineTrPack.models).join() === 'uk>en' && offlineTrPack.directions.length === 0")
    HOOK['cut'].clear(); LOG.clear()
    result = js("offlineTrInstall('uk', 'hi').then(() => 'installed', e => e.offlineTr)")
    ok('6c retrying finishes the install', result == 'installed', result)
    ok('6d ... and fetched only what was missing: not the verified model file of en>hi, not uk>en',
       set(LOG) == {f['path'] for f in js("OFFLINE_CATALOG.models['en>hi'].files")} - {en_hi_model} and len(LOG) == 2, LOG)
    js("offlineTrRemove('uk', 'hi').then(() => 1)"); c.wait("offlineTrPack.directions.length === 0", timeout=30)

    HOOK['corrupt'].add(uk_en_vocab); LOG.clear()
    failure = js("offlineTrInstall('uk', 'hi').then(() => 'installed', e => e.offlineTr)")
    ok('6e a file that differs from the pinned SHA-256 by a single byte is refused', failure == 'checksum', failure)
    check('6f ... it is neither stored nor recorded: the model it belongs to is not installed, so nothing can use it',
          """caches.open(OFFLINE_TR_CACHE).then(async cache => !(await cache.keys()).some(r => decodeURIComponent(r.url).endsWith('uk>en/vocab')) && !offlineTrPack.models['uk>en'] && offlineTrPack.directions.length === 0)""")
    check('6g the screen says so (the status line of the dialog), and the download can be tried again',
          """(async () => { openKeySettings(); await offlineTrRefreshBox(); document.getElementById('offline-src').value = 'uk'; document.getElementById('offline-src').dispatchEvent(new Event('change')); await offlineTrRefreshBox();
              const install = document.getElementById('offline-install'), status = document.getElementById('offline-status'); install.click();
              for (let i = 0; i < 100 && status.textContent !== t('offErrChecksum'); i++) await new Promise(r => setTimeout(r, 200));
              await new Promise(r => setTimeout(r, 300));
              const result = status.textContent === t('offErrChecksum') && !install.disabled && !install.hidden ? true : JSON.stringify({status: status.textContent, disabled: install.disabled, hidden: install.hidden, label: install.textContent, busy: !!offlineTrUi.controller});
              closeKeySettings(); return result; })()""")
    HOOK['corrupt'].clear()

    # ---- 7. cancel keeps what is verified ------------------------------------------------------------------------------------------
    HOOK['sleep'] = 0.02; LOG.clear()
    open_settings('uk')
    js("document.getElementById('offline-install').click(); 1")
    c.wait("document.getElementById('offline-progress').value > 0 && !document.getElementById('offline-cancel').hidden", timeout=60)
    js("document.getElementById('offline-cancel').click(); 1")
    c.wait("document.getElementById('offline-status').textContent === t('offCancelled')", timeout=30)
    check('7a cancelling stops the download, says so, and offers the download again',
          "!offlineTrUi.controller && document.getElementById('offline-cancel').hidden && !document.getElementById('offline-install').disabled && offlineTrPack.directions.length === 0")
    HOOK['sleep'] = 0; LOG.clear()
    js("document.getElementById('offline-install').click(); 1")
    c.wait("document.getElementById('offline-status').textContent.startsWith(t('offDone').split('{pair}')[0])", timeout=170)
    ok('7b installing again completes (a partly downloaded file is simply fetched again)', js("offlineTrPack.directions.join()") == 'uk>hi' and len(LOG) <= 6, LOG)
    js("closeKeySettings(); 1")

    # ---- 8. a damaged store heals instead of failing forever ----------------------------------------------------------------------
    js("""caches.open(OFFLINE_TR_CACHE).then(cache => cache.delete(offlineTrKey('file', 'en>hi', 'lex'))).then(() => 1)""")
    check('8a a model file that vanished from the cache: translation is refused, the reason is recorded',
          "offlineTranslate('The old man is reading.', 'en', 'hi').then(out => out === null && /missing/.test(offlineTrReport().failure))")
    check('8b ... and the pack is marked not installed, so Settings offers the download again instead of a dead "installed"',
          "offlineTrPack.engine === '' && Object.keys(offlineTrPack.models).length === 0 && offlineTrReady(offlineTrPack, offlineTrRoute('uk', 'hi')) === false")
    js("offlineTrInstall('uk', 'hi').then(() => 1)"); c.wait("offlineTrPack.directions.length >= 1 && offlineTrPack.engine === '3.0'", timeout=170)
    check('8c reinstalling repairs it', "offlineTranslate('Старий чоловік читає.', 'uk', 'hi').then(out => /\\p{Script=Devanagari}/u.test(out))")

    check('8d a newer model version in the catalog does not take away a pack the reader installed',
          """(async () => { const model = OFFLINE_CATALOG.models['en>hi'], was = model.version; model.version = '99.0';
              try { const out = await offlineTranslate('The old man is reading a book in the garden.', 'en', 'hi'); return /\\p{Script=Devanagari}/u.test(out); } finally { model.version = was; } })()""")
    check('8e a newer ENGINE (glue and wasm are a pair) is never run against the old wasm: the pack is "not ready" and only the engine is missing',
          """(() => { const engine = OFFLINE_CATALOG.engine, was = engine.version; engine.version = '99.0';
              try { const route = offlineTrRoute('uk', 'hi'); return offlineTrReady(offlineTrPack, route) === false && offlineTrMissingBytes(offlineTrPack, route) === engine.wasm.size; } finally { engine.version = was; } })()""")
    check('8f a state record the code cannot read is ignored, not trusted',
          """(async () => { const cache = await caches.open(OFFLINE_TR_CACHE), key = offlineTrKey('state'), keep = await cache.match(key), saved = offlineTrPack;
              await cache.put(key, new Response(JSON.stringify({v: 1, engine: '3.0', models: {'en>hi': {version: '2.1'}}, directions: []})));
              offlineTrPack = null; const loaded = await offlineTrLoad(); await cache.put(key, keep); offlineTrPack = saved; return Object.keys(loaded.models).length === 0; })()""")

    # ---- 9. a device that cannot run the engine -----------------------------------------------------------------------------------
    check('9a without WebAssembly SIMD the pack is refused politely: no translation, Settings explains, no download button',
          """(async () => { const validate = WebAssembly.validate; WebAssembly.validate = () => false;
              try { const out = await offlineTranslate('Старий чоловік читає.', 'uk', 'hi'); openKeySettings(); await offlineTrRefreshBox(); const shown = document.getElementById('offline-note').textContent === t('offUnsupported') && document.getElementById('offline-install').hidden; closeKeySettings(); return out === null && shown; }
              finally { WebAssembly.validate = validate; } })()""")

    check('9b a bug in the optional path never breaks a lookup: even a broken catalog just gives null (the popup keeps its usual reason)',
          """(async () => { const codes = OFFLINE_CATALOG.codes; OFFLINE_CATALOG.codes = null;
              try { return (await offlineTranslate('Старий чоловік читає.', 'uk', 'hi')) === null; } finally { OFFLINE_CATALOG.codes = codes; } })()""")

    # ---- 10. diagnostics, languages ------------------------------------------------------------------------------------------------
    check('10a the diagnostics report says what is installed and how the last translation went, without any key',
          "(() => { const report = JSON.parse(buildDiagnosticsReport()).offline; return report.supported === true && report.engine === '3.0' && Object.keys(report.models).length >= 1 && report.last.ms > 0 && report.failure !== undefined && !/sk-|gsk_|AIza/.test(JSON.stringify(report)); })()")
    check('10b every string of the section exists in all 9 menu languages',
          """(() => { const keys = ['offAlone','offTitle','offHint','offBookLang','offTarget','offDownload','offHave','offProgress','offDone','offCancelled','offErrNetwork','offErrServer','offErrChecksum','offErrQuota','offUnsupported','offNoRoute','offInstalled','offRemove','offTest','offTestResult','offTestFail','offNeedsPack','offUnitMb'];
              return keys.every(k => ['uk','en','fr','ru','zh','ko','hi','ga','es'].every(l => I18N[k] && typeof I18N[k][l] === 'string' && I18N[k][l].length > 1)); })()""")
    check('10c the placeholders survive translation in every language', """(() => { const need = {offTarget: '{lang}', offDownload: '{mb}', offProgress: '{done}', offDone: '{pair}', offTestResult: '{src}', offTestFail: '{why}'};
              return Object.entries(need).every(([k, p]) => ['uk','en','fr','ru','zh','ko','hi','ga','es'].every(l => I18N[k][l].includes(p))) && ['{total}'].every(p => ['uk','en','fr','ru','zh','ko','hi','ga','es'].every(l => I18N.offProgress[l].includes(p))); })()""")
    check('10d nothing threw and nothing was blocked by the Content-Security-Policy during the whole run', "__errors.length === 0 && __csp.length === 0 ? true : JSON.stringify({csp: __csp, errors: __errors})")
    print('ALL PASS')
finally:
    try:
        network(False)
        js("navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.unregister()))).then(() => caches.keys()).then(ks => Promise.all(ks.map(k => caches.delete(k)))).then(() => 1)")
    except Exception:
        pass
    server.shutdown()
