"""Grammar rules panel (French catalogue): menu of topics, search of the chosen rule in the VISIBLE page text, highlighting of
exactly the matching words, match list + detail card, theory-based explanation, tap on a highlighted word.

No live AI: every model reply is a hand-authored GOLD (or deliberately bad) response. Proves the catalogue is complete and
well-formed, the validation gate keeps only real fragments of the page text, painting lands on the exact characters without
rewrapping the page, results are cached, stale/changed pages never leave stale highlights, and tapping a highlight opens
its card instead of the word tooltip (an ordinary word still opens the tooltip).
"""
import base64, json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=900, deviceScaleFactor=1, mobile=False)

FILLER = "\n\n".join("Paragraphe de remplissage numéro %d avec assez de mots pour occuper plusieurs lignes de la page affichée à l'écran." % i for i in range(40))
BOOK = ("# Lecture\n\nHier, Marie a mangé une pomme dans le jardin. Elle est partie avant nous. Nous avons fini le travail.\n\n"
        "Le chat dort sur la table.\n\n" + FILLER + "\n\nDernière phrase tout en bas du livre, ils ont gagné.\n")
GOLD = lambda ms: json.dumps({"language": "fr", "matches": ms}, ensure_ascii=False)
PC = GOLD([{"text": "a mangé", "note": "avoir + participe"}, {"text": "est partie", "note": "être + participe accordé"}, {"text": "avons fini", "note": "avoir + participe"}])


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def click_xy(x, y):
    for kind in ('mousePressed', 'mouseReleased'):
        c.call('Input.dispatchMouseEvent', type=kind, x=x, y=y, button='left', clickCount=1)


def word_pos(word):
    """Centre of the FIRST client rect of the word (a word wrapping over two lines is tapped on its first line), scrolled into view."""
    c.js(r"""(()=>{ const w=%s; const walker=document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT); let n;
      while((n=walker.nextNode())){ const i=n.nodeValue.indexOf(w); if(i!==-1){ n.parentElement.scrollIntoView({block:'center'}); return 1; } } return 0; })()""" % json.dumps(word, ensure_ascii=False))
    time.sleep(0.3)
    return c.js(r"""(()=>{ const w=%s; const walker=document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT); let n;
      while((n=walker.nextNode())){ const i=n.nodeValue.indexOf(w); if(i!==-1){ const r=document.createRange(); r.setStart(n,i); r.setEnd(n,i+w.length); const b=r.getClientRects()[0]; return {x:b.left+Math.min(b.width/2, 30),y:b.top+b.height/2}; } } return null; })()""" % json.dumps(word, ensure_ascii=False))


def center(sel):
    return c.js("(b => ({x: b.left + b.width / 2, y: b.top + b.height / 2}))(document.querySelector(%s).getBoundingClientRect())" % json.dumps(sel))


c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert")
c.js("localStorage.clear(); showUpdateBanner=()=>{}; document.getElementById('sw-update-banner')?.remove(); 1")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof openRulesPanel==='function'", timeout=30)
c.js("state.uiLang = 'uk'; applyI18n(); window.__errs = []; addEventListener('error', e => __errs.push(e.message)); addEventListener('unhandledrejection', e => __errs.push(String(e.reason))); 1")

# ---- 1. catalogue integrity ----
check("1 the French catalogue is complete and well-formed (sections, >= 50 unique topics, all texts present)",
      """(() => { const cat = GRAMMAR_RULES.fr; const topics = cat.sections.flatMap(s => s.topics); const ids = topics.map(x => x.id); const bad = [];
         for (const s of cat.sections) if (!s.title.fr || !s.title.uk || !s.title.en) bad.push('section ' + s.id);
         for (const x of topics) { if (!x.title.fr || !x.title.uk || !x.title.en) bad.push(x.id + ':title'); if (!x.theory.uk || x.theory.uk.length < 40 || !x.theory.en || x.theory.en.length < 40) bad.push(x.id + ':theory');
           if (!x.examples || !x.examples.length || x.examples.some(e => typeof e !== 'string' || e.length < 6)) bad.push(x.id + ':examples'); if (!x.find || x.find.length < 40) bad.push(x.id + ':find'); }
         return cat.sections.length >= 7 && topics.length >= 50 && new Set(ids).size === ids.length && bad.length === 0 || JSON.stringify({n: topics.length, bad}); })()""")
