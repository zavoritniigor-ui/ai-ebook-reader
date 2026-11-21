# Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
# Copying, modification, distribution or commercial use without written permission is prohibited.
"""«Пошук в інтернеті» for a page crop (owner, 2026-11-20: «забрати запит в Gemini і вставити сюди нашу нову функцію
пошук в інтернеті … і коли скріншот вставлено в діалог запиту до AI, нажавши пошук в інтернеті, я теж можу знайти те,
що вставлено»).

The crop dialog's «Ask Gemini» button is gone; in its place «Search the web» opens the same Google search as the Ask AI
panel's 🔎, for the TEXT inside the drawn frame (read from the PDF text layer, only the characters inside the frame).
A crop without text (a scan, a picture) is searched by the image: a page cannot hand a file to another site (Google
Lens refuses such uploads), so the PNG is copied and Google opened to paste it; without an image clipboard the share
sheet is offered, else Save PNG. In Ask AI, while a crop is attached, 🔎 searches that crop instead of the panel's
earlier text, and after the answer it still does.

Real PDF, real region drags; window.open, the clipboard and the share sheet are stubbed. Nothing is sent anywhere.
"""
import base64, json, os, time
from urllib.parse import urlparse, parse_qs
from browser_cdp import CDP, pdf_bytes

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1280, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__errors = []; addEventListener('error', e => __errors.push(e.message));
addEventListener('unhandledrejection', e => __errors.push(String(e.reason)));
window.__opened = []; window.__copied = []; window.__shared = []; window.__order = []; window.__ai = [];
window.__openResult = 'tab'; window.__noClipboard = false; window.__canShareFiles = false; window.__copyFails = false;
window.open = (url, target, features) => { __order.push('open'); __opened.push({url: String(url), target, features: features || ''});
  return __openResult === 'blocked' ? null : {opener: window}; };
const realFetch = window.fetch;
window.fetch = (url, opts = {}) => { const u = String(url);
  if (String(opts.method || 'GET').toUpperCase() === 'POST' && /generativelanguage|api\.groq\.com|api\.openai\.com|\/api\/ai/.test(u)) { __ai.push(u);
    const answer = 'Answer about the crop';
    return Promise.resolve(new Response(JSON.stringify({candidates: [{content: {parts: [{text: answer}]}, finishReason: 'STOP'}]}), {status: 200, headers: {'content-type': 'application/json'}})); }
  return realFetch(url, opts); };
const put = (name, get) => Object.defineProperty(navigator, name, { configurable: true, get });
const clip = { write: async items => { if (__copyFails) throw new Error('denied');
  const blob = await items[0].getType('image/png'); __order.push('copy'); __copied.push({ type: blob.type, size: blob.size }); } };
