# Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
# Copying, modification, distribution or commercial use without written permission is prohibited.
"""A tapped or selected ENGLISH verb / adjective in Grammar comes from the app's own tables (js/grammar-english.js,
dict/en-verbs.json), not from an ~8 000-character AI analysis -- the same as French (tests/grammar_local_tables_browser.py):
the verb group, tense, person and the table are on screen at once; the AI is asked only for «why this form here» (a few hundred
characters). Tense buttons conjugate from the tables with no AI call; a noun still goes to the AI; Practice and the Adjectives
tab keep working; window.__grammarAiOnly (the suites that test the AI request itself) still sends the analysis to the AI.
The tables' own unit test (532 verbs and 364 adjectives against Wiktionary, one sentence per rule) runs first:
node tests/en_conjugation_test.mjs."""
import json, os, subprocess, sys, time
from browser_cdp import CDP

here = os.path.dirname(os.path.abspath(__file__))
unit = subprocess.run(['node', os.path.join(here, 'en_conjugation_test.mjs')], capture_output=True, text=True, timeout=120)
print(unit.stdout.strip().splitlines()[-1] if unit.stdout.strip() else unit.stderr, flush=True)
if unit.returncode != 0:
    print(unit.stdout[-3000:], unit.stderr[-2000:], file=sys.stderr); sys.exit('FAIL tests/en_conjugation_test.mjs')

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP()
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof runGrammarAnalysis==='function' && typeof loadEnVerbTables==='function'", timeout=40)


def check(name, expr, timeout=8):
    end = time.time() + timeout
    while True:
        v = c.js(expr)
        if v is True or time.time() > end: break
        time.sleep(0.1)
    assert v is True, (name, v)
    print('PASS', name, flush=True)


def rows():
    return c.js("[...document.querySelectorAll('#grammar-content .grammar-grid-value')].map(e=>e.textContent).join()")


S1 = "Yesterday the old man walked slowly to the station."
S2 = "She has finished her homework and now she is watching a film."
S3 = "The book is on the table."
S4 = "They will be happier in a bigger house."
c.js("""(()=>{ localStorage.clear(); showUpdateBanner=()=>{}; document.getElementById('sw-update-banner')?.remove(); state.uiLang='uk'; applyI18n();
  sharedAiProviders.groq=true; sharedAiProbeAnswered=true;
  window.__calls=[]; window.__explain=()=>'{"pick":1,"explanation":"Past Simple: завершена дія в минулому."}';
  window.__analysis=()=>'{"language":"en","items":[]}';
  callAI=async (prompt, signal, task)=>{ __calls.push({task, prompt}); await new Promise(r=>setTimeout(r, 60));
    if (task==='grammar_paradigm') return __explain(prompt); if (task==='grammar_analysis') return __analysis(prompt); return 'ok'; };
  const p=document.createElement('p'); p.textContent=%s; els.pages.replaceChildren(p); return true; })()""" % json.dumps(' '.join([S1, S2, S3, S4])))
nA = lambda: c.js("__calls.filter(x=>x.task==='grammar_analysis').length")

# ---- a tapped verb: the table at once, the explanation after
c.js("window.__t0=performance.now(); runGrammarAnalysis('walked', %s); 1" % json.dumps(S1))
check("the tapped verb is shown from the tables: walk, past simple, 3rd person singular, its table, the ending -ed marked",
      """(()=>{ const a=grammarContext.analysis, f=grammarContext.focused, d=document.querySelector('#grammar-content .grammar-focus'); if(!a||!d||!f) return false;
        return a.local===true && f.lemma==='walk' && f.features.tense==='past simple' && f.features.person==='3rd person' && f.features.number==='singular'
          && [...d.querySelectorAll('.grammar-grid-value')].map(e=>e.textContent).join()==='walked,walked,walked,walked,walked,walked'
          && !!d.querySelector('.grammar-grid-row.current') && d.querySelector('.grammar-ending')?.textContent==='ed'; })()""")
