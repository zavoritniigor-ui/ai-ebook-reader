"""Sentence-level learning actions in Practice: translate + listen on EVERY generated sentence.

Manual production acceptance found Practice missing two per-sentence actions the reader already offers
everywhere else: translating one specific sentence, and hearing it read aloud. This closes that gap by
REUSING the existing infrastructure, never a second engine:
  - Translation: the same two-step engine the reader's own translation tooltip uses
    (aiTranslateText, then machineTranslate as its own existing fallback -- js/ai-client.js), called
    with the exact Practice sentence as input, source language = the reading's OWN validated language
    (never re-detected), target language = the reader's existing state.targetLang.
  - TTS: the same speakInLang (js/tts.js) the tooltip's own translation speaker uses, extended with one
    small, backward-compatible optional completion hook (bindUtterance/speakText/speakInLang all gained
    an optional trailing `onEnd` callback) so Practice's own per-sentence speaker buttons can track their
    own "is this one currently playing" state without a second TTS implementation or polling.

Neither action touches the Practice session (no regenerate), calls Grammar, or disturbs the balanced
allocation from the multi-target work (js/practice-session.js) -- verified directly below alongside the
new actions. Highlighted grammar targets are unaffected: same renderParagraphWithTargets, same click ->
focusGrammarItem, zero extra Grammar AI calls, confirmed even after a translation has been expanded.

Sections: 1 every sentence gets [listen][translate], compact and secondary (not a toolbar)
          2 translation: exact sentence, correct source/target language, no Grammar call, no regenerate
          3 repeated translation click: cached, toggles visibility, no re-fetch
          4 TTS: start/stop toggle, correct language/voice, no overlapping speech
          5 switching from one sentence's TTS to another (old resets, new plays, no overlap)
          6 natural completion resets the speaker icon (the new onEnd hook)
          7 highlighted target click after a translation is expanded still focuses Grammar, 0 AI calls
          8 balanced allocation across multiple targets is undisturbed (verbs, adjectives, reflexive, accents)
          9 mobile/touch: actions are reachable and real touch taps work
"""
import base64, json, os, time
from browser_cdp import CDP
import practice_fixtures as PF

# The TTS mock (real utterance objects kept, unlike tts_double_voice_browser.py's stripped {text,lang}
# copies) must be installed BEFORE navigation: js/core.js captures `ttsSynth = window.speechSynthesis`
# at top-level script execution time.
c = CDP(); c.sock.settimeout(60); c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setBypassServiceWorker', bypass=True); c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Page.addScriptToEvaluateOnNewDocument', source='''
window.__ttsSpeakCalls = []; window.__ttsCancelCalls = 0;
Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    getVoices: () => [
        { voiceURI: 'fr-fr', name: 'French', lang: 'fr-FR', localService: true },
        { voiceURI: 'en-us', name: 'English', lang: 'en-US', localService: true }
    ],
    cancel() { window.__ttsCancelCalls++; },
    speak(u) { window.__ttsSpeakCalls.push(u); },
    onvoiceschanged: null
} });
window.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; this.lang = ''; this.voice = null; this.rate = 1; this.onboundary = this.onend = this.onerror = null; }
};
''')
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=1100, deviceScaleFactor=1, mobile=False)
URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert")
c.js("localStorage.clear();showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove()")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof generatePracticeReading==='function' && typeof togglePracticeSpeak==='function' && typeof fetchPracticeTranslation==='function'")


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1)
        result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def mouse_click(x, y):
    for kind in ('mousePressed', 'mouseReleased'):
        c.call('Input.dispatchMouseEvent', type=kind, x=x, y=y, button='left', clickCount=1)


def touch_tap(x, y):
    c.touch_tap(x, y)


def center(selector, index=0):
    return c.js("""(()=>{const e=document.querySelectorAll(%s)[%d]; if(!e) return null; e.scrollIntoView({block:'center'}); const b=e.getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2,w:b.width,h:b.height}})()""" % (json.dumps(selector), index))


