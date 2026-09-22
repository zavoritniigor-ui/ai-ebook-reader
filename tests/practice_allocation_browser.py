"""Grammar -> Practice: the Practice button, balanced multi-target allocation, and coverage validation.

Real report: after Grammar was fixed to detect all 8 verbs in a bilingual selection (ayant vu -> voir,
ayant compris -> comprendre, ...), the Practice button either failed to start Practice or silently used
only a handful of the detected verbs, with no size-aware distribution of example sentences across them.

Root causes fixed (js/practice-session.js, js/grammar-svo.js, js/practice-worksheet.js):
  1  PRACTICE_MAX_LEMMAS was a hard 5 -- a Grammar analysis with more than 5 verbs/adjectives (routine
     after the multi-verb fix) silently lost the rest before Practice ever saw them. Now 20, matching
     grammarItemBudget's own ceiling: Practice can demonstrate every lemma Grammar can ever produce.
  2  No deterministic allocation existed: the prompt asked for one flat "N examples per lemma" number.
     Now allocatePracticeExamples(itemCount, total) computes a base+remainder split (documented order:
     the same order the lemmas were supplied in, i.e. Grammar's own detected/tapped order) and the prompt
     tells the model EXACTLY how many examples each target needs.
  3  No coverage check existed: a reply could satisfy the old global floors (MIN_ITEMS/MIN_TARGETS) while
     covering only one or two of many requested lemmas -- exactly the "collapses to one verb" bug, one
     validation layer up. validatePracticeReading now rejects a reply with severe missing coverage.
  4  The output token budget was a flat per-task constant regardless of how much was actually requested.
     practiceOutputBudget/practiceTimeoutMs scale it from the SAME allocation the prompt was built from.
  5  The Practice button had no re-entrancy guard: a fast double-click could fire two provider requests.
     It now shows immediate visible feedback (disabled + "Generating...") and a session-status guard.
  6  The collapsed Practice tab (#practice-restore) never exposed the session's ready/loading/error state,
     and its label was hard-coded English, never touched by a UI-language switch.

Sections: 1 the button (one/many verbs, one/many adjectives, immediate feedback, no duplicate request)
          2 balanced allocation (deterministic base+remainder, documented order, size tiers)
          3 coverage validation (full coverage accepted, severe under-coverage rejected)
          4 verb pedagogy survives allocation (persons/tenses, reflexive, compound form)
          5 adjective pedagogy (gender/number/agreement/irregular, NEVER tense controls)
          6 occurrence clicks still exact after the allocation refactor (repeated form, zero AI calls)
          7 language: Practice uses Grammar's OWN validated source language, never its own redetection
          8 state machine + the ready-tab indicator (idle/loading/ready/error, localized label)
          9 storage: the new (larger) lemma set still round-trips through the same schema
"""
import json, os, time
from browser_cdp import CDP, verb_table_pdf_bytes, VERB_TABLE_ROWS
import practice_fixtures as PF

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(120)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1100, height=1200, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert")
c.js("localStorage.clear();showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove()")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof generatePracticeReading==='function' && typeof allocatePracticeExamples==='function'")

FR = [fr for fr, _ in VERB_TABLE_ROWS]
EN = [en for _, en in VERB_TABLE_ROWS]
FR_LEMMAS = ['voir', 'comprendre', 'jouer', 'traverser', 'aller', 'partir', 'se promener', 'se retrouver']
KNOWN_FR = [('ayant vu', 'voir'), ('ayant compris', 'comprendre'), ('ayant joué', 'jouer'), ('ayant traversé', 'traverser'), ('étant allé', 'aller'), ('étant parti', 'partir'),
            ('nous étant promené', 'se promener'), ('nous étant retrouvé', 'se retrouver')]


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1)
        result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def mouse(kind, x, y, buttons=0):
    c.call('Input.dispatchMouseEvent', type=kind, x=x, y=y, button='left' if (kind != 'mouseMoved' or buttons) else 'none', buttons=buttons, clickCount=1)


def load_pdf(pdf_bytes, name='table.pdf'):
    c.js("if (typeof pdfContinuousReady !== 'undefined') pdfContinuousReady = false;")
    c.js("""(() => { const bytes = Uint8Array.from(atob(%s), ch=>ch.charCodeAt(0)); const file = new File([bytes], %s, {type:'application/pdf'});
      const dt = new DataTransfer(); dt.items.add(file); const i=document.getElementById('file-upload'); i.files = dt.files; i.dispatchEvent(new Event('change')); })()"""
         % (json.dumps(__import__('base64').b64encode(pdf_bytes).decode()), json.dumps(name)))
    c.wait("state.format==='pdf' && pdfContinuousReady && !!state.pdfDoc", timeout=60)
    c.wait("!!document.querySelector('.pdf-page-wrapper[data-page=\"1\"] .pdf-text-layer span')", timeout=30); time.sleep(2.0)
    if not c.js('state.translateMode'):
        c.js('els.translateBtn.click()'); time.sleep(0.4)
    c.js("state.sourceLang='fr-FR'")