ms = c.js("Math.round(performance.now()-__t0)")
assert nA() == 0, 'no AI analysis for a verb the tables know'
print('PASS ... in %d ms, with NO AI analysis request' % ms, flush=True)
check("then «why this form here» arrives from a small request", "grammarContext.focused.explanation==='Past Simple: завершена дія в минулому.' && !!document.querySelector('#grammar-content .grammar-focus-why:not(.pending)')")
expl = c.js("__calls.filter(x=>x.task==='grammar_paradigm').map(x=>x.prompt)")
assert len(expl) == 1 and len(expl[0]) < 900 and 'English text' in expl[0] and 'walked' in expl[0] and 'past simple, 3rd person singular' in expl[0], expl
print('PASS the explanation request is %d characters, in English terms, and names the reading the tables found' % len(expl[0]), flush=True)

# ---- tense buttons: from the tables, no AI
n0 = c.js("__calls.length")
c.js("[...document.querySelectorAll('#grammar-controls-bar button')].find(b=>b.textContent==='Present Perfect').click(); 1")
check("Present Perfect: have / has + the past participle", "document.querySelector('#grammar-content .grammar-grid-title')?.textContent==='Present Perfect' && %s==='have walked,have walked,has walked,have walked,have walked,have walked'" % "[...document.querySelectorAll('#grammar-content .grammar-grid-value')].map(e=>e.textContent).join()")
c.js("[...document.querySelectorAll('#grammar-controls-bar button')].find(b=>b.textContent==='Past Continuous').click(); 1")
check("Past Continuous: was / were + -ing", "[...document.querySelectorAll('#grammar-content .grammar-grid-value')].map(e=>e.textContent).join()==='was walking,were walking,was walking,were walking,were walking,were walking'")
c.js("[...document.querySelectorAll('#grammar-controls-bar button')].find(b=>b.textContent==='Present Simple').click(); 1")
check("Present Simple: -s in the 3rd person singular", "[...document.querySelectorAll('#grammar-content .grammar-grid-value')].map(e=>e.textContent).join()==='walk,walk,walks,walk,walk,walk'")
assert c.js("__calls.length") == n0, 'tense buttons call no AI'
print('PASS every tense button is answered by the tables: 0 AI calls', flush=True)

# ---- a group: the auxiliary and the -ing form together
c.js("__explain=()=>'{\"pick\":1,\"explanation\":\"Present Continuous: дія відбувається зараз.\"}'; runGrammarAnalysis('watching', %s); 1" % json.dumps(S2))
check("«is watching»: present continuous of watch, the whole group, its row lit",
      "grammarContext.analysis?.local===true && grammarContext.focused?.lemma==='watch' && grammarContext.focused.surface==='is watching' && grammarContext.focused.features.tense==='present continuous' && grammarContext.focused.features.auxiliary==='is' && document.querySelector('#grammar-content .grammar-grid-row.current .grammar-grid-value')?.textContent==='is watching'")
check("Practice is offered for the verb read from the tables", "!!document.querySelector('.grammar-practice-btn')")

# ---- a noun: the AI, as before
n2 = nA()
c.js("runGrammarAnalysis('table', %s); 1" % json.dumps(S3))
check("«the table» (a noun after a determiner) goes to the AI", "__calls.filter(x=>x.task==='grammar_analysis').length===%d && !grammarContext.analysis?.local" % (n2 + 1), timeout=10)

# ---- a tapped adjective
c.js("__explain=()=>'{\"explanation\":\"Comparative: порівняння з теперішнім.\"}'; runGrammarAnalysis('happier', %s); 1" % json.dumps(S4))
check("a tapped adjective comes from the tables: happier = happy, comparative, no AI analysis",
      "grammarContext.analysis?.local===true && grammarContext.focused?.pos==='adjective' && grammarContext.focused.lemma==='happy' && grammarContext.focused.features.degree==='comparative' && __calls.filter(x=>x.task==='grammar_analysis').length===%d" % (n2 + 1), timeout=10)
check("... and its explanation from a small request in English terms",
      "grammarContext.focused.explanation==='Comparative: порівняння з теперішнім.' && __calls.filter(x=>x.task==='grammar_paradigm').at(-1).prompt.startsWith('English text') && __calls.filter(x=>x.task==='grammar_paradigm').at(-1).prompt.length < 700")

