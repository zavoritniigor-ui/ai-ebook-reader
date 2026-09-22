"""Browser acceptance test: Central PDF Workspace layout & Left Thumbnail depth.
Verifies all 12 criteria from user specification:
- Central workspace geometry: [LEFT SIDEBAR] [CENTRAL PDF WORKSPACE] [RIGHT PANEL]
- Centering without right blank strip across all panel configurations (A, B, C, D, E)
- Fit Width and Fit Page automatic scale calculation and recentering (F, G)
- Manual Zoom (100%, 125%) preservation across panel toggles (H)
- Reading position preservation across panel transitions (I)
- Left thumbnail sidebar visual depth and scrolling across themes (Task 2)
"""
import base64, json, os, sys, time
from browser_cdp import CDP
from pdf_audit_fixtures import pdf_document

c = CDP()
c.sock.settimeout(45)
c.call('Page.enable')
c.call('Runtime.enable')
c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1200, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert")
c.js("persistCriticalState = () => {}; localStorage.clear(); showUpdateBanner = () => {}; document.getElementById('sw-update-banner')?.remove()")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof navigateToPdfPage==='function'")
c.js("localStorage.clear(); if (typeof setPdfScale === 'function') setPdfScale(1); state.pdfScale = 1; state.pdfFit = 'width'")

def settle(ms=150):
    time.sleep(ms / 1000.0)
    c.js(f"new Promise(r => setTimeout(r, {ms}))")

def upload_pdf(pdf_bytes, name="workspace_test.pdf"):
    b64 = base64.b64encode(pdf_bytes).decode()
    c.js("if (typeof pdfContinuousReady !== 'undefined') pdfContinuousReady = false;")
    c.js(f"""(() => {{
      const bytes = Uint8Array.from(atob({b64!r}), c=>c.charCodeAt(0));
      const file = new File([bytes], {name!r}, {{type:'application/pdf'}});
      const dt = new DataTransfer(); dt.items.add(file);
      document.getElementById('file-upload').files = dt.files;
      document.getElementById('file-upload').dispatchEvent(new Event('change'));
    }})()""")
    c.wait("state.format==='pdf' && pdfContinuousReady && !!state.pdfDoc", timeout=12)
    settle(200)

# Build a 10-page test document
pages_spec = [{'text': f'Workspace Page {i} Content for Layout Testing', 'size': (600, 800)} for i in range(1, 11)]
doc_bytes = pdf_document(pages_spec)
upload_pdf(doc_bytes)

def get_layout_geometry():
    return c.js("""(() => {
        const ws = getReaderWorkspaceRect();
        const main = (els.mainArea || document.getElementById('main-area')).getBoundingClientRect();
        const container = els.container.getBoundingClientRect();
        const firstPage = document.querySelector('.pdf-page-wrapper');
        const page = firstPage ? firstPage.getBoundingClientRect() : null;
        const wsCenter = (ws.left + ws.right) / 2;
        const visibleCenter = container.left + (els.container ? els.container.clientWidth / 2 : container.width / 2);
        const pageCenter = page ? (page.left + page.right) / 2 : null;
        const containerCenter = (container.left + container.right) / 2;
        const nav = document.getElementById('sidebar');
        const grammar = document.getElementById('grammar-panel');
        const practice = document.getElementById('practice-panel');
        return {
            ws: { left: ws.left, right: ws.right, width: ws.width, height: ws.height },
            main: { left: main.left, right: main.right, width: main.width },
            container: { left: container.left, right: container.right, width: container.width },
            page: page ? { left: page.left, right: page.right, width: page.width } : null,
            wsCenter,
            visibleCenter,
            pageCenter,
            containerCenter,
            pdfFit: state.pdfFit,
            pdfScale: state.pdfScale,
            navCollapsed: nav ? nav.classList.contains('collapsed') : true,
            grammarExpanded: grammar ? grammar.classList.contains('expanded') : false,
            practiceHidden: practice ? practice.hidden : true
        };
    })()""")