def cell_pos(text, nth=0, scroll=False):
    return c.js(r"""(()=>{ const layer=document.querySelector('.pdf-page-wrapper[data-page="1"] .pdf-text-layer'); const w=%s; let hits=%d; let found=null;
      for (const s of layer.querySelectorAll('span')) { if (s.classList.contains('markedContent') || s.textContent.trim()!==w) continue; if (hits--===0) { found=s; break; } }
      if (!found) return null; if (%s) found.scrollIntoView({block:'center'}); const b=found.getBoundingClientRect(); return {l:b.left,r:b.right,t:b.top,b:b.bottom,x:b.left+b.width/2,y:b.top+b.height/2}; })()"""
                % (json.dumps(text, ensure_ascii=False), nth, 'true' if scroll else 'false'))


def drag(a, b, steps=14):
    mouse('mousePressed', a['x'], a['y'], 1)
    for i in range(1, steps + 1):
        mouse('mouseMoved', a['x'] + (b['x'] - a['x']) * i / steps, a['y'] + (b['y'] - a['y']) * i / steps, 1)
    mouse('mouseReleased', b['x'], b['y'], 0)


def close_ui():
    # Also clears lastTapPoint/lastSelectedRange: this file, unlike the sibling PDF-drag suites, also
    # injects a few synthetic single-sentence selections directly (Sections 1a/1d/5) -- close_ui() is
    # what every real PDF drag (select_between) calls first, so a synthetic selection's leftover state
    # can never bleed into a SUBSEQUENT real drag's own tooltip/selection logic.
    c.js("els.tooltip.style.display='none'; els.grammarPanel.classList.remove('expanded'); if (typeof closePractice==='function') closePractice(); grammarAnalysisCache.clear(); __calls.length=0; state.lastTapPoint=null; state.lastSelectedRange=null")
    time.sleep(0.3)


def select_between(first_text, last_text, first_nth=0, last_nth=0):
    close_ui()
    cell_pos(first_text, first_nth, scroll=True); time.sleep(0.5)
    a, b = cell_pos(first_text, first_nth), cell_pos(last_text, last_nth)
    drag({'x': a['l'] + 2, 'y': a['y']}, {'x': b['r'] - 2, 'y': b['y']})
    # 25s, not the sibling suites' 10s: on GitHub's shared runner this file's FIRST drag (the largest one
    # in the suite -- 16 spans across 2 columns, right after a fresh page reload) was observed to sometimes
    # take longer than 10s to open the tooltip, reproducibly on CI but never locally (incl. under 6x CPU
    # throttling) -- genuine runner contention, not a logic bug; a wider margin costs nothing when it
    # resolves quickly, as it does locally.
    c.wait("els.tooltip.style.display==='flex'", timeout=25); time.sleep(0.8)


def press_grammar():
    p = c.js("(()=>{const b=els.ttAiBtn.getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2}})()")
    mouse('mousePressed', p['x'], p['y'], 1); mouse('mouseReleased', p['x'], p['y'])
    c.wait("(els.grammarPanel.classList.contains('ready') || !!els.grammarContent.querySelector('span[style*=red]')) && !els.grammarContent.querySelector('.spinner-large')", timeout=20)
    time.sleep(0.4)
    if not c.js("els.grammarPanel.classList.contains('expanded')"):
        t = c.js("(()=>{const b=document.getElementById('grammar-tab'); const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}})()")
        mouse('mousePressed', t['x'], t['y'], 1); mouse('mouseReleased', t['x'], t['y'])
        time.sleep(0.4)


def click_practice_btn():
    b = c.js("(()=>{const e=document.querySelector('.grammar-practice-btn'); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}})()")
    assert b, 'the Practice button must exist after a successful analysis'
    mouse('mousePressed', b['x'], b['y'], 1); mouse('mouseReleased', b['x'], b['y'])


