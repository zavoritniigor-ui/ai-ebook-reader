"""🩺 Sound and microphone diagnostics (Settings): the reader reproduces a problem on their own device, presses
«Скопіювати діагностику» and pastes the text to the developer (2026-10-16: dictation doubling words could not be
diagnosed without the recognizer's own results). Checks: the section is in Settings in every UI language; the report is
valid JSON with the dictation trace (every result, commit and the field text after it), the speech engine state, the
voices and the TTS trace; no AI key ever appears in it; a refused clipboard shows the text selected for a manual copy.
SpeechRecognition is the same engine model as ask_dictation_browser.py.
"""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
c = CDP()
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__rec = []; window.__log = []; window.__errors = []; window.__androidRepeat = false; window.__times = [];
addEventListener('error', e => __errors.push(e.message));
addEventListener('unhandledrejection', e => __errors.push(String(e.reason)));
window.SpeechRecognition = class {
  constructor() { this.results = []; this.id = __rec.length; this.state = 'new'; __rec.push(this); }
  start() {
    if (this.state !== 'new') throw new DOMException('recognition has already started', 'InvalidStateError');
    this.state = 'live'; __log.push('start ' + this.id + (this.continuous ? ' continuous' : ' single'));
    __times.push({id: this.id, event: 'start', t: performance.now()});
  }
  stop() { if (this.state !== 'live') return; this.state = 'stopping'; __log.push('stop ' + this.id); setTimeout(() => this._end(), 10); }
  abort() {
    if (this.state === 'ended') return; __log.push('abort ' + this.id); this.state = 'ended';
    setTimeout(() => { this.onerror && this.onerror({error: 'aborted'}); this.onend && this.onend(); }, 0);
  }
  _end() { if (this.state === 'ended') return; this.state = 'ended'; __log.push('end ' + this.id); __times.push({id: this.id, event: 'end', t: performance.now()}); this.onend && this.onend(); }
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


def check(name, expression, timeout=0):
    result = c.js(expression); deadline = time.monotonic() + timeout
    while result is not True and time.monotonic() < deadline:
        time.sleep(0.1); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


c.call('Emulation.setUserAgentOverride', userAgent=ANDROID_UA)
c.call('Emulation.setDeviceMetricsOverride', width=412, height=915, deviceScaleFactor=2, mobile=True)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof toggleDictation==='function' && !!document.getElementById('diag-box')", timeout=30)
c.js("localStorage.clear(); showUpdateBanner = () => {}; state.groqKey = 'gsk-SECRET-123456'; state.openaiKey = 'sk-SECRET-abcdef'; state.apiKey = 'AIza-SECRET-xyz'; 1")

# a dictation in the Ask panel: two utterances, the second one replaying the end of the first (the reported symptom)
c.js("els.askPanel.classList.add('expanded'); els.askInput.value = ''; toggleDictation(); 1")
c.js("__rec.at(-1).interim('я читаю'); __rec.at(-1).final('я читаю книгу'); 1"); time.sleep(0.1)
c.js("__rec.at(-1).interim('книгу французькою'); __rec.at(-1).final('читаю книгу французькою'); 1"); time.sleep(0.1)
c.js("toggleDictation(); 1"); time.sleep(0.2)

c.js("openKeySettings(); 1")
check("1 Settings has the diagnostics section with its button, labelled in the menu language",
      "!!document.querySelector('#settings-modal #diag-box #diag-copy') && document.getElementById('diag-copy').textContent === t('diagCopy') && document.getElementById('diag-copy').offsetHeight >= 44")
c.call('Browser.grantPermissions', permissions=['clipboardReadWrite', 'clipboardSanitizedWrite'], origin=URL.split('/index.html')[0])
c.js("window.__copied = null; navigator.clipboard.writeText = async (x) => { window.__copied = x; }; document.getElementById('diag-copy').click(); 1")
check("2 the button copies the report and says so", "typeof __copied === 'string' && document.getElementById('diag-status').textContent === t('diagCopied')", timeout=3)
rep = json.loads(c.js("__copied"))
tr = rep['dictation']['trace']
assert any(e['event'] == 'result' for e in tr) and any(e['event'] == 'commit' for e in tr), [e['event'] for e in tr]
assert any(e['event'] == 'field' and 'книгу' in e.get('tail', '') for e in tr), tr
assert rep['dictation']['singleUtterancePerSession'] is True and rep['dictation']['supported'] is True
print('PASS 3 the report holds the dictation trace: every result, each commit and what the field showed after it', flush=True)
assert 'engine' in rep['speech'] and isinstance(rep['speech']['voiceList'], list) and 'trace' in rep['speech'] and rep['languages']['menu']
assert rep['app'].startswith('core.js v=') and rep['userAgent'].startswith('Mozilla')
print('PASS 4 ... and the speech engine state, voices, TTS trace, languages and app version', flush=True)
raw = c.js("__copied")
assert 'SECRET' not in raw and 'gsk-' not in raw and 'sk-SECRET' not in raw and 'AIza' not in raw
print('PASS 5 no AI key appears anywhere in the report', flush=True)
c.js("navigator.clipboard.writeText = async () => { throw new Error('denied'); }; document.getElementById('diag-copy').click(); 1")
check("6 a refused clipboard shows the text selected in a box for a manual copy",
      "(() => { const a = document.getElementById('diag-text'); return !a.hidden && a.value.includes('dictation') && document.activeElement === a && a.selectionEnd - a.selectionStart === a.value.length && document.getElementById('diag-status').textContent === t('diagCopyManual'); })()", timeout=3)
check("7 the texts exist in all UI languages (es included)",
      "['diagTitle','diagHint','diagCopy','diagCopied','diagCopyManual'].every(k => ['uk','en','fr','ru','zh','ko','hi','ga'].every(l => I18N[k] && I18N[k][l]) && I18N_ES[k])")
check("8 no page errors", "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL DIAGNOSTICS CHECKS PASSED')