check("2 the catalogue covers the core grammar areas (tenses, moods, agreement, determiners, pronouns, negation, questions, time markers)",
      """(() => { const ids = GRAMMAR_RULES.fr.sections.flatMap(s => s.topics.map(x => x.id)); return ['passe-compose','imparfait','futur-simple','subjonctif-present','conditionnel-present','imperatif','voix-passive','accord-participe-avoir','article-partitif','pronoms-relatifs','pronoms-y-en','negation','interrogation','marqueurs-temps','comparatif','depuis-il-y-a-pendant'].every(i => ids.includes(i)); })()""")

# ---- 2. open the book, install mocks ----
b64 = base64.b64encode(BOOK.encode()).decode()
c.js("openBookFile(new File([Uint8Array.from(atob(%s),ch=>ch.charCodeAt(0))],'lecture.md',{lastModified:%d}))" % (json.dumps(b64), int(time.time())))
c.wait("els.pages.textContent.includes('Marie a mangé')", timeout=20)
time.sleep(0.8)
if not c.js('state.translateMode'):
    c.js('els.translateBtn.click()'); time.sleep(0.3)
c.js("state.targetLang='uk'")
c.js("""(()=>{ aiAvailable=()=>true; showToast=()=>{}; window.__calls=[]; window.__reply=null; window.__explain='Крок 1. Допоміжне дієслово.\\n\\nКрок 2. Participe passé.';
  callAI=async (prompt, signal, task)=>{ __calls.push({task, prompt}); if (task==='rules_search') { if (__reply instanceof Error) throw __reply; return __reply; } if (task==='rules_explain') return __explain; return 'ok'; }; return 1; })()""")

# ---- 3. panel + menu ----
c.js("document.getElementById('btn-rules').click()"); time.sleep(0.5)
check("3 the header button opens the panel; it lists the French sections as foldable groups with topic buttons",
      "document.getElementById('rules-panel').classList.contains('expanded') && document.querySelectorAll('#rules-content .rules-section').length >= 7 && document.querySelectorAll('#rules-content .rules-topic').length >= 6")
check("4 the language of the page (fr) is preselected and the topic filter narrows the list",
      """(() => { const sel = document.querySelector('#rules-content .rules-lang'); const before = document.querySelectorAll('#rules-content .rules-topic').length; const inp = document.querySelector('#rules-content .rules-search'); inp.value = 'passé'; inp.dispatchEvent(new Event('input')); const after = document.querySelectorAll('#rules-content .rules-topic'); return sel.value === 'fr' && after.length > 0 && after.length < 20 && [...after].some(b => b.dataset.topic === 'passe-compose'); })()""")
check("5 the English catalogue is announced as coming (no crash, no topics)",
      """(() => { const sel = document.querySelector('#rules-content .rules-lang'); sel.value = 'en'; sel.dispatchEvent(new Event('change')); const ok = !!document.querySelector('#rules-content .rules-note') && !document.querySelector('#rules-content .rules-topic'); const s2 = document.querySelector('#rules-content .rules-lang'); s2.value = 'fr'; s2.dispatchEvent(new Event('change')); return ok; })()""")

# ---- 4. search + highlight ----
c.js("__calls.length = 0; __reply = %s; rulesSearchCache.clear(); 1" % json.dumps(PC))
c.js("document.querySelector('#rules-content .rules-topic[data-topic=\"passe-compose\"]').click(); 1")
check("6 choosing a topic runs ONE rules_search call carrying the topic rule and the visible page text as a JSON string",
      """__calls.filter(x => x.task === 'rules_search').length === 1 && __calls[0].prompt.includes('Passé composé') && __calls[0].prompt.includes('Hier, Marie a mangé une pomme') && !__calls[0].prompt.includes('Dernière phrase')""", timeout=8)
check("7 the three matches are painted on exactly their own characters",
      "CSS.highlights.has('rule-match') && [...CSS.highlights.get('rule-match')].map(r => r.toString()).join('|') === 'a mangé|est partie|avons fini'", timeout=5)
check("8 the page text is untouched (no rewrapping)", "els.pages.textContent.includes('Hier, Marie a mangé une pomme dans le jardin.')")
check("9 the panel lists the matches with their sentences and a count in the status line",
      "document.querySelectorAll('#rules-content .rules-match').length === 3 && document.getElementById('rules-status').textContent.includes('3') && document.querySelector('#rules-content .rules-match mark').textContent === 'a mangé'")