def install_grammar_and_practice(known=None, practice_mock=None, delay_ms=0):
    """A competent Grammar model (reports every KNOWN whole-word form present, per requested language) and
    a Practice model that, by default, covers EXACTLY the allocation the prompt itself asked for (never a
    fixed canned reply) -- so any failure here is attributable to the app's own pipeline, never the mock."""
    known = known or {'fr': KNOWN_FR}
    practice_js = practice_mock or r"""
          const lang=(prompt.match(/language code "(\w+)"/)||[])[1]||'fr';
          const alloc=[...prompt.matchAll(/- "([^"]+)": (\d+) example/g)];
          const sections=alloc.map(([,lemma,n])=>({heading:lemma, kind:'examples', items:Array.from({length:+n},(_,i)=>({
            text:(lang==='en'?`This is example number ${i+1} using the word ${lemma} in a complete, natural and well-formed sentence indeed.`
                              :`Voici la phrase exemple numero ${i+1} employant le mot ${lemma} dans un contexte complet et bien naturel vraiment.`),
            targets:[{surface:lemma, lemma, occurrence:1, features:{}, explanation:'x', forms:null}]}))}));
          // A fixed, generous story count regardless of what was actually requested: this generic mock's
          // only job is to satisfy the structural floors so the allocation/coverage/occurrence machinery
          // under test is exercised, not to mirror the prompt's story count exactly.
          for (let s = 0; s < 3; s++) sections.push({heading:'', kind:'story', items:[{text:(lang==='en'
              ?`This is connected story paragraph number ${s+1} that mentions several of the words in a natural and interesting context indeed.`
              :`Voici le paragraphe d'histoire connectee numero ${s+1} qui mentionne plusieurs mots dans un contexte naturel et interessant vraiment.`), targets:[]}]});
          return JSON.stringify({title:'T', language:lang, mode: (mode2||'verbs'), sections});
    """
    c.js(r"""(()=>{ aiAvailable=()=>true; showToast=()=>{}; window.__calls=[]; window.__known=%s; window.__delayMs=%d;
      callAI=async (prompt, signal, task, onDelta, options)=>{ const rec={task, prompt, maxTokens:options&&options.maxOutputTokens}; __calls.push(rec);
        if (window.__delayMs) await new Promise(r=>setTimeout(r, window.__delayMs));
        if (task==='grammar_analysis'){
          const m=prompt.match(/Text \(a JSON string[^:]*: (".*")\n/); const text=JSON.parse(m[1]); rec.text=text;
          rec.lang=(prompt.match(/language code "(\w+)"/)||[])[1];
          const items=(__known[rec.lang]||[]).filter(([s])=>text.includes(s)).map(([surface,lemma])=>({pos:'verb', lemma, surface, sentence:text, occurrence:1, agreesWith:null, features:{}, explanation:'x', stemBreakdown:null, forms:null}));
          return JSON.stringify({language:rec.lang, items}); }
        if (task==='translation'){ return JSON.stringify({translation:'x', alignment:[]}); }
        if (task==='practice_reading') {
          const mode2=/"mode":\s*"adjectives"/.test(prompt) || /Targets to demonstrate \(adjectives\)/.test(prompt) ? 'adjectives' : 'verbs';
          %s
        }
        return 'ok'; };
      return true; })()""" % (json.dumps(known, ensure_ascii=False), delay_ms, practice_js))


install_grammar_and_practice()

# =====================================================================================================================
print("\n=== SECTION 1: the Practice button -- one verb, many verbs, one/many adjectives, no duplicate request ===")
load_pdf(verb_table_pdf_bytes('rows'))
install_grammar_and_practice()

# 1b. MANY verbs (the real reported case: all 8 must reach Practice, not just the first few). Runs FIRST,
# right after a clean load_pdf, before any synthetic single-sentence injection below (1a/1d) -- so this
# real PDF drag never follows a synthetic selection's leftover state (belt-and-suspenders with close_ui()
# now also clearing lastTapPoint/lastSelectedRange).
select_between(FR[0], EN[-1])
press_grammar()
check("1b: Grammar found all 8 verbs", "new Set(grammarContext.analysis.items.map(i=>i.lemma)).size===8")
n0 = c.js("__calls.length")
install_grammar_and_practice(delay_ms=200)   # a brief delay so the transient 'generating' button state can actually be observed
click_practice_btn()
check("1b: the button shows immediate visible feedback (disabled + 'Generating...') right after the click",
      "document.querySelector('.grammar-practice-btn')?.disabled===true && document.querySelector('.grammar-practice-btn')?.textContent===t('generating')")
c.wait("getCurrentPracticeSession()?.status==='ready'", timeout=10)
sess = c.js("getCurrentPracticeSession()")
assert sorted(sess['lemmas']) == sorted(FR_LEMMAS), ('all 8 detected verbs must reach Practice, not a truncated subset', sess['lemmas'])
check("1b: the button is restored (enabled, its normal label) once generation completes",
      "document.querySelector('.grammar-practice-btn')?.disabled===false && document.querySelector('.grammar-practice-btn')?.textContent===t('practice')")
print("PASS 1b: Practice receives ALL 8 detected verbs (%s), not a silently truncated subset" % ','.join(sess['lemmas']), flush=True)

