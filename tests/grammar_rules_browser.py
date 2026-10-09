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
check("1 both catalogues (French, English) are complete and well-formed (sections, >= 50 unique topics, all texts present)",
      """(() => { const out = {}; for (const lang of ['fr', 'en']) { const cat = GRAMMAR_RULES[lang]; const topics = cat.sections.flatMap(s => s.topics); const ids = topics.map(x => x.id); const bad = [];
         for (const s of cat.sections) if (!s.title[lang] || !s.title.uk) bad.push('section ' + s.id);
         for (const x of topics) { if (!x.title[lang] || !x.title.uk) bad.push(x.id + ':title'); if (!x.theory.uk || x.theory.uk.length < 40 || !x.theory.en || x.theory.en.length < 40) bad.push(x.id + ':theory');
           if (!x.examples || !x.examples.length || x.examples.some(e => typeof e !== 'string' || e.length < 6)) bad.push(x.id + ':examples'); if (!x.find || x.find.length < 40) bad.push(x.id + ':find'); }
         out[lang] = cat.sections.length >= 7 && topics.length >= 50 && new Set(ids).size === ids.length && bad.length === 0 || JSON.stringify({lang, n: topics.length, bad}); }
         return out.fr === true && out.en === true || JSON.stringify(out); })()""")
check("2 the catalogues cover the core grammar areas (tenses, moods, agreement, determiners, pronouns, negation, questions, time markers)",
      """(() => { const has = (lang, list) => { const ids = GRAMMAR_RULES[lang].sections.flatMap(s => s.topics.map(x => x.id)); return list.every(i => ids.includes(i)); };
         return has('fr', ['passe-compose','imparfait','futur-simple','subjonctif-present','conditionnel-present','imperatif','voix-passive','accord-participe-avoir','article-partitif','pronoms-relatifs','pronoms-y-en','negation','interrogation','marqueurs-temps','comparatif','depuis-il-y-a-pendant'])
           && has('en', ['present-simple','present-perfect','past-simple','future-will','conditional-second','modal-verbs','passive-voice','reported-speech','articles-a-an','quantifiers','comparatives','relative-pronouns','negatives','questions','time-markers','for-since-ago-during','phrasal-verbs']); })()""")

# ---- 2. open the book, install mocks ----
b64 = base64.b64encode(BOOK.encode()).decode()
c.js("openBookFile(new File([Uint8Array.from(atob(%s),ch=>ch.charCodeAt(0))],'lecture.md',{lastModified:%d}))" % (json.dumps(b64), int(time.time())))
c.wait("els.pages.textContent.includes('Marie a mangé')", timeout=20)
time.sleep(0.8)
if not c.js('state.translateMode'):
    c.js('els.translateBtn.click()'); time.sleep(0.3)
c.js("state.targetLang='uk'")
c.js("""(()=>{ aiAvailable=()=>true; showToast=()=>{}; window.__calls=[]; window.__reply=null; window.__explain='Крок 1. Допоміжне дієслово.\\n\\nКрок 2. Participe passé.';
  callAI=async (prompt, signal, task)=>{ __calls.push({task, prompt}); if (task==='rules_search') { if (window.__slow) { await new Promise(r => setTimeout(r, 1800)); window.__slow = false; } if (__reply instanceof Error) throw __reply; return __reply; } if (task==='rules_explain') return __explain; return 'ok'; }; return 1; })()""")

# ---- 3. panel + menu ----
c.js("document.getElementById('btn-rules').click()"); time.sleep(0.5)
check("3 the header button opens the panel; it lists the French sections as foldable groups with topic buttons",
      "document.getElementById('rules-panel').classList.contains('expanded') && document.querySelectorAll('#rules-content .rules-section').length >= 7 && document.querySelectorAll('#rules-content .rules-topic').length >= 6")
check("4 the language of the page (fr) is preselected and the topic filter narrows the list",
      """(() => { const sel = document.querySelector('#rules-content .rules-lang'); const before = document.querySelectorAll('#rules-content .rules-topic').length; const inp = document.querySelector('#rules-content .rules-search'); inp.value = 'passé'; inp.dispatchEvent(new Event('input')); const after = document.querySelectorAll('#rules-content .rules-topic'); return sel.value === 'fr' && after.length > 0 && after.length < 20 && [...after].some(b => b.dataset.topic === 'passe-compose'); })()""")
