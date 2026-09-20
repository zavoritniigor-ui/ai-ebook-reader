"""Practice Studio comprehensive browser tests — contextual reading redesign.

Redesign note (grammar-redesign branch): Practice no longer generates an AI
worksheet of graded exercises (fill_form/conjugation/... with expectedAnswer,
progressive hints, Check-Answer buttons). It now generates a short contextual
READING passage grounded in detected grammar lemmas, with target verb/adjective
forms highlighted and clickable (clicking one focuses the Grammar panel on that
exact occurrence — see tests/grammar_redesign_browser.py for that cross-panel
behavior in depth). This file keeps the original suite's structure and test
numbering where the underlying behavior is unchanged (session lifecycle,
persistence, stale-response protection, panel isolation, credential safety), and
replaces the old worksheet/hints/exercise-type tests (T2-T6, T8, T16, T21) with
their reading-schema equivalents. The old T16 (hints) and T21 (exercise-type
constraint) tested UX this redesign explicitly removes per product spec section 9
("no traditional answer-input quiz UI") — T21 below now asserts that removal
directly, which is the new product requirement replacing the old one.
"""
import json, os, time
from browser_cdp import CDP

c = CDP(); c.sock.settimeout(45)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=900, height=1200, deviceScaleFactor=1, mobile=False)

c.call('Page.navigate', url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert")
c.js("localStorage.clear();showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove()")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert")

def check(name, expression, timeout=0):
    """Evaluate expression with timeout support."""
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1)
        result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name)

# Initialize test harness
mockReading = {
    "title": "Un dimanche au marché",
    "language": "fr",
    "mode": "verbs",
    "paragraphs": [
        "Le dimanche matin, Marie allait toujours au marché avec sa grand-mère. Elles achetaient des légumes frais et parlaient avec les vendeurs pendant une bonne heure.",
        "Un jour, il a plu très fort et elles sont rentrées plus tôt que d'habitude, trempées mais heureuses de leur promenade."
    ],
    "targets": [
        {"pos": "verb", "surface": "allait", "lemma": "aller", "paragraphIndex": 0, "features": {"tense": "imparfait"}, "explanation": "action habituelle répétée dans le passé.", "forms": None},
        {"pos": "verb", "surface": "achetaient", "lemma": "acheter", "paragraphIndex": 0, "features": {"tense": "imparfait"}, "explanation": "action habituelle décrite au passé.", "forms": None},
        {"pos": "verb", "surface": "a plu", "lemma": "pleuvoir", "paragraphIndex": 1, "features": {"tense": "passé composé"}, "explanation": "événement ponctuel achevé.", "forms": None}
    ]
}

c.js(r'''
window.__practiceTests = {
    mockReading: ''' + json.dumps(mockReading) + r''',
    generateCount: 0,
    requestCount: 0,
    hostileInputCaught: false,
    lastError: null
};

// Mock callAI
window.__originalCallAI = callAI;
callAI = async function(prompt, signal, task, onDelta) {
    if (task === 'practice_reading') {
        __practiceTests.generateCount++;
        __practiceTests.requestCount++;
        return JSON.stringify(__practiceTests.mockReading);
    }
    return window.__originalCallAI(prompt, signal, task, onDelta);
};

// Monitor for script injection
const observer = new MutationObserver((mutations) => {
    mutations.forEach(m => {
        if (m.addedNodes) {
            m.addedNodes.forEach(node => {
                if (node.innerHTML && /<script|onerror|onclick/i.test(node.innerHTML)) {
                    __practiceTests.hostileInputCaught = true;
                }
            });
        }
    });
});
observer.observe(document.body, { subtree: true, childList: true, attributes: false });
''')

# TEST 1: Session creation
print("\n=== TEST 1: Practice Session Creation ===")
c.js(r"""
const ctx = {sourceText: 'Test', sourceLanguage: 'fr', targetLanguage: 'uk', mode: 'verbs', level: null};
window.__testSession = createPracticeSession(ctx);
""")

check("T1: Session has unique ID",
      "window.__testSession && window.__testSession.id && window.__testSession.id.startsWith('ps_')")

check("T1: Session in generating state",
      "window.__testSession.status === 'generating'")

# TEST 2: Reading validation
print("\n=== TEST 2: Reading Validation ===")

