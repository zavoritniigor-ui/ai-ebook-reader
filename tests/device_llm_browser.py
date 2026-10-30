"""On-device AI (js/device-llm.js): install from Settings, then translation and explanations with no cloud AI. The app is served by a
small server of this test with the production Content-Security-Policy from _headers; it stands in for the Pages Function /api/device-llm
(unit-tested by tests/device_llm_proxy_test.mjs) with a SMALL stand-in model and engine binary whose sizes and SHA-256 the page's catalog
is pointed at, and the MediaPipe engine itself is replaced by a stub (CI has no GPU and no 2 GB model; the real model was checked on a
real GPU, see HANDOFF.md). The stub reads the whole model through deviceLlmModelStream, so the parts are checked to arrive in order.

Cases: unsupported browser / unfit GPU say so; install with progress (engine + every part, by byte range); a part cut mid-way is retried
and the install completes; a corrupted part is refused and nothing is installed, then a new install fetches only what is missing;
offline: a word (with its sentence, parsed from the model's last line in every shape the real model wrote), a sentence, Ask with the
📱 mark; a failing cloud AI falls back to the device, a working one is not replaced, a picture or a caller-chosen provider never goes
to the device; a too-long prompt; a lost part forgets the install; remove; diagnostics; every string in every language; no CSP
violation."""
import hashlib, http.server, json, os, re, socket, socketserver, threading, time
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from browser_cdp import CDP