check("5 the English catalogue lists English topics with English headings (UI-language name under it)",
      """(() => { const sel = document.querySelector('#rules-content .rules-lang'); sel.value = 'en'; sel.dispatchEvent(new Event('change')); const first = document.querySelector('#rules-content .rules-topic'); const ok = !!first && first.querySelector('b').textContent === 'Present simple' && first.querySelector('.rules-topic-sub').textContent.includes('Present Simple') && !document.querySelector('#rules-content .rules-note'); const s2 = document.querySelector('#rules-content .rules-lang'); s2.value = 'fr'; s2.dispatchEvent(new Event('change')); return ok || first && first.textContent; })()""")

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
      """(() => { const keys = ['btnRules','tRules','panelRules','rulesLangLabel','rulesSearchPlaceholder','rulesCatalogueSoon','rulesNoTopics','rulesBack','rulesTheory','rulesFind','rulesClear','rulesRunning','rulesFound','rulesNone','rulesFailed','rulesNoText','rulesChanged','rulesExplain','rulesAskPlaceholder','rulesAskBtn','rulesHide','rulesPillRunning','rulesPillReady','rulesPillFailed','rulesDetails','rulesException','rulesExceptionsCount','wheelRules'];
         const langs = ['uk','en','fr','ru','zh','ko','hi','ga']; const bad = []; for (const k of keys) for (const l of langs) { const v = I18N[k] && I18N[k][l]; if (!v) bad.push(k + ':' + l); else if (l !== 'en' && v === I18N[k].en && !/^[^a-z]*$/i.test(v) && !['btnRules','panelRules','rulesException'].includes(k)) bad.push('fallback ' + k + ':' + l); }
         return bad.length === 0 || JSON.stringify(bad); })()""")

# ================= UX: details, exceptions, hide + pill, layout, interplay, zoom, quick wheel =================
check("33 every topic of both catalogues has expanded rules AND exceptions (uk + en)",
      """(() => { const bad = []; for (const lang of ['fr', 'en']) for (const s of GRAMMAR_RULES[lang].sections) for (const x of s.topics) { const d = GRAMMAR_RULE_DETAILS[lang] && GRAMMAR_RULE_DETAILS[lang][x.id];
         if (!d) { bad.push(lang + ':' + x.id + ':missing'); continue; }
         if (!/^Правила:/m.test(d.uk) || !/^Винятки/m.test(d.uk) || d.uk.length < 250) bad.push(lang + ':' + x.id + ':uk');
         if (!/^Rules:/m.test(d.en) || !/^Exceptions/m.test(d.en) || d.en.length < 250) bad.push(lang + ':' + x.id + ':en'); }
         return bad.length === 0 || JSON.stringify(bad.slice(0, 12)); })()""")
c.js("openBookFile(new File([Uint8Array.from(atob(%s),ch=>ch.charCodeAt(0))],'lecture.md',{lastModified:%d}))" % (json.dumps(b64), int(time.time())))
c.wait("els.pages.textContent.includes('Marie a mangé')", timeout=20); time.sleep(0.8)
EXC = GOLD([{"text": "a mangé", "note": "avoir + participe"}, {"text": "est partie", "note": "être + participe", "exception": True, "exceptionNote": "Participe accordé avec le sujet (verbe de mouvement)"},
            {"text": "avons fini", "note": "avoir + participe", "exception": True, "exceptionNote": ""}])
c.js("__calls.length = 0; clearRuleHighlights(); rulesState.topic = null; rulesSearchCache.clear(); __reply = %s; document.getElementById('rules-panel').dataset.ready = ''; state.sourceLang = 'fr-FR'; openRulesPanel(); 1" % json.dumps(EXC))
c.js("openRuleTopic(GRAMMAR_RULES.fr.sections.flatMap(s => s.topics).find(x => x.id === 'passe-compose')); 1")
check("34 the topic view has the expanded 'rules and exceptions' section with subheadings and list items",
      """(() => { const d = document.querySelector('#rules-content .rules-details'); return !!d && d.querySelector('summary').textContent === t('rulesDetails') && d.querySelectorAll('h5').length >= 2 && d.querySelectorAll('li').length >= 4 && d.textContent.includes('Винятки'); })()""", timeout=8)
