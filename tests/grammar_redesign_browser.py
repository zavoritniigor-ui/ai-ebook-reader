"""Grammar/Practice redesign — contextual Verbs/Adjectives Grammar panel and
contextual-reading Practice. Covers the product behaviors introduced by the
redesign that tests/grammar_language_isolation_browser.py and
tests/practice_browser.py (schema/UX specific to the OLD worksheet/tense-only
model) no longer exercise: language-aware feature/tense config across all
supported languages, structured-JSON analysis with fabrication/duplicate
rejection, Verbs<->Adjectives mode switching and its localized labels, analysis
caching/reuse and stale-response protection, contextual reading generation and
validation, target highlighting/click-to-focus, and the explicit absence of any
quiz/answer-input UI in this Practice mode.
"""
import json, os, time
from browser_cdp import CDP
from practice_fixtures import item, tgt, section, reading, to_json

c = CDP(); c.sock.settimeout(45)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=1200, deviceScaleFactor=1, mobile=False)

c.call('Page.navigate', url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert")
c.js("localStorage.clear();showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove()")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof runGrammarAnalysis==='function'")


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1)
        result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name)


# ---------------------------------------------------------------------------
# SECTION 1: GRAMMAR_LANG_CONFIG — data-driven per-language dimensions
# ---------------------------------------------------------------------------
print("\n=== SECTION 1: Language-aware grammar configuration ===")

check("all 8 supported languages have a GRAMMAR_LANG_CONFIG entry",
      "SUPPORTED_LANGUAGE_CODES.every(code => !!GRAMMAR_LANG_CONFIG[code])")

check("every entry declares Verbs/Adjectives labels and feature lists",
      """Object.values(GRAMMAR_LANG_CONFIG).every(cfg =>
        cfg.labels && typeof cfg.labels.verbs === 'string' && cfg.labels.verbs.length &&
        typeof cfg.labels.adjectives === 'string' && cfg.labels.adjectives.length &&
        Array.isArray(cfg.verb.features) && Array.isArray(cfg.verb.tenses) &&
        Array.isArray(cfg.adjective.features))""")

check("labels are in the SOURCE language's own terms, not translated via t()",
      """GRAMMAR_LANG_CONFIG.fr.labels.verbs === 'Verbes' &&
         GRAMMAR_LANG_CONFIG.fr.labels.adjectives === 'Adjectifs' &&
         GRAMMAR_LANG_CONFIG.uk.labels.verbs === 'Дієслова' &&
         GRAMMAR_LANG_CONFIG.en.labels.verbs === 'Verbs'""")

check("English verb features exclude grammatical mood (not meaningful for EN reading verbs)",
      "!GRAMMAR_LANG_CONFIG.en.verb.features.includes('mood')")

check("French verb features include mood/participle (genuinely relevant)",
      "GRAMMAR_LANG_CONFIG.fr.verb.features.includes('mood') && GRAMMAR_LANG_CONFIG.fr.verb.features.includes('participle')")

check("English adjectives have no gender/case dimension; French/Ukrainian do",
      """!GRAMMAR_LANG_CONFIG.en.adjective.features.includes('gender') &&
         GRAMMAR_LANG_CONFIG.fr.adjective.features.includes('gender') &&
         GRAMMAR_LANG_CONFIG.uk.adjective.features.includes('case')""")

check("an unconfigured language code falls back to the default rather than crashing",
      "grammarConfigFor('xx') === GRAMMAR_LANG_CONFIG[DEFAULT_GRAMMAR_LANG]")

check("normalizeGrammarFeatures strips keys not declared for this language+pos",
      """(() => {
        const out = normalizeGrammarFeatures('adjective', 'zh', {gender: 'm', degree: 'comparative', case: 'nominative'});
        return Object.keys(out).length === 1 && out.degree === 'comparative';
      })()""")

