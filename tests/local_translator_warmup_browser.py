"""Offline translation readiness (js/translation.js): Chrome's on-device
Translator API needs its language pack downloaded BEFORE the device goes
offline — but the pack only downloads on first use, and the normal AI-first
translation path (aiTranslateText) almost always wins while online, so
translateLocally() rarely ran and the pack was never fetched ahead of time.
warmLocalTranslator() proactively starts that download in the background
(from updateSourceLang() when a book/chapter's language is detected, and from
the target-language <select>'s change handler) as soon as both languages of
the pair are known — silently, without touching the reading-progress
indicator, which the actual foreground download (a real translateLocally()
call) still updates. The real Translator API is mocked (this sandbox can't
download real language packs); the warm-up wiring, guards, and the
progress-UI split are real. READER_TTS_URL can target production.
"""
import json, os
from browser_cdp import CDP
c = CDP(); c.sock.settimeout(40); c.call('Page.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.addScriptToEvaluateOnNewDocument', source='''
window.__errors=[];
addEventListener('error',e=>__errors.push(e.message));
addEventListener('unhandledrejection',e=>__errors.push(String(e.reason)));
''')
c.call('Page.navigate', url=os.environ.get('READER_TTS_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert")


def js(expr):
    return c.js(expr)


def check(name, expr):
    v = js(expr)
    assert v is True, (name, v)
    print('PASS', name, flush=True)


setup = js('''(()=>{
    // A fake on-device Translator: every pack is "downloadable" and reports
    // one progress tick, so we can see exactly whether that tick reached the
    // reading-progress indicator (it must not, for a silent background warm-up).
    window.__createCalls = [];
    window.__progressWrites = [];
    const nativeSetter = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent').set;
    Object.defineProperty(els.progress, 'textContent', {
        set(v) { window.__progressWrites.push(v); nativeSetter.call(this, v); },
        get() { return this.textContent0 || ''; },
        configurable: true
    });
    window.Translator = {
        async availability() { return 'downloadable'; },
        async create(opts) {
            window.__createCalls.push({ src: opts.sourceLanguage, tgt: opts.targetLanguage });
            if (opts.monitor) {
                const listeners = [];
                opts.monitor({ addEventListener: (name, fn) => listeners.push(fn) });
                listeners.forEach(fn => fn({ loaded: 0.5 }));
            }
            return { translate: async (text) => '[local] ' + text };
        }
    };
    return true;
})()''')
assert setup is True

# ---- 1. Background warm-up starts the download but never touches the
# reading-progress indicator (that element also shows "page X of Y"). --------
r1 = js('''(async()=>{
    localTranslators.clear(); window.__progressWrites = []; window.__createCalls = [];
    await warmLocalTranslator('en', 'fr');
    await new Promise(r => setTimeout(r, 20));
    return { progressWrites: window.__progressWrites, createCalls: window.__createCalls };
})()''')
assert r1['progressWrites'] == [], r1
assert r1['createCalls'] == [{'src': 'en', 'tgt': 'fr'}], r1
print('PASS silent background warm-up starts the download without touching the progress indicator', flush=True)

# ---- 2. A real foreground translation (translateLocally) still shows the
# download-progress feedback — unchanged prior behavior. ---------------------
r2 = js('''(async()=>{
    localTranslators.clear(); window.__progressWrites = []; window.__createCalls = [];
    const result = await translateLocally('bonjour', 'fr', 'uk');
    return { result, progressWrites: window.__progressWrites, createCalls: window.__createCalls };
})()''')
assert r2['result'] == '[local] bonjour', r2
assert any('50' in p for p in r2['progressWrites']), r2
assert r2['createCalls'] == [{'src': 'fr', 'tgt': 'uk'}], r2
print('PASS a real (foreground) local translation still shows download progress', flush=True)

# ---- 3. updateSourceLang() (a book/chapter's language becomes known) warms
# up the pair for the CURRENT target language. -------------------------------
r3 = js('''(async()=>{
    localTranslators.clear(); window.__createCalls = [];
    els.pages.innerText = 'This is an English sentence for testing purposes only, long enough to detect.';
    state.targetLang = 'fr';
    updateSourceLang();
    await new Promise(r => setTimeout(r, 20));
    return { sourceLang: state.sourceLang, createCalls: window.__createCalls };
})()''')
assert r3['sourceLang'].startswith('en'), r3
assert r3['createCalls'] == [{'src': 'en', 'tgt': 'fr'}], r3
print('PASS updateSourceLang() warms up the detected book language -> current target language', flush=True)

# ---- 4. Changing the target language warms up the NEW pair too. -----------
r4 = js('''(async()=>{
    localTranslators.clear(); window.__createCalls = [];
    state.sourceLang = 'fr-FR';
    els.targetLang.value = 'uk';
    els.targetLang.onchange({ target: els.targetLang });
    await new Promise(r => setTimeout(r, 20));
    return { targetLang: state.targetLang, createCalls: window.__createCalls };
})()''')
assert r4['targetLang'] == 'uk', r4
assert r4['createCalls'] == [{'src': 'fr', 'tgt': 'uk'}], r4
print('PASS changing the target language warms up the new pair', flush=True)

# ---- 5. Guards: no warm-up while offline, and no warm-up for same-language
# "pairs" (nothing to translate). ---------------------------------------------
r5 = js('''(async()=>{
    localTranslators.clear(); window.__createCalls = [];
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    await warmLocalTranslator('en', 'fr');
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    await warmLocalTranslator('en', 'en');
    return window.__createCalls;
})()''')
assert r5 == [], r5
print('PASS warm-up skips when offline or when source/target languages are the same', flush=True)

# ---- 6. Idempotent: repeated warm-up calls for the same pair only start the
# download once (the existing getLocalTranslator cache, unchanged). ----------
r6 = js('''(async()=>{
    localTranslators.clear(); window.__createCalls = [];
    await Promise.all([warmLocalTranslator('en', 'ru'), warmLocalTranslator('en', 'ru'), warmLocalTranslator('en', 'ru')]);
    return window.__createCalls.length;
})()''')
assert r6 == 1, r6
print('PASS repeated warm-up calls for the same language pair only start one download', flush=True)

check('no application errors', '__errors.length===0 || JSON.stringify(__errors)')

print('ALL LOCAL-TRANSLATOR WARM-UP CHECKS PASSED')