check("35 an exception flagged by the model is labelled in the list (badge + its description), coloured differently on the page, and counted",
      """(() => { const items = [...document.querySelectorAll('#rules-content .rules-match')]; return items.length === 3 && items[1].querySelector('.rules-badge') && items[1].textContent.includes('Participe accordé avec le sujet')
         && !items[0].querySelector('.rules-badge') && !items[2].querySelector('.rules-badge')
         && [...CSS.highlights.get('rule-exception')].map(r => r.toString()).join('|') === 'est partie' && [...CSS.highlights.get('rule-match')].map(r => r.toString()).join('|') === 'a mangé|avons fini'
         && document.getElementById('rules-status').textContent.includes(t('rulesExceptionsCount').replace('{n}', 1)); })()""", timeout=8)
c.js("document.querySelectorAll('#rules-content .rules-match')[1].click(); 1")
check("36 the card of an exception shows the badge and its explanation, and the explain prompt carries the flagged exception + the detailed rules",
      """(() => { const card = document.querySelector('#rules-content .rules-card'); document.querySelector('#rules-content .rules-explain-btn').click(); return !!card.querySelector('.rules-badge') && card.textContent.includes('Participe accordé avec le sujet'); })()""")
check("37 ... and the explain prompt includes the exception and the detailed rules", "(p => p.includes('EXCEPTION') && p.includes('Participe accordé') && p.includes('Detailed rules and exceptions'))((__calls.filter(x => x.task === 'rules_explain').at(-1) || {prompt: ''}).prompt)", timeout=8)

# hide window + readiness pill
c.js("document.getElementById('rules-min').click(); 1"); time.sleep(0.6)
check("38 'hide' removes the window but keeps highlights, results and shows a green readiness pill with the count",
      """(() => { const pill = document.getElementById('rules-pill'); return !document.getElementById('rules-panel').classList.contains('expanded') && CSS.highlights.has('rule-match') && !pill.hidden && pill.dataset.state === 'ready' && pill.textContent.includes('3'); })()""")
c.js("document.getElementById('rules-pill').click(); 1"); time.sleep(0.5)
check("39 the pill brings the same window back (same topic, same results) and hides itself",
      "document.getElementById('rules-panel').classList.contains('expanded') && document.getElementById('rules-pill').hidden && document.querySelectorAll('#rules-content .rules-match').length === 3")
c.js("window.__slow = true; document.getElementById('rules-find').click(); 1")
c.js("document.getElementById('rules-min').click(); 1")
check("40 while a search runs the hidden window shows a pulsing 'searching' pill", "(() => { const p = document.getElementById('rules-pill'); return !p.hidden && p.dataset.state === 'running'; })()", timeout=3)
check("41 ... which turns into the ready pill when the answer arrives", "(() => { const p = document.getElementById('rules-pill'); return !p.hidden && p.dataset.state === 'ready'; })()", timeout=10)

# layout
check("42 landscape (tablet): the window is a bottom sheet, never above the main menu, and the page gets bottom padding",
      """(() => { document.getElementById('rules-pill').click(); const p = document.getElementById('rules-panel'); const r = p.getBoundingClientRect(); const hb = document.getElementById('app-header').getBoundingClientRect().bottom;
         return p.classList.contains('rules-sheet') && r.bottom >= innerHeight - 1 && r.top >= hb && r.height <= innerHeight * 0.5 && document.body.classList.contains('rules-inset')
           && parseFloat(getComputedStyle(document.getElementById('reader-pages')).paddingBottom) >= r.height; })()""", timeout=3)
c.call('Emulation.setDeviceMetricsOverride', width=820, height=1180, deviceScaleFactor=1, mobile=True); time.sleep(0.8)
check("43 portrait: a side panel that starts BELOW the main menu and fits the screen; no bottom padding",
      """(() => { const p = document.getElementById('rules-panel'); const r = p.getBoundingClientRect(); const hb = document.getElementById('app-header').getBoundingClientRect().bottom;
         return !p.classList.contains('rules-sheet') && r.top >= hb && r.bottom <= innerHeight && r.right <= innerWidth + 1 && !document.body.classList.contains('rules-inset') || JSON.stringify({sheet: p.className, top: r.top, hb, bottom: r.bottom, ih: innerHeight}); })()""", timeout=3)
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=900, deviceScaleFactor=1, mobile=False); time.sleep(0.8)