check("normalizeGrammarFeatures drops null/empty values",
      "Object.keys(normalizeGrammarFeatures('verb', 'en', {tense: '', person: null, number: 'plural'})).length === 1")


# ---------------------------------------------------------------------------
# SECTION 2: normalizeGrammarAnalysis — fabrication/duplicate rejection
# ---------------------------------------------------------------------------
print("\n=== SECTION 2: Structured analysis normalization (root-cause POS fix) ===")

c.js(r"""
window.__fr_text = "Elle parlait doucement. Sa robe était bleue.";
window.__fr_raw = JSON.stringify({items: [
    {pos:'verb', lemma:'parler', surface:'parlait', sentence:'Elle parlait doucement.',
     features:{tense:'imparfait', mood:'indicatif', person:3, number:'singulier', gender:'inapplicable'},
     explanation:'imparfait décrit une action habituelle dans le passé.',
     stemBreakdown:{stem:'parl', ending:'ait'}, forms:null},
    {pos:'verb', lemma:'parler', surface:'parlait', sentence:'Elle parlait doucement.', features:{}, explanation:'duplicate', forms:null},
    {pos:'adjective', lemma:'bleu', surface:'bleue', sentence:'Sa robe était bleue.',
     features:{gender:'féminin', number:'singulier'}, explanation:"accord avec le nom féminin 'robe'.",
     forms:{ms:'bleu', fs:'bleue', mp:'bleus', fp:'bleues'}},
    {pos:'verb', lemma:'manger', surface:'mangeait', sentence:'Elle mangeait.', features:{}, explanation:'fabricated — not in source text', forms:null},
    {pos:'noun', lemma:'robe', surface:'robe', sentence:'Sa robe était bleue.', features:{}, explanation:'wrong pos', forms:null}
]});
window.__fr_analysis = normalizeGrammarAnalysis(window.__fr_raw, 'fr', window.__fr_text);
true;
""")

check("real verb+adjective items survive normalization",
      "__fr_analysis.items.filter(i => i.pos==='verb').length===1 && __fr_analysis.items.filter(i => i.pos==='adjective').length===1")

check("duplicate lemma+surface pair is suppressed",
      "__fr_analysis.items.filter(i => i.lemma==='parler').length===1")

check("item whose surface never occurs in the source text is rejected (fabrication guard)",
      "!__fr_analysis.items.some(i => i.lemma==='manger')")

check("item with an unsupported pos value is rejected",
      "!__fr_analysis.items.some(i => i.lemma==='robe')")

check("irrelevant feature (gender on a French verb) is stripped, valid ones kept",
      """(() => {
        const v = __fr_analysis.items.find(i => i.pos==='verb');
        return !('gender' in v.features) && v.features.tense==='imparfait' && v.features.mood==='indicatif';
      })()""")

check("valid stem/ending breakdown is kept only when stem+ending reconstructs the surface",
      "__fr_analysis.items.find(i => i.pos==='verb').stemBreakdown.stem==='parl'")

check("adjective agreement forms are kept and key-filtered to this language's declared form ids",
      """(() => {
        const a = __fr_analysis.items.find(i => i.pos==='adjective');
        return a.forms && a.forms.ms==='bleu' && a.forms.fs==='bleue' && Object.keys(a.forms).length===4;
      })()""")

check("malformed AI JSON degrades to an empty item list, not a crash",
      "normalizeGrammarAnalysis('not json at all', 'en', 'text').items.length===0")

check("grammarItemBudget scales with selection size",
      """(() => {
        const w = grammarItemBudget('word');
        const s = grammarItemBudget('A short sentence with several words in it here now.');
        const p = grammarItemBudget(Array(30).fill('word').join(' '));
        const big = grammarItemBudget(Array(200).fill('word').join(' '));
        return w < s && s < p && p < big;
      })()""")


