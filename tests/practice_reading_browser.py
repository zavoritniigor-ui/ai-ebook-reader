"""Practice is a READING / EXAMPLES surface -- acceptance through the real UI.

The learner selects text in a French book (here even a textbook EXERCISE line, "Ils (plaindre) la pauvre
femme."), opens Grammar -> Practice, and must get natural example sentences + connected paragraphs with
clickable highlighted target forms -- and NOTHING to solve: no blanks, numbering, hints, questions, inputs,
answers, check/submit buttons or grading. Clicking a target focuses the EXACT occurrence in the (unchanged)
right-hand Grammar panel with data already in hand, i.e. zero further AI calls.

No live AI is available to CI: every model reply is a hand-authored GOLD reply (tests/practice_fixtures.py).
Only the network entry point is stubbed; the book is opened through openBookFile and every interaction is a
real mouse / touch event.

Sections: 1 content + absence of exercise UI (A-D)   2 highlighting + clickability (E-G)
          3 exact occurrence, zero AI calls, repeated forms (H-J)   4 verbs/adjectives isolation, regenerate keeps
          the session (K)   5 no path back to the old worksheet: source, modes, providers (L)
          6 legacy storage / reload / service worker (M)   7 Grammar unchanged (N)   8 touch-sized layout
"""
import base64, json, os, re, time
from browser_cdp import CDP
import practice_fixtures as PF

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable'); c.call('Network.setBypassServiceWorker', bypass=True)

SENT = 'Ils (plaindre) la pauvre femme.'
BOOK = "# Exercices de grammaire\n\nElle (craindre) de profonds changements.\n\n" + SENT + "\n\nLa petite fille est heureuse.\n"
ANALYSIS = json.dumps(dict(language='fr', items=[
    dict(pos='verb', lemma='plaindre', surface='plaindre', sentence=SENT, occurrence=1, agreesWith='Ils', features=dict(mood='infinitif'),
         explanation="Infinitive given in parentheses: the verb to conjugate.", stemBreakdown=None, forms=None),
    dict(pos='adjective', lemma='pauvre', surface='pauvre', sentence=SENT, occurrence=1, agreesWith='femme',
         features=dict(gender='féminin', number='singulier'), explanation="Describes 'femme'.", stemBreakdown=None, forms=None)]), ensure_ascii=False)
