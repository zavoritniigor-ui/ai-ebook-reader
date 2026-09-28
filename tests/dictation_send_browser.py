"""Astra audit A11: Send while dictation is still running must not drop the last spoken words.

The words being spoken live as INTERIM results (shown in the dictation status, not yet in the field). Send used to
read the field and call stopDictation() without finishing -- recognition.abort() -- which discards that pending
speech; a final result arriving afterwards is ignored. Now Send first finishes recognition (stop -> the engine
finalizes the pending words -> end, bounded by the existing finish timeout), then sends exactly what is in the field.
Speech the engine never finalizes before the timeout is committed as heard. Without dictation, Send is unchanged.

SpeechRecognition is a deterministic engine model: interim/final entries, stop() finalizes pending speech after a
delay (like real engines), abort() discards it. AI entry points are stubbed; no microphone, no AI provider.
"""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1280, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__rec = []; window.__errors = []; window.__engine = {stopFinalizes: true, finalizeMs: 150, finalText: null};
addEventListener('error', e => __errors.push(e.message));
addEventListener('unhandledrejection', e => __errors.push(String(e.reason)));
window.SpeechRecognition = class {
  constructor() { this.results = []; this.state = 'new'; __rec.push(this); }
  start() { if (this.state !== 'new') throw new DOMException('already started', 'InvalidStateError'); this.state = 'live'; }
  _emit(i) { const res = this.results.map(r => { const a = [{transcript: r.text}]; a.isFinal = r.final; return a; }); this.onresult && this.onresult({resultIndex: i, results: res}); }
  interim(text) { const last = this.results.at(-1); if (last && !last.final) last.text = text; else this.results.push({text, final: false}); this._emit(this.results.length - 1); }
  final(text) { const last = this.results.at(-1); if (last && !last.final) { last.text = text; last.final = true; } else this.results.push({text, final: true}); this._emit(this.results.length - 1); }
  // A real engine answers stop() by finalizing the speech it has heard, a little later, then ending.
  stop() {
    if (this.state !== 'live') return; this.state = 'stopping';
    const pending = this.results.at(-1);
    if (!__engine.stopFinalizes) return;           // an engine that never finishes (the app's timeout must)
    setTimeout(() => {
      if (this.state !== 'stopping') return;
      if (pending && !pending.final) this.final(__engine.finalText || pending.text);
      setTimeout(() => { if (this.state === 'stopping') { this.state = 'ended'; this.onend && this.onend(); } }, 10);
    }, __engine.finalizeMs);
  }
  // abort() throws pending speech away.
  abort() { if (this.state === 'ended') return; this.state = 'ended'; setTimeout(() => { this.onerror && this.onerror({error: 'aborted'}); this.onend && this.onend(); }, 0); }
  lateFinal(text) { this.results.push({text, final: true}); this._emit(this.results.length - 1); }   // arrives after the app gave up
};
''')
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof toggleDictation==='function'", timeout=30)
c.js(r"""(() => { localStorage.clear(); showUpdateBanner = () => {}; document.getElementById('sw-update-banner')?.remove();
  window.__sent = []; window.__vision = []; window.__toasts = [];
  aiAvailable = () => true;
  startAiTask = (ctx, mode, q) => { __sent.push({mode, q, at: performance.now()}); };
  callAIVision = async (prompt) => { __vision.push(prompt); return '<p>ok</p>'; };
  const st = showToast; showToast = m => { __toasts.push(m); st(m); };
  els.askPanel.classList.add('expanded'); return 1; })()""")


def pause(s): c.js(f'new Promise(r => setTimeout(r, {int(s * 1000)}))')


def check(name, expression, timeout=0):
    deadline = time.monotonic() + timeout
    result = c.js(expression)
    while result is not True and time.monotonic() < deadline:
        time.sleep(.1); result = c.js(expression)
    assert result is True, (name, result, c.js("JSON.stringify({input: els.askInput.value, sent: __sent.map(s => s.q), vision: __vision.map(p => p.slice(0, 50)), wanted: dictation.wanted, finishing: dictation.finishing, rec: recognition && recognition.state})"))
    print('PASS', name, flush=True)


def reset():
    c.js("""(() => { if (dictation.wanted || dictation.finishing) stopDictation(); els.askInput.value = ''; __sent.length = 0; __vision.length = 0; __toasts.length = 0;
      __engine.stopFinalizes = true; __engine.finalizeMs = 150; __engine.finalText = null; aiAvailable = () => true;
      if (typeof clearAskAttachment === 'function') clearAskAttachment(); els.askPanel.classList.add('expanded'); return 1; })()""")
    pause(.3)


def mic_on():
    c.js("toggleDictation(); 1"); c.wait("dictation.wanted && recognition && recognition.state === 'live'", timeout=5)


def send():
    c.js("els.askSendBtn.click(); 1")


SENT = "(q => __sent.length === 1 && __sent[0].q === q && __sent[0].mode === 'ask')"

# 1. Typed text, no dictation: Send is unchanged -- immediate, exactly the typed text
reset(); c.js("els.askInput.value = 'Typed question'; 1"); send()
check('1 typed text -> Send: sent at once, exactly the typed text; field cleared', SENT + "('Typed question') && els.askInput.value === ''")

# 2. Dictation already completed (mic stopped), then Send
reset(); mic_on(); c.js("recognition.interim('open'); recognition.final('open the book'); 1"); c.js("toggleDictation(); 1")
c.wait("!dictation.wanted && !dictation.finishing", timeout=5); send()
check('2 completed dictation -> Send: sends the dictated text', SENT + "('open the book')")

# 3. Send while dictation is still running: the last words are only interim at that moment
reset(); mic_on(); c.js("recognition.final('Explain this'); recognition.interim('last words'); 1")
check('3 setup: last words are pending (status only, not yet in the field)', "els.askInput.value === 'Explain this' && dictationStatus.textContent === 'last words'")
send()
check('3 Send while dictating: the last spoken words are sent too', SENT + "('Explain this last words')", timeout=4)
check('3 ... dictation is stopped afterwards and the field is cleared', "!dictation.wanted && !dictation.finishing && recognition === null && els.askInput.value === ''")

# 4. The final recognition result arrives around Send: the engine's corrected final wins, no duplicate
reset(); mic_on(); c.js("__engine.finalText = 'last word'; recognition.final('Explain this'); recognition.interim('last words'); 1"); send()
check("4 final result arriving after Send: its (corrected) text is sent, the interim version is not duplicated", SENT + "('Explain this last word')", timeout=4)
# 4b. An engine that never finalizes: the bounded finish commits what was heard; a later final is ignored
reset(); mic_on(); c.js("__engine.stopFinalizes = false; recognition.final('Explain this'); recognition.interim('pending speech'); window.__oldRec = recognition; 1"); send()
pause(.5)
check('4b engine silent: nothing is sent before the finish timeout (Send does not race the shutdown)', "__sent.length === 0")
check('4b ... after the bounded timeout the heard words are committed and sent once', SENT + "('Explain this pending speech')", timeout=4)
c.js("__oldRec.lateFinal('pending speech'); 1"); pause(.3)
check('4b ... a final arriving after that is ignored (no duplicate in the field, nothing re-sent)', "__sent.length === 1 && els.askInput.value === ''")

# 5. Typed text + dictated text
reset(); c.js("els.askInput.value = 'Question:'; 1"); mic_on(); c.js("recognition.interim('why'); recognition.interim('why this'); 1"); send()
check('5 typed + dictated (pending): both sent, in order, once', SENT + "('Question: why this')", timeout=4)

# 6. Repeated Send (button x3 + Enter) while recognition finishes: exactly one send, words once
reset(); mic_on(); c.js("recognition.final('One'); recognition.interim('two three'); 1")
send(); send(); send(); c.js("els.askInput.dispatchEvent(new KeyboardEvent('keypress', {key: 'Enter', bubbles: true})); 1")
check('6 repeated Send during finishing: exactly one request, no duplicated dictated words', SENT + "('One two three')", timeout=4)
pause(.4); check('6 ... still exactly one after settling', "__sent.length === 1")

# 7. Normal reader Send path goes to startAiTask('ask') with the preserved reading context
reset(); c.js("state.lastAskContext = 'Le chat dort.'; 1"); mic_on(); c.js("recognition.interim('what does dort mean'); 1"); send()
check('7 reader Send while dictating: one Ask request with the reading context and the full question',
      "__sent.length === 1 && __sent[0].mode === 'ask' && __sent[0].q === 'what does dort mean'", timeout=4)

# 8. PDF crop Send (question + image) while dictating
reset()
c.js("""(() => { const cv = document.createElement('canvas'); cv.width = 30; cv.height = 20; cv.getContext('2d').fillRect(2, 2, 10, 5);
  attachToAsk(cv.toDataURL('image/jpeg', .9)); return 1; })()"""); pause(.3)
mic_on(); c.js("recognition.final('Check'); recognition.interim('this exercise'); 1"); send(); send()
check('8 crop Send while dictating: one vision request whose question has the last spoken words',
      "__vision.length === 1 && __vision[0].startsWith('Check this exercise') && __sent.length === 0", timeout=4)

# No AI key: Send is refused as before and dictation keeps running (nothing finished, nothing lost)
reset(); c.js("aiAvailable = () => false; 1"); mic_on(); c.js("recognition.final('Keep me'); recognition.interim('and me'); 1"); send(); pause(.4)
check('no key: Send shows the key message and dictation keeps listening (nothing stopped or lost)',
      "__toasts.includes(t('needKey')) && __sent.length === 0 && dictation.wanted && recognition.state === 'live' && els.askInput.value === 'Keep me'")
c.js("aiAvailable = () => true; 1")

check('no application errors', "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL DICTATION SEND CHECKS PASSED')
