"""User-reported: TTS still sounds "doubled, with an echo a fraction of a
millisecond apart" even after the earlier cancel()->speak() timing fix
(tts_double_voice_browser.py). Root cause, separate and additional: every real
speak site set utterance.lang from our OWN hardcoded canonical language string
('fr-FR'/'uk-UA'/etc via LANG_TAGS or voiceForLangCode's fullLang) while setting
utterance.voice INDEPENDENTLY from whichever real voice pickBestVoice/the user's
saved choice resolved to — and that voice's OWN .lang can differ from our
canonical string (pickBestVoice/voiceForLangCode only filter by a 2-letter
PREFIX, e.g. a real device's best French voice might be 'fr-CA', not 'fr-FR').
A mismatched utterance.lang/utterance.voice pair is a documented way to confuse
Android's bridge to the system TTS engine into trying to satisfy BOTH signals at
once, which can play the utterance twice, nearly simultaneously — exactly an
"echo, milliseconds apart", and unlike the earlier timing bug, this ALSO happens
with zero cancel() involved (the plain speakSegment->onend->speakSegment chain
during continuous page reading), which is why the earlier fix alone didn't
fully resolve the report.

Fix: setUtteranceVoice(u, lang, voice) in js/tts.js — always derives
utterance.lang from the ACTUALLY SELECTED voice's own .lang when a voice was
found, and only falls back to our canonical lang string when no voice was
resolved (letting the synthesizer pick its own default for that hint). Applied
at all three real speak sites (speakText, speakInLang, speakCurrentSentence's
per-segment loop) plus the settings voice-preview sample in js/main.js, which
already happened to do it correctly and is now using the same shared helper.

speechSynthesis is mocked (this sandbox can't play real audio) with two voices
whose own .lang deliberately differs from our canonical mapping (fr-CA instead
of fr-FR, en-GB instead of en-US) — exactly the real-world mismatch scenario —
to prove utterance.lang always ends up matching utterance.voice.lang.
READER_TTS_URL can target production.
"""
import os
from browser_cdp import CDP

c = CDP()
c.call('Network.enable'); c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.addScriptToEvaluateOnNewDocument', source='''
window.__errors = [];
addEventListener('error', e => __errors.push(e.message));
addEventListener('unhandledrejection', e => __errors.push(String(e.reason)));
window.__speakCalls = [];
Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    getVoices: () => [
        { voiceURI: 'fr-ca-voice', name: 'French Canada', lang: 'fr-CA', localService: true },
        { voiceURI: 'en-gb-voice', name: 'English UK', lang: 'en-GB', localService: true }
    ],
    cancel() {},
    speak(u) {
        window.__speakCalls.push({ text: u.text, lang: u.lang, voiceLang: u.voice ? u.voice.lang : null });
        if (u.onend) setTimeout(() => u.onend(), 0);
    },
    onvoiceschanged: null
} });
window.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; this.lang = ''; this.voice = null; this.rate = 1; this.onboundary = this.onend = this.onerror = null; }
};
''')
c.call('Page.navigate', url=os.environ.get('READER_TTS_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert && typeof setUtteranceVoice==='function'")


def js(expr):
    return c.js(expr)


def check(name, expr):
    value = js(expr)
    assert value is True, (name, value)
    print('PASS', name, flush=True)


js("state.selectedVoiceURIByLang.fr='fr-ca-voice'; state.selectedVoiceURIByLang.en='en-gb-voice'")

# setUtteranceVoice() itself: the core contract.
check('setUtteranceVoice: lang follows the voice when one is given', '''(()=>{
    const u = new SpeechSynthesisUtterance('x');
    setUtteranceVoice(u, 'fr-FR', { lang: 'fr-CA' });
    return u.lang === 'fr-CA';
})()''')
check('setUtteranceVoice: falls back to the given lang when no voice', '''(()=>{
    const u = new SpeechSynthesisUtterance('x');
    setUtteranceVoice(u, 'fr-FR', null);
    return u.lang === 'fr-FR' && u.voice === null;
})()''')

# speakText (tooltip original-text speaker) — real call, real voice resolution.
js("window.__speakCalls.length=0; speakText('Bonjour le monde.', 'orig')")
c.js('new Promise(r=>setTimeout(r,150))')
check('speakText: utterance.lang matches the actually selected voice, not fr-FR', '''
    window.__speakCalls.length===1 && window.__speakCalls[0].lang === window.__speakCalls[0].voiceLang && window.__speakCalls[0].lang === 'fr-CA'
''')

# speakInLang (tooltip translation speaker) — real call, real voice resolution.
js("window.__speakCalls.length=0; speakInLang('Hello there.', 'en', 'tr')")
c.js('new Promise(r=>setTimeout(r,150))')
check('speakInLang: utterance.lang matches the actually selected voice, not en-US', '''
    window.__speakCalls.length===1 && window.__speakCalls[0].lang === window.__speakCalls[0].voiceLang && window.__speakCalls[0].lang === 'en-GB'
''')

# speakCurrentSentence's per-segment loop (continuous page reading) — the path
# with NO cancel() at all, so the earlier timing fix alone could never cover it.
setup = js('''(()=>{
    state.format = 'txt';
    isSpeakingGlobal = true; state.ttsPaused = false; state.altVoices = false;
    state.sourceLang = 'fr-FR';
    const node = document.createTextNode('placeholder'); document.body.appendChild(node);
    const r = document.createRange(); r.setStart(node, 0); r.setEnd(node, node.length);
    state.ttsQueue = [{ text: 'Bonjour le monde.', range: r }];
    state.ttsIndex = 0;
    return true;
})()''')
assert setup is True
js("window.__speakCalls.length=0; speakCurrentSentence()")
c.js('new Promise(r=>setTimeout(r,150))')
check('speakCurrentSentence: continuous reading also matches voice, no cancel() involved', '''
    window.__speakCalls.length===1 && window.__speakCalls[0].lang === window.__speakCalls[0].voiceLang && window.__speakCalls[0].lang === 'fr-CA'
''')

check('no application errors', 'window.__errors.length===0 || JSON.stringify(window.__errors)')
print('ALL TTS LANG/VOICE MISMATCH CHECKS PASSED', flush=True)