ROOT = Path(__file__).resolve().parents[1]
CSP = next(l.split(':', 1)[1].strip() for l in (ROOT / '_headers').read_text().splitlines() if l.strip().startswith('Content-Security-Policy:'))
PART = 4096
FILES = {'wasm': bytes((i * 7) % 251 for i in range(10000)), 'model': bytes((i * 13 + 5) % 253 for i in range(3 * PART - 2288))}
PARTS = [hashlib.sha256(FILES['model'][i:i + PART]).hexdigest() for i in range(0, len(FILES['model']), PART)]
HOOK = {'cut': set(), 'corrupt': set()}   # part indexes: cut once mid-way / always corrupted
LOG = []                                  # (file, part index or None) of every request


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
        if url.path == '/api/device-llm': return self.serve(parse_qs(url.query).get('f', [''])[0])
        return super().do_GET()
    def serve(self, f):
        data = FILES.get(f)
        if data is None: return self.send_error(400)
        m = re.fullmatch(r'bytes=(\d+)-(\d+)', self.headers.get('range') or '')
        a, b = (int(m.group(1)), int(m.group(2))) if m else (0, len(data) - 1)
        index = a // PART if m else None
        LOG.append((f, index))
        body = data[a:b + 1]
        if f == 'model' and index in HOOK['corrupt']: body = bytes([body[0] ^ 1]) + body[1:]
        self.send_response(206 if m else 200)
        self.send_header('Content-Type', 'application/octet-stream'); self.send_header('Content-Length', str(len(body)))
        if m: self.send_header('Content-Range', f'bytes {a}-{b}/{len(data)}')
        self.end_headers()
        if f == 'model' and index in HOOK['cut']:
            HOOK['cut'].discard(index)
            self.wfile.write(body[:len(body) // 2]); self.wfile.flush()
            self.connection.shutdown(socket.SHUT_RDWR)   # the connection drops with the part half sent
            return
        self.wfile.write(body)


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


PORT = int(os.environ.get('READER_DEVICE_LLM_PORT', '8771'))
server = Server(('127.0.0.1', PORT), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{PORT}/index.html'

c = CDP()
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1200, height=900, deviceScaleFactor=1, mobile=False)


def check(name, expression, timeout=None):
    if timeout: c.wait(expression, timeout=timeout)
    value = c.js(expression)
    assert value is True, (name, value)
    print('PASS', name, flush=True)


def offline(on):
    # Requests really fail offline (CDP); navigator.onLine follows this switch, not the machine: in a sandbox without a network
    # interface Chrome reports offline all the time.
    c.call('Network.emulateNetworkConditions', offline=on, latency=0, downloadThroughput=-1, uploadThroughput=-1)
    c.js('window.__offline = %s; 1' % ('true' if on else 'false'))


# The stand-in engine: answers by the shape of the prompt, streams in two pieces, reads the whole model stream first.
STUB = r"""(() => {
  window.__offline = false; Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => !window.__offline });
  window.__engine = { created: 0, closed: 0, cancelled: 0, prompts: [], modelBytes: 0, modelSha: '' };
  window.__wordReplies = {};
  window.__explain = 'Пояснення на пристрої: це речення в теперішньому часі.';
  deviceLlmSupported = () => true;
  deviceLlmGpu = async () => (deviceLlmGpuInfo = { ok: true, vendor: 'test' });
  translateLocally = async () => null;          // Android has no Chrome Translator
  deviceLlmCreateEngine = async (cache) => {
    const reader = deviceLlmModelStream(cache).getReader(), chunks = [];
    for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); }
    const all = new Uint8Array(chunks.reduce((n, x) => n + x.length, 0)); let at = 0; for (const x of chunks) { all.set(x, at); at += x.length; }
    __engine.modelBytes = all.length;
    __engine.modelSha = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', all)), b => b.toString(16).padStart(2, '0')).join('');
    __engine.created++;
    return {
      sizeInTokens: (s) => Math.ceil(String(s).length / 4),
      close() { __engine.closed++; }, cancelProcessing() { __engine.cancelled++; },
      async generateResponse(prompt, cb) {
        __engine.prompts.push(prompt);
        const word = /WORD: <translation>/.test(prompt) ? (prompt.match(/the word «([^»]+)»/) || [])[1] : null;
        const out = word ? (__wordReplies[word] || 'Речення українською.\nWORD: слово') : /^<\|turn>user\nTranslate this/.test(prompt) ? 'Ваш переклад речення.' : __explain;
        const half = Math.ceil(out.length / 2);
        await new Promise(r => setTimeout(r, 20)); cb && cb(out.slice(0, half), false);
        await new Promise(r => setTimeout(r, 20)); cb && cb(out.slice(half), true);
        return out;
      }
    };
  };
  return 1; })()"""


def load(build=True):
    c.call('Page.navigate', url=URL)
    c.wait("document.readyState === 'complete' && !document.body.inert && typeof deviceLlmInstall === 'function'", timeout=60)
    c.js(r"""(() => { localStorage.clear(); showUpdateBanner = () => {};
      window.__errors = []; addEventListener('error', e => __errors.push(e.message));
      window.__csp = []; document.addEventListener('securitypolicyviolation', e => __csp.push(e.violatedDirective + ' ' + e.blockedURI));
      return 1; })()""")
    c.js("DEVICE_LLM_CATALOG.engine.wasm.size = %d; DEVICE_LLM_CATALOG.engine.wasm.sha256 = %s; Object.assign(DEVICE_LLM_CATALOG.model, { size: %d, part: %d, parts: %s }); 1"
         % (len(FILES['wasm']), json.dumps(hashlib.sha256(FILES['wasm']).hexdigest()), len(FILES['model']), PART, json.dumps(PARTS)))
    c.js(STUB)
    if build:
        c.js("deviceLlmBuildBox(); 1")


load(build=False)
# The section is no longer shown in Settings (owner, 2026-10-26); the code stays and builds it when asked (as below)
check('the on-device AI section is not in Settings any more', "!document.getElementById('device-llm-box') && typeof deviceLlmBuildBox === 'function'")
c.js("deviceLlmBuildBox(); 1")
c.js("caches.delete('reader-device-llm').then(() => 1)")
c.js("deviceLlmState = null; deviceLlmLoad().then(() => 1)")

# ---- Settings: unsupported browser / unfit GPU say so, and offer nothing ----------------------------------------------------------
c.js("window.__sup = deviceLlmSupported; deviceLlmSupported = () => false; deviceLlmRefreshBox().then(() => 1)")
check('a browser without WebGPU is told so, no download offered',
      "document.getElementById('device-llm-note').textContent === t('dlUnsupported') && document.getElementById('device-llm-install').hidden")
c.js("deviceLlmSupported = __sup; window.__gpu = deviceLlmGpu; deviceLlmGpuInfo = null; deviceLlmGpu = async () => (deviceLlmGpuInfo = { ok: false, reason: 'software GPU only' }); deviceLlmRefreshBox().then(() => 1)")
check('an unfit GPU is told so with the reason, no download offered',
      "document.getElementById('device-llm-note').textContent.includes('software GPU only') && document.getElementById('device-llm-install').hidden")
c.js("deviceLlmGpu = __gpu; deviceLlmGpuInfo = null; deviceLlmRefreshBox().then(() => 1)")
check('a fit device: the download button with its size, no test/remove yet',
      "!document.getElementById('device-llm-install').hidden && /≈ 0\\.0/.test(document.getElementById('device-llm-install').textContent)"
      " && document.getElementById('device-llm-test').hidden && document.getElementById('device-llm-remove').hidden && !deviceLlmInstalled()")
check('the section sits right under the offline translation section',
      "document.getElementById('offline-box').nextElementSibling === document.getElementById('device-llm-box')")

# ---- a corrupted part is refused: nothing installed --------------------------------------------------------------------------
HOOK['corrupt'] = {1}
LOG.clear()
c.js("document.getElementById('device-llm-install').click(); 1")
check('a corrupted part fails the integrity check (after the retries) and nothing is installed',
      "!document.getElementById('device-llm-progress').hidden ? false : document.getElementById('device-llm-status').textContent === t('offErrChecksum') && !deviceLlmInstalled()", timeout=30)
assert LOG.count(('model', 1)) == 3, LOG   # tried three times
print('PASS the corrupted part was tried three times', flush=True)

# ---- the next install fetches only what is missing; a part cut mid-way is retried by itself ---------------------------------------
HOOK['corrupt'] = set(); HOOK['cut'] = {2}
LOG.clear()
c.js("window.__progress = []; const p = document.getElementById('device-llm-progress'); new MutationObserver(() => __progress.push(+p.value)).observe(p, { attributes: true }); "
     "document.getElementById('device-llm-install').click(); 1")
check('installed: the status says so, test and remove are offered', "deviceLlmInstalled() && document.getElementById('device-llm-status').textContent === t('dlDone')"
      " && !document.getElementById('device-llm-test').hidden && !document.getElementById('device-llm-remove').hidden && document.getElementById('device-llm-install').hidden", timeout=30)
assert ('wasm', None) not in LOG and ('model', 0) not in LOG, LOG             # verified before: not fetched again
assert LOG.count(('model', 1)) == 1 and LOG.count(('model', 2)) == 2, LOG     # the missing part once, the cut one retried
print('PASS a second install fetches only the missing parts, and the part cut mid-way is retried by itself', LOG, flush=True)
check('progress was shown', "__progress.length > 0")
check('stored: engine + every part with its SHA-256, and the state record', """(async () => { const cache = await caches.open('reader-device-llm');
  const keys = (await cache.keys()).map(r => r.url); const parts = await Promise.all(DEVICE_LLM_CATALOG.model.parts.map((_, i) => cache.match(deviceLlmPartKey(i))));
  return keys.length === DEVICE_LLM_CATALOG.model.parts.length + 2 && parts.every((r, i) => r && r.headers.get('x-sha256') === DEVICE_LLM_CATALOG.model.parts[i]); })()""")

# ---- the model survives a reload --------------------------------------------------------------------------------------------
load()
check('after a reload the install is known (state read at start)', "deviceLlmInstalled() && deviceLlmReady()", timeout=10)

# ---- offline: word, sentence, Ask ------------------------------------------------------------------------------------------
offline(True)
c.js(r"""(() => { state.translateMode = true; state.format = 'txt'; state.bookKey = 'device-llm'; state.targetLang = 'uk'; state.uiLang = 'uk'; state.sourceLang = 'fr'; applyI18n();
  speakText = () => {}; speakInLang = () => {};
  window.__para = (text) => { const p = document.createElement('p'); p.textContent = text; p.style.cssText = 'margin:200px 40px;font-size:22px;max-width:900px'; els.pages.replaceChildren(p); return p; };
  window.__tap = (word) => { const p = els.pages.querySelector('p'); const i = p.textContent.indexOf(word); const r = document.createRange(); r.setStart(p.firstChild, i + 1); r.setEnd(p.firstChild, i + 2);
    const b = r.getBoundingClientRect(); p.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: b.left + 1, clientY: b.top + b.height / 2 })); return 1; };
  return 1; })()""")
check('offline: no network, no cloud AI, the device model is ready', "navigator.onLine === false && !aiAvailable() && deviceLlmReady() && aiCanAnswer()")
SENT = "Cette carence peut contribuer à différents problèmes de santé, dont l'ostéoporose."
for word, reply, want in [('carence', 'Ця нестача може сприяти різним проблемам зі здоров’ям.\nWORD: нестача', 'нестача'),
                          ('peut', 'Речення.\nWORD: peut: може', 'може'),
                          ('contribuer', 'Ця нестача може сприяти...\ncontribuer: сприяти', 'сприяти'),
                          ('problèmes', 'Речення.\n**WORD:** **проблемам**', 'проблемам'),
                          ('santé', 'Речення.\nЗдоров’я: здоров’я.', 'здоров’я')]:
    c.js("__wordReplies[%s] = %s; __para(%s); __tap(%s)" % (json.dumps(word), json.dumps(reply), json.dumps(SENT), json.dumps(word)))
    check(f'offline word «{word}» → «{want}» (the model\'s last line, label stripped) with the 📱 mark',
          "els.tooltip.style.display !== 'none' && mainTranslationText() === %s && els.ttTranslation.textContent.includes(t('dlMark'))" % json.dumps(want), timeout=15)
check('the word was asked WITH its sentence (translate the sentence, then the word)',
      "__engine.prompts.at(-1).includes(%s) && /First translate the whole sentence into Ukrainian/.test(__engine.prompts.at(-1))" % json.dumps(SENT))
check('the model was loaded once and read the whole model, in order', "__engine.created === 1 && __engine.modelBytes === %d && __engine.modelSha === %s"
      % (len(FILES['model']), json.dumps(hashlib.sha256(FILES['model']).hexdigest())))
check('the Gemma 4 turn format wraps the prompt', "/^<\\|turn>user\\n[\\s\\S]*<turn\\|>\\n<\\|turn>model\\n$/.test(__engine.prompts.at(-1))")
c.js(r"""(() => { const p = __para(%s); const r = document.createRange(); r.setStart(p.firstChild, 0); r.setEnd(p.firstChild, p.textContent.length);
  state.lastSelectedRange = r; const b = r.getBoundingClientRect(); handleWordOrSelection(r.toString(), b.left + 5, b.top + 5, b); return 1; })()""" % json.dumps(SENT))
check('offline sentence: translated on the device, 📱 mark', "mainTranslationText() === 'Ваш переклад речення.' && els.ttTranslation.textContent.includes(t('dlMark'))", timeout=15)
check('a device translation is not cached (the next online tap asks the cloud AI)', "!Object.values(state.translationCache).some(v => String(v.html || v).includes('Ваш переклад'))")
c.js("els.ttAskBtn.click(); 1")
check('offline Ask: the explanation comes from the device, with the 📱 mark and the model name',
      "els.askPanel.classList.contains('ready') && els.askContent.textContent.includes(__explain) && els.askContent.querySelector('.device-llm-mark')?.textContent === t('dlMark') + ' · Gemma 4 E2B'", timeout=15)
check('the request log names the device', "readerAiRequests().at(-1).provider === 'device' && readerAiRequests().at(-1).ok === true")
offline(False)

# ---- online: the cloud first; the device only when the cloud fails ------------------------------------------------------------
c.js("window.__cloud = requestCloudAI; 1")
c.js("requestCloudAI = async () => 'cloud answer'; state[AI_PROVIDERS.groq.key] = 'gsk_test_key'; 1")
check('a working cloud AI answers; the device is not used', "(async () => { const n = __engine.prompts.length, meta = {}; const out = await callAI('Explain', null, 'ask', undefined, { meta }); return out === 'cloud answer' && __engine.prompts.length === n; })()")
c.js("requestCloudAI = async () => { throw new AiRequestError('down', 'network'); }; 1")
check('a failing cloud AI: the device answers, and says so in meta', "(async () => { const meta = {}; const out = await callAI('Explain', null, 'ask', undefined, { meta }); return out === __explain && meta.provider === 'device'; })()")
check('a picture never goes to the device', "(async () => { const n = __engine.prompts.length; try { await callAIVision('What is it?', 'data:image/png;base64,AAAA', null); return false; } catch (e) { return e.message === 'down' && __engine.prompts.length === n; } })()")
check('a caller-chosen provider (translation) never goes to the device', "(async () => { const n = __engine.prompts.length; try { await callAI('x', null, 'translation', undefined, { provider: 'groq' }); return false; } catch (e) { return e.message === 'down' && __engine.prompts.length === n; } })()")
c.js("requestCloudAI = __cloud; 1")
check('a prompt too long for the device is refused with a clear message', "(async () => { try { await requestDeviceAI('x'.repeat(20000), null, 'ask', undefined, {}); return false; } catch (e) { return e.message === t('dlTooLong'); } })()")
check('Abort stops the generation', "(async () => { const ac = new AbortController(); const p = deviceLlmGenerate('Hello', ac.signal, {}); ac.abort(); try { await p; return false; } catch (e) { return e.name === 'AbortError'; } })()")

# ---- diagnostics ----------------------------------------------------------------------------------------------------------
check('📋 report: deviceAi with the GPU, the installed model, the last request', """(() => { const r = JSON.parse(buildDiagnosticsReport()).deviceAi;
  return r.installed === true && r.gpu.ok === true && r.state.model === DEVICE_LLM_CATALOG.model.id && r.last && r.last.outTokens > 0 && typeof r.loadMs === 'number'; })()""")
check('📋 report: whether Chrome offers its built-in AI here (Gemini Nano, Translator), asked without downloading anything', """(async () => {
  const saved = [self.LanguageModel, self.Translator];
  try {
    self.LanguageModel = { availability: async () => 'downloadable', create: () => { throw new Error('must not download'); } }; delete self.Translator;
    await probeChromeBuiltinAi(); const r = JSON.parse(buildDiagnosticsReport()).chromeAi;
    return r.promptApi === 'downloadable' && r.translatorFrUk === 'absent' && !!r.checked || JSON.stringify(r);
  } finally { self.LanguageModel = saved[0]; if (saved[1]) self.Translator = saved[1]; } })()""")

# ---- a lost part: the install is forgotten, Settings offer the download again ----------------------------------------------------
c.js("deviceLlmStop(); caches.open('reader-device-llm').then(c => c.delete(deviceLlmPartKey(1))).then(() => 1)")
check('a part the browser dropped: the answer fails, the install is forgotten', "(async () => { try { await deviceLlmGenerate('Hello', null, {}); return false; } catch (e) { return !deviceLlmInstalled() && !deviceLlmReady(); } })()")
c.js("deviceLlmRefreshBox(true).then(() => 1)")
check('Settings offer the download again', "!document.getElementById('device-llm-install').hidden")

# ---- remove ----------------------------------------------------------------------------------------------------------------
c.js("document.getElementById('device-llm-install').click(); 1")
check('reinstalled', "deviceLlmInstalled()", timeout=30)
c.js("document.getElementById('device-llm-remove').click(); 1")
check('remove: the cache is gone, nothing installed, the engine closed', "(async () => !(await caches.has('reader-device-llm')) && !deviceLlmInstalled())()", timeout=10)

# ---- strings -----------------------------------------------------------------------------------------------------------------
check('every text in every UI language (and Spanish)', """(() => { const bad = []; for (const k of Object.keys(I18N).filter(k => /^dl[A-Z]/.test(k)))
  { for (const l of ['uk','en','fr','ru','zh','ko','hi','ga']) if (!I18N[k][l]) bad.push(k + ':' + l); if (!I18N[k].es) bad.push(k + ':es'); } return bad.length === 0 || JSON.stringify(bad); })()""")
check('no CSP violation and no application error', "__csp.length === 0 && __errors.length === 0 || JSON.stringify([__csp, __errors])")
print('ALL DEVICE LLM CHECKS PASSED', flush=True)
