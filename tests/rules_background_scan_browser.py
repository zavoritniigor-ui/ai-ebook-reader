"""Rules button with a selected sentence/paragraph: the FIRST tap only starts the search in the background (the window does not open, an
open translation popup is not interrupted); when the search is done the button/bookmark is green; the SECOND tap opens the window.
Without a selection the button simply opens the window. Gold model replies; no network."""
import base64, json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof openRulesPanel==='function'", timeout=30)
c.js("localStorage.clear(); 1"); c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof openRulesPanel==='function'", timeout=30)
c.js("state.uiLang = 'uk'; applyI18n(); 1")


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


BOOK = "# Lecture\n\nHier, Marie a mangé une pomme dans le jardin. Elle est partie avant nous.\n\nLe chat dort sur la table.\n"
b64 = base64.b64encode(BOOK.encode()).decode()
c.js("openBookFile(new File([Uint8Array.from(atob(%s),ch=>ch.charCodeAt(0))],'lecture.md',{lastModified:%d}))" % (json.dumps(b64), int(time.time())))
c.wait("els.pages.textContent.includes('Marie a mangé')", timeout=20); time.sleep(0.8)
SCAN = json.dumps({"language": "fr", "topics": [{"id": "passe-compose", "matches": [{"text": "a mangé", "note": "avoir"}, {"text": "est partie", "note": "être"}]}]}, ensure_ascii=False)
c.js("""(() => { aiAvailable = () => true; showToast = () => {}; window.__scans = 0; window.__release = null;
  callAI = (prompt, signal, task) => { if (task === 'rules_search') { __scans++; return new Promise(r => { window.__release = () => r(%s); }); } return Promise.resolve('{}'); };
  const w = document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (n.nodeValue.includes('Marie a mangé')) break;
  const r = document.createRange(); r.selectNodeContents(n); state.lastSelectedRange = r;
  // a translation popup is open
  els.tooltip.style.display = 'flex'; return 1; })()""" % json.dumps(SCAN))
c.js("document.getElementById('btn-rules').click(); 1"); time.sleep(0.5)
check('1 first tap with a selection starts ONE background search and does NOT open the window', "__scans === 1 && !document.getElementById('rules-panel').classList.contains('expanded')")
check('2 the open translation popup is not interrupted', "els.tooltip.style.display === 'flex'")
check('3 while searching, the button and bookmark show the running state', "document.getElementById('btn-rules').dataset.state === 'running' && document.getElementById('rules-tab').dataset.state === 'running'")
c.js("document.getElementById('btn-rules').click(); 1"); time.sleep(0.3)
check('4 tapping again while still searching neither opens the window nor starts a second search', "__scans === 1 && !document.getElementById('rules-panel').classList.contains('expanded')")
c.js("__release(); 1")
check('5 when the search is done the button and bookmark turn green', "document.getElementById('btn-rules').dataset.state === 'ready' && document.getElementById('rules-tab').dataset.state === 'ready'", timeout=5)
check('6 the window is still closed and the popup still open', "!document.getElementById('rules-panel').classList.contains('expanded') && els.tooltip.style.display === 'flex'")
c.js("document.getElementById('btn-rules').click(); 1"); time.sleep(0.5)
check('7 the SECOND tap opens the window, with the found topic marked, and no new search', "document.getElementById('rules-panel').classList.contains('expanded') && __scans === 1 && !!document.querySelector('#rules-content .rules-topic .rules-dot')")
c.js("document.getElementById('rules-min').click(); state.lastSelectedRange = null; rulesScan = null; 1"); time.sleep(0.3)
c.js("document.getElementById('btn-rules').click(); 1"); time.sleep(0.5)
check('8 without a selection the button simply opens the window', "document.getElementById('rules-panel').classList.contains('expanded') && __scans === 1")
print('ALL PASS')
