"""A Practice save that fails is visible and recoverable (Phase A, P1).

Before the fix persistPracticeSession() swallowed a storage error (quota exceeded, storage blocked) with
console.warn only: the learner saw a normal reading and believed it was saved, and Regenerate even
deleted the previous -- still valid -- stored session although the new one never reached storage.

Now: the in-memory reading stays usable, a toast (once per failure episode) and a persistent banner with
a "Retry save" button tell the learner it is not saved, the previously stored session is kept, and a
later successful save clears the warning. Storage failure is injected by making Storage.setItem throw a
QuotaExceededError for Practice keys only.
"""
import json, os, time
from browser_cdp import CDP
from practice_fixtures import VERBS_FR, to_json

c = CDP(); c.sock.settimeout(45)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1100, height=1000, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert")
c.js("localStorage.clear();showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove()")
c.call('Page.reload')

def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.monotonic() + timeout
    while result is not True and time.monotonic() < deadline:
        time.sleep(0.1)
        result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name)

def install_harness():
    """Mocked AI reply, a Practice-only storage fault switch, and a toast recorder (re-run after reload)."""
    c.wait("document.readyState==='complete' && !document.body.inert && typeof persistPracticeSession==='function'")
    c.js(r'''
    showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove();
    window.__mock = ''' + to_json(VERBS_FR) + r''';
    const realCallAI = callAI;
    callAI = async (prompt, signal, task, ...rest) => task === 'practice_reading' ? JSON.stringify(__mock) : realCallAI(prompt, signal, task, ...rest);
    window.__failPractice = false;
    const realSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(k, v) {
        if (window.__failPractice && String(k).startsWith('practice_')) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        return realSetItem.call(this, k, v);
    };
    window.__toasts = [];
    const realToast = showToast;
    showToast = msg => { __toasts.push(msg); realToast(msg); };
    window.__ctx = { sourceText: 'Il parle et se plaint.', sourceLanguage: 'fr', targetLanguage: 'uk', bookId: null, mode: 'verbs',
                     lemmas: ['parler', 'plaindre'], seenForms: [], level: null };
    true''')

failToasts = "__toasts.filter(m=>m===t('practiceSaveFailed')).length"
banner = "document.querySelectorAll('#practice-panel #practice-save-warning')"
latest = "localStorage.getItem(PRACTICE_SESSION_LATEST_KEY)"
storedSession = lambda expr: f"(()=>{{try{{const s=JSON.parse(localStorage.getItem(PRACTICE_SESSION_PREFIX+{expr}));return isValidPracticeSession(s)&&s.status==='ready'?s.id:null}}catch(e){{return null}}}})()"

def regenerate_via_ui():
    c.js("window.__prevId=getCurrentPracticeSession().id;document.getElementById('practice-regenerate').click()")
    c.wait("getCurrentPracticeSession()?.status==='ready' && getCurrentPracticeSession().id!==__prevId && !!document.querySelector('#practice-panel .practice-reading')", timeout=10)

install_harness()

# ---- TEST 1: successful save: normal behaviour, no warning --------------------------------------------------
c.js("(async()=>{const s=await generatePracticeReading(__ctx);displayPracticeSession(s);window.__firstId=s.id})()")
c.wait("window.__firstId && !!document.querySelector('#practice-panel .practice-reading')", timeout=10)
check('T1 saved session is in storage and is the restore target', f"{storedSession('__firstId')}===__firstId && {latest}===__firstId")
check('T1 no warning: no banner, no toast, nothing unsaved', f"{banner}.length===0 && {failToasts}===0 && !isPracticeSessionUnsaved(getCurrentPracticeSession())")
first_raw = c.js("localStorage.getItem(PRACTICE_SESSION_PREFIX+__firstId)")