# ---------------------------------------------------------------------------
# SECTION 3: Verbs <-> Adjectives mode switching, localized controls, caching
# ---------------------------------------------------------------------------
print("\n=== SECTION 3: Mode switching, localized controls, analysis cache reuse ===")

c.js(r"""
window.__callCounts = { grammar_analysis: 0, grammar_paradigm: 0 };
window.__origCallAI = callAI;
callAI = async function(prompt, signal, task, onDelta) {
    if (task === 'grammar_analysis') {
        __callCounts.grammar_analysis++;
        return window.__fr_raw;
    }
    if (task === 'grammar_paradigm') {
        __callCounts.grammar_paradigm++;
        return JSON.stringify({forms: {je:'parlais', tu:'parlais', 'il / elle / on':'parlait', nous:'parlions', vous:'parliez', 'ils / elles':'parlaient'}});
    }
    return window.__origCallAI(prompt, signal, task, onDelta);
};
aiAvailable = () => true;
state.lastGrammarSentence = window.__fr_text;
window.__genCalls = () => __callCounts.grammar_analysis;
true;
""")

c.js("startAiTask(window.__fr_text, 'grammar')")
check("analysis completes and panel reaches ready state", "els.grammarPanel.classList.contains('ready')", timeout=5)
check("exactly one grammar_analysis AI call for the first analysis", "__genCalls()===1")
check("Verbs mode is the default and shows exactly one lemma card (duplicate collapsed)",
      "grammarContext.mode==='verbs' && document.querySelectorAll('#grammar-content .grammar-card').length===1")
check("mode-bar labels reflect the FRENCH source text, not the interface language",
      "document.getElementById('grammar-mode-verbs').textContent==='Verbes' && document.getElementById('grammar-mode-adjectives').textContent==='Adjectifs'")
check("Verbs mode shows the French tense/mood control bar",
      "document.querySelectorAll('#grammar-controls-bar button').length === GRAMMAR_LANG_CONFIG.fr.verb.tenses.length")

c.js("switchGrammarMode('adjectives')")
check("switching to Adjectives hides verb entries and shows the adjective card",
      "document.querySelectorAll('#grammar-content .grammar-card').length===1 && document.getElementById('grammar-mode-adjectives').classList.contains('active')")
check("Adjectives mode has NO tense/mood controls",
      "document.getElementById('grammar-controls-bar').children.length===0")
check("switching modes reused the cached analysis — no new AI call",
      "__genCalls()===1")

c.js("switchGrammarMode('verbs')")
check("switching back to Verbs also reuses the cache",
      "__genCalls()===1 && document.querySelectorAll('#grammar-content .grammar-card').length===1")

c.js("startAiTask(window.__fr_text, 'grammar')")
check("re-analyzing the IDENTICAL text/language reuses the cache (no duplicate call)",
      "__genCalls()===1", timeout=2)


# ---------------------------------------------------------------------------
# SECTION 4: Empty states
# ---------------------------------------------------------------------------
print("\n=== SECTION 4: Empty Verb/Adjective states ===")

c.js(r"""
state.uiLang = 'en';
window.__en_text = "The sky is very blue today.";
window.__en_raw = JSON.stringify({items: [
    {pos:'adjective', lemma:'blue', surface:'blue', sentence:'The sky is very blue today.',
     features:{degree:'positive'}, explanation:'describes the sky using the base (positive) form.', forms:null}
]});
callAI = async function(prompt, signal, task, onDelta) {
    if (task === 'grammar_analysis') { __callCounts.grammar_analysis++; return window.__en_raw; }
    return window.__origCallAI(prompt, signal, task, onDelta);
};
state.lastGrammarSentence = window.__en_text;
true;
""")
c.js("startAiTask(window.__en_text, 'grammar')")
check("English analysis completes", "els.grammarPanel.classList.contains('ready')", timeout=5)
check("no verbs in this selection shows the localized empty state",
      """(() => { const msg = document.querySelector('#grammar-content .grammar-empty'); return grammarContext.mode==='verbs' && !!msg && msg.textContent===I18N.grammarEmptyVerbs.en; })()""")
