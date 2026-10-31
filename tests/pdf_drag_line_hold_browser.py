"""A finger drag in a PDF on a phone holds on to its line (js/selection.js, dragLine).

Owner (2026-10-30): «Проблеми з виділенням, виділяє більше чим потрібно» (PDF, long press and drag). On a phone a page fitted
to the screen has ~7 px lines 8 px apart, and a fingertip lands a few pixels lower than the reader aims: a drag from
«cuisinière» back to «une» on the same line ended on the «une» of the line BELOW and came out «cuisinière o une» (seen in
the owner's 📋 report, reproduced on the real textbook page). Now the end changes lines only once the finger is more than
a line height away from the middle of the line it is on.

Checks (phone screen, touch): a backwards drag with the finger up to 0.9 line height too low stays on its line; a finger
on the middle of the next line does reach it; a drag over three lines still selects all three; a mouse is not held.
"""
import base64, json, os, time
from browser_cdp import CDP
from pdf_audit_fixtures import pdf_document

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=412, height=915, deviceScaleFactor=2.625, mobile=True)
c.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)

LINES = [('a. Quel article cherche Nadia ?', 60, 700, 10), ('o une cuisine', 70, 685, 9), ('o une table de bureau', 70, 674, 9),
         ('o un frigo moderne', 70, 663, 9), ('Fin de la liste.', 60, 640, 10)]
PDF = pdf_document([{'lines': LINES}])


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.monotonic() + timeout
    while result is not True and time.monotonic() < deadline:
        time.sleep(0.1)
        result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof openBookFile==='function'", timeout=30)
c.js("localStorage.clear(); localStorage.setItem('reader_onboarding_done','1'); 1")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof openBookFile==='function'", timeout=30)
c.js("showUpdateBanner=()=>{}; callAI = async () => { throw new Error('offline'); }; 1")
c.js("window.__ok=0; openBookFile(new File([Uint8Array.from(atob(%s), ch => ch.charCodeAt(0))], 'liste.pdf', {type:'application/pdf', lastModified: 79})).then(() => { window.__ok=1; }); 1"
     % json.dumps(base64.b64encode(PDF).decode()))
c.wait("window.__ok===1 && state.format==='pdf' && pdfContinuousReady && !!document.querySelector('.pdf-page-wrapper[data-page=\"1\"] .pdf-text-layer span')", timeout=30)
time.sleep(1)
c.js("if (!state.translateMode) els.translateBtn.click(); window.__sent=[]; const o=handleWordOrSelection; handleWordOrSelection=function(t,...a){ __sent.push(t); return o.call(this,t,...a); }; 1")


def box(text, nth=0):
    return c.js(r"""((w, nth) => { const it = document.createTreeWalker(document.querySelector('.pdf-page-wrapper[data-page="1"] .pdf-text-layer'), NodeFilter.SHOW_TEXT); let n, out = [];
      while ((n = it.nextNode())) { let k = -1; while ((k = n.nodeValue.indexOf(w, k + 1)) >= 0) { const r = document.createRange(); r.setStart(n, k); r.setEnd(n, k + w.length);
        const b = r.getBoundingClientRect(); out.push({l: b.left, r: b.right, t: b.top, b: b.bottom, h: b.height, cx: (b.left + b.right) / 2, cy: (b.top + b.bottom) / 2}); } } return out[nth] || null; })(%s, %d)""" % (json.dumps(text), nth))


c.js("""(() => { const s = [...document.querySelectorAll('.pdf-page-wrapper[data-page="1"] .pdf-text-layer span')].find(x => x.textContent.includes('une cuisine')); s.scrollIntoView({block: 'center'}); return 1; })()""")
time.sleep(0.8)
cuisine, une1, une2 = box('cuisine'), box('une cuisine'), box('une table')
assert cuisine['h'] < 12 and une2['cy'] - une1['cy'] < 1.6 * une1['h'], ('the lines are not phone-small and close', une1, une2)
print('   line height %.1f px, next line %.1f px below' % (une1['h'], une2['cy'] - une1['cy']), flush=True)
pt = lambda x, y: [{'x': x, 'y': y, 'id': 1}]


def touch_drag(a, b):
    c.js("clearSelectionHighlight(); els.tooltip.style.display='none'; window.__sent=[]; 1"); time.sleep(0.3)
    c.call('Input.dispatchTouchEvent', type='touchStart', touchPoints=pt(*a)); time.sleep(0.55)
    for s in range(1, 11):
        c.call('Input.dispatchTouchEvent', type='touchMove', touchPoints=pt(a[0] + (b[0] - a[0]) * s / 10, a[1] + (b[1] - a[1]) * s / 10)); time.sleep(0.02)
    c.call('Input.dispatchTouchEvent', type='touchEnd', touchPoints=[]); time.sleep(0.9)
    return c.js("__sent.slice(-1)[0] || ''")


start = (cuisine['cx'], cuisine['cy'])
for low in (0, 0.5, 0.9):
    got = touch_drag(start, (une1['l'] + 3, une1['cy'] + low * une1['h']))
    assert got == 'une cuisine', (low, got)
    print('PASS 1 a backwards drag with the finger %.1f line height low stays on its line: «%s»' % (low, got), flush=True)

got = touch_drag(start, (une2['l'] + 3, une2['cy']))
assert got == 'cuisine o une', got
print('PASS 2 the finger on the middle of the next line does reach it: «%s»' % got, flush=True)

frigo = box('frigo')
got = touch_drag((une1['l'] + 3, une1['cy']), (frigo['cx'], frigo['cy']))
assert got == 'une cuisine o une table de bureau o un frigo', got
print('PASS 3 a drag down over three lines selects all three', flush=True)

# A mouse is precise: it is not held on its line.
c.call('Emulation.setTouchEmulationEnabled', enabled=False)
c.js("clearSelectionHighlight(); els.tooltip.style.display='none'; window.__sent=[]; 1"); time.sleep(0.3)
a, b = (cuisine['cx'], cuisine['cy']), (une2['l'] + 3, une2['t'] + 1)
c.call('Input.dispatchMouseEvent', type='mousePressed', x=a[0], y=a[1], button='left', buttons=1, clickCount=1)
for s in range(1, 11):
    c.call('Input.dispatchMouseEvent', type='mouseMoved', x=a[0] + (b[0] - a[0]) * s / 10, y=a[1] + (b[1] - a[1]) * s / 10, button='left', buttons=1)
c.call('Input.dispatchMouseEvent', type='mouseReleased', x=b[0], y=b[1], button='left', buttons=0, clickCount=1)
check("4 a mouse at the top of the next line's word reaches it (only a finger is held)", "__sent.slice(-1)[0] === 'cuisine o une' || __sent.slice(-1)[0]", timeout=2)
print('ALL PDF DRAG LINE HOLD CHECKS PASSED')
