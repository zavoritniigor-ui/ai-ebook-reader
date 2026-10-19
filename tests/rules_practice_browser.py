"""Verb endings in their own colour + Practice for a grammar rule (Rules panel).

1. Conjugation tables colour each verb ending: the Grammar grid (parl|ons, fin|issons, work|ed) and the Rules detail
   tables (the parler/finir/vendre columns of the présent table). Irregular verbs (être, avoir, aller) and subject
   pronouns are never split.
2. The Rules panel offers Practice -- a READING of new example sentences, nothing to answer -- for one topic, for a
   whole section and for an example found in the book. The prompt carries the rule's theory (and the found sentence);
   the reply goes through the Practice validator (mode 'rule'); a highlighted fragment opens its "why" under the
   sentence instead of the Grammar card.

No live AI: every model reply is a hand-authored gold reply.
"""
import base64, json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1100, height=900, deviceScaleFactor=1, mobile=False)

BOOK = ("# Lecture\n\nHier, Marie a mangé une pomme dans le jardin. Elle est partie avant nous. Nous avons fini le travail.\n\n"
        + "\n\n".join("Paragraphe de remplissage numéro %d avec assez de mots pour occuper la page." % i for i in range(20)) + "\n")

SENTENCES = [
    ("Hier soir, nous avons regardé un film très drôle à la maison.", "avons regardé", "avoir + participe passé, action terminée."),
    ("Ce matin, mon frère a pris le train de sept heures pour Lyon.", "a pris", "avoir + participe irrégulier pris."),
    ("La semaine dernière, elles sont allées au marché avec leur grand-mère.", "sont allées", "être : le participe s'accorde au féminin pluriel."),
    ("Est-ce que tu as déjà visité le musée du Louvre à Paris ?", "as déjà visité", "avoir + participe, avec déjà entre les deux."),
    ("Mes parents ont acheté une nouvelle voiture rouge le mois dernier.", "ont acheté", "avoir + participe passé."),
    ("Après le dîner, nous sommes sortis faire une promenade au parc.", "sommes sortis", "être : accord au masculin pluriel."),
    ("Le professeur a expliqué la règle deux fois aux élèves distraits.", "a expliqué", "avoir + participe passé."),
    ("Pendant les vacances, j'ai lu trois romans policiers passionnants.", "ai lu", "avoir + participe irrégulier lu."),
    ("Ma voisine est née dans un petit village de Bretagne.", "est née", "être : accord au féminin."),
    ("Vous avez fini vos devoirs avant le début du match de football ?", "avez fini", "avoir + participe en -i."),
    ("Les enfants ont joué dans le jardin jusqu'au coucher du soleil.", "ont joué", "avoir + participe passé."),
    ("Samedi, je suis resté à la maison parce qu'il pleuvait beaucoup.", "suis resté", "être avec rester."),
]
STORY = ("Dimanche dernier, Paul et Léa sont partis à la campagne. Ils ont pris le petit train du matin et ils ont marché "
         "pendant deux heures dans la forêt. À midi, ils ont mangé des sandwichs près d'une rivière, puis ils sont rentrés fatigués mais contents.")


def gold(rule_ids, variations=False):
    sections = []
    if variations:
        sections.append({"heading": "a mangé", "kind": "examples", "items": [
            {"text": "Ce soir, mon cousin a mangé une soupe de légumes chez nous.", "targets": [{"surface": "a mangé", "lemma": rule_ids[0], "occurrence": 1, "explanation": "Même structure que la phrase du livre."}]}]})
    sections.append({"heading": "Passé composé", "kind": "examples", "items": [
        {"text": s, "targets": [{"surface": f, "lemma": rule_ids[i % len(rule_ids)] if i else "no-such-id", "occurrence": 1, "explanation": e}]} for i, (s, f, e) in enumerate(SENTENCES)]})
    sections.append({"heading": "", "kind": "story", "items": [{"text": STORY, "targets": [{"surface": "sont partis", "lemma": rule_ids[0], "occurrence": 1, "explanation": "être + accord."}]}]})
    return json.dumps({"title": "Le passé composé en contexte", "language": "fr", "mode": "rule", "sections": sections}, ensure_ascii=False)


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert")
c.js("localStorage.clear(); showUpdateBanner=()=>{}; document.getElementById('sw-update-banner')?.remove(); 1")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof openRulesPanel==='function'", timeout=30)
c.js("state.uiLang = 'uk'; applyI18n(); window.__errs = []; addEventListener('error', e => __errs.push(e.message)); addEventListener('unhandledrejection', e => __errs.push(String(e.reason))); 1")

