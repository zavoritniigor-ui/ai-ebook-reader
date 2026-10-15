"""The production Content-Security-Policy (from _headers) forbids inline scripts: no 'unsafe-inline' and no blob: in
script-src, so even a bug in the HTML sanitizer could not run an injected onclick/onerror or <script>. This test serves the
app WITH that exact header (its own small server — CI's plain http.server sends no CSP), exercises the controls that used to
be inline handlers, opens EPUB/PDF/HTML/Markdown books, the library, settings and Ask AI, and requires ZERO CSP violations;
then proves the policy really blocks an injected inline handler. No network."""
import base64, functools, http.server, io, json, os, socketserver, threading, time, zipfile
from browser_cdp import CDP

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSP = next(line.split(':', 1)[1].strip() for line in open(os.path.join(ROOT, '_headers')) if line.strip().startswith('Content-Security-Policy'))
assert "'unsafe-inline'" not in CSP.split('script-src', 1)[1].split(';', 1)[0], 'script-src must not allow inline scripts'


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Content-Security-Policy', CSP)
        super().end_headers()
    def log_message(self, *a): pass


Handler.extensions_map.update({'.mjs': 'text/javascript', '.js': 'text/javascript', '.wasm': 'application/wasm'})
server = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Handler, directory=ROOT))
server.daemon_threads = True
threading.Thread(target=server.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/index.html' % server.server_address[1]

c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1180, height=820, deviceScaleFactor=1, mobile=False)
c.call('Page.addScriptToEvaluateOnNewDocument', source="window.__csp = []; document.addEventListener('securitypolicyviolation', e => __csp.push(e.violatedDirective + ' ' + (e.blockedURI || '') + ' ' + (e.sample || '').slice(0, 60)));")
READY = "document.readyState==='complete' && !document.body.inert && typeof openBookFile==='function'"
c.call('Page.navigate', url=URL); c.wait(READY, timeout=30)
c.js("localStorage.clear(); localStorage.setItem('reader_onboarding_done','1'); 1"); c.call('Page.reload'); c.wait(READY, timeout=30); time.sleep(1)


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.2); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


check('1 the page loads under the strict policy: voices initialised, PDF worker configured, no violation',
      "typeof loadVoices === 'function' && !!window.pdfjsLib && pdfjsLib.GlobalWorkerOptions.workerSrc.includes('pdf-6.3.289.worker') && __csp.length === 0", timeout=10)
# former inline handlers
c.js("document.getElementById('btn-ai-key').click(); 1"); time.sleep(0.3)
check('2 🔑 opens the key settings (was onclick)', "getComputedStyle(document.getElementById('settings-modal')).display !== 'none'")
c.js("document.querySelector('#settings-modal [data-close-settings]').click(); 1"); time.sleep(0.3)
check('3 ✕ closes them (was onclick)', "getComputedStyle(document.getElementById('settings-modal')).display === 'none'")
c.js("document.getElementById('btn-ai-key').click(); 1"); time.sleep(0.3)
c.js("document.getElementById('settings-modal').dispatchEvent(new MouseEvent('click', {bubbles: true})); 1"); time.sleep(0.3)
check('4 a tap on the backdrop closes them (was onclick on the modal)', "getComputedStyle(document.getElementById('settings-modal')).display === 'none'")
c.js("window.__saved = 0; const real = saveApiKey; saveApiKey = () => { __saved++; }; document.getElementById('api-keys-form').requestSubmit(); saveApiKey = real; 1")
check('5 submitting the key form calls saveApiKey and does not navigate (was onsubmit)', "__saved === 1 && location.href.endsWith('index.html')")
c.js("window.__sent = 0; const btn = els.askSendBtn; const realClick = btn.click; btn.click = () => { __sent++; }; document.getElementById('ask-chat-form').requestSubmit(); btn.click = realClick; 1")
check('6 Enter in Ask AI submits through the send button (was onsubmit)', "__sent === 1 && location.href.endsWith('index.html')")
c.js("document.getElementById('ask-panel').classList.add('expanded'); document.querySelector('[data-close-panel=\"ask-panel\"]').click(); document.getElementById('grammar-panel').classList.add('expanded'); document.querySelector('[data-close-panel=\"grammar-panel\"]').click(); 1")
check('7 the Ask AI and Grammar ✕ close their panels (were onclick)', "!document.getElementById('ask-panel').classList.contains('expanded') && !document.getElementById('grammar-panel').classList.contains('expanded')")
c.js("window.__upd = 0; const r = updateApp; updateApp = () => { __upd++; }; document.getElementById('btn-update-app').click(); updateApp = r; 1")
check('8 🔄 calls updateApp (was onclick)', "__upd === 1")
# books in several formats
o = io.BytesIO()
with zipfile.ZipFile(o, 'w') as z:
    z.writestr('META-INF/container.xml', '<container><rootfiles><rootfile full-path="OPS/p.opf"/></rootfiles></container>')
    z.writestr('OPS/p.opf', '<package><metadata/><manifest><item id="c" href="c.xhtml"/></manifest><spine><itemref idref="c"/></spine></package>')
    z.writestr('OPS/c.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Chapter</h1>' + '<p>A readable sentence of the EPUB book. </p>' * 40 + '</body></html>')