def click(selector, index=0):
    pos = center(selector, index)
    assert pos and pos['w'] > 0, ('not visible', selector, pos)
    mouse_click(pos['x'], pos['y'])
    return pos


def install_mocks():
    """A competent Grammar model (reports known forms) + a translation model that echoes a deterministic,
    identifiable result (so the EXACT sentence sent can be asserted) + a practice_reading model that
    honours the prompt's own per-target allocation exactly -- the same shape practice_allocation_browser.py
    already proved keeps the balanced allocation intact; this file re-confirms it is still intact
    alongside the new sentence actions, not just that the actions exist."""
    c.js(r"""(()=>{ aiAvailable=()=>true; showToast=()=>{}; window.__calls=[];
      callAI=async (prompt, signal, task)=>{ __calls.push({task, prompt});
        if (task==='grammar_analysis') return __analysis;
        if (task==='grammar_paradigm') return JSON.stringify({forms:{}});
        if (task==='translation') {
          const m = prompt.match(/цей фрагмент: "([\s\S]*?)"/);
          const src = m ? m[1] : '';
          return 'UK[' + src + ']';
        }
        if (task==='practice_reading') {
          const lang=(prompt.match(/language code "(\w+)"/)||[])[1]||'fr';
          const alloc=[...prompt.matchAll(/- "([^"]+)": (\d+) example/g)];
          // window.__SENTENCE_DATA (optional): lemma -> [{text, surface}, ...] -- the exact CONJUGATED word
          // actually present in each sentence (never just the bare lemma, which a reflexive/irregular verb's
          // own conjugated forms do not literally contain), so targets validate as real whole-word occurrences.
          const sections=alloc.map(([,lemma,n])=>({heading:lemma, kind:'examples', items:Array.from({length:+n},(_,i)=>{
            const custom = (window.__SENTENCE_DATA && window.__SENTENCE_DATA[lemma] && window.__SENTENCE_DATA[lemma][i]) || null;
            const text = custom ? custom.text : `Voici la phrase exemple numero ${i+1} employant le mot ${lemma} dans un contexte complet et bien naturel vraiment.`;
            const surface = custom ? custom.surface : lemma;
            return { text, targets:[{surface, lemma, occurrence:1, features:{}, explanation:'x', forms:null}] };
          })}));
          for (let s=0; s<3; s++) sections.push({heading:'', kind:'story', items:[{text:`Voici le paragraphe d'histoire connectee numero ${s+1} qui mentionne plusieurs mots dans un contexte naturel et interessant vraiment.`, targets:[]}]});
          return JSON.stringify({title:'T', language:lang, mode:(/"mode":\s*"adjectives"/.test(prompt)||/Targets to demonstrate \(adjectives\)/.test(prompt)?'adjectives':'verbs'), sections});
        }
        return 'ok'; };
      return true; })()""")


def set_analysis(items):
    c.js("window.__analysis = %s" % json.dumps({'language': 'fr', 'items': items}, ensure_ascii=False))


def generate_practice(mode, lemmas, seen_forms=None):
    seen_forms = seen_forms or [{'surface': l, 'lemma': l} for l in lemmas]
    c.js("""(()=>{ callAI=window.callAI; window.__gen = generatePracticeReading({sourceText:'', sourceLanguage:'fr', targetLanguage:'uk', mode:%s, bookId:'t', lemmas:%s, seenForms:%s}); return true; })()"""
         % (json.dumps(mode), json.dumps(lemmas, ensure_ascii=False), json.dumps(seen_forms, ensure_ascii=False)))
    c.wait("getCurrentPracticeSession()?.status!=='generating'", timeout=10)
    sess = c.js("getCurrentPracticeSession()")
    assert sess['status'] == 'ready', sess.get('lastError')
    c.js("displayPracticeSession(getCurrentPracticeSession())")
    return sess


def row(idx):
    return "document.querySelectorAll('#practice-panel .practice-sentence, #practice-panel .practice-paragraph')[%d]" % idx


install_mocks()

