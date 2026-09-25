"""PDF Print (Quick Wheel 🖨 / Ctrl+P -> printCurrentReaderPage): prints the intended PHYSICAL page, one page on
one sheet, in the page's own size/orientation, with its ink, independent of viewer zoom/virtualization.

Fixture pages carry their physical page number as a row of black squares (binary), so every printed image is
decoded back to the page it really shows. The print iframe's window.print() is replaced by a capture stub (the
native dialog cannot be automated); the captured print document is then laid out by Chrome's real print engine
(Page.printToPDF on A4 and Letter) and the resulting PDF is rasterized again to check the whole page arrived.
Physical printer / native Print Preview remain manual checks.
"""
import base64, json, os, re, time, urllib.request
from browser_cdp import CDP

PORT = os.environ.get('READER_CDP_PORT', '9222')
BITS = 10


def marked_pdf(sizes, labels=None, blank=(), outline=()):
    """sizes: [(w, h)] per physical page. labels: /PageLabels /Nums body. outline: [(title, page)]."""
    objs = [b'', b'', b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
    kids, page_ids = [], []
    for n, (w, h) in enumerate(sizes, 1):
        pid = len(objs) + 1; kids.append(f'{pid} 0 R'); page_ids.append(pid)
        objs.append(f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {w} {h}] /Resources << /Font << /F1 3 0 R >> >> /Contents {pid+1} 0 R >>'.encode())
        ops = ['0 0 0 rg', f'20 {h-60} 30 30 re f'] + [f'{60 + i*34} {h-60} 30 30 re f' for i in range(BITS) if n >> i & 1]
        if n not in blank:
            ops.append(f'BT /F1 16 Tf 20 {h-110} Td (Physical page {n}) Tj ET')
        ops.append(f'0.8 0.1 0.2 rg 20 20 {w-40} 12 re f')    # bottom-edge bar: proves the page is not cut off
        s = '\n'.join(ops).encode(); objs.append(f'<< /Length {len(s)} >>\nstream\n'.encode() + s + b'\nendstream')
    objs[1] = f'<< /Type /Pages /Count {len(kids)} /Kids [{" ".join(kids)}] >>'.encode()
    extra = ''
    if labels:
        objs.append(f'<< /Nums [{labels}] >>'.encode()); extra += f' /PageLabels {len(objs)} 0 R'
    if outline:
        root = len(objs) + 1; first = root + 1; objs.append(b'')
        for k, (title, page) in enumerate(outline):
            me = first + k
            links = (f' /Prev {me-1} 0 R' if k else '') + (f' /Next {me+1} 0 R' if k < len(outline) - 1 else '')
            objs.append(f'<< /Title ({title}) /Parent {root} 0 R /Dest [{page_ids[page-1]} 0 R /XYZ null null null]{links} >>'.encode())
        objs[root - 1] = f'<< /Type /Outlines /First {first} 0 R /Last {first + len(outline) - 1} 0 R /Count {len(outline)} >>'.encode()
        extra += f' /Outlines {root} 0 R'
    objs[0] = f'<< /Type /Catalog /Pages 2 0 R{extra} >>'.encode()
    data = b'%PDF-1.4\n'; off = []
    for i, o in enumerate(objs, 1): off.append(len(data)); data += f'{i} 0 obj\n'.encode() + o + b'\nendobj\n'
    x = len(data); data += f'xref\n0 {len(objs)+1}\n0000000000 65535 f \n'.encode() + b''.join(f'{o:010d} 00000 n \n'.encode() for o in off)
    return data + f'trailer << /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{x}\n%%EOF'.encode()


c = CDP(); c.sock.settimeout(120)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Network.enable'); c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Emulation.setDeviceMetricsOverride', width=1200, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__prints = []; window.__errors = []; window.__printMode = 'print';
addEventListener('error', e => __errors.push(e.message));
addEventListener('unhandledrejection', e => __errors.push(String(e.reason)));
// The print iframe's native dialog cannot be driven by automation: capture exactly what would be printed.
new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
  if (n.tagName !== 'IFRAME') return;
  const w = n.contentWindow;
  w.print = () => {
    const d = n.contentDocument, img = d.images[0];
    __prints.push({html: d.documentElement.outerHTML, images: d.images.length, src: img && img.src, nw: img && img.naturalWidth, nh: img && img.naturalHeight, at: performance.now()});
    setTimeout(() => w.dispatchEvent(new Event('afterprint')), 20);   // printed or cancelled: Chrome fires afterprint either way
  };
}))).observe(document, {childList: true, subtree: true});
''')
c.call('Page.navigate', url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert && typeof printCurrentReaderPage==='function'", timeout=30)
c.js("localStorage.clear(); showUpdateBanner = () => {}; document.getElementById('sw-update-banner')?.remove(); 1")


def pause(s): c.js(f'new Promise(r => setTimeout(r, {int(s * 1000)}))')


def check(name, expression, timeout=0):
    deadline = time.monotonic() + timeout
    result = c.js(expression)
    while result is not True and time.monotonic() < deadline:
        time.sleep(.1); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def upload(data, name):
    b64 = base64.b64encode(data).decode()
    c.js("pdfContinuousReady = false; 1")
    c.js(f"""(() => {{ const bytes = Uint8Array.from(atob({b64!r}), c => c.charCodeAt(0));
      const dt = new DataTransfer(); dt.items.add(new File([bytes], {name!r}, {{type: 'application/pdf'}}));
      const i = document.getElementById('file-upload'); i.files = dt.files; i.dispatchEvent(new Event('change')); }})()""")
    c.wait("state.format === 'pdf' && pdfContinuousReady && !!state.pdfDoc", timeout=60)
    pause(.5)


# Decode the physical page number drawn into a printed image (page geometry in PDF points, image any scale).
DECODE = r"""(async (src, W, H) => { const img = new Image(); img.src = src; await img.decode();
  const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0);
  const px = (x, y) => ctx.getImageData(Math.round(x / W * cv.width), Math.round(y / H * cv.height), 1, 1).data;
  const dark = (x, y) => { const d = px(x, y); return d[0] + d[1] + d[2] < 150; };
  if (!dark(35, 45)) return -1;
  let n = 0; for (let i = 0; i < %d; i++) if (dark(75 + i * 34, 45)) n |= 1 << i; return n; })""" % BITS
INK_AT = r"""(async (src, fx, fy) => { const img = new Image(); img.src = src; await img.decode();
  const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(Math.round(fx * cv.width), Math.round(fy * cv.height), 1, 1).data;
  return d[0] > 200 && d[1] < 60 && d[2] < 60; })"""


def go(page):
    c.js(f"goToPhysicalPage({page}, {{instant: true}}); 1")
    c.wait(f"state.currentIndex === {page}", timeout=10); pause(.4)


def print_now():
    before = c.js('__prints.length')
    c.js("printCurrentReaderPage(); 1")
    c.wait(f"__prints.length > {before}", timeout=60)
    c.wait("!document.querySelector('iframe[title]') || ![...document.querySelectorAll('iframe')].some(f => f.style.left === '-10000px')", timeout=5)
    return c.js('__prints.at(-1)')


def printed_page(pr, size):
    return c.js(DECODE + "(%s, %d, %d)" % (json.dumps(pr['src']), size[0], size[1]))


def expect_print(label, page, size):
    pr = print_now()
    got = printed_page(pr, size)
    assert pr['images'] == 1 and got == page, (label, 'printed physical page', got, 'expected', page)
    print(f'PASS {label}: printed physical page {got}', flush=True)
    return pr


def chrome_print_layout(pr, size, name):
    """Lay out the captured print document with Chrome's print engine on A4 and Letter; rasterize the result."""
    tab = json.load(urllib.request.urlopen(urllib.request.Request(f'http://127.0.0.1:{PORT}/json/new?about:blank', method='PUT')))
    outputs = {}
    try:
        t2 = CDP(tab['webSocketDebuggerUrl']); t2.sock.settimeout(90); t2.call('Page.enable')
        fid = t2.call('Page.getFrameTree')['frameTree']['frame']['id']
        t2.call('Page.setDocumentContent', frameId=fid, html=pr['html'])
        t2.call('Runtime.evaluate', expression="document.images[0].decode()", awaitPromise=True)
        for paper, (pw, ph) in (('A4', (8.27, 11.69)), ('Letter', (8.5, 11.0))):
            outputs[paper] = t2.call('Page.printToPDF', paperWidth=pw, paperHeight=ph)['data']
    finally:
        urllib.request.urlopen(f'http://127.0.0.1:{PORT}/json/close/' + tab['id'])
        # The helper tab took focus; a background reader tab throttles pdf.js rendering.
        urllib.request.urlopen(f'http://127.0.0.1:{PORT}/json/activate/' + c.ws_url.rsplit('/', 1)[1])
        pause(.3)
    for paper, out in outputs.items():
        info = c.js(r"""(async (b64) => {
          const task = pdfjsLib.getDocument({data: Uint8Array.from(atob(b64), c => c.charCodeAt(0))}), doc = await task.promise;
          const page = await doc.getPage(1), vp = page.getViewport({scale: 1});
          const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
          await page.render({canvasContext: cv.getContext('2d'), viewport: vp}).promise;
          // Where did the PDF page land on the sheet? Find the top anchor square and the bottom-edge bar.
          const img = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
          let top = null, bottom = null;
          for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x += 2) {
            const i = (y * cv.width + x) * 4;
            if (top === null && img[i] + img[i+1] + img[i+2] < 150) top = y;
            if (img[i] > 170 && img[i+1] < 80 && img[i+2] < 90) bottom = y;
          }
          const r = {sheets: doc.numPages, top: top / cv.height, bottomBar: bottom === null ? null : bottom / cv.height};
          task.destroy(); return r; })(%s)""" % json.dumps(out))
        assert info['sheets'] == 1, (name, paper, 'printed on more than one sheet', info)
        assert info['top'] is not None and info['bottomBar'] is not None, (name, paper, 'page content missing (top anchor / bottom bar)', info)
        print(f"PASS handoff {name} on {paper}: 1 sheet, whole page present (top {info['top']:.2f}, bottom bar {info['bottomBar']:.2f})", flush=True)


# ---------------- Book A: front matter labels, blank page, mixed sizes, outline ----------------
LETTER, LAND, TRADE, A5 = (612, 792), (792, 612), (432, 648), (420, 595)
SIZES = [LETTER] * 40
SIZES[9], SIZES[14], SIZES[15] = LAND, TRADE, A5
upload(marked_pdf(SIZES, labels='0 << /S /r >> 5 << /S /D >>', blank=(5,),
                  outline=[('Front matter', 2), ('Chapter One', 12), ('Chapter Two', 27)]), 'print-book-a.pdf')

go(1); expect_print('1 first page', 1, LETTER)
go(20); expect_print('2 middle page', 20, LETTER)
go(40); expect_print('3 last page', 40, LETTER)
go(36)
check('4 physical page 36 shows book label "31" in the UI', "pdfDisplayLabel(36) === '31'")
expect_print('4 physical page 36 (book page 31): the PHYSICAL page is printed, no label offset', 36, LETTER)
go(5); expect_print('5 blank page (no text, roman-label front matter) prints by physical index', 5, LETTER)

# 6 / zoom independence
go(22); base = print_now()
c.js("setPdfScale(state.pdfScale * 2.5); 1"); pause(1.2)
check('6 zoomed in: still on page 22', "state.currentIndex === 22", timeout=5)
zin = expect_print('6 page after zooming in', 22, LETTER)
c.js("setPdfScale(state.pdfScale / 5); 1"); pause(1.2)
zout = expect_print('6 page after zooming out', c.js('state.currentIndex'), LETTER)
assert base['nw'] == zin['nw'] == zout['nw'] and base['nh'] == zin['nh'] == zout['nh'], ('zoom changed the print raster', base['nw'], zin['nw'], zout['nw'])
print('PASS 6 viewer zoom does not change the printed raster (%dx%d at every zoom)' % (base['nw'], base['nh']))
c.js("document.getElementById('pdf-fit').value = 'width'; document.getElementById('pdf-fit').dispatchEvent(new Event('change')); 1"); pause(1)

# 7 continuous scrolling (not a programmatic jump)
for _ in range(4):   # scroll by on-screen geometry (the page stack may carry a zoom transform), as a finger would
    c.js("""(() => { const w = pdfPageWrappers[31].getBoundingClientRect(), box = els.container.getBoundingClientRect();
      els.container.scrollTop += w.top + w.height * 0.3 - (box.top + els.container.clientHeight / 2); return 1; })()"""); pause(.4)
check('7 scrolled to physical page 31', "state.currentIndex === 31", timeout=5); pause(.4)
expect_print('7 page reached by scrolling', 31, LETTER)

# 8 thumbnail + TOC navigation
c.js("els.sidebar.classList.remove('collapsed'); setPdfSidebarMode('thumbnails'); 1"); pause(.6)
c.js("document.querySelector('.pdf-thumb-item[data-page=\"17\"]').click(); 1")
check('8 thumbnail click went to page 17', "state.currentIndex === 17", timeout=5); pause(.4)
expect_print('8 page reached through a thumbnail', 17, LETTER)
c.js("setPdfSidebarMode('outline'); 1"); pause(.4)
c.js("[...document.querySelectorAll('.pdf-outline-item')].find(r => r.textContent === 'Chapter Two').click(); 1")
check('8 Contents entry "Chapter Two" went to page 27', "state.currentIndex === 27", timeout=5); pause(.4)
expect_print('8 page reached through Contents/TOC', 27, LETTER)
c.js("els.sidebar.classList.add('collapsed'); 1")

# Page shapes: one PDF page -> one sheet, own size and orientation, whole page present
for page, size, name in ((1, LETTER, 'portrait Letter'), (10, LAND, 'landscape'), (15, TRADE, '6x9 in trade paperback'), (16, A5, 'A5')):
    go(page); pr = expect_print(f'shape {name}', page, size)
    css = re.search(r'@page\{size:([\d.]+)pt ([\d.]+)pt', pr['html'])
    assert css and (round(float(css.group(1))), round(float(css.group(2)))) == size, (name, 'print page size', css and css.groups())
    chrome_print_layout(pr, size, name)

# 12 ink prints with its page, aligned; the next page has none
c.js("""state.ink['20'] = [{c: '#ff0000', w: 0.02, p: [[0.4, 0.5], [0.8, 0.5]]}]; delete state.ink['21']; 1""")
go(20); pr = expect_print('12 page with ink', 20, LETTER)
check('12 ink stroke printed at its own page position (60%, 50%)', "%s(%s, 0.6, 0.5)" % (INK_AT, json.dumps(pr['src'])))
check('12 ... not shifted (no ink 8% above the stroke)', "%s(%s, 0.6, 0.42).then(v => !v)" % (INK_AT, json.dumps(pr['src'])))
go(21); pr = expect_print('12/14 next page', 21, LETTER)
check('14 no stale ink from the previous page', "%s(%s, 0.6, 0.5).then(v => !v)" % (INK_AT, json.dumps(pr['src'])))

# 10 / 14 repeated printing of different pages, no leftovers
for p in (3, 38, 3):
    go(p); expect_print(f'10 repeated printing: page {p}', p, LETTER)
check('10 no print iframe left behind', "![...document.querySelectorAll('iframe')].some(f => f.style.left === '-10000px')", timeout=3)

# 13 error + cancel: the reader stays usable
c.js("""(() => { const d = state.pdfDoc, real = d.getPage.bind(d); let once = true;
  d.getPage = n => once && new Error().stack.includes('printCurrentReaderPage') ? (once = false, Promise.reject(new Error('render failed'))) : real(n); return 1; })()""")
c.js("window.__toasts = []; const st = showToast; showToast = m => { __toasts.push(m); st(m); }; printCurrentReaderPage(); 1"); pause(.6)
check('13 print preparation failure: error message shown, no iframe left, nothing sent to print',
      "__toasts.includes(t('printError')) && ![...document.querySelectorAll('iframe')].some(f => f.style.left === '-10000px')")
go(9); expect_print('13 next print after the failure works', 9, LETTER)

# ---------------- Book B: large (600 pages), no labels ----------------
upload(marked_pdf([LETTER] * 600), 'print-book-large.pdf')
check('9 large book loaded without rendering every page', "state.totalPages === 600 && document.querySelectorAll('.pdf-page-wrapper[data-rendered]').length < 12")
go(537)
c.js("""(() => { window.__printGets = []; const d = state.pdfDoc, real = d.getPage.bind(d);
  d.getPage = n => { if (new Error().stack.includes('printCurrentReaderPage')) __printGets.push(n); return real(n); }; return 1; })()""")
expect_print('9/11 deep page 537 of a 600-page book (after switching books)', 537, LETTER)
check('9 printing fetched and rendered exactly one page', "JSON.stringify(__printGets) === '[537]'")
check('11 the old book\'s ink/pages are not used (no ink on page 20 of the new book)', "!state.ink['20']")
check('no application errors', "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL PDF PRINT CHECKS PASSED')