# 1c. duplicate click while a generation is genuinely in flight -> exactly ONE provider request
close_ui()
select_between(FR[0], EN[-1])
press_grammar()
install_grammar_and_practice(delay_ms=500)   # a realistic network delay so both clicks land while still 'generating'
n0 = c.js("__calls.length")
b = c.js("(()=>{const e=document.querySelector('.grammar-practice-btn'); const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}})()")
mouse('mousePressed', b['x'], b['y'], 1); mouse('mouseReleased', b['x'], b['y'])
mouse('mousePressed', b['x'], b['y'], 1); mouse('mouseReleased', b['x'], b['y'])   # immediate second click
c.wait("getCurrentPracticeSession()?.status==='ready'", timeout=10)
assert c.js("__calls.length") - n0 == 1, ('a fast double-click must fire exactly ONE provider request, not two', c.js("__calls.length") - n0)
print("PASS 1c: a duplicate click while Practice is already generating starts NO second provider request", flush=True)
install_grammar_and_practice()   # restore the no-delay mock for the rest of the suite

# 1a. ONE verb -- a clean, punctuated single sentence (not the table: an unpunctuated PDF row/column
# legitimately sweeps into a whole-column "sentence", which is Grammar's own pre-existing, documented,
# unrelated behaviour -- see ARCHITECTURE.md; this sub-test is about the Practice BUTTON, not selection).
# Runs AFTER the real PDF drags above (never before one), so its synthetic injection can never precede
# and interfere with a real drag's own selection/tooltip logic.
close_ui()
c.js("""(()=>{ callAI = async (prompt, signal, task) => { __calls.push({task, prompt});
    if (task==='grammar_analysis') return JSON.stringify({language:'fr', items:[{pos:'verb', lemma:'voir', surface:'voit', sentence:'Elle voit un bel oiseau ce matin.', occurrence:1, agreesWith:'Elle', features:{tense:'présent'}, explanation:'x', stemBreakdown:null, forms:null}]});
    return 'ok'; }; return true; })()""")
c.js("state.lastSelectedRange=null; state.ctxSentence='Elle voit un bel oiseau ce matin.'; state.lastSelectionText='Elle voit un bel oiseau ce matin.'; state.lastTapPoint={x:20,y:20}; state.lastGrammarSourceText=null; handleWordOrSelection('Elle voit un bel oiseau ce matin.', 20, 20, {left:0,right:0,top:0,bottom:0}, null, 'paragraph_translation')")
c.wait("els.tooltip.style.display==='flex'", timeout=8)
press_grammar()
check("1a: Grammar found exactly one verb (voir)", "grammarContext.analysis.items.map(i=>i.lemma).join()==='voir'")
install_grammar_and_practice()
click_practice_btn()
c.wait("getCurrentPracticeSession()?.status==='ready'", timeout=10)
sess = c.js("getCurrentPracticeSession()")
assert sess['lemmas'] == ['voir'], sess['lemmas']
print("PASS 1a: Practice starts and completes for a SINGLE detected verb", flush=True)

# 1d. ONE adjective
close_ui()
c.js("""(()=>{ callAI = async (prompt, signal, task) => { __calls.push({task, prompt});
    if (task==='grammar_analysis') return JSON.stringify({language:'fr', items:[{pos:'adjective', lemma:'petit', surface:'petite', sentence:'Elle habite dans une petite maison.', occurrence:1, agreesWith:'maison', features:{gender:'féminin', number:'singulier'}, explanation:'x', stemBreakdown:null, forms:null}]});
    return 'ok'; }; return true; })()""")
c.js("state.lastSelectedRange=null; state.ctxSentence='Elle habite dans une petite maison.'; state.lastSelectionText='Elle habite dans une petite maison.'; state.lastTapPoint={x:20,y:20}; state.lastGrammarSourceText=null; handleWordOrSelection('Elle habite dans une petite maison.', 20, 20, {left:0,right:0,top:0,bottom:0}, null, 'paragraph_translation')")
c.wait("els.tooltip.style.display==='flex'", timeout=8)
press_grammar()
c.js("switchGrammarMode('adjectives')")
check("1d: Grammar found exactly one adjective (petit)", "grammarContext.analysis.items.map(i=>i.lemma).join()==='petit'")
install_grammar_and_practice()
click_practice_btn()
c.wait("getCurrentPracticeSession()?.status==='ready'", timeout=10)
sess = c.js("getCurrentPracticeSession()")
assert sess['mode'] == 'adjectives' and sess['lemmas'] == ['petit'], sess
print("PASS 1d: Practice starts and completes for a SINGLE detected adjective", flush=True)

# MULTIPLE adjectives -- same requirement as verbs: all of them must reach Practice (task section 2)
close_ui()
c.js("""(()=>{ callAI = async (prompt, signal, task) => { __calls.push({task, prompt});
    if (task==='grammar_analysis') return JSON.stringify({language:'fr', items:[
      {pos:'adjective', lemma:'petit', surface:'petit', sentence:'Le petit chien et le grand chat sont heureux.', occurrence:1, agreesWith:'chien', features:{gender:'masculin', number:'singulier'}, explanation:'x', stemBreakdown:null, forms:null},
      {pos:'adjective', lemma:'grand', surface:'grand', sentence:'Le petit chien et le grand chat sont heureux.', occurrence:1, agreesWith:'chat', features:{gender:'masculin', number:'singulier'}, explanation:'x', stemBreakdown:null, forms:null},
      {pos:'adjective', lemma:'heureux', surface:'heureux', sentence:'Le petit chien et le grand chat sont heureux.', occurrence:1, agreesWith:'chien, chat', features:{gender:'masculin', number:'pluriel'}, explanation:'x', stemBreakdown:null, forms:null}]});
    return 'ok'; }; return true; })()""")