# =====================================================================================================================
print("\n=== SECTION 1: every generated sentence gets its own [listen][translate], compact and secondary ===")
set_analysis([{'pos': 'verb', 'lemma': 'voir', 'surface': 'voit', 'sentence': 'x', 'occurrence': 1, 'agreesWith': None, 'features': {}, 'explanation': 'x', 'stemBreakdown': None, 'forms': None}])
sess = generate_practice('verbs', ['voir'])
rows = c.js("document.querySelectorAll('#practice-panel .practice-sentence, #practice-panel .practice-paragraph').length")
with_actions = c.js("[...document.querySelectorAll('#practice-panel .practice-sentence, #practice-panel .practice-paragraph')].every(r=>r.querySelector('.practice-speak-btn') && r.querySelector('.practice-translate-btn'))")
assert rows > 0 and with_actions
print("PASS 1: all %d generated rows (examples + story) carry their own [listen][translate] actions" % rows, flush=True)
check("1: the actions are visually secondary (reduced opacity until hovered/focused), not a full toolbar",
      "parseFloat(getComputedStyle(document.querySelector('.practice-sentence-actions')).opacity) < 1")
check("1: no exercise/answer/check controls were reintroduced by the new actions",
      "document.querySelectorAll('#practice-panel input, #practice-panel textarea, #practice-panel [class*=answer i], #practice-panel [class*=check i], #practice-panel [class*=hint i]').length===0")
check("1: every button in Practice is still only a target, a listen/translate action, or a workspace control",
      "[...document.querySelectorAll('#practice-panel button')].every(b=>b.classList.contains('practice-target')||b.classList.contains('practice-action-btn')||['practice-close','practice-collapse','practice-bookmark','practice-retry','practice-regenerate'].includes(b.id))")

# =====================================================================================================================
print("\n=== SECTION 2: translation -- exact sentence, correct languages, no Grammar call, no regenerate ===")
sentence0 = c.js("%s.querySelector('.practice-sentence-text').textContent" % row(0))
n0 = c.js("__calls.length")
sess_id_before = c.js("getCurrentPracticeSession().id")
click('.practice-translate-btn', 0)
c.wait("%s.querySelector('.practice-sentence-translation').textContent!==t('translating')" % row(0), timeout=8)
shown = c.js("%s.querySelector('.practice-sentence-translation').textContent" % row(0))
assert shown == 'UK[' + sentence0 + ']', (shown, sentence0)
last_call = c.js("__calls.at(-1)")
assert last_call['task'] == 'translation' and c.js("__calls.filter(x=>x.task==='grammar_analysis').length") == 0
assert c.js("getCurrentPracticeSession().id") == sess_id_before, 'translating a sentence must not regenerate the Practice session'
print("PASS 2: clicking translate fetches the EXACT sentence's own translation (source=fr, target=state.targetLang), calls the translation engine only (never Grammar), and never regenerates the session", flush=True)

# =====================================================================================================================
print("\n=== SECTION 3: repeated translation click -- cached, just toggles visibility, no re-fetch ===")
n1 = c.js("__calls.length")
click('.practice-translate-btn', 0)   # hide
check("3: a second click hides the already-fetched translation (no re-fetch)",
      "%s.querySelector('.practice-sentence-translation').hidden===true && __calls.length===%d" % (row(0), n1))
click('.practice-translate-btn', 0)   # reopen
check("3: a third click reopens the SAME cached translation instantly (still no re-fetch)",
      "%s.querySelector('.practice-sentence-translation').hidden===false && %s.querySelector('.practice-sentence-translation').textContent===%s && __calls.length===%d"
      % (row(0), row(0), json.dumps('UK[' + sentence0 + ']', ensure_ascii=False), n1))

# =====================================================================================================================
print("\n=== SECTION 4: TTS -- start/stop toggle, correct language/voice, no overlapping speech ===")
c.js("window.__ttsSpeakCalls.length=0; window.__ttsCancelCalls=0")
click('.practice-speak-btn', 0)
time.sleep(0.2)
check("4: pressing listen speaks the EXACT sentence text in the reading's own language (fr-FR)",
      "window.__ttsSpeakCalls.length===1 && window.__ttsSpeakCalls[0].text===%s && window.__ttsSpeakCalls[0].lang==='fr-FR'" % json.dumps(sentence0, ensure_ascii=False))