c.js("switchGrammarMode('adjectives')")
check("the detected adjective renders once switched to Adjectives mode",
      "document.querySelectorAll('#grammar-content .grammar-card').length===1 && !document.querySelector('#grammar-content .grammar-empty')")
check("mode-bar falls back to plain English labels for English source text",
      "document.getElementById('grammar-mode-verbs').textContent==='Verbs' && document.getElementById('grammar-mode-adjectives').textContent==='Adjectives'")


# ---------------------------------------------------------------------------
# SECTION 5: Stale-response protection across overlapping analyses
# ---------------------------------------------------------------------------
print("\n=== SECTION 5: Stale async response protection ===")

c.js(r"""
window.__raceLog = [];
callAI = async function(prompt, signal, task, onDelta) {
    if (task !== 'grammar_analysis') return window.__origCallAI(prompt, signal, task, onDelta);
    if (prompt.includes('SlowRaceMarker')) {
        // Deliberately ignores signal.aborted so this resolves anyway — proves
        // runGrammarAnalysis's OWN task.current() check (not just AbortController)
        // is what keeps a late-arriving stale response from overwriting the panel.
        await new Promise(resolve => setTimeout(resolve, 220));
        __raceLog.push('slow-resolved');
        return JSON.stringify({items:[{pos:'verb', lemma:'PAINDU', surface:'PAINDU', sentence:'SlowRaceMarker PAINDU.', features:{}, explanation:'stale', forms:null}]});
    }
    await new Promise(resolve => setTimeout(resolve, 20));
    __raceLog.push('fast-resolved');
    return JSON.stringify({items:[{pos:'verb', lemma:'FASTWORD', surface:'FASTWORD', sentence:'FASTWORD text here.', features:{}, explanation:'current', forms:null}]});
};
state.lastGrammarSentence = 'SlowRaceMarker PAINDU text here now for race test padding words.';
window.__raceStarted = startAiTask('SlowRaceMarker PAINDU text here now for race test padding words.', 'grammar');
true;
""")
c.js(r"""
window.__raceSecond = new Promise(resolve => setTimeout(() => {
    state.lastGrammarSentence = 'FASTWORD text here.';
    resolve(startAiTask('FASTWORD text here.', 'grammar'));
}, 15));
true;
""")
check("the newer (fast) request's result is what's actually shown",
      "grammarContext.analysis && grammarContext.analysis.items[0] && grammarContext.analysis.items[0].lemma==='FASTWORD'",
      timeout=3)
check("the stale (slow) request never overwrote the panel even after it resolved later",
      "(() => { return new Promise(resolve => setTimeout(() => resolve(grammarContext.analysis.items[0].lemma==='FASTWORD' && __raceLog.includes('slow-resolved')), 350))})()",
      timeout=2)


# ---------------------------------------------------------------------------
# SECTION 6: Contextual Practice reading — validation
# ---------------------------------------------------------------------------
print("\n=== SECTION 6: Practice reading validation (structural safety) ===")

