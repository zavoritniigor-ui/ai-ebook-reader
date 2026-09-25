"""PDF workspace / selection regressions found on the real "Complete French All-in-One" (PR #122), each driven
through the real controls and real input events:

  A  a paradigm-table row whose long gloss narrows the gutter ("tu es  you are (familiar, singular)  vous êtes")
     must not fuse into the left column: a drag down the French cells selects only them (mouse)
  B  a touch long-press drag keeps extending the selection when the finger moves (it used to be cancelled by
     native scrolling on the first move) and stays in its column
  C  an expanded Practice worksheet overlays the book: it must not squeeze the book to ~0px; minimising Practice
     to its bookmark tab must not make Grammar reserve its width twice, nor after Grammar is closed
  D  the A+ zoom button keeps the reading position (anchor captured before the live transform)
  E  in immersive mode the floating navigation pill is entirely off-screen
"""
import base64, json, os, time
from browser_cdp import CDP, pdf_bytes
from pdf_audit_fixtures import pdf_document

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP()
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)

def pause(s): c.js(f'new Promise(r=>setTimeout(r,{int(s * 1000)}))')

def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.monotonic() + timeout
    while result is not True and time.monotonic() < deadline:
        pause(.1); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name)

def settle(s=0.9):
    pause(s)
    c.wait('pdfInFlightRenders===0', timeout=15)