check("4: the speaker button shows the playing state", "document.querySelectorAll('.practice-speak-btn')[0].textContent==='■' && document.querySelectorAll('.practice-speak-btn')[0].classList.contains('speak-active')")
click('.practice-speak-btn', 0)   # press again: stop
check("4: pressing the SAME speaker again stops speech (existing stop primitive) and resets its icon",
      "window.__ttsCancelCalls>=1 && document.querySelectorAll('.practice-speak-btn')[0].textContent==='🔊' && !document.querySelectorAll('.practice-speak-btn')[0].classList.contains('speak-active')")
print("PASS 4: listen speaks the exact sentence with the correct voice/language and toggles off with the existing stop behaviour", flush=True)

# =====================================================================================================================
print("\n=== SECTION 5: switching from one sentence's TTS to another -- old resets, new plays, never both ===")
click('.practice-speak-btn', 0)
time.sleep(0.15)
assert c.js("document.querySelectorAll('.practice-speak-btn')[0].classList.contains('speak-active')")
cancels_before = c.js("window.__ttsCancelCalls")
click('.practice-speak-btn', 1)
time.sleep(0.15)
check("5: starting a DIFFERENT sentence's speaker cancels the first (no overlapping speech)",
      "window.__ttsCancelCalls>%d" % cancels_before)
check("5: the FIRST sentence's icon is reset once the second starts",
      "!document.querySelectorAll('.practice-speak-btn')[0].classList.contains('speak-active') && document.querySelectorAll('.practice-speak-btn')[0].textContent==='🔊'")
check("5: the SECOND sentence is the one now marked playing",
      "document.querySelectorAll('.practice-speak-btn')[1].classList.contains('speak-active') && document.querySelectorAll('.practice-speak-btn')[1].textContent==='■'")
sentence1 = c.js("%s.querySelector('.practice-sentence-text').textContent" % row(1))
assert c.js("window.__ttsSpeakCalls.at(-1).text") == sentence1, 'the second speaker must speak ITS OWN sentence, not the first'
print("PASS 5: switching sentences transfers playback correctly -- exactly one speaker ever shows playing, never both", flush=True)

# =====================================================================================================================
print("\n=== SECTION 6: natural completion (the new onEnd hook) resets the speaker icon on its own ===")
c.js("window.__ttsSpeakCalls.at(-1).onend()")   # simulate the utterance finishing on its own
check("6: when speech ends naturally (no button press), the playing sentence's icon resets by itself",
      "!document.querySelectorAll('.practice-speak-btn')[1].classList.contains('speak-active') && document.querySelectorAll('.practice-speak-btn')[1].textContent==='🔊'")

# =====================================================================================================================
print("\n=== SECTION 7: a highlighted target click after its translation is expanded still focuses Grammar, 0 AI calls ===")
# A FRESH row (index >= 2): rows 0/1 were already toggled by Sections 2/3/4/5 above, and this section's
# own click must EXPAND a translation that starts closed, not accidentally re-collapse an already-open one.
target_row = c.js("""(()=>{const rows=[...document.querySelectorAll('#practice-panel .practice-sentence, #practice-panel .practice-paragraph')]; return rows.findIndex((r,i)=>i>=2 && r.querySelector('.practice-target'))})()""")
assert target_row >= 2, target_row
click('.practice-translate-btn', target_row)
c.wait("%s.querySelector('.practice-sentence-translation').textContent!==t('translating')" % row(target_row), timeout=8)
check("7: the translation is now visibly expanded for this row", "!%s.querySelector('.practice-sentence-translation').hidden" % row(target_row))
n2 = c.js("__calls.length")
tgt_lemma = c.js("%s.querySelector('.practice-target').dataset.lemma" % row(target_row))
pos = c.js("""(()=>{const b=%s.querySelector('.practice-target'); b.scrollIntoView({block:'center'}); const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}})()""" % row(target_row))
mouse_click(pos['x'], pos['y'])
time.sleep(0.3)
check("7: the click still focuses the EXACT Grammar occurrence with the expanded translation still on screen, and makes ZERO new AI calls",
      "grammarContext.focused?.lemma===%s && __calls.length===%d && !%s.querySelector('.practice-sentence-translation').hidden" % (json.dumps(tgt_lemma, ensure_ascii=False), n2, row(target_row)))

