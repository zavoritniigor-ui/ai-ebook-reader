"""Every translation language has a flag and is spoken with the best voice OF THAT LANGUAGE: Chrome's real voice list
(Google voices) gives ru/zh/ko/hi their own voice, Simplified Chinese never gets the Cantonese zh-HK voice, an Android
network voice beats the local one, and a language the device has no voice for (Irish) is NOT read with another
language's voice -- the reader gets a notice instead. No network."""
import os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof loadVoices==='function'", timeout=30)
c.js("localStorage.clear(); 1")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof loadVoices==='function'", timeout=30)


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


check('1 every translation language option starts with a flag',
      "[...document.getElementById('target-lang').options].every(o => /^\\p{Regional_Indicator}{2} /u.test(o.textContent))")

# The voice list headless Chrome reports (same names/locales as desktop Chrome), zh-HK and zh-TW put FIRST on purpose.
c.js("""(() => { window.__spoken = []; window.__toasts = []; showToast = m => __toasts.push(m);
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; this.voice = null; this.lang = ''; } };
  const g = (name, lang) => ({name, lang, voiceURI: name, localService: false, default: false});
  window.__chromeVoices = [g('Google 粤語（香港）', 'zh-HK'), g('Google 國語（臺灣）', 'zh-TW'), g('Google 普通话（中国大陆）', 'zh-CN'),
    g('Google Deutsch', 'de-DE'), g('Google US English', 'en-US'), g('Google español de Estados Unidos', 'es-US'), g('Google español', 'es-ES'),
    g('Google français', 'fr-FR'), g('Google हिन्दी', 'hi-IN'), g('Google 한국의', 'ko-KR'), g('Google русский', 'ru-RU')];
  window.__voiceList = __chromeVoices;
  ttsSynth = { getVoices: () => __voiceList, cancel() {}, addEventListener() {}, speaking: false, pending: false, paused: false,
    speak(u) { __spoken.push({voice: u.voice && u.voice.voiceURI, lang: u.lang, text: u.text}); setTimeout(() => u.onend && u.onend(new Event('end')), 0); } };
  loadVoices(); return 1; })()""")

for code, text, voice in [('ru', 'Привет', 'Google русский'), ('zh', '你好', 'Google 普通话（中国大陆）'), ('ko', '안녕하세요', 'Google 한국의'),
                          ('hi', 'नमस्ते', 'Google हिन्दी'), ('de', 'Hallo', 'Google Deutsch'), ('es', 'Hola', 'Google español')]:
    c.js("__spoken = []; speakInLang(%r, %r, 'tr'); 1" % (text, code)); time.sleep(0.3)
    check('2 %s translation is spoken with %s' % (code, voice), "__spoken.length === 1 && __spoken[0].voice === %r" % voice)

c.js("__spoken = []; __toasts = []; speakInLang('Dia dhuit', 'ga', 'tr'); 1"); time.sleep(0.3)
check('3 Irish without an Irish voice is NOT read by another voice; a notice names the language',
      "__spoken.length === 0 && __toasts.length === 1 && __toasts[0].includes('Gaeilge')")

c.js("""(() => { const a = (name, lang) => ({name, lang, voiceURI: name, localService: true, default: false});
  state.selectedVoiceURIByLang = {}; state.voiceChosenByUser = {};
  __voiceList = [a('ko-kr-x-ism-local', 'ko-KR'), a('ko-kr-x-kod-network', 'ko-KR'), a('ru-ru-x-ruc-local', 'ru-RU'), a('ru-ru-x-dfc-network', 'ru-RU')];
  loadVoices(); __spoken = []; speakInLang('안녕', 'ko', 'tr'); return 1; })()"""); time.sleep(0.3)
check('4 Android: the network (server) voice beats the local one', "__spoken.length === 1 && __spoken[0].voice === 'ko-kr-x-kod-network'")

c.js("__voiceList = []; voices = []; __spoken = []; __toasts = []; speakInLang('Dia dhuit', 'ga', 'tr'); 1"); time.sleep(0.3)
check('5 with no voice list at all (still loading) the engine still gets the text and the language tag',
      "__spoken.length === 1 && __spoken[0].lang === 'ga-IE' && __toasts.length === 0")
print('ALL PASS')
