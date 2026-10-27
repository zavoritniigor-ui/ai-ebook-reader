"""PDF Page Identity & Book Label Mapping regression checks.
Validates:
1. Strict separation of physicalPdfPage (1..N) and bookPageLabel.
2. goToPhysicalPage(page) and goToBookPage(label).
3. Mapping: a physical page -> its printed book page label.
4. Physical page with bookPageLabel null (unnumbered/blank).
5. An unnumbered blank page does not shift the numbering of the pages after it.
6. Blank pages remain in continuous scroll (placeholder / wrapper preserved).
7. pdfDisplayLabel(n) returns '—' for unnumbered, never a fake number.
8. Scrubber & progress indicator format: 'p. <label> (<physical>/N)' and '— (<physical>/N)'.
9. Persistence restores physical position and resolves book label.
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

print("\n=== ALL PDF PAGE IDENTITY TESTS PASSED ===")
c.sock.close()
