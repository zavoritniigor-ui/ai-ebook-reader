"""A grey tapped word must not widen subsequent PDF drags.
Real PDF.js text items, mouse/pen input, both directions and one/two columns.
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
COLUMNS = [('The first sentence.', 350, 700, 10), ('The second sentence.', 350, 685, 9), ('Another sentence here.', 350, 674, 9), ('The last sentence.', 350, 663, 9)]


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
c.js('window.__originalLookup = handleWordOrSelection; 1')
for columns in (COLUMNS, []):
    PDF = pdf_document([{'lines': LINES + columns}])
    c.js("window.__ok=0; openBookFile(new File([Uint8Array.from(atob(%s), ch => ch.charCodeAt(0))], 'liste.pdf', {type:'application/pdf', lastModified: 79})).then(() => { window.__ok=1; }); 1"
         % json.dumps(base64.b64encode(PDF).decode()))
    c.wait("window.__ok===1 && state.format==='pdf' && pdfContinuousReady && !!document.querySelector('.pdf-page-wrapper[data-page=\"1\"] .pdf-text-layer span')", timeout=30)
    time.sleep(1)
    c.js("if (!state.translateMode) els.translateBtn.click(); window.__sent=[]; handleWordOrSelection=function(t,...a){ __sent.push(t); return window.__originalLookup.call(this,t,...a); }; 1")


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


    def input_drag(a, b, pointer):
        # Let real pointerdown close/unwrap the preceding selection. Manual
        # cleanup here would hide disconnected anchors on repeated drags.
        c.js("window.__sent=[]; 1"); time.sleep(.3)
        c.call('Input.dispatchMouseEvent', type='mousePressed', x=a[0], y=a[1], button='left', buttons=1, clickCount=1, pointerType=pointer)
        for step in range(1, 11):
            x, y = a[0] + (b[0] - a[0]) * step / 10, a[1] + (b[1] - a[1]) * step / 10
            c.call('Input.dispatchMouseEvent', type='mouseMoved', x=x, y=y, button='left', buttons=1, pointerType=pointer)
            time.sleep(.02)
        c.call('Input.dispatchMouseEvent', type='mouseReleased', x=b[0], y=b[1], button='left', buttons=0, clickCount=1, pointerType=pointer)
        time.sleep(.9)
        return c.js("__sent.at(-1) || ''")


    # Tap middle word before dragging from either side.
    mid = box('table')
    c.call('Input.dispatchTouchEvent', type='touchStart', touchPoints=pt(mid['cx'],mid['cy']))
    c.call('Input.dispatchTouchEvent', type='touchEnd', touchPoints=[])
    time.sleep(.8)
    check('tap marks the middle word grey', "[...document.querySelectorAll('.word-visited')].some(x=>x.textContent==='table')")
    for pointer in ('mouse', 'pen'):
        for first, last in [('de', 'bureau'), ('bureau', 'de'), ('une', 'bureau'), ('bureau', 'une'), ('une', 'table'), ('table', 'une')]:
            a, b = box(first, 1 if first == 'une' else 0), box(last, 1 if last == 'une' else 0)
            forward = a['cx'] < b['cx']
            got = input_drag((a['l'] + 1 if forward else a['r'] - 1, a['cy']),
                             (b['r'] - 1 if forward else b['l'] + 1, b['cy']), pointer)
            print('DRAG', pointer, first, last, repr(got), 'state', c.js("({text:state.lastSelectionText, canonical:state.canonicalSelection?.text})"), flush=True)
            expected = 'de bureau' if 'de' in (first,last) else 'une table' if 'table' in (first,last) else 'une table de bureau'
            assert got == expected, (first, last, got, expected)
            check('visible selection matches the requested words', "state.selSpans.map(s=>s.textContent).join('') === " + json.dumps(expected))