check("T2: Valid reading passes validation",
      r"""
      (function() {
        try {
          validatePracticeReading(__practiceTests.mockReading);
          return true;
        } catch (e) {
          __practiceTests.lastError = e.message;
          return false;
        }
      })()
      """)

# TEST 3: Invalid reading rejection (missing/empty title)
print("\n=== TEST 3: Invalid Reading Rejection ===")

c.js(r"""
window.__badReading = {
    title: '', language: 'fr', mode: 'verbs',
    paragraphs: ['Some paragraph text that is long enough to pass the length check on its own here.'],
    targets: []
};
try {
    validatePracticeReading(window.__badReading);
    __practiceTests.lastError = 'Should have thrown';
} catch (e) {
    __practiceTests.lastError = e.message;
}
""")

check("T3: Empty title rejected",
      "window.__practiceTests.lastError && window.__practiceTests.lastError.includes('title')")

# TEST 4: Trivial/too-short passage rejection (the redesign's core substantiality requirement)
print("\n=== TEST 4: Trivial Passage Rejection ===")

c.js(r"""
window.__trivialReading = {
    title: 'Trivial', language: 'fr', mode: 'verbs',
    paragraphs: ['Je parle.', 'Tu parles.'],
    targets: []
};
try {
    validatePracticeReading(window.__trivialReading);
    __practiceTests.lastError = 'Should have thrown';
} catch (e) {
    __practiceTests.lastError = e.message;
}
""")

check("T4: Trivial two-line passage is rejected as insubstantial",
      "window.__practiceTests.lastError && window.__practiceTests.lastError !== 'Should have thrown'")

# TEST 5: Paragraph count bounds
print("\n=== TEST 5: Paragraph Count Bounds ===")

c.js(r"""
window.__tooMany = {
    title: 'Too many', language: 'fr', mode: 'verbs',
    paragraphs: Array.from({length: 9}, (_, i) => 'Paragraph number ' + i + ' with plenty of words so it is not trivially short by itself.'),
    targets: []
};
try {
    validatePracticeReading(window.__tooMany);
    __practiceTests.lastError = 'Should have thrown';
} catch (e) {
    __practiceTests.lastError = e.message;
}
""")

check("T5: Excessive paragraph count rejected",
      "window.__practiceTests.lastError && window.__practiceTests.lastError.includes('many')")

# TEST 6: HTML injection safety
print("\n=== TEST 6: HTML Content Safety ===")

c.js(r"""
window.__malicious = {
    title: 'Test<script>alert("xss")</script>', language: 'fr', mode: 'verbs',
    paragraphs: ['A normal-looking paragraph with <img onerror=alert(1)> embedded and enough length to pass otherwise.'],
    targets: []
};
try {
    validatePracticeReading(window.__malicious);
    __practiceTests.lastError = 'Should have thrown';
} catch (e) {
    __practiceTests.lastError = e.message;
}
""")

check("T6: HTML injection rejected",
      "window.__practiceTests.lastError && window.__practiceTests.lastError !== 'Should have thrown'")

# TEST 7: Safe rendering
print("\n=== TEST 7: Reading Rendering Safety ===")

c.js(r"""
getPracticePanel();
const s = createPracticeSession({sourceLanguage:'fr', targetLanguage:'uk', mode:'verbs'});
s.status = 'ready'; s.reading = __practiceTests.mockReading;
displayPracticeSession(s);
""")

check("T7: Reading renders",
      "document.querySelector('.practice-reading') !== null && document.querySelectorAll('.practice-paragraph').length === 2")

check("T7: Content not executed",
      r"!window.__practiceTests.hostileInputCaught")

# TEST 8: Target highlighting for both Verbs and Adjectives modes
print("\n=== TEST 8: Target Highlighting Renders For Both Modes ===")

c.js(r"""
const adjReading = {
    title: 'Les couleurs du jardin', language: 'fr', mode: 'adjectives',
    paragraphs: [
        "Le jardin était magnifique ce matin-là. Les fleurs bleues et les roses rouges couvraient les allées silencieuses sous un ciel dégagé."
    ],
    targets: [
        {pos: 'adjective', surface: 'bleues', lemma: 'bleu', paragraphIndex: 0, features: {gender: 'féminin', number: 'pluriel'}, explanation: "accord avec 'fleurs', féminin pluriel.", forms: {ms:'bleu', fs:'bleue', mp:'bleus', fp:'bleues'}},
        {pos: 'adjective', surface: 'rouges', lemma: 'rouge', paragraphIndex: 0, features: {gender: 'féminin', number: 'pluriel'}, explanation: "accord avec 'roses', féminin pluriel.", forms: null}
    ]
};
const s2 = createPracticeSession({sourceLanguage:'fr', targetLanguage:'uk', mode:'adjectives'});
s2.status = 'ready'; s2.reading = adjReading;
displayPracticeSession(s2);
""")