def assert_workspace(state_name, expected_scale=None, check_centering=True):
    settle(200)
    geom = get_layout_geometry()
    
    # 1. Container strictly matches workspace boundaries (within 2px subpixel rounding)
    assert abs(geom['container']['left'] - geom['ws']['left']) <= 2, (
        f"[{state_name}] container.left ({geom['container']['left']}) != ws.left ({geom['ws']['left']})"
    )
    assert abs(geom['container']['right'] - geom['ws']['right']) <= 2, (
        f"[{state_name}] container.right ({geom['container']['right']}) != ws.right ({geom['ws']['right']})"
    )
    
    # 2. Page is horizontally centered in central workspace
    if check_centering and geom['page']:
        center_diff = abs(geom['pageCenter'] - geom['visibleCenter'])
        assert center_diff <= 2, (
            f"[{state_name}] page is not centered in central workspace! "
            f"pageCenter={geom['pageCenter']:.2f}, visibleCenter={geom['visibleCenter']:.2f}, diff={center_diff:.2f}"
        )
    
    # 3. Check scale factor if specified
    if expected_scale is not None:
        scale_diff = abs(geom['pdfScale'] - expected_scale)
        assert scale_diff <= 0.02, (
            f"[{state_name}] pdfScale {geom['pdfScale']} != expected {expected_scale} (diff={scale_diff})"
        )
    
    print(f"PASS [{state_name}] ws: [{geom['ws']['left']:.0f}..{geom['ws']['right']:.0f} w={geom['ws']['width']:.0f}], "
          f"container: [{geom['container']['left']:.0f}..{geom['container']['right']:.0f}], "
          f"page: [{geom['page']['left']:.0f}..{geom['page']['right']:.0f}], "
          f"center diff: {abs(geom['pageCenter'] - geom['wsCenter']):.2f}px")

print("=== STARTING CENTRAL PDF WORKSPACE VERIFICATION ===")

# ------------------------------------------------------------
# STATE A: No panels open -> PDF fills central workspace, centered, no right blank strip
# ------------------------------------------------------------
c.js("""(() => {
    document.getElementById('sidebar')?.classList.add('collapsed');
    document.getElementById('grammar-panel')?.classList.remove('expanded');
    document.getElementById('ask-panel')?.classList.remove('expanded');
    const pr = document.getElementById('practice-panel');
    if (pr) pr.hidden = true;
    updatePdfWorkspaceLayout({ immediate: true, force: true });
})()""")
assert_workspace("State A: No panels open")
# Verify that in Fit Width mode, the page takes up the available container clientWidth (no blank strip)
blank_space_check = c.js("""(() => {
    const page = document.querySelector('.pdf-page-wrapper');
    const container = els.container;
    // Page width should be within 16px of clientWidth (accounting for vertical scrollbar reserve)
    return Math.abs(page.offsetWidth - container.clientWidth) <= 16;
})()""")
assert blank_space_check is True, "State A: Page must fill container width without large blank right strip"
print("PASS State A: No right blank strip verified")

# ------------------------------------------------------------
# STATE B: Left sidebar open -> PDF re-centers in available central workspace
# ------------------------------------------------------------
c.js("""(() => {
    document.getElementById('sidebar')?.classList.remove('collapsed');
    updatePdfWorkspaceLayout({ immediate: true, force: true });
})()""")
assert_workspace("State B: Left sidebar open")
geom_b = get_layout_geometry()
assert geom_b['ws']['left'] >= 240, f"State B: ws.left should reserve sidebar width, got {geom_b['ws']['left']}"

# ------------------------------------------------------------
# STATE C: Right Grammar panel open -> PDF re-centers in available central workspace
# ------------------------------------------------------------
c.js("""(() => {
    document.getElementById('sidebar')?.classList.add('collapsed');
    document.getElementById('grammar-panel')?.classList.add('expanded');
    updatePdfWorkspaceLayout({ immediate: true, force: true });
})()""")
assert_workspace("State C: Right Grammar panel open")
geom_c = get_layout_geometry()
assert geom_c['ws']['right'] <= 1200 - 300, f"State C: ws.right should reserve grammar panel, got {geom_c['ws']['right']}"

# ------------------------------------------------------------
# STATE D: Both Left sidebar + Right Grammar open -> PDF fits central workspace
# ------------------------------------------------------------
c.js("""(() => {
    document.getElementById('sidebar')?.classList.remove('collapsed');
    document.getElementById('grammar-panel')?.classList.add('expanded');
    updatePdfWorkspaceLayout({ immediate: true, force: true });
})()""")
assert_workspace("State D: Left sidebar + Right Grammar open")
geom_d = get_layout_geometry()
assert geom_d['ws']['left'] >= 240, "State D: ws.left should reserve sidebar"
assert geom_d['ws']['right'] <= 1200 - 300, "State D: ws.right should reserve grammar"

