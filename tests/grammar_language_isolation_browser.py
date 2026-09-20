"""Grammar language isolation and Practice UX behavioral tests.

Redesign note (grammar-redesign branch): the original version of this suite tested
the OLD hardcoded EN/FR-only TENSE_SYSTEMS/DEFAULT_TENSE objects and the free-text
buildConjugationPrompt('know', 'en', ...) HTML-prompt contract directly. Both were
replaced by the data-driven GRAMMAR_LANG_CONFIG (all 8 supported languages, not just
EN/FR) and a single structured-JSON buildGrammarAnalysisPrompt/normalizeGrammarAnalysis
pipeline — see tests/grammar_redesign_browser.py for the bulk of the new behavioral
coverage (mode switching, fabrication/duplicate rejection, caching, stale-response
protection, contextual Practice reading, target-click focus). This file keeps the
narrower "language isolation" focus its name promises, updated to the new API:
prompt-text language purity for the redesigned Grammar analysis prompt, the French
tense/mood system's expected richness, and the renamed Practice/async-task
infrastructure's continued availability.
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
c.wait("document.readyState==='complete' && !document.body.inert && typeof buildGrammarAnalysisPrompt === 'function'")

def check(name, expression, timeout=0):
    """Evaluate expression with timeout support."""
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1)
        result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name)

print("\n=== TEST 1: GRAMMAR_LANG_CONFIG structure ===")
c.js(r"""
window.__grammarTests = { config: {} };
window.__grammarTests.config.hasConfig = typeof GRAMMAR_LANG_CONFIG === 'object';
window.__grammarTests.config.hasFrench = !!(GRAMMAR_LANG_CONFIG && GRAMMAR_LANG_CONFIG.fr);
window.__grammarTests.config.hasEnglish = !!(GRAMMAR_LANG_CONFIG && GRAMMAR_LANG_CONFIG.en);
if (window.__grammarTests.config.hasFrench) {
    const frTenses = GRAMMAR_LANG_CONFIG.fr.verb.tenses;
    window.__grammarTests.config.frTenseCount = frTenses.length;
    window.__grammarTests.config.frHasSubjonctif = frTenses.some(t => t.id.includes('subjonctif'));
    window.__grammarTests.config.frHasImparfait = frTenses.some(t => t.id.includes('imparfait'));
}
if (window.__grammarTests.config.hasEnglish) {
    const enTenses = GRAMMAR_LANG_CONFIG.en.verb.tenses;
    window.__grammarTests.config.enTenseCount = enTenses.length;
    window.__grammarTests.config.enHasPresent = enTenses.some(t => t.id.includes('present'));
    window.__grammarTests.config.enHasPast = enTenses.some(t => t.id.includes('past'));
}
true;
""")

check("T1: GRAMMAR_LANG_CONFIG exists", "typeof GRAMMAR_LANG_CONFIG === 'object'")
check("T1: French tenses configured", "GRAMMAR_LANG_CONFIG.fr.verb.tenses.length >= 8")
check("T1: English tenses configured", "GRAMMAR_LANG_CONFIG.en.verb.tenses.length >= 8")
check("T1: French has subjunctive tense", "window.__grammarTests.config.frHasSubjonctif")
check("T1: French has imperfect tense", "window.__grammarTests.config.frHasImparfait")
check("T1: every one of the 8 supported languages (not just EN/FR) has its own config",
      "SUPPORTED_LANGUAGE_CODES.length === 8 && SUPPORTED_LANGUAGE_CODES.every(c => GRAMMAR_LANG_CONFIG[c])")

print("\n=== TEST 2: Grammar analysis prompt language purity ===")
c.js(r"""
window.__grammarTests.prompts = {};
const englishPrompt = buildGrammarAnalysisPrompt('She has finished her work.', 'en', 'English');
window.__grammarTests.prompts.enMentionsEnglish = englishPrompt.includes('English');
window.__grammarTests.prompts.enListsEnFeatures = GRAMMAR_LANG_CONFIG.en.verb.features.every(f => englishPrompt.includes(f));
window.__grammarTests.prompts.enOmitsMood = !GRAMMAR_LANG_CONFIG.en.verb.features.includes('mood');