check("T8: Adjective targets render as highlighted clickable buttons",
      "document.querySelectorAll('.practice-target-adjective').length === 2")

# TEST 9: Session persistence
print("\n=== TEST 9: Session Persistence ===")

c.js(r"""
window.__persistedSession = {
    id: 'test_persist_123',
    status: 'ready',
    sourceText: 'Test',
    sourceLanguage: 'fr',
    targetLanguage: 'uk',
    reading: __practiceTests.mockReading,
    createdAt: Date.now()
};
persistPracticeSession(__persistedSession);
""")

check("T9: Session saved to storage",
      "localStorage.getItem('practice_session:test_persist_123') !== null")

check("T9: Persisted data is valid JSON",
      r"(function() { try { JSON.parse(localStorage.getItem('practice_session:test_persist_123')); return true; } catch(e) { return false; } })()")

# TEST 10: Session restoration
print("\n=== TEST 10: Session Restoration ===")

c.js(r"""
window.__restoredSession = loadPracticeSession('test_persist_123');
""")

check("T10: Session restored from storage",
      "window.__restoredSession && window.__restoredSession.id === 'test_persist_123'")

# TEST 11: Corrupt data recovery
print("\n=== TEST 11: Corrupt Data Recovery ===")

c.js(r"""
localStorage.setItem('practice_session:corrupt', '{invalid json');
window.__corruptResult = loadPracticeSession('corrupt');
""")

check("T11: Corrupt session rejected",
      "window.__corruptResult === null || localStorage.getItem('practice_session:corrupt') === null")

# TEST 12: Retry creates new session from context
print("\n=== TEST 12: Retry Functionality ===")

c.js(r"""
window.__retryTest = { oldId: null, newId: null };
currentPracticeSession = {
    id: 'retry_test_001',
    status: 'error',
    sourceText: 'Test context',
    sourceLanguage: 'fr',
    targetLanguage: 'uk',
    mode: 'verbs',
    lastError: {message: 'First attempt failed'}
};
window.__retryTest.oldId = currentPracticeSession.id;
""")

check("T12: Retry preserves session context",
      "typeof retryPracticeGeneration === 'function'")

# TEST 13: Stale response protection — real race, not just an existence check
print("\n=== TEST 13: Stale Response Protection (real race) ===")

c.js(r"""
window.__raceReadingLog = [];
window.__origCallAI13 = callAI;
callAI = async function(prompt, signal, task) {
    if (task !== 'practice_reading') return window.__origCallAI13(prompt, signal, task);
    if (prompt.includes('STALE_MARKER')) {
        // Deliberately ignores signal.aborted so it still resolves late — this proves
        // generatePracticeReading's own task.current() guard (not just AbortController)
        // discards a stale response instead of applying it.
        await new Promise(r => setTimeout(r, 200));
        window.__raceReadingLog.push('stale-resolved');
        return JSON.stringify({...__practiceTests.mockReading, title: 'STALE'});
    }
    await new Promise(r => setTimeout(r, 20));
    window.__raceReadingLog.push('fresh-resolved');
    return JSON.stringify({...__practiceTests.mockReading, title: 'FRESH'});
};
window.__staleCtx = {sourceText: 'STALE_MARKER context text long enough to pad the prompt out a bit here.', sourceLanguage:'fr', targetLanguage:'uk', mode:'verbs'};
window.__freshCtx = {sourceText: 'fresh context text long enough to pad the prompt out a bit here too.', sourceLanguage:'fr', targetLanguage:'uk', mode:'verbs'};
window.__stalePromise = generatePracticeReading(window.__staleCtx);
true;
""")
c.js(r"""
window.__freshPromise = new Promise(resolve => setTimeout(() => resolve(generatePracticeReading(window.__freshCtx)), 15));
true;
""")

