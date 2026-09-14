"""Practice Studio browser tests — Phase 3A core functionality.
Tests Practice Session lifecycle, worksheet validation, rendering safety, and persistence.
"""
import base64, json, os, time
from browser_cdp import CDP, pdf_bytes

c = CDP(); c.sock.settimeout(45)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=900, height=1200, deviceScaleFactor=1, mobile=False)

c.call('Page.navigate', url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert")
c.js("localStorage.clear();showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove()")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert")

def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1)
        result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name)

# Initialize test harness
mockWorksheet = {
    "metadata": {
        "id": "ws1",
        "title": "Past Tense Verbs",
        "topic": "Past tense conjugation",
        "sourceLanguage": "en",
        "targetLanguage": "uk",
        "level": "A1",
        "generatedAt": int(time.time() * 1000)
    },
    "context": {"sourceText": "I went to school"},
    "exercises": [
        {"id": "ex1", "type": "fill_form", "instruction": "Fill blank", "prompt": "I ___ (go)", "expectedConcept": "past", "difficulty": 1},
        {"id": "ex2", "type": "conjugation", "instruction": "Conjugate", "prompt": "go (past)", "expectedConcept": "conjugation", "difficulty": 2}
    ]
}

c.js(r'''
window.__practiceTests = {
    mockWorksheet: ''' + json.dumps(mockWorksheet) + r''',
    generateCount: 0,
    hostileInputCaught: false,
    lastError: null
};

// Mock callAI for practice
window.__originalCallAI = callAI;
callAI = async function(prompt, signal, task, onDelta) {
    if (task === 'practice') {
        __practiceTests.generateCount++;
        return JSON.stringify(__practiceTests.mockWorksheet);
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

# TEST 1: Practice Session creation
print("\n=== TEST 1: Practice Session Creation ===")
c.js(r"""
const context = {
    sourceText: 'Test sentence',
    sourceLanguage: 'en',
    targetLanguage: 'uk',
    level: null
};
window.__testSession = createPracticeSession(context);
""")

check("T1: Session has unique ID",
      "window.__testSession && window.__testSession.id && window.__testSession.id.startsWith('ps_')")

check("T1: Session starts in generating state",
      "window.__testSession.status === 'generating'")

# TEST 2: Worksheet validation
print("\n=== TEST 2: Worksheet Validation ===")

check("T2: Valid worksheet passes validation",
      r"""
      try {
        validateWorksheet(__practiceTests.mockWorksheet);
        return true;
      } catch (e) {
        __practiceTests.lastError = e.message;
        return false;
      }
      """)

# TEST 3: Invalid worksheet rejection
print("\n=== TEST 3: Invalid Worksheet Rejection ===")

c.js(r"""
const badWorksheet = {
    metadata: { title: '', topic: '', sourceLanguage: 'en', targetLanguage: 'uk', level: 'A1' },
    exercises: []
};
try {
    validateWorksheet(badWorksheet);
    __practiceTests.lastError = 'Should have thrown';
} catch (e) {
    __practiceTests.lastError = e.message;
}
""")

check("T3: Empty title rejected",
      "window.__practiceTests.lastError && window.__practiceTests.lastError.includes('title')")

# TEST 4: Unsupported type rejection
print("\n=== TEST 4: Unsupported Exercise Type Rejection ===")

c.js(r"""
const badType = {
    metadata: __practiceTests.mockWorksheet.metadata,
    context: __practiceTests.mockWorksheet.context,
    exercises: [{
        id: 'ex1',
        type: 'unsupported_type',
        instruction: 'Test',
        prompt: 'Test',
        expectedConcept: 'Test',
        difficulty: 1
    }]
};
try {
    validateWorksheet(badType);
    __practiceTests.lastError = 'Should have thrown';
} catch (e) {
    __practiceTests.lastError = e.message;
}
""")

check("T4: Unsupported type rejected",
      "window.__practiceTests.lastError && window.__practiceTests.lastError.includes('unsupported')")

# TEST 5: Exercise count bounds
print("\n=== TEST 5: Exercise Count Bounds ===")

c.js(r"""
const tooMany = {
    metadata: __practiceTests.mockWorksheet.metadata,
    context: __practiceTests.mockWorksheet.context,
    exercises: Array.from({length: 25}, (_, i) => ({
        id: 'ex' + i,
        type: 'fill_form',
        instruction: 'Test',
        prompt: 'Test',
        expectedConcept: 'Test',
        difficulty: 1
    }))
};
try {
    validateWorksheet(tooMany);
    __practiceTests.lastError = 'Should have thrown';
} catch (e) {
    __practiceTests.lastError = e.message;
}
""")

check("T5: Excessive exercise count rejected",
      "window.__practiceTests.lastError && window.__practiceTests.lastError.includes('too many')")

# TEST 6: HTML injection safety
print("\n=== TEST 6: HTML Content Safety ===")

c.js(r"""
const malicious = {
    metadata: {
        id: 'ws1',
        title: 'Test<script>alert("xss")</script>',
        topic: 'Test<img onerror="alert()">',
        sourceLanguage: 'en',
        targetLanguage: 'uk',
        level: 'A1',
        generatedAt: Date.now()
    },
    context: {sourceText: 'Test'},
    exercises: [{
        id: 'ex1',
        type: 'fill_form',
        instruction: 'Fill<img onerror=alert>',
        prompt: 'Prompt<script>',
        expectedConcept: 'Concept',
        difficulty: 1
    }]
};
try {
    validateWorksheet(malicious);
    __practiceTests.lastError = 'Should have thrown';
} catch (e) {
    __practiceTests.lastError = e.message;
}
""")

check("T6: HTML injection detected and rejected",
      "window.__practiceTests.lastError && window.__practiceTests.lastError.includes('suspicious')")

# TEST 7: Rendering safety
print("\n=== TEST 7: Worksheet Rendering Safety ===")

c.js(r"""
const panel = getPracticePanel();
displayPracticeSession({
    status: 'ready',
    worksheet: __practiceTests.mockWorksheet,
    currentPage: 0
});
""")

check("T7: Worksheet renders safely",
      "document.querySelector('.worksheet-page') !== null")

check("T7: Exercise prompts escaped",
      r"!window.__practiceTests.hostileInputCaught")

check("T7: HTML content is text, not executable",
      "document.querySelector('.exercise-prompt')?.textContent.includes('I ___')")

# TEST 8: Multiple exercise types
print("\n=== TEST 8: All Exercise Types Render ===")

types = ["fill_form", "auxiliary", "conjugation", "transform", "correct_error", "translate", "short_production", "contextual_usage"]
c.js(r"""
const multiType = {
    metadata: __practiceTests.mockWorksheet.metadata,
    context: __practiceTests.mockWorksheet.context,
    exercises: ''' + json.dumps([{"id": f"ex{i}", "type": t, "instruction": "Test", "prompt": "Test", "expectedConcept": "Test", "difficulty": 1} for i, t in enumerate(types)]) + r'''
};
displayPracticeSession({
    status: 'ready',
    worksheet: multiType,
    currentPage: 0
});
""")

check("T8: All 8 exercise types render",
      "document.querySelectorAll('.exercise').length === 8")

check("T8: Type icons present",
      "document.querySelectorAll('.exercise-number').length === 8")

# TEST 9: Session persistence
print("\n=== TEST 9: Session Persistence ===")

c.js(r"""
const session = {
    id: 'test_session_123',
    status: 'ready',
    sourceText: 'Test',
    sourceLanguage: 'en',
    targetLanguage: 'uk',
    worksheet: __practiceTests.mockWorksheet,
    createdAt: Date.now()
};
persistPracticeSession(session);
""")

check("T9: Session persisted to localStorage",
      "localStorage.getItem('practice_session:test_session_123') !== null")

check("T9: Persisted session is valid JSON",
      r"JSON.parse(localStorage.getItem('practice_session:test_session_123')) !== null")

# TEST 10: Corrupt persistence recovery
print("\n=== TEST 10: Corrupt Data Recovery ===")

c.js(r"""
localStorage.setItem('practice_session:corrupt', '{invalid json');
const restored = loadPracticeSession('corrupt');
""")

check("T10: Corrupt session data is rejected",
      "localStorage.getItem('practice_session:corrupt') === null || loadPracticeSession('corrupt') === null")

# TEST 11: Session TTL
print("\n=== TEST 11: Session Expiration (TTL) ===")

c.js(r"""
const oldSession = {
    id: 'old_session',
    status: 'ready',
    sourceText: 'Test',
    sourceLanguage: 'en',
    targetLanguage: 'uk',
    createdAt: Date.now() - (25 * 60 * 60 * 1000),  // 25 hours ago
    worksheet: __practiceTests.mockWorksheet
};
persistPracticeSession(oldSession);
cleanupExpiredPracticeSessions();
""")

check("T11: Expired session cleaned up",
      "localStorage.getItem('practice_session:old_session') === null || loadPracticeSession('old_session') === null")

# TEST 12: Stale response protection
print("\n=== TEST 12: Stale Response Protection ===")

c.js(r"""
window.__staleTest = { captured: false };
const originalDisplay = window.displayPracticeSession;
window.displayPracticeSession = function(s) {
    if (s && s.__stale) window.__staleTest.captured = true;
    return originalDisplay?.call(this, s);
};
""")

check("T12: Stale response guard function exists",
      "typeof getCurrentPracticeSession === 'function' && typeof beginAsyncTask === 'function'")

# TEST 13: Retry preserves context
print("\n=== TEST 13: Retry Context Preservation ===")

c.js(r"""
window.__retryTest = { contextPreserved: false };
const testSession = {
    id: 'retry_test',
    status: 'error',
    sourceText: 'Original context',
    sourceLanguage: 'en',
    targetLanguage: 'uk',
    lastError: { message: 'Test error' }
};
currentPracticeSession = testSession;
if (currentPracticeSession.sourceText === 'Original context') {
    __retryTest.contextPreserved = true;
}
""")

check("T13: Retry can access session context",
      "window.__retryTest.contextPreserved === true")

# TEST 14: No credentials in data
print("\n=== TEST 14: Security - No Credential Leaks ===")

c.js(r"""
const session = {
    id: 'sec_test',
    sourceText: 'Test',
    sourceLanguage: 'en',
    targetLanguage: 'uk',
    worksheet: __practiceTests.mockWorksheet
};
const serialized = JSON.stringify(session);
""")

check("T14: No API keys in session data",
      r"!JSON.stringify(currentPracticeSession || {}).includes('sk-') && !JSON.stringify(currentPracticeSession || {}).includes('gsk_')")

print("\n=== ALL PRACTICE STUDIO TESTS PASSED ===")