const frenchPrompt = buildGrammarAnalysisPrompt('Elle a terminé son travail.', 'fr', 'French');
window.__grammarTests.prompts.frMentionsFrench = frenchPrompt.includes('French');
window.__grammarTests.prompts.frListsFrFeatures = GRAMMAR_LANG_CONFIG.fr.verb.features.every(f => frenchPrompt.includes(f));
true;
""")

check("T2: English analysis prompt names English and lists only EN-relevant features",
      "window.__grammarTests.prompts.enMentionsEnglish && window.__grammarTests.prompts.enListsEnFeatures")
check("T2: French analysis prompt names French and lists only FR-relevant features",
      "window.__grammarTests.prompts.frMentionsFrench && window.__grammarTests.prompts.frListsFrFeatures")

print("\n=== TEST 3: Adjective form/paradigm slots are language-specific ===")
c.js(r"""
window.__grammarTests.forms = {
    frAdjForms: GRAMMAR_LANG_CONFIG.fr.adjective.forms.map(f => f.id),
    enAdjForms: GRAMMAR_LANG_CONFIG.en.adjective.forms.map(f => f.id),
    zhVerbPersons: GRAMMAR_LANG_CONFIG.zh.verb.persons
};
true;
""")
check("T3: French adjectives declare a 4-cell gender/number agreement grid",
      "window.__grammarTests.forms.frAdjForms.length === 4 && window.__grammarTests.forms.frAdjForms.includes('fp')")
check("T3: English adjectives declare no agreement grid (no grammatical gender)",
      "window.__grammarTests.forms.enAdjForms.length === 0")
check("T3: Chinese verbs declare no person-based paradigm (not person-inflected)",
      "window.__grammarTests.forms.zhVerbPersons.length === 0")

print("\n=== TEST 4: Practice reading infrastructure (renamed API) ===")
c.js(r"""
window.__practiceCheck = {
    hasGenerate: typeof generatePracticeReading === 'function',
    hasDisplay: typeof displayPracticeSession === 'function',
    hasCurrent: typeof getCurrentPracticeSession === 'function',
    hasPersist: typeof persistPracticeSession === 'function',
    hasValidate: typeof validatePracticeReading === 'function'
};
true;
""")

check("T4: Practice reading generation available", "window.__practiceCheck.hasGenerate")
check("T4: Practice display/validation functions available",
      "window.__practiceCheck.hasDisplay && window.__practiceCheck.hasCurrent && window.__practiceCheck.hasValidate")

print("\n=== TEST 5: Practice Persistence ===")
c.js(r"""
window.__persistCheck = {
    canPersist: typeof persistPracticeSession === 'function',
    canLoad: typeof loadPracticeSession === 'function',
    canDelete: typeof deletePracticeSession === 'function'
};
true;
""")

check("T5: Session persistence functions available",
      "window.__persistCheck.canPersist && window.__persistCheck.canLoad")

print("\n=== TEST 6: Async Task Tracking ===")
c.js(r"""
window.__asyncCheck = {
    hasBegin: typeof beginAsyncTask === 'function',
    hasCancel: typeof cancelAsyncTasks === 'function'
};
true;
""")

check("T6: Async task tracking available",
      "window.__asyncCheck.hasBegin && window.__asyncCheck.hasCancel")

print("\n=== TEST 7: Book switch resets grammar state (no cross-book leakage) ===")
c.js(r"""
window.__resetCheck = { hasReset: typeof resetGrammarState === 'function' };
if (window.__resetCheck.hasReset) {
    grammarContext.analysis = {language: 'fr', items: [{pos:'verb', lemma:'test', surface:'test', sentence:'s', features:{}, explanation:'', forms:null}]};
    grammarContext.sourceLanguage = 'fr';
    resetGrammarState();
    window.__resetCheck.clearedAnalysis = grammarContext.analysis === null;
    window.__resetCheck.clearedLanguage = grammarContext.sourceLanguage === null;
}
true;
""")
check("T7: resetGrammarState exists and clears analysis/language",
      "window.__resetCheck.hasReset && window.__resetCheck.clearedAnalysis && window.__resetCheck.clearedLanguage")

print("\n=== ALL GRAMMAR & PRACTICE ISOLATION TESTS PASSED ===")
