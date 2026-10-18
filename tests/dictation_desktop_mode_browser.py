"""Dictation on an Android phone in Chrome's «Desktop site» mode must not type every word several times.

CONFIRMED from the owner's phone (📋 diagnostics, 2026-10-18): the user agent said «X11; Linux x86_64», so the app took the
phone for a computer and asked for CONTINUOUS sessions; the recognizer is still Android's and in that mode re-sends each
final result at the next index, growing: «так», «Так», «Так», «Так», «Так», «Так почнемо», «Так почнемо розмову» -- and
every one was typed («так Так Так Так Так Так почнемо Так почнемо розмову»). The exact result sequences of that report are
replayed here. Now: a Linux «desktop» whose main pointer is a finger asks for one utterance per session from the start; on
any platform an engine seen to repeat/extend its own previous final replaces it instead of appending, and the next
sessions ask for one utterance (remembered on the device); a real desktop's separate finals are still appended. No network."""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
DESKTOP_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36'
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Network.enable'); c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__rec = [];
window.SpeechRecognition = class {
  constructor() { this.state = 'new'; __rec.push(this); }
  start() { this.state = 'live'; }
  stop() { if (this.state !== 'live') return; this.state = 'ended'; setTimeout(() => this.onend && this.onend(), 0); }
  abort() { this.state = 'ended'; }
  // results as the engine sends them: every entry final, resultIndex = the new one
  send(texts) { const results = texts.map(t => { const alt = [{transcript: t}]; alt.isFinal = true; return alt; });
    this.onresult && this.onresult({resultIndex: texts.length - 1, results}); }
  finish() { this.state = 'ended'; this.onend && this.onend(); }
};
window.webkitSpeechRecognition = window.SpeechRecognition;
''')


def pause(s): c.js(f'new Promise(r => setTimeout(r, {int(s * 1000)}))')


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result, c.js('JSON.stringify({value: els.askInput.value, trace: sttTrace.slice(-8)})'))
    print('PASS', name, flush=True)


def load(touch, keep_storage=False):
    c.call('Emulation.setUserAgentOverride', userAgent=DESKTOP_UA)
    c.call('Emulation.setDeviceMetricsOverride', width=412 if touch else 1200, height=900, deviceScaleFactor=2 if touch else 1, mobile=touch)
    c.call('Emulation.setTouchEmulationEnabled', enabled=touch, maxTouchPoints=5)
    for _ in range(1 if keep_storage else 2):   # the mode is read when the page loads: clear the device's memory, then load afresh
        c.call('Page.navigate', url=URL)
        c.wait("document.readyState==='complete' && !document.body.inert && typeof toggleDictation==='function'", timeout=30)
        if not keep_storage: c.js("localStorage.clear(); 1")
    c.js("(() => { %s showUpdateBanner = () => {}; showToast = () => {}; els.askPanel.classList.add('expanded'); els.askInput.value = ''; return 1; })()"
         % '')


def start():
    c.js("toggleDictation(); 1"); c.wait("dictation.wanted && recognition && recognition.state === 'live'", timeout=5)


def replay(steps):
    """Each step: the cumulative results array of one onresult event (from the phone's report)."""
    for texts in steps:
        c.js("recognition.send(%s); 1" % json.dumps(texts)); pause(.02)


def grow(prefix_empty, finals):
    """The report's pattern: some empty finals, then one more final per event."""
    base = [''] * prefix_empty
    return [base + finals[:k] for k in range(1, len(finals) + 1)]


SESSION1 = grow(3, ['так', 'Так', 'Так', 'Так', 'Так', 'Так почнемо', 'Так почнемо розмову'])
SESSION2 = grow(5, ['звук', 'звук', 'звук', 'звук відтворюється', 'звук відтворюється дуже', 'звук відтворюється дуже погано'])

# 1. The owner's phone: Chrome «Desktop site» on Android -- desktop user agent, finger as the main pointer.
load(touch=True)
check('1 a «Linux desktop» driven by a finger is taken for what it is: one utterance per session',
      "dictationSingleUtterance === true")
start()
check('1 ... the session asks for one utterance (not the continuous mode that repeats results)', "recognition.continuous === false")
replay(SESSION1)
check('1 ... the phone\'s exact result sequence types the phrase ONCE', "els.askInput.value === 'Так почнемо розмову'")

# 2. Same engine, but nothing gave the platform away (no touch): the repetition itself is detected.
load(touch=False)
check('2 a plain desktop starts in continuous mode', "dictationSingleUtterance === false")
start()
check('2 ... continuous session', "recognition.continuous === true")
replay(SESSION1)
check('2 an engine that repeats and extends its own finals: replaced, not appended', "els.askInput.value === 'Так почнемо розмову'")
check('2 ... the repetition is recorded in the diagnostics and the next sessions ask for one utterance',
      "dictationSingleUtterance === true && sttTrace.some(e => e.event === 'engine-repeats') && localStorage.getItem('reader_stt_single_utterance') === '1'")
c.js("recognition.finish(); 1"); c.wait("dictation.wanted && recognition && recognition.state === 'live'", timeout=5)
check('2 ... the restarted session is single-utterance', "recognition.continuous === false")
replay(SESSION2)
check('2 ... and the second phrase is added once', "els.askInput.value === 'Так почнемо розмову звук відтворюється дуже погано'")
load(touch=False, keep_storage=True)
check('2 ... remembered after a reload on this device', "dictationSingleUtterance === true")

# 3. A real desktop engine: separate finals that do not repeat each other are all kept.
load(touch=False)
start()
replay([['привіт'], ['привіт', 'як справи'], ['привіт', 'як справи', 'дуже добре']])
check('3 a desktop engine\'s separate finals are appended as before, nothing dropped', "els.askInput.value === 'привіт як справи дуже добре'")
check('3 ... and it stays in continuous mode', "dictationSingleUtterance === false && recognition.continuous === true")
print('ALL PASS')