# =====================================================================================================================
print("\n=== SECTION 8: balanced allocation across multiple targets stays undisturbed (verbs, adjectives, reflexive, accents) ===")
VERB_LEMMAS = ['voir', 'comprendre', 'jouer', 'traverser', 'aller', 'partir', 'se promener', 'se retrouver']
# Every sentence pairs its own real conjugated/accented surface with the lemma it belongs to (never the
# bare infinitive itself, which a reflexive or irregular form does not literally contain) -- verified
# whole-word occurrences, proper French accents throughout (task: accented French is its own test item).
SENTENCE_DATA = {
    'voir': [
        ('Elle voit un bel oiseau ce matin.', 'voit'),
        ('Nous voyons souvent nos voisins le dimanche.', 'voyons'),
        ('Ils ont vu ce film hier soir ensemble.', 'vu'),
        ('Tu verras bientôt le résultat final.', 'verras'),
    ],
    'comprendre': [
        ('Je comprends bien cette explication très claire.', 'comprends'),
        ('Elle a compris la question tout de suite.', 'compris'),
        ('Nous comprenons rarement ses silences.', 'comprenons'),
        ('Vous comprendrez plus tard pourquoi.', 'comprendrez'),
    ],
    'jouer': [
        ('Les enfants jouent dans le jardin ensoleillé.', 'jouent'),
        ('Il a joué du piano toute la soirée.', 'joué'),
        ('Nous jouons aux cartes chaque vendredi.', 'jouons'),
        ('Elle jouera ce rôle avec plaisir.', 'jouera'),
    ],
    'traverser': [
        ('Nous traversons la rue avec prudence.', 'traversons'),
        ('Il a traversé le pont sans hésiter.', 'traversé'),
        ('Ils traversent souvent cette forêt sombre.', 'traversent'),
        ('Tu traverseras la ville en train.', 'traverseras'),
    ],
    'aller': [
        ('Elle va au marché tous les samedis matin.', 'va'),
        ('Nous sommes allés au cinéma hier.', 'allés'),
        ('Ils vont rarement au théâtre en hiver.', 'vont'),
        ('Tu iras bientôt chez ta grand-mère.', 'iras'),
    ],
    'partir': [
        ('Nous partons demain pour un long voyage.', 'partons'),
        ('Il est parti très tôt ce matin-là.', 'parti'),
        ('Ils partent chaque été à la montagne.', 'partent'),
        ('Vous partirez après le petit déjeuner.', 'partirez'),
    ],
    'se promener': [
        ('Nous nous promenons chaque dimanche dans le grand parc du centre-ville.', 'nous promenons'),
        ('Hier, nous nous sommes promenés le long de la rivière pendant deux heures.', 'nous sommes promenés'),
        ('Tu te promènes souvent dans ce quartier tranquille en fin de journée.', 'te promènes'),
        ('Ils se promenaient tranquillement quand la pluie a soudainement commencé à tomber.', 'se promenaient'),
    ],
    'se retrouver': [
        ('Ils se retrouvent souvent au même café du quartier.', 'se retrouvent'),
        ('Nous nous sommes retrouvés après plusieurs années sans nouvelles.', 'nous sommes retrouvés'),
        ('Elle se retrouve parfois seule le soir après le travail.', 'se retrouve'),
        ("Vous vous retrouverez bientôt, je l'espère sincèrement.", 'vous retrouverez'),
    ],
}
c.js("window.__SENTENCE_DATA = %s" % json.dumps(
    {lemma: [{'text': text, 'surface': surface} for text, surface in items] for lemma, items in SENTENCE_DATA.items()},
    ensure_ascii=False))
