"""Rules pick the language being STUDIED, not the majority language of the page: a French textbook written in English
(explanations in English, examples in French) was detected as an English book, so Rules opened the English catalogue and
searched French examples for English grammar. French wins once French text is a noticeable share (>= 20% of letters) of the
page or the selection; a manual choice in the Rules window is kept. Gold model replies; no network."""
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


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


check('1 a textbook passage (English explanation + French examples) studies French; an English novel with one French word studies English',
      """rulesStudyLang('The partitive article is used with uncountable nouns. Je voudrais du pain. Elle mange du chocolat. Nous buvons de l’eau minérale. I would like some bread. She eats chocolate.') === 'fr'
         && rulesStudyLang('It was the best of times, it was the worst of times. He said bonjour to the owner and left the shop.') === 'en'
         && rulesStudyLang('Ils craignent le froid.') === 'fr' && rulesStudyLang('She is painting the kitchen.') === 'en'""")

BOOK = ("# The partitive article\n\nThe partitive article expresses an unknown quantity of something that cannot be counted. "
        "It is formed with de plus the definite article. Look at the examples below and at their English translations.\n\n"
        "Je voudrais du pain. Elle mange du chocolat. Nous buvons de l’eau minérale.\n\n"
        "I would like some bread. She eats chocolate. We drink mineral water. In a negative sentence the partitive becomes de.\n")
b64 = base64.b64encode(BOOK.encode()).decode()
c.js("openBookFile(new File([Uint8Array.from(atob(%s),ch=>ch.charCodeAt(0))],'textbook.md',{lastModified:%d}))" % (json.dumps(b64), int(time.time())))
c.wait("els.pages.textContent.includes('Je voudrais du pain')", timeout=20); time.sleep(0.8)
check('2 the page itself is detected as English (majority), as before', "pageLang() === 'en-US'")
c.js("rulesState.lang = 'en'; openRulesPanel(); 1"); time.sleep(0.3)
check('3 opening Rules on this page shows the FRENCH catalogue', "rulesState.lang === 'fr' && document.querySelector('#rules-content .rules-lang').value === 'fr'")

SCAN = json.dumps({"language": "fr", "topics": [{"id": "article-partitif", "matches": [{"text": "du pain", "note": "partitif"}]}]}, ensure_ascii=False)
c.js("""(() => { aiAvailable = () => true; showToast = () => {}; window.__prompts = [];
  callAI = (prompt, signal, task) => { if (task === 'rules_search') { __prompts.push(prompt); return Promise.resolve(%s); } return Promise.resolve('{}'); };
  const w = document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (n.nodeValue.includes('Je voudrais')) break;
  const r = document.createRange(); r.selectNodeContents(n); state.lastSelectedRange = r; return 1; })()""" % json.dumps(SCAN))
c.js("closeRulesPanel(); rulesState.lang = 'en'; runRuleSelectionScan(); 1")
check('4 a selected French example is searched in the French catalogue', "__prompts.length === 1 && __prompts[0].includes('article-partitif') && rulesScan && rulesScan.lang === 'fr'", timeout=5)

c.js("openRulesPanel(); const s = document.querySelector('#rules-content .rules-lang'); s.value = 'en'; s.dispatchEvent(new Event('change')); 1"); time.sleep(0.2)
c.js("runRuleSelectionScan(); 1")
check('5 a language chosen by hand in the Rules window is kept (no auto switch back)', "rulesState.lang === 'en' && rulesScan.lang === 'en'", timeout=5)
check('6 a PDF selection over several text-layer lines keeps the words apart (it was "headles cheveux"), so model fragments still match',
      """(() => { const box = document.createElement('div'); box.className = 'pdf-text-layer'; box.style.cssText = 'position:fixed;left:0;top:0;width:400px;height:200px';
        box.innerHTML = '<span style="position:absolute;left:0;top:0;font-size:16px">la tête head</span><span style="position:absolute;left:0;top:30px;font-size:16px">les cheveux hair</span>';
        document.body.appendChild(box); const r = document.createRange(); r.setStart(box.firstChild.firstChild, 0); r.setEnd(box.lastChild.firstChild, 16);
        const flat = flattenRange(r); box.remove(); return flat.text === 'la tête head les cheveux hair' || flat.text; })()""")
print('ALL PASS')