put('clipboard', () => __noClipboard ? undefined : clip);
window.ClipboardItem = function (map) { this.types = Object.keys(map); this.getType = async t => map[t]; };
const share = async d => { __shared.push((d.files || []).map(f => ({ name: f.name, type: f.type, size: f.size }))); };
put('share', () => share);
put('canShare', () => d => !!__canShareFiles && !!(d && d.files));
''')
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof openCropPreview==='function'", timeout=30)
c.js("localStorage.clear(); showUpdateBanner = () => {}; document.getElementById('sw-update-banner')?.remove(); window.__toasts = []; const st = showToast; showToast = m => { __toasts.push(m); st(m); }; 1")


def pause(s): c.js(f'new Promise(r => setTimeout(r, {int(s * 1000)}))')


def check(name, expression, timeout=0):
    deadline = time.monotonic() + timeout
    result = c.js(expression)
    while result is not True and time.monotonic() < deadline:
        time.sleep(.1); result = c.js(expression)
    assert result is True, (name, result, c.js("JSON.stringify({opened: __opened, copied: __copied, shared: __shared, toasts: __toasts, status: document.getElementById('crop-status').textContent, errors: __errors})"))
    print('PASS', name, flush=True)


def stub(**kw):
    c.js("__opened.length = 0; __copied.length = 0; __shared.length = 0; __order.length = 0; __toasts.length = 0; "
         "__openResult = %s; __noClipboard = %s; __canShareFiles = %s; __copyFails = %s; 1" % (
             json.dumps(kw.get('open', 'tab')), json.dumps(kw.get('no_clipboard', False)),
             json.dumps(kw.get('can_share', False)), json.dumps(kw.get('copy_fails', False))))


def crop(page, x0, top0, x1, top1):
    """Region mode, then a real mouse drag over the page; the frame is given in PDF units from the page's top-left."""
    c.js(f"goToPhysicalPage({page}, {{instant: true}}); 1"); c.wait(f"state.currentIndex === {page}", timeout=10)
    c.wait(f"!!pdfPageWrappers[{page}].querySelector('.pdf-text-layer span')", timeout=10); pause(.5)
    c.js("document.getElementById('btn-region').click(); 1"); pause(.2)
    b = c.js(f"(b => ({{x: b.left, y: b.top, k: b.width / 600}}))(pdfPageWrappers[{page}].getBoundingClientRect())")
    ax, ay, bx, by = b['x'] + x0 * b['k'], b['y'] + top0 * b['k'], b['x'] + x1 * b['k'], b['y'] + top1 * b['k']
    c.call('Input.dispatchMouseEvent', type='mousePressed', x=ax, y=ay, button='left', clickCount=1)
    for i in range(1, 9):
        c.call('Input.dispatchMouseEvent', type='mouseMoved', x=ax + (bx - ax) * i / 8, y=ay + (by - ay) * i / 8, button='left', buttons=1)
    c.call('Input.dispatchMouseEvent', type='mouseReleased', x=bx, y=by, button='left', clickCount=1)
    c.wait("document.getElementById('crop-dialog').open && document.getElementById('crop-preview').naturalWidth > 0", timeout=10)


def press(sel):
    c.js(f"document.querySelector({json.dumps(sel)}).click(); 1"); pause(.3)


def query_of(i=0):
    u = urlparse(c.js(f"__opened[{i}].url"))
    assert u.scheme == 'https' and u.netloc == 'www.google.com' and u.path == '/search', u
    return parse_qs(u.query)['q'][0]


b64 = base64.b64encode(pdf_bytes()).decode()
c.js(f"""(() => {{ const bytes = Uint8Array.from(atob({b64!r}), c => c.charCodeAt(0));
  const dt = new DataTransfer(); dt.items.add(new File([bytes], 'crop-book.pdf', {{type: 'application/pdf'}}));
  const i = document.getElementById('file-upload'); i.files = dt.files; i.dispatchEvent(new Event('change')); }})()""")
c.wait("state.format === 'pdf' && pdfContinuousReady && !!state.pdfDoc", timeout=60)

# ---------------------------------------------------------------- the button replaced «Ask Gemini»
check('1 the crop dialog offers «Search the web» where «Ask Gemini» was, and Gemini is gone',
      """(() => { const ids = [...document.querySelectorAll('#crop-actions button')].map(b => b.id);
         return ids.includes('crop-web-search') && !ids.includes('crop-gemini') && ids.indexOf('crop-web-search') > ids.indexOf('crop-copy')
           && ids.indexOf('crop-web-search') < ids.indexOf('crop-ai') && !/gemini/i.test(document.getElementById('crop-actions').textContent); })()""")
check('1b its label is localized in every menu language', """(() => { const bad = [];
   for (const k of ['cropWebSearch','cropImageSearchPaste','cropImageSearchShare','cropImageSearchNoClipboard','webSearchBlocked'])
     for (const l of ['uk','en','fr','ru','zh','ko','hi','ga','es']) { const v = I18N[k] && I18N[k][l]; if (!v || v === k) bad.push(k + ':' + l); }
   return (bad.length === 0 && document.getElementById('crop-web-search').textContent.trim() === t('cropWebSearch')) || JSON.stringify(bad); })()""")

# ---------------------------------------------------------------- a crop with text: Google search for exactly that text
stub()
crop(7, 30, 25, 420, 105)   # the two top lines of page 7, nothing else
press('#crop-web-search')
check('2 one Google search tab is opened from the tap', "__opened.length === 1 && __opened[0].target === '_blank'")
q = query_of()
assert q == 'Hello world. PDF page 7. Reading text beside an illustration.', q
print('PASS 2b the query is exactly the text inside the frame:', q)
check('2c nothing is copied for a text search, and no message is left', "__copied.length === 0 && document.getElementById('crop-status').textContent === ''")
check('2d the opened tab cannot reach back into the app (opener cut)', "__opened.length === 1")
c.js("closeCropPreview(); 1")

stub()
crop(7, 30, 25, 420, 75)    # only the first line
press('#crop-web-search')
q = query_of()
assert q == 'Hello world. PDF page 7.', q
print('PASS 3 a smaller frame searches only its own line:', q)
c.js("closeCropPreview(); 1")

# ---------------------------------------------------------------- a crop without text: search by the image
stub()
crop(8, 60, 200, 260, 360)  # inside the blue illustration of page 8: no text
press('#crop-web-search')
check('4 no text in the frame: the image is copied as a real PNG and Google is opened to paste it',
      "__copied.length === 1 && __copied[0].type === 'image/png' && __copied[0].size > 200 && __opened.length === 1 && __opened[0].url === 'https://www.google.com/'", timeout=3)
check('4b the tab is opened BEFORE the clipboard write, inside the tap (a pop-up blocker eats it after an await)',
      "JSON.stringify(__order) === JSON.stringify(['open', 'copy'])", timeout=3)
check('4c the reader is told to paste', "document.getElementById('crop-status').textContent === t('cropImageSearchPaste')")

stub(no_clipboard=True, can_share=True); press('#crop-web-search')
check('5 no image clipboard: the share sheet gets the PNG instead, no tab', "__shared.length === 1 && __shared[0][0].type === 'image/png' && __opened.length === 0 && document.getElementById('crop-status').textContent === t('cropImageSearchShare')", timeout=3)
stub(no_clipboard=True); press('#crop-web-search')
check('5b neither clipboard nor sharing: a plain instruction, no tab', "__opened.length === 0 && __shared.length === 0 && document.getElementById('crop-status').textContent === t('cropImageSearchNoClipboard')")
stub(copy_fails=True); press('#crop-web-search')
check('5c a clipboard that refuses mid-write is reported', "document.getElementById('crop-status').textContent === t('cropImageSearchNoClipboard')", timeout=3)
stub(open='blocked'); press('#crop-web-search')
check('5d a blocked tab is reported (the image is still copied)', "__copied.length === 1 && document.getElementById('crop-status').textContent === t('webSearchBlocked')", timeout=3)
c.js("closeCropPreview(); 1")

# ---------------------------------------------------------------- the crop attached in Ask AI
c.js("state.activeAiProvider = 'gemini'; state.apiKey = 'test-key-not-real'; askSearchText = 'an older panel text'; 1")
stub()
crop(9, 30, 25, 420, 105)
press('#crop-ai')
check('6 Send to AI attaches the crop in Ask AI', "!document.getElementById('crop-dialog').open && !document.getElementById('ask-attachment').hidden && els.askPanel.classList.contains('expanded')", timeout=3)
press('#btn-web-search')
q = query_of()
assert q == 'Hello world. PDF page 9. Reading text beside an illustration.', q
print('PASS 6b 🔎 in Ask AI searches the attached crop, not the older panel text:', q)
check("6c nothing was sent to the AI by searching", "__ai.length === 0 || JSON.stringify(__ai)")

c.js("sendAskAttachment('What is this?'); 1")
check('7 after the answer (the crop is consumed) 🔎 still searches that crop', "document.getElementById('ask-attachment').hidden && els.askContent.textContent.includes('Answer about the crop')", timeout=8)
stub(); press('#btn-web-search')
q = query_of()
assert q == 'Hello world. PDF page 9. Reading text beside an illustration.', q
print('PASS 7b', q)

stub()
crop(10, 60, 200, 260, 360)
press('#crop-ai')
press('#btn-web-search')
check('8 a textless crop attached in Ask AI is searched by the image, the message shown as a toast',
      "__copied.length === 1 && __opened[0].url === 'https://www.google.com/' && __toasts.includes(t('cropImageSearchPaste'))", timeout=3)
c.js("document.getElementById('ask-attachment-remove').click(); 1")
stub(); c.js("askSearchText = 'plain panel text'; 1"); press('#btn-web-search')
assert query_of() == 'plain panel text'
print('PASS 9 with no crop attached 🔎 works as before (the panel text)')

# ---------------------------------------------------------------- the translation popup (owner, 2026-11-20)
c.js("els.askPanel.classList.remove('expanded'); 1"); pause(.6)
c.js("goToPhysicalPage(11, {instant: true}); 1"); c.wait("state.currentIndex === 11 && !!pdfPageWrappers[11].querySelector('.pdf-text-layer span')", timeout=10); pause(.6)
c.js("""(() => { const s = [...pdfPageWrappers[11].querySelectorAll('.pdf-text-layer span')].find(x => x.textContent.includes('Reading text'));
  const n = s.firstChild, i = n.nodeValue.indexOf('Reading'), r = document.createRange(); r.setStart(n, i); r.setEnd(n, n.nodeValue.indexOf('illustration.') + 13);
  const b = r.getBoundingClientRect(); return selectRangeAndTranslate(r, b.left + b.width / 2, b.top + b.height / 2, 'phrase_translation'); })()""")
pause(.8)
check('11 a selected sentence opens the translation popup with a 🔎 among its top icons (beside ✕)',
      """getComputedStyle(els.tooltip).display !== 'none' && /Reading/.test(els.ttOriginal.textContent) && (b => !!b && b.getBoundingClientRect().width > 0
        && b.parentElement === document.getElementById('tt-close-btn').parentElement && b.getAttribute('aria-label') === t('tWebSearch'))(document.getElementById('tt-web-search-btn')) || JSON.stringify([getComputedStyle(els.tooltip).display, els.ttOriginal.textContent, state.lastSelectionText])""", timeout=6)
stub(); shown = c.js("els.ttOriginal.textContent")
b = c.js("(b => ({x: b.left + b.width / 2, y: b.top + b.height / 2}))(document.getElementById('tt-web-search-btn').getBoundingClientRect())")
for kind in ('mousePressed', 'mouseReleased'):
    c.call('Input.dispatchMouseEvent', type=kind, x=b['x'], y=b['y'], button='left', clickCount=1)
pause(.3)
check('11b one Google tab, noopener', "__opened.length === 1 && /noopener/.test(__opened[0].features)")
assert query_of() == shown.strip(), (query_of(), shown)
print('PASS 11c it searches exactly what the popup shows:', shown)
check('11d tapping 🔎 is not read as a tapped word (popup text unchanged)', "els.ttOriginal.textContent === %s" % json.dumps(shown))

check('10 nothing threw', "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL CROP WEB SEARCH CHECKS PASSED')
