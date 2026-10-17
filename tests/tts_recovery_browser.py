"""Speech that went silent until the app was restarted (2026-10-16, user: «у застосунку пропав звук»).

Chrome on Android can leave speechSynthesis WEDGED -- after the app was in the background, or a recording / call took
the audio: (a) still "paused" (cancel() does not clear it), (b) "speaking" with nothing playing, (c) dropping every
request. Every later speak() then queued behind it in silence: the start watchdog only retried when the engine was NOT
"speaking", a second failure was silent, and nothing released the engine when the app came back.

Engine model as in tts_first_tap_browser.py (speaking/pending/paused, async start/end, 'interrupted' on cancel) plus
those three wedged states. Checks: a paused engine is resumed before speaking; a "speaking-in-silence" engine is cancelled
and the phrase retried; an engine that never starts gets ONE clear message and the buttons are released (no endless ■);
coming back to the app releases a wedged engine while nothing of ours plays; normal speech is untouched.
"""
import json, os
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP()
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__tl = []; window.__errors = []; window.__toasts = [];
addEventListener('error', e => __errors.push(e.message));
const log = (ev, extra) => __tl.push(Object.assign({ev}, extra || {}));
const synth = {
  speaking: false, pending: false, paused: false, mode: 'ok', onvoiceschanged: null, _cur: null, _queue: [], _timers: [],
  getVoices: () => [{voiceURI: 'fr-fr', name: 'French', lang: 'fr-FR', localService: true},
                    {voiceURI: 'uk-ua', name: 'Ukrainian', lang: 'uk-UA', localService: true}],
  addEventListener() {},
  _play(u) {
    this._cur = u; this.pending = true;
    this._timers.push(setTimeout(() => {
      this.pending = false; this.speaking = true; log('start', {text: u.text}); u.onstart && u.onstart({});
      this._timers.push(setTimeout(() => { this.speaking = false; this._cur = null; log('end', {text: u.text}); u.onend && u.onend({}); this._next(); }, 80));
    }, 20));
  },
  _next() { const u = this._queue.shift(); if (u && !this.paused) this._play(u); },
  cancel() {
    log('cancel'); this._timers.forEach(clearTimeout); this._timers = [];
    const cur = this._cur; this._cur = null; this.pending = false; this._queue = [];
    if (this.mode === 'stuck-speaking') this.mode = 'ok';             // a real cancel() releases a stuck engine...
    this.speaking = false;
    if (cur) setTimeout(() => cur.onerror && cur.onerror({error: 'interrupted'}), 0);
  },
  pause() { this.paused = true; log('pause'); },
  resume() { log('resume'); if (this.paused) { this.paused = false; this._next(); } },   // ...but only resume() un-pauses
  speak(u) {
    log('speak', {text: u.text, mode: this.mode, paused: this.paused});
    if (this.mode === 'dead') return;                                  // never starts, no events at all
    if (this.mode === 'stuck-speaking') { this.speaking = true; this._queue.push(u); return; }   // queued behind silence
    if (this.paused || this._cur) { this._queue.push(u); return; }
    this._play(u);
  }
};
Object.defineProperty(window, 'speechSynthesis', {configurable: true, value: synth});
window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; this.lang = ''; this.voice = null; this.rate = 1; } };
''')
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof speakInLang==='function'", timeout=30)
c.js("showToast = m => __toasts.push(m); showUpdateBanner=()=>{}; 1")


def wait_ms(ms): c.js(f'new Promise(r => setTimeout(r, {ms}))')


def check(name, expression, timeout=0):
    import time
    result = c.js(expression); deadline = time.monotonic() + timeout
    while result is not True and time.monotonic() < deadline:
        time.sleep(0.1); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def reset(mode='ok', paused=False):
    c.js(f"speechSynthesis.cancel(); speechSynthesis.mode = {json.dumps(mode)}; speechSynthesis.paused = {json.dumps(paused)}; __tl.length = 0; __toasts.length = 0; 1")
    wait_ms(120); c.js("__tl.length = 0; 1")


starts = lambda text: f"__tl.some(e => e.ev === 'start' && e.text === {json.dumps(text)})"

reset()
c.js("speakInLang('bonjour', 'fr', 'tr'); 1")
check("1 normal: an idle engine speaks at once, nothing cancelled, no resume, no message",
      starts('bonjour') + " && !__tl.some(e => e.ev === 'cancel' || e.ev === 'resume') && __toasts.length === 0", timeout=2)

reset(paused=True)
c.js("speakInLang('le chat', 'fr', 'tr'); 1")
check("2 an engine left PAUSED (after the background) is resumed before speaking: the phrase is heard at once",
      starts('le chat') + " && __tl.findIndex(e => e.ev === 'resume') < __tl.findIndex(e => e.ev === 'start') && __toasts.length === 0", timeout=2)

reset('stuck-speaking')
c.js("speakInLang('la maison', 'fr', 'tr'); 1")
check("3 an engine 'speaking' in silence: after the start watchdog it is released (cancel + resume) and the phrase is spoken (used to wait forever)",
      starts('la maison') + " && __tl.some(e => e.ev === 'cancel') && __tl.some(e => e.ev === 'resume') && __toasts.length === 0", timeout=6)

reset('dead')
c.js("window.__ended = 0; speakInLang('rien', 'fr', 'tr', 0, () => __ended++); 1")
check("4 an engine that never starts: ONE clear message after the retry, the phrase is ended (no endless ■), engine released",
      "__toasts.length === 1 && __toasts[0] === t('ttsNoSound') && __ended === 1 && state.speakingSide === null && __tl.filter(e => e.ev === 'speak').length === 2", timeout=8)
c.js("speakInLang('encore', 'fr', 'tr'); 1"); wait_ms(6000)
check("4b ... the message is not repeated on every tap", "__toasts.length === 1")

reset('ok', paused=True)
c.js("speechSynthesis.speaking = true; 1")
c.js("Object.defineProperty(document, 'hidden', {configurable: true, get: () => false}); document.dispatchEvent(new Event('visibilitychange')); 1")
check("5 back from the background with nothing of ours playing: a paused / 'speaking' engine is released",
      "__tl.some(e => e.ev === 'cancel') && __tl.some(e => e.ev === 'resume') && !speechSynthesis.paused && !speechSynthesis.speaking", timeout=2)
reset()
c.js("speakInLang('je lis', 'fr', 'tr'); 1"); wait_ms(40)
c.js("__tl.length = 0; document.dispatchEvent(new Event('visibilitychange')); 1")
check("5b ... but our own phrase that is playing is never cut by coming back", "!__tl.some(e => e.ev === 'cancel')")
check("6 every utterance in flight is held (no garbage-collected phrase without end) and released after it ends",
      "liveUtterances.size === 0", timeout=3)
check("7 the message exists in all UI languages", "['uk','en','fr','ru','zh','ko','hi','ga'].every(l => I18N.ttsNoSound[l]) && !!I18N_ES.ttsNoSound")
check("8 no page errors", "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL TTS RECOVERY CHECKS PASSED')
