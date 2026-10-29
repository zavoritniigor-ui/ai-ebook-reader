"""Reading on a phone, after a walk through the interface: the controls that float over the text (✦, the page counter, the side
tabs) fade a few seconds after the last touch and come back with the next one; a tap on a word while Study mode is off says how
to translate words, once per visit, with the switch in the hint (a tap beside the text says nothing); a lookup that failed says
so in a plain line with Retry, which repeats the lookup (none when no AI is set up); opening the menu closes the translation
popup, which stood above the menu and its dialogs; the Contents list shows the chapters' own headings («Chapter 1» only where a
chapter has none) below the ☰ button, with the left tabs out of its way; ◀ ▶ of the page bar are big enough for a finger.
A small invented HTML book; no network."""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable')
c.call('Emulation.setDeviceMetricsOverride', width=390, height=844, deviceScaleFactor=1, mobile=True)
c.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
c.call('Page.addScriptToEvaluateOnNewDocument', source='''
window.__errors = []; addEventListener('error', e => __errors.push(String(e.message)));
addEventListener('unhandledrejection', e => __errors.push(String(e.reason && e.reason.message || e.reason)));
''')
c.call('Page.navigate', url=URL)
c.wait("document.readyState === 'complete' && !document.body.inert && typeof openBookFile === 'function'", timeout=60)
# English menu; the onboarding cue (it animates the side tabs on the first pages) already seen -- both read when the page loads
c.js("localStorage.clear(); localStorage.setItem('reader_ui_lang', 'en');"
     " localStorage.setItem('reader_controls_onboarding_v1', JSON.stringify({ ask: true, grammar: true, toc: true })); 1")
c.call('Page.reload'); c.wait("document.readyState === 'complete' && !document.body.inert && typeof openBookFile === 'function'", timeout=60)
c.js("showUpdateBanner = () => {}; document.getElementById('sw-update-banner')?.remove(); if (state.translateMode) els.translateBtn.click(); 1")
para = ' '.join(['Le matin, Marcel ouvrait les volets de sa petite maison et regardait le jardin.'] * 14)
book = (f'<html><body><p>{para}</p><h1>Le jardin</h1>' + f'<p>{para}</p>' * 3 + '<h1>La clé perdue</h1>' + f'<p>{para}</p>' * 3
        + '</body></html>')
c.js(f"openBookFile(new File([{json.dumps(book)}], 'carnet.html', {{ type: 'text/html' }})); 1")
c.wait("state.format && document.querySelectorAll('#toc-list li').length >= 2", timeout=30)
time.sleep(0.8)


def check(name, expr, timeout=None):
    if timeout: c.wait(expr, timeout=timeout)
    v = c.js(expr)
    assert v is True, (name, v)
    print('PASS', name, flush=True)


def tap(x, y):
    c.call('Input.dispatchTouchEvent', type='touchStart', touchPoints=[{'x': x, 'y': y}])
    c.call('Input.dispatchTouchEvent', type='touchEnd', touchPoints=[])
    time.sleep(0.4)


WORD = """(() => { const w = document.createTreeWalker(document.getElementById('reader-pages'), NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { const i = n.nodeValue.indexOf('regardait'); if (i < 0) continue; const r = document.createRange();
    r.setStart(n, i); r.setEnd(n, i + 9); const b = r.getBoundingClientRect();
    if (b.width && b.left > innerWidth * 0.25 && b.right < innerWidth * 0.75 && b.top > 80 && b.bottom < innerHeight * 0.6) return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }
  return null; })()"""

# ---- 1. reading calm
time.sleep(4.6)
check('1a four seconds after the last touch the controls over the text fade (✦, page counter, side tabs), still visible',
      "document.documentElement.classList.contains('reading-calm') && ['qm-launcher', 'ask-tab', 'grammar-tab'].every(id => { const o = +getComputedStyle(document.getElementById(id)).opacity; return o > 0 && o < 0.5; })"
      " && (!document.getElementById('pdf-scrubber').classList.contains('collapsed') || +getComputedStyle(document.getElementById('pdf-scrubber')).opacity < 0.5)")
c.call('Input.dispatchMouseEvent', type='mouseMoved', x=200, y=300)
time.sleep(0.7)   # the 0.4 s fade back
check('1b the next touch, move, key or scroll brings them back', "!document.documentElement.classList.contains('reading-calm') && +getComputedStyle(document.getElementById('qm-launcher')).opacity > 0.9")