# ---- 1. endings (the full matrix is tests/verb_endings_browser.py) ----
ENDINGS = """(el => [...el.querySelectorAll('.verb-ending')].map(s => s.textContent).join(','))"""
c.js("""(() => { focusGrammarItem({ pos: 'verb', lemma: 'parler', surface: 'parlons', sentence: 'Nous parlons français.', start: 4, end: 11, features: {},
  explanation: '', stemBreakdown: null, forms: { je: 'parle', tu: 'parles', il: 'parle', nous: 'parlons', vous: 'parlez', ils: 'parlent' } }, 'fr'); return 1; })()""")
check("1c the Grammar conjugation grid colours every ending of a regular verb (abbreviated person keys included), the whole form still readable",
      """(() => { const vals = [...document.querySelectorAll('.grammar-focus-grid .grammar-grid-value')];
         return vals.map(v => v.textContent).join(',') === 'parle,parles,parle,parlons,parlez,parlent' && vals.map(%s).join('|') === 'e|es|e|ons|ez|ent'
           && (e => getComputedStyle(e).color !== getComputedStyle(e.parentElement).color)(vals[3].querySelector('.verb-ending')) || vals.map(v => v.innerHTML).join(' / '); })()""" % ENDINGS, timeout=3)
c.js("""(() => { focusGrammarItem({ pos: 'verb', lemma: 'être', surface: 'sommes', sentence: 'Nous sommes là.', start: 4, end: 10, features: { tense: 'présent' }, explanation: '', stemBreakdown: null,
  forms: { je: 'suis', tu: 'es', il: 'est', nous: 'sommes', vous: 'êtes', ils: 'sont' } }, 'fr'); return 1; })()""")
check("1d an irregular verb's grid is coloured only where its forms follow the ending pattern (êtes, sont); suis, es, est, sommes are not split",
      "document.querySelectorAll('.grammar-focus-grid .grammar-grid-value').length === 6 && [...document.querySelectorAll('.grammar-focus-grid .grammar-grid-value')].map(%s).join('|') === '||||tes|ont'" % ENDINGS, timeout=3)
c.js("els.grammarPanel.classList.remove('expanded'); 1")

# ---- open the book, mocks ----
b64 = base64.b64encode(BOOK.encode()).decode()
c.js("openBookFile(new File([Uint8Array.from(atob(%s),ch=>ch.charCodeAt(0))],'lecture.md',{lastModified:%d}))" % (json.dumps(b64), int(time.time())))
c.wait("els.pages.textContent.includes('Marie a mangé')", timeout=20)
time.sleep(0.8)
c.js("""(() => { Object.defineProperty(navigator, 'onLine', { get: () => true, configurable: true }); aiAvailable = () => true; showToast = () => {}; state.targetLang = 'uk'; window.__calls = []; window.__practice = null;
  window.__search = JSON.stringify({ language: 'fr', matches: [{ text: 'a mangé', note: 'avoir + participe' }] });
  callAI = async (prompt, signal, task) => { __calls.push({ task, prompt }); if (task === 'rules_search') return __search; if (task === 'practice_reading') return __practice; return 'ok'; }; return 1; })()""")

c.js("document.getElementById('btn-rules').click(); 1"); time.sleep(0.5)
check("2a each section of the topic tree has a 'practise the whole section' button",
      "(() => { const s = [...document.querySelectorAll('#rules-content .rules-section')]; return s.length >= 7 && s.every(d => d.querySelector('.rules-section-practice')) && s[0].querySelector('.rules-section-practice').textContent.includes(t('rulesPracticeSection')); })()")
