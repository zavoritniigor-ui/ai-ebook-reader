"""Phone: the open menu must scroll. User report 2026-10-18 (screenshot of a 412x915 phone): «I cannot reach the key button» -- the
fixed header grew taller than the screen (Settings is the last group, 🔑 its last row) and nothing scrolled, so every control
below the screen edge -- 🔑 AI key (and with it the sound diagnostics), 🔄 update, the menu language -- was unreachable.
On a short phone screen the header now scrolls inside itself (it stays fixed), its last row can be scrolled clear of the
round corner docks (🤖 🎤 / ✨), scrolling counts as activity for the auto-hide timer, and tablets are unchanged. No network."""
import os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Network.enable'); c.call('Network.setCacheDisabled', cacheDisabled=True)


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def load(width, height, mobile=True):
    c.call('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=2, mobile=mobile)
    c.call('Emulation.setTouchEmulationEnabled', enabled=mobile, maxTouchPoints=5)
    c.call('Page.navigate', url=URL)
    c.wait("document.readyState==='complete' && !document.body.inert && typeof openFullMenu==='function'", timeout=30)
    c.js("localStorage.clear(); document.getElementById('sw-update-banner')?.remove(); state.uiLang='uk'; applyI18n(); openFullMenu(); 1")
    time.sleep(0.6)


# A control is reachable when, after scrolling it into view INSIDE the menu, the point at its centre is that control itself.
REACH = """(id => { const h = document.getElementById('app-header'), e = document.getElementById(id); if (!e || e.offsetParent === null) return 'hidden ' + id;
  const r0 = e.getBoundingClientRect(); h.scrollTop += r0.top + r0.height / 2 - innerHeight / 2; const r = e.getBoundingClientRect();
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return (r.top >= 0 && r.bottom <= innerHeight && !!hit && (hit === e || e.contains(hit))) || JSON.stringify({id, top: r.top, bottom: r.bottom, h: innerHeight, hit: hit && (hit.id || hit.className)}); })"""

for w, h in ((412, 780), (360, 640)):
    load(w, h)
    check(f'1 {w}x{h}: the open menu is taller than the screen and scrolls inside itself (the header stays fixed)',
          "(() => { const h = document.getElementById('app-header'); return getComputedStyle(h).position === 'fixed' && h.getBoundingClientRect().bottom <= innerHeight + 1 && h.scrollHeight > h.clientHeight + 40 || JSON.stringify({b: h.getBoundingClientRect().bottom, sh: h.scrollHeight, ch: h.clientHeight}); })()")
    for el in ('btn-ai-key', 'ui-lang', 'theme-select', 'btn-tts'):
        check(f'2 {w}x{h}: «{el}» can be scrolled to and tapped (not under the screen edge or a corner dock)', f"({REACH})('{el}')")
    check(f'3 {w}x{h}: tapping 🔑 opens the key dialog', "(() => { document.getElementById('btn-ai-key').click(); return getComputedStyle(document.getElementById('settings-modal')).display !== 'none'; })()")

load(412, 780)
check('4 scrolling the menu counts as activity: the auto-hide timer is restarted, the menu stays open while being scrolled',
      "(() => { let n = 0; const orig = window.setTimeout; window.setTimeout = function (f, ms) { if (ms === MENU_AUTOHIDE_MS) n++; return orig.apply(this, arguments); }; document.getElementById('app-header').dispatchEvent(new Event('scroll')); window.setTimeout = orig; return n >= 1 || n; })()")

load(820, 1180)
check('5 tablet portrait: the header is unchanged -- short, nothing to scroll',
      "(() => { const h = document.getElementById('app-header'); return h.getBoundingClientRect().height <= 190 && h.scrollHeight <= h.clientHeight + 1 || JSON.stringify({ht: h.getBoundingClientRect().height, sh: h.scrollHeight, ch: h.clientHeight}); })()")
print('ALL PASS')
