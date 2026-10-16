"""Grammar panel: the learner types a verb or an adjective -- usually in their OWN language ("їсти", "червоний") -- and gets the
studied-language lemma with its paradigm (js/grammar-svo.js runGrammarLookup). The AI is mocked; real typing and clicks.
Checks: the prompt (the typed word as data, the studied language from the open French book, the persons / adjective slots), the
verb table in the language's person order with the first tense lit, the tense buttons conjugating the looked-up verb, the
adjective grid, alternatives as buttons (keeping the learner's word), the cache, 'not a verb/adjective', a wrong-language
reply, an empty field, no AI key, a tap analysis superseding a lookup in flight, labels in every UI language, phone layout."""
import base64, json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1100, height=850, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof runGrammarLookup==='function'", timeout=30)
c.js("localStorage.clear(); showUpdateBanner=()=>{}; document.getElementById('sw-update-banner')?.remove(); 1")


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.05); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


BOOK = "# Lecture\n\nMarie mange une pomme rouge dans le jardin. Elle parle avec son frère.\n"
c.js("openBookFile(new File([Uint8Array.from(atob(%s),ch=>ch.charCodeAt(0))],'lecture-fr.md',{lastModified:%d}))"
     % (json.dumps(base64.b64encode(BOOK.encode()).decode()), int(time.time())))
c.wait("els.pages.textContent.includes('pomme rouge')", timeout=20); time.sleep(0.8)

VERB = {"language": "fr", "pos": "verb", "lemma": "manger", "alternatives": [{"lemma": "dévorer", "note": "жадібно"}, {"lemma": "manger", "note": "dup"}],
        "forms": {"ils / elles": "mangent", "je": "mange", "tu": "manges", "il / elle / on": "mange", "nous": "mangeons", "vous": "mangez", "bogus": "x"}}
ADJ = {"language": "fr", "pos": "adjective", "lemma": "rouge", "alternatives": [], "forms": {"ms": "rouge", "fs": "rouge", "mp": "rouges", "fp": "rouges"}}
c.js("""(() => { state.targetLang = 'uk'; state.uiLang = 'uk'; aiAvailable = () => true; window.__calls = []; window.__replies = {}; window.__delay = 0; window.__toasts = [];
  showToast = (m) => __toasts.push(m);
  callAI = async (prompt, signal, task) => { __calls.push({task, prompt});
    if (__delay) await new Promise((r, j) => { const t = setTimeout(r, __delay); signal && signal.addEventListener('abort', () => { clearTimeout(t); j(new DOMException('Cancelled', 'AbortError')); }); });
    if (task === 'grammar_paradigm') return JSON.stringify({forms: {je: 'mangeais', tu: 'mangeais', 'il / elle / on': 'mangeait', nous: 'mangions', vous: 'mangiez', 'ils / elles': 'mangeaient'}});
    if (task === 'grammar_analysis') return '{"language":"fr","items":[]}';
    const m = /typed "([^"]*)"/.exec(prompt); return __replies[m ? m[1] : ''] || '{"language":"fr","pos":null,"lemma":null}'; };
  return 1; })()""")
c.js("__replies['їсти'] = %s; __replies['червоний'] = %s; __replies['dévorer'] = %s; 1" % (
    json.dumps(json.dumps(VERB, ensure_ascii=False)), json.dumps(json.dumps(ADJ, ensure_ascii=False)),
    json.dumps(json.dumps({"language": "fr", "pos": "verb", "lemma": "dévorer", "alternatives": [], "forms": {"je": "dévore"}}, ensure_ascii=False))))

# ---- 1. the field is there, labelled, in the studied language of the book
c.js("els.grammarTab.click(); 1"); time.sleep(0.4)
check("1 the Grammar panel has the lookup field; its hint names the book's language (French) in the menu language",
      "(() => { const i = document.getElementById('grammar-lookup-input'); return i.offsetHeight >= 44 && i.placeholder.includes(new Intl.DisplayNames(['uk'], {type:'language'}).of('fr')) && i.placeholder.startsWith('Дієслово') && document.getElementById('grammar-lookup-btn').getAttribute('aria-label') === t('grammarLookupBtn'); })()")