# ---- a selected sentence: its verbs from the tables, the explanation when one is opened
c.js("grammarAnalysisCache.clear(); grammarContext.mode='verbs'; window.__nA=__calls.filter(x=>x.task==='grammar_analysis').length; window.__nP=__calls.filter(x=>x.task==='grammar_paradigm').length; runGrammarAnalysis(%s, ''); 1" % json.dumps(S2))
check("a selected sentence lists its verbs from the tables, at once: has finished, is watching",
      "grammarContext.analysis?.local===true && grammarContext.analysis.verbsOnly===true && [...document.querySelectorAll('#grammar-content > .grammar-card .grammar-card-lemma')].map(b=>b.textContent).join()==='finish,watch'")
assert c.js("__calls.filter(x=>x.task==='grammar_analysis').length===__nA && __calls.filter(x=>x.task==='grammar_paradigm').length===__nP"), 'no AI request for the list'
print('PASS ... with no AI request at all', flush=True)
check("Practice is offered for the selection's verbs", "!!document.querySelector('.grammar-practice-btn')")
c.js("__explain=()=>'{\"pick\":1,\"explanation\":\"Present Perfect: результат у теперішньому.\"}'; [...document.querySelectorAll('#grammar-content > .grammar-card .grammar-card-lemma')].find(b=>b.textContent==='finish').click(); 1")
check("opening a verb shows its table and then its explanation from one small request",
      "grammarContext.focused?.lemma==='finish' && grammarContext.focused.surface==='has finished' && document.querySelector('#grammar-content .grammar-grid-row.current .grammar-grid-value')?.textContent==='has finished' && grammarContext.focused.explanation==='Present Perfect: результат у теперішньому.'")
assert c.js("__calls.filter(x=>x.task==='grammar_paradigm').length===__nP+1 && __calls.filter(x=>x.task==='grammar_analysis').length===__nA")
print('PASS one small request explains the opened verb; still no analysis request', flush=True)
c.js("__analysis=()=>JSON.stringify({language:'en',items:[{pos:'adjective',lemma:'own',surface:'her',sentence:%s,occurrence:1,agreesWith:'homework',features:{},explanation:'x',stemBreakdown:null,forms:null}]}); switchGrammarMode('adjectives'); 1" % json.dumps(S2))
check("the Adjectives tab of a selection with no adjective in the tables asks the AI once", "__calls.filter(x=>x.task==='grammar_analysis').length===__nA+1 && grammarContext.analysis && grammarContext.analysis.verbsOnly!==true", timeout=10)
c.js("switchGrammarMode('verbs'); 1")
c.js("grammarAnalysisCache.clear(); grammarContext.mode='verbs'; window.__nA2=__calls.filter(x=>x.task==='grammar_analysis').length; runGrammarAnalysis(%s, ''); 1" % json.dumps(S4))
check("a selection with adjectives: the Adjectives tab lists them from the tables with no AI request (happier, bigger)",
      "grammarContext.analysis?.local===true && grammarContext.analysis.verbsOnly===false && (switchGrammarMode('adjectives'), [...document.querySelectorAll('#grammar-content > .grammar-card .grammar-card-lemma')].map(b=>b.textContent).join()==='happy,big') && __calls.filter(x=>x.task==='grammar_analysis').length===__nA2")
check("Practice is offered for those adjectives", "!!document.querySelector('.grammar-practice-btn')")
c.js("switchGrammarMode('verbs'); 1")

# ---- the suites that test the AI request itself still get it
c.js("window.__grammarAiOnly=true; grammarAnalysisCache.clear(); window.__nA3=__calls.filter(x=>x.task==='grammar_analysis').length; runGrammarAnalysis('walked', %s); 1" % json.dumps(S1))
check("window.__grammarAiOnly: the tapped verb goes to the AI analysis", "__calls.filter(x=>x.task==='grammar_analysis').length===__nA3+1 && !grammarContext.analysis?.local", timeout=10)
c.js("window.__grammarAiOnly=false; 1")

# ---- no AI at all: the table is still there
c.js("sharedAiProviders.groq=false; state.groqKey=''; state.openaiKey=''; state.apiKey=''; grammarAnalysisCache.clear(); __calls.length=0; 1")
c.js("runGrammarAnalysis('walked', %s); 1" % json.dumps(S1))
check("without any AI key: the verb, its tense and its table are shown all the same", "grammarContext.focused?.lemma==='walk' && document.querySelectorAll('#grammar-content .grammar-grid-row').length===6 && !document.querySelector('#grammar-content .grammar-focus-why')")
print('ALL LOCAL ENGLISH TABLE CHECKS PASSED')
