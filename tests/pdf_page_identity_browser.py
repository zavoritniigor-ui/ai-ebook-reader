"""PDF Page Identity & Book Label Mapping regression checks.
Validates:
1. Strict separation of physicalPdfPage (1..N) and bookPageLabel.
2. goToPhysicalPage(page) and goToBookPage(label).
3. Mapping: physical page 221 -> book page 210.
4. Physical page with bookPageLabel null (unnumbered/blank).
5. Physical page 597 ("This page intentionally left blank") does not shift subsequent numbering (596 is 585, 597 is null, 598 is 587).
6. Blank pages remain in continuous scroll (placeholder / wrapper preserved).
7. pdfDisplayLabel(n) returns '—' for unnumbered, never a fake number.
8. Scrubber & progress indicator format: 'p. 210 (221/N)' and '— (597/N)'.
9. Persistence restores physical position and resolves book label.
10. End-to-end validation with the real 657-page Complete French All-in-One PDF when present.
"""
import base64, json, os, sys, time
from browser_cdp import CDP
from pdf_audit_fixtures import pdf_document

c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1200, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert")
c.js("localStorage.clear();showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove()")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof goToPhysicalPage==='function'")

def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.monotonic() + timeout
    while result is not True and time.monotonic() < deadline:
        time.sleep(0.1)
        result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name)

def upload(pdf_bytes, name, timeout=10):
    b64 = base64.b64encode(pdf_bytes).decode()
    c.js("if (typeof pdfContinuousReady !== 'undefined') pdfContinuousReady = false;")
    c.js(f"""(() => {{
      const bytes = Uint8Array.from(atob({b64!r}), c=>c.charCodeAt(0));
      const file = new File([bytes], {name!r}, {{type:'application/pdf'}});
      const dt = new DataTransfer(); dt.items.add(file);
      document.getElementById('file-upload').files = dt.files;
      document.getElementById('file-upload').dispatchEvent(new Event('change'));
    }})()""")
    c.wait("state.format==='pdf' && pdfContinuousReady && !!state.pdfDoc", timeout=timeout)

# ============================================================
# PART 1: Synthetic Fixture Checks
# ============================================================
print("\n=== PART 1: Synthetic Fixtures & Architecture ===")

# Create a 20-page document where:
# - pages 1-2 have no footer (cover/title)
# - page 3 has footer "1"
# - page 4 has footer "2"
# - page 5 has "This page intentionally left blank"
# - page 6 has footer "3"
pages_spec = []
for i in range(1, 21):
    if i in (1, 2):
        pages_spec.append({'text': f'Title page {i}'})
    elif i == 5:
        pages_spec.append({'text': 'This page intentionally left blank'})
    elif i < 5:
        pages_spec.append({'text': f'Content of chapter.\n{i-2}'}) # printed footer number
    else:
        pages_spec.append({'text': f'Content after blank.\n{i-3}'})

pdf_synth = pdf_document(pages_spec)
upload(pdf_synth, 'identity_synth.pdf')

check('goToPhysicalPage is a function', "typeof goToPhysicalPage === 'function'")
check('goToBookPage is a function', "typeof goToBookPage === 'function'")
check('pdfDisplayLabel is a function', "typeof pdfDisplayLabel === 'function'")
check('pdfBookPageLabel is a function', "typeof pdfBookPageLabel === 'function'")

# Test physical navigation
c.js("goToPhysicalPage(4, {instant:true})")
check('goToPhysicalPage navigates to physical page 4', "state.currentIndex === 4")
check('pdfActivePage matches state.currentIndex', "pdfActivePage === 4")

# Test printed page detection:
# Record labels and check
c.js("""
(() => {
    // Manually register known labels to test identity logic independently
    recordPdfPageLabel(1, null);
    recordPdfPageLabel(2, null);
    recordPdfPageLabel(3, '1');
    recordPdfPageLabel(4, '2');
    recordPdfPageLabel(5, null);
    recordPdfPageLabel(6, '3');
})()
""")

check('Physical page 1 has bookPageLabel null', "pdfBookPageLabel(1) === null")
check('Physical page 1 display label is —', "pdfDisplayLabel(1) === '—'")
check('Physical page 3 has bookPageLabel 1', "pdfBookPageLabel(3) === '1'")
check('Physical page 4 has bookPageLabel 2', "pdfBookPageLabel(4) === '2'")
check('Physical page 5 (blank) has bookPageLabel null', "pdfBookPageLabel(5) === null")
check('Physical page 5 display label is —', "pdfDisplayLabel(5) === '—'")
check('Physical page 6 has bookPageLabel 3 (not shifted by blank)', "pdfBookPageLabel(6) === '3'")

# Blank page 5 remains in continuous scroll
check('Blank physical page 5 wrapper exists in DOM', "!!pdfPageWrappers[5]")
check('Blank physical page 5 has data-page="5"', "pdfPageWrappers[5].dataset.page === '5'")

# Test goToBookPage navigation
c.js("""(async () => {
    await goToBookPage('2', {instant: true});
})()""")
check('goToBookPage("2") navigates to physical page 4', "state.currentIndex === 4", timeout=3)

c.js("""(async () => {
    await goToBookPage('3', {instant: true});
})()""")
check('goToBookPage("3") navigates to physical page 6', "state.currentIndex === 6", timeout=3)

# Test unnumbered page navigation attempt returns false
res_null = c.js("""goToBookPage('nonexistent')""")
assert res_null is not True, "Nonexistent book page should not resolve"
print("PASS nonexistent book page returns falsy")

# Test progress text format (goToPhysicalPage settles asynchronously: wait for the final text, don't read it mid-flight)
c.js("goToPhysicalPage(4, {instant:true})")
check('Progress text for numbered page includes book label and physical total',
      "els.progress.textContent === 'p. 2 (4/20)'", timeout=5)