def type_and_submit(text):
    c.js("document.getElementById('grammar-lookup-input').value = ''; document.getElementById('grammar-lookup-input').focus(); 1")
    c.call('Input.insertText', text=text)
    c.call('Input.dispatchKeyEvent', type='keyDown', key='Enter', code='Enter', windowsVirtualKeyCode=13, text='\r')
    c.call('Input.dispatchKeyEvent', type='keyUp', key='Enter', code='Enter', windowsVirtualKeyCode=13)


# ---- 2. a verb in the learner's own language
type_and_submit('їсти')
check("2 one lookup request: the typed word as JSON data, French as the studied language, the French persons and the first tense",
      "__calls.length === 1 && __calls[0].task === 'grammar_lookup' && __calls[0].prompt.includes('typed \"їсти\"') && __calls[0].prompt.includes('French (language code \"fr\")') && __calls[0].prompt.includes('\"ils / elles\"') && __calls[0].prompt.includes('Présent') || JSON.stringify(__calls)", timeout=5)
check("3 the verb is shown: lemma, the learner's word, the six forms in je..ils order (unknown slot dropped), Présent lit",
      """(() => { const d = document.querySelector('#grammar-content .grammar-focus'); if (!d) return 'no detail';
        const rows = [...d.querySelectorAll('.grammar-grid-row')].map(r => r.querySelector('.grammar-grid-value').textContent);
        return d.dataset.pos === 'verb' && d.querySelector('.grammar-focus-head b').textContent === 'manger' && d.querySelector('.grammar-focus-query').textContent.includes('їсти')
          && JSON.stringify(rows) === JSON.stringify(['mange','manges','mange','mangeons','mangez','mangent']) && d.querySelector('.grammar-grid-title').textContent === 'Présent'
          && document.querySelector('#grammar-controls-bar button.active')?.textContent === 'Présent' && els.grammarPanel.classList.contains('expanded') || JSON.stringify(rows); })()""", timeout=5)
check("4 alternatives are buttons (the duplicate of the lemma dropped)",
      "[...document.querySelectorAll('#grammar-content .grammar-lookup-alts button')].map(b => b.textContent).join('|') === 'dévorer — жадібно'")
c.js("[...document.querySelectorAll('#grammar-controls-bar button')].find(b => b.textContent === 'Imparfait').click(); 1")
check("5 a tense button conjugates the looked-up verb like a word from the book",
      "__calls.length === 2 && __calls[1].task === 'grammar_paradigm' && __calls[1].prompt.includes('\"manger\"') && __calls[1].prompt.includes('Imparfait') && document.querySelector('#grammar-content .grammar-grid-title').textContent === 'Imparfait' && document.querySelector('#grammar-content .grammar-grid-value').textContent === 'mangeais' || JSON.stringify(__calls.map(x => x.task))", timeout=5)
check("5b ... and the learner's word and the alternatives stay on the card", "document.querySelector('#grammar-content .grammar-focus-query')?.textContent.includes('їсти') && !!document.querySelector('#grammar-content .grammar-lookup-alts button')")

# ---- 3. an alternative
c.js("document.querySelector('#grammar-content .grammar-lookup-alts button').click(); 1")
check("6 an alternative is looked up in turn, keeping the learner's original word on screen",
      "__calls.length === 3 && __calls[2].prompt.includes('typed \"dévorer\"') && document.querySelector('#grammar-content .grammar-focus-head b').textContent === 'dévorer' && document.querySelector('#grammar-content .grammar-focus-query').textContent.includes('їсти') || JSON.stringify(__calls.map(x => x.task))", timeout=5)

# ---- 4. an adjective
type_and_submit('червоний')
check("7 an adjective: the gender/number grid, Adjectives mode, no tense buttons",
      """(() => { const d = document.querySelector('#grammar-content .grammar-focus'); return !!d && d.dataset.pos === 'adjective' && d.querySelector('.grammar-focus-head b').textContent === 'rouge'
        && d.querySelectorAll('.grammar-grid-row').length === 4 && document.getElementById('grammar-mode-adjectives').classList.contains('active') && document.querySelectorAll('#grammar-controls-bar button').length === 0; })()""", timeout=5)
c.js("document.getElementById('grammar-mode-verbs').click(); 1")
n = c.js("__calls.length")
type_and_submit('їсти')
check("8 the same word again comes from the cache (no new request)", "document.querySelector('#grammar-content .grammar-focus-head b')?.textContent === 'manger' && __calls.length === %d" % n, timeout=5)

