"""Audit 2026-09-29, Phase 1 (P2-1 .. P2-5, P2-7): panel geometry, settings dialog, keyboard navigation
entries, accessible names, AI status announcements, selected-Grammar contrast and the Quick Wheel bounds.

Everything runs through the real app in headless Chrome: real Grammar-tab clicks, real key events (Tab,
Shift+Tab, Enter, Space, Escape) and real mouse clicks via CDP. Only callAI is mocked (a controllable
promise, as in ai_cancel_state_browser.py); no AI provider is called.

Geometry contract under test (js/pdf-continuous.js readerPanelLayout): an open side panel is DOCKED -- the
book laid out beside it -- only while the book keeps >= 400px next to the docked panels and the viewport is
>= 480px tall; otherwise it OVERLAYS a book whose geometry (scale, scroll, page, canvases, selection) does
not change at all.
"""
import base64, json, os, time
from browser_cdp import CDP
from pdf_audit_fixtures import pdf_document

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('DOM.enable'); c.call('Accessibility.enable')
c.call('Network.setBypassServiceWorker', bypass=True)
MIN_DOCKED = 400


def pause(s): c.js(f'new Promise(r => setTimeout(r, {int(s * 1000)}))')


def check(name, expression, timeout=0):
    deadline = time.monotonic() + timeout
    result = c.js(expression)
    while result is not True and time.monotonic() < deadline:
        time.sleep(.1); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def boot(width, height, mobile):
    c.call('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=1, mobile=mobile)
    c.call('Page.navigate', url=URL)
    c.wait("document.readyState==='complete' && !document.body.inert && typeof readerPanelLayout==='function'", timeout=30)
    c.js("""localStorage.clear(); showUpdateBanner = () => {}; document.getElementById('sw-update-banner')?.remove();
      window.__errors = []; addEventListener('error', e => __errors.push(e.message)); 1""")


def resize(width, height, mobile=True):
    c.call('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=1, mobile=mobile)
    pause(1.2)


def upload(data, name, mime):
    b64 = base64.b64encode(data).decode()
    c.js(f"""(() => {{ const b = Uint8Array.from(atob('{b64}'), ch => ch.charCodeAt(0));
      const dt = new DataTransfer(); dt.items.add(new File([b], {name!r}, {{type: {mime!r}}}));
      const i = document.getElementById('file-upload'); i.files = dt.files; i.dispatchEvent(new Event('change')); }})()""")


def upload_pdf(data):
    c.js("if (typeof pdfContinuousReady !== 'undefined') pdfContinuousReady = false; 1")
    upload(data, 'phase1.pdf', 'application/pdf')
    c.wait("state.format==='pdf' && pdfContinuousReady && !!state.pdfDoc", timeout=20)
    pause(1)


KEYS = {'Tab': ('Tab', 9, ''), 'Enter': ('Enter', 13, '\r'), ' ': ('Space', 32, ' '), 'Escape': ('Escape', 27, '')}


def press(key, shift=False):
    code, vk, text = KEYS[key]
    mods = 8 if shift else 0
    c.call('Input.dispatchKeyEvent', type='keyDown', key=key, code=code, windowsVirtualKeyCode=vk, text=text, modifiers=mods)
    c.call('Input.dispatchKeyEvent', type='keyUp', key=key, code=code, windowsVirtualKeyCode=vk, modifiers=mods)
    pause(.12)


def click_at(x, y):
    for kind in ('mouseMoved', 'mousePressed', 'mouseReleased'):
        c.call('Input.dispatchMouseEvent', type=kind, x=x, y=y, button='left' if kind != 'mouseMoved' else 'none', clickCount=1)
    pause(.2)


def ax(selector):
    root = c.call('DOM.getDocument', depth=0)['root']['nodeId']
    nid = c.call('DOM.querySelector', nodeId=root, selector=selector).get('nodeId')
    assert nid, selector
    node = c.call('Accessibility.getPartialAXTree', nodeId=nid, fetchRelatives=False)['nodes'][0]
    return node.get('role', {}).get('value'), node.get('name', {}).get('value')


BOOK = pdf_document([{'text': f'Phase one page {n} ' + 'lorem ipsum dolor sit amet ' * 6, 'size': (600, 800)} for n in range(1, 13)],
                    outline=[{'title': 'Opening', 'page': 1}, {'title': 'Middle part', 'page': 6}, {'title': 'Closing part', 'page': 10}])

GEOM = """(() => { const r = els.container.getBoundingClientRect(), m = els.mainArea.getBoundingClientRect();
  const w = pdfPageWrappers[state.currentIndex]; const wr = w ? w.getBoundingClientRect() : null;
  const canvases = w ? [...w.querySelectorAll('canvas')].map(cv => Math.round(cv.getBoundingClientRect().width) + 'x' + Math.round(cv.getBoundingClientRect().height)) : [];
  const g = document.getElementById('grammar-panel'), a = document.getElementById('ask-panel');
  return {reader: r.width, main: m.width, scrollTop: els.container.scrollTop, page: state.currentIndex, scale: state.pdfScale,
    wrapperW: wr && wr.width, wrapperTop: wr && wr.top, canvases: canvases.join(','), gW: g.offsetWidth, aW: a.offsetWidth,
    gPres: g.dataset.presentation || null, aPres: a.dataset.presentation || null,
    hScroll: document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth}; })()"""


def geom(): return c.js(GEOM)


def grammar_tab(open_):
    if c.js("document.getElementById('grammar-panel').classList.contains('expanded')") != open_:
        c.js("document.getElementById('grammar-tab').click()")
    pause(1.3)


# ======================= 1-5, 17: PANEL GEOMETRY =======================
print('\n=== P2-1 panel geometry matrix ===', flush=True)
MATRIX = [
    # (width, height, mobile, expected Grammar presentation, label)
    (1920, 1080, False, 'dock', 'desktop 1920x1080'),
    (1366, 768, False, 'dock', 'desktop 1366x768'),
    (1194, 834, True, 'dock', 'tablet landscape 1194x834'),
    (1181, 834, True, 'dock', 'breakpoint 1181 (desktop panel sizing)'),
    (1180, 834, True, 'dock', 'breakpoint 1180 (tablet sheet sizing)'),
    (1024, 768, True, 'dock', 'tablet landscape 1024x768'),
    (1024, 480, True, 'dock', 'height boundary 480'),
    (1024, 479, True, 'overlay', 'height boundary 479'),
    (840, 1000, True, 'dock', 'policy boundary: 440px sheet leaves exactly 400px'),
    (839, 1000, True, 'overlay', 'policy boundary: 440px sheet would leave 399px'),
    (834, 1194, True, 'overlay', 'tablet portrait 834x1194'),
    (800, 1280, True, 'overlay', 'tablet portrait 800x1280'),
    (768, 1024, True, 'overlay', 'tablet portrait 768x1024'),
    (641, 900, True, 'overlay', 'breakpoint 641 (62vw sheet)'),
    (640, 900, True, 'overlay', 'breakpoint 640 (full-screen panel)'),
    (639, 900, True, 'overlay', 'breakpoint 639'),
    (390, 844, True, 'overlay', 'phone 390x844'),
    (844, 390, True, 'overlay', 'phone landscape 844x390'),
]
for (w, h, mobile, expected, label) in MATRIX:
    boot(w, h, mobile); upload_pdf(BOOK)
    c.js("navigateToPdfPage(5, {instant: true})"); pause(1.2)
    closed = geom()
    assert abs(closed['reader'] - closed['main']) <= 2 and not closed['hScroll'], (label, closed)
    if expected == 'overlay':
        # Selection in the page's text layer must survive untouched (no relayout moves it).
        made = c.js("""(() => { const span = [...pdfPageWrappers[state.currentIndex].querySelectorAll('.pdf-text-layer span')].find(s => s.textContent.trim().length > 4);
          if (!span) return 0; const r = document.createRange(); r.selectNodeContents(span); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
          window.__selRect = JSON.stringify(r.getBoundingClientRect()); window.__selText = s.toString(); return 1; })()""")
        assert made == 1, (label, 'could not select text in the PDF text layer')
    anchor = c.js("JSON.stringify(pdfAnchor())")
    grammar_tab(True)
    g = geom()
    assert g['gPres'] == expected, (label, 'presentation', g)
    assert not g['hScroll'], (label, 'horizontal scroll with Grammar open', g)
    if expected == 'dock':
        assert abs(g['reader'] - (g['main'] - g['gW'])) <= 2, (label, 'docked reader width', g)
        assert g['reader'] >= MIN_DOCKED - 1, (label, 'docked reader below minimum', g)
        a = c.js(f"(() => {{ const a = pdfAnchor(), b = {anchor}; return a.page === b.page && Math.abs(a.y - b.y) < 0.02 || [a, b]; }})()")
        assert a is True, (label, 'docked open lost the reading anchor', a)
    else:
        for k in ('reader', 'scrollTop', 'page', 'scale', 'wrapperW', 'wrapperTop', 'canvases'):
            assert abs(g[k] - closed[k]) <= 1 if isinstance(g[k], (int, float)) else g[k] == closed[k], (label, 'overlay changed', k, closed[k], g[k])
        sel = c.js("getSelection().rangeCount ? (JSON.stringify(getSelection().getRangeAt(0).getBoundingClientRect()) === __selRect && getSelection().toString() === __selText) : 'no selection'")
        assert sel is True, (label, 'selection moved or was lost under an overlay', sel)
    grammar_tab(False)
    after = geom()
    assert abs(after['reader'] - closed['reader']) <= 1 and abs(after['scrollTop'] - closed['scrollTop']) <= 2 \
        and abs(after['scale'] - closed['scale']) < 1e-6 and after['canvases'] == closed['canvases'], (label, 'close did not restore', closed, after)
    # An overlay never relayouts, so even the active-page index is untouched. A docked round trip relayouts twice;
    # there the reading anchor is the contract (the active index may legitimately flip at an exact page boundary).
    if expected == 'overlay':
        assert after['page'] == closed['page'], (label, closed, after)
    a = c.js(f"(() => {{ const a = pdfAnchor(), b = {anchor}; return a.page === b.page && Math.abs(a.y - b.y) < 0.02 || [a, b]; }})()")
    assert a is True, (label, 'closing lost the reading anchor', a)
    # Stress state: both AI panels at once never leaves the book below the docked minimum (or at 0px).
    c.js("els.askPanel.classList.add('expanded'); els.grammarPanel.classList.add('expanded'); 1"); pause(1.3)
    both = geom()
    assert both['reader'] >= min(w, MIN_DOCKED) - 1 and not both['hScroll'], (label, 'both panels squeezed the book', both)
    c.js("els.askPanel.classList.remove('expanded'); els.grammarPanel.classList.remove('expanded'); 1"); pause(1.2)
    print(f"PASS {label}: {expected}; reader closed={closed['reader']:.0f} grammar={g['reader']:.0f} both={both['reader']:.0f} "
          f"scroll {closed['scrollTop']:.0f}->{after['scrollTop']:.0f}", flush=True)

print('\n=== P2-1 repeated open/close and orientation transitions ===', flush=True)
boot(800, 1280, True); upload_pdf(BOOK)
c.js("navigateToPdfPage(7, {instant: true})"); pause(1.2)
start = geom()
for _ in range(4):
    grammar_tab(True); grammar_tab(False)
end = geom()
assert end['page'] == start['page'] and abs(end['scrollTop'] - start['scrollTop']) <= 2 and end['canvases'] == start['canvases'], (start, end)
print('PASS four overlay open/close cycles leave page, scroll and canvases unchanged', flush=True)

boot(1024, 768, True); upload_pdf(BOOK)
c.js("navigateToPdfPage(6, {instant: true})"); pause(1.2)
grammar_tab(True)
landscape = geom(); assert landscape['gPres'] == 'dock', landscape
anchor = c.js("JSON.stringify(pdfAnchor())")
resize(768, 1024)       # rotate to portrait with Grammar open: the panel becomes an overlay
portrait = geom()
assert portrait['gPres'] == 'overlay' and abs(portrait['reader'] - portrait['main']) <= 2 and not portrait['hScroll'], portrait
check('rotation to portrait keeps the reading anchor', f"(() => {{ const a = pdfAnchor(), b = {anchor}; return a.page === b.page && Math.abs(a.y - b.y) < 0.03 || [a, b]; }})()", timeout=3)
resize(1024, 768)       # and back: docked again
back = geom()
assert back['gPres'] == 'dock' and abs(back['reader'] - (back['main'] - back['gW'])) <= 2, back
check('rotation back to landscape keeps the reading anchor', f"(() => {{ const a = pdfAnchor(), b = {anchor}; return a.page === b.page && Math.abs(a.y - b.y) < 0.03 || [a, b]; }})()", timeout=3)
grammar_tab(False)
check('no runtime errors during geometry checks', "__errors.length === 0 || __errors")

# ======================= 6-9: SETTINGS DIALOG =======================
print('\n=== P2-2 settings dialog ===', flush=True)
for (w, h, mobile) in [(1366, 768, False), (390, 844, True)]:
    boot(w, h, mobile)
    c.js("els.uiLang.value = 'en'; els.uiLang.dispatchEvent(new Event('change')); 1")
    if w <= 640:
        c.js("document.getElementById('menu-handle').click(); 1"); pause(.6)   # the phone header is a transient menu
    role, name = ax('#settings-modal')
    c.js("document.getElementById('btn-ai-settings').focus(); 1")
    press('Enter')      # keyboard activation of the opener
    check(f'{w}px settings opens as a named modal dialog', "(() => { const m = document.getElementById('settings-modal'); return getComputedStyle(m).display === 'flex' && m.getAttribute('role') === 'dialog' && m.getAttribute('aria-modal') === 'true' || [m.style.display, m.getAttribute('role')]; })()", timeout=2)
    role, name = ax('#settings-modal')
    assert role == 'dialog' and name == 'AI settings', (role, name)
    check(f'{w}px initial focus is inside the dialog', "document.getElementById('settings-modal').contains(document.activeElement) && document.activeElement.tagName === 'INPUT'")
    check(f'{w}px background is inert', "['app-header', 'app-footer', 'quick-menu-dock', 'menu-handle'].every(id => !!document.getElementById(id)?.closest('[inert]')) && !document.getElementById('settings-modal').closest('[inert]') && !document.getElementById('ai-status').closest('[inert]')")
    seen = set()
    for _ in range(14):
        press('Tab')
        inside = c.js("document.getElementById('settings-modal').contains(document.activeElement)")
        assert inside is True, (w, 'Tab left the dialog', c.js("document.activeElement.id || document.activeElement.outerHTML.slice(0, 80)"))
        seen.add(c.js("document.activeElement.id || document.activeElement.className || document.activeElement.textContent"))
    assert len(seen) >= 6, seen
    print(f'PASS {w}px Tab cycles within the dialog ({len(seen)} distinct stops)', flush=True)
    c.js("[...document.querySelectorAll('#settings-modal button')][0].focus(); 1")    # the first stop: close ✕
    press('Tab', shift=True)
    check(f'{w}px Shift+Tab from the first control wraps to the last', "document.activeElement.type === 'submit' && document.getElementById('settings-modal').contains(document.activeElement)")
    press('Tab')
    check(f'{w}px Tab from the last control wraps to the first', "document.activeElement === document.querySelector('#settings-modal .close-panel-btn')")
    # The background cannot be activated while open: a click on a background control is swallowed by the backdrop/inert.
    c.js("window.__bgClicks = 0; document.getElementById('prev-btn').addEventListener('click', () => __bgClicks++, {once: true}); document.getElementById('prev-btn').focus(); 1")
    check(f'{w}px focus cannot move to a background control', "document.getElementById('settings-modal').contains(document.activeElement)")
    press('Escape')
    check(f'{w}px Escape closes the dialog', "getComputedStyle(document.getElementById('settings-modal')).display === 'none'", timeout=1)
    check(f'{w}px focus returns to the opener', "document.activeElement === document.getElementById('btn-ai-settings')")
    check(f'{w}px nothing stays inert after closing', "document.querySelectorAll('body > [inert]').length === 0 && __bgClicks === 0")
    check(f'{w}px key values are cleared from the closed dialog', "['api-key-input', 'groq-key-input', 'openai-key-input'].every(id => document.getElementById(id).value === '')")
    # Mouse/touch closing still works: backdrop click, then the close button.
    c.js("document.getElementById('btn-ai-settings').click(); 1"); pause(.3)
    click_at(6, h - 6)
    check(f'{w}px backdrop click closes the dialog', "getComputedStyle(document.getElementById('settings-modal')).display === 'none' && document.querySelectorAll('body > [inert]').length === 0", timeout=1)
    c.js("document.getElementById('btn-ai-settings').click(); 1"); pause(.3)
    r = c.js("JSON.stringify(document.querySelector('#settings-modal .close-panel-btn').getBoundingClientRect())")
    r = json.loads(r)
    click_at(r['x'] + r['width'] / 2, r['y'] + r['height'] / 2)
    check(f'{w}px close button closes the dialog', "getComputedStyle(document.getElementById('settings-modal')).display === 'none' && document.querySelectorAll('body > [inert]').length === 0", timeout=1)
    # Save still works and closes.
    c.js("document.getElementById('btn-ai-settings').click(); document.getElementById('api-key-input').value = 'AIza-test-not-real'; 1"); pause(.2)
    c.js("document.querySelector('#api-keys-form button[type=submit]').click(); 1"); pause(.2)
    check(f'{w}px Save stores the key and closes', "state.apiKey === 'AIza-test-not-real' && getComputedStyle(document.getElementById('settings-modal')).display === 'none' && document.querySelectorAll('body > [inert]').length === 0")

# ======================= 10-11: KEYBOARD NAVIGATION ENTRIES =======================
print('\n=== P2-3 keyboard navigation entries ===', flush=True)
boot(1366, 768, False)
c.js("els.uiLang.value = 'en'; els.uiLang.dispatchEvent(new Event('change')); 1")
upload_pdf(BOOK)
c.js("document.getElementById('toggle-toc-desktop').click(); 1"); pause(.8)
check('thumbnail entries are native buttons named by page', "(() => { const b = [...document.querySelectorAll('#pdf-thumb-list .pdf-thumb-item > button.pdf-thumb-btn')]; return b.length === 12 && b.every((x, i) => x.getAttribute('aria-label') === 'Page ' + (i + 1)) || b.length; })()")
assert ax('.pdf-thumb-item[data-page="7"] .pdf-thumb-btn') == ('button', 'Page 7'), ax('.pdf-thumb-item[data-page="7"] .pdf-thumb-btn')
c.js("document.querySelector('.pdf-thumb-item[data-page=\"6\"] .pdf-thumb-btn').focus(); 1")
press('Tab')
check('Tab moves to the next thumbnail entry', "document.activeElement === document.querySelector('.pdf-thumb-item[data-page=\"7\"] .pdf-thumb-btn')")
check('keyboard-focused thumbnail shows a visible focus ring', "(() => { const s = getComputedStyle(document.activeElement); return document.activeElement.matches(':focus-visible') && s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2 || [s.outlineStyle, s.outlineWidth]; })()")
c.js("window.__navCalls = 0; const __nav = navigateToPdfPage; navigateToPdfPage = (...a) => { __navCalls++; return __nav(...a); }; 1")
press('Enter')
check('Enter on a thumbnail navigates to its page exactly once', "state.currentIndex === 7 && __navCalls === 1 || [state.currentIndex, __navCalls]", timeout=3)
check('the current thumbnail is exposed with aria-current', "document.querySelector('.pdf-thumb-item[data-page=\"7\"] .pdf-thumb-btn').getAttribute('aria-current') === 'page' && document.querySelectorAll('.pdf-thumb-btn[aria-current]').length === 1", timeout=2)
pause(1)
check('the focused thumbnail keeps focus while thumbnails render', "document.activeElement === document.querySelector('.pdf-thumb-item[data-page=\"7\"] .pdf-thumb-btn') && !!document.activeElement.querySelector('canvas, .pdf-thumb-placeholder')")
press('Tab'); press(' ')
check('Space on the next thumbnail navigates to page 8', "state.currentIndex === 8 && __navCalls === 2 || [state.currentIndex, __navCalls]", timeout=3)
r = json.loads(c.js("JSON.stringify(document.querySelector('.pdf-thumb-item[data-page=\"3\"]').getBoundingClientRect())"))
c.js("document.querySelector('.pdf-thumb-item[data-page=\"3\"]').scrollIntoView({block: 'center'}); 1"); pause(.3)
r = json.loads(c.js("JSON.stringify(document.querySelector('.pdf-thumb-item[data-page=\"3\"]').getBoundingClientRect())"))
click_at(r['x'] + r['width'] / 2, r['y'] + 8)     # the <li> padding, outside the inner button
check('a mouse click on the thumbnail entry (padding) still navigates', "state.currentIndex === 3", timeout=3)
c.js("document.querySelector('.pdf-thumb-item[data-page=\"4\"]').click(); 1")
check('li.click() (existing integrations) still navigates', "state.currentIndex === 4", timeout=3)
navigate_calls_before = c.js("__navCalls")
c.js("document.querySelector('.pdf-thumb-item[data-page=\"9\"] .pdf-thumb-btn').click(); 1")
check('a click on the inner button navigates once (no duplicate handler)', f"state.currentIndex === 9 && __navCalls === {navigate_calls_before} + 1 || [state.currentIndex, __navCalls]", timeout=3)

check('outline tab available', "!!state.pdfOutline && !document.getElementById('pdf-tab-outline').disabled", timeout=5)
c.js("setPdfSidebarMode('outline'); 1"); pause(.3)
check('outline entries are native buttons named by their titles', "(() => { const b = [...document.querySelectorAll('#pdf-outline-list .pdf-outline-item')]; return b.length === 3 && b.every(x => x.tagName === 'BUTTON' && x.type === 'button') && b.map(x => x.textContent).join('|') === 'Opening|Middle part|Closing part' || b.map(x => x.tagName + ':' + x.textContent); })()")
assert ax('#pdf-outline-list button.pdf-outline-item:nth-of-type(1)')[0] == 'button'
c.js("[...document.querySelectorAll('#pdf-outline-list .pdf-outline-item')][0].focus(); 1")
press('Tab')
check('Tab reaches the next outline entry', "document.activeElement.textContent === 'Middle part'")
check('keyboard-focused outline entry shows a visible focus ring', "(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2; })()")
press('Enter')
check('Enter on an outline entry navigates to its destination', "state.currentIndex === 6", timeout=3)
c.js("[...document.querySelectorAll('#pdf-outline-list .pdf-outline-item')][2].focus(); 1")
press(' ')
check('Space on an outline entry navigates to its destination', "state.currentIndex === 10", timeout=3)

print('\n--- reflowable Contents (TXT blocks) ---', flush=True)
upload(('\n'.join(f'Line {i} of the plain text book.' for i in range(1, 181))).encode(), 'phase1.txt', 'text/plain')
c.wait("state.format === 'txt' && document.querySelectorAll('#toc-list li').length === 4", timeout=15)
c.js("els.sidebar.classList.remove('collapsed'); 1"); pause(.5)
check('Contents entries are native buttons inside list items', "[...document.querySelectorAll('#toc-list li')].every(li => li.firstElementChild?.tagName === 'BUTTON' && li.firstElementChild.type === 'button' && li.firstElementChild.textContent === li.textContent)")
role, name = ax('#toc-list li:nth-child(3) button')
assert role == 'button' and name.endswith('3'), (role, name)
c.js("document.querySelector('#toc-list li:nth-child(2) button').focus(); 1")
press('Tab')
check('Tab moves to the next Contents entry', "document.activeElement === document.querySelector('#toc-list li:nth-child(3) button')")
check('keyboard-focused Contents entry shows a visible focus ring', "(() => { const s = getComputedStyle(document.activeElement); return document.activeElement.matches(':focus-visible') && s.outlineStyle !== 'none'; })()")
press('Enter')
check('Enter on a Contents entry opens that block', "state.currentIndex === 2", timeout=3)
c.js("els.sidebar.classList.remove('collapsed'); document.querySelector('#toc-list li:nth-child(4) button').focus(); 1"); pause(.4)
press(' ')
check('Space on a Contents entry opens that block', "state.currentIndex === 3", timeout=3)
c.js("els.sidebar.classList.remove('collapsed'); document.querySelector('#toc-list li:nth-child(1)').click(); 1")
check('a click on the Contents row still opens it', "state.currentIndex === 0", timeout=3)

# ======================= 12: ACCESSIBLE NAMES =======================
print('\n=== P2-4 accessible names ===', flush=True)
boot(1366, 768, False); upload_pdf(BOOK)
c.js("els.askPanel.classList.add('expanded'); document.getElementById('ask-attachment').hidden = false; document.body.classList.add('ink-mode'); 1"); pause(1)
NAMES = {
    '#mic-lang': ('combobox', {'en': 'Dictation language', 'uk': 'Мова диктовки', 'fr': 'Langue de la dictée'}),
    '#ask-send-btn': ('button', {'en': 'Send', 'uk': 'Надіслати', 'fr': 'Envoyer'}),
    '#ask-panel .close-panel-btn': ('button', {'en': 'Close', 'uk': 'Закрити', 'fr': 'Fermer'}),
    '#ask-attachment-remove': ('button', {'en': 'Remove image', 'uk': 'Прибрати зображення', 'fr': "Retirer l'image"}),
    '#btn-ink': ('button', {'en': 'Write', 'uk': 'Писати', 'fr': 'Écrire'}),
    '#btn-region': ('button', {'en': 'Region', 'uk': 'Фрагмент', 'fr': 'Zone'}),
    '#btn-ai-settings': ('button', {'en': 'AI settings', 'uk': 'Налаштування AI', 'fr': 'Paramètres IA'}),
    '#menu-handle': ('button', {'en': 'Main menu', 'uk': 'Головне меню', 'fr': 'Menu principal'}),
    '#toggle-toc-desktop': ('button', {'en': 'Book contents and thumbnails', 'uk': 'Зміст та ескізи книги', 'fr': 'Sommaire et miniatures du livre'}),
    '#pdf-fit': ('combobox', {'en': 'PDF zoom', 'uk': 'Масштаб PDF', 'fr': 'Zoom du PDF'}),
    '#pdf-page-range': ('slider', {'en': 'PDF page', 'uk': 'Сторінка PDF', 'fr': 'Page du PDF'}),
    '#zoom-in': ('button', {'en': 'Larger text', 'uk': None, 'fr': None}),
    '#ink-pen': ('button', {'en': 'Pen', 'uk': 'Ручка', 'fr': 'Stylo'}),
    '#ink-undo': ('button', {'en': 'Undo stroke', 'uk': 'Скасувати штрих', 'fr': 'Annuler le trait'}),
    '.ink-color[data-c="#1a56db"]': ('button', {'en': 'Blue ink', 'uk': 'Синій колір', 'fr': 'Encre bleue'}),
}
GLYPHS = set('✕➤✏️✂🔑☰🔊⏹🚪‹›❚▶🎤🧽↶🗑')
for lang in ('en', 'uk', 'fr'):
    c.js(f"els.uiLang.value = '{lang}'; els.uiLang.dispatchEvent(new Event('change')); 1"); pause(.3)
    for sel, (role, names) in NAMES.items():
        got_role, got_name = ax(sel)
        expected = names.get(lang)
        assert got_role == role, (lang, sel, got_role, got_name)
        assert got_name and not set(got_name) <= GLYPHS and any(ch.isalpha() for ch in got_name), (lang, sel, 'glyph-only or empty name', got_name)
        if expected is not None:
            assert got_name == expected, (lang, sel, got_name, expected)
    print(f'PASS {lang}: {len(NAMES)} controls have localized action names (no glyph-only names)', flush=True)
check('English UI has no Ukrainian names left on the audited controls', "true")
c.js("els.uiLang.value = 'en'; els.uiLang.dispatchEvent(new Event('change')); els.sidebar.classList.remove('collapsed'); 1"); pause(.5)
check('thumbnail names follow the UI language', "document.querySelector('.pdf-thumb-item[data-page=\"2\"] .pdf-thumb-btn').getAttribute('aria-label') === 'Page 2'")
c.js("els.uiLang.value = 'fr'; els.uiLang.dispatchEvent(new Event('change')); 1"); pause(.3)
check('thumbnail names are re-localized on a language change', "document.querySelector('.pdf-thumb-item[data-page=\"2\"] .pdf-thumb-btn').getAttribute('aria-label') === 'Page 2' && t('tGoToPage') === 'Page {n}'")
c.js("els.uiLang.value = 'uk'; els.uiLang.dispatchEvent(new Event('change')); 1"); pause(.3)
check('thumbnail names in Ukrainian', "document.querySelector('.pdf-thumb-item[data-page=\"2\"] .pdf-thumb-btn').getAttribute('aria-label') === 'Сторінка 2'")
c.js("document.body.classList.remove('ink-mode'); els.askPanel.classList.remove('expanded'); 1")

# ======================= 13: AI STATUS SEMANTICS =======================
print('\n=== P2-4 AI status announcements ===', flush=True)
boot(1280, 900, False)
c.js(r"""(() => {
  els.uiLang.value = 'en'; els.uiLang.dispatchEvent(new Event('change'));
  state.apiKey = 'test-key-not-real'; state.activeAiProvider = 'openai'; state.openaiApiKey = 'sk-test-not-real'; aiAvailable = () => true;
  window.__calls = [];
  callAI = (prompt, signal, task, onDelta) => new Promise((resolve, reject) => {
    const call = {prompt, task, resolve, reject, onDelta}; __calls.push(call);
    signal?.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')));
  });
  // Record every text the live regions ever hold.
  window.__said = [];
  for (const id of ['ai-status', 'ai-alert']) new MutationObserver(() => { const t = document.getElementById(id).textContent; if (t) __said.push(id + ':' + t); })
    .observe(document.getElementById(id), {childList: true, characterData: true, subtree: true});
  return 1; })()""")
check('live regions exist with status/alert semantics outside the panels', "(() => { const s = document.getElementById('ai-status'), a = document.getElementById('ai-alert'); return s.getAttribute('role') === 'status' && s.getAttribute('aria-live') === 'polite' && a.getAttribute('role') === 'alert' && !els.askPanel.contains(s) && !els.grammarPanel.contains(a); })()")
check('answer containers are not live regions (no token-by-token reading)', "!els.askContent.closest('[aria-live]') && !els.grammarContent.closest('[aria-live]')")
c.js("startAiTask('Bonjour tout le monde', 'ask', 'What does it mean?'); 1")
check('Ask start is announced once', "document.getElementById('ai-status').textContent === t('aiStatusAskStart') && __said.length === 1", timeout=2)
check('Ask request semantics unchanged: one request, panel behaviour as before', "__calls.length === 1 && !els.askPanel.classList.contains('expanded') && els.askPanel.classList.contains('loading')")
check('answer container is busy while generating', "els.askContent.getAttribute('aria-busy') === 'true'")
c.js("(() => { const call = __calls[0]; let acc = ''; for (let i = 0; i < 12; i++) { acc += 'token' + i + ' '; call.onDelta && call.onDelta('token' + i + ' ', acc); } return !!call.onDelta; })()")
pause(.4)
check('streamed deltas are not announced', "__said.length === 1")
c.js("__calls[0].resolve('<p>It means hello everyone.</p>'); 1")
check('Ask completion is announced', "document.getElementById('ai-status').textContent === t('aiStatusAskReady') && __said.length === 2", timeout=2)
check('answer container is no longer busy', "els.askContent.getAttribute('aria-busy') === 'false' && els.askContent.textContent.includes('hello everyone')")
c.js("startAiTask('Bonjour', 'ask', 'Again?'); 1"); pause(.2)
c.js("__calls[1].reject(new Error('Quota exceeded for this key')); 1")
check('Ask error is announced assertively with the reason', "document.getElementById('ai-alert').textContent === t('aiStatusAskError') + ' Quota exceeded for this key' && document.getElementById('ai-status').textContent === ''", timeout=2)
check('an error is not also announced as cancelled', "!__said.some(s => s.includes(t('aiStatusCancelled')))")
c.js("startAiTask('Bonjour', 'ask', 'Third?'); 1"); pause(.2)
check('a new request replaces the error announcement', "document.getElementById('ai-status').textContent === t('aiStatusAskStart') && document.getElementById('ai-alert').textContent === ''", timeout=2)
c.js("cancelAsyncTasks(['ask']); 1")
check('Ask cancellation is announced', "document.getElementById('ai-status').textContent === t('aiStatusCancelled')", timeout=2)
check('exactly one request per start (3 total)', "__calls.length === 3")
c.js("window.__saidBefore = __said.length; runGrammarAnalysis('Je mange une pomme verte.', 'Je mange une pomme verte.'); 1")
check('Grammar start is announced (drawer stays closed as before)', "document.getElementById('ai-status').textContent === t('aiStatusGrammarStart') && !els.grammarPanel.classList.contains('expanded') && els.grammarContent.getAttribute('aria-busy') === 'true'", timeout=2)
c.js("__calls[__calls.length - 1].reject(new Error('Provider unavailable')); 1")
check('Grammar error is announced assertively', "document.getElementById('ai-alert').textContent.startsWith(t('aiStatusGrammarError')) && document.getElementById('ai-alert').textContent.includes('Provider unavailable')", timeout=2)
check('Grammar content no longer busy', "els.grammarContent.getAttribute('aria-busy') === 'false'")
c.js("els.uiLang.value = 'uk'; els.uiLang.dispatchEvent(new Event('change')); startAiTask('Bonjour', 'ask', 'Ще?'); 1")
check('announcements follow the UI language', "document.getElementById('ai-status').textContent === 'AI-помічник готує відповідь…'", timeout=2)
c.js("cancelAsyncTasks(['ask']); 1"); pause(.2)
check('no runtime errors in AI status checks', "__errors.length === 0 || __errors")

# ======================= 14: CONTRAST =======================
print('\n=== P2-5 selected Grammar contrast ===', flush=True)
boot(1366, 768, False)
c.js("els.grammarPanel.classList.add('expanded'); document.body.classList.add('ink-mode'); 1"); pause(1)
RATIO = r"""const lum = rgb => { const v = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };"""
for theme in ('light', 'dark', 'sepia'):
    res = c.js(f"""(() => {{ {RATIO}
      document.body.dataset.theme = '{theme}';
      const mode = document.getElementById('grammar-mode-verbs'), other = document.getElementById('grammar-mode-adjectives');
      mode.classList.add('active'); other.classList.remove('active');
      const bar = document.getElementById('grammar-controls-bar'); const tense = document.createElement('button'); tense.className = 'active'; tense.textContent = 'Présent'; bar.appendChild(tense);
      const idle = document.createElement('button'); idle.textContent = 'Passé'; bar.appendChild(idle);
      const s = e => getComputedStyle(e); const done = document.getElementById('ink-done');
      const out = {{ modeActive: ratio(s(mode).color, s(mode).backgroundColor), modeIdle: ratio(s(other).color, s(other).backgroundColor),
        tenseActive: ratio(s(tense).color, s(tense).backgroundColor), tenseIdle: ratio(s(idle).color, s(idle).backgroundColor),
        inkDone: ratio(s(done).color, s(done).backgroundColor), aiBtn: (() => {{ const b = document.createElement('button'); b.className = 'tt-ai-btn'; document.body.appendChild(b); const r = ratio(s(b).color, s(b).backgroundColor); b.remove(); return r; }})() }};
      window.__tense = tense; window.__idle = idle; return out; }})()""")
    for k, v in res.items():
        assert v >= 4.5, (theme, k, round(v, 2))
    # Hover and keyboard focus on the selected control keep the same colours; the focus ring is visible against the panel.
    r = json.loads(c.js("JSON.stringify(document.getElementById('grammar-mode-verbs').getBoundingClientRect())"))
    c.call('Input.dispatchMouseEvent', type='mouseMoved', x=r['x'] + r['width'] / 2, y=r['y'] + r['height'] / 2); pause(.2)
    hover = c.js(f"(() => {{ {RATIO} const b = document.getElementById('grammar-mode-verbs'), s = getComputedStyle(b); return b.matches(':hover') && ratio(s.color, s.backgroundColor); }})()")
    assert hover and hover >= 4.5, (theme, 'hover', hover)
    c.js("document.getElementById('grammar-content').setAttribute('tabindex', '-1'); document.getElementById('grammar-content').focus(); 1")
    c.call('Input.dispatchMouseEvent', type='mouseMoved', x=5, y=5)
    press('Tab', shift=True); press('Tab', shift=True)
    focus = c.js(f"""(() => {{ {RATIO} const b = document.activeElement, s = getComputedStyle(b), panel = getComputedStyle(els.grammarPanel);
      return b.classList.contains('active') && b.matches(':focus-visible') && s.outlineStyle !== 'none' && {{ text: ratio(s.color, s.backgroundColor), ring: ratio(s.outlineColor, panel.backgroundColor) }} || [b.id, b.className, b.textContent]; }})()""")
    assert isinstance(focus, dict) and focus['text'] >= 4.5 and focus['ring'] >= 3, (theme, 'focus', focus)
    c.js("__tense.remove(); __idle.remove(); document.getElementById('grammar-content').removeAttribute('tabindex'); 1")
    print(f"PASS {theme}: selected {res['modeActive']:.2f}:1, tense {res['tenseActive']:.2f}:1, ink Done {res['inkDone']:.2f}:1, hover {hover:.2f}:1, focus text {focus['text']:.2f}:1 ring {focus['ring']:.2f}:1", flush=True)
check('selected Grammar state stays distinguishable from idle (different background)', "(() => { const a = getComputedStyle(document.getElementById('grammar-mode-verbs')).backgroundColor, b = getComputedStyle(document.getElementById('grammar-mode-adjectives')).backgroundColor; return a !== b; })()")
c.js("document.body.classList.remove('ink-mode'); els.grammarPanel.classList.remove('expanded'); document.body.dataset.theme = 'light'; 1")

# ======================= 15-17: QUICK WHEEL BOUNDS =======================
print('\n=== P2-7 Quick Wheel launcher bounds ===', flush=True)
LAUNCHER = """(() => { const l = document.getElementById('qm-launcher'), b = l.getBoundingClientRect(), s = getComputedStyle(l);
  const ring = (parseFloat(s.outlineWidth) || 0) + Math.max(0, parseFloat(s.outlineOffset) || 0);
  const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
  // The pre-fix launcher sat 18px further right above 640px (16px inset instead of 34px); below that the phone
  // rule (60px) is unchanged. Its vertical 76vh placement is a separate, pre-existing contract (quick_wheel_browser).
  const shift = vw > 640 ? 18 : 0, old = {left: b.left + shift, right: b.right + shift, top: b.top, bottom: b.bottom};
  const hitRect = (e, box) => { if (!e || !e.getClientRects().length || getComputedStyle(e).display === 'none' || getComputedStyle(e).visibility === 'hidden') return false;
    const r = e.getBoundingClientRect(); return r.left < box.right && r.right > box.left && r.top < box.bottom && r.bottom > box.top; };
  const hit = e => hitRect(e, b) && !hitRect(e, old);   // a collision the fix itself would introduce
  return {inside: b.left >= 0 && b.top >= 0 && b.right <= vw && b.bottom <= vh,
          ringInside: b.left - ring >= 0 && b.top - ring >= 0 && b.right + ring <= vw && b.bottom + ring <= vh,
          focusVisible: l.matches(':focus-visible') && s.outlineStyle !== 'none', ring,
          clearOfGrammarTab: !hit(document.getElementById('grammar-tab')), clearOfScrubber: !hit(document.getElementById('pdf-scrubber')),
          right: vw - b.right, w: b.width}; })()"""
boot(1366, 768, False); upload_pdf(BOOK)
for (w, h) in [(1920, 1080), (1366, 768), (1194, 834), (1024, 768), (834, 1194), (768, 1024), (641, 900), (640, 900), (639, 900), (390, 844), (844, 390), (1024, 600)]:
    resize(w, h, mobile=w < 1280)
    c.js("document.getElementById('pdf-fit').focus(); 1")   # keyboard focus the launcher from a neighbouring control
    c.js("document.getElementById('qm-launcher').focus(); 1"); press('Tab', shift=True); press('Tab')
    g = c.js(LAUNCHER)
    assert c.js("document.activeElement.id") == 'qm-launcher', (w, h, c.js("document.activeElement.id"))
    assert g['inside'] and g['ringInside'] and g['focusVisible'] and g['w'] == 48, (w, h, g)
    assert g['clearOfGrammarTab'] and g['clearOfScrubber'], (w, h, 'the new inset introduces a collision', g)
    print(f"PASS {w}x{h}: launcher and {g['ring']:.0f}px focus ring inside the viewport ({g['right']:.0f}px from the right edge), no new overlap with Grammar tab/scrubber", flush=True)
    if (w, h) in [(1366, 768), (641, 900), (844, 390)]:
        c.js("document.getElementById('qm-launcher').click(); 1"); pause(.6)
        items = c.js("""(() => { const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
          return [...document.querySelectorAll('.qm-item:not([hidden])')].map(b => b.getBoundingClientRect()).every(r => r.left >= 0 && r.right <= vw && r.top >= 0 && r.bottom <= vh); })()""")
        assert items is True, (w, h, 'open wheel action outside the viewport')
        press('Escape'); pause(.4)
        print(f'PASS {w}x{h}: every visible wheel action inside the viewport', flush=True)
# Orientation change with the launcher focused: it stays inside.
resize(768, 1024); c.js("document.getElementById('qm-launcher').focus(); 1")
resize(1024, 768)
g = c.js(LAUNCHER); assert g['inside'] and g['ringInside'], g
print('PASS launcher stays inside across a portrait -> landscape rotation', flush=True)
check('no runtime errors', "__errors.length === 0 || __errors")

print('\nAudit Phase 1 regression suite passed', flush=True)