# ---- TEST 2: storage throws: work stays in memory, failure is visible, app stays usable ---------------------
c.js("__failPractice=true")
regenerate_via_ui()
c.js("window.__unsavedId=getCurrentPracticeSession().id")
check('T2 new reading stays in memory and on screen', "getCurrentPracticeSession().status==='ready' && isValidPracticeReading(getCurrentPracticeSession().reading) && document.querySelector('#practice-panel .practice-reading').textContent.includes(getCurrentPracticeSession().reading.paragraphs[0].slice(0,30))")
check('T2 session is marked unsaved', "isPracticeSessionUnsaved(getCurrentPracticeSession())")
check('T2 persistent banner with a Retry-save button is visible', f"""{banner}.length===1 && {banner}[0].getAttribute('role')==='alert' && {banner}[0].offsetParent!==null
    && {banner}[0].textContent.includes(t('practiceSaveFailed')) && !!{banner}[0].querySelector('button')""")
check('T2 a toast told the learner once', f"{failToasts}===1 && document.getElementById('reader-toast')?.textContent===t('practiceSaveFailed')")
check('T2 the unsaved session was NOT written', f"localStorage.getItem(PRACTICE_SESSION_PREFIX+__unsavedId)===null")
check('T2 app remains usable: Practice controls still respond', "!!document.getElementById('practice-regenerate') && !document.getElementById('practice-regenerate').disabled && !document.body.inert")

# ---- TEST 3: repeated failed saves do not spam ---------------------------------------------------------------
c.js("for (let i=0;i<5;i++) retryPracticeSave()")
c.js("document.querySelector('#practice-save-warning button').click()")
regenerate_via_ui()  # another full failed generation+save while the episode is still open
c.js("window.__unsavedId=getCurrentPracticeSession().id")
check('T3 still exactly one toast and one banner after 7 more failed saves', f"{failToasts}===1 && {banner}.length===1")
check('T3 latest unsaved session is the one tracked', "isPracticeSessionUnsaved(getCurrentPracticeSession())")

# ---- TEST 5: failure never deletes/replaces the previously valid stored session ------------------------------
check('T5 previous session still stored, byte-identical, and still the restore target', f"localStorage.getItem(PRACTICE_SESSION_PREFIX+__firstId)==={json.dumps(first_raw)} && {latest}===__firstId")

# ---- TEST 4: failure followed by a successful retry: data saved, warning cleared ------------------------------
c.js("__failPractice=false;document.querySelector('#practice-save-warning button').click()")
check('T4 retry saved the current session and made it the restore target', f"{storedSession('__unsavedId')}===__unsavedId && {latest}===__unsavedId")
check('T4 warning cleared', f"{banner}.length===0 && !isPracticeSessionUnsaved(getCurrentPracticeSession())")
saved_reading = c.js("JSON.stringify(getCurrentPracticeSession().reading)")
check('T4 stored copy equals the in-memory reading', f"JSON.stringify(JSON.parse(localStorage.getItem(PRACTICE_SESSION_PREFIX+__unsavedId)).reading)===JSON.stringify(getCurrentPracticeSession().reading)")
c.js("__failPractice=true")
regenerate_via_ui()
check('T4 a NEW failure episode notifies again (once)', f"{failToasts}===2 && {banner}.length===1")
c.js("__failPractice=false")
c.js("persistCriticalState()")  # app going to background retries the pending save too
check('T4 background persist retries the save and clears the warning', f"{banner}.length===0 && {storedSession('getCurrentPracticeSession().id')}===getCurrentPracticeSession().id")
c.js("window.__savedId=getCurrentPracticeSession().id")

# ---- TEST 6: reload never claims unsaved data was persisted ---------------------------------------------------
c.js("__failPractice=true")
regenerate_via_ui()
unsaved = c.js("getCurrentPracticeSession().id")
saved = c.js("__savedId")
check('T6 setup: last save failed', "isPracticeSessionUnsaved(getCurrentPracticeSession())")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof getCurrentPracticeSession==='function'")
time.sleep(.3)
restored = c.js("getCurrentPracticeSession()?.id || null")
assert restored == saved and restored != unsaved, ('T6 restore', restored, saved, unsaved)
print('PASS T6 reload restores the last session that really was saved, never the unsaved one')
check('T6 the unsaved session does not exist in storage', f"localStorage.getItem(PRACTICE_SESSION_PREFIX+{json.dumps(unsaved)})===null")

print('ALL PRACTICE SAVE FAILURE TESTS PASSED')