c.js("state.lastSelectedRange=null; state.ctxSentence='Le petit chien et le grand chat sont heureux.'; state.lastSelectionText='Le petit chien et le grand chat sont heureux.'; state.lastTapPoint={x:20,y:20}; state.lastGrammarSourceText=null; handleWordOrSelection('Le petit chien et le grand chat sont heureux.', 20, 20, {left:0,right:0,top:0,bottom:0}, null, 'paragraph_translation')")
c.wait("els.tooltip.style.display==='flex'", timeout=8)
press_grammar()
c.js("switchGrammarMode('adjectives')")
check("1d: Grammar found all 3 adjectives (petit, grand, heureux)", "new Set(grammarContext.analysis.items.map(i=>i.lemma)).size===3")
install_grammar_and_practice()
click_practice_btn()
c.wait("getCurrentPracticeSession()?.status==='ready'", timeout=10)
sess = c.js("getCurrentPracticeSession()")
assert sess['mode'] == 'adjectives' and sorted(sess['lemmas']) == ['grand', 'heureux', 'petit'], sess
print("PASS 1d: Practice receives ALL 3 detected adjectives, not a silently truncated subset (same requirement as verbs)", flush=True)

# =====================================================================================================================
print("\n=== SECTION 2: balanced, deterministic allocation (documented order: same order the lemmas were given) ===")
alloc_30_7 = c.js("allocatePracticeExamples(7, 30)")
assert alloc_30_7 == [5, 5, 4, 4, 4, 4, 4], alloc_30_7
print("PASS 2: 30 examples / 7 targets -> [5,5,4,4,4,4,4] (base 4, first 2 in order get +1) -- exactly the task's own worked example", flush=True)
alloc_20_8 = c.js("allocatePracticeExamples(8, 20)")
assert sum(alloc_20_8) == 20 and max(alloc_20_8) - min(alloc_20_8) <= 1, alloc_20_8
print("PASS 2: 20 examples / 8 targets -> %s (deterministic, max-min <= 1)" % alloc_20_8, flush=True)
for count, total in [(1, 8), (2, 16), (5, 25), (12, 36), (20, 60)]:
    a = c.js("allocatePracticeExamples(%d, %d)" % (count, total))
    assert len(a) == count and sum(a) == total and max(a) - min(a) <= 1, (count, total, a)
print("PASS 2: allocation is exact-sum and near-even (max-min <= 1) across small/medium/large target counts", flush=True)
# the SAME allocation drives the actual prompt sent for the 8-verb selection above
n0 = c.js("__calls.length")
close_ui()
select_between(FR[0], EN[-1])
press_grammar()
c.js("switchGrammarMode('verbs')")   # mode persists across selections; the previous sub-test left it on Adjectifs
click_practice_btn()
c.wait("getCurrentPracticeSession()?.status==='ready'", timeout=10)
gen = c.js("__calls.filter(x=>x.task==='practice_reading').at(-1).prompt")
alloc_in_prompt = [int(n) for _, n in __import__('re').findall(r'- "([^"]+)": (\d+) example', gen)]
assert len(alloc_in_prompt) == 8 and max(alloc_in_prompt) - min(alloc_in_prompt) <= 1, alloc_in_prompt
print("PASS 2: the REAL 8-verb request's own prompt carries the same near-even, documented-order allocation (%s)" % alloc_in_prompt, flush=True)

# =====================================================================================================================
print("\n=== SECTION 3: coverage validation -- full coverage accepted, severe under-coverage rejected ===")
sess = c.js("getCurrentPracticeSession()")
assert sess['status'] == 'ready' and len(set(sess['lemmas'])) == 8
rendered_lemmas = c.js("[...document.querySelectorAll('#practice-panel .practice-section-title')].map(h=>h.textContent)")
assert sorted(rendered_lemmas) == sorted(FR_LEMMAS), ('every one of the 8 requested lemmas must be its own rendered section', rendered_lemmas)
print("PASS 3: a reply that honours the allocation is accepted, and ALL 8 targets are rendered (not just some)", flush=True)

