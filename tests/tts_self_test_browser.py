"""🔊 Voice test in the 🩺 diagnostics (owner, 2026-10-18: «add a sound test so I can send you from the phone how the voice works»).

The trace alone cannot say what the reader HEARD (the phone's report showed speak → start → end while the reader said the
translation was not voiced). The test speaks three phrases -- the book's language and the translation language with the voice
the app picks, then the translation language with no voice chosen, straight to the system engine -- and the reader marks each
✅ heard / ❌ not heard. Checked with the engine model of tts_recovery_browser.py: the three phrases are spoken in that order
with the right languages and voices; each row records the engine's start/end and timings; an engine that never starts is
recorded as such and the test still finishes (bounded); the answers and all of it are in the 📋 report (speech.selfTest);
nothing of the reader's settings changes. No network."""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=412, height=860, deviceScaleFactor=2, mobile=True)
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
c.wait("document.readyState==='complete' && !document.body.inert && typeof speakInLang==='function' && !!document.getElementById('tts-test-run')", timeout=30)
c.js("showToast = m => __toasts.push(m); showUpdateBanner=()=>{}; localStorage.clear(); state.targetLang = 'uk'; state.sourceLang = 'fr'; loadVoices(); 1")


def ok(name, cond, detail=None):
    assert cond, (name, detail)
    print('PASS', name, flush=True)


def run_test(timeout=60):
    c.js("document.getElementById('btn-ai-key').click(); document.getElementById('tts-test-run').click(); 1")
    deadline = time.time() + timeout
    while time.time() < deadline:
        if c.js("document.querySelectorAll('#tts-test-rows .tts-test-row').length === 3 && !document.getElementById('tts-test-run').disabled"): return
        time.sleep(0.2)
    raise AssertionError(('voice test did not finish', c.js("JSON.stringify(ttsSelfTest)")))


before = c.js("JSON.stringify([state.speakSide, state.selectedVoiceURIByLang, state.targetLang])")
run_test()
st = json.loads(c.js("JSON.stringify(ttsSelfTest)"))
spoken = c.js("__tl.filter(e => e.ev === 'speak').map(e => e.text)")
ok('1 three phrases are spoken in order: the book language, then the translation language twice', spoken == ['Bonjour, ceci est un test du son.', 'Привіт, це перевірка звуку.', 'Привіт, це перевірка звуку.'], spoken)
p = st['phrases']
ok('2 phrase 1 uses the app\'s voice for French, phrase 2 the app\'s Ukrainian voice, phrase 3 no voice (system default)',
   p[0]['how'] == 'app-voice' and p[0]['voice']['uri'] == 'fr-fr' and p[1]['voice']['uri'] == 'uk-ua' and p[2]['how'] == 'system-default-voice' and p[2]['voice'] is None, p)
ok('3 each phrase records the engine starting and ending, with timings', all(x['startMs'] is not None and x['ms'] >= x['startMs'] and [e['ev'] for e in x['events']][-1] == 'end' for x in p), p)
ok('3b ... the app path\'s own trace events are kept (speak, start, end)', [e['ev'] for e in p[1]['events']][:3] == ['speak', 'start', 'end'], p[1]['events'])
c.js("document.querySelectorAll('#tts-test-rows .tts-test-row')[0].querySelectorAll('button')[0].click(); document.querySelectorAll('#tts-test-rows .tts-test-row')[1].querySelectorAll('button')[1].click(); 1")
rep = json.loads(c.js("buildDiagnosticsReport()"))['speech']['selfTest']
ok('4 the reader\'s answers (heard / not heard / not answered) are in the 📋 report', [x['heard'] for x in rep['phrases']] == [True, False, None], rep)
ok('4b ... with the voice count and the engine state', rep['voices'] == 2 and rep['engine'] == {'speaking': False, 'pending': False, 'paused': False}, rep)
ok('5 the reader\'s settings are untouched (spoken side, chosen voices, translation language)', c.js("JSON.stringify([state.speakSide, state.selectedVoiceURIByLang, state.targetLang])") == before)

c.js("speechSynthesis.mode = 'dead'; 1")
t0 = time.time(); run_test(timeout=70)
p = json.loads(c.js("JSON.stringify(ttsSelfTest)"))['phrases']
ok('6 an engine that never starts: every phrase says so (no start; the app path its retry / no-sound, the system one a timeout) and the test still ends',
   all(x['startMs'] is None for x in p) and any(e['ev'].startswith('retry') or e['ev'] == 'no-sound' for e in p[1]['events']) and p[2]['events'][-1]['ev'] == 'timeout', p)
ok('6b ... in bounded time', time.time() - t0 < 60, time.time() - t0)
ok('7 the labels exist in all 8 menu languages', c.js("['ttsTestRun','ttsTestPlaying','ttsTestAnswer','ttsTestHeard','ttsTestNotHeard','ttsTestSystem','ttsTestNoVoice'].every(k => ['uk','en','fr','ru','zh','ko','hi','ga'].every(l => typeof I18N[k][l] === 'string' && I18N[k][l].length))"))
ok('8 nothing threw', c.js("__errors.length") == 0, c.js("__errors"))
print('ALL PASS')
