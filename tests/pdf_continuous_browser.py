"""Continuous PDF viewer regression checks: virtualized vertical scrolling,
thumbnail/outline sidebar, native PDF links, page labels, reading-position
persistence, and side-panel geometry. Companion to pdf_ux_browser.py (zoom/
ink/crop) and pdf_rendering_audit_browser.py (pixel-level codec correctness)
— this file is specifically about the continuous-scroll rewrite itself.
"""
import base64, json, os, time
from browser_cdp import CDP
from pdf_audit_fixtures import pdf_document

c = CDP(); c.sock.settimeout(45)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1200, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert")
c.js("localStorage.clear();showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove()")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof navigateToPdfPage==='function'")

def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.monotonic() + timeout
    while result is not True and time.monotonic() < deadline:
        time.sleep(0.1)
        result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name)

def upload(pdf_bytes, name):
    b64 = base64.b64encode(pdf_bytes).decode()
    # Force the readiness flag false BEFORE dispatching, so the wait below
    # can never catch a stale "true" left over from the PREVIOUS document in
    # its very first poll (setupContinuousPdf only flips it back to true once
    # the actual PDF.js parse + start-page render for THIS document settles).
    c.js("if (typeof pdfContinuousReady !== 'undefined') pdfContinuousReady = false;")
    c.js(f"""(() => {{
      const bytes = Uint8Array.from(atob({b64!r}), c=>c.charCodeAt(0));
      const file = new File([bytes], {name!r}, {{type:'application/pdf'}});
      const dt = new DataTransfer(); dt.items.add(file);
      document.getElementById('file-upload').files = dt.files;
      document.getElementById('file-upload').dispatchEvent(new Event('change'));
    }})()""")
    c.wait("state.format==='pdf' && pdfContinuousReady && !!state.pdfDoc", timeout=10)

# ============================================================
# TEST 1 & 13: continuous pages render in correct order; large document
# does not eagerly render every page (virtualization)
# ============================================================
print("\n=== TEST 1/13: Continuous order + virtualization ===")
pdf30 = pdf_document([{'text': f'Page {i+1} content.'} for i in range(30)])
upload(pdf30, 'test30.pdf')
check('30 page wrappers built in correct order', """
JSON.stringify(pdfPageWrappers.filter(Boolean).map(w=>Number(w.dataset.page)))
=== JSON.stringify(Array.from({length:30},(_, i)=>i+1))
""", timeout=5)
check('only a small window is actually rendered (not all 30)',
      'document.querySelectorAll("canvas.pdf-canvas").length <= 7', timeout=5)
check('far pages are placeholders, not full canvases',
      'pdfPageWrappers[30].classList.contains("pdf-placeholder") && !pdfPageWrappers[30].querySelector("canvas.pdf-canvas")')

# ============================================================
# TEST 2: scrolling updates active page
# ============================================================
print("\n=== TEST 2: Scroll-driven active page tracking ===")
c.js("document.getElementById('reader-container').scrollTop = 20000")
check('scrolling deep into the document updates the active page', 'state.currentIndex > 5', timeout=3)
check('progress indicator reflects the scrolled-to page',
      "document.getElementById('progress-indicator').textContent.includes(String(state.currentIndex))")

# ============================================================
# TEST 3 & 4: thumbnail click navigates; active thumbnail follows scroll
# ============================================================
print("\n=== TEST 3/4: Thumbnail navigation and sync ===")
c.js("els.sidebar.classList.remove('collapsed')")
check('thumbnail sidebar built one item per page', 'document.querySelectorAll(".pdf-thumb-item").length === 30')
c.js('document.querySelector(\'.pdf-thumb-item[data-page="5"]\').click()')
check('clicking a thumbnail navigates the main viewer', 'state.currentIndex === 5', timeout=3)
check('the clicked thumbnail becomes the active one',
      'document.querySelector(".pdf-thumb-item.active")?.dataset.page === "5"', timeout=3)
c.js("navigateToPdfPage(20, {instant:true})")
check('active thumbnail follows programmatic navigation too',
      'document.querySelector(".pdf-thumb-item.active")?.dataset.page === "20"', timeout=3)

# ============================================================
# TEST 5 & 6: outline loads and navigates
# ============================================================
print("\n=== TEST 5/6: PDF outline (Contents) ===")
outline_pdf = pdf_document(
    [{'text': f'Page {i+1}.'} for i in range(20)],
    outline=[
        {'title': 'Chapter 1', 'page': 1, 'children': [
            {'title': 'Introduction', 'page': 1},
            {'title': 'Pronunciation', 'page': 3},
        ]},
        {'title': 'Chapter 2', 'page': 8, 'children': [
            {'title': 'Nouns', 'page': 8},
            {'title': 'Adjectives', 'page': 12},
        ]},
    ],
)
upload(outline_pdf, 'outline_test.pdf')
check('outline loads and populates the Contents tab', '!!state.pdfOutline && document.getElementById("pdf-tab-outline").disabled === false', timeout=5)
check('outline preserves nesting (top-level chapters)', 'state.pdfOutline.length === 2')
check('outline preserves nesting (chapter children)', 'state.pdfOutline[1].items.length === 2')
c.js("setPdfSidebarMode('outline')")
check('outline items rendered in the sidebar', 'document.querySelectorAll(".pdf-outline-item").length === 6')
c.js("""[...document.querySelectorAll('.pdf-outline-item')].find(el => el.textContent === 'Adjectives').click();""")
check('clicking an outline entry navigates the main viewer', 'state.currentIndex === 12', timeout=5)