# ---- 5. failures
type_and_submit('стіл')
check("9 not a verb/adjective: a clear message, the card is not replaced by garbage",
      "document.getElementById('grammar-lookup-status').textContent === t('grammarLookupNotFound') && !document.getElementById('grammar-lookup-status').hidden", timeout=5)
c.js("__replies['бігти'] = JSON.stringify({language: 'en', pos: 'verb', lemma: 'run', forms: {}}); 1")
type_and_submit('бігти')
check("10 a reply in the wrong language is refused", "document.getElementById('grammar-lookup-status').textContent === t('aiInvalidResponse')", timeout=5)
c.js("__replies['говорити'] = JSON.stringify({language: 'fr', pos: 'verb', lemma: 'parle', forms: {}}); 1")
type_and_submit('говорити')
check("11 a finite form given as the verb lemma is refused (French infinitive check)", "document.getElementById('grammar-lookup-status').textContent === t('aiInvalidResponse')", timeout=5)
n = c.js("__calls.length")
type_and_submit('   ')
check("12 an empty field asks for a word and sends nothing", "document.getElementById('grammar-lookup-status').textContent === t('grammarLookupEmpty') && __calls.length === %d" % n)
c.js("aiAvailable = () => false; 1")
type_and_submit('пити')
check("13 no AI key: the usual 'add a key' message, nothing sent", "__toasts.at(-1) === t('needKey') && __calls.length === %d" % n)
c.js("aiAvailable = () => true; 1")

# ---- 6. a tap analysis supersedes a lookup in flight
c.js("window.__delay = 600; __replies['спати'] = JSON.stringify({language: 'fr', pos: 'verb', lemma: 'dormir', forms: {je: 'dors'}}); 1")
type_and_submit('спати')
time.sleep(0.15)
c.js("runGrammarAnalysis('mange', 'Marie mange une pomme rouge dans le jardin.'); 1")
time.sleep(1.2)
check("14 a new Grammar analysis cancels the lookup in flight: its late answer never lands",
      "document.querySelector('#grammar-content .grammar-focus-head b')?.textContent !== 'dormir' && document.getElementById('grammar-lookup-status').hidden")
c.js("window.__delay = 0; 1")

# ---- 7. labels in every UI language, phone layout
check("15 the new texts exist in all UI languages (es included)",
      "(() => { const bad = []; for (const k of ['grammarLookupPlaceholder','grammarLookupLabel','grammarLookupBtn','grammarLookupEmpty','grammarLookupNotFound','grammarLookupAlso']) { for (const l of ['uk','en','fr','ru','zh','ko','hi','ga']) if (!I18N[k] || !I18N[k][l]) bad.push(k + ':' + l); if (typeof I18N_ES === 'undefined' || !I18N_ES[k]) bad.push(k + ':es'); } return bad.length === 0 || JSON.stringify(bad); })()")
c.js("document.getElementById('ui-lang').value = 'en'; document.getElementById('ui-lang').dispatchEvent(new Event('change')); 1"); time.sleep(0.3)
check("16 switching the menu language relabels the field", "document.getElementById('grammar-lookup-input').placeholder.startsWith('A verb or adjective') && document.getElementById('grammar-lookup-input').placeholder.includes('French')")
c.js("document.getElementById('ui-lang').value = 'uk'; document.getElementById('ui-lang').dispatchEvent(new Event('change')); 1")
c.call('Emulation.setDeviceMetricsOverride', width=390, height=844, deviceScaleFactor=3, mobile=True); time.sleep(0.5)
c.js("els.grammarPanel.classList.add('expanded'); 1"); time.sleep(0.4)
check("17 phone: field and button fit inside the panel, the button is a 44px target, no horizontal scroll",
      "(() => { const p = els.grammarPanel.getBoundingClientRect(), i = document.getElementById('grammar-lookup-input').getBoundingClientRect(), b = document.getElementById('grammar-lookup-btn').getBoundingClientRect(); return i.left >= p.left && b.right <= p.right + 0.5 && b.width >= 44 && b.height >= 44 && i.width >= 150 && document.documentElement.scrollWidth <= innerWidth || JSON.stringify({p, i, b}); })()")
print('ALL GRAMMAR LOOKUP CHECKS PASSED')