books = [('b.epub', o.getvalue()), ('b.html', ('<html><body><h1>H</h1>' + '<p>Paragraph of the HTML book.</p>' * 30 + '</body></html>').encode()),
         ('b.md', ('# Title\n\n' + 'A paragraph of the Markdown book.\n\n' * 30).encode())]
for name, data in books:
    c.js("window.__ok = 0; openBookFile(new File([Uint8Array.from(atob('%s'), ch => ch.charCodeAt(0))], '%s', {lastModified: 3})).then(() => { window.__ok = 1; }); 1" % (base64.b64encode(data).decode(), name))
    c.wait("window.__ok === 1", timeout=30); time.sleep(0.8)
    check('9 %s opens and renders with no violation' % name, "els.pages.textContent.length > 100 && __csp.length === 0 || JSON.stringify(__csp)")
pdf = open(os.path.join(ROOT, 'tests', 'fixtures', 'pdf', 'reportlab-multilingual-illustrated.pdf'), 'rb').read() if os.path.exists(os.path.join(ROOT, 'tests', 'fixtures', 'pdf', 'reportlab-multilingual-illustrated.pdf')) else None
if pdf:
    c.js("window.__ok = 0; openBookFile(new File([Uint8Array.from(atob('%s'), ch => ch.charCodeAt(0))], 's.pdf', {lastModified: 4})).then(() => { window.__ok = 1; }); 1" % base64.b64encode(pdf).decode())
    c.wait("window.__ok === 1 && state.totalPages > 0", timeout=60); time.sleep(2)
    check('10 a PDF renders (worker + wasm decoders) with no violation', "!!document.querySelector('canvas') && __csp.length === 0 || JSON.stringify(__csp)")
c.js("openLibrary(); 1"); time.sleep(1.5)
check('11 the library window opens with no violation', "document.getElementById('library-modal').classList.contains('open') && __csp.length === 0 || JSON.stringify(__csp)")
c.js("closeLibrary(); 1")
# the policy actually blocks injected inline code
c.js("""(() => { const d = document.createElement('div'); d.innerHTML = '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" onerror="window.__pwned=1" onload="window.__pwned=1">'; document.body.append(d);
  const s = document.createElement('script'); s.textContent = 'window.__pwned = 2'; document.body.append(s); return 1; })()"""); time.sleep(1)
check('12 an injected inline handler or <script> does NOT run (the browser blocks it)', "!window.__pwned && __csp.some(v => /script-src/.test(v))")
print('ALL PASS')
server.shutdown()