# The canned Practice reading for Adjectives mode must actually cover the requested lemma ('pauvre', the
# one adjective ANALYSIS above ever detects) -- not just demonstrate an unrelated stock set -- now that
# validatePracticeReading checks requested-lemma coverage (js/practice-session.js); the ORIGINAL sentence
# is reused so the target's surface is a real occurrence in what was actually analysed.
ADJECTIVES_FR_WITH_PAUVRE = PF.reading('Pauvre, petit, heureux et beau en contexte', 'adjectives',
    PF.section('pauvre', 'examples',
        # A fresh example sentence -- NOT the book's own exercise line (SENT, "Ils (plaindre) ..."):
        # reusing that would be correctly dropped as an exercise artifact by practiceLooksLikeExercise,
        # exactly like a real reply must never quote the book's exercise.
        PF.item("Cette pauvre femme a perdu son emploi la semaine dernière.",
                PF.tgt('pauvre', 'pauvre', "Describes 'femme': feminine singular.", gender='féminin', number='singulier'))),
    *PF.ADJECTIVES_FR['sections'])


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1)
        result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def boot(width, height, mobile=False):
    """Fresh page, French book opened through openBookFile, Learning mode on (real button), only callAI stubbed."""
    c.call('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=1, mobile=mobile)
    if mobile:
        c.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
    c.call('Page.navigate', url=URL)
    c.wait("document.readyState==='complete' && !document.body.inert")
    c.js("localStorage.clear();showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove()")
    c.call('Page.reload')
    c.wait("document.readyState==='complete' && !document.body.inert && typeof validatePracticeReading==='function'")
    b64 = base64.b64encode(BOOK.encode()).decode()
    c.js("openBookFile(new File([Uint8Array.from(atob(%s),ch=>ch.charCodeAt(0))],'exercices.md',{lastModified:%d}))" % (json.dumps(b64), int(time.time())))
    c.wait("els.pages.textContent.includes('Exercices de grammaire')", timeout=20)
    time.sleep(0.8)
    if not c.js('state.translateMode'):
        c.js('els.translateBtn.click()'); time.sleep(0.3)
    c.js("state.targetLang='en'")
    install_mocks()


def install_mocks(verb=PF.VERBS_FR, adj=ADJECTIVES_FR_WITH_PAUVRE):
    c.js("""(()=>{ window.__realCallAI = window.__realCallAI || callAI; aiAvailable=()=>true; showToast=()=>{}; window.__calls=[]; window.__analysis=%s; window.__verbReading=%s; window.__adjReading=%s;
        window.__delay=0;
        callAI=async (prompt, signal, task)=>{ __calls.push({task, prompt});
            if (task==='grammar_analysis') return __analysis;
            if (task==='grammar_paradigm') return JSON.stringify({forms:{}});
            if (task==='practice_reading') { if (__delay) await new Promise(r=>setTimeout(r,__delay)); return /Targets to demonstrate \\(adjectives\\)/.test(prompt) ? __adjReading : __verbReading; }
            return 'ok'; };
        return true; })()""" % (json.dumps(ANALYSIS), json.dumps(PF.to_json(verb)), json.dumps(PF.to_json(adj))))


def mouse_click(x, y):
    for kind in ('mousePressed', 'mouseReleased'):
        c.call('Input.dispatchMouseEvent', type=kind, x=x, y=y, button='left', clickCount=1)


def center(selector, index=0):
    return c.js("""(()=>{const e=document.querySelectorAll(%s)[%d]; if(!e) return null; const b=e.getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2,w:b.width,h:b.height}})()""" % (json.dumps(selector), index))


def click(selector, index=0):
    """A real mouse click -- after scrolling the element into view, as a user would (the Retry/Regenerate row is at the bottom of a long reading)."""
    c.js("document.querySelectorAll(%s)[%d]?.scrollIntoView({block:'center'})" % (json.dumps(selector), index)); time.sleep(0.15)
    pos = center(selector, index)
    assert pos and pos['w'] > 0, ('not visible', selector, pos)
    mouse_click(pos['x'], pos['y'])


def word_pos(word):
    return c.js(r"""(()=>{ const w=%s; const walker=document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT); let n;
        while((n=walker.nextNode())){ const i=n.nodeValue.indexOf(w); if(i!==-1){ const r=document.createRange(); r.setStart(n,i); r.setEnd(n,i+w.length); const b=r.getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2}; } } return null; })()""" % json.dumps(word))


def open_practice(mode='verbs', touch=False):
    """Real flow: tap the word -> tooltip Grammar button -> Grammar drawer -> (Adjectifs) -> Practice button."""
    c.js("document.getElementById('practice-panel') && (document.getElementById('practice-panel').hidden=true); closePracticeSession(); els.grammarPanel.classList.remove('expanded'); els.tooltip.style.display='none'")
    time.sleep(0.5)
    pos = word_pos('plaindre')
    mouse_click(pos['x'], pos['y'])
    c.wait("els.tooltip.style.display==='flex'", timeout=8)
    click('#tt-ai-btn')
    c.wait("els.grammarPanel.classList.contains('ready')", timeout=8)
    if not c.js("els.grammarPanel.classList.contains('expanded')"):
        click('#grammar-tab'); time.sleep(0.5)
    if mode == 'adjectives':
        click('#grammar-mode-adjectives'); time.sleep(0.3)
    n = c.js("__calls.length")
    click('.grammar-practice-btn')
    c.wait("document.querySelectorAll('#practice-panel .practice-target').length>0", timeout=12)
    time.sleep(0.5)
    return c.js("__calls.slice(%d)" % n)


def practice_text():
    return c.js("document.getElementById('practice-panel').innerText")


# =====================================================================================================
print("\n=== SECTION 1: Practice = natural example sentences, no exercise UI (A, B, C, D) ===")
boot(1000, 1100)
calls = open_practice('verbs')
gen = [x for x in calls if x['task'] == 'practice_reading']
assert len(gen) == 1, [x['task'] for x in calls]
PROMPT = gen[0]['prompt']

# A. complete natural sentences and connected paragraphs, in quantity
# .practice-sentence-text (not the row itself) -- the row also holds the new sentence-level
# [listen]/[translate] actions (task: sentence-level learning actions), which must not count as reading text.
sentences = c.js("[...document.querySelectorAll('#practice-panel .practice-sentence .practice-sentence-text')].map(p=>p.textContent)")
paras = c.js("[...document.querySelectorAll('#practice-panel .practice-paragraph .practice-sentence-text')].map(p=>p.textContent)")
assert len(sentences) >= 14 and len(paras) >= 2, (len(sentences), len(paras))
assert all(re.search(r"[.!?]$", s.strip()) and len(s.split()) >= 5 and s.strip()[0].isupper() for s in sentences), [s for s in sentences if not re.search(r"[.!?]$", s.strip())]
assert sum(len(x) for x in sentences + paras) > 1000, sum(len(x) for x in sentences + paras)
for wanted in ["Nous parlons français tous les jours.", "Hier, nous avons parlé avec notre professeur.",
               "Quand j'étais enfant, je parlais souvent avec ma grand-mère.", "Demain, je parlerai avec le directeur de l'école."]:
    assert wanted in sentences, wanted
print("PASS A: %d complete example sentences + %d connected paragraphs (%d characters): several minutes of reading, incl. parlons / avons parlé / parlais / parlerai" % (len(sentences), len(paras), sum(len(x) for x in sentences + paras)), flush=True)
heads = c.js("[...document.querySelectorAll('#practice-panel .practice-section-title')].map(h=>h.textContent)")
assert heads == ['parler', 'plaindre'], heads
check("A: the sections are per practised word (a quiet heading each), then the connected paragraphs",
      "[...document.querySelectorAll('#practice-panel .practice-section')].map(s=>s.className.replace('practice-section ','')).join()==='practice-section-examples,practice-section-examples,practice-section-story'")
assert 'in French (language code "fr")' in PROMPT and 'Targets to demonstrate (verbs)' in PROMPT
assert 'never in the explanation language' in PROMPT
print("PASS A: the reading is requested in the STUDIED language (French), not the interface/explanation language", flush=True)

# The selected book text is an EXERCISE: it must be neither sent to the model nor reproduced
assert 'Ils (plaindre)' not in PROMPT and 'deliberately not shown' in PROMPT, PROMPT[:900]
print("PASS B: the selected textbook exercise is withheld from the model (never quoted), so it cannot be imitated", flush=True)

# B. no fill-in-the-blank exercise anywhere on the left side
text = practice_text()
assert not re.search(r"_{2,}|\.{3,}|…|\[\s*\.\.\.\s*\]", text), 'blank marks in the reading'
assert not re.search(r"\(\s*[A-Za-zÀ-ÿ' ]{2,25}\s*\)", "\n".join(sentences + paras)), 'a parenthesised cue word in the reading'
assert not re.search(r"(?m)^\s*(?:\d{1,3}[.)]|[a-z]\))\s", text), 'numbered / lettered items'
assert 'Ils (plaindre)' not in text and 'craindre' not in text
print("PASS B: no blanks, underscores, cue-verbs in parentheses, numbering, or the book's own exercise on the reading surface", flush=True)
for s_ in sentences + paras:
    assert not c.js("practiceLooksLikeExercise(%s,'fr')" % json.dumps(s_, ensure_ascii=False)), s_
print("PASS B: every displayed sentence/paragraph passes the exercise-artifact detector", flush=True)

# B. the validator itself drops exercise artifacts a model might still emit (the selection was a book exercise)
BAD_ITEMS = [
    PF.item('Ils ____ la pauvre femme.', PF.tgt('plaignent', 'plaindre', 'blank')),                     # underscore blank
    PF.item('3. Ils plaignent la pauvre femme.', PF.tgt('plaignent', 'plaindre', 'numbered')),          # numbered item
    PF.item('Ils (plaindre) la pauvre femme.', PF.tgt('plaindre', 'plaindre', 'cue verb in parentheses')),  # the book's own exercise
    PF.item('La muraille (ceindre) la ville de tous les côtés.'),                                        # cue after a noun subject
    PF.item('Elle ..... à la banque tous les matins.'),                                                  # dotted blank
    PF.item('Je parle.'), PF.item('Tu parles.'),                                                         # one-line conjugation drill
]
GOOD_BASE = PF.VERBS_FR['sections']
mixed = PF.reading('Mixed', 'verbs', PF.section('plaindre', 'examples', *BAD_ITEMS, *GOOD_BASE[1]['items']), GOOD_BASE[0], GOOD_BASE[2])
v = c.js("validatePracticeReading(%s, {language:'fr', mode:'verbs'})" % PF.to_json(mixed))
bad_texts = [i['text'] for i in BAD_ITEMS]
assert not any(t in v['paragraphs'] for t in bad_texts), [t for t in bad_texts if t in v['paragraphs']]
assert len(v['paragraphs']) == sum(len(x['items']) for x in GOOD_BASE), len(v['paragraphs'])
assert not any(t['surface'] in ('plaignent', 'plaindre') and v['paragraphs'][t['paragraphIndex']] in bad_texts for t in v['targets'])
print("PASS B: blanks, numbered items, the parenthesised-cue exercise ('Ils (plaindre)…', 'La muraille (ceindre)…'), dotted blanks and one-line drills are DROPPED by the validator (with their targets)", flush=True)
only_exercises = PF.reading('Ex', 'verbs', PF.section('plaindre', 'examples', *BAD_ITEMS[:5], *[PF.item('Elle ____ tout le temps et personne ne le voit vraiment.') for _ in range(6)]))
err = c.js("(()=>{ try { validatePracticeReading(%s,{language:'fr',mode:'verbs'}); return 'accepted'; } catch(e){ return e.message } })()" % PF.to_json(only_exercises))
assert err != 'accepted' and 'exercises' in err, err
print("PASS B: a reply that is mostly exercises is rejected outright (retryable error), not shown with holes: %r" % err, flush=True)
assert c.js("practiceLooksLikeExercise('Nous plaignons les enfants qui doivent travailler si jeunes.', 'fr')") is False
assert c.js("practiceLooksLikeExercise('Le père (father) parle avec le professeur (teacher).', 'fr')") is False, 'a genuine gloss in parentheses is not an exercise cue'
print("PASS B: complete natural sentences (and genuine bilingual glosses) are never mistaken for exercises", flush=True)

# C. no hints
check("C: no hint button / hint element of any kind",
      "document.querySelectorAll('#practice-panel [class*=hint i], #practice-panel [id*=hint i], #practice-panel [aria-label*=hint i], #practice-panel [title*=hint i]').length===0 && !/hint|indice|підказ|подсказ/i.test(document.getElementById('practice-panel').innerText)")

# D. no quiz / answer / submit / grading UI
check("D: no input, textarea, select, contenteditable, form or radio/checkbox anywhere in Practice",
      "document.querySelectorAll('#practice-panel input, #practice-panel textarea, #practice-panel select, #practice-panel form, #practice-panel [contenteditable], #practice-panel [role=radio], #practice-panel [role=checkbox], #practice-panel [role=textbox]').length===0")
check("D: no answer / check / submit / score / grade / correct / quiz / exercise element (class, id or role)",
      "document.querySelectorAll('#practice-panel [class*=answer i], #practice-panel [id*=answer i], #practice-panel [class*=check i], #practice-panel [id*=check i], #practice-panel [class*=submit i], #practice-panel [class*=score i], #practice-panel [class*=grade i], #practice-panel [class*=correct i], #practice-panel [class*=quiz i], #practice-panel [class*=exercise i], #practice-panel [class*=feedback i]').length===0")
check("D: every button is a target form, a sentence-level listen/translate action, a workspace control, or Retry/Regenerate -- nothing to submit",
      "[...document.querySelectorAll('#practice-panel button')].every(b=>b.classList.contains('practice-target')||b.classList.contains('practice-action-btn')||['practice-close','practice-collapse','practice-bookmark','practice-retry','practice-regenerate'].includes(b.id))")
assert not re.search(r"(?i)\b(choose|complete|fill in|check|submit|score|correct answer|choisissez|complétez|vérifier|виберіть|заповніть|перевір|выберите)\b", text), text[:400]
print("PASS D: no quiz instruction text (choose / complete / fill in / check / submit / score) anywhere in the panel", flush=True)
if os.environ.get('PRACTICE_SHOT_DIR'):   # optional: keep a screenshot for manual review
    open(os.environ['PRACTICE_SHOT_DIR'] + '/practice_reading_desktop.png', 'wb').write(base64.b64decode(c.call('Page.captureScreenshot', format='png')['data']))

# =====================================================================================================
print("\n=== SECTION 2: verb / adjective targets highlighted and clickable (E, F, G) ===")
N_VERB_TARGETS = sum(len(i['targets']) for sec in PF.VERBS_FR['sections'] for i in sec['items'])
check("E: every verb target occurrence is a highlighted <button class=practice-target-verb> (%d of them)" % N_VERB_TARGETS,
      "document.querySelectorAll('#practice-panel .practice-target-verb').length===%d && document.querySelectorAll('#practice-panel .practice-target').length===%d && document.querySelectorAll('#practice-panel .practice-target-adjective').length===0" % (N_VERB_TARGETS, N_VERB_TARGETS))
style = c.js("""(()=>{const t=document.querySelector('#practice-panel .practice-target'), p=document.querySelector('#practice-panel .practice-sentence');
    const a=getComputedStyle(t), b=getComputedStyle(p); return {tw:+a.fontWeight, pw:+b.fontWeight, bb:a.borderBottomStyle, bbw:parseFloat(a.borderBottomWidth), cur:a.cursor, tag:t.tagName, type:t.type, fs:a.fontSize, pfs:b.fontSize, tab:t.tabIndex}})()""")
assert style['tw'] >= 600 > style['pw'] and style['bb'] == 'solid' and style['bbw'] >= 1 and style['cur'] == 'pointer' and style['tag'] == 'BUTTON' and style['type'] == 'button' and style['tab'] >= 0, style
assert style['fs'] == style['pfs'], 'the highlight must not change the text size (no visual noise)'
print("PASS E: a target is bold + underlined (subtle, same size), a real keyboard-reachable button with a pointer cursor:", style, flush=True)
check("E: the highlight is subtle -- targets are a minority of the words on the page (not everything is marked)",
      "(()=>{const words=document.getElementById('practice-panel').innerText.split(/\\s+/).length; return document.querySelectorAll('#practice-panel .practice-target').length/words < 0.25})()")
check("E: each highlighted word is exactly the target's own form (no neighbouring words swallowed)",
      "[...document.querySelectorAll('#practice-panel .practice-target')].every((b,i)=>b.textContent===getCurrentPracticeSession().reading.targets[i].surface)")

# G. EVERY highlighted occurrence is clickable and focuses ITS form -- with zero AI calls
c.js("window.__n0=__calls.length")
bad = c.js("""(()=>{ const bad=[]; const targets=getCurrentPracticeSession().reading.targets;
    [...document.querySelectorAll('#practice-panel .practice-target')].forEach((b,i)=>{ b.click();
        const f=grammarContext.focused, d=document.querySelector('#grammar-content .grammar-focus');
        const ok = f && f.surface===b.textContent && f.lemma===targets[i].lemma && f.pos==='verb' && d && d.querySelector('.grammar-context-target')?.textContent===b.textContent;
        if(!ok) bad.push([i,b.textContent]); });
    return bad; })()""")
assert bad == [], bad
assert c.js("__calls.length - __n0") == 0
print("PASS G: all %d highlighted occurrences are clickable, each focusing its own form in Grammar, with ZERO AI calls in total" % N_VERB_TARGETS, flush=True)

# =====================================================================================================
print("\n=== SECTION 3: exact occurrence, repeated identical forms, zero AI calls (H, I, J) ===")
SENT_PARLE = 'Elle parle vite, mais son frère parle encore plus vite.'


def focus_after_real_click(sentence, surface, nth=0):
    """Real mouse click on the nth highlighted `surface` inside the Practice sentence `sentence`."""
    idx = c.js("""(()=>{const ps=[...document.querySelectorAll('#practice-panel .practice-sentence, #practice-panel .practice-paragraph')]; const p=ps.find(x=>x.querySelector('.practice-sentence-text').textContent===%s) || ps.find(x=>x.querySelector('.practice-sentence-text').textContent.includes(%s)); if(!p) return null;
        const bs=[...p.querySelectorAll('.practice-target')].filter(b=>b.textContent===%s); return bs.length? [ps.indexOf(p), bs.length] : null})()""" % (json.dumps(sentence, ensure_ascii=False), json.dumps(sentence, ensure_ascii=False), json.dumps(surface, ensure_ascii=False)))
    assert idx, (sentence, surface)
    pos = c.js("""(()=>{const ps=[...document.querySelectorAll('#practice-panel .practice-sentence, #practice-panel .practice-paragraph')]; const b=[...ps[%d].querySelectorAll('.practice-target')].filter(b=>b.textContent===%s)[%d]; b.scrollIntoView({block:'center'});
        const r=b.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2}})()""" % (idx[0], json.dumps(surface, ensure_ascii=False), nth))
    time.sleep(0.2)
    pos = c.js("""(()=>{const ps=[...document.querySelectorAll('#practice-panel .practice-sentence, #practice-panel .practice-paragraph')]; const b=[...ps[%d].querySelectorAll('.practice-target')].filter(b=>b.textContent===%s)[%d]; const r=b.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2}})()""" % (idx[0], json.dumps(surface, ensure_ascii=False), nth))
    mouse_click(pos['x'], pos['y'])
    time.sleep(0.25)
    return c.js("""(()=>{const d=document.querySelector('#grammar-content .grammar-focus'), m=d && d.querySelector('.grammar-context-target');
        return d ? {surface:grammarContext.focused.surface, start:grammarContext.focused.start, before:m.previousSibling?m.previousSibling.textContent:'', after:m.nextSibling?m.nextSibling.textContent:'',
                    sentence:d.querySelector('.grammar-focus-context').textContent, why:d.querySelector('.grammar-focus-why')?.textContent||'', pos:d.dataset.pos,
                    cards:document.querySelectorAll('#grammar-content > .grammar-card').length} : null})()""")


c.js("window.__n1=__calls.length")
first = focus_after_real_click(SENT_PARLE, 'parle', 0)
second = focus_after_real_click(SENT_PARLE, 'parle', 1)
assert first['sentence'] == second['sentence'] == SENT_PARLE
assert first['start'] == SENT_PARLE.index('parle') and second['start'] == SENT_PARLE.rindex('parle'), (first, second)
assert first['before'].endswith('Elle ') and second['before'].endswith('son frère '), (first['before'], second['before'])
assert "'elle'" in first['why'] and "'son frère'" in second['why'], (first['why'], second['why'])
print("PASS J: two identical 'parle' in ONE sentence: a real click on each focuses ITS OWN occurrence (offset %d vs %d, its own explanation)" % (first['start'], second['start']), flush=True)
one = focus_after_real_click("Quand j'étais enfant, je parlais souvent avec ma grand-mère.", 'parlais')
two = focus_after_real_click('Si tu parlais plus lentement, tout le monde te comprendrait.', 'parlais')
assert one['sentence'].startswith("Quand j'étais enfant") and two['sentence'].startswith('Si tu parlais') and one['surface'] == two['surface'] == 'parlais'
assert 'habit' in one['why'] and 'hypothetical' in two['why'], (one['why'], two['why'])
print("PASS J: the same form 'parlais' in two different sentences resolves to the sentence that was clicked (own context + own explanation)", flush=True)
avons = focus_after_real_click('Hier, nous avons parlé avec notre professeur.', 'avons parlé')
assert avons['surface'] == 'avons parlé' and avons['sentence'] == 'Hier, nous avons parlé avec notre professeur.' and 'Passé composé' in avons['why']
print("PASS H: clicking the compound form 'avons parlé' focuses the whole group with its contextual explanation", flush=True)
assert c.js("__calls.length - __n1") == 0
print("PASS I: every one of those clicks was answered from data already in hand: ZERO AI calls", flush=True)
check("H: the badges shown are that occurrence's own features (tense from the Practice target's data)",
      "[...document.querySelectorAll('#grammar-content .grammar-badge')].some(b=>b.textContent==='passé composé') && [...document.querySelectorAll('#grammar-content .grammar-badge')].some(b=>b.textContent==='auxiliaire: avoir')")
assert first['cards'] == 0 and avons['cards'] == 0
print("PASS H: no unrelated book-selection lemma cards sit above a Practice focus", flush=True)
check("Practice stays open while Grammar shows the clicked form", "!document.getElementById('practice-panel').hidden && els.grammarPanel.classList.contains('expanded')")

# =====================================================================================================
print("\n=== SECTION 4: Verbs and Adjectives stay isolated; Regenerate/Retry keep the session (K) ===")
sess = c.js("getCurrentPracticeSession()")
assert sess['mode'] == 'verbs' and sess['lemmas'] == ['plaindre'] and sess['schema'] == 2 and sess['seenForms'] == [{'surface': 'plaindre', 'lemma': 'plaindre'}], sess
print("PASS K: the verbs session remembers its mode + lemmas (%s)" % sess['lemmas'], flush=True)
# switching the Grammar mode while a Verbs Practice is open does not touch (or convert) that session
c.js("switchGrammarMode('adjectives')")
assert c.js("getCurrentPracticeSession().mode") == 'verbs' and c.js("document.querySelectorAll('#practice-panel .practice-target-adjective').length") == 0
check("K: switching Grammar to Adjectifs leaves the open Verbs reading exactly as it was (still only verb targets)",
      "document.querySelectorAll('#practice-panel .practice-target-verb').length===%d && document.querySelectorAll('#grammar-controls-bar button').length===0" % N_VERB_TARGETS)

calls = open_practice('adjectives')
gen = [x for x in calls if x['task'] == 'practice_reading']
assert len(gen) == 1 and 'Targets to demonstrate (adjectives)' in gen[0]['prompt']
AP = gen[0]['prompt']
assert 'agreeing with DIFFERENT nouns' in AP and 'masculin singulier' in AP and 'féminin pluriel' in AP
assert 'Présent' not in AP and 'Imparfait' not in AP and 'tenses' not in AP.split('Structure ("sections"):')[1].split('Absolutely forbidden')[0], 'an adjective session must not mention tenses'
print("PASS F/K: the adjectives request demonstrates gender/number agreement with different nouns and mentions NO tenses", flush=True)
sess = c.js("getCurrentPracticeSession()")
assert sess['mode'] == 'adjectives' and sess['lemmas'] == ['pauvre']
N_ADJ = sum(len(i['targets']) for sec in ADJECTIVES_FR_WITH_PAUVRE['sections'] for i in sec['items'])
check("F: adjective targets are highlighted and clickable (%d), and there is not a single verb target" % N_ADJ,
      "document.querySelectorAll('#practice-panel .practice-target-adjective').length===%d && document.querySelectorAll('#practice-panel .practice-target-verb').length===0 && document.querySelectorAll('#practice-panel .practice-target').length===%d" % (N_ADJ, N_ADJ))
check("F: adjective headings are per adjective (petit / heureux / beau)",
      "[...document.querySelectorAll('#practice-panel .practice-section-title')].map(h=>h.textContent).join()==='pauvre,petit,heureux,beau'")
sent = "Elle habite dans une petite maison près de la mer."
f = focus_after_real_click(sent, 'petite')
assert f['pos'] == 'adjective' and f['sentence'] == sent and f['cards'] == 0 and 'maison' in f['why'], f
check("F/K: clicking an adjective target focuses it in ADJECTIVES mode: no tense controls, agreement grid shown, no verb card",
      "grammarContext.mode==='adjectives' && document.querySelectorAll('#grammar-controls-bar button').length===0 && document.querySelectorAll('#grammar-content .grammar-grid-row').length===4 && document.querySelectorAll('#grammar-content .grammar-grid-row.current').length===1 && document.getElementById('grammar-mode-adjectives').classList.contains('active')")
print("PASS F: an adjective Practice click behaves as an adjective everywhere (mode, grid, no tenses)", flush=True)

# Regenerate must produce the SAME kind of reading (this used to silently turn Adjectives into a generic Verbs reading)
c.js("window.__n2=__calls.length")
click('#practice-regenerate')
c.wait("__calls.length>__n2 && getCurrentPracticeSession()?.status==='ready'", timeout=10)
regen = [x for x in c.js("__calls.slice(__n2)") if x['task'] == 'practice_reading'][0]['prompt']
assert 'Targets to demonstrate (adjectives)' in regen and '"pauvre"' in regen, regen[:600]
sess2 = c.js("getCurrentPracticeSession()")
assert sess2['mode'] == 'adjectives' and sess2['lemmas'] == ['pauvre'] and sess2['id'] != sess['id']
print("PASS K: Regenerate re-creates an ADJECTIVES reading for the same lemmas (mode and lemmas are kept on the session)", flush=True)
# Retry after a failure keeps them too
c.js("window.__fail=true; window.__origCall=callAI; callAI=async (p,s,t)=>{ if(t==='practice_reading' && __fail){ throw new Error('boom'); } return __origCall(p,s,t); };")
click('#practice-regenerate')
c.wait("getCurrentPracticeSession()?.status==='error'", timeout=8)
check("a failed generation shows a clear error with Retry -- never a stale or empty panel",
      "!!document.querySelector('#practice-panel #practice-retry') && /boom/.test(document.getElementById('practice-panel').innerText) && document.querySelectorAll('#practice-panel .practice-target').length===0")
c.js("__fail=false")
c.js("window.__n3=__calls.length")
click('#practice-retry')
c.wait("getCurrentPracticeSession()?.status==='ready'", timeout=10)
rp = [x for x in c.js("__calls.slice(__n3)") if x['task'] == 'practice_reading'][0]['prompt']
assert 'Targets to demonstrate (adjectives)' in rp and c.js("getCurrentPracticeSession().mode") == 'adjectives' and c.js("getCurrentPracticeSession().lemmas") == ['pauvre']
print("PASS K: Retry after an error also keeps the adjectives mode and the lemmas", flush=True)
c.js("callAI=__origCall")

# the header controls must really be clickable: the floating menu handle used to sit on top of the Close button
CONTROLS_REACHABLE = "['practice-close','practice-collapse','practice-bookmark'].every(id=>{const b=document.getElementById(id); if(!b) return false; const r=b.getBoundingClientRect(); const e=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2); return e===b||b.contains(e)})"
check("UI: Close / collapse / bookmark are not covered by the floating menu handle (the Close button used to be unclickable)", CONTROLS_REACHABLE)
click('#practice-close'); time.sleep(0.3)
check("UI: a real click on Close closes Practice and drops the session", "document.getElementById('practice-panel').hidden===true && getCurrentPracticeSession()===null")

# =====================================================================================================
print("\n=== SECTION 5: no path back to the exercise worksheet (L) ===")
import urllib.request
base = URL.rsplit('/', 1)[0]
FORBIDDEN = re.compile(r"expectedAnswer|revealHint|checkAnswer|submitAnswer|answer-input|answer-check|hint-reveal|exercise-hints|renderExercise|MAX_EXERCISES|fill_form|multiple_choice|practice-hint|practicePagination|currentPage|Check with AI|\.exercises\b", re.I)
for f_ in ['js/practice-session.js', 'js/practice-worksheet.js']:
    src = urllib.request.urlopen(base + '/' + f_).read().decode()
    hits = sorted(set(FORBIDDEN.findall(src)))
    assert not hits, (f_, hits)
print("PASS L: the shipped Practice scripts contain no exercise / hint / answer / grading identifiers at all (removed, not hidden)", flush=True)
html = urllib.request.urlopen(URL).read().decode()
assert not re.search(r'practice[-_](?:hint|answer|exercise|check|quiz)', html, re.I) and 'class="exercise' not in html
core = urllib.request.urlopen(base + '/js/core.js').read().decode()
assert not re.search(r"practiceExercises|practiceCheck|practicePrevious|practiceNext|practicePage|practiceComingSoon", core)
print("PASS L: index.html has no exercise markup and core.js no exercise-era strings", flush=True)
check("L: the old worksheet functions do not exist in the running app",
      "['renderPracticeWorksheet','displayPracticeWorksheet','renderExercise','revealHint','checkAnswer','submitAnswer','generatePracticeWorksheet','showPracticeHints','gradePractice'].every(n=>typeof window[n]==='undefined')")
# cycling modes / open / close / regenerate can never bring an exercise renderer or control back
for mode in ['verbs', 'adjectives', 'verbs']:
    open_practice(mode)
    check("L: after opening Practice from %s the panel has no input/hint/answer/check control" % mode,
          "document.querySelectorAll('#practice-panel input, #practice-panel textarea, #practice-panel select, #practice-panel [class*=hint i], #practice-panel [class*=answer i], #practice-panel [class*=check i], #practice-panel [class*=exercise i]').length===0 && document.querySelectorAll('#practice-panel .practice-target').length>0")
    c.js("switchGrammarMode(%s)" % json.dumps('adjectives' if mode == 'verbs' else 'verbs'))
print("PASS L: opening from Verbs / Adjectives / Verbs and switching the Grammar mode in between never produces an exercise UI", flush=True)

# Every AI provider path builds the same reading request (no provider-specific exercise generator) and parses the same contract
c.js("callAI=__realCallAI; state.activeAiProvider='gemini'")
FETCHED = c.js("""(()=>{ window.__fetches=[]; window.__realFetch=window.__realFetch||window.fetch;
    const reading=%s;
    window.fetch=async (url, opts)=>{ const u=String(url); const body=opts&&opts.body?JSON.parse(opts.body):null; __fetches.push({url:u, body, timeout:null});
        if (/generativelanguage/.test(u)) return new Response(JSON.stringify({candidates:[{content:{parts:[{text:reading}]}}]}),{status:200});
        if (/groq/.test(u)) return new Response(JSON.stringify({choices:[{message:{content:reading}}]}),{status:200});
        if (/openai/.test(u)) return new Response(JSON.stringify({status:'completed', output:[{type:'message', role:'assistant', content:[{type:'output_text', text:reading}]}]}),{status:200});
        return window.__realFetch(url, opts); };
    return true; })()""" % json.dumps(PF.to_json(PF.VERBS_FR)))
for provider, key_field in [('gemini', 'apiKey'), ('groq', 'groqKey'), ('openai', 'openaiKey')]:
    c.js("state.%s='test-key-%s'; state.activeAiProvider=%s; window.__fetches.length=0" % (key_field, provider, json.dumps(provider)))
    c.js("window.__prov=generatePracticeReading({sourceText:'', sourceLanguage:'fr', targetLanguage:'en', mode:'verbs', bookId:'t', lemmas:['parler','plaindre']}).catch(e=>({error:e.message}))")
    check("provider %s: the same reading request is sent and the sectioned reply is parsed and accepted" % provider,
          "getCurrentPracticeSession()?.status==='ready' && getCurrentPracticeSession().reading.sections.length===3", timeout=10)
    body = json.dumps(c.js("__fetches[0].body"))
    assert 'READING MATERIAL' in body and 'NOT a quiz' in body and 'Targets to demonstrate (verbs)' in body, provider
    assert not re.search(r"expectedAnswer|Choose the correct|fill_form|multiple_choice", body, re.I), provider
    if provider == 'openai':
        # The output budget is now SIZE-AWARE (js/practice-session.js practiceOutputBudget), scaled from
        # the same allocation the prompt itself was built from, rather than one flat constant for every
        # request -- so the request actually sent must match what that same formula computes for THIS
        # exact lemma list, and it must still be a meaningfully large budget (never a token-starved sliver).
        expected_tokens = c.js("practiceReadingBudget({lemmas:['parler','plaindre']}, ['parler','plaindre']).maxOutputTokens")
        assert expected_tokens >= 4000, expected_tokens
        assert c.js("__fetches[0].body.max_output_tokens") == expected_tokens, (c.js("__fetches[0].body.max_output_tokens"), expected_tokens)
assert c.js("aiTaskTimeout('practice_reading')") >= 120000 and c.js("aiTaskTimeout('translation')") == 45000
print("PASS L: Gemini, Groq and OpenAI all use the SAME single reading prompt and contract; OpenAI gets a large output budget and Practice a %ds timeout" % (c.js("aiTaskTimeout('practice_reading')") // 1000), flush=True)
c.js("window.fetch=window.__realFetch; state.activeAiProvider='gemini'; state.apiKey=''; state.groqKey=''; state.openaiKey=''")

# =====================================================================================================
print("\n=== SECTION 6: legacy storage / reload / service worker cannot bring the old format back (M) ===")
boot(1000, 1100)
LEGACY = """(()=>{
  const now=Date.now();
  // 1) the retired exercise worksheet: same keys, same "ready" status, worksheet shape (exercises/hints/answers/pages)
  localStorage.setItem('practice_session:legacy1', JSON.stringify({id:'legacy1', status:'ready', createdAt:now, sourceLanguage:'fr', targetLanguage:'uk', mode:'verbs', currentPage:0,
      hints:{ex1:2}, answers:{ex1:{answer:'plaint', feedback:'correct'}}, exercises:[{id:'ex1', type:'multiple_choice', question:'Choose the correct verb: Ils ____ la pauvre femme.', options:['plaint','plaignent'], expectedAnswer:'plaignent', hints:['h1','h2']}]}));
  // 2) an earlier reading draft (no schema version)
  localStorage.setItem('practice_session:draft1', JSON.stringify({id:'draft1', status:'ready', createdAt:now, mode:'verbs', reading:{title:'old draft', language:'fr', mode:'verbs', paragraphs:['Un texte assez long pour un ancien brouillon de lecture sans schéma ni sections du tout.'], targets:[]}}));
  // 3) corrupt JSON, 4) an orphan legacy key, 5) a half-finished 'generating' entry, 6) another schema number
  localStorage.setItem('practice_session:corrupt', '{oops');
  localStorage.setItem('practice_hints_ex1', '2');
  localStorage.setItem('practice_session:gen1', JSON.stringify({id:'gen1', schema:2, status:'generating', createdAt:now}));
  localStorage.setItem('practice_session:v3', JSON.stringify({id:'v3', schema:3, status:'ready', createdAt:now, reading:{}}));
  // 7) a VALID current-schema session must survive
  const good=createPracticeSession({sourceLanguage:'fr', targetLanguage:'en', mode:'verbs', lemmas:['parler'], sourceText:'x'});
  good.id='good1'; good.status='ready'; good.reading=validatePracticeReading(%s,{language:'fr',mode:'verbs'}); persistPracticeSession(good);
  localStorage.setItem('practice_session_latest_id','legacy1');
  return Object.keys(localStorage).filter(k=>k.startsWith('practice_')).length; })()""" % PF.to_json(PF.VERBS_FR)
n_seeded = c.js(LEGACY)
assert n_seeded == 8, n_seeded
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof getCurrentPracticeSession==='function'")
keys = sorted(c.js("Object.keys(localStorage).filter(k=>k.startsWith('practice_'))"))
assert keys == ['practice_session:good1'], keys
print("PASS M: after a reload every legacy / corrupt / foreign-schema / half-finished Practice entry (7) and the dangling latest-pointer are purged; only the valid current-schema session remains: %s" % keys, flush=True)
check("M: the dangling 'latest session' pointer to the legacy worksheet was removed, so nothing legacy is restored", "getCurrentPracticeSession()===null && localStorage.getItem('practice_session_latest_id')===null")
check("M: no Practice UI and no exercise text exists after the reload", "document.getElementById('practice-panel')===null || document.getElementById('practice-panel').hidden")
assert 'Choose the correct verb' not in c.js("document.body.innerText") and 'expectedAnswer' not in c.js("JSON.stringify(Object.assign({},localStorage))")
c.js("localStorage.setItem('practice_session_latest_id','good1')")
c.call('Page.reload'); c.wait("document.readyState==='complete' && !document.body.inert && typeof getCurrentPracticeSession==='function'")
check("M: a VALID current-schema session IS restored (in memory) on reload", "getCurrentPracticeSession()?.id==='good1' && getCurrentPracticeSession().status==='ready'")
# the app-level entry points refuse a legacy payload handed to them at runtime, too
c.js("localStorage.setItem('practice_session:legacy2', JSON.stringify({id:'legacy2', status:'ready', createdAt:Date.now(), exercises:[{question:'Choose the correct verb', hints:['x']}]}))")
check("M: loadPracticeSession refuses (and removes) a legacy worksheet session written after startup",
      "loadPracticeSession('legacy2')===null && localStorage.getItem('practice_session:legacy2')===null && restorePracticeSession('legacy2')===null")
c.js("displayPracticeSession({id:'legacy3', status:'ready', createdAt:Date.now(), exercises:[{question:'Choose the correct verb: ____', hints:['h']}], reading:null})")
check("M: displayPracticeSession given a legacy/broken session shows a retryable ERROR -- not exercises, not a blank or stale panel",
      "(()=>{const p=document.getElementById('practice-panel'); return !p.hidden && !!p.querySelector('#practice-retry') && p.querySelectorAll('input,textarea,select,.practice-target,[class*=exercise i]').length===0 && !/Choose the correct|____/.test(p.innerText)})()")
c.js("displayPracticeSession({id:'d', schema:1, status:'ready', createdAt:Date.now(), reading:{title:'draft', language:'fr', paragraphs:['x'], targets:[]}})")
check("M: an earlier-draft reading (no sections / wrong schema) is refused the same way", "!!document.querySelector('#practice-panel #practice-retry') && document.querySelectorAll('#practice-panel .practice-paragraph, #practice-panel .practice-sentence').length===0")

# Service worker / Cache Storage: an OLD shell cache holding an exercise-era script is deleted on activation and never served
c.call('Network.setBypassServiceWorker', bypass=False)
SW = c.js("""(async()=>{
  for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
  for (const k of await caches.keys()) await caches.delete(k);
  const old = await caches.open('ai-reader-shell-0legacyworksheet');
  await old.put(new Request(location.origin + '/js/practice-worksheet.js?v=legacy'), new Response('function renderExercise(){ /* Choose the correct verb ____ */ }', {headers:{'Content-Type':'text/javascript'}}));
  const reg = await navigator.serviceWorker.register('sw.js');
  await navigator.serviceWorker.ready;
  for (let i=0;i<60 && (await caches.keys()).includes('ai-reader-shell-0legacyworksheet');i++) await new Promise(r=>setTimeout(r,100));
  return { keys: await caches.keys() };
})()""")
assert 'ai-reader-shell-0legacyworksheet' not in SW['keys'] and len(SW['keys']) == 1 and SW['keys'][0].startswith('ai-reader-shell-'), SW
print("PASS M: activating the current service worker deleted the OLD shell cache that held an exercise-era script; only the current shell cache remains: %s" % SW['keys'], flush=True)
cur = c.js("""(async()=>{ const idx = await (await fetch('index.html', {cache:'no-store'})).text();
  const m = idx.match(/js\\/practice-worksheet\\.js\\?v=[a-f0-9]+/); const s = idx.match(/js\\/practice-session\\.js\\?v=[a-f0-9]+/);
  const cache = await caches.open((await caches.keys())[0]);
  const precached = (await cache.keys()).map(r=>r.url.replace(location.origin+'/','').replace('./',''));
  const w = await (await fetch(m[0])).text(); const ss = await (await fetch(s[0])).text();
  return {ws:m[0], ss:s[0], inCache: precached.includes(m[0]) && precached.includes(s[0]), worksheetOk: /practice-target/.test(w) && !/Choose the correct|renderExercise/.test(w), sessionOk: /PRACTICE_SCHEMA_VERSION/.test(ss) }; })()""")
assert cur['inCache'] and cur['worksheetOk'] and cur['sessionOk'], cur
print("PASS M: the shell cache pins exactly the Practice scripts index.html references (%s, %s) and what the service worker serves is the reading-only code" % (cur['ws'], cur['ss']), flush=True)
c.js("""(async()=>{ for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); for (const k of await caches.keys()) await caches.delete(k); return true })()""")
c.call('Network.setBypassServiceWorker', bypass=True)

# =====================================================================================================
print("\n=== SECTION 7: the right-hand Grammar panel is unchanged (N) ===")
boot(1000, 1100)
open_practice('verbs')
check("N: Grammar still lists its cards / shows the mode bar in the SOURCE language's terms / has the Practice button",
      "document.getElementById('grammar-mode-verbs').textContent==='Verbes' && document.getElementById('grammar-mode-adjectives').textContent==='Adjectifs' && !!document.querySelector('.grammar-practice-btn')")
c.js("closePracticeSession(); document.getElementById('practice-panel').hidden=true; window.__g0=__calls.filter(x=>x.task==='grammar_analysis').length")
click('#grammar-mode-adjectives'); time.sleep(0.2)
check("N: Verbs <-> Adjectives is immediate (0 AI calls), verb tense chips vanish in Adjectifs and return in Verbes",
      "document.querySelectorAll('#grammar-controls-bar button').length===0 && (()=>{ switchGrammarMode('verbs'); return document.querySelectorAll('#grammar-controls-bar button').length===GRAMMAR_LANG_CONFIG.fr.verb.tenses.length })() && __calls.filter(x=>x.task==='grammar_analysis').length===__g0")
check("N: hasGrammarConfig('pl') is still false -- Polish is intentionally NOT a supported language",
      "hasGrammarConfig('pl')===false && !SUPPORTED_LANGUAGE_CODES.includes('pl')")
print("(the full Grammar behaviour is covered by grammar_redesign_browser.py, grammar_french_browser.py and grammar_language_isolation_browser.py, which all pass unchanged)", flush=True)

# English (the second supported language): the same reading, in English, with English tenses offered to the model
c.js("window.__enReading=%s" % json.dumps(PF.to_json(PF.EN_VERBS)))
EN_PROMPT = c.js("(()=>{ const s=createPracticeSession({sourceLanguage:'en', targetLanguage:'en', mode:'verbs', lemmas:['walk']}); return buildPracticeReadingPrompt(s, s.lemmas, 'English'); })()")
assert 'language code "en"' in EN_PROMPT and 'Present Simple' in EN_PROMPT and 'Past Continuous' in EN_PROMPT and 'write every "text" in English' in EN_PROMPT
en = c.js("validatePracticeReading(JSON.parse(__enReading), {language:'en', mode:'verbs'})")
assert len(en['sections']) == 2 and any(t['surface'] == 'is walking' for t in en['targets'])
print("PASS second language: an English session is prompted with ENGLISH tenses and its multi-word forms ('is walking', 'had walked') are valid targets", flush=True)

# =====================================================================================================
print("\n=== SECTION 8: touch-sized layout (390x800, real touch taps) ===")
boot(390, 800, mobile=True)
pos = word_pos('plaindre')
c.touch_tap(pos['x'], pos['y'])
c.wait("els.tooltip.style.display==='flex'", timeout=8)
p_ai = center('#tt-ai-btn'); c.touch_tap(p_ai['x'], p_ai['y'])
c.wait("els.grammarPanel.classList.contains('ready')", timeout=8)
p_tab = center('#grammar-tab'); c.touch_tap(p_tab['x'], p_tab['y']); time.sleep(0.5)
c.js("document.querySelector('.grammar-practice-btn').scrollIntoView({block:'center'})"); time.sleep(0.3)
p_pr = center('.grammar-practice-btn'); c.touch_tap(p_pr['x'], p_pr['y'])
c.wait("document.querySelectorAll('#practice-panel .practice-target').length>0", timeout=12); time.sleep(0.6)
m = c.js("""(()=>{const p=document.getElementById('practice-panel'), r=p.getBoundingClientRect(), sc=p.querySelector('.practice-reading, .practice-scroll');
    return {left:r.left, right:r.right, top:r.top, bottom:r.bottom, vw:innerWidth, vh:innerHeight, docScroll:document.documentElement.scrollWidth, panelScroll:p.scrollWidth, panelClient:p.clientWidth,
            overflowX:[...p.querySelectorAll('*')].some(e=>e.getBoundingClientRect().right>innerWidth+1), targetH:Math.min(...[...p.querySelectorAll('.practice-target')].map(b=>b.getBoundingClientRect().height)),
            inputs:p.querySelectorAll('input,textarea,select,[class*=hint i],[class*=answer i]').length, sentences:p.querySelectorAll('.practice-sentence').length}})()""")
assert m['left'] >= 0 and m['right'] <= m['vw'] + 1 and m['bottom'] <= m['vh'] + 1 and m['docScroll'] <= m['vw'] and not m['overflowX'] and m['inputs'] == 0 and m['sentences'] >= 14, m
assert m['targetH'] >= 24, ('a touch target must be at least 24px tall', m['targetH'])
print("PASS 8: at 390px the reading fits the viewport (no horizontal scroll), shows %d sentences, has no exercise controls, and targets are %.0fpx tall" % (m['sentences'], m['targetH']), flush=True)
check("8: at 390px the Close / collapse / bookmark controls are reachable too (not under the menu handle)", CONTROLS_REACHABLE)
c.js("window.__n4=__calls.length")
c.js("document.querySelectorAll('#practice-panel .practice-target')[3].scrollIntoView({block:'center'})"); time.sleep(0.3)
tp = center('#practice-panel .practice-target', 3)
c.touch_tap(tp['x'], tp['y']); time.sleep(0.5)
tgt3 = c.js("getCurrentPracticeSession().reading.targets[3]")
check("8: a real TOUCH tap on a highlighted form focuses that exact occurrence in Grammar (zero AI calls)",
      "grammarContext.focused && grammarContext.focused.surface===%s && els.grammarPanel.classList.contains('expanded') && document.querySelector('#grammar-content .grammar-context-target')?.textContent===%s && __calls.length===__n4"
      % (json.dumps(tgt3['surface'], ensure_ascii=False), json.dumps(tgt3['surface'], ensure_ascii=False)))
c.call('Emulation.setTouchEmulationEnabled', enabled=False)

print("\n=== ALL PRACTICE READING CHECKS PASSED ===")