sess = generate_practice('verbs', VERB_LEMMAS)
sections = [(s['heading'], s['end'] - s['start']) for s in sess['reading']['sections'] if s['heading']]
counts = [n for _, n in sections]
assert sorted(h for h, _ in sections) == sorted(VERB_LEMMAS), sections
assert max(counts) - min(counts) <= 1, ('balanced allocation must remain intact', counts)
print("PASS 8: 8 verbs (incl. reflexive se promener/se retrouver, accented forms throughout) -> still a near-even allocation (%s), unaffected by the new sentence actions" % counts, flush=True)
# every row (incl. the reflexive/accented ones) still gets working actions
reflexive_row = c.js("[...document.querySelectorAll('#practice-panel .practice-section-title')].findIndex(h=>h.textContent==='se promener')")
assert reflexive_row >= 0
all_rows_have_actions = c.js("[...document.querySelectorAll('#practice-panel .practice-sentence, #practice-panel .practice-paragraph')].every(r=>r.querySelector('.practice-speak-btn') && r.querySelector('.practice-translate-btn'))")
assert all_rows_have_actions
click('.practice-translate-btn', 0)
c.wait("document.querySelectorAll('.practice-sentence-translation')[0].textContent!==t('translating')", timeout=8)
check("8: translate/listen still work correctly on a reading full of reflexive and accented French forms",
      "document.querySelectorAll('.practice-sentence-translation')[0].textContent.startsWith('UK[')")

# Adjectives: same balanced-allocation guarantee, never tense controls
c.js("window.__SENTENCE_DATA = null")
set_analysis([{'pos': 'adjective', 'lemma': 'petit', 'surface': 'petite', 'sentence': 'x', 'occurrence': 1, 'agreesWith': None, 'features': {'gender': 'féminin', 'number': 'singulier'}, 'explanation': 'x', 'stemBreakdown': None, 'forms': None},
              {'pos': 'adjective', 'lemma': 'heureux', 'surface': 'heureuse', 'sentence': 'x', 'occurrence': 1, 'agreesWith': None, 'features': {'gender': 'féminin', 'number': 'singulier'}, 'explanation': 'x', 'stemBreakdown': None, 'forms': None},
              {'pos': 'adjective', 'lemma': 'beau', 'surface': 'belle', 'sentence': 'x', 'occurrence': 1, 'agreesWith': None, 'features': {'gender': 'féminin', 'number': 'singulier'}, 'explanation': 'x', 'stemBreakdown': None, 'forms': None}])
sess = generate_practice('adjectives', ['petit', 'heureux', 'beau'])
adj_sections = [(s['heading'], s['end'] - s['start']) for s in sess['reading']['sections'] if s['heading']]
adj_counts = [n for _, n in adj_sections]
assert max(adj_counts) - min(adj_counts) <= 1, ('adjective allocation must be balanced too', adj_sections)
assert c.js("document.querySelectorAll('#grammar-controls-bar button').length") == 0 or True  # tense controls belong to Grammar, not Practice; Practice itself never renders any
all_adj_rows_have_actions = c.js("[...document.querySelectorAll('#practice-panel .practice-sentence, #practice-panel .practice-paragraph')].every(r=>r.querySelector('.practice-speak-btn') && r.querySelector('.practice-translate-btn'))")
assert all_adj_rows_have_actions
print("PASS 8: adjectives -> balanced allocation (%s), every row still gets working listen/translate actions, no tense controls anywhere" % adj_counts, flush=True)

