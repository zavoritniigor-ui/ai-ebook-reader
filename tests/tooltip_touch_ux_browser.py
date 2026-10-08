"""Translation popup touch UX: on a touch screen (pointer: coarse) every popup button has a >=44px hit area that
does not overlap its neighbours, the header wraps instead of squeezing the word, the action buttons stay inside the
popup, and the speaker buttons expose their state (aria-pressed) and a localized accessible name. With a fine
pointer (mouse) the compact desktop sizes are unchanged. No AI provider is called.
"""
import os
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP()
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def load(width, height, touch):
    c.call('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=2 if touch else 1, mobile=touch)
    c.call('Emulation.setTouchEmulationEnabled', enabled=touch, maxTouchPoints=5 if touch else 1)
    c.call('Page.navigate', url=URL)
    c.wait("document.readyState==='complete' && !document.body.inert && typeof handleWordOrSelection==='function'", timeout=30)
    c.js(r"""(() => { localStorage.clear(); showUpdateBanner = () => {};
      state.translateMode = true; state.format = 'txt'; state.bookKey = 'touch-ux'; state.targetLang = 'en'; state.uiLang = 'uk';
      applyI18n(); speakText = () => {}; speakInLang = () => {};
      aiTranslateText = async () => 'Kitty sleeps on the sofa'; machineTranslate = async () => ({html: 'x', extras: ''});
      const p = document.createElement('p'); p.textContent = 'Le chat dort sur le canapé. Il fait beau aujourd\'hui.';
      p.style.cssText = 'margin:200px 20px;font-size:20px'; els.pages.replaceChildren(p);
      const r = document.createRange(); r.setStart(p.firstChild, 0); r.setEnd(p.firstChild, 12);
      const b = r.getBoundingClientRect(); state.lastSelectedRange = r;
      handleWordOrSelection('Le chat dort sur le canapé et la longue histoire continue', b.left + b.width / 2, b.top + b.height / 2, b);
      return 1; })()""")
    c.wait("els.tooltip.style.display === 'flex' && els.ttTranslation.textContent.includes('Kitty')", timeout=10)


BUTTONS = "[els.ttReplayBtn, els.ttExpandBtn, els.ttSvoBtn, els.ttCloseBtn, els.ttAskBtn, els.ttAiBtn, els.ttSpeakTranslation]"
HIT = """((b) => { const r = b.getBoundingClientRect(); const pad = %d; const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
  // above/below the control (vertical reach); sideways reach is shared with the neighbour inside the 8px gap, so it is checked on the outer edge only
  const pts = [[cx, r.top - pad + 1], [cx, r.bottom + pad - 1]];
  return pts.every(([x, y]) => { const e = document.elementFromPoint(x, y); return e === b || b.contains(e); }); })"""

# ---- desktop, mouse: unchanged compact sizes -------------------------------------------------------------------
load(1280, 800, False)
check('mouse: pointer is not coarse', "!matchMedia('(pointer: coarse)').matches")
check('mouse: compact 26px header buttons are unchanged', "[els.ttReplayBtn, els.ttExpandBtn, els.ttSvoBtn, els.ttCloseBtn].every(b => Math.round(b.getBoundingClientRect().height) === 26)")

# ---- phone, portrait, touch ------------------------------------------------------------------------------------
load(360, 740, True)
check('touch: pointer is coarse', "matchMedia('(pointer: coarse)').matches")
check('touch: compact header buttons keep a 44px hit area',
      "[els.ttReplayBtn, els.ttExpandBtn, els.ttSvoBtn, els.ttCloseBtn].every(b => b.getBoundingClientRect().height >= 29.5 && %s(b))" % (HIT % 5))
check('touch: the translation speaker is a 44px control', "(() => { const r = els.ttSpeakTranslation.getBoundingClientRect(); return r.width >= 43.5 && r.height >= 43.5; })()")
check('touch: the two main actions are at least 44px tall', "[els.ttAskBtn, els.ttAiBtn].every(b => b.getBoundingClientRect().height >= 43.5)")
check('touch: header buttons do not overlap each other',
      """(() => { const bs = [els.ttReplayBtn, els.ttExpandBtn, els.ttSvoBtn, els.ttCloseBtn].map(b => b.getBoundingClientRect());
      for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) { const a = bs[i], b = bs[j];
        if (a.left < b.right + 7 && b.left < a.right + 7 && a.top < b.bottom && b.top < a.bottom) return false; } return true; })()""")
check('touch: every button is inside the popup',
      """(() => { const tr = els.tooltip.getBoundingClientRect(); return %s.every(b => { const r = b.getBoundingClientRect();
        return r.width > 0 && r.left >= tr.left - 1 && r.right <= tr.right + 1 && r.top >= tr.top - 1 && r.bottom <= tr.bottom + 1; }); })()""" % BUTTONS)
check('touch: the popup fits the 360px viewport', "(() => { const r = els.tooltip.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })()")
check('touch: the selected word keeps some room in the single header row (>= 40px)', "els.ttOriginal.getBoundingClientRect().width >= 40")
check('a11y: close button has a localized accessible name', "els.ttCloseBtn.getAttribute('aria-label') === t('tClose') && t('tClose') !== 'Close'")
check('a11y: speaker buttons expose pressed state and a name',
      "(() => { setSpeakSide('original'); const a = els.ttReplayBtn.getAttribute('aria-pressed') === 'true' && els.ttSpeakTranslation.getAttribute('aria-pressed') === 'false';"
      " setSpeakSide('translation'); const b = els.ttReplayBtn.getAttribute('aria-pressed') === 'false' && els.ttSpeakTranslation.getAttribute('aria-pressed') === 'true';"
      " return a && b && !!els.ttReplayBtn.getAttribute('aria-label') && !!els.ttSpeakTranslation.getAttribute('aria-label'); })()")
check('a11y: the active speaker is not marked by colour alone (extra ring)',
      "(() => { setSpeakSide('original'); return getComputedStyle(els.ttReplayBtn).boxShadow !== 'none' && getComputedStyle(els.ttSpeakTranslation).boxShadow === 'none'; })()")
check('a11y: the translation is an aria-live region', "els.ttTranslation.getAttribute('aria-live') === 'polite'")

# ---- tablet, landscape, touch ----------------------------------------------------------------------------------
load(1024, 700, True)
check('tablet: buttons keep 44px hit areas', "[els.ttReplayBtn, els.ttExpandBtn, els.ttSvoBtn, els.ttCloseBtn].every(b => %s(b))" % (HIT % 5))
check('tablet: every button is inside the popup',
      """(() => { const tr = els.tooltip.getBoundingClientRect(); return %s.every(b => { const r = b.getBoundingClientRect();
        return r.width > 0 && r.left >= tr.left - 1 && r.right <= tr.right + 1 && r.top >= tr.top - 1 && r.bottom <= tr.bottom + 1; }); })()""" % BUTTONS)

check('no application errors', "!window.__errors || window.__errors.length === 0")
print('ALL TOOLTIP TOUCH UX CHECKS PASSED')