# ------------------------------------------------------------
# STATE E: Practice panel open -> PDF adapts central workspace correctly
# ------------------------------------------------------------
c.js("""(() => {
    document.getElementById('sidebar')?.classList.add('collapsed');
    document.getElementById('grammar-panel')?.classList.remove('expanded');
    const pr = document.getElementById('practice-panel');
    if (pr) {
        pr.hidden = false;
        pr.style.display = 'flex';
    }
    updatePdfWorkspaceLayout({ immediate: true, force: true });
})()""")
assert_workspace("State E: Practice panel open")
c.js("""(() => {
    const pr = document.getElementById('practice-panel');
    if (pr) {
        pr.hidden = true;
        pr.style.display = 'none';
    }
    updatePdfWorkspaceLayout({ immediate: true, force: true });
})()""")
settle(100)

# ------------------------------------------------------------
# STATE F: Fit Width mode -> page fills workspace cleanly
# ------------------------------------------------------------
c.js("""(() => {
    document.getElementById('pdf-fit').value = 'width';
    document.getElementById('pdf-fit').dispatchEvent(new Event('change'));
})()""")
assert_workspace("State F: Fit Width mode")
f_fit_check = c.js("state.pdfFit === 'width'")
assert f_fit_check is True, "State F: state.pdfFit must be 'width'"

# ------------------------------------------------------------
# STATE G: Fit Page mode -> entire page fits in workspace
# ------------------------------------------------------------
c.js("""(() => {
    document.getElementById('pdf-fit').value = 'page';
    document.getElementById('pdf-fit').dispatchEvent(new Event('change'));
})()""")
assert_workspace("State G: Fit Page mode")
g_page_check = c.js("""(() => {
    const page = document.querySelector('.pdf-page-wrapper');
    const container = els.container;
    return page.offsetHeight <= container.clientHeight + 4 && page.offsetWidth <= container.clientWidth + 4;
})()""")
assert g_page_check is True, "State G: Page must fit inside container viewport in 'page' fit mode"

# ------------------------------------------------------------
# STATE H: Manual Zoom (100%, 125%) -> Scale factor preserved across panel toggles
# ------------------------------------------------------------
print("--- Testing Manual Zoom Preservation ---")
# 1. Set 125% zoom
c.js("setPdfScale(1.25)")
assert_workspace("State H: Manual 125% - baseline", expected_scale=1.25, check_centering=False)

# 2. Open left sidebar -> scale must NOT change!
c.js("""(() => {
    document.getElementById('sidebar')?.classList.remove('collapsed');
    updatePdfWorkspaceLayout({ immediate: true, force: true });
})()""")
assert_workspace("State H: Manual 125% - with sidebar", expected_scale=1.25, check_centering=False)

# 3. Open grammar panel -> scale must NOT change!
c.js("""(() => {
    document.getElementById('grammar-panel')?.classList.add('expanded');
    updatePdfWorkspaceLayout({ immediate: true, force: true });
})()""")
assert_workspace("State H: Manual 125% - with sidebar + grammar", expected_scale=1.25, check_centering=False)

# 4. Close all panels -> scale must NOT change!
c.js("""(() => {
    document.getElementById('sidebar')?.classList.add('collapsed');
    document.getElementById('grammar-panel')?.classList.remove('expanded');
    updatePdfWorkspaceLayout({ immediate: true, force: true });
})()""")
assert_workspace("State H: Manual 125% - closed panels", expected_scale=1.25, check_centering=False)

# 5. Set 100% zoom (1.0)
c.js("setPdfScale(1.0)")
assert_workspace("State H: Manual 100% - baseline", expected_scale=1.0, check_centering=True)
c.js("""(() => {
    document.getElementById('sidebar')?.classList.remove('collapsed');
    updatePdfWorkspaceLayout({ immediate: true, force: true });
})()""")
assert_workspace("State H: Manual 100% - with sidebar", expected_scale=1.0, check_centering=True)
c.js("""(() => {
    document.getElementById('sidebar')?.classList.add('collapsed');
    updatePdfWorkspaceLayout({ immediate: true, force: true });
})()""")
settle(100)

# ------------------------------------------------------------
# STATE I: Reading position preserved across panel transitions
# ------------------------------------------------------------
print("--- Testing Reading Position Preservation ---")
c.js("navigateToPdfPage(5, { instant: true })")
settle(200)
page_before = c.js("pdfActivePage")
assert page_before == 5, f"Reading position should be at page 5, got {page_before}"