# interplay
c.js("els.askPanel.classList.add('expanded'); 1"); time.sleep(0.5)
check("44 opening 'Ask AI' hides the rules window but keeps its highlights and the pill", "!document.getElementById('rules-panel').classList.contains('expanded') && CSS.highlights.has('rule-match') && !document.getElementById('rules-pill').hidden")
c.js("els.askPanel.classList.remove('expanded'); document.getElementById('btn-rules').click(); 1"); time.sleep(0.5)
c.js("els.grammarPanel.classList.add('expanded'); 1"); time.sleep(0.5)
check("45 opening 'Grammar' hides the rules window too; opening rules closes Grammar and Ask", "!document.getElementById('rules-panel').classList.contains('expanded')")
c.js("document.getElementById('btn-rules').click(); 1"); time.sleep(0.4)
check("46 ... and reopening rules closes Grammar", "document.getElementById('rules-panel').classList.contains('expanded') && !els.grammarPanel.classList.contains('expanded') && !els.askPanel.classList.contains('expanded')")
p = word_pos('chat')
click_xy(p['x'], p['y'])
check("47 tapping an ordinary word opens its translation and tucks the rules window away (no overlap with the tooltip)",
      "els.tooltip.style.display === 'flex' && !document.getElementById('rules-panel').classList.contains('expanded')", timeout=8)
c.js("els.ttCloseBtn.click(); 1")
c.js("document.getElementById('btn-rules').click(); 1"); time.sleep(0.4)
check("48 the Back button / overlay close HIDES the window (highlights stay); the ✕ closes it AND clears the highlights",
      """(() => { closeTopOverlay('rules'); const hidden = !document.getElementById('rules-panel').classList.contains('expanded') && CSS.highlights.has('rule-match'); document.getElementById('btn-rules').click(); document.getElementById('rules-close').click(); return hidden && !CSS.highlights.has('rule-match') && !CSS.highlights.has('rule-exception') && document.getElementById('rules-pill').hidden; })()""")

# highlights survive a text-size change
c.js("__calls.length = 0; rulesSearchCache.clear(); __reply = %s; document.getElementById('btn-rules').click(); 1" % json.dumps(EXC))
c.js("document.querySelector('#rules-content .rules-back') && document.querySelector('#rules-content .rules-back').click(); 1")
c.js("openRuleTopic(GRAMMAR_RULES.fr.sections.flatMap(s => s.topics).find(x => x.id === 'passe-compose')); 1")
c.wait("CSS.highlights.has('rule-match')", timeout=10)
c.js("document.querySelectorAll('#rules-content .rules-match')[1].click(); document.getElementById('rules-min').click(); 1"); time.sleep(0.5)
n_calls = c.js("__calls.filter(x => x.task === 'rules_search').length")
c.js("document.getElementById('zoom-in').click(); document.getElementById('zoom-in').click(); 1"); time.sleep(2.5)
check("49 after the text size changes the highlights are re-applied on the NEW text (same words, regular and exception colours, active match kept, no new AI call)",
      """(() => { const t2 = k => CSS.highlights.has(k) ? [...CSS.highlights.get(k)].map(r => r.toString()).join('|') : ''; return t2('rule-match') === 'a mangé|avons fini' && t2('rule-exception') === 'est partie' && t2('rule-active') === 'est partie' && !rulesRangesBroken(); })()""", timeout=5)
check("50 ... without asking the model again", "__calls.filter(x => x.task === 'rules_search').length === %d" % n_calls)
c.js("document.getElementById('zoom-out').click(); document.getElementById('zoom-out').click(); 1"); time.sleep(2)
check("51 the same after making the text smaller again", "(() => { const t2 = k => CSS.highlights.has(k) ? [...CSS.highlights.get(k)].map(r => r.toString()).join('|') : ''; return t2('rule-match') === 'a mangé|avons fini' && t2('rule-exception') === 'est partie'; })()", timeout=5)
# a text-size change that RE-PAGINATES (the marked sentences leave the screen): the rule stays on and the new visible text is searched
c.js("__calls.length = 0; rulesSearchCache.clear(); document.getElementById('rules-panel').classList.add('expanded'); 1")
c.js("document.getElementById('zoom-in').click(); els.pages.innerHTML = '<p>Autre page: Paul a mangé du pain. Ils sont partis hier.</p>'; __reply = %s; 1" % json.dumps(GOLD([{"text": "a mangé", "note": "avoir + participe"}])))
check("53 after a zoom that re-paginates the page the same rule is searched again on the NEW visible text (one new call) and painted there",
      "__calls.filter(x => x.task === 'rules_search').length === 1 && CSS.highlights.has('rule-match') && [...CSS.highlights.get('rule-match')].map(r => r.toString()).join('|') === 'a mangé' && rulesState.matches.length === 1", timeout=12)
