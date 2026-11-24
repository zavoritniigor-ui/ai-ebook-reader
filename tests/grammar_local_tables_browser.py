# Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
# Copying, modification, distribution or commercial use without written permission is prohibited.
"""A tapped French verb in Grammar comes from the conjugation tables (js/grammar-conjugation.js, dict/fr-verbs.json), not
from an ~8 000-character AI analysis (owner, 2026-11-23: «запит за 10 секунд не дочекався»):
the table, tense and person are on screen at once; the AI is asked only for «why this form here» (a few hundred characters) and,
when the form can be several things, which one it is. Tense buttons conjugate from the tables with no AI call; a noun, an
adjective or another language still goes to the AI; Practice and the Adjectives tab keep working.
The tables' own unit test (every cell of 178 verbs against Wiktionary) runs first: node tests/fr_conjugation_test.mjs."""
import json, os, subprocess, sys, time
from browser_cdp import CDP

here = os.path.dirname(os.path.abspath(__file__))
unit = subprocess.run(['node', os.path.join(here, 'fr_conjugation_test.mjs')], capture_output=True, text=True, timeout=120)
print(unit.stdout.strip().splitlines()[-1] if unit.stdout.strip() else unit.stderr, flush=True)
if unit.returncode != 0:
    print(unit.stdout[-3000:], unit.stderr[-2000:], file=sys.stderr); sys.exit('FAIL tests/fr_conjugation_test.mjs')

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP()
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof runGrammarAnalysis==='function' && typeof loadFrVerbTables==='function'", timeout=40)


def check(name, expr, timeout=8):
    end = time.time() + timeout
    while True:
        v = c.js(expr)
        if v is True or time.time() > end: break
        time.sleep(0.1)
    assert v is True, (name, v)
    print('PASS', name, flush=True)


S1 = "Le petit garçon regardait la mer depuis la fenêtre de sa chambre."
S2 = "Je parle souvent avec elle, mais elle ne répond jamais."
S3 = "Hier, nous sommes allés au parc avec les enfants."
S4 = "La porte de la maison est rouge."
c.js("""(()=>{ localStorage.clear(); showUpdateBanner=()=>{}; document.getElementById('sw-update-banner')?.remove(); state.uiLang='uk'; applyI18n();
  sharedAiProviders.groq=true; sharedAiProbeAnswered=true;
  window.__calls=[]; window.__explain=()=>'{"pick":1,"explanation":"Imparfait описує тривалу дію в минулому."}';
  window.__analysis=()=>'{"language":"fr","items":[]}';
  callAI=async (prompt, signal, task)=>{ __calls.push({task, prompt}); await new Promise(r=>setTimeout(r, 60));
    if (task==='grammar_paradigm') return __explain(prompt); if (task==='grammar_analysis') return __analysis(prompt); return 'ok'; };
  const p=document.createElement('p'); p.textContent=%s; els.pages.replaceChildren(p); return true; })()""" % json.dumps(' '.join([S1, S2, S3, S4]), ensure_ascii=False))

# ---- a tapped verb: the table at once, the explanation after
c.js("window.__t0=performance.now(); runGrammarAnalysis('regardait', %s); 1" % json.dumps(S1, ensure_ascii=False))
check("the tapped verb is shown from the tables: regarder, imparfait, 3e personne, its six forms, the tapped row lit",
      """(()=>{ const a=grammarContext.analysis, d=document.querySelector('#grammar-content .grammar-focus'); if(!a||!d) return false;
        const rows=[...d.querySelectorAll('.grammar-grid-row')].map(r=>r.querySelector('.grammar-grid-value').textContent);
        return a.local===true && grammarContext.focused?.lemma==='regarder' && grammarContext.focused.features.tense==='imparfait'
          && grammarContext.focused.features.person==='3e personne' && JSON.stringify(rows)===JSON.stringify(['regardais','regardais','regardait','regardions','regardiez','regardaient'])
          && d.querySelector('.grammar-grid-row.current .grammar-grid-value')?.textContent==='regardait' && d.querySelector('.grammar-ending')?.textContent==='ait'; })()""")
ms = c.js("Math.round(performance.now()-__t0)")
assert c.js("__calls.filter(x=>x.task==='grammar_analysis').length") == 0, 'no AI analysis for a verb the tables know'
print('PASS ... in %d ms, with NO AI analysis request (the old request was ~8 000 characters)' % ms, flush=True)
check("then «why this form here» arrives from a small request (a few hundred characters, not ~8 000)",
      "grammarContext.focused.explanation==='Imparfait описує тривалу дію в минулому.' && !!document.querySelector('#grammar-content .grammar-focus-why:not(.pending)')")
expl = c.js("__calls.filter(x=>x.task==='grammar_paradigm').map(x=>x.prompt)")
assert len(expl) == 1 and len(expl[0]) < 900 and 'regardait' in expl[0] and 'indicatif imparfait il/elle/on' in expl[0], expl
print('PASS the explanation request is %d characters and names the reading the tables found' % len(expl[0]), flush=True)

