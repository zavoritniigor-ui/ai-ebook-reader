"""Grammar language isolation and Practice UX behavioral tests.
Tests that would have failed on the language-mixing bug.
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
c.wait("document.readyState==='complete' && !document.body.inert && typeof buildConjugationPrompt === 'function'")

def check(name, expression, timeout=0):
    """Evaluate expression with timeout support."""
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1)
        result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name)

print("\n=== TEST 1: TENSE_SYSTEMS Configuration ===")
c.js(r"""
window.__grammarTests = { config: {} };

// Verify TENSE_SYSTEMS exists and has correct structure
window.__grammarTests.config.hasTenseSystems = typeof TENSE_SYSTEMS === 'object';
window.__grammarTests.config.hasFrench = window.TENSE_SYSTEMS && window.TENSE_SYSTEMS.fr ? true : false;
window.__grammarTests.config.hasEnglish = window.TENSE_SYSTEMS && window.TENSE_SYSTEMS.en ? true : false;

// Check French tenses
if (window.__grammarTests.config.hasFrench) {
    const frTenses = window.TENSE_SYSTEMS.fr;
    window.__grammarTests.config.frTenseCount = frTenses.length;
    window.__grammarTests.config.frHasSubjonctif = frTenses.some(t => t.id.includes('subjonctif'));
    window.__grammarTests.config.frHasImparfait = frTenses.some(t => t.id.includes('imparfait'));
}

// Check English tenses
if (window.__grammarTests.config.hasEnglish) {
    const enTenses = window.TENSE_SYSTEMS.en;
    window.__grammarTests.config.enTenseCount = enTenses.length;
    window.__grammarTests.config.enHasPresent = enTenses.some(t => t.id.includes('present'));
    window.__grammarTests.config.enHasPast = enTenses.some(t => t.id.includes('past'));
}

true;
""")

check("T1: TENSE_SYSTEMS exists",
      "typeof TENSE_SYSTEMS === 'object'")

check("T1: French tenses configured",
      "TENSE_SYSTEMS && TENSE_SYSTEMS.fr && TENSE_SYSTEMS.fr.length >= 8")

check("T1: English tenses configured",
      "TENSE_SYSTEMS && TENSE_SYSTEMS.en && TENSE_SYSTEMS.en.length >= 8")

print("\n=== TEST 2: English Conjugation Prompt ===")
c.js(r"""
window.__grammarTests.prompts = {};

// Test buildConjugationPrompt for English
const englishPrompt = buildConjugationPrompt('know', 'en', 'present_simple', 'Present Simple');
window.__grammarTests.prompts.english = englishPrompt;
window.__grammarTests.prompts.enHasEnglishWord = englishPrompt.includes('English verb');
window.__grammarTests.prompts.enNoFrench = !englishPrompt.includes('verbe français');

// Test buildConjugationPrompt for French
const frenchPrompt = buildConjugationPrompt('savoir', 'fr', 'indicatif_present', 'Présent');
window.__grammarTests.prompts.french = frenchPrompt;
window.__grammarTests.prompts.frHasFrenchWord = frenchPrompt.includes('verbe français');
window.__grammarTests.prompts.frNoEnglish = !frenchPrompt.includes('English verb');

true;
""")

check("T2: English prompt uses English",
      "window.__grammarTests.prompts.enHasEnglishWord && window.__grammarTests.prompts.enNoFrench")

check("T2: French prompt uses French",
      "window.__grammarTests.prompts.frHasFrenchWord && window.__grammarTests.prompts.frNoEnglish")

print("\n=== TEST 3: French Tense System Preserved ===")
c.js(r"""
window.__grammarTests.french = {};

const frTenses = TENSE_SYSTEMS.fr || [];
window.__grammarTests.french.count = frTenses.length;
window.__grammarTests.french.hasSubj = frTenses.some(t => t.id.includes('subjonctif'));
window.__grammarTests.french.hasImperfect = frTenses.some(t => t.id.includes('imparfait'));
window.__grammarTests.french.hasCompound = frTenses.some(t => t.label.includes('Composé'));
window.__grammarTests.french.expectEnglish = frTenses.some(t => t.en && t.en.includes('Subjunctive'));

true;
""")

check("T3: French has subjunctive tense",
      "window.__grammarTests.french.hasSubj")

check("T3: French has imperfect tense",
      "window.__grammarTests.french.hasImperfect")

print("\n=== TEST 4: Default Tense Configuration ===")
c.js(r"""
window.__grammarTests.defaults = {};

// Check DEFAULT_TENSE configuration
window.__grammarTests.defaults.hasConfig = typeof DEFAULT_TENSE === 'object';
window.__grammarTests.defaults.enDefault = DEFAULT_TENSE && DEFAULT_TENSE.en;
window.__grammarTests.defaults.frDefault = DEFAULT_TENSE && DEFAULT_TENSE.fr;

true;
""")

check("T4: DEFAULT_TENSE configured",
      "window.__grammarTests.defaults.hasConfig")

check("T4: English and French have default tenses",
      "(DEFAULT_TENSE && DEFAULT_TENSE.en && DEFAULT_TENSE.fr) === true || (DEFAULT_TENSE && typeof DEFAULT_TENSE.en === 'string' && typeof DEFAULT_TENSE.fr === 'string')")

print("\n=== TEST 5: Practice Worksheet Infrastructure ===")
c.js(r"""
window.__practiceCheck = {
    hasGenerate: typeof generatePracticeWorksheet === 'function',
    hasDisplay: typeof displayPracticeSession === 'function',
    hasCurrent: typeof getCurrentPracticeSession === 'function',
    hasPersist: typeof persistPracticeSession === 'function'
};

true;
""")

check("T5: Practice generation available",
      "window.__practiceCheck.hasGenerate")

check("T5: Practice display functions available",
      "window.__practiceCheck.hasDisplay && window.__practiceCheck.hasCurrent")

print("\n=== TEST 6: Practice Persistence ===")
c.js(r"""
window.__persistCheck = {
    canPersist: typeof persistPracticeSession === 'function',
    canLoad: typeof loadPracticeSession === 'function',
    canDelete: typeof deletePracticeSession === 'function'
};

true;
""")

check("T6: Session persistence functions available",
      "window.__persistCheck.canPersist && window.__persistCheck.canLoad")

print("\n=== TEST 7: Async Task Tracking ===")
c.js(r"""
window.__asyncCheck = {
    hasBegin: typeof beginAsyncTask === 'function',
    hasCancel: typeof cancelAsyncTasks === 'function'
};

true;
""")

check("T7: Async task tracking available",
      "window.__asyncCheck.hasBegin && window.__asyncCheck.hasCancel")

print("\n=== ALL GRAMMAR & PRACTICE ISOLATION TESTS PASSED ===")