c.js("document.getElementById('zoom-out').click(); 1")
# the visible window is a FILTERED subsequence of the DOM: a sentence contiguous there is split by off-screen nodes in the full text
c.js("""(() => { clearRuleHighlights(); els.pages.innerHTML = '<p>Il (ceindre) la ville.</p><p>aaa (ceindre) 5.</p><p>NODE HORS ECRAN</p><p>Vous (feindre) 6.</p><p>Vous (feindre) l indifference.</p>';
  rulesState.matches = [{ text: 'feindre', start: 0, end: 7, note: '', exception: false, exceptionNote: '', sentence: '(ceindre) 5. Vous (feindre) 6.', sentenceStart: 19 },
                        { text: 'ceindre', start: 0, end: 7, note: '', exception: false, exceptionNote: '', sentence: 'aaa (ceindre) 5. Vous', sentenceStart: 5 }];
  const r = remapRuleHighlights(); window.__remap = r.ranges.map(x => x && x.toString() + '@' + x.startContainer.parentElement.textContent); return 1; })()""")
check("54 a sentence that is no longer contiguous in the page text is re-found by the match + its surrounding context (right occurrence among look-alikes)",
      "__remap.length === 2 && __remap[0] === 'feindre@Vous (feindre) 6.' && __remap[1] === 'ceindre@aaa (ceindre) 5.'")
check("52 the quick wheel has a Rules action that opens the panel",
      """(() => { const b = document.querySelector('.qm-item[data-action="btn-rules"]'); if (!b) return false; document.getElementById('rules-panel').classList.remove('expanded'); document.getElementById('btn-rules').click(); const open = document.getElementById('rules-panel').classList.contains('expanded'); document.getElementById('rules-close').click(); return open && !!b.querySelector('.qm-label'); })()""")

# ---- English rules on an English page ----
c.js("""(() => { clearRuleHighlights(); rulesState.topic = null; rulesState.matches = []; state.sourceLang = 'en-US'; els.pages.innerHTML = '<p>She has lived here for years. They were playing when it rained.</p>';
  document.getElementById('rules-panel').dataset.ready = ''; rulesSearchCache.clear(); __calls.length = 0;
  __reply = JSON.stringify({language: 'en', matches: [{text: 'has lived', note: 'has + participle'}, {text: 'were playing', note: 'past continuous'}]}); openRulesPanel(); return 1; })()""")
check("30 on an English page the rules language preselects English", "document.querySelector('#rules-content .rules-lang').value === 'en' && rulesState.lang === 'en'")
c.js("openRuleTopic(GRAMMAR_RULES.en.sections.flatMap(s => s.topics).find(x => x.id === 'present-perfect')); 1")
check("31 an English topic sends an English-language search (prompt names English and the topic) and paints the validated matches",
      """__calls.filter(x => x.task === 'rules_search').length === 1 && __calls[0].prompt.includes('"language":"en"') && __calls[0].prompt.includes('in the English text') && __calls[0].prompt.includes('Present perfect') && !__calls[0].prompt.includes('Present perfect" ("Present perfect")') && [...CSS.highlights.get('rule-match')].map(r => r.toString()).join('|') === 'has lived|were playing'""", timeout=8)
c.js("document.querySelectorAll('#rules-content .rules-match')[0].click(); document.querySelector('#rules-content .rules-explain-btn').click(); 1")
check("32 the English explanation carries the English theory and the grammar tutor framing for English",
      "(p => p.includes('grammar tutor for English') && p.includes('Theory to rely on') && p.includes('has lived'))((__calls.filter(x => x.task === 'rules_explain').at(-1) || {prompt: ''}).prompt)", timeout=8)
check("29 no application errors", "__errs.length === 0 || JSON.stringify(__errs)")
print('ALL GRAMMAR RULES CHECKS PASSED')