check("9b a match sentence never runs across a block boundary (the heading 'Lecture' is not glued to the first sentence)", "rulesState.matches[0].sentence === 'Hier, Marie a mangé une pomme dans le jardin.'")
check("10 only the VISIBLE text is sent (text far below the screen is not)", "!rulesState.text.includes('Dernière phrase') && rulesState.text.length <= RULES_PAGE_MAX")

# ---- 5. cache ----
c.js("__calls.length = 0; document.querySelector('#rules-content .rules-back').click(); document.querySelector('#rules-content .rules-topic[data-topic=\"passe-compose\"]') || (document.querySelector('#rules-content .rules-section summary').click()); 1")
c.js("document.querySelector('#rules-content .rules-topic[data-topic=\"passe-compose\"]').click(); 1")
check("11 the same topic on the same page text is answered from the cache (no new call)", "__calls.filter(x => x.task === 'rules_search').length === 0 && document.querySelectorAll('#rules-content .rules-match').length === 3", timeout=5)
c.js("document.getElementById('rules-find').click(); 1")
check("12 the explicit Find button forces a fresh call", "__calls.filter(x => x.task === 'rules_search').length === 1", timeout=8)

# ---- 6. detail card + theory explanation ----
c.js("document.querySelectorAll('#rules-content .rules-match')[1].click(); 1")
check("13 selecting a match marks it active on the page and opens its card",
      "CSS.highlights.has('rule-active') && [...CSS.highlights.get('rule-active')].map(r => r.toString()).join('|') === 'est partie' && !!document.querySelector('#rules-content .rules-card') && document.querySelector('#rules-content .rules-card mark').textContent === 'est partie'")
c.js("__calls.length = 0; document.querySelector('#rules-content .rules-explain-btn').click(); 1")
check("14 'explain using the theory' sends the rule's theory + the sentence + the fragment, and shows the answer as text",
      """(() => { const e = __calls.filter(x => x.task === 'rules_explain'); return e.length === 1 && e[0].prompt.includes('Passé composé') && e[0].prompt.includes('Elle est partie avant nous') && e[0].prompt.includes('est partie') && e[0].prompt.includes('Theory to rely on') && document.querySelectorAll('#rules-content .rules-explain p').length === 2; })()""", timeout=8)
c.js("document.querySelector('#rules-content .rules-explain-btn').click(); 1"); time.sleep(0.3)
check("15 a repeated explanation is cached (no second call)", "__calls.filter(x => x.task === 'rules_explain').length === 1")
c.js("const i = document.querySelector('#rules-content .rules-ask'); i.value = 'Чому тут est, а не a?'; document.querySelector('#rules-content .rules-ask-btn').click(); 1")
check("16 the learner's own question is sent with the same theory context", "__calls.filter(x => x.task === 'rules_explain').length === 2 && __calls.at(-1).prompt.includes('Чому тут est, а не a?')", timeout=8)

# ---- 7. tap on a highlighted word vs an ordinary word ----
c.js("els.tooltip.style.display = 'none'; document.getElementById('rules-panel').classList.remove('expanded'); __calls.length = 0; rulesState.active = -1; CSS.highlights.delete('rule-active'); 1"); time.sleep(0.5)
check("17 closing the panel keeps the highlights on the page", "CSS.highlights.has('rule-match') && !document.getElementById('rules-panel').classList.contains('expanded')")
c.js("window.scrollTo(0, 0); document.getElementById('reader-container')?.scrollTo?.(0, 0); 1"); time.sleep(0.3)
p = word_pos('avons fini')
click_xy(p['x'], p['y'])
check("18 a real tap on a highlighted word opens the panel with ITS card and does not open the word tooltip",
      "document.getElementById('rules-panel').classList.contains('expanded') && rulesState.active === 2 && document.querySelector('#rules-content .rules-card mark').textContent === 'avons fini' && els.tooltip.style.display !== 'flex' && !__calls.some(x => x.task === 'translation')", timeout=5)
c.js("document.getElementById('rules-panel').classList.remove('expanded'); 1"); time.sleep(0.5)
p = word_pos('chat')
click_xy(p['x'], p['y'])
c.wait("els.tooltip.style.display==='flex'", timeout=8)
check("19 a tap on an ordinary (non-highlighted) word still opens the translation tooltip", "els.tooltip.style.display === 'flex'")
c.js("els.ttCloseBtn.click(); 1")

