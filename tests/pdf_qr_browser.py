# Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
# Copying, modification, distribution or commercial use without written permission is prohibited.
"""QR codes on PDF pages (owner, 2026-11-21: «хочу щоб він підсвічував кюар і відкривав одразу після натискання також
потрібне швидке повернення назад на сторінку книги або файла»).

A rendered PDF page is read for QR codes by itself (js/pdf-qr.js): each code gets a highlighted frame, an ordinary
<a target=_blank> over the code, so one tap opens it. An http(s) address is the link; any other content is searched as
text; a javascript: code never becomes a link. Before the link opens, the reading place is saved and the book's key put
in sessionStorage: a tab the browser reloaded meanwhile reopens the same book on the same page (js/book-shelf.js).

Real PDF with QR codes drawn as vector squares (the same codes tests/crop_web_search_browser.py reads from PNG); real
mouse clicks. window.open is not used by the frame (a native link), so the test checks the link and a click on it.
"""
import base64, json, os, re, struct, time, zlib
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = open(os.path.join(HERE, 'crop_web_search_browser.py'), encoding='utf-8').read()


def png_bits(name):
    """1-bit grayscale PNG (no interlace) → rows of booleans, True = black."""
    raw = base64.b64decode(re.search(name + r" = '([^']+)'", SRC).group(1))
    pos, idat = 8, b''
    while pos < len(raw):
        n, = struct.unpack('>I', raw[pos:pos + 4]); typ = raw[pos + 4:pos + 8]; data = raw[pos + 8:pos + 8 + n]; pos += 12 + n
        if typ == b'IHDR': w, h, depth, ctype = struct.unpack('>IIBB', data[:10]); assert depth == 1 and ctype == 0
        if typ == b'IDAT': idat += data
    data, stride, rows, prev = zlib.decompress(idat), (w + 7) // 8, [], bytes((w + 7) // 8)
    for y in range(h):
        f, line = data[y * (stride + 1)], bytearray(data[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        for i in range(stride):
            a = line[i - 1] if i else 0; b = prev[i]; c_ = prev[i - 1] if i else 0
            if f == 1: line[i] = (line[i] + a) & 255
            elif f == 2: line[i] = (line[i] + b) & 255
            elif f == 3: line[i] = (line[i] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c_; pa, pb, pc = abs(p - a), abs(p - b), abs(p - c_)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c_)) & 255
        prev = bytes(line)
        rows.append([not (line[x // 8] >> (7 - x % 8)) & 1 for x in range(w)])
    return rows


def qr_ops(rows, left, top, size):
    """Black runs of each pixel row as filled rectangles, the code `size` points wide, its top-left at (left, top)."""
    k = size / len(rows); out = ['0 0 0 rg']
    for y, row in enumerate(rows):
        x = 0
        while x < len(row):
            if row[x]:
                x0 = x
                while x < len(row) and row[x]: x += 1
                out.append(f'{left + x0 * k:.3f} {top - (y + 1) * k:.3f} {(x - x0) * k:.3f} {k:.3f} re')
            else: x += 1
    return '\n'.join(out) + '\nf\n'


URL_ROWS, TXT_ROWS = png_bits('QR_URL'), png_bits('QR_TXT')


def dark_box(rows, left, top, size):
    """Where the code's black modules lie on the page (its white quiet zone is not part of the code), PDF units from the top-left."""
    k = size / len(rows); ys = [y for y, r in enumerate(rows) if any(r)]; xs = [x for r in rows for x, v in enumerate(r) if v]
    return left + min(xs) * k, (800 - top) + min(ys) * k, (max(xs) + 1 - min(xs)) * k, (max(ys) + 1 - min(ys)) * k


BOX = dark_box(URL_ROWS, 300, 600, 180)


def qr_pdf():
    pages = [
        'BT /F1 18 Tf 45 740 Td (A page with no code at all.) Tj ET',
        'BT /F1 18 Tf 45 740 Td (Scan the code for the exercise audio.) Tj ET\n' + qr_ops(URL_ROWS, 300, 600, 180),
        'BT /F1 18 Tf 45 740 Td (Two codes on one page.) Tj ET\n' + qr_ops(URL_ROWS, 60, 420, 170) + qr_ops(TXT_ROWS, 360, 420, 170),
        'BT /F1 18 Tf 45 740 Td (The last page.) Tj ET',
    ]
    objs, kids = [b'<< /Type /Catalog /Pages 2 0 R >>', b'', b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'], []
    for text in pages:
        pid = len(objs) + 1; kids.append(f'{pid} 0 R')
        objs.append(f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents {pid + 1} 0 R >>'.encode())
        stream = text.encode(); objs.append(f'<< /Length {len(stream)} >>\nstream\n'.encode() + stream + b'\nendstream')
    objs[1] = f'<< /Type /Pages /Count {len(kids)} /Kids [{" ".join(kids)}] >>'.encode()
    data, offsets = b'%PDF-1.4\n', [0]
    for i, obj in enumerate(objs, 1): offsets.append(len(data)); data += f'{i} 0 obj\n'.encode() + obj + b'\nendobj\n'
    xref = len(data); data += f'xref\n0 {len(objs) + 1}\n0000000000 65535 f \n'.encode()
    data += b''.join(f'{o:010d} 00000 n \n'.encode() for o in offsets[1:])
    return data + f'trailer << /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF'.encode()


c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1280, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__errors = []; addEventListener('error', e => __errors.push(e.message));
addEventListener('unhandledrejection', e => __errors.push(String(e.reason)));
window.__clicked = [];
// A frame's native link would open a real tab: record where it goes and stop it there.
addEventListener('click', e => { const a = e.target.closest && e.target.closest('a.pdf-qr-link');
  if (a) { __clicked.push({ href: a.href, target: a.target, rel: a.rel }); e.preventDefault(); } }, true);   // capture: the frame stops the click from reaching page taps
''')


def pause(s): c.js(f'new Promise(r => setTimeout(r, {int(s * 1000)}))')


def check(name, expression, timeout=0):
    deadline = time.monotonic() + timeout
    result = c.js(expression)
    while result is not True and time.monotonic() < deadline:
        time.sleep(.15); result = c.js(expression)
    assert result is True, (name, result, c.js("JSON.stringify({clicked: __clicked, errors: __errors, qr: [...document.querySelectorAll('.pdf-qr-link')].map(a => a.href)})"))
    print('PASS', name, flush=True)


def open_book():
    b64 = base64.b64encode(qr_pdf()).decode()
    c.js(f"""(() => {{ const bytes = Uint8Array.from(atob({b64!r}), c => c.charCodeAt(0));
      const dt = new DataTransfer(); dt.items.add(new File([bytes], 'qr-book.pdf', {{type: 'application/pdf', lastModified: 1700000000000}}));
      const i = document.getElementById('file-upload'); i.files = dt.files; i.dispatchEvent(new Event('change')); }})()""")
    c.wait("state.format === 'pdf' && pdfContinuousReady && !!state.pdfDoc", timeout=60)


def links(page):
    return f"[...(pdfPageWrappers[{page}]?.querySelectorAll(':scope > .pdf-qr-layer > a.pdf-qr-link') || [])]"


c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof attachPdfQrLayer==='function'", timeout=30)
c.js("localStorage.clear(); sessionStorage.clear(); showUpdateBanner = () => {}; document.getElementById('sw-update-banner')?.remove(); 1")
open_book()

# ---------------------------------------------------------------- the code is found and highlighted by itself
c.js("goToPhysicalPage(2, {instant: true}); 1"); c.wait("state.currentIndex === 2", timeout=10)
check('1 a QR code on a page gets a highlighted frame without any tap', f"{links(2)}.length === 1", timeout=15)
check('1b the frame is a plain link to the code\'s address, opened in a new tab, opener cut',
      f"(a => a.href === 'https://example.com/qr-test?a=1' && a.target === '_blank' && /noopener/.test(a.rel) && a.dataset.qr === 'https://example.com/qr-test?a=1')({links(2)}[0])")
check(f'1c the frame lies over the code (PDF units from the top-left: {[round(v) for v in BOX]})', f"""(a => {{
    const w = pdfPageWrappers[2].getBoundingClientRect(), r = a.getBoundingClientRect(), k = w.width / 600, B = {json.dumps(BOX)};
    const fx = (r.left - w.left) / k, fy = (r.top - w.top) / k, fw = r.width / k, fh = r.height / k;
    return Math.abs(fx - B[0]) < 8 && Math.abs(fy - B[1]) < 8 && Math.abs(fw - B[2]) < 14 && Math.abs(fh - B[3]) < 14 || JSON.stringify([fx, fy, fw, fh]); }})({links(2)}[0])""")
check('1d the frame is visible: a coloured border and the «QR ↗» badge', f"""(a => {{ const s = getComputedStyle(a);
    return s.boxShadow !== 'none' && a.querySelector('.pdf-qr-badge')?.textContent === 'QR ↗' && getComputedStyle(a.querySelector('.pdf-qr-badge')).display !== 'none'; }})({links(2)}[0])""")
check('1e a page without a code has no frame', f"{links(1)}.length === 0 && {links(4)}.length === 0", timeout=5)
check('1f the label is localized in every menu language', """(() => { const bad = [];
   for (const k of ['pdfQrOpen', 'pdfQrSearch']) for (const l of ['uk','en','fr','ru','zh','ko','hi','ga','es']) { const v = I18N[k] && I18N[k][l]; if (!v || v === k) bad.push(k + ':' + l); }
   return bad.length === 0 || JSON.stringify(bad); })()""")

# ---------------------------------------------------------------- one tap opens it
c.js("__clicked.length = 0; sessionStorage.clear(); 1")
r = c.js(f"(r => ({{x: r.left + r.width / 2, y: r.top + r.height / 2}}))({links(2)}[0].getBoundingClientRect())")
c.call('Input.dispatchMouseEvent', type='mousePressed', x=r['x'], y=r['y'], button='left', clickCount=1)
c.call('Input.dispatchMouseEvent', type='mouseReleased', x=r['x'], y=r['y'], button='left', clickCount=1)
pause(.4)
check('2 one real tap on the frame follows the link at once', "__clicked.length === 1 && __clicked[0].href === 'https://example.com/qr-test?a=1' && __clicked[0].target === '_blank'")
check('2b the tap is not taken for a word tap (no translation tooltip)', "!document.getElementById('word-tooltip').classList.contains('visible')")
check('2c before leaving, the book and the page are remembered for this tab',
      "(s => !!s && s.key === state.bookKey && Date.now() - s.at < 5000)(JSON.parse(sessionStorage.getItem('reader_return_book') || 'null')) && JSON.parse(localStorage.getItem(state.bookKey)).currentIndex === 2")
check('2d the book is already on the «My books» shelf, so it can be reopened', "listShelfBooks('book').then(b => b.some(x => x.key === state.bookKey))", timeout=5)

# ---------------------------------------------------------------- several codes, text codes, unsafe codes
c.js("goToPhysicalPage(3, {instant: true}); 1"); c.wait("state.currentIndex === 3", timeout=10)
check('3 two codes on one page: two frames', f"{links(3)}.length === 2", timeout=15)
check('3b the code with plain text searches that text', f"{links(3)}.map(a => a.href).sort().join(' ') === ['https://example.com/qr-test?a=1', webSearchUrl('Bonjour le monde')].sort().join(' ')")
check('3c a text code says it searches, a link says it opens', f"""{links(3)}.every(a => a.title.startsWith(t(a.dataset.qr.startsWith('https://') ? 'pdfQrOpen' : 'pdfQrSearch')))""")
check('3d a javascript: or intent: code never becomes a link; it is only searched',
      "pdfQrHref('javascript:alert(1)') === webSearchUrl('javascript:alert(1)') && pdfQrHref('intent://x#Intent;end') === webSearchUrl('intent://x#Intent;end') && pdfQrHref('https://a.example/b') === 'https://a.example/b'")

# ---------------------------------------------------------------- zoom keeps the frame on the code, no new scan
c.js("window.__scans = []; const d = detectPdfQrCodes; detectPdfQrCodes = (cv, ...a) => { __scans.push(Object.keys(pdfPageWrappers).find(n => pdfPageWrappers[n] === cv.parentNode)); return d(cv, ...a); }; 1")
c.js("setPdfScale(state.pdfScale * 1.6); 1")
c.wait("pdfPageWrappers[2]?.dataset.rendered === '1'", timeout=15); pause(1.5)
c.js("goToPhysicalPage(2, {instant: true}); 1"); pause(1.5)
check('4 after zooming, the frame is still over the code', f"""(a => {{ if (!a) return 'no frame';
    const w = pdfPageWrappers[2].getBoundingClientRect(), r = a.getBoundingClientRect(), k = w.width / 600;
    return Math.abs((r.left - w.left) / k - {BOX[0]}) < 8 && Math.abs(r.width / k - {BOX[2]}) < 14 || JSON.stringify([(r.left - w.left) / k, r.width / k]); }})({links(2)}[0])""", timeout=10)
check('4b a page whose code was found is not read again on re-render (a page without one may be, on a bigger canvas)', "!__scans.includes('2') && !__scans.includes('3') || JSON.stringify(__scans)")

# ---------------------------------------------------------------- only when the reader is still (owner, 2026-11-21)
# «кюар код шукався тільки тоді коли немає гортання або прокрутки, наприклад через пів секунди після того як сторінка
# промальована»; then «можна ще збільшити час щоб напевно» → one second): a drawn page waits PDF_QR_QUIET_MS, every scroll / swipe / wheel / key pushes that back, a scroll during
# the read stops it, and a page drawn off screen waits until it is scrolled to.
c.js("goToPhysicalPage(2, {instant: true}); 1"); c.wait("state.currentIndex === 2", timeout=10); pause(1)
c.js("""window.__qrLog = []; const d2 = detectPdfQrCodes;
  detectPdfQrCodes = (cv, ...a) => { __qrLog.push({ page: Object.keys(pdfPageWrappers).find(n => pdfPageWrappers[n] === cv.parentNode), at: performance.now() }); return d2(cv, ...a); };
  window.__redraw = n => { pdfQrCache.delete(n); pdfPageWrappers[n].querySelector(':scope > .pdf-qr-layer')?.remove();
    attachPdfQrLayer(n, pdfPageWrappers[n], pdfPageWrappers[n].querySelector(':scope > canvas.pdf-canvas')); };
  window.__log = n => __qrLog.filter(e => e.page === String(n)); 1""")

check('9 the pause is one second', "PDF_QR_QUIET_MS === 1000")
c.js("__qrLog.length = 0; window.__t0 = performance.now(); __redraw(2); 1"); pause(.7)
check('9a a page drawn 0.7 s ago is not read yet', "__log(2).length === 0")
check('9b it is read a second after it was drawn, and its frame comes back', f"__log(2).length === 1 && __log(2)[0].at - __t0 >= PDF_QR_QUIET_MS && {links(2)}.length === 1 || JSON.stringify([__log(2), __t0])", timeout=5)

# Scrolling for two seconds (scroll events every 100 ms): no read starts until a second after the last one.
c.js("""__qrLog.length = 0; __redraw(2); window.__lastScroll = 0;
  window.__scrolling = setInterval(() => { document.dispatchEvent(new Event('scroll')); __lastScroll = performance.now(); }, 100);
  setTimeout(() => clearInterval(__scrolling), 2000); 1""")
pause(1.8)
check('9c while the reader keeps scrolling, the page is not read', "__log(2).length === 0")
check('9d the read starts only a second after the scrolling stopped', f"__log(2).length === 1 && __log(2)[0].at - __lastScroll >= PDF_QR_QUIET_MS && {links(2)}.length === 1 || JSON.stringify([__log(2), __lastScroll])", timeout=5)

# A scroll that starts in the middle of a (jsQR) read stops it; the page is read again, whole, once it is quiet.
c.js("""__qrLog.length = 0; window.__jsqrCalls = 0; const realJsQR = window.jsQR; window.__realJsQR = realJsQR;
  window.jsQR = (...a) => { if (++__jsqrCalls === 1) { document.dispatchEvent(new Event('scroll')); } return realJsQR(...a); };
  __redraw(2); 1""")
check('9e a read interrupted by a scroll is dropped and done again later; the frame still comes', f"__log(2).length === 2 && __log(2)[1].at - __log(2)[0].at >= PDF_QR_QUIET_MS && {links(2)}.length === 1 || JSON.stringify([__log(2), __jsqrCalls])", timeout=6)
c.js("window.jsQR = __realJsQR; 1")
if c.js("'BarcodeDetector' in window") is False:
    check('9f the interrupted read stopped after its first pass (the rest was not computed)', "__jsqrCalls >= 2 && __jsqrCalls <= 12 || __jsqrCalls")

# A page drawn while it is off screen waits until the reader goes to it.
c.js("goToPhysicalPage(4, {instant: true}); 1"); c.wait("state.currentIndex === 4 && pdfPageWrappers[4]?.dataset.rendered === '1'", timeout=10); pause(1)
c.js("goToPhysicalPage(2, {instant: true}); 1"); c.wait("state.currentIndex === 2", timeout=10); pause(1)
if c.js("!!pdfPageWrappers[4]?.querySelector(':scope > canvas.pdf-canvas') && (r => r.top >= innerHeight || r.bottom <= 0)(pdfPageWrappers[4].getBoundingClientRect())"):
    c.js("__qrLog.length = 0; __redraw(4); 1"); pause(2.2)
    check('9g a page drawn off screen is not read while it stays off screen', "__log(4).length === 0")
    c.js("goToPhysicalPage(4, {instant: true}); 1")
    check('9h scrolled to, it is read a second later', "__log(4).length === 1", timeout=5)
else:
    print('SKIP 9g/9h page 4 is not kept drawn off screen in this layout')

# ---------------------------------------------------------------- the tab was reloaded while the reader was on the site
c.js("goToPhysicalPage(2, {instant: true}); 1"); c.wait("state.currentIndex === 2", timeout=10)
c.js(f"{links(2)}[0].click(); 1"); pause(.5)
check('5 the tap remembered the place', "!!sessionStorage.getItem('reader_return_book')")
c.call('Page.reload')
c.wait("document.readyState==='complete' && typeof attachPdfQrLayer==='function'", timeout=30)
check('5b after the reload the same book opens again by itself, on the same page',
      "state.format === 'pdf' && !!state.pdfDoc && state.bookFileName === 'qr-book.pdf' && state.currentIndex === 2", timeout=30)
check('5c the return mark is used up', "sessionStorage.getItem('reader_return_book') === null")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof attachPdfQrLayer==='function'", timeout=30); pause(2)
check('5d a plain reload without a followed link opens no book', "!state.bookKey && !state.pdfDoc")

# ---------------------------------------------------------------- coming back without a reload drops the mark
c.js("sessionStorage.setItem('reader_return_book', JSON.stringify({key: 'x', at: Date.now()})); 1")
c.js("document.dispatchEvent(new Event('visibilitychange')); 1")
check('6 no book open: the mark stays (nothing to come back to yet)', "!!sessionStorage.getItem('reader_return_book')")
c.js("sessionStorage.setItem('reader_return_book', JSON.stringify({key: 'x', at: Date.now() - 25 * 3600 * 1000})); 1")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof attachPdfQrLayer==='function'", timeout=30); pause(2)
check('6b a mark older than a day opens nothing', "!state.bookKey && sessionStorage.getItem('reader_return_book') === null")

# ---------------------------------------------------------------- BarcodeDetector (Chrome on Android) when there is one
c.js("""window.__bd = []; window.BarcodeDetector = class { constructor(o) { __bd.push(o.formats); }
  async detect(src) { __bd.push([src.width, src.height]); return [{ rawValue: 'https://example.com/from-detector', boundingBox: { x: src.width * .5, y: src.height * .25, width: src.width * .2, height: src.height * .1 } }]; } }; 1""")
check('8 BarcodeDetector is asked for QR codes on the page canvas, its box mapped to the page',
      """(() => { const cv = document.createElement('canvas'); cv.width = 1000; cv.height = 2000;
         return detectPdfQrCodes(cv).then(r => JSON.stringify(__bd[0]) === '["qr_code"]' && __bd[1][0] === 1000 && r.length === 1
           && r[0].value === 'https://example.com/from-detector' && r[0].x === .5 && r[0].y === .25 && r[0].w === .2 && r[0].h === .1 || JSON.stringify([__bd, r])); })()""")
c.js("delete window.BarcodeDetector; 1")

check('7 no page errors', "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL PASS')