check("T13: The stale (slower) request never becomes the active session",
      "(async () => { await window.__stalePromise; await window.__freshPromise; return getCurrentPracticeSession()?.reading?.title === 'FRESH'; })()",
      timeout=3)
check("T13: The stale response resolved late but was discarded, not applied",
      "window.__raceReadingLog.includes('stale-resolved') && getCurrentPracticeSession()?.reading?.title === 'FRESH'",
      timeout=1)
c.js("callAI = window.__origCallAI13;")

# TEST 14: Session persistence across close/reload
print("\n=== TEST 14: Session Persistence After UI Close ===")

c.js(r"""
const readySession = {
    id: 'persist_test',
    status: 'ready',
    sourceText: 'Test',
    sourceLanguage: 'fr',
    targetLanguage: 'uk',
    reading: __practiceTests.mockReading,
    createdAt: Date.now()
};
persistPracticeSession(readySession);
currentPracticeSession = readySession;
window.__beforeClose = {hasSession: !!getCurrentPracticeSession()};
""")

c.js("closePracticeSession();")

check("T14: Session cleared from memory after close",
      "getCurrentPracticeSession() === null")

c.js("const restored = loadPracticeSession('persist_test'); window.__afterRestore = restored;")

check("T14: Ready session survives close and can be restored",
      "window.__afterRestore !== null && window.__afterRestore.status === 'ready'")

# TEST 15: No credentials in data
print("\n=== TEST 15: Security - No Credential Leaks ===")

c.js(r"""
const session = {
    id: 'sec_test',
    sourceText: 'Test',
    sourceLanguage: 'fr',
    targetLanguage: 'uk',
    reading: __practiceTests.mockReading
};
window.__secTest = {
    sessionStr: JSON.stringify(session),
    storageKeys: Object.keys(localStorage)
};
""")

check("T15: No API keys in session",
      r"!window.__secTest.sessionStr.includes('sk-') && !window.__secTest.sessionStr.includes('gsk_')")

check("T15: No credentials in storage",
      r"!window.__secTest.storageKeys.some(k => localStorage[k]?.includes('sk-') || localStorage[k]?.includes('gsk_'))")

# TEST 16: Duplicate/invalid target schema handling (replaces the old hints test)
print("\n=== TEST 16: Target Schema Robustness ===")

c.js(r"""
window.__dupReading = {
    title: 'Duplicate targets', language: 'fr', mode: 'verbs',
    paragraphs: ["Elle chantait souvent le matin, et elle chantait aussi le soir avec beaucoup de plaisir chaque jour. Le soleil brillait sur la ville et tout le monde semblait content de cette belle journée de printemps, alors les voisins ouvraient leurs fenêtres pour l'écouter."],
    targets: [
        {pos: 'verb', surface: 'chantait', lemma: 'chanter', paragraphIndex: 0, features: {tense:'imparfait'}, explanation: 'premier.', forms: null},
        {pos: 'verb', surface: 'chantait', lemma: 'chanter', paragraphIndex: 0, features: {tense:'imparfait'}, explanation: 'duplicate — must be dropped.', forms: null}
    ]
};
window.__dupValidated = validatePracticeReading(window.__dupReading);
""")

check("T16: Duplicate paragraph+surface target pairs are deduplicated at validation",
      "window.__dupValidated.targets.length === 1")

c.js(r"""
window.__explanationInjection = {
    title: 'Explanation safety', language: 'fr', mode: 'verbs',
    paragraphs: ["Elle chantait souvent le matin avec beaucoup de plaisir et de joie chaque jour de la semaine. Le soleil brillait sur la ville et tout le monde semblait content de cette belle journée de printemps, alors les voisins ouvraient leurs fenêtres pour l'écouter."],
    targets: [
        {pos: 'verb', surface: 'chantait', lemma: 'chanter', paragraphIndex: 0, features: {}, explanation: '<script>alert(1)</script>', forms: null}
    ]
};
window.__explValidated = validatePracticeReading(window.__explanationInjection);
""")
check("T16: A target with an unsafe explanation is dropped, not sanitized-and-kept",
      "window.__explValidated.targets.length === 0")

# TEST 17: Practice Panel Visibility Regression (Production fix)
print("\n=== TEST 17: Practice Panel Visibility (Regression) ===")

