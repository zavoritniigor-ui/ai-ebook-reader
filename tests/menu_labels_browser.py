"""Main menu = a side drawer with five titled sections (owner, 2026-10-18: «group the menu like a professional app, informative and
clear to anyone; the voice choice does not work — remove it»).

Contract checked here (no network): the sections Book, Reading, Learning, Tools, Settings in that order; every row has a visible
title and a one-line description, every control a localized accessible name, no emoji in titles; on/off rows are real switches
(role="switch", aria-checked) whose title never changes; a list row opens its list wherever it is tapped and always shows the
current value; the PDF-only row exists only for PDFs; the voice list is gone and the best voice of each language is picked by
itself; the drawer covers the full width on a phone and 392px on the left on a tablet / computer, never moves the book, and is
closed by ✕, the dimmed backdrop, Escape and Android Back; actions that show something on the page close it; dialogs opened from
it appear above it; every new text exists in all 9 menu languages with its own wording."""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Network.enable'); c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__errors = []; addEventListener('error', e => __errors.push(e.message));
const voicesList = [{voiceURI: 'fr-basic', name: 'French', lang: 'fr-FR', localService: true},
  {voiceURI: 'fr-neural', name: 'French Neural Natural', lang: 'fr-FR', localService: false},
  {voiceURI: 'uk-1', name: 'Ukrainian', lang: 'uk-UA', localService: true}];
Object.defineProperty(window, 'speechSynthesis', {configurable: true, value: {speaking: false, pending: false, paused: false,
  getVoices: () => voicesList, cancel() {}, speak() {}, pause() {}, resume() {}, addEventListener() {}, onvoiceschanged: null}});