# ---- tense buttons: from the tables, no AI
n0 = c.js("__calls.length")
c.js("[...document.querySelectorAll('#grammar-controls-bar button')].find(b=>b.textContent==='Futur simple').click(); 1")
check("Futur simple: the table at once, from the tables", "document.querySelector('#grammar-content .grammar-grid-title')?.textContent==='Futur simple' && [...document.querySelectorAll('#grammar-content .grammar-grid-value')].map(e=>e.textContent).join()==='regarderai,regarderas,regardera,regarderons,regarderez,regarderont'")
c.js("[...document.querySelectorAll('#grammar-controls-bar button')].find(b=>b.textContent==='Passé composé').click(); 1")
check("Passé composé: auxiliary + participle", "[...document.querySelectorAll('#grammar-content .grammar-grid-value')].map(e=>e.textContent).join()==='ai regardé,as regardé,a regardé,avons regardé,avez regardé,ont regardé'")
c.js("[...document.querySelectorAll('#grammar-controls-bar button')].find(b=>b.textContent==='Subjonctif').click(); 1")
check("Subjonctif", "[...document.querySelectorAll('#grammar-content .grammar-grid-value')].map(e=>e.textContent)[0]==='regarde'")
assert c.js("__calls.length") == n0, 'tense buttons call no AI'
print('PASS every tense button is answered by the tables: 0 AI calls', flush=True)

# ---- an ambiguous form: the subject decides, the AI may correct
c.js("__explain=()=>'{\"pick\":1,\"explanation\":\"Présent: дія, що повторюється.\"}'; runGrammarAnalysis('parle', %s); 1" % json.dumps(S2, ensure_ascii=False))
check("«Je parle»: the subject «Je» makes it présent, 1re personne", "grammarContext.analysis?.local===true && grammarContext.focused?.surface==='parle' && grammarContext.focused.features.person==='1re personne' && grammarContext.focused.features.mood==='indicatif'")
p2 = c.js("__calls.filter(x=>x.task==='grammar_paradigm').at(-1).prompt")
assert 'can be' in p2 and 'subjonctif' in p2 and 'impératif' in p2, p2
print('PASS the explanation request lists the other readings of «parle» for the AI to confirm', flush=True)
check("its explanation arrives", "grammarContext.focused.explanation==='Présent: дія, що повторюється.'")

# ---- a compound tense with être
c.js("runGrammarAnalysis('allés', %s); 1" % json.dumps(S3, ensure_ascii=False))
check("«sommes allés»: passé composé of aller with être, the whole group highlighted",
      "grammarContext.focused?.lemma==='aller' && grammarContext.focused.surface==='sommes allés' && grammarContext.focused.features.tense==='passé composé' && grammarContext.focused.features.auxiliary==='être' && document.querySelector('#grammar-content .grammar-grid-row.current .grammar-grid-value')?.textContent==='sommes allés'")

# ---- Practice and the Adjectives tab keep working
check("Practice is offered for the verb read from the tables", "!!document.querySelector('.grammar-practice-btn')")
c.js("""__analysis=()=>JSON.stringify({language:'fr',items:[{pos:'verb',lemma:'aller',surface:'sommes allés',sentence:%s,occurrence:1,agreesWith:'nous',features:{tense:'passé composé'},explanation:'x',stemBreakdown:null,forms:null}]}); 1""" % json.dumps(S3, ensure_ascii=False))
n1 = c.js("__calls.filter(x=>x.task==='grammar_analysis').length")
c.js("switchGrammarMode('adjectives'); 1")
check("the Adjectives tab asks the AI once for the sentence's other words", "grammarContext.analysis && grammarContext.analysis.focusOnly===false && els.grammarPanel.classList.contains('ready')", timeout=10)
assert c.js("__calls.filter(x=>x.task==='grammar_analysis').length") == n1 + 1
print('PASS the Adjectives tab still gets the sentence analysed (one AI request)', flush=True)
c.js("switchGrammarMode('verbs'); 1")

# ---- not a verb the tables can read: the AI, as before
n2 = c.js("__calls.filter(x=>x.task==='grammar_analysis').length")
c.js("""__analysis=()=>JSON.stringify({language:'fr',items:[]}); runGrammarAnalysis('porte', %s); 1""" % json.dumps(S4, ensure_ascii=False))
check("«La porte» (a noun after an article) goes to the AI", "__calls.filter(x=>x.task==='grammar_analysis').length===%d && !grammarContext.analysis?.local" % (n2 + 1), timeout=10)
c.js("runGrammarAnalysis('rouge', %s); 1" % json.dumps(S4, ensure_ascii=False))
check("an adjective goes to the AI", "__calls.filter(x=>x.task==='grammar_analysis').length===%d" % (n2 + 2), timeout=10)

# ---- no AI at all: the table is still there
c.js("sharedAiProviders.groq=false; state.groqKey=''; state.openaiKey=''; state.apiKey=''; grammarAnalysisCache.clear(); __calls.length=0; 1")
c.js("runGrammarAnalysis('regardait', %s); 1" % json.dumps(S1, ensure_ascii=False))
check("without any AI key: the verb, its tense and its table are shown all the same", "grammarContext.focused?.lemma==='regarder' && document.querySelectorAll('#grammar-content .grammar-grid-row').length===6 && !document.querySelector('#grammar-content .grammar-focus-why')")
print('ALL LOCAL CONJUGATION TABLE CHECKS PASSED')