c.js("goToPhysicalPage(5, {instant:true})")
check('Progress text for unnumbered page displays — and physical total',
      "els.progress.textContent === '— (5/20)'", timeout=5)

# Test scrubber format
c.js("goToPhysicalPage(4, {instant:true})")
check('Scrubber preview for numbered page reflects book page',
      "document.getElementById('pdf-page-preview').value === 'p. 2 (4)'", timeout=5)

c.js("goToPhysicalPage(5, {instant:true})")
check('Scrubber preview for unnumbered page reflects —',
      "document.getElementById('pdf-page-preview').value === '— (5)'", timeout=5)

# ============================================================
# PART 2: Real Document Acceptance Test (Complete French All-in-One)
# ============================================================
candidate_paths = [
    'books/Complete French All-in-One .pdf',
    os.path.expanduser('~/Books/Complete French All-in-One .pdf'),
    os.path.expanduser('~/books/Complete French All-in-One .pdf'),
]
real_book_path = next((p for p in candidate_paths if os.path.exists(p)), None)
if real_book_path:
    print("\n=== PART 2: Real Textbook Acceptance Test (657 pages) ===")
    with open(real_book_path, 'rb') as f:
        real_bytes = f.read()
    print(f"Loaded real textbook: {len(real_bytes)} bytes")
    upload(real_bytes, 'Complete_French_All_in_One.pdf', timeout=30)

    check('Total pages is 657', "state.totalPages === 657", timeout=5)

    # Resolve book page 210 -> physical page 221
    print("Testing goToBookPage('210')...")
    c.js("""(async () => {
        window.__navResult = await goToBookPage('210', {instant: true});
    })()""")
    check('goToBookPage("210") resolves and returns true', "window.__navResult === true", timeout=10)
    check('goToBookPage("210") lands on physical page 221', "state.currentIndex === 221")
    check('Progress text for page 221 displays p. 210 (221/657)',
          "els.progress.textContent === 'p. 210 (221/657)'")
    check('Scrubber preview displays p. 210 (221)',
          "document.getElementById('pdf-page-preview').value === 'p. 210 (221)'")

    # Navigate to page 596
    print("Testing page 596...")
    c.js("goToPhysicalPage(596, {instant: true})")
    c.wait("pdfRenderedPages.has(596)", timeout=15)
    check('Physical page 596 has bookPageLabel "585"', "pdfBookPageLabel(596) === '585'", timeout=5)
    check('Progress text for page 596 displays p. 585 (596/657)',
          "els.progress.textContent === 'p. 585 (596/657)'")

    # Navigate to unnumbered blank page 597
    print("Testing unnumbered blank page 597...")
    c.js("goToPhysicalPage(597, {instant: true})")
    c.wait("pdfRenderedPages.has(597)", timeout=15)
    check('Physical page 597 wrapper is in DOM', "!!pdfPageWrappers[597]")
    check('Physical page 597 has bookPageLabel null', "pdfBookPageLabel(597) === null", timeout=5)
    check('Physical page 597 display label is —', "pdfDisplayLabel(597) === '—'")
    check('Progress text for page 597 displays — (597/657)',
          "els.progress.textContent === '— (597/657)'")

    # Navigate to page 598 (immediately after blank)
    print("Testing page 598 after blank...")
    c.js("goToPhysicalPage(598, {instant: true})")
    c.wait("pdfRenderedPages.has(598)", timeout=15)
    check('Physical page 598 has bookPageLabel "587"', "pdfBookPageLabel(598) === '587'", timeout=5)
    check('Blank page 597 did NOT shift subsequent numbering',
          "pdfBookPageLabel(598) === '587' && pdfBookPageLabel(596) === '585'")

    # Test single-word click on page 221
    print("Testing single-word click on page 221...")
    c.js("goToPhysicalPage(221, {instant: true})")
    c.wait("pdfRenderedPages.has(221)", timeout=5)
    word_click_res = c.js("""
    (async () => {
        state.translateMode = true;
        document.body.classList.add('mode-translate-on');
        els.container.classList.add('mode-translate');
        window.__wordsClicked = [];
        handleWordOrSelection = function(word, x, y, rect, helpContext, sourceType) { window.__wordsClicked.push({ word: word.trim(), sourceType }); };

        const w = pdfPageWrappers[221];
        const span = Array.from(w.querySelectorAll('.pdf-text-layer span')).find(s => s.textContent.trim().length > 3);
        if (!span) return { error: 'no span found on page 221' };

        span.scrollIntoView({ block: 'center' });
        await new Promise(r => setTimeout(r, 100));
        const rect = span.getBoundingClientRect();
        const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2
        });
        span.dispatchEvent(event);
        await new Promise(r => setTimeout(r, 100));

        return {
            spanText: span.textContent.trim(),
            wordsClicked: window.__wordsClicked
        };
    })()
    """)
    assert len(word_click_res.get('wordsClicked', [])) > 0, f"Word click should trigger lookup: {word_click_res}"
    print(f"PASS single-word click extracted: {word_click_res['wordsClicked'][0]['word']!r}")

    # Test thumbnail sidebar synchronization
    print("Testing thumbnail active sync...")
    check('Active thumbnail for page 221 has .active class',
          "pdfThumbItems[221].classList.contains('active')")
    c.js("pdfThumbItems[12].click()")
    check('Clicking thumbnail 12 navigates to physical page 12', "state.currentIndex === 12", timeout=3)
    check('Active thumbnail is now 12', "pdfThumbItems[12].classList.contains('active')")

else:
    print("\nSkipping Part 2 (real textbook not available in this environment)")

print("\n=== ALL PDF PAGE IDENTITY TESTS PASSED ===")
c.sock.close()
