# Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
# Copying, modification, distribution or commercial use without written permission is prohibited.
"""Google Translate's voice when the device's own cannot speak (owner's phone, 2026-11-22: Android 10, Chrome 157 —
every word ended «synthesis-failed» twice in the 📋 trace, the owner's speech server unreachable: no sound at all).

The engine is a deterministic model (as tests/tts_first_tap_browser.py) with injectable faults; <audio> is recorded,
nothing plays. Checked: a phrase the device fails twice is read by Google's voice in its language; the session then
goes straight to Google (no more failed attempts per word); reading aloud continues after Google's phrase ends;
stopping speech stops Google's audio; a long phrase is read in pieces of ≤ 180 characters; offline / refused audio
ends the phrase as a failure (the reading is not left hanging); the production CSP allows the audio, and the app
sends no Referer to other sites (Google's voice answers 404 to one).
"""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
c = CDP()
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__tl = []; window.__faults = []; window.__errors = []; window.__plays = []; window.__audioFails = false;
addEventListener('error', e => __errors.push(e.message));
const log = (ev, extra) => __tl.push(Object.assign({ev}, extra || {}));
const synth = {
  speaking: false, pending: false, paused: false, onvoiceschanged: null, _cur: null, _timers: [],
  getVoices: () => [{voiceURI: 'fr-fr', name: 'French', lang: 'fr-FR', localService: true},
                    {voiceURI: 'en-us', name: 'English', lang: 'en-US', localService: true}],
  addEventListener() {},
  cancel() { this._timers.forEach(clearTimeout); this._timers = []; const cur = this._cur; this._cur = null; this.speaking = this.pending = false;
    if (cur) setTimeout(() => cur.onerror && cur.onerror({error: 'interrupted'}), 0); },
  speak(u) {
    const fault = __faults.shift() || null; log('speak', {text: u.text, fault});
    this._cur = u; this.pending = true;
    if (fault) { this._timers.push(setTimeout(() => { this._cur = null; this.pending = false; u.onerror && u.onerror({error: fault}); }, 5)); return; }
    this._timers.push(setTimeout(() => { this.pending = false; this.speaking = true; u.onstart && u.onstart({});
      this._timers.push(setTimeout(() => { this.speaking = false; this._cur = null; log('end', {text: u.text}); u.onend && u.onend({}); }, 40)); }, 20));
  }
};
Object.defineProperty(window, 'speechSynthesis', {configurable: true, value: synth});
window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; this.lang = ''; this.voice = null; this.rate = 1; } };
// Google's voice: every <audio> recorded; it "ends" a little later unless paused.
window.Audio = function (src) {
  const a = { src, paused: false, onended: null, onerror: null,
    play() { __plays.push({src, a}); if (__audioFails) return Promise.reject(new Error('NotAllowedError'));
      setTimeout(() => { if (!a.paused && a.onended) a.onended(); }, 60); return Promise.resolve(); },
    pause() { a.paused = true; } };
  return a;
};
''')
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof speakText==='function'", timeout=30)
c.js("localStorage.clear(); showUpdateBanner = () => {}; state.uiLang = 'en'; 1")


def pause(s): c.js(f'new Promise(r => setTimeout(r, {int(s * 1000)}))')


def check(name, expression, timeout=0):
    deadline = time.monotonic() + timeout
    result = c.js(expression)
    while result is not True and time.monotonic() < deadline:
        time.sleep(.1); result = c.js(expression)
    assert result is True, (name, result, c.js("JSON.stringify({tl: __tl, plays: __plays.map(p => p.src), trace: ttsTrace.slice(-12), errors: __errors})"))
    print('PASS', name, flush=True)


PLAYED = "__plays.map(p => new URL(p.src).searchParams.get('q') + '|' + new URL(p.src).searchParams.get('tl'))"

# ---------------------------------------------------------------- the device fails: Google reads it
c.js("__faults.push('synthesis-failed', 'synthesis-failed'); window.__ended = 0; speakText('Bonjour', 'orig', 0, () => __ended++); 1")
check('1 a word the device fails twice («synthesis-failed») is read by Google\'s voice, in French',
      f"JSON.stringify({PLAYED}) === JSON.stringify(['Bonjour|fr']) && __tl.filter(e => e.ev === 'speak').length === 2 && new URL(__plays[0].src).host === 'translate.googleapis.com'", timeout=3)
check('1b when Google\'s phrase ends, the phrase counts as spoken (its end hook runs)', "__ended === 1", timeout=3)
check('1c the 📋 trace says so', "ttsTrace.some(e => e.event === 'google') && ttsTrace.some(e => e.event === 'google-end')")
c.js("__tl.length = 0; __plays.length = 0; speakText('Le chat', 'orig'); 1")
check('2 then the device is not asked again: the next word goes straight to Google', f"__tl.filter(e => e.ev === 'speak').length === 0 && JSON.stringify({PLAYED}) === JSON.stringify(['Le chat|fr'])", timeout=3)

# ---------------------------------------------------------------- stop, long text, failure
c.js("__plays.length = 0; speakText('Une phrase à arrêter', 'orig'); stopTooltipSpeech(); 1")
check('3 stopping speech stops Google\'s audio', "__plays.length === 1 && __plays[0].a.paused === true", timeout=2)
long = ('Une phrase assez longue pour être découpée en morceaux par la voix de Google, ' * 4).strip()
c.js(f"__plays.length = 0; speakText({json.dumps(long)}, 'orig'); 1")
check('4 a long phrase is read in pieces of at most 180 characters, in turn', f"__plays.length >= 2 && {PLAYED}.every(q => q.split('|')[0].length <= 180) && {PLAYED}.map(q => q.split('|')[0]).join(' ') === {json.dumps(long)}", timeout=5)
c.js("__plays.length = 0; __audioFails = true; window.__ended = 0; speakText('Hors ligne', 'orig', 0, () => __ended++); 1")
check('5 Google\'s voice refused too: the phrase ends (as a failure), nothing is left hanging', "__plays.length === 1 && __ended === 1 && ttsTrace.some(e => e.event === 'google-failed')", timeout=3)
c.js("__audioFails = false; 1")

# ---------------------------------------------------------------- the production CSP
CSP = next(l for l in open(os.path.join(ROOT, '_headers')) if 'Content-Security-Policy' in l)
media = CSP.split('media-src')[1].split(';')[0]
assert 'https://translate.googleapis.com' in media and "'self'" in media and 'blob:' in media, media
print('PASS 6 the production CSP lets the audio of translate.googleapis.com play (media-src only)')
# Google's voice answers 404 to a request that names the page it comes from (Referer: https://ai-ebook-reader.pages.dev/
# → 404 text/html; no Referer → 200 audio/mpeg, checked 2026-11-22). The owner's phone had «google-failed» on every word.
# The app sends its address only to itself (its own /api functions still see it); <audio> has no referrerpolicy of its own.
RP = next(l for l in open(os.path.join(ROOT, '_headers')) if 'Referrer-Policy' in l).split(':', 1)[1].strip()
assert RP in ('same-origin', 'no-referrer'), RP
print('PASS 6b the app names itself to no other site (Referrer-Policy: %s), so Google\'s voice answers' % RP)
check('7 no page errors', "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL PASS')
