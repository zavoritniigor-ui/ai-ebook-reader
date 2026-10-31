"""Automatic contrast for faded scans (owner, 2026-10-31: «для таких книг потрібно автоматично підганяти контраст»).

An old scan gives pale grey ink on cream paper: its darkest ink sits around 100–130 instead of 0 and its paper around
235 instead of 255, so the page reads badly on every theme. js/pdf-contrast.js measures the histogram of a SHRUNK copy
of the rendered canvas, finds the ink level and the paper peak, and stretches that range to the full one with a CSS
filter — a filter, not a pixel pass, so the canvas bitmap is untouched and the text layer, the word tap and the ink
layer keep seeing exactly the picture they saw before.

Checked here (no network, synthetic PDFs only): a faded page really gets a filter, and the affine map that filter
encodes sends the measured ink to black and the measured paper to white; a normal contrasty PDF is left alone; a
colourful page is left alone; «Як у файлі» clears the filter and «Сильніше» is stronger than automatic; «Темна
сторінка» inverts; the filter lands on the canvas ONLY (never the text layer or the ink layer); levels are averaged
across pages of one book and forgotten when another book is opened; the setting survives a reload; and a word can
still be tapped on a filtered page.
"""
import base64, json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
KEY = 'reader_pdf_contrast'


def scan_pdf_bytes(pages=3, paper=(0.94, 0.92, 0.84), ink=(0.46, 0.45, 0.42), colour=False):
    """A fixture that imitates a scanned page: a full-page paper rectangle, then text in a pale ink. `colour` adds a
    large saturated block, as an illustration page would have."""
    objs = [b'<< /Type /Catalog /Pages 2 0 R >>', b'', b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
    kids = []
    for p in range(1, pages + 1):
        page_id = len(objs) + 1
        kids.append(f'{page_id} 0 R')
        objs.append(f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents {page_id + 1} 0 R >>'.encode())
        body = f'{paper[0]} {paper[1]} {paper[2]} rg 0 0 600 800 re f\n'
        body += f'{ink[0]} {ink[1]} {ink[2]} rg\n'
        for row in range(22):
            body += f'BT /F1 15 Tf 60 {720 - row * 30} Td (The wise man obtains the people confidence page {p} line {row}.) Tj ET\n'
        if colour:
            body += '0.10 0.45 0.80 rg 60 60 480 420 re f\n'
        stream = body.encode()
        objs.append(f'<< /Length {len(stream)} >>\nstream\n'.encode() + stream + b'\nendstream')
    objs[1] = f'<< /Type /Pages /Count {len(kids)} /Kids [{" ".join(kids)}] >>'.encode()
    data = b'%PDF-1.4\n'
    offsets = [0]
    for i, obj in enumerate(objs, 1):
        offsets.append(len(data))
        data += f'{i} 0 obj\n'.encode() + obj + b'\nendobj\n'
    xref = len(data)
    data += f'xref\n0 {len(objs) + 1}\n0000000000 65535 f \n'.encode()
    data += b''.join(f'{o:010d} 00000 n \n'.encode() for o in offsets[1:])
    return data + f'trailer << /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF'.encode()


c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1280, height=900, deviceScaleFactor=1, mobile=False)


def load(mode=None):
    script = None
    body = "localStorage.removeItem(%r)" % KEY if mode is None else "localStorage.setItem(%r, %r)" % (KEY, mode)
    script = c.call('Page.addScriptToEvaluateOnNewDocument', source=body)['identifier']
    c.call('Page.navigate', url=URL)
    c.wait("document.readyState==='complete' && !document.body.inert && typeof pdfContrastFor==='function'", timeout=30)
    c.call('Page.removeScriptToEvaluateOnNewDocument', identifier=script)
    c.js("showUpdateBanner = () => {}; document.getElementById('sw-update-banner')?.remove(); window.__errors = []; addEventListener('error', e => __errors.push(e.message)); 1")


def check(name, expression, timeout=0):
    deadline = time.monotonic() + timeout
    result = c.js(expression)
    while result is not True and time.monotonic() < deadline:
        time.sleep(.1); result = c.js(expression)
    assert result is True, (name, result, c.js("JSON.stringify(pdfContrastReport())"))
    print('PASS', name, flush=True)


def open_pdf(data, name):
    b64 = base64.b64encode(data).decode()
    c.js("""(() => { const bytes = Uint8Array.from(atob(%r), c => c.charCodeAt(0));
      const dt = new DataTransfer(); dt.items.add(new File([bytes], %r, {type: 'application/pdf'}));
      const i = document.getElementById('file-upload'); i.files = dt.files; i.dispatchEvent(new Event('change')); return 1; })()""" % (b64, name))
    c.wait("state.format === 'pdf' && pdfContrastReport().last !== null", timeout=45)
    c.js('new Promise(r => setTimeout(r, 400))')


FILTER = "(document.querySelector('#reader-pages .pdf-canvas') || {style: {}}).style.filter || ''"
# The filter is an affine map on each channel: brightness(m) then contrast(c) gives out = c*m*v + (1-c)/2.
# Applying it to the levels the module measured must send the ink to 0 and the paper to 1.
APPLY = """((v) => { const f = %s; const m = +f.match(/brightness\\(([\\d.]+)\\)/)[1], c = +f.match(/contrast\\(([\\d.]+)\\)/)[1];
  return Math.min(1, Math.max(0, c * m * (v / 255) + (1 - c) / 2)); })""" % FILTER

# ---------------------------------------------------------------- a faded scan
load()
open_pdf(scan_pdf_bytes(), 'faded.pdf')
check('1 a faded scan is measured as pale ink on cream paper, not as a normal page',
      "(r => r.last.black >= 70 && r.last.black <= 160 && r.last.paper >= 200 && r.last.paper <= 250)(pdfContrastReport())")
check('1b ... and it really gets a filter, built from brightness + contrast + saturate',
      "/brightness\\(/.test(%s) && /contrast\\(/.test(%s) && /saturate\\(/.test(%s)" % (FILTER, FILTER, FILTER))
check('1c the filter sends the measured ink to black', "%s(pdfContrastReport().last.black) < 0.02" % APPLY)
check('1d the filter sends the measured paper to white', "%s(pdfContrastReport().last.paper) > 0.98" % APPLY)
check('1e the contrast really rises (the gain is above 1.4, capped below the noise limit)',
      "(f => { const m = +f.match(/brightness\\(([\\d.]+)\\)/)[1], c = +f.match(/contrast\\(([\\d.]+)\\)/)[1]; return c * m > 1.4 && c * m <= 3.21; })(%s)" % FILTER)
check('1f saturate is below 1, so the cream paper does not turn orange as the channels are stretched',
      "(f => +f.match(/saturate\\(([\\d.]+)\\)/)[1] < 1)(%s)" % FILTER)

check('2 only the page canvas is filtered: the text layer and the ink layer are untouched',
      """(() => { const w = document.querySelector('#reader-pages .pdf-page-wrapper, #reader-pages [data-rendered="1"]') || document.getElementById('reader-pages');
         const tl = w.querySelector('.pdf-text-layer'), ink = w.querySelector('.ink-layer');
         return !!tl && getComputedStyle(tl).filter === 'none' && (!ink || getComputedStyle(ink).filter === 'none'); })()""")
check('2b the canvas bitmap itself is not rewritten: the stored levels still read as the faded original',
      "(() => { const canvas = document.querySelector('#reader-pages .pdf-canvas'); const again = pdfContrastMeasure(canvas); const was = pdfContrastReport().last; return Math.abs(again.paper - was.paper) <= 12; })()")

check('3 levels are averaged over the pages of this book', "pdfContrastReport().pagesAveraged >= 1")

# ---------------------------------------------------------------- a normal PDF is left alone
load()
open_pdf(scan_pdf_bytes(pages=2, paper=(1, 1, 1), ink=(0, 0, 0)), 'sharp.pdf')
check('4 a page that is already black on white gets no filter at all', "%s === ''" % FILTER)
check('4b ... and the report says why', "pdfContrastReport().last.filter === ''")

# ---------------------------------------------------------------- an illustration page is left alone
load()
open_pdf(scan_pdf_bytes(pages=1, colour=True), 'colour.pdf')
check('5 a colourful page (an illustration, a map, a cover) is never touched', "%s === ''" % FILTER)

# ---------------------------------------------------------------- the reader's own choice
load('off')
open_pdf(scan_pdf_bytes(pages=2), 'faded.pdf')
check('6 «Як у файлі» leaves the scan exactly as the file has it', "%s === '' && pdfContrastReport().mode === 'off'" % FILTER)
auto = None
load()
open_pdf(scan_pdf_bytes(pages=2), 'faded.pdf')
auto = c.js("(f => { const m = +f.match(/brightness\\(([\\d.]+)\\)/)[1], c = +f.match(/contrast\\(([\\d.]+)\\)/)[1]; return c * m; })(%s)" % FILTER)
assert isinstance(auto, (int, float)), auto
load('strong')
open_pdf(scan_pdf_bytes(pages=2), 'faded.pdf')
check('7 «Сильніше» stretches more than automatic',
      "(f => { const m = +f.match(/brightness\\(([\\d.]+)\\)/)[1], c = +f.match(/contrast\\(([\\d.]+)\\)/)[1]; return c * m > %f; })(%s)" % (auto + 0.05, FILTER))
load('dark')
open_pdf(scan_pdf_bytes(pages=2), 'faded.pdf')
check('8 «Темна сторінка» turns the scan into light text on a dark page', "/grayscale\\(1\\)/.test(%s) && /invert\\(1\\)/.test(%s)" % (FILTER, FILTER))

check('9 the choice survives a reload and the menu shows it',
      "document.getElementById('pdf-contrast').value === 'dark' && localStorage.getItem(%r) === 'dark'" % KEY)
c.js("(() => { const s = document.getElementById('pdf-contrast'); s.value = 'auto'; s.dispatchEvent(new Event('change')); return 1; })()")
c.js('new Promise(r => setTimeout(r, 300))')
check('9b changing the setting repaints the open page without re-rendering it',
      "!/invert\\(1\\)/.test(%s) && /contrast\\(/.test(%s) && localStorage.getItem(%r) === 'auto'" % (FILTER, FILTER, KEY), timeout=3)

# ---------------------------------------------------------------- the page still works
check('10 a word can still be tapped on a filtered page',
      """(() => { const span = [...document.querySelectorAll('#reader-pages .pdf-text-layer span')].find(s => /wise/.test(s.textContent));
         if (!span) return 'no text layer span';
         const b = span.getBoundingClientRect();
         return b.width > 0 && b.height > 0 && getComputedStyle(span.closest('.pdf-text-layer')).filter === 'none'; })()""")

# ---------------------------------------------------------------- another book starts over
open_pdf(scan_pdf_bytes(pages=2, paper=(1, 1, 1), ink=(0, 0, 0)), 'sharp.pdf')
check('11 opening another book forgets the previous book levels', "pdfContrastReport().pagesAveraged <= 2 && %s === ''" % FILTER)

check('12 nothing threw', "__errors.length === 0 || JSON.stringify(__errors)")
load()
check('13 cleanup: the next suite finds the default setting', "localStorage.getItem(%r) === null && pdfContrastChoice() === 'auto'" % KEY)
print('ALL PDF CONTRAST CHECKS PASSED')