GOOD = reading(
    'Un après-midi tranquille', 'verbs',
    section('parler', 'examples',
            item("Quand j'étais jeune, je parlais souvent avec mon grand-père.",
                 tgt('parlais', 'parler', 'action habituelle dans le passé.', tense='imparfait', mood='indicatif')),
            item('Nous prenions le café ensemble et il racontait des histoires anciennes.',
                 tgt('racontait', 'raconter', 'description répétée dans le passé.', tense='imparfait')),
            item('Un jour, nous sommes partis ensemble au marché ce matin-là.',
                 tgt('sommes partis', 'partir', 'action ponctuelle terminée.', tense='passé composé'),
                 tgt('NEVER_IN_TEXT', 'inventer', 'should be dropped')),
            item('Le quartier était très animé et les rues étaient pleines de monde.'),
            item('Tout le monde riait dans la grande salle avec les enfants du village.'),
            item('Ma grand-mère préparait une soupe chaude pour toute la famille.'),
            item("Après le repas, les enfants jouaient dans le jardin jusqu'à la nuit."),
            item('Mon grand-père connaissait tous les voisins du quartier depuis très longtemps.'),
            item("L'été suivant, nous avons voyagé ensemble dans le sud de la France."),
            item('Il faisait déjà nuit quand la vieille voiture est enfin arrivée devant la maison.')),
    section('', 'story',
            item("Le soir, nous sommes rentrés lentement. Le grand-père parlait encore de son enfance et personne ne voulait dormir avant la fin de l'histoire. Dehors, la pluie tombait doucement sur les toits de la vieille ville, et la maison sentait le café et le pain chaud. Nous avons écouté jusqu'à minuit.")))
c.js("window.__goodReading = " + to_json(GOOD) + "; window.__validated = validatePracticeReading(window.__goodReading); true;")

check("a well-formed substantial reading passes validation and is flattened to sentences/paragraphs + sections",
      "__validated.paragraphs.length===11 && __validated.sections.length===2 && __validated.title==='Un après-midi tranquille'")
check("a target whose surface never occurs in its paragraph is silently dropped, not rejected wholesale",
      "__validated.targets.length===3 && !__validated.targets.some(t => t.lemma==='inventer')")

check("missing title is rejected",
      "(() => { try { validatePracticeReading({...__goodReading, title:''}); return false; } catch(e) { return true; } })()")
check("too-short passage (below the substantiality floor) is rejected",
      "(() => { try { validatePracticeReading({...__goodReading, sections:[{heading:'parler', kind:'examples', items:[{text:'Je parle.'}, {text:'Tu parles.'}]}]}); return false; } catch(e) { return e.message.includes('little material') || e.message.includes('short') || e.message.includes('substantial'); } })()")
check("HTML/script injection in a sentence is rejected",
      "(() => { try { validatePracticeReading({...__goodReading, sections:[{heading:'x', kind:'examples', items:[{text:'<script>alert(1)</script>' + 'x'.repeat(250)}]}]}); return false; } catch(e) { return true; } })()")
check("too many sections is rejected",
      "(() => { try { validatePracticeReading({...__goodReading, sections: Array.from({length:13}, (_,i)=>({heading:'w'+i, kind:'examples', items:[{text:'Sentence number ' + i + ' with enough words to not be trivially short at all here.'}]}))}); return false; } catch(e) { return true; } })()")


# ---------------------------------------------------------------------------
# SECTION 7: Practice rendering — no quiz UI, substantial text, highlighting
# ---------------------------------------------------------------------------
print("\n=== SECTION 7: Practice rendering — reading surface, not a quiz ===")

c.js(r"""
getPracticePanel();
const session = createPracticeSession({sourceLanguage:'fr', targetLanguage:'uk', mode:'verbs'});
session.status = 'ready';
session.reading = __validated;
currentPracticeSession = session;
displayPracticeSession(session);
true;
""")

check("the reading renders as example sentences + a connected paragraph, not an exercise worksheet",
      "document.querySelectorAll('.practice-sentence').length===10 && document.querySelectorAll('.practice-paragraph').length===1 && document.querySelectorAll('.exercise').length===0")
check("target forms are highlighted as clickable buttons — one per real occurrence",
      "document.querySelectorAll('.practice-target').length===3")
check("NO traditional quiz/answer-input UI exists anywhere in this Practice panel",
      "document.querySelectorAll('.answer-input, .answer-check-btn, .hint-reveal-btn, .exercise-hints, .practice-pagination').length===0")
check("the reading is substantial, not two trivial disconnected lines",
      "[...document.querySelectorAll('.practice-reading p')].map(p => p.textContent).join(' ').length > 400")


