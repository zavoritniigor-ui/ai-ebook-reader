"""Test for P1-2 and P1-3:
P1-2: Physical tablet range/sentence selection creates and retains green highlight (.sel-word) and tooltip.
P1-3: Opening Grammar panel from the selection tooltip preserves:
      - selected source text
      - green highlight (.sel-word)
      - translation popup / context
      - tooltip repositioning to stay within active reader workspace (not underneath #grammar-panel)
      - explicit dismissal via close button (×) clears tooltip and highlight.
"""
import base64, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP()
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Network.setBypassServiceWorker', bypass=True)

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
    c.call('Emulation.setTouchEmulationEnabled', enabled=mobile, maxTouchPoints=5 if mobile else 1)
    c.js("localStorage.clear(); showUpdateBanner=()=>{}; document.getElementById('sw-update-banner')?.remove(); window.__errors=[]; addEventListener('error', e => __errors.push(e.message))")

def paradigm_pdf():
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
    content = b'\n'.join(ops)
    objs = [b'<< /Type /Catalog /Pages 2 0 R >>',
            b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
            b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
            b'<< /Length %d >>\nstream\n%s\nendstream' % (len(content), content)]
    data = b'%PDF-1.4\n'
    offsets = []
    for i, o in enumerate(objs, 1):
        offsets.append(len(data))
        data += f'{i} 0 obj\n'.encode() + o + b'\nendobj\n'
    xref = len(data)
    data += f'xref\n0 {len(objs) + 1}\n0000000000 65535 f \n'.encode() + b''.join(f'{o:010d} 00000 n \n'.encode() for o in offsets)
    return data + f'trailer << /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF'.encode()

def upload(data):
    b64 = base64.b64encode(data).decode()
    c.js("if (typeof pdfContinuousReady !== 'undefined') pdfContinuousReady = false")
    c.js(f"""(() => {{
        const bytes = Uint8Array.from(atob('{b64}'), ch => ch.charCodeAt(0));
        const dt = new DataTransfer(); dt.items.add(new File([bytes], 'fixture.pdf', {{type: 'application/pdf'}}));
        const input = document.getElementById('file-upload'); input.files = dt.files; input.dispatchEvent(new Event('change'));
    }})()""")
    c.wait("state.format==='pdf' && pdfContinuousReady && !!state.pdfDoc", timeout=30)
    pause(1)

def learning_on():
    c.js("aiAvailable = () => true; callAI = async () => { return JSON.stringify({ items: [{ surface: 'suis', lemma: 'être', pos: 'verb', tense: 'présent', person: '1s', features: ['présent', '1s'], explanation: 'Test explanation', forms: [] }] }) }; window.fetch = async () => { throw new Error('offline') }")
    if not c.js('state.translateMode'):
        c.js('els.translateBtn.click()')
        settle(0.6)

CELL = """((text) => { const s = [...document.querySelectorAll('.pdf-page-wrapper[data-page="1"] .pdf-text-layer span')].find(x => x.textContent.trim() === text);
  const b = s.getBoundingClientRect(); return {x: b.left + 4, y: b.top + b.height / 2}; })"""

print("\n=== STEP 1: Touch Range Selection (P1-2) ===")
boot(1100, 900, True)
upload(paradigm_pdf())
learning_on()

a = c.js(CELL + "('je suis')"); b = c.js(CELL + "('il est')")
c.call('Input.dispatchTouchEvent', type='touchStart', touchPoints=[dict(x=a['x'], y=a['y'], id=1)])
pause(.55)
check('Touch long-press initiates touch selecting', 'state.touchSelecting === true', timeout=3)

for i in range(1, 11):
    c.call('Input.dispatchTouchEvent', type='touchMove', touchPoints=[dict(x=a['x'] + (b['x'] + 20 - a['x']) * i / 10, y=a['y'] + (b['y'] - a['y']) * i / 10, id=1)])
    pause(.03)

c.call('Input.dispatchTouchEvent', type='touchEnd', touchPoints=[])
pause(.6)

check('Touch drag creates green highlight spans (.sel-word)',
      "document.querySelectorAll('.sel-word').length >= 3")
check('Touch drag establishes canonical selection without bleed',
      "(() => { const t = state.canonicalSelection?.text || ''; return t.includes('je suis') && t.includes('il est') && !/vous|you are/.test(t); })()")
check('Selection tooltip is visible after touch drag commit',
      "getComputedStyle(els.tooltip).display !== 'none'")

print("\n=== STEP 2: Preserve Selection & Translation Context on Grammar Open (P1-3) ===")
# Click the Grammar button on the tooltip
c.js("els.ttAiBtn.click()")
pause(.8)

check('Grammar panel is expanded', "els.grammarPanel.classList.contains('expanded')")
check('Green highlight (.sel-word) remains intact after Grammar open',
      "document.querySelectorAll('.sel-word').length >= 3")
check('Tooltip remains visible after Grammar open',
      "getComputedStyle(els.tooltip).display !== 'none'")
check('Tooltip contains the preserved source text',
      "els.ttOriginal.textContent.includes('je suis')")
check('Tooltip is repositioned within active workspace to the left of Grammar panel', """(() => {
    const tr = els.tooltip.getBoundingClientRect();
    const gr = els.grammarPanel.getBoundingClientRect();
    const ws = getReaderWorkspaceRect();
    return tr.right <= gr.left + 2 && tr.left >= ws.left - 2;
})()""")

print("\n=== STEP 3: Explicit Dismissal of Preserved Context ===")
# Clicking the tooltip close button (×) clears the popup and highlight
c.js("els.ttCloseBtn.click()")
pause(.2)

check('Clicking close button hides tooltip',
      "getComputedStyle(els.tooltip).display === 'none'")
check('Clicking close button removes green highlight spans',
      "document.querySelectorAll('.sel-word').length === 0")

print("\nALL P1-2 & P1-3 ACCEPTANCE CHECKS PASSED")