# A malformed reply that collapses onto ONE of the 7 requested targets (task's own illustrative example:
# "A, A, A, B" while C-G are silently missing) must be REJECTED, not accepted with partial coverage.
BAD_TARGETS = ['aimer', 'finir', 'vendre', 'choisir', 'attendre', 'répondre', 'courir']
c.js("""(()=>{ callAI = async (prompt, signal, task) => { __calls.push({task, prompt});
    if (task==='practice_reading') return JSON.stringify({title:'T', language:'fr', mode:'verbs', sections:[
      {heading:'aimer', kind:'examples', items: Array.from({length:15}, (_,i)=>({text:`Phrase ${i} avec aimer dans un contexte different et naturel vraiment.`, targets:[{surface:'aimer', lemma:'aimer', occurrence:1, features:{}, explanation:'x', forms:null}]}))},
      {heading:'finir', kind:'examples', items:[{text:'Je finis toujours mon travail avant le diner du soir.', targets:[{surface:'finis', lemma:'finir', occurrence:1, features:{}, explanation:'x', forms:null}]}]},
      {heading:'', kind:'story', items:[{text:'Une histoire connectee qui utilise aimer plusieurs fois dans un contexte naturel et interessant vraiment.', targets:[]}]}
    ]});
    return 'ok'; }; return true; })()""")
result = c.js("""(async()=>{ try { const s = await generatePracticeReading({sourceText:'', sourceLanguage:'fr', targetLanguage:'en', mode:'verbs', bookId:'t', lemmas:%s});
    return {ok:true, status:s.status}; } catch(e) { return {ok:false, message:e.message}; } })()""" % json.dumps(BAD_TARGETS))
sess2 = c.js("getCurrentPracticeSession()")
assert sess2['status'] == 'error' and 'coverage' in sess2['lastError']['message'], sess2
print("PASS 3: a reply covering only 2 of 7 requested targets (the task's own 'A, A, A, B' example) is REJECTED with a coverage error, never silently accepted", flush=True)
install_grammar_and_practice()

# =====================================================================================================================
print("\n=== SECTION 4: verb pedagogy survives the allocation refactor (persons/tenses, reflexive, compound) ===")
close_ui()
reflexive_reading = PF.to_json(PF.reading('Reflexive and compound forms', 'verbs',
    PF.section('se promener', 'examples',
        PF.item("Nous nous promenons chaque dimanche dans le grand parc du centre-ville.",
                PF.tgt('nous promenons', 'se promener', 'x', person='1re personne', number='pluriel', tense='présent')),
        PF.item("Hier, nous nous sommes promenés le long de la rivière pendant deux heures.",
                PF.tgt('nous sommes promenés', 'se promener', 'x', person='1re personne', number='pluriel', tense='passé composé', auxiliary='être', participle='promenés')),
        PF.item("Tu te promènes souvent dans ce quartier tranquille en fin de journée.",
                PF.tgt('te promènes', 'se promener', 'x', person='2e personne', number='singulier', tense='présent')),
        PF.item("Ils se promenaient tranquillement quand la pluie a soudainement commencé à tomber.",
                PF.tgt('se promenaient', 'se promener', 'x', person='3e personne', number='pluriel', tense='imparfait')),
        PF.item("Je me suis promené tout seul dans la forêt pendant une bonne partie de l'après-midi.",
                PF.tgt('me suis promené', 'se promener', 'x', person='1re personne', number='singulier', tense='passé composé', auxiliary='être', participle='promené')),
        PF.item("Elle se promène avec son chien tous les matins avant d'aller travailler en ville.",
                PF.tgt('se promène', 'se promener', 'x', person='3e personne', number='singulier', tense='présent'))),
    PF.section('', 'story',
        PF.item('Ils se sont retrouvés au marché ce matin-là, puis ils se sont promenés ensemble toute la matinée dans le vieux quartier.'),
        PF.item("L'été dernier, nous nous promenions souvent le long de la plage avant le coucher du soleil, et nous nous sommes toujours sentis apaisés."),
        PF.item("Quand il était plus jeune, il se promenait chaque jour avec son grand-père dans les collines proches du village."),
        PF.item("Demain, si le temps le permet, nous nous promènerons dans le parc voisin avant de rentrer préparer le dîner."))))
c.js("""(()=>{ callAI = async (prompt, signal, task) => { __calls.push({task}); if (task==='practice_reading') return %s; return 'ok'; }; return true; })()""" % json.dumps(reflexive_reading))
c.js("generatePracticeReading({sourceText:'', sourceLanguage:'fr', targetLanguage:'en', mode:'verbs', bookId:'t', lemmas:['se promener']})")
c.wait("getCurrentPracticeSession()?.reading?.targets?.some(t=>t.lemma==='se promener' && /sommes promenés/.test(t.surface))", timeout=10)
target = c.js("getCurrentPracticeSession().reading.targets.find(t=>/sommes promenés/.test(t.surface))")
assert target['features'].get('auxiliary') == 'être' and target['features'].get('tense') == 'passé composé', target
print("PASS 4: a reflexive verb's compound form (nous sommes promenés) survives validation with its auxiliary/tense features intact", flush=True)
install_grammar_and_practice()

