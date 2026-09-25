"""Ask AI dictation (speech-to-text): one utterance must land in the Ask input once.

Android's (and iOS's) recognizer is a single-utterance engine. Chrome's emulated `continuous` mode there re-emits
a final result at the NEXT result index (results[0] "one" final, then results[1] "one" final), and the per-index
commit appended both ("one" -> "one one"). On those platforms each session now asks for one utterance
(continuous=false) and the existing restart loop keeps dictation going; desktop keeps continuous mode.
No text-based de-duplication: legitimate repetitions ("very very good", "no no wait") stay.

SpeechRecognition is a deterministic engine model (result list with interim/final entries, resultIndex,
async end/abort, the emulated-continuous repeat quirk switchable per run). No microphone, no AI provider.
"""
import json, os
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
DESKTOP_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
c = CDP()
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__rec = []; window.__log = []; window.__errors = []; window.__androidRepeat = false;
addEventListener('error', e => __errors.push(e.message));
addEventListener('unhandledrejection', e => __errors.push(String(e.reason)));
window.SpeechRecognition = class {
  constructor() { this.results = []; this.id = __rec.length; this.state = 'new'; __rec.push(this); }
  start() {
    if (this.state !== 'new') throw new DOMException('recognition has already started', 'InvalidStateError');
    this.state = 'live'; __log.push('start ' + this.id + (this.continuous ? ' continuous' : ' single'));
  }
  stop() { if (this.state !== 'live') return; this.state = 'stopping'; __log.push('stop ' + this.id); setTimeout(() => this._end(), 10); }
  abort() {
    if (this.state === 'ended') return; __log.push('abort ' + this.id); this.state = 'ended';
    setTimeout(() => { this.onerror && this.onerror({error: 'aborted'}); this.onend && this.onend(); }, 0);
  }
  _end() { if (this.state === 'ended') return; this.state = 'ended'; __log.push('end ' + this.id); this.onend && this.onend(); }
  _emit(resultIndex) {
    const results = this.results.map(r => { const alt = [{transcript: r.text}]; alt.isFinal = r.final; return alt; });
    this.onresult && this.onresult({resultIndex, results});
  }
  interim(text) {
    const last = this.results.at(-1);
    if (last && !last.final) last.text = text; else this.results.push({text, final: false});
    this._emit(this.results.length - 1);
  }
  final(text) {
    const last = this.results.at(-1);
    if (last && !last.final) { last.text = text; last.final = true; } else this.results.push({text, final: true});
    this._emit(this.results.length - 1);
    // Android's emulated continuous mode: the same final result again, at the next index.
    if (this.continuous && __androidRepeat) { this.results.push({text, final: true}); this._emit(this.results.length - 1); }
    if (!this.continuous) setTimeout(() => this._end(), 5);   // a single-utterance session ends after its result
  }
  error(error) { if (this.state === 'ended') return; this.onerror && this.onerror({error}); this.state = 'ended'; this.onend && this.onend(); }
};
''')


def pause(s): c.js(f'new Promise(r => setTimeout(r, {int(s * 1000)}))')


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result, c.js('JSON.stringify({value: els.askInput.value, log: __log, trace: sttTrace.slice(-12)})'))
    print('PASS', name, flush=True)


def load(ua, mobile):
    c.call('Emulation.setUserAgentOverride', userAgent=ua)
    c.call('Emulation.setDeviceMetricsOverride', width=1000, height=900, deviceScaleFactor=2 if mobile else 1, mobile=mobile)
    c.call('Emulation.setTouchEmulationEnabled', enabled=mobile, maxTouchPoints=5)
    c.call('Page.navigate', url=URL)
    c.wait("document.readyState==='complete' && !document.body.inert && typeof toggleDictation==='function'", timeout=30)
    c.js(r"""(() => { localStorage.clear(); showUpdateBanner = () => {}; showToast = m => __log.push('toast ' + m);
      window.__sent = []; aiAvailable = () => true; startAiTask = (ctx, mode, q) => __sent.push(q); return 1; })()""")


def open_ask(): c.js("els.askPanel.classList.add('expanded'); 1"); pause(.4)


def close_ask():
    c.js("document.querySelector('#ask-panel .close-panel-btn').click(); 1"); pause(.4)


def center(sel):
    return c.js("(b => ({x: b.left + b.width / 2, y: b.top + b.height / 2}))(document.querySelector(%s).getBoundingClientRect())" % json.dumps(sel))


def tap(sel, mobile):
    p = center(sel)
    if mobile: c.touch_tap(p['x'], p['y'])
    else:
        for kind in ('mousePressed', 'mouseReleased'):
            c.call('Input.dispatchMouseEvent', type=kind, x=p['x'], y=p['y'], button='left', clickCount=1)
    pause(.15)


def live(): return "__rec.filter(r => r.state === 'live' || r.state === 'stopping')"


def wait_listening(): c.wait("dictation.wanted && recognition && recognition.state === 'live'", timeout=5)


def say_final(text):
    """One utterance: the current live session produces its final result (and, single-utterance, ends)."""
    wait_listening(); c.js("recognition.final(%s); 1" % json.dumps(text)); pause(.05)


def listener_count():
    total = 0
    for sel in ('#mic-btn', '#ask-input', '#ask-send-btn', '#ask-panel'):
        oid = c.call('Runtime.evaluate', expression="document.querySelector(%s)" % json.dumps(sel))['result']['objectId']
        total += len(c.call('DOMDebugger.getEventListeners', objectId=oid)['listeners'])
    return total


def reset():
    c.js("toggleDictation.length; if (dictation.wanted || dictation.finishing) stopDictation(); els.askInput.value = ''; __sent.length = 0; __log.length = 0; 1")
    pause(.1)


# ===================== TABLET (Android Chrome, touch) =====================
load(ANDROID_UA, True)
c.js("__androidRepeat = true; 1")   # the engine quirk is ON for every tablet case below
open_ask()

# 14 + 1: one touch tap -> one start; one word said once -> once
tap('#mic-btn', True); wait_listening()
check('14 tablet: one touch tap on the mic starts exactly one recognition session',
      "__rec.length === 1 && %s.length === 1 && sttTrace.filter(e => e.event === 'toggle').length === 1 && sttTrace.find(e => e.event === 'toggle').via.startsWith('click')" % live())
check('tablet sessions ask for one utterance (the emulated continuous mode is what repeats results)', "recognition.continuous === false")
say_final('one'); pause(.1)
check('1 one word said once -> "one" (not "one one")', "els.askInput.value === 'one'")

# 2: interim "one" -> final "one"
reset(); open_ask(); tap('#mic-btn', True); wait_listening()
c.js("recognition.interim('one'); 1")
check('2 interim is shown as status only, not typed into the input', "els.askInput.value === '' && dictationStatus.textContent === 'one'")
c.js("recognition.final('one'); 1"); pause(.1)
check('2 interim "one" -> final "one" gives "one"', "els.askInput.value === 'one'")

# 3: several interim updates
reset(); open_ask(); tap('#mic-btn', True); wait_listening()
c.js("['o', 'on', 'one'].forEach(t => recognition.interim(t)); recognition.final('one'); 1"); pause(.1)
check('3 interim o / on / one -> final one gives "one"', "els.askInput.value === 'one'")

# 4: separate legitimate finals (two utterances -> two sessions on the tablet)
reset(); open_ask(); tap('#mic-btn', True)
say_final('open'); say_final('the book'); pause(.1)
check('4 two utterances "open" + "the book" -> "open the book"', "els.askInput.value === 'open the book'")
wait_listening()
check('4 ... one live recognizer at a time across the automatic restart', "%s.length === 1 && __rec.filter(r => r.state === 'new').length === 0" % live())

# 5: legitimate repetitions stay (one utterance, and repeated separate utterances)
reset(); open_ask(); tap('#mic-btn', True)
say_final('very very good'); pause(.1)
check('5 "very very good" in one utterance stays exactly', "els.askInput.value === 'very very good'")
say_final('no'); say_final('no'); say_final('wait'); pause(.1)
check('5 "no" "no" "wait" said as separate utterances all stay (no text-based dedup)', "els.askInput.value === 'very very good no no wait'")

# 8 + 9: manual text + dictation, then manual edit stays stable
reset(); open_ask()
c.js("els.askInput.value = 'Explain '; 1")
tap('#mic-btn', True); say_final('this sentence'); pause(.1)
check('8 typed "Explain " + dictated "this sentence" -> "Explain this sentence"', "els.askInput.value === 'Explain this sentence'")
c.js("els.askInput.value = 'Explain that sentence'; els.askInput.dispatchEvent(new Event('input', {bubbles: true})); 1")
wait_listening(); pause(.3)
check('9 a manual edit is not overwritten by the running dictation', "els.askInput.value === 'Explain that sentence'")
say_final('please'); pause(.1)
check('9 ... and later speech continues after the edited text', "els.askInput.value === 'Explain that sentence please'")

# 10: Send while listening, with an interim pending
reset(); open_ask(); tap('#mic-btn', True); say_final('what does it mean')
wait_listening(); c.js("window.__sendSession = recognition; recognition.interim('in this'); 1")
tap('#ask-send-btn', True)
c.js("__sendSession.final('in this'); 1"); pause(.3)
check('10 Send sends exactly the visible text, once; the pending interim is not sent or appended',
      "JSON.stringify(__sent) === JSON.stringify(['what does it mean']) && els.askInput.value === '' && !dictation.wanted && %s.length === 0" % live())

# 11 + 13: close Ask while listening; late events from the old session change nothing
reset(); open_ask(); tap('#mic-btn', True); wait_listening()
c.js("window.__old = recognition; 1"); close_ask()
check('11 closing Ask while listening stops dictation and the recognizer', "!dictation.wanted && recognition === null && __old.state === 'ended' && %s.length === 0" % live())
c.js("els.askInput.value = 'fresh'; __old.onresult && __old.onresult({resultIndex: 0, results: [Object.assign([{transcript: 'stale words'}], {isFinal: true})]}); __old.onend && __old.onend(); 1"); pause(.8)
check('13 a late result/end from an old session does not touch the input or restart anything', "els.askInput.value === 'fresh' && !dictation.wanted && %s.length === 0" % live())

# 6: open/close Ask repeatedly -- no extra listeners, one recognizer, one commit per utterance
reset(); base_listeners = listener_count(); base_rec = c.js('__rec.length')
for i in range(5):
    open_ask(); tap('#mic-btn', True); say_final('word%d' % i); pause(.05); close_ask()
check('6 five open/dictate/close cycles: each utterance committed once', "els.askInput.value === 'word0 word1 word2 word3 word4'")
assert listener_count() == base_listeners, ('6 listeners accumulated', base_listeners, listener_count())
print('PASS 6 no listeners accumulate on the mic / input / send / panel (%d before and after)' % base_listeners)
check('6 no recognizer left running after closing', "%s.length === 0 && !dictation.wanted" % live())

# 7: rapid start / stop / start
reset(); open_ask()
tap('#mic-btn', True); tap('#mic-btn', True); tap('#mic-btn', True); wait_listening(); pause(.2)
check('7 start/stop/start: exactly one live recognizer', "%s.length === 1" % live())
c.js("__rec.slice(0, -1).forEach(r => r.onresult && r.onresult({resultIndex: 0, results: [Object.assign([{transcript: 'ghost'}], {isFinal: true})]})); 1")
say_final('real'); pause(.1)
check('7 ... only the live session writes; results from the stopped ones are ignored', "els.askInput.value === 'real'")

# 12: error / permission / cancel paths
reset(); open_ask(); tap('#mic-btn', True); wait_listening()
c.js("recognition.error('not-allowed'); window.__n = __rec.length; 1"); pause(1)
check('12 permission denied: stopped, message shown, no restart', "!dictation.wanted && __rec.length === __n && __log.some(l => l.startsWith('toast ')) && els.micBtn.getAttribute('aria-pressed') === 'false'")
reset(); tap('#mic-btn', True); wait_listening()
c.js("recognition.error('no-speech'); window.__n = __rec.length; 1"); pause(1.6)  # empty session: bounded back-off (1.2 s)
check('12 no speech: one bounded restart, still one live recognizer', "dictation.wanted && __rec.length === __n + 1 && %s.length === 1" % live())
c.js("recognition.error('aborted'); 1"); pause(.3)
check('12 aborted by the engine: stops quietly (no error toast)', "!dictation.wanted && !__log.some(l => l.startsWith('toast '))")
reset(); tap('#mic-btn', True); wait_listening(); c.js("window.__n = __rec.length; recognition._end(); 1"); pause(1.6)  # empty session: bounded back-off (1.2 s)
check('12 unexpected onend: exactly one new session', "dictation.wanted && __rec.length === __n + 1 && %s.length === 1" % live())
tap('#mic-btn', True); pause(.3)
check('12 user stops: recognizer finished, mic idle', "!dictation.wanted && !dictation.finishing && %s.length === 0 && els.micBtn.textContent === '🎤'" % live())
check('sttTrace records the lifecycle (toggle/start/result/commit/end)',
      "['toggle', 'start', 'result', 'commit', 'end'].every(k => sttTrace.some(e => e.event === k))")
check('no application errors (tablet)', "__errors.length === 0 || JSON.stringify(__errors)")

# ===================== DESKTOP (mouse) =====================
load(DESKTOP_UA, False)
open_ask()
tap('#mic-btn', False); wait_listening()
check('15 desktop: one mouse click starts one continuous session (unchanged)', "__rec.length === 1 && recognition.continuous === true")
c.js("recognition.interim('open'); recognition.final('open'); recognition.interim('the'); recognition.final('the book'); 1"); pause(.1)
check('15 desktop: two finals in one continuous session -> "open the book"', "els.askInput.value === 'open the book' && __rec.length === 1")
c.js("recognition.final('very'); recognition.final('very'); recognition.final('good'); 1"); pause(.1)
check('15 desktop: legitimate repeated finals stay', "els.askInput.value === 'open the book very very good'")
tap('#mic-btn', False); pause(.3)
check('15 desktop: click stops dictation', "!dictation.wanted && %s.length === 0" % live())
check('no application errors (desktop)', "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL ASK DICTATION CHECKS PASSED')