# ---- 2. a word tapped with Study mode off
check('2a Study mode is off (the default)', "state.translateMode === false")
c.js("studyHintShown = false; localStorage.removeItem('reader_study_hint_count'); document.getElementById('reader-toast')?.classList.remove('show'); 1")
tap(195, 836)   # the bottom margin, beside the text
check('2b a tap beside the text says nothing', "!document.querySelector('#reader-toast.show')")
c.js("closeFooterMenu(); 1")   # that tap opened the page bar; the next tap would only close it
w = c.js(WORD)
assert w, 'no word in the middle of the page'
tap(w['x'], w['y'])
check('2c a tap on a word says how to translate words, with the switch in the hint',
      "(() => { const toast = document.querySelector('#reader-toast.show.actionable'); return !!toast && toast.textContent.includes(t('studyHint').slice(0, 20)) && toast.querySelector('.toast-action').textContent === t('studyHintOn'); })()")
check('2d ... counted, so a reader is told three visits at most', "localStorage.getItem('reader_study_hint_count') === '1'")
c.js("document.getElementById('reader-toast').classList.remove('show'); closeFooterMenu(); 1")
tap(w['x'], w['y'])
check('2e ... and once per visit', "!document.querySelector('#reader-toast.show')")
c.js("studyHintShown = false; closeFooterMenu(); 1")
tap(w['x'], w['y'])
c.js("document.querySelector('#reader-toast .toast-action').click(); 1")
check('2f its button turns Study mode on', "state.translateMode === true && localStorage.getItem('reader_translate_mode') === '1'")

# ---- 3. a failed lookup
c.js("""window.__asked = 0; aiAvailable = () => true; translationProviders = () => ['groq'];
  aiTranslateText = async () => { __asked++; return null; }; translateLocally = async () => null; deviceLlmTranslate = async () => null;
  offlineTranslateSentence = async () => null; offlineTrSuggest = () => {};
  handleWordOrSelection('le jardin et la maison', 200, 300); 1""")
check('3a a lookup the AI did not answer: a plain message and Retry', "!!document.querySelector('#tt-translation .tt-error .tt-retry')"
      " && document.querySelector('#tt-translation .tt-error').textContent.includes(t('sentenceAiFailed').slice(0, 15))"
      " && getComputedStyle(document.querySelector('#tt-translation .tt-error')).fontSize === '14px'", timeout=20)
c.js("document.querySelector('#tt-translation .tt-retry').click(); 1")
check('3b Retry asks again', "__asked >= 2", timeout=20)
c.js("aiAvailable = () => false; handleWordOrSelection('le jardin et la maison', 200, 300); 1")
check('3c with no AI set up there is nothing to retry', "!!document.querySelector('#tt-translation .tt-error') && !document.querySelector('#tt-translation .tt-retry')", timeout=20)

# ---- 4. the menu closes the popup
time.sleep(1.5)   # the Back-button history (js/pwa-lifecycle.js) settles after the popups of step 3
check('4a the popup is open', "getComputedStyle(document.getElementById('word-tooltip')).display !== 'none'")
c.js("els.menuHandle.click(); 1")
time.sleep(0.4)
check('4b opening the menu closes it (it stood above the menu and its dialogs)', "isFullMenuOpen() && getComputedStyle(document.getElementById('word-tooltip')).display === 'none'")
c.js("closeFullMenu(); 1")

# ---- 5. Contents
check('5a the Contents list shows the chapters\' own headings, «Chapter 1» where a chapter has none',
      "JSON.stringify([...document.querySelectorAll('#toc-list li')].map(li => li.textContent)) === JSON.stringify([t('chapter') + ' 1', 'Le jardin', 'La clé perdue'])")
c.js("els.sidebar.classList.remove('collapsed'); 1")
time.sleep(0.5)
check('5b the panel starts below the ☰ button, and the left tabs wait until it closes',
      "document.getElementById('book-lang-select').getBoundingClientRect().top > document.getElementById('menu-handle').getBoundingClientRect().bottom"
      " && getComputedStyle(document.getElementById('ask-tab')).visibility === 'hidden'")
c.js("els.sidebar.classList.add('collapsed'); 1")
time.sleep(0.4)
check('5c ... and come back when it closes', "getComputedStyle(document.getElementById('ask-tab')).visibility === 'visible'")

# ---- 6. finger-sized page bar
c.js("openFooterMenu(); 1")
time.sleep(0.4)
check('6 ◀ ▶ of the page bar are at least 44 px high for a finger',
      "['prev-btn', 'next-btn'].every(id => document.getElementById(id).getBoundingClientRect().height >= 44)")
check('7 nothing threw', "__errors.length === 0 ? true : JSON.stringify(__errors)")
print('ALL PASS reader_ui_polish_browser', flush=True)
