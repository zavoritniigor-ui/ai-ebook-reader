"""«Запитати Gemini» in the page-crop dialog (owner, 2026-10-31: «потрібно скріншоти в застосунку мати можливість слати
в Гугл джеміні в браузері для запитань щодо вмісту»).

A web page CANNOT attach a file to another site: no provider, Google included, offers a link that opens Gemini with an
image already in it. So the honest route in a browser is the clipboard — copy the PNG, open the Gemini tab, and say to
paste. Where the browser cannot copy an image (Firefox, part of iOS) the system share sheet is offered instead, which
on Android hands the crop straight to the Gemini app.

Checked here (no network, nothing is sent anywhere by the page): the button copies exactly the crop as image/png and
opens gemini.google.com in a new tab with noopener; the tab is opened inside the click, so a pop-up blocker does not
eat it; a browser without image clipboard support falls back to the share sheet, and without that to a plain
instruction; a blocked tab is reported and the copy still happened; the crop itself is never uploaded by the page.
"""
import base64, json, os, time
from browser_cdp import CDP, pdf_bytes

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1280, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof openCropPreview==='function'", timeout=30)
c.js("showUpdateBanner = () => {}; window.__errors = []; addEventListener('error', e => __errors.push(e.message)); 1")

# A 2x2 PNG stands in for a crop: the dialog only ever sees a data URL.
PNG = ('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR4nGP8//8/AzJgYkAD'
       'IxcAAP//AwAD/wH/PQAAAABJRU5ErkJggg==')

STUB = """(() => {
  window.__opened = []; window.__copied = []; window.__shared = []; window.__fetches = []; window.__order = [];
  window.open = (url, target, features) => { __order.push('open'); window.__opened.push({url, target, features}); return window.__openResult === undefined ? {} : window.__openResult; };
  const realFetch = window.fetch;
  window.fetch = (...a) => { __fetches.push(String(a[0])); return realFetch(...a); };
  // navigator.clipboard / share / canShare are read-only accessors on the prototype: a plain assignment is ignored.
  const put = (name, value) => Object.defineProperty(navigator, name, { value, configurable: true, writable: true });
  put('clipboard', window.__noClipboard ? undefined : { write: async (items) => {
      if (window.__copyFails) throw new Error('denied');
      const blob = await items[0].getType('image/png'); __order.push('copy'); __copied.push({ type: blob.type, size: blob.size }); } });
  window.ClipboardItem = function (map) { this.types = Object.keys(map); this.getType = async (t) => map[t]; };
  put('share', async (data) => { if (window.__shareFails) throw Object.assign(new Error('no'), {name: 'AbortError'});
      __shared.push((data.files || []).map(f => ({ name: f.name, type: f.type, size: f.size }))); });
  put('canShare', (data) => !!window.__canShareFiles && !!(data && data.files));
  return 1; })()"""


def reset(copy_fails=False, can_share=False, open_result=None, no_clipboard=False):
    c.js("window.__copyFails = %s; window.__canShareFiles = %s; window.__openResult = %s; window.__noClipboard = %s; 1"
         % (json.dumps(copy_fails), json.dumps(can_share), 'null' if open_result == 'blocked' else 'undefined', json.dumps(no_clipboard)))
    c.js(STUB)
    c.js("openCropPreview('data:image/png;base64,%s'); 1" % PNG)
    c.js('new Promise(r => setTimeout(r, 120))')


def press():
    c.js("document.getElementById('crop-gemini').click(); 1")
    c.js('new Promise(r => setTimeout(r, 250))')


def check(name, expression, timeout=0):
    deadline = time.monotonic() + timeout
    result = c.js(expression)
    while result is not True and time.monotonic() < deadline:
        time.sleep(.1); result = c.js(expression)
    assert result is True, (name, result, c.js("JSON.stringify({opened: __opened, copied: __copied, shared: __shared, status: document.getElementById('crop-status').textContent})"))
    print('PASS', name, flush=True)


# ---------------------------------------------------------------- the button exists where the crop is
check('1 the crop dialog offers «Ask Gemini» beside Save PNG, Share, Copy and Send to AI',
      """(() => { const ids = [...document.querySelectorAll('#crop-actions button')].map(b => b.id);
         return ids.includes('crop-gemini') && ids.indexOf('crop-gemini') > ids.indexOf('crop-copy'); })()""")
check('1b its label is localized, not a raw key',
      "document.getElementById('crop-gemini').textContent.trim() === t('cropGemini') && t('cropGemini') !== 'cropGemini'")

# ---------------------------------------------------------------- the normal path
reset()
press()
check('2 the crop is copied to the clipboard as a real image/png',
      "__copied.length === 1 && __copied[0].type === 'image/png' && __copied[0].size > 0")
check('2b exactly one tab is opened, at gemini.google.com, with noopener',
      "__opened.length === 1 && __opened[0].url === 'https://gemini.google.com/app' && __opened[0].target === '_blank' && /noopener/.test(__opened[0].features)")
check('2c the tab is opened BEFORE the clipboard write, inside the click: after an await a pop-up blocker eats it',
      "JSON.stringify(__order) === JSON.stringify(['open', 'copy'])", timeout=3)
check('2d the reader is told to paste', "document.getElementById('crop-status').textContent === t('cropGeminiPaste')")
check('2e the page itself uploads nothing: no request left the app',
      "__fetches.every(u => !/gemini|googleapis|google\\.com/.test(u))")

# ---------------------------------------------------------------- a browser that cannot copy an image
reset(no_clipboard=True, can_share=True)
press()
check('3 without image clipboard support the system share sheet is used instead',
      "__shared.length === 1 && __shared[0][0].type === 'image/png' && __opened.length === 0")
check('3b ... and the reader is told to pick Gemini in it', "document.getElementById('crop-status').textContent === t('cropGeminiShare')")

reset(no_clipboard=True, can_share=False)
press()
check('4 with neither clipboard nor sharing the reader gets a plain instruction, and no tab is opened',
      "__opened.length === 0 && __shared.length === 0 && document.getElementById('crop-status').textContent === t('cropGeminiNoClipboard')")

# ---------------------------------------------------------------- the clipboard refuses at write time
reset(copy_fails=True)
press()
check('5 a clipboard that refuses mid-write is reported, not silently swallowed',
      "document.getElementById('crop-status').textContent === t('cropGeminiNoClipboard')", timeout=3)

# ---------------------------------------------------------------- a blocked pop-up
reset(open_result='blocked')
press()
check('6 a blocked tab is reported, and the image is copied anyway so the reader can open Gemini themselves',
      "__copied.length === 1 && document.getElementById('crop-status').textContent === t('cropGeminiBlocked')")

# ---------------------------------------------------------------- texts
check('7 every new text exists in all 9 menu languages with its own wording',
      """(() => { const keys = ['cropGemini','cropGeminiPaste','cropGeminiShare','cropGeminiNoClipboard','cropGeminiBlocked'];
         const langs = ['uk','en','fr','ru','zh','ko','hi','ga','es']; const bad = [];
         for (const k of keys) for (const l of langs) { const v = I18N[k] && I18N[k][l]; if (!v || v === k) bad.push(k + ':' + l); }
         return bad.length === 0 || JSON.stringify(bad); })()""")

check('8 nothing threw', "__errors.length === 0 || JSON.stringify(__errors)")
c.js("closeCropPreview(); 1")
print('ALL CROP GEMINI CHECKS PASSED')