def boot(width, height, mobile):
    c.call('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=1, mobile=mobile)
    c.call('Emulation.setTouchEmulationEnabled', enabled=mobile, maxTouchPoints=5 if mobile else 1)
    c.call('Page.navigate', url=URL)
    c.wait("document.readyState==='complete' && !document.body.inert && typeof navigateToPdfPage==='function'", timeout=30)
    c.js("localStorage.clear(); state.pdfScale = 1; state.pdfZoom = 1; showUpdateBanner=()=>{}; document.getElementById('sw-update-banner')?.remove(); window.__errors=[]; addEventListener('error', e => __errors.push(e.message))")

def upload(data):
    b64 = base64.b64encode(data).decode()
    c.js("if (typeof pdfContinuousReady !== 'undefined') pdfContinuousReady = false")
    c.js(f"""(() => {{ const bytes = Uint8Array.from(atob('{b64}'), ch => ch.charCodeAt(0));
      const dt = new DataTransfer(); dt.items.add(new File([bytes], 'fixture.pdf', {{type: 'application/pdf'}}));
      const input = document.getElementById('file-upload'); input.files = dt.files; input.dispatchEvent(new Event('change')); }})()""")
    c.wait("state.format==='pdf' && pdfContinuousReady && !!state.pdfDoc", timeout=30)
    pause(1)

def paradigm_pdf():
    """One page: a conjugation paradigm laid out like the real p.208 -- four cells per row, the SECOND row's
    English gloss long enough to narrow the gutter before "vous êtes" to about two line heights."""
    rows = [('je suis', 'I am', 'nous sommes', 'we are'),
            ('tu es', 'you are (familiar, singular)', 'vous êtes', 'you are'),
            ('il est', 'he is', 'ils sont', 'they are')]
    def enc(t): return t.encode('cp1252').replace(b'\\', b'\\\\').replace(b'(', b'\\(').replace(b')', b'\\)')
    ops = [b'BT 60 720 Td /F1 12 Tf (' + enc('The verb etre (to be) is irregular.') + b') Tj ET']
    y = 680
    for row in rows:
        for x, text in zip((60, 140, 330, 430), row):
            ops.append(b'BT %d %d Td /F1 12 Tf (' % (x, y) + enc(text) + b') Tj ET')
        y -= 22
    stream = b'\n'.join(ops)
    objs = [b'<< /Type /Catalog /Pages 2 0 R >>', b'<< /Type /Pages /Count 1 /Kids [4 0 R] >>',
            b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
            b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R >>',
            b'<< /Length %d >>\nstream\n' % len(stream) + stream + b'\nendstream']
    data = b'%PDF-1.4\n'; offsets = []
    for i, obj in enumerate(objs, 1):
        offsets.append(len(data)); data += f'{i} 0 obj\n'.encode() + obj + b'\nendobj\n'
    xref = len(data)
    data += f'xref\n0 {len(objs) + 1}\n0000000000 65535 f \n'.encode() + b''.join(f'{o:010d} 00000 n \n'.encode() for o in offsets)
    return data + f'trailer << /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF'.encode()

CELL = """((text) => { const s = [...document.querySelectorAll('.pdf-page-wrapper[data-page="1"] .pdf-text-layer span')].find(x => x.textContent.trim() === text);
  const b = s.getBoundingClientRect(); return {x: b.left + 4, y: b.top + b.height / 2}; })"""

def learning_on():
    c.js("callAI = async () => { throw new Error('stubbed') }; window.fetch = async () => { throw new Error('offline') }")
    if not c.js('state.translateMode'):
        c.js('els.translateBtn.click()')
        settle(0.6)

# ---------------------------------------------------------------- A: narrow-gutter row, mouse
boot(1000, 900, False)
upload(paradigm_pdf())
learning_on()
check('A1 the narrow-gutter row splits at the column edge the other rows confirm', """(() => {
  const layer = document.querySelector('.pdf-page-wrapper[data-page="1"] .pdf-text-layer'); const spans = pdfTextSpans(layer);
  const r = pdfComputeColumns(spans, layer.getBoundingClientRect().width); const col = t => r.segColumn[r.spanSeg[spans.findIndex(s => s.textContent.trim() === t)]];
  return col('tu es') === col('je suis') && col('vous êtes') === col('nous sommes') && col('vous êtes') !== col('tu es'); })()""")
a = c.js(CELL + "('je suis')"); b = c.js(CELL + "('il est')")
c.call('Input.dispatchMouseEvent', type='mouseMoved', x=a['x'], y=a['y'])
c.call('Input.dispatchMouseEvent', type='mousePressed', x=a['x'], y=a['y'], button='left', clickCount=1)
for i in range(1, 11):
    c.call('Input.dispatchMouseEvent', type='mouseMoved', x=a['x'] + (b['x'] + 20 - a['x']) * i / 10, y=a['y'] + (b['y'] - a['y']) * i / 10, button='left', buttons=1)
    pause(.02)
check('A2 live highlight stays in the French column', """(() => { const hl = CSS.highlights.get(SEL_HL_NAME); if (!hl || !hl.size) return 'no highlight';
  const edge = [...document.querySelectorAll('.pdf-text-layer span')].find(s => s.textContent.trim() === 'I am').getBoundingClientRect().left;
  return [...hl].every(r => r.getBoundingClientRect().right <= edge + 1) || [...hl].map(r => r.toString()); })()""")
c.call('Input.dispatchMouseEvent', type='mouseReleased', x=b['x'] + 20, y=b['y'], button='left', clickCount=1)
pause(.5)
check('A3 the selection is the French cells only', "(() => { const t = state.canonicalSelection?.text || ''; return (t.includes('je suis') && t.includes('tu es') && t.includes('il est') && !/vous|êtes|you are|I am/.test(t)) || t; })()")

# ---------------------------------------------------------------- B: touch long-press drag
c.js("try { CSS.highlights.delete(SEL_HL_NAME) } catch (e) {}; state.canonicalSelection = null; els.tooltip.style.display = 'none'")
boot(1000, 900, True)
upload(paradigm_pdf())
learning_on()
a = c.js(CELL + "('je suis')"); b = c.js(CELL + "('il est')")
scroll_before = c.js('els.container.scrollTop')
c.js("""window.__touchLog=[]; for (const t of ['pointerdown','pointerup','pointercancel','touchstart','touchend','touchcancel','contextmenu','selectstart'])
  document.addEventListener(t, e => __touchLog.push([t, e.pointerType || '', (e.target.className || e.target.tagName || '').toString().slice(0, 30), Math.round(performance.now()), e.cancelable]), {capture: true}); 1""")
c.call('Input.dispatchTouchEvent', type='touchStart', touchPoints=[dict(x=a['x'], y=a['y'], id=1)])
# Real fingers move during the hold: stay inside the reader's 18px jitter budget,
# but cross Chrome's native scroll slop before the long-press timer expires.
for offset in (4, 8, 12, 16):
    c.call('Input.dispatchTouchEvent', type='touchMove', touchPoints=[dict(x=a['x'], y=a['y'] + offset, id=1)])
    pause(.04)
pause(.4)
if not c.js('state.touchSelecting === true'):
    pause(1)
    print('B1 DIAG', c.js("""({events: __touchLog, touchSelecting: state.touchSelecting, timer: touchSelTimer !== null, dragSel: !!dragSel,
      translateMode: state.translateMode, justCommitted: state.touchJustCommitted || null, now: Math.round(performance.now()),
      word: !!wordBoundsAt(%f, %f), under: (e => e && (e.className || e.tagName))(document.elementFromPoint(%f, %f)),
      touchPoints: navigator.maxTouchPoints, pointers: typeof pdfPointers !== 'undefined' ? pdfPointers.size : null})""" % (a['x'], a['y'], a['x'], a['y'])))
check('B1 long-press starts a touch selection', 'state.touchSelecting === true', timeout=3)
for i in range(1, 11):
    c.call('Input.dispatchTouchEvent', type='touchMove', touchPoints=[dict(x=a['x'] + (b['x'] + 20 - a['x']) * i / 10, y=a['y'] + (b['y'] - a['y']) * i / 10, id=1)])
    pause(.03)
check('B2 finger movement extends the selection instead of scrolling it away',
      f"state.touchSelecting === true && Math.abs(els.container.scrollTop - {scroll_before}) < 1 && (CSS.highlights.get(SEL_HL_NAME)?.size || 0) >= 3")
c.call('Input.dispatchTouchEvent', type='touchEnd', touchPoints=[])
pause(.6)
check('B3 touch selection covers the dragged French cells only and opens the popup',
      "(() => { const t = state.canonicalSelection?.text || ''; return (t.includes('je suis') && t.includes('il est') && !/vous|you are/.test(t) && getComputedStyle(els.tooltip).display !== 'none') || t; })()")

# Touch lifecycle checks use the same real PDF text layer, with fresh gestures after
# each terminal event. No direct calls to selection functions or fabricated ranges.
def touch(kind, point=None):
    c.call('Input.dispatchTouchEvent', type=kind, touchPoints=[] if point is None else [dict(x=point['x'], y=point['y'], id=1)])

def fresh_touch_page():
    boot(1000, 900, True)
    upload(paradigm_pdf())
    learning_on()

fresh_touch_page()
a = c.js(CELL + "('il est')"); b = c.js(CELL + "('je suis')")
# Touch input must extend the range without depending on a parallel pointermove
# stream. Physical browsers may coalesce these streams differently from CDP.
c.js("document.addEventListener('pointermove', e => { if(e.pointerType === 'touch') e.stopImmediatePropagation(); }, true)")
scroll_before = c.js('els.container.scrollTop')
touch('touchStart', a); pause(.45)
for i in range(1, 11):
    touch('touchMove', dict(x=b['x'] + 20, y=a['y'] + (b['y'] - a['y']) * i / 10)); pause(.03)
touch('touchEnd'); pause(.3)
check('B4 reverse touch-only drag retains the original anchor and column',
      "(() => {const t=state.canonicalSelection?.text || ''; return t.includes('je suis') && t.includes('il est') && !t.includes('you are') && !state.touchSelecting;})()")
check('B5 reverse selection does not scroll', f' Math.abs(els.container.scrollTop - {scroll_before}) < 1')

fresh_touch_page()
# Select a full sentence by actual glyph coordinates, ending at its last word.
points = c.js("""(() => {
 const s=[...document.querySelectorAll('.pdf-text-layer span')].find(s=>s.textContent.includes('The verb etre'));
 const n=s.firstChild; const point=(start,end)=>{const r=document.createRange(); r.setStart(n,start); r.setEnd(n,end); const b=r.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2};};
 return [point(0,3),point(n.length-10,n.length-1)];})()""")
touch('touchStart', points[0]); pause(.45)
for i in range(1, 13):
    touch('touchMove', dict(x=points[0]['x']+(points[1]['x']-points[0]['x'])*i/12, y=points[0]['y'])); pause(.02)
touch('touchEnd'); pause(.3)
check('B6 sentence remains selected on release', "state.lastSelectionText.startsWith('The verb etre (to be) is irregular') && !!state.lastSelectedRange && !state.touchSelecting")

for cancel_type in ('touchcancel', 'pointercancel'):
    fresh_touch_page()
    a = c.js(CELL + "('je suis')")
    touch('touchStart', a); pause(.45)
    check('hold active before ' + cancel_type, 'state.touchSelecting === true')
    # Isolate each cancellation event; CDP touchCancel normally emits both.
    c.js("document.dispatchEvent(new Event(%s, {bubbles:true}))" % json.dumps(cancel_type))
    check('B7 ' + cancel_type + ' clears active drag and scroll locks',
          "!state.touchSelecting && !state.dragRange && !dragSel && !touchSelTimer && !document.body.classList.contains('touch-selecting') && els.container.style.touchAction === ''")
    touch('touchCancel')

fresh_touch_page()
a = c.js(CELL + "('je suis')")
touch('touchStart', a); pause(.45)
c.call('Input.dispatchTouchEvent', type='touchStart', touchPoints=[dict(x=a['x'], y=a['y'], id=1), dict(x=a['x']+90, y=a['y']+50, id=2)])
check('B7 second finger cancels selection and releases its locks for pinch',
      "!state.touchSelecting && !state.dragRange && !dragSel && !touchSelTimer && !document.body.classList.contains('touch-selecting')")
touch('touchCancel')

fresh_touch_page()
a = c.js(CELL + "('je suis')")
touch('touchStart', a); pause(.05); touch('touchCancel'); pause(.45)
check('B7 cancellation before hold cannot activate a stale timer', '!state.touchSelecting && !dragSel && !touchSelTimer')

for jitter in (False, True):
    fresh_touch_page()
    a = c.js(CELL + "('je suis')")
    start = c.js('els.container.scrollTop')
    touch('touchStart', a)
    if jitter:
        touch('touchMove', dict(x=a['x'], y=a['y']-8)); pause(.04)
    for offset in (30, 60, 90, 120):
        touch('touchMove', dict(x=a['x'], y=a['y']-offset)); pause(.03)
    touch('touchEnd'); pause(.5)
    check('B8 one-finger scrolling works' + (' after jitter' if jitter else ' natively'),
          f'els.container.scrollTop > {start} + 30 && !state.touchSelecting && !dragSel && !touchSelTimer')

# ---------------------------------------------------------------- C/D/E: workspace, zoom, immersive
boot(1440, 900, False)
upload(pdf_document([{'text': f'Workspace page {n} text for layout checks', 'size': (600, 800)} for n in range(1, 13)]))
c.js("navigateToPdfPage(6, {instant: true})"); pause(1)
GEOM = "(() => { const c = els.container.getBoundingClientRect(), m = els.mainArea.getBoundingClientRect(), g = document.getElementById('grammar-panel'); return {l: c.left, r: c.right, mainR: m.right, gOpen: g.classList.contains('expanded'), gL: g.getBoundingClientRect().left}; })()"
def grammar(open_):
    if c.js("document.getElementById('grammar-panel').classList.contains('expanded')") != open_: c.js("document.getElementById('grammar-tab').click()")
    settle()
grammar(True)
c.js("displayPracticeSession({schema: PRACTICE_SCHEMA_VERSION, id: 'regress-' + Date.now(), createdAt: Date.now(), status: 'generating'})"); settle()
check('C1 an expanded Practice worksheet leaves the book laid out at the full free width underneath',
      "(() => { const g = " + GEOM + "; return (document.getElementById('practice-panel').dataset.mode === 'expanded' && Math.abs(g.r - g.gL) <= 2 && pdfPageWrappers[pdfActivePage].getBoundingClientRect().width > 400) || g; })()")
c.js("document.getElementById('practice-bookmark').click()"); settle()
check('C2 Practice bookmark + Grammar: book ends at Grammar edge (Grammar width not reserved twice)',
      "(() => { const g = " + GEOM + "; return (g.gOpen && Math.abs(g.r - g.gL) <= 2 && Math.abs(g.mainR - innerWidth) <= 2) || g; })()")
grammar(False)
check('C3 closing Grammar with Practice bookmarked returns the full width to the book',
      "(() => { const g = " + GEOM + "; return (!g.gOpen && Math.abs(g.r - innerWidth) <= 2 && Math.abs(g.mainR - innerWidth) <= 2) || g; })()")
c.js('closePractice()'); settle()
# Deep in a long book the post-transform re-read drifted by a large part of a page per step.
upload(pdf_bytes())
c.js("navigateToPdfPage(100, {instant: true})"); pause(1)
c.js('window.__anchor = pdfAnchor()')
for _ in range(2):
    c.js("document.getElementById('zoom-in').click()"); settle()
check('D1 the A+ button keeps the reading position', "(() => { const a = pdfAnchor(); return (a.page === __anchor.page && Math.abs(a.y - __anchor.y) < 0.02 && state.pdfScale > 1.4) || [__anchor, a, state.pdfScale]; })()")
c.js("document.body.classList.add('immersive-mode')"); pause(.6)
check('E1 immersive mode hides the whole navigation pill', "document.querySelector('.footer-nav-group').getBoundingClientRect().top >= innerHeight")

# ---------------------------------------------------------------- F: Grammar button contrast (P2)
check('F1 the popup Grammar button text meets WCAG AA contrast (>= 4.5:1)', """(() => {
  const lum = c => { const [r, g, b] = c.match(/[\\d.]+/g).map(Number).slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const cs = getComputedStyle(els.ttAiBtn); const f = lum(cs.color), b = lum(cs.backgroundColor);
  const ratio = (Math.max(f, b) + 0.05) / (Math.min(f, b) + 0.05); return ratio >= 4.5 || ratio; })()""")

# ---------------------------------------------------------------- G: header offset + sidebar tabs (P2)
boot(1100, 900, False)
upload(pdf_document([{'text': f'Header page {n}', 'size': (600, 800)} for n in range(1, 4)]))
c.js("document.body.classList.remove('immersive-mode')")
c.js("document.getElementById('toggle-toc-desktop').click()"); pause(.8)
check('G1 the workspace starts below the (wrapped) app header, not under it', """(() => {
  const h = document.getElementById('app-header').getBoundingClientRect(), w = document.querySelector('.workspace').getBoundingClientRect();
  return (h.height > 60 && Math.abs(w.top - h.bottom) <= 2) || {header: [h.top, h.bottom], workspace: w.top}; })()""", timeout=3)
check('G2 the sidebar Thumbnails/Contents tabs are visible and localized', """(() => {
  const tabs = document.getElementById('pdf-sidebar-tabs').getBoundingClientRect(), h = document.getElementById('app-header').getBoundingClientRect();
  const labels = [...document.querySelectorAll('.pdf-sidebar-tab')].map(b => b.textContent.trim());
  return (tabs.top >= h.bottom - 1 && tabs.height > 20 && labels.join('|') === [t('pdfTabThumbs'), t('pdfTabContents')].join('|') && !labels.includes('Thumbnails')) || {tabsTop: tabs.top, headerBottom: h.bottom, labels}; })()""")

# ---------------------------------------------------------------- H: generated Contents for a PDF without an outline (P2)
def headings_pdf():
    """Nine pages, no /Outlines: chapter titles at 26pt on pages 1/4/7, section titles at 17pt, body at 11pt."""
    def enc(t): return t.encode('cp1252').replace(b'\\', b'\\\\').replace(b'(', b'\\(').replace(b')', b'\\)')
    objs = [b'<< /Type /Catalog /Pages 2 0 R >>', b'', b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>']
    kids = []
    for p in range(1, 10):
        ops = []
        y = 720
        if p in (1, 4, 7):
            ops.append(b'BT 60 %d Td /F1 26 Tf (' % y + enc('Chapter %d Journey %d' % ((p + 2) // 3, p)) + b') Tj ET'); y -= 50
        if p in (2, 5, 8):
            ops.append(b'BT 60 %d Td /F1 17 Tf (' % y + enc('Section on page %d' % p) + b') Tj ET'); y -= 36
        for i in range(14):
            ops.append(b'BT 60 %d Td /F1 11 Tf (' % y + enc('Body line %d of page %d with ordinary reading text.' % (i, p)) + b') Tj ET'); y -= 18
        stream = b'\n'.join(ops)
        page_id = len(objs) + 1; kids.append(b'%d 0 R' % page_id)
        objs.append(b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents %d 0 R >>' % (page_id + 1))
        objs.append(b'<< /Length %d >>\nstream\n' % len(stream) + stream + b'\nendstream')
    objs[1] = b'<< /Type /Pages /Count 9 /Kids [' + b' '.join(kids) + b'] >>'
    data = b'%PDF-1.4\n'; offsets = []
    for i, obj in enumerate(objs, 1):
        offsets.append(len(data)); data += f'{i} 0 obj\n'.encode() + obj + b'\nendobj\n'
    xref = len(data)
    data += f'xref\n0 {len(objs) + 1}\n0000000000 65535 f \n'.encode() + b''.join(f'{o:010d} 00000 n \n'.encode() for o in offsets)
    return data + f'trailer << /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF'.encode()

boot(1440, 900, False)
upload(headings_pdf())
check('H1 a PDF without bookmarks still gets a Contents list built from its headings', """(() => {
  const o = state.pdfOutline || []; const top = o.map(i => [i.pageIndex, i.title]), nested = o.flatMap(i => i.items.map(s => [s.pageIndex, s.title]));
  return (state.pdfOutlineGenerated === true && !document.getElementById('pdf-tab-outline').disabled &&
          JSON.stringify(top) === JSON.stringify([[1, 'Chapter 1 Journey 1'], [4, 'Chapter 2 Journey 4'], [7, 'Chapter 3 Journey 7']]) &&
          JSON.stringify(nested) === JSON.stringify([[2, 'Section on page 2'], [5, 'Section on page 5'], [8, 'Section on page 8']])) || {top, nested}; })()""", timeout=25)
c.js("document.getElementById('toggle-toc-desktop').click()"); pause(.6)
c.js("document.getElementById('pdf-tab-outline').click()"); pause(.4)
c.js("[...document.querySelectorAll('#pdf-outline-list .pdf-outline-item')].find(r => r.textContent === 'Section on page 5').click()"); pause(1.2)
check('H2 clicking a generated entry opens its page', 'pdfActivePage === 5 || pdfActivePage')

# ---------------------------------------------------------------- I: Quick Wheel acts on the live selection (P2)
boot(1000, 900, False)
upload(paradigm_pdf())
learning_on()
c.js("window.__aiTasks = []; startAiTask = (text, mode) => { __aiTasks.push({mode, text}); }; 1")
a = c.js(CELL + "('je suis')"); b = c.js(CELL + "('il est')")
c.call('Input.dispatchMouseEvent', type='mouseMoved', x=a['x'], y=a['y'])
c.call('Input.dispatchMouseEvent', type='mousePressed', x=a['x'], y=a['y'], button='left', clickCount=1)
for i in range(1, 11):
    c.call('Input.dispatchMouseEvent', type='mouseMoved', x=a['x'] + (b['x'] + 20 - a['x']) * i / 10, y=a['y'] + (b['y'] - a['y']) * i / 10, button='left', buttons=1)
    pause(.02)
c.call('Input.dispatchMouseEvent', type='mouseReleased', x=b['x'] + 20, y=b['y'], button='left', clickCount=1)
pause(.6)
selected = c.js("state.lastSelectionText")
assert selected and 'je suis' in selected and 'il est' in selected, selected
launcher = c.js("(() => { const r = document.getElementById('qm-launcher').getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2}; })()")
for kind in ('mousePressed', 'mouseReleased'):
    c.call('Input.dispatchMouseEvent', type=kind, x=launcher['x'], y=launcher['y'], button='left', clickCount=1)
pause(.6)
c.js("document.querySelector('.qm-item[data-action=\"btn-lang-level\"]').click()"); pause(.4)
check('I1 Quick Wheel "Level" analyses the selection the learner just made (not an earlier text, not nothing)',
      "(() => { const t = __aiTasks.at(-1); return (t && t.mode === 'level' && t.text === %s) || __aiTasks; })()" % json.dumps(selected, ensure_ascii=False))

check('no page errors', "__errors.length === 0 || __errors")
print('ALL PDF WORKSPACE REGRESSION CHECKS PASSED')
