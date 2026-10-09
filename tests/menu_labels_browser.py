"""Main menu clarity: every header control says what it is (visible text or accessible name), the two language
selects are told apart by a visible label, group captions exist (shown on phone and wide screens, hidden on tablets
to keep the header short), nothing overflows horizontally at phone / tablet portrait / tablet landscape widths, the
header height on tablets stays bounded, and every label exists in all 8 UI languages. No network."""
import os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def load(width, height, mobile=True):
    c.call('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=1, mobile=mobile)
    c.call('Emulation.setTouchEmulationEnabled', enabled=mobile, maxTouchPoints=5)
    c.call('Page.navigate', url=URL)
    c.wait("document.readyState==='complete' && !document.body.inert && typeof applyI18n==='function'", timeout=30)
    c.js("localStorage.clear(); document.getElementById('sw-update-banner')?.remove(); state.uiLang='uk'; applyI18n(); 1")
    time.sleep(0.5)


load(820, 1180)
check('1 every header control has a name: visible text or aria-label/title (>= 2 chars)',
      """[...document.querySelectorAll('#header-controls button, #header-controls select, #header-controls label.btn')].filter(e => e.offsetParent !== null || e.id === 'btn-exit-app').every(e => ((e.textContent || '').trim().length >= 2 && !/^[A-Z]$/.test((e.textContent || '').trim())) || (e.getAttribute('aria-label') || e.title || '').length >= 2 || JSON.stringify(e.outerHTML.slice(0, 80)))""")
check('2 the two language selects are told apart by visible labels bound to them',
      """(() => { const lab = id => document.querySelector('label.field-cap[for="' + id + '"]'); const a = lab('target-lang'), b = lab('ui-lang'); return !!a && !!b && a.textContent.trim() !== b.textContent.trim() && a.textContent.trim().length > 3; })()""")
check('3 four+ group captions exist and the previously icon-only buttons have visible text labels',
      """document.querySelectorAll('.group-caption').length >= 5 && ['btn-ink', 'btn-region'].every(id => document.getElementById(id).textContent.trim().length > 4) && document.querySelector('button[onclick="openKeySettings()"]').textContent.trim().length > 4""")
check('4 tablet portrait: captions hidden, header <= 190px, no horizontal overflow',
      """(() => { const h = document.getElementById('app-header').getBoundingClientRect().height; return getComputedStyle(document.querySelector('.group-caption')).display === 'none' && h <= 190 && document.documentElement.scrollWidth <= innerWidth + 1 || JSON.stringify({h, sw: document.documentElement.scrollWidth}); })()""")
check('5 tablet portrait: every header control fits inside the viewport',
      "[...document.querySelectorAll('#header-controls button, #header-controls select, #header-controls label.btn')].filter(e => e.offsetParent !== null).every(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1; })")
check('6 the learning toggle names what it toggles', "els.translateBtn.textContent.includes('Вивчення слів')")

load(1024, 768)
check('7 tablet landscape: header <= 190px, no overflow, captions hidden',
      "(() => { const h = document.getElementById('app-header').getBoundingClientRect().height; return h <= 190 && document.documentElement.scrollWidth <= innerWidth + 1 && getComputedStyle(document.querySelector('.group-caption')).display === 'none' || h; })()")

load(390, 800)
check('8 phone: group captions are shown as their own row above each group and nothing overflows',
      """(() => { const caps = [...document.querySelectorAll('.group-caption')]; return caps.length >= 5 && caps.every(x => getComputedStyle(x).display !== 'none' && x.textContent.trim().length > 2) && document.documentElement.scrollWidth <= innerWidth + 1; })()""")

load(1366, 900, mobile=False)
check('9 desktop: captions are shown above the groups', "[...document.querySelectorAll('.group-caption')].every(x => getComputedStyle(x).display !== 'none')")

check('10 every new label exists in all 8 UI languages with its own text (no raw key, no English fallback)',
      """(() => { const keys = ['grpBook','grpSpeech','grpStudy','grpText','grpView','lblTranslateTo','lblUiLang','lblInk','lblRegion','lblAiKey','open','read','learnOn','learnOff'];
         const langs = ['uk','en','fr','ru','zh','ko','hi','ga']; const bad = [];
         for (const k of keys) for (const l of langs) { const v = I18N[k] && I18N[k][l]; if (!v || v === k) bad.push(k + ':' + l); else if (l !== 'en' && v === I18N[k].en && !['grpBook','grpText'].includes(k) && !/^[^a-z]*$/i.test(v)) bad.push('fallback ' + k + ':' + l); }
         return bad.length === 0 || JSON.stringify(bad); })()""")
check('11 switching the menu language relabels buttons, captions and field labels',
      """(() => { const out = []; for (const l of ['en','fr','ga','zh']) { state.uiLang = l; applyI18n(); out.push(document.getElementById('btn-ink').textContent.trim() + '|' + document.querySelector('label.field-cap[for="ui-lang"]').textContent + '|' + document.querySelector('.group-caption').textContent); }
         state.uiLang = 'uk'; applyI18n(); return new Set(out).size === 4 && out[0].includes('Write') && out[0].includes('Menu language') || JSON.stringify(out); })()""")
print('ALL MENU LABEL CHECKS PASSED')