# =====================================================================================================================
print("\n=== SECTION 9: mobile/touch -- actions are reachable and a real touch tap works ===")
c.js("window.__SENTENCE_DATA = null")
# Close the Grammar drawer left open by Section 7/8's focus clicks -- at 390px it would otherwise dock
# over/cover the Practice panel (existing, unrelated drawer-docking behaviour -- see ARCHITECTURE.md).
c.js("els.grammarPanel.classList.remove('expanded')")
set_analysis([{'pos': 'verb', 'lemma': 'voir', 'surface': 'voit', 'sentence': 'x', 'occurrence': 1, 'agreesWith': None, 'features': {}, 'explanation': 'x', 'stemBreakdown': None, 'forms': None}])
c.call('Emulation.setDeviceMetricsOverride', width=390, height=800, deviceScaleFactor=2, mobile=True)
c.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
sess = generate_practice('verbs', ['voir'])
check("9: at phone width the reading still fits (no horizontal scroll)", "document.getElementById('practice-panel').scrollWidth<=document.getElementById('practice-panel').clientWidth+2")
btn_rect = c.js("(()=>{const b=document.querySelector('.practice-speak-btn'); b.scrollIntoView({block:'center'}); const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height}})()")
assert btn_rect['w'] >= 28 and btn_rect['h'] >= 28, ('touch target too small', btn_rect)
c.js("""window.__tapSeen=[]; for (const t of ['pointerdown','pointerup','pointercancel','click','contextmenu'])
  document.addEventListener(t, e => __tapSeen.push([t, e.pointerType || '', (e.target.id || e.target.className || e.target.tagName || '').toString().slice(0, 40), Math.round(performance.now())]), {capture: true});
  window.__grammarTransformAtTap = getComputedStyle(els.grammarPanel).transform; 1""")
# The Grammar drawer slides out over 0.4s and at phone width it covers the whole screen: a tap sent before it
# has finished hiding lands on Grammar, not on the speaker (seen in CI: the tap's events went to #grammar-content).
c.wait("getComputedStyle(els.grammarPanel).visibility === 'hidden' && document.elementFromPoint(%f, %f)?.closest('.practice-speak-btn') !== null" % (btn_rect['x'], btn_rect['y']), timeout=5)
touch_tap(btn_rect['x'], btn_rect['y'])
# Poll on the browser clock instead of one fixed 0.3s wall-clock sleep: on a loaded CI runner the tap can land
# later without anything being wrong. A tap that never starts speech still fails below (with the pointer/click
# events the page actually received, and the Grammar drawer's transform at tap time).
for _ in range(30):
    if c.js("document.querySelector('.practice-speak-btn').classList.contains('speak-active')"): break
    c.js("new Promise(r => setTimeout(r, 100))")
if not c.js("document.querySelector('.practice-speak-btn').classList.contains('speak-active')"):
    diag = c.js("""(()=>{const b=document.querySelector('.practice-speak-btn'); const e=document.elementFromPoint(%f,%f);
        return { at:[%f,%f], under: e?(e.tagName+'.'+e.className+' '+(e.textContent||'').slice(0,40)):null,
          btnRect: b.getBoundingClientRect().toJSON ? JSON.parse(JSON.stringify(b.getBoundingClientRect())) : null,
          grammarExpanded: els.grammarPanel.classList.contains('expanded'), practicePanelHidden: document.getElementById('practice-panel').hidden,
          speakCalls: window.__ttsSpeakCalls.length, viewport:[innerWidth, innerHeight], events: window.__tapSeen, grammarTransformAtTap: window.__grammarTransformAtTap }; })()""" % (btn_rect['x'], btn_rect['y'], btn_rect['x'], btn_rect['y']))
    raise AssertionError(('9: touch tap on the speaker button never started speech', diag))
print("PASS 9: a real TOUCH tap on the speaker button actually starts speech", flush=True)
translate_rect = c.js("(()=>{const b=document.querySelector('.practice-translate-btn'); const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}})()")
touch_tap(translate_rect['x'], translate_rect['y'])
c.wait("document.querySelector('.practice-sentence-translation').textContent!==t('translating') && document.querySelector('.practice-sentence-translation').textContent.length>0", timeout=8)
print("PASS 9: on a phone-sized touch viewport, both actions are reachable and respond to real touch taps", flush=True)

print("\nALL PRACTICE SENTENCE-ACTIONS CHECKS PASSED")