# =====================================================================================================================
print("\n=== SECTION 5: adjective pedagogy -- gender/number/agreement/irregular, NEVER tense controls ===")
close_ui()
c.js("""(()=>{ callAI = async (prompt, signal, task) => { __calls.push({task, prompt});
    if (task==='grammar_analysis') return JSON.stringify({language:'fr', items:[{pos:'adjective', lemma:'beau', surface:'belle', sentence:"C'est une belle histoire.", occurrence:1, agreesWith:'histoire', features:{gender:'féminin', number:'singulier'}, explanation:'x', stemBreakdown:null, forms:null}]});
    if (task==='practice_reading') return %s;
    return 'ok'; }; return true; })()""" % json.dumps(PF.to_json(PF.ADJECTIVES_FR)))
c.js("state.lastSelectedRange=null; state.ctxSentence=\"C'est une belle histoire.\"; state.lastSelectionText=\"C'est une belle histoire.\"; state.lastTapPoint={x:20,y:20}; state.lastGrammarSourceText=null; handleWordOrSelection(\"C'est une belle histoire.\", 20, 20, {left:0,right:0,top:0,bottom:0}, null, 'paragraph_translation')")
c.wait("els.tooltip.style.display==='flex'", timeout=8)
press_grammar()
c.js("switchGrammarMode('adjectives')")
check("5: an adjective analysis shows NO tense/mood controls", "document.querySelectorAll('#grammar-controls-bar button').length===0")
click_practice_btn()
c.wait("getCurrentPracticeSession()?.status==='ready'", timeout=10)
check("5: the adjectives reading never mentions tense controls either", "document.querySelectorAll('#grammar-controls-bar button').length===0")
targets = c.js("getCurrentPracticeSession().reading.targets")
genders = set(t['features'].get('gender') for t in targets if t['lemma'] == 'beau')
irregular = c.js("getCurrentPracticeSession().reading.targets.some(t=>t.surface==='bel' && t.lemma==='beau')")
assert 'masculin' in genders and 'féminin' in genders, genders
assert irregular, 'the irregular before-vowel form (bel) must be a valid, kept target'
print("PASS 5: adjective targets vary gender/number (agreement, not tense) and the irregular 'bel' form is preserved", flush=True)
install_grammar_and_practice()

# =====================================================================================================================
print("\n=== SECTION 6: occurrence clicks stay exact after the allocation refactor (repeated form, zero AI calls) ===")
close_ui()
select_between(FR[0], EN[-1])
press_grammar()
c.js("switchGrammarMode('verbs')")   # mode persists across selections; Section 5 left it on Adjectifs
click_practice_btn()
c.wait("getCurrentPracticeSession()?.status==='ready'", timeout=10)
n0 = c.js("__calls.length")
first_btn = c.js("(()=>{const b=document.querySelectorAll('#practice-panel .practice-target')[0]; b.scrollIntoView({block:'center'}); const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2, lemma:b.dataset.lemma}})()")
mouse('mousePressed', first_btn['x'], first_btn['y'], 1); mouse('mouseReleased', first_btn['x'], first_btn['y'])
time.sleep(0.3)
assert c.js("__calls.length") == n0 and c.js("grammarContext.focused?.lemma") == first_btn['lemma']
print("PASS 6: clicking a highlighted Practice target focuses its exact lemma with ZERO new AI calls (after the allocation refactor)", flush=True)

# =====================================================================================================================
print("\n=== SECTION 7: Practice uses Grammar's OWN validated source language -- never its own redetection ===")
# A raw source text that is deliberately BILINGUAL (contains English words too), but Grammar has already
# resolved and validated 'fr' as the source language and French lemmas as the targets (task section 10):
# Practice must not independently re-run language detection over that raw text and flip to English.
mixed_raw = "ayant vu having seen ayant compris having understood étant allé having gone"
result = c.js("""(async()=>{ const s = await generatePracticeReading({sourceText:%s, sourceLanguage:'fr', targetLanguage:'en', mode:'verbs', bookId:'t', lemmas:['voir','comprendre','aller']});
    return {status:s.status, language: s.reading && s.reading.language}; })()""" % json.dumps(mixed_raw))
assert result['status'] == 'ready' and result['language'] == 'fr', result
prompt = c.js("__calls.filter(x=>x.task==='practice_reading').at(-1).prompt")
assert 'in French (language code "fr")' in prompt and 'write every "text" in French' in prompt, prompt[:300]
print("PASS 7: a bilingual raw source with Grammar's validated sourceLanguage='fr' still produces a FRENCH Practice request/reading, not English", flush=True)
# And the mirror: an English Grammar session stays English even though the same mixed text is present.
result_en = c.js("""(async()=>{ const s = await generatePracticeReading({sourceText:%s, sourceLanguage:'en', targetLanguage:'fr', mode:'verbs', bookId:'t', lemmas:['see','understand']});
    return {status:s.status, language: s.reading && s.reading.language}; })()""" % json.dumps(mixed_raw))
