"""User-reported bug (esp. noticeable in French): TTS "sounds like the same voice
plays twice with a millisecond delay". Root cause: several places in js/tts.js
(and one in js/main.js) called speechSynthesis.speak() immediately after
speechSynthesis.cancel() in the same synchronous tick (speakText, speakInLang,
stepSentence's active branch, the settings voice-preview sample) — on Android/
Chrome the just-cancelled utterance's audio tail can keep playing for a few
milliseconds and overlap with the new one, heard as "the same voice twice".
Fix: TTS_CANCEL_SPEAK_DELAY_MS gives cancel() a short head start before the next
speak(), guarded by the existing ttsGen generation counter so a rapid second
call (another tap, a fast double-step) discards the now-stale first speak()
instead of also firing it — this is the actual "no double playback" guarantee
this test exercises. speechSynthesis is mocked (no real audio in this sandbox);
the delay/guard logic under test is real. READER_TTS_URL can target production.
"""
import json, os
from browser_cdp import CDP
c = CDP(); c.sock.settimeout(40); c.call('Page.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.addScriptToEvaluateOnNewDocument', source='''
window.__errors = [];
addEventListener('error', e => __errors.push(e.message));
addEventListener('unhandledrejection', e => __errors.push(String(e.reason)));
window.__speakCalls = []; window.__cancelCalls = 0;
// window.speechSynthesis is a native read-only property — a plain assignment
// silently no-ops (non-strict mode), leaving the REAL synthesizer in place.
// Object.defineProperty is required to actually replace it, same as the
// window.Translator mock in local_translator_warmup_browser.py.
Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    getVoices: () => [
        { voiceURI: 'fr-fr', name: 'French', lang: 'fr-FR', localService: true },
        { voiceURI: 'en-us', name: 'English', lang: 'en-US', localService: true }
    ],
    cancel() { window.__cancelCalls++; },
    speak(u) { window.__speakCalls.push({ text: u.text, lang: u.lang }); },
    onvoiceschanged: null
} });
window.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; this.lang = ''; this.voice = null; this.rate = 1; this.onboundary = this.onend = this.onerror = null; }
};
''')
c.call('Page.navigate', url=os.environ.get('READER_TTS_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert && typeof TTS_CANCEL_SPEAK_DELAY_MS==='number'")


def js(expr):
    return c.js(expr)


def check(name, expr):
    value = js(expr)
    assert value is True, (name, value)
    print('PASS', name, flush=True)


DELAY = js('TTS_CANCEL_SPEAK_DELAY_MS')
assert isinstance(DELAY, (int, float)) and 0 < DELAY <= 500, DELAY
WAIT = DELAY + 80

check('speakText: cancel() happens synchronously, speak() does not', f'''(()=>{{
    window.__speakCalls.length = 0; window.__cancelCalls = 0;
    speakText('Bonjour le monde.', 'orig');
    return window.__cancelCalls === 1 && window.__speakCalls.length === 0;
}})()''')

check('speakText: the delayed speak() fires once, with the right text', f'''(async()=>{{
    await new Promise(r => setTimeout(r, {WAIT}));
    return window.__speakCalls.length === 1 && window.__speakCalls[0].text === 'Bonjour le monde.';
}})()''')

check('speakText: a second call before the delay elapses cancels the first — never both play', f'''(async()=>{{
    window.__speakCalls.length = 0; window.__cancelCalls = 0;
    speakText('First phrase.', 'orig');
    speakText('Second phrase.', 'orig');
    await new Promise(r => setTimeout(r, {WAIT}));
    return window.__speakCalls.length === 1 && window.__speakCalls[0].text === 'Second phrase.';
}})()''')

check('speakInLang: same no-double-speak guarantee', f'''(async()=>{{
    window.__speakCalls.length = 0; window.__cancelCalls = 0;
    speakInLang('Bonjour.', 'fr', 'tr');
    speakInLang('Au revoir.', 'fr', 'tr');
    await new Promise(r => setTimeout(r, {WAIT}));
    return window.__speakCalls.length === 1 && window.__speakCalls[0].text === 'Au revoir.';
}})()''')

# stepSentence(): a fast double-step (e.g. two quick taps on the next-sentence
# button) must speak only the LAST sentence landed on, never overlap two speak()
# calls for two different sentences a few ms apart.
setup = js('''(()=>{
    state.format = 'pdf';   // skip the page-turn branch, not under test here
    isSpeakingGlobal = true; state.ttsPaused = false;
    state.sourceLang = 'fr-FR';
    const node = document.createTextNode('placeholder for range');
    document.body.appendChild(node);
    const r = document.createRange(); r.setStart(node, 0); r.setEnd(node, node.length);
    state.ttsQueue = [
        { text: 'Bonjour.', range: r },
        { text: 'Salut.', range: r },
        { text: 'Ça va bien merci.', range: r }
    ];
    state.ttsIndex = 0;
    return true;
})()''')
assert setup is True

check('stepSentence: two rapid steps cancel synchronously, speak nothing yet', '''(()=>{
    window.__speakCalls.length = 0; window.__cancelCalls = 0;
    stepSentence(1);
    stepSentence(1);
    return window.__cancelCalls === 2 && window.__speakCalls.length === 0;
})()''')

check('stepSentence: only the sentence actually landed on gets spoken, exactly once', f'''(async()=>{{
    await new Promise(r => setTimeout(r, {WAIT}));
    return window.__speakCalls.length === 1 && window.__speakCalls[0].text.trim() === 'Ça va bien merci.';
}})()''')

check('no application errors', 'window.__errors.length===0 || JSON.stringify(window.__errors)')
print('ALL TTS DOUBLE-VOICE FIX CHECKS PASSED', flush=True)
