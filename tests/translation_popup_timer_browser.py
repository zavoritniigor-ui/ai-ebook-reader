"""Translation popup auto-close timer: the countdown for a single word starts when the translation is ON SCREEN,
never while it is still loading (AI/network latency must not eat the reader's time). Multi-word / sentence
popups keep their existing "stays open until dismissed" behaviour. No real AI provider is called: the AI and
dictionary lookups are promises the test resolves or rejects exactly when it wants to.
"""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP()
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof handleWordOrSelection==='function'", timeout=30)


def pause(s): c.js(f'new Promise(r => setTimeout(r, {int(s * 1000)}))')


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


TEXT = "Le chat dort sur le canapé. Il fait beau aujourd'hui dans la ville."
c.js(r"""(() => {
  localStorage.clear(); showUpdateBanner = () => {};
  state.translateMode = true; state.format = 'txt'; state.bookKey = 'popup-timer'; state.targetLang = 'en'; state.uiLang = 'en';
  document.body.classList.add('immersive-mode'); speakText = () => {}; speakInLang = () => {};
  const p = document.createElement('p'); p.textContent = %s; p.style.cssText = 'margin:200px 40px;font-size:20px;line-height:1.7;max-width:700px';
  els.pages.replaceChildren(p); window.__p = p;
  // Controllable lookups: every AI request waits for the test.
  window.__pending = []; window.__fail = false;
  aiTranslateText = (text, src, signal) => new Promise((resolve, reject) => __pending.push({text, resolve, reject}));
  machineTranslate = async () => { if (__fail) throw new Error('translation failed'); return {html: '', extras: ''}; };
  state.translationCache = {};
  // When did the popup open / close? (performance.now of the transition)
  window.__openedAt = null; window.__closedAt = null;
  new MutationObserver(() => { const shown = els.tooltip.style.display !== 'none';
    if (shown && __openedAt === null) __openedAt = performance.now(); if (!shown && __openedAt !== null && __closedAt === null) __closedAt = performance.now(); })
    .observe(els.tooltip, {attributes: true, attributeFilter: ['style']});
  return true; })()""" % json.dumps(TEXT, ensure_ascii=False))

WORD = r"""((w, nth) => { const walker = document.createTreeWalker(__p, NodeFilter.SHOW_TEXT); let n, hits = nth || 0;
  while ((n = walker.nextNode())) { let i = -1; while ((i = n.nodeValue.indexOf(w, i + 1)) !== -1) { if (hits-- === 0) {
    const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + w.length); const b = r.getBoundingClientRect(); return {x: b.left + b.width / 2, y: b.top + b.height / 2, l: b.left + 2, r: b.right - 2}; } } }
  return null; })"""


def reset():
    c.js("""(() => { els.ttCloseBtn?.click(); els.tooltip.style.display = 'none'; __pending = []; __fail = false; state.translationCache = {};
      __openedAt = null; __closedAt = null; state.touchJustCommitted = 0; state.tooltipJustClosed = false; return true; })()""")
    pause(.3)
    c.js("__openedAt = null; __closedAt = null; 1")


def tap(word, nth=0):
    p = c.js(WORD + "(%s, %d)" % (json.dumps(word, ensure_ascii=False), nth))
    for kind in ('mousePressed', 'mouseReleased'):
        c.call('Input.dispatchMouseEvent', type=kind, x=p['x'], y=p['y'], button='left', clickCount=1)
    pause(.25)


def resolve(idx, translation):
    """Deliver AI answer #idx; returns performance.now() at the moment it is rendered."""
    return c.js("(async () => { __pending[%d].resolve(%s); await new Promise(r => setTimeout(r, 0)); await new Promise(r => requestAnimationFrame(r)); return performance.now(); })()"
                % (idx, json.dumps(translation)))


def shown(): return c.js("els.tooltip.style.display !== 'none'")


DURATION = 1800   # the existing single-word countdown (scheduleTooltipHide default) -- unchanged by this fix

# 1. immediate response
reset(); tap('chat')
t_ready = resolve(0, 'cat')
check('1 immediate: translation shown', "els.ttTranslation.textContent.includes('cat')")
c.wait("els.tooltip.style.display === 'none'", timeout=4)
closed = c.js('__closedAt')
assert DURATION - 150 <= closed - t_ready <= DURATION + 400, ('1 immediate: closes one interval after the translation', closed - t_ready)
print('PASS 1 immediate + 9 existing single-word auto-dismiss: closes %d ms after the translation appeared' % (closed - t_ready))

