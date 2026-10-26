"""Browser test: the start screen (no book open) is not a text to translate. With the translate mode on, a tap on the app's
name, on its description or on the library button does not open the translation window and does not ask for a translation.
A word in an open book still does: the reader's own suites cover that (single_word_translation_browser.py, pdf_word_click_browser.py).

Each tap is checked against a control: the pointer event must reach the page (so a silent tap cannot pass), and only then
the translation must stay closed. The window needs a moment to appear, so it is read after a fixed pause, once.
"""
import os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')

c = CDP()
c.call('Page.enable')
c.call('Runtime.enable')
c.call('Emulation.setDeviceMetricsOverride', width=1024, height=768, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState === 'complete' && !document.body.inert")
c.js("localStorage.clear(); showUpdateBanner = () => {}; document.getElementById('sw-update-banner')?.remove();")

# The translation works (a model answers, as in the reader with its AI on); the start screen must still not use it.
c.js("""(() => {
  state.translateMode = true; aiAvailable = () => true; speakText = () => {}; speakInLang = () => {};
  callAI = async () => 'UK'; machineTranslate = async () => ({ html: '', extras: '' });
  window.__taps = 0; window.__translations = [];
  document.addEventListener('pointerdown', () => { window.__taps++; }, true);
  const original = window.handleWordOrSelection;
  window.handleWordOrSelection = (...args) => { __translations.push(String(args[0]).slice(0, 40)); return original(...args); };
  return true;
})()""")


def check(name, ok):
    if ok is not True:
        raise AssertionError(f'FAIL: {name} -> {ok!r}')
    print('PASS:', name)


def tap(selector, label):
    rect = c.js(f"(() => {{ const el = document.querySelector({selector!r}); if (!el) return null; const r = el.getBoundingClientRect(); return {{ x: r.left + r.width / 2, y: r.top + r.height / 2 }}; }})()")
    assert rect, f'no element {selector}'
    taps_before = c.js("__taps")
    translations_before = c.js("__translations.length")
    for kind in ('mousePressed', 'mouseReleased'):
        c.call('Input.dispatchMouseEvent', type=kind, x=rect['x'], y=rect['y'], button='left', clickCount=1)
    time.sleep(1.2)
    check(f'control: the tap on {label} reached the page', c.js("__taps") > taps_before)
    check(f'a tap on {label} asks for no translation', c.js("__translations.length") == translations_before)
    check(f'a tap on {label} opens no translation window', c.js("""(() => {
        const t = document.getElementById('word-tooltip');
        return !t || t.hidden || getComputedStyle(t).display === 'none' || getComputedStyle(t).visibility === 'hidden';
    })()"""))


check('0 No book is open: the start screen is shown', c.js("!state.format && !!document.getElementById('home-screen')"))
tap('.home-title', 'the app name')
tap('.home-tagline', 'the description')
tap('#home-library', 'the library button')
print('PASS: all start screen checks')