assert result_en['status'] == 'ready' and result_en['language'] == 'en', result_en
print("PASS 7: the mirror case (sourceLanguage='en') stays English -- Practice always follows the language Grammar validated, never a fresh guess", flush=True)

# =====================================================================================================================
print("\n=== SECTION 8: state machine + the ready-tab indicator (idle/loading/ready/error), localized label ===")
close_ui()
check("8: idle -- no session, the collapsed tab is not shown", "document.getElementById('practice-restore')===null || document.getElementById('practice-restore').hidden===true")
select_between(FR[0], EN[-1])
press_grammar()
c.js("switchGrammarMode('verbs')")   # mode persists across selections; Section 5 left it on Adjectifs
install_grammar_and_practice(delay_ms=400)
click_practice_btn()
c.js("setPracticeWorkspaceMode('bookmark')")
check("8: loading -- the collapsed tab shows the loading state, never ready", "document.getElementById('practice-restore').classList.contains('loading') && !document.getElementById('practice-restore').classList.contains('ready')")
c.wait("getCurrentPracticeSession()?.status==='ready'", timeout=10)
c.js("displayPracticeSession(getCurrentPracticeSession()); setPracticeWorkspaceMode('bookmark')")
check("8: ready -- the collapsed tab shows the ready state (green/accent), matching the session", "document.getElementById('practice-restore').classList.contains('ready') && document.getElementById('practice-restore').dataset.status==='ready'")
label_uk = c.js("document.querySelector('#practice-restore span')?.textContent")
c.js("state.uiLang='fr'; document.getElementById('ui-lang').value='fr'; applyI18n()")
label_fr = c.js("document.querySelector('#practice-restore span')?.textContent")
c.js("state.uiLang='uk'; document.getElementById('ui-lang').value='uk'; applyI18n()")
assert label_uk == 'Практика' and label_fr == 'Pratique', (label_uk, label_fr)
check("8: switching UI language relabels the tab without destroying the ready session", "getCurrentPracticeSession()?.status==='ready'")
print("PASS 8: the Practice tab's label follows the UI language and a language switch never drops the ready session", flush=True)
# error state
c.js("""(()=>{ callAI = async (prompt, signal, task) => { if (task==='practice_reading') throw new Error('boom'); return 'ok'; }; return true; })()""")
c.js("regeneratePracticeReading(practiceContextFromSession(getCurrentPracticeSession())).catch(()=>{})")
c.wait("getCurrentPracticeSession()?.status==='error'", timeout=8)
c.js("displayPracticeSession(getCurrentPracticeSession()); setPracticeWorkspaceMode('bookmark')")
check("8: error -- the collapsed tab shows the error state, never ready", "document.getElementById('practice-restore').classList.contains('error') && !document.getElementById('practice-restore').classList.contains('ready')")
print("PASS 8: loading/ready/error are each distinctly reflected on the collapsed Practice tab, derived from the real session status", flush=True)
install_grammar_and_practice()

# =====================================================================================================================
print("\n=== SECTION 9: storage -- a larger (up to 8+) lemma set still round-trips through the SAME schema ===")
install_grammar_and_practice()
c.js("generatePracticeReading({sourceText:'', sourceLanguage:'fr', targetLanguage:'en', mode:'verbs', bookId:'t', lemmas:%s})" % json.dumps(FR_LEMMAS))
c.wait("getCurrentPracticeSession()?.status==='ready'", timeout=10)
big_id = c.js("getCurrentPracticeSession().id")
restored = c.js("loadPracticeSession(%s)" % json.dumps(big_id))
assert restored and restored['schema'] == 2 and sorted(restored['lemmas']) == sorted(FR_LEMMAS), restored
print("PASS 9: a valid current-schema session with all 8 lemmas restores intact (the raised lemma cap did not affect schema validity)", flush=True)
# The retired worksheet's schema (or any corrupt/foreign payload) using the SAME storage key must still be refused
c.js("localStorage.setItem('practice_session:legacy1', JSON.stringify({id:'legacy1', status:'ready', exercises:[{id:'ex1'}], answers:{}, hints:{}}))")
c.js("localStorage.setItem('practice_session:corrupt1', 'not even json{{{')")
assert c.js("loadPracticeSession('legacy1')") is None, 'a legacy worksheet-schema session must be refused, not restored'
assert c.js("loadPracticeSession('corrupt1')") is None, 'corrupt JSON must be refused, not crash the loader'
print("PASS 9: the old worksheet schema and a corrupt payload under the same storage keys are both rejected, never restored", flush=True)
c.js("deletePracticeSession(%s)" % json.dumps(big_id))

print("\nALL PRACTICE ALLOCATION / BUTTON / COVERAGE CHECKS PASSED")