''')


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.2); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def load(width, height, mobile=True, book=None, keep=False):
    c.call('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=1, mobile=mobile)
    c.call('Emulation.setTouchEmulationEnabled', enabled=mobile, maxTouchPoints=5)
    if not keep:
        c.call('Page.navigate', url=URL)
        c.wait("document.readyState==='complete' && !document.body.inert && typeof openFullMenu==='function'", timeout=30)
        c.js("localStorage.clear(); localStorage.setItem('reader_menu_autohide', 'off'); document.getElementById('sw-update-banner')?.remove(); state.uiLang='uk'; applyI18n(); 1")
        if book:
            c.js("window.__ok = 0; openBookFile(new File([%s], 'menu.md')).then(() => window.__ok = 1); 1" % json.dumps(book))
            c.wait("window.__ok === 1", timeout=30)
    c.js("openFullMenu(); 1"); time.sleep(0.5)


ROWS = "[...document.querySelectorAll('#header-controls .menu-row, #header-controls .menu-cta')].filter(r => r.offsetParent !== null)"
BOOK = "# Livre\n\n" + "Le petit prince regardait les étoiles chaque soir. " * 200

# ---------------------------------------------------------------- phone
load(390, 844, book=BOOK)
check('1 five titled sections in order: Book, Reading, Learning, Tools, Settings',
      "JSON.stringify([...document.querySelectorAll('.menu-section-title')].map(h => h.textContent)) === JSON.stringify(['Книга','Читання','Навчання','Інструменти','Налаштування']) || JSON.stringify([...document.querySelectorAll('.menu-section-title')].map(h => h.textContent))")
check('2 every visible row has a title and a one-line description (only «Exit» has no description)',
      ROWS + ".every(r => { const t = r.querySelector('.mr-title'), d = r.querySelector('.mr-desc'); return t && t.textContent.trim().length >= 3 && (d && d.textContent.trim().length >= 8 || r.id === 'btn-exit-app'); }) || " + ROWS + ".filter(r => !r.querySelector('.mr-desc')).map(r => r.id).join()")
check('3 no emoji in section and row titles (consistent line icons instead)',
      "[...document.querySelectorAll('.menu-section-title, .mr-title')].every(e => !/\\p{Extended_Pictographic}/u.test(e.textContent)) || [...document.querySelectorAll('.mr-title')].map(e => e.textContent).filter(x => /\\p{Extended_Pictographic}/u.test(x)).join()")
check('4 every control in the menu has an accessible name (aria-label / aria-labelledby / label for)',
      """[...document.querySelectorAll('#app-header button, #app-header select')].filter(e => e.offsetParent !== null).every(e => {
           const by = e.getAttribute('aria-labelledby'); const name = by ? by.split(' ').map(id => document.getElementById(id)?.textContent || '').join(' ') : (e.getAttribute('aria-label') || (e.labels && e.labels[0] && e.labels[0].textContent) || '');
           return name.trim().length >= 2; }) || 'unnamed'""")
check('5 on/off rows are switches with a fixed title: «Study mode» is on, «Two voices» off',
      "els.translateBtn.getAttribute('role') === 'switch' && els.translateBtn.getAttribute('aria-checked') === String(state.translateMode) && els.altVoicesBtn.getAttribute('aria-checked') === 'false' && els.translateBtn.querySelector('.mr-title').textContent === t('mStudy')")
check('5b toggling flips the switch, not the title', """(() => { const before = state.translateMode; els.translateBtn.click(); const ok = els.translateBtn.getAttribute('aria-checked') === String(!before) && els.translateBtn.querySelector('.mr-title').textContent === t('mStudy');
     els.translateBtn.click(); els.altVoicesBtn.click(); const ok2 = els.altVoicesBtn.getAttribute('aria-checked') === 'true'; els.altVoicesBtn.click(); return ok && ok2 && els.altVoicesBtn.getAttribute('aria-checked') === 'false'; })()""")
check('5c «Study mode» returns to the page a moment after the switch moved (the next tap can be a word); «Two voices» keeps the menu open', "!isFullMenuOpen()", timeout=2)
c.js("openFullMenu(); 1"); time.sleep(0.4)
check('6 the read-aloud row is titled «Read aloud» (no emoji, no ON/OFF)', "els.ttsBtn.querySelector('.mr-title').textContent === t('mRead')")
check('7 the voice list is gone; the best voice of each language is picked by itself (neural over basic)',
      "!document.getElementById('voice-select') && !document.querySelector('label[for=\"voice-select\"]') && state.selectedVoiceURIByLang.fr === 'fr-neural' && state.selectedVoiceURIByLang.uk === 'uk-1'")
check('7b voices saved by the old list are forgotten (they could no longer be changed)', "localStorage.getItem('reader_voices') === null && localStorage.getItem('reader_voices_manual') === null")
for sel in ('theme-select', 'target-lang', 'ui-lang'):
    check(f'8 the «{sel}» row: a tap anywhere on it lands on the list, which shows the current value',
          f"""(() => {{ const s = document.getElementById('{sel}'), row = s.closest('.menu-row'); s.scrollIntoView({{block: 'center'}}); const r = row.getBoundingClientRect(), t = row.querySelector('.mr-title').getBoundingClientRect();
             const hit = document.elementFromPoint(t.left + 4, t.top + t.height / 2); const sr = s.getBoundingClientRect();
             return hit === s && Math.abs(sr.width - r.width) < 2 && Math.abs(sr.height - r.height) < 2 && s.selectedIndex >= 0 || JSON.stringify({{hit: hit && (hit.id || hit.className)}}); }})()""")
check('9 the PDF page-fit row only exists for PDFs, with localized choices',
      """(() => { const row = document.getElementById('pdf-fit').closest('.menu-row'); const text = row.offsetParent === null; document.body.classList.add('pdf-mode'); const pdf = row.offsetParent !== null;
         document.body.classList.remove('pdf-mode'); return text && pdf && [...document.getElementById('pdf-fit').options].map(o => o.textContent).join('|') === [t('mFitWidth'), t('mFitPage'), t('mFitFree')].join('|'); })()""")
check('10 phone: the menu covers the whole width, scrolls inside itself, and the book does not move',
      "(() => { const h = document.getElementById('app-header').getBoundingClientRect(); return h.left === 0 && Math.abs(h.width - innerWidth) < 1 && h.height <= innerHeight + 1 && document.getElementById('app-header').scrollHeight > h.height && document.querySelector('.workspace').getBoundingClientRect().top === 0 || JSON.stringify(h); })()")
check('11 nothing overflows horizontally', "document.documentElement.scrollWidth <= innerWidth + 1 && " + ROWS + ".every(r => { const b = r.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth + 1; })")
check('12 the reading-comprehension row opens its details right under it, inside the menu',
      """(() => { const b = document.getElementById('reading-stats-button'); if (b.disabled) return 'disabled'; b.click(); const p = document.getElementById('reading-stats-popover');
         const ok = !p.hidden && document.getElementById('app-header').contains(p) && p.getBoundingClientRect().top >= b.getBoundingClientRect().bottom - 1; b.click(); return ok && p.hidden; })()""")
check('13 ✕ closes the menu; the book does not move', "(() => { const top = document.querySelector('.workspace').getBoundingClientRect().top; document.getElementById('menu-close').click(); return !isFullMenuOpen() && document.querySelector('.workspace').getBoundingClientRect().top === top; })()")
check('13b closed: off screen and out of the Tab order', "(() => { const h = document.getElementById('app-header'); return getComputedStyle(h).visibility === 'hidden' || getComputedStyle(h).visibility; })()", timeout=2)
c.js("openFullMenu(); 1")
check('14 Escape closes it', "(() => { document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); return !isFullMenuOpen(); })()")
c.js("openFullMenu(); 1")
check('15 with a book open the menu is a layer for Android Back', "topOpenOverlay() === 'menu'")
check('16 Contents closes the menu and shows the contents', "(() => { document.getElementById('toggle-toc-desktop').click(); return true; })()")
check('16b ...', "!isFullMenuOpen() && !els.sidebar.classList.contains('collapsed')", timeout=2)
c.js("els.sidebar.classList.add('collapsed'); openFullMenu(); 1")
check('17 a dialog opened from the menu (My books) appears above it',
      """(() => { document.getElementById('btn-my-books').click(); const m = document.getElementById('library-modal'); const r = m.querySelector('.library-box').getBoundingClientRect();
         const hit = document.elementFromPoint(r.left + r.width / 2, r.top + 20); const ok = m.classList.contains('open') && m.contains(hit); closeLibrary(); return ok || (hit && hit.id); })()""")
check('18 Free library row opens the library', "(() => { document.getElementById('btn-free-library').click(); const ok = document.getElementById('library-modal').classList.contains('open'); closeLibrary(); return ok; })()")

# ---------------------------------------------------------------- tablet / computer
for w, h, mobile in ((800, 1280, True), (1280, 800, True), (1440, 900, False)):
    load(w, h, mobile=mobile, keep=True)
    check(f'19 {w}x{h}: the menu is a 392px panel on the left, the book stays visible beside it under a dimmed backdrop',
          "(() => { const r = document.getElementById('app-header').getBoundingClientRect(), b = document.getElementById('menu-backdrop'); return r.left === 0 && Math.round(r.width) === 392 && !b.hidden && getComputedStyle(b).opacity === '1' || JSON.stringify({w: r.width, bd: b.hidden}); })()", timeout=2)
    check(f'19b {w}x{h}: a tap on the backdrop closes it', "(() => { const x = innerWidth - 60, y = innerHeight / 2; document.elementFromPoint(x, y).click(); return !isFullMenuOpen(); })()")
    check(f'19c {w}x{h}: closed, the backdrop is gone too', "document.getElementById('menu-backdrop').hidden === true")

# ---------------------------------------------------------------- languages
load(390, 844, keep=True)
KEYS = ['mTagline','mSecBook','mOpen','mOpenDesc','mShelf','mShelfDesc','mLibrary','mLibraryDesc','mToc','mTocDesc','mSecReading','mRead','mPause','mResume','mReadDesc',
        'mTwoVoices','mTwoVoicesDesc','mFontSize','mFontSizeDesc','mPdfFit','mPdfFitDesc','mFitWidth','mFitPage','mFitFree','mTheme','mThemeDesc','mSecLearning','mStudy',
        'mStudyDesc','mTargetLang','mTargetLangDesc','mRules','mRulesDesc','mStats','mStatsDesc','mSecTools','mInk','mInkDesc','mRegion','mRegionDesc','mPrint','mPrintDesc',
        'mSecSettings','mUiLang','mUiLangDesc','mAi','mAiDesc','mUpdate','mUpdateDesc','mExit']
check('20 every menu text exists in all 9 languages with its own wording (no raw key, no English fallback)',
      """(() => { const keys = %s; const langs = ['uk','en','fr','ru','zh','ko','hi','ga','es']; const bad = [];
         for (const k of keys) for (const l of langs) { const v = I18N[k] && I18N[k][l]; if (!v || v === k) bad.push(k + ':' + l); else if (l !== 'en' && v === I18N[k].en && !/^[^a-z]*$/i.test(v)) bad.push('same as English ' + k + ':' + l); }
         return bad.length === 0 || JSON.stringify(bad); })()""" % json.dumps(KEYS))
check('20b ... and every text the menu shows comes from one of them (no hard-coded Ukrainian left)',
      "[...document.querySelectorAll('#app-header [data-i18n]')].every(e => I18N[e.dataset.i18n])")
check('21 switching the menu language relabels sections, rows and descriptions',
      """(() => { const out = []; for (const l of ['en','fr','ga','zh','es']) { state.uiLang = l; applyI18n(); out.push(document.querySelector('.menu-section-title').textContent + '|' + document.querySelector('#btn-ink .mr-title').textContent + '|' + document.querySelector('#btn-ink .mr-desc').textContent + '|' + els.ttsBtn.querySelector('.mr-title').textContent); }
         state.uiLang = 'uk'; applyI18n(); return new Set(out).size === 5 && out[0] === 'Book|Handwriting|Notes with a finger or stylus on the page|Read aloud' || JSON.stringify(out); })()""")
check('22 nothing threw', "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL MENU LABEL CHECKS PASSED')