# ============================================================
# TEST 7: internal PDF link destination navigates correctly
# ============================================================
print("\n=== TEST 7: Native PDF link annotations ===")
links_pdf = pdf_document([
    {'text': f'Page {i+1}.', 'links': ([{'rect': [20, 700, 200, 730], 'page': 15}] if i == 4 else [])}
    for i in range(20)
])
upload(links_pdf, 'links_test.pdf')
c.js("navigateToPdfPage(5, {instant:true})")
check('a rendered page with a real link annotation gets a clickable overlay',
      'pdfPageWrappers[5].querySelectorAll(".pdf-link-annotation").length === 1', timeout=5)
c.js("pdfPageWrappers[5].querySelector('.pdf-link-annotation').click()")
check('clicking a native PDF link navigates to its destination page', 'state.currentIndex === 15', timeout=5)

# ============================================================
# TEST 8 & 9: page labels handled when present; physical index works without them
# ============================================================
print("\n=== TEST 8/9: Page label mapping ===")
labeled_pdf = pdf_document(
    [{'text': f'Page {i+1}.'} for i in range(10)],
    page_labels=[{'style': 'D', 'start': 1, 'prefix': None}],
)
upload(labeled_pdf, 'labeled.pdf')
check('page labels load when the PDF provides them', '!!state.pdfPageLabels', timeout=5)
check('display label reflects the PageLabels entry', "pdfDisplayLabel(5) === '5'")

upload(pdf30, 'unlabeled_again.pdf')
check('no page labels present for a PDF without PageLabels', 'state.pdfPageLabels === null', timeout=5)
check('display label falls back to the physical 1-based index', "pdfDisplayLabel(7) === '7'")
check('navigation still uses the stable physical index without labels', """
(() => { navigateToPdfPage(7, {instant:true}); return state.currentIndex === 7; })()
""")

# ============================================================
# TEST 10: reading position survives reload
# ============================================================
print("\n=== TEST 10: Reading position persistence ===")
pos_b64 = base64.b64encode(pdf30).decode()
# Fixed lastModified so bookKeyFor() (name+size+lastModified) produces the
# SAME key on both "opens" below — a real re-opened file keeps its mtime;
# two fresh File objects from the same bytes would otherwise each default to
# "now" and silently look like two different books to the bookmark system.
c.js(f"""(() => {{
  const bytes = Uint8Array.from(atob({pos_b64!r}), c=>c.charCodeAt(0));
  window.__positionTestFile = new File([bytes], 'position_test.pdf', {{type:'application/pdf', lastModified: 1700000000000}});
  const dt = new DataTransfer(); dt.items.add(__positionTestFile);
  document.getElementById('file-upload').files = dt.files;
  document.getElementById('file-upload').dispatchEvent(new Event('change'));
}})()""")
c.wait("state.format==='pdf' && pdfContinuousReady && !!state.pdfDoc", timeout=10)
c.js("navigateToPdfPage(18, {instant:true})")
time.sleep(0.5)
c.js("saveBookmark()")
bm = c.js("JSON.parse(localStorage.getItem(state.bookKey))")
print('bookmark:', bm)
assert bm.get('currentIndex') == 18, ('bookmark stores the physical page index', bm)
print('PASS bookmark stores the physical page index')
assert bm.get('pdfFocus') is not None, ('bookmark stores a fine-grained focus position (not just page)', bm)
print('PASS bookmark stores a fine-grained focus position (not just page)')

# Re-"open" the SAME file (same name/size/lastModified => same bookKey) and
# confirm initPdf restores the saved page, not page 1.
c.js("pdfContinuousReady = false")
c.js("""(() => {
  const dt = new DataTransfer(); dt.items.add(window.__positionTestFile);
  document.getElementById('file-upload').files = dt.files;
  document.getElementById('file-upload').dispatchEvent(new Event('change'));
})()""")
c.wait("state.format==='pdf' && pdfContinuousReady && !!state.pdfDoc", timeout=10)
check('reopening the same book restores the saved page, not page 1', 'state.currentIndex === 18', timeout=3)


# ============================================================
# TEST 11: sidebar collapse/restore
# ============================================================
print("\n=== TEST 11: Sidebar collapse/restore ===")
check('sidebar starts expanded (opened above for thumbnails)', '!els.sidebar.classList.contains("collapsed")')
c.js("openToc()")
check('sidebar collapses on toggle', 'els.sidebar.classList.contains("collapsed")')
c.js("openToc()")
check('sidebar reopens on toggle', '!els.sidebar.classList.contains("collapsed")')

# ============================================================
# TEST 12: side panels do not break PDF geometry
# ============================================================
print("\n=== TEST 12: Side panel geometry ===")
c.js("document.getElementById('grammar-panel').classList.add('expanded')")
time.sleep(0.3)
check('PDF container stays within the viewport with Grammar panel open', """
(() => {
  const r = document.getElementById('reader-container').getBoundingClientRect();
  const g = document.getElementById('grammar-panel').getBoundingClientRect();
  return r.right <= g.left + 1 && r.left >= 0;
})()
""")
check('active page wrapper is not hidden underneath the panel', """
(() => {
  const w = pdfPageWrappers[state.currentIndex];
  const r = w.getBoundingClientRect();
  const g = document.getElementById('grammar-panel').getBoundingClientRect();
  return r.left < g.left;
})()
""")
c.js("document.getElementById('grammar-panel').classList.remove('expanded')")

check('no application errors', '!window.__errors || window.__errors.length === 0')
print("\n=== ALL PDF CONTINUOUS VIEWER CHECKS PASSED ===")
