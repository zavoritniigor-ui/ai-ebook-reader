"""Long / scanned PDFs: memory is given back and the page the reader jumps to comes first (2026-10-16).

User: a scanned Internet Archive book (JPEG 2000 / JBIG2 page images) drew slowly in the page overview and, opening
page 200, the app hung on a white page. Measured on that book (754 pages, 820x1180 tablet): memory grew without bound
(2.1 -> 4.4 GB over 17 slider jumps) because no PDF.js page was ever cleaned up, and every jump decoded five pages side by
side, so the page asked for waited for four others (2.9-3.5 s at a tablet-class CPU; 0.8-1.4 s now; memory flat).

Checks (synthetic PDF, real slider jumps):
1. a page that leaves the render window is cleaned up (PDFPageProxy.cleanup), and only pages this view rendered;
2. after a jump the target page is rendered FIRST, then its neighbours one at a time, outward;
3. a page without handwriting has no ink canvas buffer (0x0); the pen gives it a full one; a page WITH ink gets one at once;
4. thumbnails and the background whole-book scans clean the pages they used (unless the page is on screen).
"""
import base64, json, os, time
from browser_cdp import CDP
from pdf_audit_fixtures import pdf_document

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(120)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=820, height=1180, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof initPdf==='function'", timeout=30)
c.js("localStorage.clear(); showUpdateBanner=()=>{}; document.getElementById('sw-update-banner')?.remove(); 1")


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.monotonic() + timeout
    while result is not True and time.monotonic() < deadline:
        time.sleep(0.1)
        result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


PDF = pdf_document([{'text': 'Page %d of a long book.' % i} for i in range(1, 81)])
b64 = base64.b64encode(PDF).decode()
c.js(f"""(() => {{ const bytes = Uint8Array.from(atob({b64!r}), c=>c.charCodeAt(0));
  const file = new File([bytes], 'long.pdf', {{type:'application/pdf', lastModified: 1700001234000}});
  const dt = new DataTransfer(); dt.items.add(file); document.getElementById('file-upload').files = dt.files;
  document.getElementById('file-upload').dispatchEvent(new Event('change')); }})()""")
c.wait("state.format==='pdf' && pdfContinuousReady && pdfRenderedPages.has(1) && pdfRenderedPages.has(3)", timeout=30)
time.sleep(0.5)

# spy: which pages were cleaned up, and the order pages start rendering
c.js("""(() => { window.__cleaned = []; window.__order = [];
  const proto = Object.getPrototypeOf([...pdfLoadedPages.values()][0]); const orig = proto.cleanup;
  proto.cleanup = function () { __cleaned.push(this.pageNumber); return orig.apply(this, arguments); };
  const r = renderPdfPageInto; renderPdfPageInto = function (n) { __order.push(n); return r.apply(this, arguments); };
  return 1; })()""")
before = c.js("[...pdfRenderedPages].sort((a,b)=>a-b)")
c.js("pdfPageRange.value = 40; commitPdfScrub(); 1")
check("1 a slider jump to page 40 renders 38..42", "[38,39,40,41,42].every(n => pdfRenderedPages.has(n)) && pdfRenderedPages.size === 5", timeout=15)
check("1b the pages that left the window were cleaned up -- and only pages this view had rendered",
      f"(() => {{ const left = {json.dumps(before)}; return left.every(n => __cleaned.includes(n)) && __cleaned.every(n => left.includes(n) || n < 1) || JSON.stringify(__cleaned); }})()")
check("2 the page jumped to is rendered FIRST, then its neighbours outward, one at a time",
      "JSON.stringify(__order.slice(0, 5)) === JSON.stringify([40, 41, 39, 42, 38]) || JSON.stringify(__order)")
check("2b the page objects of the new window are kept (needed for zoom re-renders), the old ones dropped",
      "[38,39,40,41,42].every(n => pdfLoadedPages.has(n)) && !pdfLoadedPages.has(1)")

# ink canvas memory
check("3 a page without handwriting has no ink buffer (0x0) -- it used to be a second full-size canvas per page",
      "[38,39,40,41,42].every(n => { const cv = pdfPageWrappers[n].querySelector('.ink-layer'); return cv && cv.width === 0 && cv.height === 0 && Number(cv.dataset.fullWidth) > 0; })")
c.js("document.getElementById('btn-ink').click(); 1")
check("3b taking the pen gives the visible pages their full ink buffer (same size as the page canvas)",
      "[38,39,40,41,42].every(n => { const w = pdfPageWrappers[n]; const cv = w.querySelector('.ink-layer'), pc = w.querySelector('canvas.pdf-canvas'); return cv.width === pc.width && cv.height === pc.height; })")
c.js("document.getElementById('ink-done').click(); state.ink['60'] = [{c: '#d32f2f', w: 0.003, p: [[0.2, 0.2], [0.6, 0.2]]}]; 1")
c.js("pdfPageRange.value = 60; commitPdfScrub(); 1")
check("3c a page that has ink gets its buffer at once and shows the stroke; its neighbours without ink stay 0x0",
      """(() => { if (!pdfRenderedPages.has(60) || !pdfRenderedPages.has(62)) return false; const cv = pdfPageWrappers[60].querySelector('.ink-layer');
        const d = cv.getContext('2d').getImageData(Math.round(0.4*cv.width)-2, Math.round(0.2*cv.height)-2, 5, 5).data; let m = 0; for (let i = 3; i < d.length; i += 4) m = Math.max(m, d[i]);
        return cv.width > 0 && m > 0 && pdfPageWrappers[61].querySelector('.ink-layer').width === 0; })()""", timeout=15)

# thumbnails clean up the pages they rendered (unless on screen)
c.js("__cleaned.length = 0; els.sidebar.classList.remove('collapsed'); if (typeof setPdfSidebarMode === 'function') setPdfSidebarMode('pages'); 1")
check("4 thumbnails were drawn and the pages they used were cleaned (pages on screen are left alone)",
      "(() => { const drawn = [...pdfThumbCache.keys()]; const off = drawn.filter(n => !pdfWantedPages.has(n)); return off.length > 0 && off.every(n => __cleaned.includes(n)) && [...pdfWantedPages].every(n => !__cleaned.includes(n) || !drawn.includes(n)) || JSON.stringify({drawn, cleaned: __cleaned}); })()", timeout=20)
c.js("__cleaned.length = 0; state.pdfPrintedPageLabels = null; startPrintedPageLabelScan(state.pdfDoc); 1")
check("4b the background whole-book page-label scan cleans every page it read that is not on screen",
      "(() => { const off = __cleaned.filter(n => !pdfWantedPages.has(n)); return off.length >= 60 && [...pdfWantedPages].every(n => !__cleaned.includes(n)) || __cleaned.length; })()", timeout=40)
print('ALL PDF MEMORY CHECKS PASSED')