check("2b the présent table in the rules details colours every verb's endings, être/avoir/aller from the pattern-following ones on",
      """(() => { const tp = GRAMMAR_RULES.fr.sections.flatMap(s => s.topics).find(x => x.id === 'present'); openRuleTopic(tp);
         const rows = [...document.querySelectorAll('#rules-content .rules-table tr')]; const head = [...rows[0].children].map(x => x.textContent);
         const col = name => rows.slice(1).map(r => r.children[head.indexOf(name)]);
         const ends = name => col(name).map(td => [...td.querySelectorAll('.verb-ending')].map(s => s.textContent).join('')).join(',');
         return ends('parler') === 'e,es,e,ons,ez,ent' && ends('finir') === 'is,is,it,issons,issez,issent' && ends('vendre') === 's,s,,ons,ez,ent'
           && ends('être') === ',,,,tes,ont' && ends('avoir') === ',,,ons,ez,' && ends('aller') === ',,,ons,ez,ont' && ends('faire') === 's,s,t,ons,tes,ont' && col('parler').map(td => td.textContent).join(',') === 'parle,parles,parle,parlons,parlez,parlent'
           || JSON.stringify({ p: ends('parler'), f: ends('finir'), v: ends('vendre'), e: ends('être') }); })()""", timeout=3)

# ---- 3. topic practice ----
c.js("""(() => { const tp = GRAMMAR_RULES.fr.sections.flatMap(s => s.topics).find(x => x.id === 'passe-compose'); openRuleTopic(tp); return 1; })()""")
check("3a the topic view has a Practice button next to 'Find on this page'", "!!document.getElementById('rules-practice') && document.getElementById('rules-practice').textContent.includes(t('rulesPractice'))", timeout=3)
c.js("__calls.length = 0; __practice = %s; document.getElementById('rules-practice').click(); 1" % json.dumps(gold(['passe-compose'])))
check("3b one practice_reading request, in 'rule' mode, carrying the rule, its theory and its id -- and no book exercise wording",
      """(() => { const p = __calls.filter(x => x.task === 'practice_reading'); if (p.length !== 1) return 'calls ' + p.length; const s = p[0].prompt;
         return s.includes('"passe-compose"') && s.includes('Le passé composé') && s.includes('Theory (ground truth)') && s.includes('"mode": "rule"') && s.includes('NOT an exercise') && !s.includes('The learner found this rule') || s.slice(0, 400); })()""", timeout=5)
check("3c Practice opens with the reading; Rules hides; the meta row names the rule; every highlighted fragment is a rule target",
      """(() => { const panel = document.getElementById('practice-panel'); if (!panel || panel.hidden || !panel.querySelector('.practice-reading')) return 'not ready';
         const meta = panel.querySelector('.practice-meta .meta-label').textContent + panel.querySelector('.practice-meta .meta-value').textContent;
         const targets = [...panel.querySelectorAll('.practice-target')];
         return !rulesOpen() && meta.includes(t('practiceRuleMeta')) && meta.includes('Le passé composé') && targets.length === 13 && targets.every(b => b.classList.contains('practice-target-rule'))
           && getCurrentPracticeSession().reading.targets.every(x => x.lemma === 'passe-compose') && !panel.querySelector('input, textarea') || JSON.stringify({ meta, n: targets.length }); })()""", timeout=8)
c.js("document.querySelectorAll('#practice-panel .practice-target')[1].click(); 1")
check("3d a fragment opens its explanation under ITS sentence, without the Grammar panel",
      """(() => { const btn = document.querySelectorAll('#practice-panel .practice-target')[1]; const note = btn.closest('.practice-sentence').querySelector('.practice-rule-note');
         return !!note && note.textContent === 'a pris — avoir + participe irrégulier pris.' && btn.getAttribute('aria-expanded') === 'true' && !els.grammarPanel.classList.contains('expanded')
           && document.querySelectorAll('#practice-panel .practice-rule-note').length === 1 || (note && note.textContent); })()""", timeout=3)
c.js("document.querySelectorAll('#practice-panel .practice-target')[1].click(); 1")
check("3e a second tap hides it again", "document.querySelectorAll('#practice-panel .practice-rule-note').length === 0")
c.js("__calls.length = 0; document.getElementById('practice-regenerate').click(); 1")
check("3f Regenerate keeps the same rule (mode and rule survive in the session)",
      "(p => p.length === 1 && p[0].prompt.includes('\"passe-compose\"') && p[0].prompt.includes('\"mode\": \"rule\"'))(__calls.filter(x => x.task === 'practice_reading')) && getCurrentPracticeSession().mode === 'rule'", timeout=8)