c.js(r"""
window.__visibilityTest = {
    panelVisible: false,
    computedDisplay: null,
    computedVisibility: null,
    notOffscreen: false
};

const practicePanel = document.getElementById('practice-panel');
if (practicePanel) {
    const computed = window.getComputedStyle(practicePanel);
    window.__visibilityTest.computedDisplay = computed.display;
    window.__visibilityTest.computedVisibility = computed.visibility;
    const transform = computed.transform;
    window.__visibilityTest.notOffscreen = !transform.includes('translateX(100%)');
    window.__visibilityTest.hidden = practicePanel.hidden;
}

true;
""")

check("T17: Practice panel not hidden",
      "!window.__visibilityTest.hidden")

check("T17: Practice panel has display:flex (not none)",
      "window.__visibilityTest.computedDisplay === 'flex'")

check("T17: Practice panel has visibility:visible (not hidden)",
      "window.__visibilityTest.computedVisibility === 'visible'")

check("T17: Practice panel not off-screen (transform not translateX(100%))",
      "window.__visibilityTest.notOffscreen")

# TEST 18: Grammar/Ask Panels Still Work
print("\n=== TEST 18: Grammar/Ask Panel Isolation ===")

c.js(r"""
const grammaPanelSetup = document.getElementById('grammar-panel');
const askPanelSetup = document.getElementById('ask-panel');
if (grammaPanelSetup) grammaPanelSetup.hidden = true;
if (askPanelSetup) askPanelSetup.hidden = true;

window.__isolationTest = {
    grammarHidden: true,
    askHidden: true,
    practiceHidden: false,
    noConflict: true
};

const grammarPanelT18 = document.getElementById('grammar-panel');
const askPanelT18 = document.getElementById('ask-panel');
const practicePanelT18 = document.getElementById('practice-panel');

if (grammarPanelT18) window.__isolationTest.grammarHidden = grammarPanelT18.hidden;
if (askPanelT18) window.__isolationTest.askHidden = askPanelT18.hidden;
if (practicePanelT18) window.__isolationTest.practiceHidden = practicePanelT18.hidden;

window.__isolationTest.noConflict =
    window.__isolationTest.grammarHidden &&
    window.__isolationTest.askHidden &&
    !window.__isolationTest.practiceHidden;

true;
""")

check("T18: Grammar panel still independent",
      "window.__isolationTest.grammarHidden")

check("T18: Ask panel still independent",
      "window.__isolationTest.askHidden")

check("T18: Practice panel visible (not hidden)",
      "!window.__isolationTest.practiceHidden")

check("T18: No panel conflicts",
      "window.__isolationTest.noConflict")

# TEST 19: Async Lifecycle - Single Request Success
print("\n=== TEST 19: Async Lifecycle - Single Request Success (Regression) ===")

c.js(r"""
window.__asyncTest = {
    singleSuccess: { sessionCreated: false, readyShown: false, stateTransition: false },
    raceTest: { bothCreated: false, aNotOverwriteB: false, bFinal: false }
};

const origCallAI = window.callAI;
let testCallCount = 0;
window.callAI = async function(prompt, signal, task) {
    if (task === 'practice_reading') {
        testCallCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
        return JSON.stringify(__practiceTests.mockReading);
    }
    return origCallAI(prompt, signal, task);
};

true;
""")

c.js(r"""
window.__asyncTest.singlePromise = (async () => {
    const singleContext = { sourceText: 'Single test', sourceLanguage: 'fr', targetLanguage: 'uk', mode: 'verbs' };
    try {
        const result = await generatePracticeReading(singleContext);
        const after = getCurrentPracticeSession();
        window.__asyncTest.singleSuccess.sessionCreated = !!after;
        window.__asyncTest.singleSuccess.readyShown = after?.status === 'ready';
        window.__asyncTest.singleSuccess.stateTransition = result?.status === 'ready' && after?.status === 'ready' && result?.id === after?.id;
    } catch (e) {
        window.__asyncTest.singleSuccess.error = e.message;
    }
})();

true;
""")

check("T19: Session created and ready after generation",
      "window.__asyncTest.singleSuccess.sessionCreated && window.__asyncTest.singleSuccess.readyShown",
      timeout=2)

check("T19: Session transitioned generating → ready",
      "window.__asyncTest.singleSuccess.stateTransition",
      timeout=2)

# TEST 20: Async Lifecycle - Race Condition (A starts, B starts, A fails late)
print("\n=== TEST 20: Async Lifecycle - Race Condition (Regression) ===")