# 2/3. slow (1 s) and very slow (3 s, the required case; 6 s) responses
for label, delay in (('2 slow', 1.0), ('3 slow 3s (required case)', 3.0), ('3b very slow 6s', 6.0)):
    reset(); tap('dort')
    opened = c.js('__openedAt')
    pause(delay)
    assert shown(), (label, 'popup closed while the translation was still loading')
    assert c.js("els.ttTranslation.textContent === t('translating')"), (label, 'the loading state is shown while waiting', c.js('els.ttTranslation.textContent'))
    t_ready = resolve(0, 'sleeps')
    c.wait("els.tooltip.style.display === 'none'", timeout=delay + 5)
    closed = c.js('__closedAt')
    assert DURATION - 150 <= closed - t_ready <= DURATION + 400, (label, 'countdown must start when the translation appears', closed - t_ready, t_ready - opened)
    print('PASS %s: open for %d ms while loading, then the full %d ms after the translation (closed after %d ms)' % (label, t_ready - opened, DURATION, closed - t_ready))

# 4. failure: the error stays until dismissed; 5. re-requesting the word (the existing retry path) starts a fresh countdown
reset(); c.js('__fail = true; 1'); tap('canapé')
c.js("__pending[0].resolve(null); 1"); pause(.4)
check('4 failed translation: the error is shown', "els.tooltip.style.display !== 'none' && els.ttTranslation.textContent.length > 0 && !els.ttTranslation.textContent.includes('sofa')")
pause((DURATION + 800) / 1000)
check('4 failed translation is not auto-closed by the reading timer', "els.tooltip.style.display !== 'none'")
c.js('__fail = false; __pending = []; __closedAt = null; 1'); c.js("els.tooltip.style.display = 'none'; state.tooltipJustClosed = false; __openedAt = null; 1"); pause(.2)
tap('canapé')
t_ready = resolve(0, 'sofa')
c.wait("els.tooltip.style.display === 'none'", timeout=5)
closed = c.js('__closedAt')
assert DURATION - 150 <= closed - t_ready <= DURATION + 400, ('5 retry', closed - t_ready)
print('PASS 5 retry after failure: loads, then a fresh %d ms countdown from the successful translation' % DURATION)

# 6. manual close while loading, then the late answer arrives
reset(); tap('beau')
c.js("els.ttCloseBtn.click(); 1"); pause(.2)
check('6 closed manually while loading', "els.tooltip.style.display === 'none'")
c.js("__openedAt = null; 1")
resolve(0, 'nice'); pause((DURATION + 500) / 1000)
check('6 the late answer does not reopen the popup or leave a timer behind', "els.tooltip.style.display === 'none' && __openedAt === null")

# 7/8. select another word while the first is loading; the first answer arrives last
reset(); tap('ville')
tap('aujourd')
c.js("__closedAt = null; 1")   # tapping B replaced popup A; measure only the newer popup from here
assert c.js('__pending.length') == 2, c.js('__pending.map(p => p.text)')
t_b = resolve(1, 'today')
check('7 the newer word is shown', "els.ttTranslation.textContent.includes('today')")
pause(.9)
resolve(0, 'town')      # late answer for the OLD word
check('8 a late answer for an older word never replaces the newer translation', "els.ttTranslation.textContent.includes('today') && !els.ttTranslation.textContent.includes('town')")
c.wait("els.tooltip.style.display === 'none'", timeout=5)
closed = c.js('__closedAt')
assert DURATION - 150 <= closed - t_b <= DURATION + 400, ('8 the late old answer must not restart or shorten the countdown', closed - t_b)
print('PASS 8 the late old answer did not restart/shorten the newer popup countdown (closed %d ms after its translation)' % (closed - t_b))

# 10. a multi-word selection stays open until dismissed (existing behaviour)
reset()
a = c.js(WORD + "('Il', 0)"); b = c.js(WORD + "('ville', 0)")
c.call('Input.dispatchMouseEvent', type='mouseMoved', x=a['l'], y=a['y'])
c.call('Input.dispatchMouseEvent', type='mousePressed', x=a['l'], y=a['y'], button='left', clickCount=1)
for i in range(1, 11):
    c.call('Input.dispatchMouseEvent', type='mouseMoved', x=a['l'] + (b['r'] - a['l']) * i / 10, y=a['y'] + (b['y'] - a['y']) * i / 10, button='left', buttons=1)
    pause(.02)
c.call('Input.dispatchMouseEvent', type='mouseReleased', x=b['r'], y=b['y'], button='left', clickCount=1)
pause(.4)
assert c.js('__pending.length') >= 1 and ' ' in c.js('__pending.at(-1).text'), c.js('__pending.map(p => p.text)')
resolve(len(c.js('__pending')) - 1, "It is nice today in the town.")
pause((DURATION + 1500) / 1000)
check('10 a sentence translation stays open until the reader closes it', "els.tooltip.style.display !== 'none' && els.ttTranslation.textContent.includes('nice today')")
c.js("els.ttCloseBtn.click(); 1"); pause(.2)
check('10 ... and closes when dismissed', "els.tooltip.style.display === 'none'")
print('ALL TRANSLATION POPUP TIMER CHECKS PASSED')
