"""A single tap/click on a word inside the open Rules window (theory, conjugation table) opens the translation popup, and the
Rules window stays open; its own controls (topic buttons, back) still work. No network."""
import base64, json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof openRulesPanel==='function'", timeout=30)
c.js("localStorage.clear(); 1"); c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof openRulesPanel==='function'", timeout=30)


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


b = base64.b64encode("# Lecture\n\nMarie a mangé une pomme dans le jardin.\n".encode()).decode()
c.js("openBookFile(new File([Uint8Array.from(atob(%s),ch=>ch.charCodeAt(0))],'l.md',{lastModified:1}))" % json.dumps(b))
c.wait("els.pages.textContent.includes('Marie')", timeout=20); time.sleep(0.8)
if not c.js('state.translateMode'):
    c.js('els.translateBtn.click()'); time.sleep(0.3)
c.js("aiAvailable=()=>true; callAI=async()=>'{}'; document.getElementById('btn-rules').click(); 1"); time.sleep(0.5)
c.js("document.querySelector('#rules-content .rules-topic[data-topic=\"passe-compose\"]').click(); 1"); time.sleep(0.5)
pos = c.js("""(()=>{ const w = document.createTreeWalker(document.getElementById('rules-content'), NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { const i = n.nodeValue.indexOf('participe'); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 9);
    n.parentElement.scrollIntoView({block: 'center'}); const b = r.getBoundingClientRect(); return {x: b.left + b.width / 2, y: b.top + b.height / 2}; } } })()""")
for kind in ('mousePressed', 'mouseReleased'):
    c.call('Input.dispatchMouseEvent', type=kind, x=pos['x'], y=pos['y'], button='left', clickCount=1)
time.sleep(0.8)
check('1 one click on a word in the Rules theory opens the translation popup',
      "getComputedStyle(document.getElementById('word-tooltip')).display !== 'none' && document.getElementById('word-tooltip').innerText.toLowerCase().includes('participe')")
check('2 the Rules window stays open', "document.getElementById('rules-panel').classList.contains('expanded')")
c.js("document.querySelector('#rules-content .rules-back').click(); 1"); time.sleep(0.3)
check('3 the back button still works (not swallowed by the translate handler)', "!!document.querySelector('#rules-content .rules-topic')")
print('ALL PASS')