# Toggle panels back and forth
c.js("""(() => {
    document.getElementById('sidebar')?.classList.remove('collapsed');
    updatePdfWorkspaceLayout({ immediate: true, force: true });
})()""")
settle(200)
assert c.js("pdfActivePage") == 5, f"Reading position shifted to {c.js('pdfActivePage')} after opening sidebar"

c.js("""(() => {
    document.getElementById('grammar-panel')?.classList.add('expanded');
    updatePdfWorkspaceLayout({ immediate: true, force: true });
})()""")
settle(200)
assert c.js("pdfActivePage") == 5, f"Reading position shifted to {c.js('pdfActivePage')} after opening grammar"

c.js("""(() => {
    document.getElementById('sidebar')?.classList.add('collapsed');
    document.getElementById('grammar-panel')?.classList.remove('expanded');
    updatePdfWorkspaceLayout({ immediate: true, force: true });
})()""")
settle(200)
assert c.js("pdfActivePage") == 5, f"Reading position shifted to {c.js('pdfActivePage')} after closing panels"
print("PASS State I: Reading position preserved at page 5 across panel transitions")

# ------------------------------------------------------------
# TASK 2: Left Thumbnail Sidebar Visual Depth & Usability
# ------------------------------------------------------------
print("--- Testing Left Thumbnail Sidebar Visual Depth & Usability ---")
c.js("""(() => {
    document.getElementById('sidebar')?.classList.remove('collapsed');
    updatePdfWorkspaceLayout({ immediate: true, force: true });
})()""")
settle(150)

# Check thumbnail list and outline list have clean dark navy (#161a20) background in all themes
for theme in ['light', 'dark', 'sepia']:
    c.js(f"document.body.dataset.theme = {theme!r}")
    settle(100)
    bg_color = c.js("getComputedStyle(document.getElementById('pdf-thumb-list')).backgroundColor")
    outline_bg = c.js("getComputedStyle(document.getElementById('pdf-outline-list')).backgroundColor")
    assert 'rgb(22, 26, 32)' in bg_color or '#161a20' in bg_color, f"Thumbnail list must have clean #161a20 dark background in {theme} theme, got: {bg_color}"
    assert 'rgb(22, 26, 32)' in outline_bg or '#161a20' in outline_bg, f"Outline list must have clean #161a20 dark background in {theme} theme, got: {outline_bg}"
    print(f"PASS Thumbnail & outline dark background verified for theme '{theme}': thumb={bg_color}, outline={outline_bg}")

# Reset to light theme
c.js("document.body.dataset.theme = 'light'")

# Verify active thumbnail styling
c.js("syncActiveThumbnail(5)")
settle(100)
active_check = c.js("""(() => {
    const activeItem = document.querySelector('.pdf-thumb-item.active');
    if (!activeItem) return false;
    const pageNum = Number(activeItem.dataset.page);
    const borderColor = getComputedStyle(activeItem).borderColor;
    return pageNum === 5 && borderColor !== 'transparent' && borderColor !== 'rgba(0, 0, 0, 0)';
})()""")
assert active_check is True, "Active thumbnail for page 5 must have active styling and visible border"
print("PASS Active thumbnail indicator is crisp and clearly visible")

# Verify thumbnail scrolling to top and bottom without clipping
scroll_metrics = c.js("""(() => {
    const list = document.getElementById('pdf-thumb-list');
    list.scrollTop = list.scrollHeight;
    const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 5;
    list.scrollTop = 0;
    const atTop = list.scrollTop === 0;
    return { atBottom, atTop };
})()""")
assert scroll_metrics['atBottom'] is True, "Thumbnail list must scroll cleanly to the bottom"
assert scroll_metrics['atTop'] is True, "Thumbnail list must scroll cleanly to the top"
print("PASS Thumbnail list scrolls cleanly to bottom and top without obstruction")