# ---------------------------------------------------------------------------
# SECTION 8: Practice target click focuses Grammar with ZERO extra AI calls
# ---------------------------------------------------------------------------
print("\n=== SECTION 8: Highlighted target click -> Grammar focus (task 13/14) ===")

c.js(r"""
window.__focusCallCountBefore = __callCounts.grammar_analysis + __callCounts.grammar_paradigm;
els.grammarPanel.classList.remove('expanded', 'ready', 'loading');
document.querySelector('.practice-target').click();
true;
""")

check("clicking a highlighted Practice target opens/updates the Grammar panel immediately",
      "els.grammarPanel.classList.contains('expanded') && els.grammarPanel.classList.contains('ready')")
check("Grammar now shows the EXACT clicked form and its contextual explanation",
      "document.querySelector('#grammar-content .grammar-focus b').textContent==='parlais' && document.querySelector('#grammar-content .grammar-focus-why').textContent.includes('habituelle')")
check("Grammar shows the clicked form's grammatical feature as a badge (tense from the target's own data)",
      "[...document.querySelectorAll('#grammar-content .grammar-badge')].some(b => b.textContent==='imparfait')")
check("the sentence context highlights the exact occurrence",
      "document.querySelector('#grammar-content .grammar-context-target').textContent==='parlais'")
check("focusing from Practice required ZERO additional AI calls — the data was already known",
      "(__callCounts.grammar_analysis + __callCounts.grammar_paradigm) === __focusCallCountBefore")
check("clicking did NOT navigate away from Practice — the panel is still visible",
      "!document.getElementById('practice-panel').hidden")

c.js(r"""
window.__adjTarget = document.createElement('button');
document.querySelectorAll('.practice-target')[1].click();
true;
""")
check("a second click on a different verb target updates the focus to that exact form",
      "document.querySelector('#grammar-content .grammar-focus b').textContent==='racontait'")


# ---------------------------------------------------------------------------
# SECTION 9: Renamed Practice API surface exists (replaces the old worksheet API)
# ---------------------------------------------------------------------------
print("\n=== SECTION 9: Practice reading API surface ===")

check("contextual-reading generation/session functions exist under their new names",
      """typeof generatePracticeReading==='function' && typeof regeneratePracticeReading==='function' &&
         typeof retryPracticeGeneration==='function' && typeof getCurrentPracticeSession==='function' &&
         typeof validatePracticeReading==='function' && typeof parseAndValidatePracticeReading==='function'""")
check("the obsolete exercise/quiz API no longer exists",
      "typeof gradeExerciseAnswer==='undefined' && typeof validateWorksheet==='undefined' && typeof buildAnswerControl==='undefined' && typeof ALLOWED_EXERCISE_TYPES==='undefined'")
check("the obsolete free-text Grammar prompt/verb-bar API no longer exists",
      "typeof buildGrammarPrompt==='undefined' && typeof buildConjugationPrompt==='undefined' && typeof TENSE_SYSTEMS==='undefined'")


# ---------------------------------------------------------------------------
# SECTION 10: Regressions found in review (context, stale data, language leak)
# ---------------------------------------------------------------------------
print("\n=== SECTION 10: Single-word context, stale data, Practice button, language leak ===")

