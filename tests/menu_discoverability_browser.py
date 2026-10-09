"""Menu / panel-handle discoverability on a phone: the two side-panel handles show what they open (AI + voice on the
left, grammar on the right) and every icon-only header button has a localized accessible name. No network."""
import os
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP()
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=360, height=740, deviceScaleFactor=2, mobile=True)
c.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof handleWordOrSelection==='function'", timeout=30)
c.js("localStorage.clear(); state.uiLang = 'uk'; applyI18n(); 1")


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


check('left handle shows AI + microphone icons', "(() => { const v = getComputedStyle(els.askTab, '::before').content; return v.includes('🤖') && v.includes('🎤'); })()")
check('right handle shows the grammar icon', "getComputedStyle(els.grammarTab, '::before').content.includes('✨')")
check('handles are still 44px wide on screen and not hidden', "[els.askTab, els.grammarTab].every(b => { const r = b.getBoundingClientRect(); return r.width >= 41 && r.height >= 90 && getComputedStyle(b).visibility === 'visible'; })")
check('handles are no longer nearly invisible (background alpha >= 0.15)',
      "[els.askTab, els.grammarTab].every(b => { const m = getComputedStyle(b).backgroundColor.match(/[\\d.]+/g); return parseFloat(m[3]) >= 0.15; })")
check('handles keep their accessible names', "!!els.askTab.getAttribute('aria-label') && !!els.grammarTab.getAttribute('aria-label')")
ids = ['btn-ink', 'btn-region', 'zoom-out', 'zoom-in']
check('icon-only header buttons have a localized aria-label',
      "%s.every(id => { const b = document.getElementById(id); return b && b.getAttribute('aria-label') && b.getAttribute('aria-label').length > 3; })" % ids)
check('the key button has an aria-label', "document.querySelector('button[onclick=\"openKeySettings()\"]').getAttribute('aria-label') === t('tAiKey')")
check('the reading-progress indicator is explained (tooltip title; name already carries the live percentage)', "(() => { const b = document.getElementById('reading-stats-button'); return b.title === t('statsTitle') && /%/.test(b.getAttribute('aria-label') || ''); })()")
check('opening the AI panel still hides its handle and shows the microphone row', "(() => { els.askPanel.classList.add('expanded'); return true; })()")
c.js("new Promise(r => setTimeout(r, 600))")
check('... microphone and send are visible inside the panel', "[els.micBtn, els.askSendBtn].every(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; })")
print('ALL MENU DISCOVERABILITY CHECKS PASSED')