# ------------------------------------------------------------
# VERIFY FLOATING FOOTER NAVIGATION PILL (Task 1)
# ------------------------------------------------------------
print("--- Testing Floating Footer Navigation Pill & Centering ---")
footer_geom = c.js("""(() => {
    const footer = document.getElementById('app-footer');
    const group = document.querySelector('.footer-nav-group');
    const ws = getReaderWorkspaceRect();
    const fRect = footer.getBoundingClientRect();
    const gRect = group.getBoundingClientRect();
    const fStyle = getComputedStyle(footer);
    const gStyle = getComputedStyle(group);
    const wsCenter = (ws.left + ws.right) / 2;
    const groupCenter = (gRect.left + gRect.right) / 2;
    return {
        footerPointerEvents: fStyle.pointerEvents,
        groupPointerEvents: gStyle.pointerEvents,
        footerBg: fStyle.backgroundColor,
        groupBg: gStyle.backgroundColor,
        borderRadius: gStyle.borderRadius,
        centerDiff: Math.abs(groupCenter - wsCenter),
        groupWidth: gRect.width,
        windowWidth: window.innerWidth,
        wsLeft: ws.left,
        groupLeft: gRect.left
    };
})()""")
assert footer_geom['footerPointerEvents'] == 'none', "Footer container must have pointer-events: none"
assert footer_geom['groupPointerEvents'] == 'auto', "Navigation pill must have pointer-events: auto"
assert 'rgba(0, 0, 0, 0)' in footer_geom['footerBg'] or 'transparent' in footer_geom['footerBg'], "Footer container must be transparent"
assert footer_geom['centerDiff'] <= 4, f"Navigation pill must be centered within central workspace (diff: {footer_geom['centerDiff']:.2f}px)"
assert footer_geom['groupWidth'] < footer_geom['windowWidth'] * 0.5, "Navigation pill must be a compact pill, not a full-width bar"
print(f"PASS Floating footer navigation pill is compact and centered in workspace (diff: {footer_geom['centerDiff']:.2f}px)")

# ------------------------------------------------------------
# VERIFY TOP-LEFT CONTROLS DIFFERENTIATION (Task 2)
# ------------------------------------------------------------
print("--- Testing Top-Left Icon Differentiation ---")
icons_data = c.js("""(() => {
    const menu = document.getElementById('menu-handle');
    const toc = document.getElementById('toggle-toc-desktop');
    const tocSvg = toc.querySelector('svg');
    return {
        menuText: menu.textContent.trim(),
        menuAria: menu.getAttribute('aria-label') || menu.title,
        tocHasSvg: !!tocSvg,
        tocSvgClass: tocSvg ? tocSvg.className.baseVal : '',
        tocAria: toc.getAttribute('aria-label') || toc.title
    };
})()""")
assert icons_data['menuText'] == '☰', f"menu-handle must keep ☰ icon, got: {icons_data['menuText']}"
assert icons_data['tocHasSvg'] is True, "toggle-toc-desktop must use SVG book icon rather than hamburger text"
print(f"PASS Top-left controls clearly differentiated: menu='{icons_data['menuText']}' ({icons_data['menuAria']}), toc=SVG ({icons_data['tocAria']})")

# ------------------------------------------------------------
# SCREENSHOT CAPTURES FOR ARTIFACTS & VERIFICATION
# ------------------------------------------------------------
def save_screenshot(filename):
    out_dir = "/home/igor/.gemini/antigravity/brain/fd2f5b32-9c1c-4a57-8e27-021ffcb63ee0"
    os.makedirs(out_dir, exist_ok=True)
    res = c.call('Page.captureScreenshot', format='png')
    if res and 'data' in res:
        path = os.path.join(out_dir, filename)
        with open(path, 'wb') as f:
            f.write(base64.b64decode(res['data']))
        print(f"Captured screenshot: {filename}")

# 1. Sidebar Light
c.js("document.body.dataset.theme = 'light'")
settle(100)
save_screenshot("workspace_sidebar_light.png")

# 2. Sidebar Dark
c.js("document.body.dataset.theme = 'dark'")
settle(100)
save_screenshot("workspace_sidebar_dark.png")

# 3. Sidebar Sepia
c.js("document.body.dataset.theme = 'sepia'")
settle(100)
save_screenshot("workspace_sidebar_sepia.png")

# 4. State A: No panels Light
c.js("""(() => {
    document.body.dataset.theme = 'light';
    document.getElementById('sidebar')?.classList.add('collapsed');
    document.getElementById('grammar-panel')?.classList.remove('expanded');
    updatePdfWorkspaceLayout({ immediate: true, force: true });
})()""")
settle(150)
save_screenshot("workspace_state_a_light.png")

# 5. State D: Both panels Light
c.js("""(() => {
    document.getElementById('sidebar')?.classList.remove('collapsed');
    document.getElementById('grammar-panel')?.classList.add('expanded');
    updatePdfWorkspaceLayout({ immediate: true, force: true });
})()""")
settle(150)
save_screenshot("workspace_panels_both.png")

print("\n=== ALL CENTRAL PDF WORKSPACE & THUMBNAIL VISUAL DEPTH CHECKS PASSED ===")