c.js(r"""
resetGrammarState();
window.__fr_sentence = "Elle parlait doucement. Sa robe était bleue.";
window.__frItems = JSON.stringify({items: [
    {pos:'verb', lemma:'parler', surface:'parlait', sentence:'Elle parlait doucement.', features:{tense:'imparfait'},
     explanation:"l'imparfait décrit une habitude.", stemBreakdown:{stem:'parl', ending:'ait'}, forms:null},
    {pos:'adjective', lemma:'bleu', surface:'bleue', sentence:'Sa robe était bleue.', features:{gender:'féminin', number:'singulier'},
     explanation:"accord avec 'robe'.", forms:{ms:'bleu', fs:'bleue', mp:'bleus', fp:'bleues'}}
]});
window.__prompts = []; window.__paradigmCalls = 0; window.__failNext = false;
callAI = async function(prompt, signal, task, onDelta) {
    if (task === 'grammar_analysis') {
        __prompts.push(prompt);
        if (__failNext) throw new Error('boom');
        return __frItems;
    }
    if (task === 'grammar_paradigm') {
        __paradigmCalls++;
        return JSON.stringify({forms: {je:'parlais', tu:'parlais', 'il / elle / on':'parlait', nous:'parlions', vous:'parliez', 'ils / elles':'parlaient'}});
    }
    return window.__origCallAI(prompt, signal, task, onDelta);
};
aiAvailable = () => true;
state.uiLang = 'en';
true;
""")

# (1) a single tapped word is analyzed IN its sentence so the explanation can be contextual
c.js("state.lastGrammarSentence = __fr_sentence; startAiTask('parlait', 'grammar')")
check("single tapped word: analysis completes", "els.grammarPanel.classList.contains('ready')", timeout=5)
check("single tapped word: the request carries the WHOLE sentence and names the tapped word",
      "__prompts.at(-1).includes('Elle parlait doucement. Sa robe était bleue.') && __prompts.at(-1).includes('tapped \"parlait\"')")
check("single tapped word: the contextual result renders (verb card for the tapped form)",
      "document.querySelectorAll('#grammar-content .grammar-card').length===1 && grammarContext.analysis.items.some(i => i.surface==='parlait')")

# (3) Practice button follows the CURRENT mode and survives a Verbs<->Adjectives switch
check("Practice button is present after analysis", "document.querySelectorAll('#grammar-content .grammar-practice-btn').length===1")
c.js("switchGrammarMode('adjectives')")
check("Practice button survives switching to Adjectives (panel re-render must not drop it)",
      "document.querySelectorAll('#grammar-content .grammar-practice-btn').length===1 && document.querySelectorAll('#grammar-content .grammar-card').length===1")
c.js(r"""
window.__practiceCtx = null;
window.__origGenReading = generatePracticeReading;
generatePracticeReading = async ctx => { window.__practiceCtx = ctx; return null; };
document.querySelector('#grammar-content .grammar-practice-btn').click();
true;
""")
check("Practice from Adjectives mode is grounded in the ADJECTIVE lemmas, not the verbs",
      "__practiceCtx && __practiceCtx.mode==='adjectives' && JSON.stringify(__practiceCtx.lemmas)===JSON.stringify(['bleu']) && __practiceCtx.sourceLanguage==='fr'")
c.js("generatePracticeReading = window.__origGenReading; switchGrammarMode('verbs')")

# (2) a failed/newer request must not leave the previous selection's results behind
c.js("window.__failNext = true; state.lastGrammarSentence = 'Il chantait une chanson tranquille.'; startAiTask('chantait', 'grammar')")
check("failed analysis shows an error state", "!!document.querySelector('#grammar-content button') && document.querySelector('#grammar-content').textContent.includes('boom')", timeout=5)
check("previous selection's results are dropped from memory once a new request starts",
      "grammarContext.analysis === null")
c.js("switchGrammarMode('adjectives')")
check("mode switch after a failure neither resurfaces old results nor wipes the error message",
      "document.querySelectorAll('#grammar-content .grammar-card').length===0 && document.querySelector('#grammar-content').textContent.includes('boom')")
c.js("switchGrammarMode('verbs'); window.__failNext = false;")

