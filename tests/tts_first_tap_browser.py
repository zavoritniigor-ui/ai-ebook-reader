"""TTS first tap / clipped start. Every tap used to send one or two speechSynthesis.cancel() (Android:
TextToSpeech.stop()) and then speak() from an 80 ms timer, even with nothing playing -- the first request
after load could be dropped (silent first tap, second tap works) and a stop() still in flight could cut the
head of the new audio. Now an idle synthesizer is never cancelled and speaks inside the tap; only a busy one
is cancelled (then the next speak waits the short cancel delay); an utterance the engine never starts, or
that fails with a transient audio error, is spoken once more; other errors are logged, never swallowed.

speechSynthesis is replaced by a deterministic engine model (speaking/pending state, async start/end,
'interrupted' on cancel, injectable faults). With Web Speech the audio never reaches the page, so "complete
beginning" is asserted as: the engine receives the whole text from its first character and nothing cancels
it between speak() and its natural end. Real-device audio (tablet, Bluetooth) must be checked by hand.
"""
import json, os
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP()
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__tl = []; window.__faults = []; window.__warnings = []; window.__errors = [];
addEventListener('error', e => __errors.push(e.message));
const warn = console.warn.bind(console); console.warn = (...a) => { __warnings.push(a.join(' ')); warn(...a); };
const log = (ev, extra) => __tl.push(Object.assign({ev, t: performance.now()}, extra || {}));
const synth = {
  speaking: false, pending: false, paused: false, onvoiceschanged: null, _cur: null, _timers: [],
  getVoices: () => [{voiceURI: 'fr-fr', name: 'French', lang: 'fr-FR', localService: true},
                    {voiceURI: 'en-us', name: 'English', lang: 'en-US', localService: true}],
  addEventListener() {},
  cancel() {
    log('cancel'); this._timers.forEach(clearTimeout); this._timers = [];
    const cur = this._cur; this._cur = null; this.speaking = this.pending = false;
    if (cur) setTimeout(() => cur.onerror && cur.onerror({error: 'interrupted'}), 0);
  },
  speak(u) {
    const fault = __faults.shift() || null;
    // window.event is set only while an event handler runs: a speak() from a timer has none.
    log('speak', {text: u.text, fault, inEvent: window.event ? window.event.type : null});
    if (fault === 'drop') return;                        // engine swallowed it: no events at all
    this._cur = u; this.pending = true;
    if (fault) { this._timers.push(setTimeout(() => { this._cur = null; this.pending = false; u.onerror && u.onerror({error: fault}); }, 5)); return; }
    this._timers.push(setTimeout(() => {
      this.pending = false; this.speaking = true; log('start', {text: u.text}); u.onstart && u.onstart({});
      this._timers.push(setTimeout(() => { this.speaking = false; this._cur = null; log('end', {text: u.text}); u.onend && u.onend({}); }, 60 + u.text.length * 12));
    }, 30));
  }
};
Object.defineProperty(window, 'speechSynthesis', {configurable: true, value: synth});
window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; this.lang = ''; this.voice = null; this.rate = 1; } };
''')
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof handleWordOrSelection==='function'", timeout=30)


def pause(s): c.js(f'new Promise(r => setTimeout(r, {int(s * 1000)}))')


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result, c.js('JSON.stringify(__tl.map(e => [e.ev, e.text || "", Math.round(e.t)]))'))
    print('PASS', name, flush=True)


SENTENCE = "Bonjour, comment allez-vous?"
TEXT = SENTENCE + " Le chat dort sur le canapé. Il fait beau."
c.js(r"""(() => {
  localStorage.clear(); showUpdateBanner = () => {};
  state.translateMode = true; state.format = 'txt'; state.bookKey = 'tts-first-tap'; state.targetLang = 'en'; state.uiLang = 'en';
  state.speakSide = 'original'; aiTranslateText = async () => 'x'; machineTranslate = async () => ({html: 'x', extras: ''});
  const p = document.createElement('p'); p.textContent = %s; p.style.cssText = 'margin:200px 40px;font-size:22px;line-height:1.7;max-width:800px';
  els.pages.replaceChildren(p); window.__p = p; return true; })()""" % json.dumps(TEXT, ensure_ascii=False))
DELAY = c.js('TTS_CANCEL_SPEAK_DELAY_MS'); START_TIMEOUT = c.js("typeof TTS_START_TIMEOUT_MS === 'number' ? TTS_START_TIMEOUT_MS : 2500")

WORD = r"""((w) => { const walker = document.createTreeWalker(__p, NodeFilter.SHOW_TEXT); let n;
  while ((n = walker.nextNode())) { const i = n.nodeValue.indexOf(w); if (i < 0) continue;
    const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + w.length); const b = r.getBoundingClientRect(); return {x: b.left + b.width / 2, y: b.top + b.height / 2, l: b.left + 2, r: b.right - 2}; }
  return null; })"""


def tap(word):
    p = c.js(WORD + "(%s)" % json.dumps(word, ensure_ascii=False))
    for kind in ('mousePressed', 'mouseReleased'):
        c.call('Input.dispatchMouseEvent', type=kind, x=p['x'], y=p['y'], button='left', clickCount=1)


def idle():
    c.wait("!speechSynthesis.speaking && !speechSynthesis.pending && state.speakingSide === null", timeout=8)
    pause(.15)


def fresh():
    idle(); c.js("__tl.length = 0; __faults.length = 0; __warnings.length = 0; 1")


EV = "__tl.map(e => e.ev + (e.text ? ' ' + e.text : ''))"
COMPLETE = r"""(text => { const s = __tl.findIndex(e => e.ev === 'speak' && e.text === text && !e.fault);
  const end = __tl.findIndex((e, i) => i > s && e.ev === 'end' && e.text === text);
  return s >= 0 && end > s && !__tl.slice(s, end).some(e => e.ev === 'cancel'); })"""

# 1 / 3 / 9 / 11 / 12: the very first request after page load, a single word
fresh(); tap('chat'); idle()
check('1 first tap after load speaks (no second tap needed)', "%s.includes('speak chat') && %s.includes('start chat') && %s.includes('end chat')" % (EV, EV, EV))
check('1/9 first request is spoken inside the tap itself (not from a timer), no warm-up delay',
      "(s => ['click', 'pointerup', 'mouseup', 'touchend'].includes(s.inEvent) || s)(__tl.find(e => e.ev === 'speak'))")
check('11 complete beginning: the engine gets the whole word and nothing cancels it before its end', COMPLETE + "('chat')")
check('12 no double-start / cancel cycle on an idle tap: exactly one speak(), zero cancel()',
      "__tl.filter(e => e.ev === 'speak').length === 1 && !__tl.some(e => e.ev === 'cancel') || JSON.stringify(%s)" % EV)

# 2: second request
fresh(); tap('canapé'); idle()
check('2 second request: speaks at once, one speak(), no cancel()', "JSON.stringify(%s) === JSON.stringify(['speak canapé', 'start canapé', 'end canapé']) || JSON.stringify(%s)" % (EV, EV))

# 7: the same word again
fresh(); tap('canapé'); idle(); tap('canapé'); idle()
check('7 repeated same word: plays completely each time', "%s.filter(e => e === 'end canapé').length === 2 && !__tl.some(e => e.ev === 'cancel')" % EV)

# 4: a full sentence (drag selection) -- starts at its first word
fresh()
a = c.js(WORD + "('Bonjour')"); b = c.js(WORD + "('vous?')")
c.call('Input.dispatchMouseEvent', type='mouseMoved', x=a['l'], y=a['y'])
c.call('Input.dispatchMouseEvent', type='mousePressed', x=a['l'], y=a['y'], button='left', clickCount=1)
for i in range(1, 11):
    c.call('Input.dispatchMouseEvent', type='mouseMoved', x=a['l'] + (b['r'] - a['l']) * i / 10, y=a['y'], button='left', buttons=1)
    pause(.02)
c.call('Input.dispatchMouseEvent', type='mouseReleased', x=b['r'], y=b['y'], button='left', clickCount=1)
idle()
check('4 sentence: the engine gets the whole sentence from its first word, played to the end uninterrupted',
      "(sp => sp.length === 1 && sp[0].text.startsWith('Bonjour, comment allez-vous') && %s(sp[0].text))(__tl.filter(e => e.ev === 'speak'))" % COMPLETE)
c.js("els.ttCloseBtn.click(); 1"); pause(.2)

# 5: rapid A -> B
fresh(); tap('chat'); tap('beau'); idle()
check('5 rapid taps: A is cancelled, then B is spoken once, whole, and not cut',
      "(ev => ev.indexOf('speak chat') < ev.indexOf('cancel') && ev.indexOf('cancel') < ev.indexOf('speak beau') && ev.filter(e => e.startsWith('speak')).length === 2 && !ev.includes('end chat'))(%s) && %s('beau')" % (EV, COMPLETE))
check('5 B waits for the cancel to settle (no overlap with the tail of A)',
      "(() => { const c = __tl.find(e => e.ev === 'cancel'), s = __tl.find(e => e.ev === 'speak' && e.text === 'beau'); return s.t - c.t >= %d; })()" % (DELAY - 5))

# 6: a playing sentence interrupted by a word
fresh()
c.js("els.ttReplayBtn.onclick = null; speakText(%s, 'orig'); 1" % json.dumps(SENTENCE))
c.wait("__tl.some(e => e.ev === 'start')", timeout=3); pause(.1)
tap('dort'); idle()
check('6 sentence interrupted by a word: the word plays whole after the cancel; the sentence does not resume',
      "(ev => ev.includes('cancel') && !ev.includes('end ' + %s))(%s) && %s('dort')" % (json.dumps(SENTENCE), EV, COMPLETE))

# 8: open / close UI, then play
fresh(); tap('chat'); c.wait("__tl.some(e => e.ev === 'start')", timeout=3)
c.js("els.ttCloseBtn.click(); 1"); idle()
check('8 closing the popup while speaking stops it', "(ev => ev.includes('cancel') && !ev.includes('end chat'))(%s)" % EV)
c.js("__tl.length = 0; els.ttCloseBtn.click(); 1"); pause(.1)
check('8 closing an idle popup sends no cancel()', "!__tl.some(e => e.ev === 'cancel')")
tap('beau'); idle()
check('8 next word after closing plays at once and whole', "__tl[0].ev === 'speak' && __tl[0].inEvent !== null && %s('beau')" % COMPLETE)
c.js("els.ttCloseBtn.click(); 1"); pause(.2)

# 9: engine drops the first request (lazy engine initialization) -> one automatic retry
fresh(); c.js("__faults.push('drop'); 1"); tap('chat')
c.wait("__tl.some(e => e.ev === 'end')", timeout=(START_TIMEOUT + 3000) / 1000); idle()
check('9 a request the engine never starts is re-spoken once and then plays whole',
      "__tl.filter(e => e.ev === 'speak' && e.text === 'chat').length === 2 && %s('chat')" % COMPLETE)
check('9 ... and the trace shows why', "ttsTrace.some(e => e.event === 'retry:no-start')")

# 10: play errors -- transient audio error retried once; a hard error is reported, not swallowed
fresh(); c.js("__faults.push('audio-busy'); 1"); tap('dort'); idle()
check('10 transient audio error (audio-busy): retried once, then plays whole',
      "__tl.filter(e => e.ev === 'speak').length === 2 && %s('dort')" % COMPLETE)
fresh(); c.js("__faults.push('not-allowed'); 1"); tap('canapé'); pause(.5); idle()
check('10 hard error (not-allowed): not retried, logged (not swallowed), speaker UI reset',
      "__tl.filter(e => e.ev === 'speak').length === 1 && __warnings.some(w => w.includes('not-allowed')) && state.speakingSide === null && els.ttReplayBtn.textContent === '🔊'")

# global read-aloud chain still works and starts inside the click
c.js("els.ttCloseBtn.click(); 1"); fresh()
c.js("els.ttsBtn.click(); 1")
c.wait("!isSpeakingGlobal", timeout=15)
check('read-aloud: first sentence spoken inside the click, then every sentence whole, in order',
      "(sp => sp.length === 3 && sp[0].inEvent === 'click' && sp[0].text === %s)(__tl.filter(e => e.ev === 'speak')) && %s(%s) && %s('Il fait beau.')" % (json.dumps(SENTENCE), COMPLETE, json.dumps(SENTENCE), COMPLETE))
check('no application errors', "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL TTS FIRST-TAP CHECKS PASSED')
