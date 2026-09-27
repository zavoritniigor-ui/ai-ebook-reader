"""Astra audit A10: the reader font size (text formats) has ONE range -- READER_FONT_MIN..READER_FONT_MAX in
js/core.js -- for A-/A+ and for restoring the saved preference. A+ used to grow without limit (58 px observed)
while restoration accepted only 12..40, so after a reload an out-of-range value fell back to the default 18 px.
Now A-/A+ stop exactly at the limits (and are disabled there), and a saved value outside the range is clamped to
the nearest limit. In PDF mode the same buttons zoom the page and stay enabled.
"""
import base64, os, time
from browser_cdp import CDP, pdf_bytes

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1400, height=900, deviceScaleFactor=1, mobile=False)


def load(saved=None):
    """(Re)load the reader. `saved`: the stored font size the NEW document finds at boot ('' = none). It is written
    before the app's scripts run, because the old page's pagehide handler saves the live size on the way out."""
    script = None
    if saved is not None:
        body = "localStorage.removeItem('reader_font_size')" if saved == '' else "localStorage.setItem('reader_font_size', %r)" % saved
        script = c.call('Page.addScriptToEvaluateOnNewDocument', source=body)['identifier']
    c.call('Page.navigate', url=URL)
    c.wait("document.readyState==='complete' && !document.body.inert && typeof setReaderFontSize==='function'", timeout=30)
    if script:
        c.call('Page.removeScriptToEvaluateOnNewDocument', identifier=script)
    c.js("showUpdateBanner = () => {}; document.getElementById('sw-update-banner')?.remove(); 1")


def check(name, expression, timeout=0):
    deadline = time.monotonic() + timeout
    result = c.js(expression)
    while result is not True and time.monotonic() < deadline:
        time.sleep(.1); result = c.js(expression)
    assert result is True, (name, result, c.js("JSON.stringify({size: state.fontSize, stored: localStorage.getItem('reader_font_size'), css: els.pages.style.fontSize, inDisabled: document.getElementById('zoom-in').disabled, outDisabled: document.getElementById('zoom-out').disabled, format: state.format})"))
    print('PASS', name, flush=True)


def click(sel, times=1):
    for _ in range(times):
        b = c.js("(r => ({x: r.left + r.width / 2, y: r.top + r.height / 2}))(document.querySelector(%r).getBoundingClientRect())" % sel)
        for kind in ('mousePressed', 'mouseReleased'):
            c.call('Input.dispatchMouseEvent', type=kind, x=b['x'], y=b['y'], button='left', clickCount=1)
        c.js('new Promise(r => setTimeout(r, 40))')


def open_file(data, name, mime, ready):
    b64 = base64.b64encode(data).decode()
    c.js("""(() => { const bytes = Uint8Array.from(atob(%r), c => c.charCodeAt(0));
      const dt = new DataTransfer(); dt.items.add(new File([bytes], %r, {type: %r}));
      const i = document.getElementById('file-upload'); i.files = dt.files; i.dispatchEvent(new Event('change')); return 1; })()""" % (b64, name, mime))
    c.wait(ready, timeout=40); c.js('new Promise(r => setTimeout(r, 500))')


STATE = "(s => state.fontSize === s && els.pages.style.fontSize === s + 'px')"
TXT = ('Chapter one. ' + 'A reader line of text for pagination. ' * 30 + '\n') * 40

load('')
check('fresh start: default size, limits consistent with core.js', "state.fontSize === READER_FONT_DEFAULT && READER_FONT_MIN === 12 && READER_FONT_MAX === 40 && !document.getElementById('zoom-in').disabled && !document.getElementById('zoom-out').disabled")
open_file(TXT.encode(), 'font.txt', 'text/plain', "state.format === 'txt'")

click('#zoom-in', 20)
check('repeated A+ stops exactly at the maximum (40 px), saved as 40', STATE + "(40) && localStorage.getItem('reader_font_size') === '40'")
check('at the maximum A+ is disabled, A- is not', "document.getElementById('zoom-in').disabled && !document.getElementById('zoom-out').disabled")
c.js("document.getElementById('zoom-in').click(); 1")
check('a further A+ (even a programmatic click) does not go past 40', STATE + "(40)")

click('#zoom-out', 30)
check('repeated A- stops exactly at the minimum (12 px), saved as 12', STATE + "(12) && localStorage.getItem('reader_font_size') === '12'")
check('at the minimum A- is disabled, A+ is not', "document.getElementById('zoom-out').disabled && !document.getElementById('zoom-in').disabled")

click('#zoom-in', 6)   # 12 -> 24
check('a valid size in between: 24 px, both buttons enabled', STATE + "(24) && !document.getElementById('zoom-in').disabled && !document.getElementById('zoom-out').disabled")
load()
check('valid saved value survives a reload (24 px)', STATE + "(24) && !document.getElementById('zoom-in').disabled && !document.getElementById('zoom-out').disabled")

load('58')   # what older builds could save
check('saved value above the maximum restores as the maximum (58 -> 40), not the default', STATE + "(40)")
check('... and the controls agree after the reload: A+ disabled, A- enabled', "document.getElementById('zoom-in').disabled && !document.getElementById('zoom-out').disabled")
load('8')
check('saved value below the minimum restores as the minimum (8 -> 12)', STATE + "(12) && document.getElementById('zoom-out').disabled && !document.getElementById('zoom-in').disabled")
load('13')
check('a valid odd value is kept as saved (13)', STATE + "(13)")
open_file(TXT.encode(), 'font.txt', 'text/plain', "state.format === 'txt'")
click('#zoom-in', 20)
check('... and stepping from it still stops exactly at 40', STATE + "(40)")
load('not-a-number')
check('an unreadable saved value falls back to the default (18)', STATE + "(18)")

# PDF mode: the same buttons zoom the page and must stay usable even when the text font is at a limit
load('40')
open_file(pdf_bytes(), 'font.pdf', 'application/pdf', "state.format === 'pdf' && pdfContinuousReady")
check('PDF mode: A+ is enabled although the text font is at its maximum', "!document.getElementById('zoom-in').disabled && !document.getElementById('zoom-out').disabled")
z = c.js('pdfBaseScale() * state.pdfZoom'); click('#zoom-in')
check('PDF mode: A+ still zooms the PDF and leaves the text font alone', f"pdfBaseScale() * state.pdfZoom > {z} + 0.2 && state.fontSize === 40", timeout=3)
open_file(TXT.encode(), 'font.txt', 'text/plain', "state.format === 'txt'")
check('back to a text book: the limit state is restored (A+ disabled at 40)', "document.getElementById('zoom-in').disabled && state.fontSize === 40")
print('ALL READER FONT SIZE CHECKS PASSED')