# ---- 8. bad replies ----
def bad_reply(name, reply, expect_msg_key='rulesFailed', topic_id='imparfait'):
    c.js("__calls.length = 0; clearRuleHighlights(); rulesSearchCache.clear(); __reply = %s; 1" % json.dumps(reply))
    c.js("document.getElementById('rules-panel').classList.add('expanded'); (document.querySelector('#rules-content .rules-back') || {click(){}}).click(); document.querySelectorAll('#rules-content .rules-section')[0].open = true; 1")
    c.js("openRuleTopic(GRAMMAR_RULES.fr.sections.flatMap(s => s.topics).find(x => x.id === %s)); 1" % json.dumps(topic_id))
    check(name, "!CSS.highlights.has('rule-match') && document.getElementById('rules-status').textContent === t(%s)" % json.dumps(expect_msg_key), timeout=8)

bad_reply("20 a reply with only invented text shows the failure note and paints nothing", GOLD([{"text": "il pleuvait toujours", "note": "x"}]))
bad_reply("21 malformed JSON -> failure note, nothing painted", "nonsense")
bad_reply("22 a reply in the wrong language is rejected", json.dumps({"language": "en", "matches": [{"text": "Marie"}]}))
bad_reply("23 an empty match list is a legitimate 'nothing found', not an error", GOLD([]), 'rulesNone')
c.js("__calls.length = 0; clearRuleHighlights(); rulesSearchCache.clear(); __reply = %s; openRuleTopic(GRAMMAR_RULES.fr.sections.flatMap(s => s.topics).find(x => x.id === 'imparfait')); 1" % json.dumps(GOLD([{"text": "Marie", "note": "a"}, {"text": "Marie a mangé", "note": "overlap"}, {"text": "a\nmangé"}, {"text": "x" * 200}])))
check("24 overlapping, multi-line and over-long fragments are dropped; the valid one is kept",
      "rulesState.matches.length === 1 && rulesState.matches[0].text === 'Marie'", timeout=8)
c.js("__reply = new Error('offline'); rulesSearchCache.clear(); document.getElementById('rules-find').click(); 1")
check("25 a failing request ends in the failure note (no stuck 'searching' state)", "document.getElementById('rules-status').textContent === t('rulesFailed') && !document.getElementById('rules-find').disabled", timeout=8)

# ---- 9. page change, overlays, i18n ----
c.js("__reply = %s; rulesSearchCache.clear(); document.getElementById('rules-find').click(); 1" % json.dumps(GOLD([{"text": "Marie", "note": "a"}])))
c.wait("CSS.highlights.has('rule-match')", timeout=8)
c.js("els.pages.innerHTML = '<p>Autre page.</p>'; 1")
check("26 when the page changes the highlights and list are dropped and the learner is told to search again",
      "!CSS.highlights.has('rule-match') && document.querySelectorAll('#rules-content .rules-match').length === 0 && document.getElementById('rules-status').textContent === t('rulesChanged')", timeout=5)
check("27 the panel takes part in the Back-button overlay stack", "topOpenOverlay() === 'rules' && (closeTopOverlay('rules'), !document.getElementById('rules-panel').classList.contains('expanded'))")
check("28 every panel string exists in all 8 UI languages with its own text",
      """(() => { const keys = ['btnRules','tRules','panelRules','rulesLangLabel','rulesSearchPlaceholder','rulesCatalogueSoon','rulesNoTopics','rulesBack','rulesTheory','rulesFind','rulesClear','rulesRunning','rulesFound','rulesNone','rulesFailed','rulesNoText','rulesChanged','rulesExplain','rulesAskPlaceholder','rulesAskBtn'];
         const langs = ['uk','en','fr','ru','zh','ko','hi','ga']; const bad = []; for (const k of keys) for (const l of langs) { const v = I18N[k] && I18N[k][l]; if (!v) bad.push(k + ':' + l); else if (l !== 'en' && v === I18N[k].en && !/^[^a-z]*$/i.test(v) && !['btnRules','panelRules'].includes(k)) bad.push('fallback ' + k + ':' + l); }
         return bad.length === 0 || JSON.stringify(bad); })()""")
check("29 no application errors", "__errs.length === 0 || JSON.stringify(__errs)")
print('ALL GRAMMAR RULES CHECKS PASSED')