c.js("closePractice(); 1")

# ---- 4. found example ----
c.js("document.getElementById('btn-rules').click(); 1"); time.sleep(0.3)
c.js("rulesSearchCache.clear(); document.getElementById('rules-find').click(); 1")
check("4a the search finds the example in the book", "document.querySelectorAll('#rules-content .rules-match').length === 1 || JSON.stringify({open: rulesOpen(), topic: rulesState.topic && rulesState.topic.id, st: rulesState.status, msg: (document.getElementById('rules-status')||{}).textContent, calls: __calls.map(x => x.task)})", timeout=5)
c.js("document.querySelector('#rules-content .rules-match').click(); 1")
check("4b its card offers 'practise with this example'", "!!document.querySelector('#rules-content .rules-example-practice')", timeout=3)
c.js("__calls.length = 0; __practice = %s; document.querySelector('#rules-content .rules-example-practice').click(); 1" % json.dumps(gold(['passe-compose'], variations=True)))
check("4c the prompt quotes the found sentence and fragment as data and asks for variations on its pattern",
      """(p => p.length === 1 && p[0].prompt.includes('The learner found this rule at work in their book') && p[0].prompt.includes(JSON.stringify('Hier, Marie a mangé une pomme dans le jardin.'))
         && p[0].prompt.includes('"heading" is "a mangé"') && p[0].prompt.includes('Never copy the book sentence'))(__calls.filter(x => x.task === 'practice_reading'))""", timeout=5)
check("4d the reading opens with the variations section first",
      "(() => { const h = document.querySelector('#practice-panel .practice-section-title'); return !!h && h.textContent === 'a mangé'; })()", timeout=8)
c.js("closePractice(); 1")

# ---- 5. whole section ----
c.js("document.getElementById('btn-rules').click(); 1"); time.sleep(0.3)
c.js("document.querySelector('#rules-content .rules-back')?.click(); 1"); time.sleep(0.2)
c.js("""(() => { const d = document.querySelector('#rules-content .rules-section'); d.open = true; window.__sec = GRAMMAR_RULES.fr.sections[0].topics.map(x => x.id);
  __calls.length = 0; __practice = %s; d.querySelector('.rules-section-practice').click(); return 1; })()""" % json.dumps(gold(['present', 'passe-compose'])))
check("5 a section's practice asks for every topic of that section, each with its share of sentences",
      """(p => p.length === 1 && __sec.every(id => p[0].prompt.includes('id ' + JSON.stringify(id))) && p[0].prompt.includes(Math.max(3, Math.floor(36 / __sec.length)) + ' example sentences'))(__calls.filter(x => x.task === 'practice_reading'))""", timeout=5)
check("5b the reading's rule targets keep their own topic ids (an unknown id falls back to the first topic)",
      """(() => { const s = getCurrentPracticeSession(); if (!s || s.status !== 'ready') return 'not ready'; const ids = new Set(s.reading.targets.map(x => x.lemma));
         return [...ids].every(id => __sec.includes(id)) || JSON.stringify([...ids]); })()""", timeout=8)

# ---- 6. validator ----
check("6 a rule reply that is a worksheet of blanks is rejected like any Practice reply",
      """(() => { const bad = { title: 'x', language: 'fr', mode: 'rule', sections: [{ heading: 'h', kind: 'examples', items: Array.from({ length: 12 }, (_, i) => ({ text: 'Hier, nous ____ (manger) une pomme numéro ' + i + ' au jardin.', targets: [] })) }] };
         try { validatePracticeReading(bad, { language: 'fr', mode: 'rule', lemmas: [], rule: { topics: [{ id: 'passe-compose' }] } }); return 'accepted'; } catch (e) { return /exercises|too little/.test(e.message) || e.message; } })()""")
check("7 no page errors", "__errs.length === 0 || JSON.stringify(__errs)")
print('ALL PASS')
