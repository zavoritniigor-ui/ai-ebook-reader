"""Local speech engine (js/local-speech.js) wired into speakText/speakInLang.

The local server is replaced by an in-page stub (window.fetch for http://127.0.0.1:8880): /health answers,
/speak returns a short silent WAV or a configured failure. Asserts that:
- with the flag off (default) nothing is requested and the browser voice speaks as before;
- with the flag on and the server healthy, a French/English/Ukrainian phrase is sent to /speak with the
  right lang code and played through an Audio element, NOT through speechSynthesis;
- the translation speaker's onEnd fires when the audio ends;
- a server error after the request falls back to speechSynthesis for the same phrase;
- stopping during the request (stopTooltipSpeech) prevents playback;
- an unsupported language (de) never reaches the local server.
Run with the app served on READER_TEST_URL (see tests/README.md).
"""
import os
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP()
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__speakCalls = []; window.__localCalls = []; window.__played = []; window.__ended = [];
window.__localErrors = []; addEventListener('error', e => __localErrors.push(e.message));
window.__localMode = 'ok'; // ok | fail | slow | hang
window.__audioMode = 'ok'; window.__fastTimeout = false;
window.__browserDelay = 30; window.__browserCancels = 0;
const originalTimeout = window.setTimeout;
window.setTimeout = (fn, ms, ...args) => originalTimeout(fn, __fastTimeout && ms === 20000 ? 80 : ms, ...args);
window.__healthy = true;
const realFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  if (!url.startsWith('http://127.0.0.1:8880')) return realFetch(input, init);
  if (url.endsWith('/health')) return new Response(JSON.stringify({ok: true}), {status: __healthy ? 200 : 503});
  const body = JSON.parse(init.body);
  __localCalls.push(body);
  if (__localMode === 'fail') return new Response('{"error":"boom"}', {status: 500});
  const delay = __localMode === 'hang' ? 60000 : __localMode === 'slow' ? 400 : 20;
  await new Promise((resolve, reject) => {
    const t = setTimeout(resolve, delay);
    init.signal && init.signal.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('aborted', 'AbortError')); });
  });
  return new Response(silentWav(), {status: 200, headers: {'Content-Type': 'audio/wav'}});
};
function silentWav() {
  const n = 2400, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const s = (o, str) => [...str].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  s(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); s(8, 'WAVE'); s(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 24000, true); v.setUint32(28, 48000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  s(36, 'data'); v.setUint32(40, n * 2, true);
  return new Blob([buf], {type: 'audio/wav'});
}
const origPlay = HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.play = function () {
  __played.push(this.src.slice(0, 5));
  if (__audioMode === 'hold') return Promise.resolve();
  if (__audioMode === 'fail') {
    queueMicrotask(() => this.onerror && this.onerror(new Event('error')));
    return Promise.reject(new Error('test decode error'));
  }
  return origPlay.call(this);
};
const synth = {
  speaking: false, pending: false, paused: false, onvoiceschanged: null, _cur: null,
  getVoices: () => [{voiceURI: 'fr-fr', name: 'French', lang: 'fr-FR', localService: true},
                    {voiceURI: 'en-us', name: 'English', lang: 'en-US', localService: true}],
  addEventListener() {}, cancel() { __browserCancels++; clearTimeout(this._timer); this.speaking = false; this.pending = false; },
  speak(u) {
    __speakCalls.push(u.text); this.speaking = true;
    this._timer = setTimeout(() => { this.speaking = false; if (u.onend) u.onend({}); }, __browserDelay);
  }
};
Object.defineProperty(window, 'speechSynthesis', {configurable: true, value: synth});
window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; this.lang = ''; this.voice = null; this.rate = 1; } };
localStorage.setItem('reader_local_speech', '1');
''')
c.call('Page.navigate', url=URL)
try:
    c.wait("document.readyState==='complete' && !document.body.inert && typeof speakInLang==='function' && typeof speakViaLocal==='function'", timeout=30)
except TimeoutError:
    print('Startup diagnostics:', c.js('({url:location.href,ready:document.readyState,inert:document.body.inert,speech:typeof speakViaLocal,errors:window.__localErrors})'))
    raise


def pause(s): c.js(f'new Promise(r => setTimeout(r, {int(s * 1000)}))')


failures = []


def check(name, expression):
    result = c.js(expression)
    print(('PASS ' if result else 'FAIL ') + name)
    if not result:
        failures.append(name)


def user_gesture():
    # Headless Chrome blocks audio.play() until the user has interacted with the page.
    c.call('Input.dispatchMouseEvent', type='mousePressed', x=5, y=5, button='left', clickCount=1)
    c.call('Input.dispatchMouseEvent', type='mouseReleased', x=5, y=5, button='left', clickCount=1)


def reset():
    user_gesture()
    c.js('__speakCalls.length = 0; __localCalls.length = 0; __played.length = 0; __ended.length = 0; __localMode = "ok"; __audioMode = "ok"; __fastTimeout = false; __browserDelay = 30; __browserCancels = 0; __healthy = true; localSpeechHealth = {at: 0, ok: false}; stopTooltipSpeech(); true')
    c.js('refreshLocalSpeech(); true'); pause(0.3)


# 1. Health is advisory and fetched in the background.
reset()
c.js('refreshLocalSpeech(); true'); pause(0.3)
check('health cached as ok', 'localSpeechHealth.ok === true')

# 2. French phrase goes to the local server and plays through Audio, not speechSynthesis.
reset()
c.js('speakInLang("Bonjour, je lis ce livre.", "fr", "translation", 0, () => __ended.push("fr")); true')
pause(0.8)
check('fr sent to /speak with lang fr', '__localCalls.some(b => b.lang === "fr" && b.text.startsWith("Bonjour"))')
check('fr played via audio element', '__played.length >= 1')
check('fr did not use speechSynthesis', '__speakCalls.length === 0')
check('fr onEnd fired on audio end', '__ended.includes("fr")')

# 3. English phrase through speakText (the tooltip speaker path).
reset()
c.js('speakText("This is an English test sentence.", "original", 0, null); true')
pause(0.8)
check('en sent to /speak with lang en', '__localCalls.some(b => b.lang === "en")')
check('en did not use speechSynthesis', '__speakCalls.length === 0')

# 4. Ukrainian phrase: local only, lang uk.
reset()
c.js('speakInLang("Привіт, це тест українського голосу.", "uk", "translation", 0, null); true')
pause(0.8)
check('uk sent to /speak with lang uk', '__localCalls.some(b => b.lang === "uk")')

# 5. Unsupported language never reaches the local server.
reset()
c.js('speakInLang("Guten Tag.", "de", "translation", 0, null); true')
pause(0.5)
check('de never sent to local server', '__localCalls.length === 0')

# 6. Server error after the request falls back to speechSynthesis for the same phrase.
reset()
c.js('__localMode = "fail"; speakInLang("Bonjour le monde.", "fr", "translation", 0, null); true')
pause(0.8)
check('failed local request falls back to browser voice', '__speakCalls.includes("Bonjour le monde.")')
check('failed local request did not play audio', '__played.length === 0')

# 7. Stopping while the request is in flight prevents playback.
reset()
c.js('__localMode = "slow"; speakInLang("Bonjour, arrêt pendant le chargement.", "fr", "translation", 0, null); true')
pause(0.1)
c.js('stopTooltipSpeech(); true')
pause(0.8)
check('stop during request: no audio played', '__played.length === 0')

# 8. Flag off: nothing reaches the local server, browser voice speaks as before.
reset()
c.js('localStorage.setItem("reader_local_speech", "0"); localSpeechHealth = {at: 0, ok: false}; speakInLang("Bonjour.", "fr", "translation", 0, null); true')
pause(0.6)
check('flag off: no local request', '__localCalls.length === 0')
check('flag off: browser voice speaks', '__speakCalls.includes("Bonjour.")')
c.js('localStorage.setItem("reader_local_speech", "1"); true')

# 9. First tap uses the server even while health is unknown/unavailable.
reset()
c.js('localSpeechHealth = {at: 0, ok: false}; __healthy = false; speakInLang("Bonjour, première lecture.", "fr", "tr"); true')
pause(0.7)
check('first tap requests server before health succeeds', '__localCalls.length === 1 && __played.length === 1 && __speakCalls.length === 0')


def page(text):
    c.js('stopGlobalTTS(); true')
    reset()
    import json
    c.js("state.format = 'pdf'; state.sourceLang = 'fr-FR'; state.altVoices = false; els.pages.innerHTML = '<p></p>'; els.pages.firstChild.textContent = " + json.dumps(text) + "; window.getSelection().removeAllRanges(); true")


# The real startTTS range builder, per-sentence highlight and audio completion chain.
page('Bonjour les amis. Nous lisons un livre.')
c.js('startTTS(); true')
c.wait('__localCalls.length === 2 && !isSpeakingGlobal', timeout=8)
check('whole page reads both sentences locally in order', '__localCalls.map(x => x.text).join("|") === "Bonjour les amis.|Nous lisons un livre." && __speakCalls.length === 0')
check('page completion releases audio and highlight', 'localSpeechAudio === null && (!ttsHighlightSupported() || !CSS.highlights.has(TTS_HL_NAME))')

page('Bonjour les amis. Nous lisons un livre.')
c.js("const n = els.pages.firstChild.firstChild; const r = document.createRange(); r.setStart(n, 18); r.setEnd(n, n.length); window.getSelection().addRange(r); startTTS(); true")
c.wait('__localCalls.length === 1 && !isSpeakingGlobal', timeout=8)
check('selected text reads only its own range through server', '__localCalls.length === 1 && __localCalls[0].text === "Nous lisons un livre." && __speakCalls.length === 0')

page('Bonjour les amis. Nous lisons un livre.')
c.js('__localMode = "slow"; startTTS(); true')
pause(0.1)
c.js('pauseTTS(); true')
pause(0.6)
check('pause cancels pending server response without advancing', 'isSpeakingGlobal && state.ttsPaused && state.ttsIndex === 0 && __played.length === 0 && __speakCalls.length === 0')
c.js('__localMode = "ok"; resumeTTS(); true')
c.wait('__localCalls.length === 3 && !isSpeakingGlobal', timeout=8)
check('resume restarts paused sentence then completes page', '__localCalls[0].text === __localCalls[1].text && __played.length === 2 && __speakCalls.length === 0')

page('Bonjour les amis. Nous lisons un livre. Une belle journée.')
c.js('__localMode = "slow"; startTTS(); true')
pause(0.1)
c.js('stepSentence(1); stepSentence(1); true')
pause(0.8)
check('rapid next discards superseded server speech', '__localCalls.length === 2 && __localCalls[1].text === "Une belle journée." && __played.length === 1 && __speakCalls.length === 0')

page('Bonjour les amis. Nous lisons un livre.')
c.js('__localMode = "slow"; startTTS(); true')
pause(0.1)
c.js('stopGlobalTTS(); true')
pause(0.6)
check('stop prevents late audio, fallback and queue continuation', '!isSpeakingGlobal && __played.length === 0 && __localCalls.length === 1 && __speakCalls.length === 0')

page('Bonjour les amis. Nous lisons un livre.')
c.js('__audioMode = "fail"; startTTS(); true')
c.wait('__speakCalls.length === 2 && !isSpeakingGlobal', timeout=8)
check('decode error plus play rejection falls back once per sentence, without skipping', '__speakCalls.join("|") === "Bonjour les amis.|Nous lisons un livre." && __localCalls.length === 2')

page('Bonjour les amis. Nous lisons un livre.')
c.js('__fastTimeout = true; __localMode = "hang"; startTTS(); true')
c.wait('__speakCalls.length === 2 && !isSpeakingGlobal', timeout=8)
check('hung speech request falls back and offline queue avoids repeated waits', '__localCalls.length === 1 && __played.length === 0 && __speakCalls.join("|") === "Bonjour les amis.|Nous lisons un livre."')
c.js('__fastTimeout = false; true')

page('Bonjour les amis. Nous lisons un livre.')
c.js('__localMode = "slow"; startTTS(); true')
pause(0.1)
c.js('document.getElementById("btn-local-speech").click(); true')
c.wait('__speakCalls.length === 2 && !isSpeakingGlobal', timeout=8)
check('turning local voice off restarts current sentence via browser and finishes queue', '!localSpeechEnabled() && __localCalls.length === 1 && __played.length === 0 && __speakCalls.join("|") === "Bonjour les amis.|Nous lisons un livre."')
c.js('localStorage.setItem("reader_local_speech", "1"); true')

page('Bonjour les amis. Nous lisons un livre.')
c.js('__audioMode = "hold"; startTTS(); true')
c.wait('localSpeechAudio !== null', timeout=5)
c.js('window.__oldEnd = localSpeechAudio.onended; pauseTTS(); __oldEnd(); true')
pause(0.4)
check('late ended event after pause cannot move sentence or restart speech', 'state.ttsPaused && state.ttsIndex === 0 && __localCalls.length === 1 && __speakCalls.length === 0 && localSpeechAudio === null')
c.js('stopGlobalTTS(); true')

page('Bonjour les amis. Nous lisons un livre.')
c.js('__localMode = "slow"; speakInLang("Un ancien message.", "fr", "tr"); startTTS(); true')
c.wait('__localCalls.length === 3 && !isSpeakingGlobal', timeout=8)
check('starting page cancels previous popup audio and keeps reading queue intact', '__played.length === 2 && __speakCalls.length === 0 && state.speakingSide === null')

page('Bonjour les amis. Nous lisons un livre.')
c.js('__localMode = "fail"; __browserDelay = 500; startTTS(); true')
c.wait('__speakCalls.length === 1 && speechSynthesis.speaking', timeout=5)
c.js('document.getElementById("btn-local-speech").click(); true')
c.wait('!isSpeakingGlobal', timeout=8)
check('disabling local voice during browser fallback cancels it before restarting, without queued duplicate', '__browserCancels === 1 && __speakCalls.join("|") === "Bonjour les amis.|Bonjour les amis.|Nous lisons un livre." && !speechSynthesis.speaking && __played.length === 0')

# Cyrillic text must not inherit the FR/EN segmenter's English fallback.
c.js('localStorage.setItem("reader_local_speech", "1"); true')
page('Перевіряємо серверне читання українського речення.')
c.js('startTTS(); true')
c.wait('__localCalls.length === 1 && !isSpeakingGlobal', timeout=8)
check('Ukrainian page uses Ukrainian server voice even with French book prior', '__localCalls[0].lang === "uk" && __played.length === 1 && __speakCalls.length === 0')

page('Skip this sentence. Перевіряємо виділене українське речення.')
c.js('(()=>{ const textNode = els.pages.firstChild.firstChild; const selected = document.createRange(); selected.setStart(textNode,20); selected.setEnd(textNode,textNode.length); window.getSelection().addRange(selected); startTTS(); return true; })()')
c.wait('__localCalls.length === 1 && !isSpeakingGlobal', timeout=8)
check('selected Ukrainian text keeps its language and exact selected range', '__localCalls[0].lang === "uk" && __localCalls[0].text === "Перевіряємо виділене українське речення." && __speakCalls.length === 0')

# Suites share browser storage: leave the opt-in server feature disabled for subsequent suites.
c.js('stopGlobalTTS(); localStorage.removeItem("reader_local_speech"); true')

print('FAILURES: %d' % len(failures))
if failures:
    raise SystemExit(1)