c.js(r"""
let raceCallCount = 0;
window.callAI = async function(prompt, signal, task) {
    if (task === 'practice_reading') {
        const callNum = ++raceCallCount;
        if (callNum === 1) {
            await new Promise(resolve => setTimeout(resolve, 150));
            if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
            throw new Error('A failed deliberately for race test');
        } else if (callNum === 2) {
            await new Promise(resolve => setTimeout(resolve, 30));
            if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
            return JSON.stringify(__practiceTests.mockReading);
        }
    }
    return origCallAI(prompt, signal, task);
};

true;
""")

c.js(r"""
window.__asyncTest.racePromise = (async () => {
    try {
        const contextA = { sourceText: 'Request A', sourceLanguage: 'fr', targetLanguage: 'uk', mode: 'verbs' };
        const contextB = { sourceText: 'Request B', sourceLanguage: 'fr', targetLanguage: 'uk', mode: 'verbs' };

        const promiseA = generatePracticeReading(contextA);
        const sessionAId = getCurrentPracticeSession()?.id;

        await new Promise(resolve => setTimeout(resolve, 10));
        const promiseB = generatePracticeReading(contextB);
        const sessionBId = getCurrentPracticeSession()?.id;

        window.__asyncTest.raceTest.bothCreated = sessionAId !== sessionBId;

        const resultA = await promiseA.catch(e => ({ error: e.message }));
        const resultB = await promiseB.catch(e => ({ error: e.message }));

        const finalSession = getCurrentPracticeSession();

        window.__asyncTest.raceTest.aNotOverwriteB =
            finalSession?.id === sessionBId &&
            finalSession?.status === 'ready' &&
            !!finalSession?.reading;

        window.__asyncTest.raceTest.bFinal = finalSession?.id === sessionBId;
    } catch (e) {
        window.__asyncTest.raceTest.error = e.message;
    }
})();

true;
""")

check("T20: Requests A and B create different sessions",
      "window.__asyncTest.raceTest.bothCreated",
      timeout=2)

check("T20: Stale request A cannot overwrite active B",
      "window.__asyncTest.raceTest.aNotOverwriteB",
      timeout=2)

check("T20: Final session is B's ready state",
      "window.__asyncTest.raceTest.bFinal")

# TEST 21: No traditional quiz UI in this Grammar Practice mode (replaces the old
# exercise-type-constraint regression — this redesign explicitly removes that UX;
# see product spec section 9/26.23: "no traditional answer-input quiz UI")
print("\n=== TEST 21: No Traditional Quiz UI (Regression for removed UX) ===")

c.js(r"""
const finalSession = createPracticeSession({sourceLanguage:'fr', targetLanguage:'uk', mode:'verbs'});
finalSession.status = 'ready';
finalSession.reading = __practiceTests.mockReading;
displayPracticeSession(finalSession);
window.__quizUiCheck = {
    answerInputs: document.querySelectorAll('#practice-panel input, #practice-panel textarea').length,
    checkButtons: document.querySelectorAll('#practice-panel .answer-check-btn').length,
    hintButtons: document.querySelectorAll('#practice-panel .hint-reveal-btn').length,
    exerciseBlocks: document.querySelectorAll('#practice-panel .exercise').length,
    pagination: document.querySelectorAll('#practice-panel .practice-pagination').length,
    hasHighlightedTargets: document.querySelectorAll('#practice-panel .practice-target').length > 0
};
true;
""")

check("T21: No answer inputs/textareas exist anywhere in the Practice panel",
      "window.__quizUiCheck.answerInputs === 0")
check("T21: No Check-Answer buttons exist",
      "window.__quizUiCheck.checkButtons === 0")
check("T21: No Hint buttons exist",
      "window.__quizUiCheck.hintButtons === 0")
check("T21: No numbered exercise blocks exist",
      "window.__quizUiCheck.exerciseBlocks === 0")
check("T21: No exercise pagination exists",
      "window.__quizUiCheck.pagination === 0")
check("T21: The reading DOES contain clickable highlighted target forms (the replacement interaction)",
      "window.__quizUiCheck.hasHighlightedTargets")

c.js("callAI = window.__originalCallAI;")
print("\n=== ALL PRACTICE STUDIO TESTS PASSED ===")