# (4) focusing a Practice item from ANOTHER language must not render beside this language's cards
c.js(r"""
resetGrammarState();
window.__en_items = JSON.stringify({items:[{pos:'verb', lemma:'walk', surface:'walked', sentence:'She walked home.', features:{tense:'past simple'}, explanation:'past.', stemBreakdown:null, forms:null}]});
callAI = async function(prompt, signal, task) {
    if (task === 'grammar_analysis') return __en_items;
    if (task === 'grammar_paradigm') { __paradigmCalls++; return JSON.stringify({forms:{je:'parlais', tu:'parlais', 'il / elle / on':'parlait', nous:'parlions', vous:'parliez', 'ils / elles':'parlaient'}}); }
    return window.__origCallAI(prompt, signal, task);
};
state.lastGrammarSentence = 'She walked home.';
startAiTask('walked', 'grammar');
true;
""")
check("English analysis is showing", "grammarContext.analysis && grammarContext.analysis.language==='en' && document.querySelectorAll('#grammar-content .grammar-card').length===1", timeout=5)
c.js(r"""
focusGrammarItem({pos:'verb', lemma:'parler', surface:'parlais', sentence:'Je parlais souvent.', features:{tense:'imparfait'},
                  explanation:'habitude.', stemBreakdown:null, forms:null}, 'fr');
true;
""")
check("focusing a FRENCH item clears the ENGLISH cards (no cross-language leak)",
      "document.querySelectorAll('#grammar-content .grammar-card').length===0 && grammarContext.analysis===null")
check("mode bar switches to the French labels", "document.getElementById('grammar-mode-verbs').textContent==='Verbes'")

# tense controls + cached paradigm for a Practice-focused verb (no prior analysis needed)
check("a focused verb still gets the French tense/mood controls",
      "document.querySelectorAll('#grammar-controls-bar button').length===GRAMMAR_LANG_CONFIG.fr.verb.tenses.length")
c.js("window.__paradigmCalls = 0; document.querySelector('#grammar-controls-bar button[data-tense-id=\"indicatif_imparfait\"]').click()")
check("choosing a tense fetches that tense's forms and labels the grid with it",
      "document.querySelector('#grammar-content .grammar-grid-title')?.textContent==='Imparfait' && document.querySelectorAll('#grammar-content .grammar-grid-row').length===6 && __paradigmCalls===1", timeout=5)
c.js("document.querySelector('#grammar-controls-bar button[data-tense-id=\"indicatif_present\"]').click()")
check("a second tense makes a second request", "__paradigmCalls===2", timeout=5)
c.js("document.querySelector('#grammar-controls-bar button[data-tense-id=\"indicatif_imparfait\"]').click()")
check("conjugation grid renders as a readable table: every label sits fully left of its form (regression: labels and forms once ran together)",
      """(() => {
        const rows = [...document.querySelectorAll('#grammar-content .grammar-grid-row')];
        return rows.length===6 && rows.every(r => {
          const l = r.querySelector('.grammar-grid-label').getBoundingClientRect(), v = r.querySelector('.grammar-grid-value').getBoundingClientRect();
          return l.right <= v.left && l.width>0 && v.width>0;
        }) && new Set(rows.map(r => Math.round(r.querySelector('.grammar-grid-value').getBoundingClientRect().left))).size===1;
      })()""", timeout=3)
check("the retry label is translated in every interface language that has a full string table (was a raw 'retry' key)",
      "['uk','en','fr','ru'].every(l => { const o=state.uiLang; state.uiLang=l; const v=t('retry'); state.uiLang=o; return v && v!=='retry'; })")
check("re-selecting an already-fetched tense is served from cache (no third request)",
      "__paradigmCalls===2 && document.querySelector('#grammar-content .grammar-grid-title')?.textContent==='Imparfait'", timeout=3)

# (5) the model's language code is normalized before it selects a language config
check("a locale-style language code from the model ('fr-FR') is normalized to 'fr' before feature filtering",
      """(() => {
        const r = validatePracticeReading({...__goodReading, language:'fr-FR'});
        return r.language==='fr' && r.targets[0].features.mood==='indicatif';
      })()""")

c.js("callAI = window.__origCallAI;")
print("\n=== ALL GRAMMAR/PRACTICE REDESIGN CHECKS PASSED ===")
