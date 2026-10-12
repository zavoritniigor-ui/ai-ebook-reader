"""German and Spanish are available as TRANSLATION (target) languages with working voices, but stay out of the menu-language list:
the selector offers them, the choice persists, the AI prompts name them, voices for them are listed/auto-picked and used to speak the
translation; neither becomes a UI language (a German system still gets the English menu). No network."""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.addScriptToEvaluateOnNewDocument', source="Object.defineProperty(navigator,'languages',{get:()=>['de-DE','uk'],configurable:true});")
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof loadVoices==='function'", timeout=30)
c.js("localStorage.clear(); localStorage.setItem('reader_target_lang','de'); localStorage.setItem('reader_ui_lang','es'); 1")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof loadVoices==='function'", timeout=30)


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


check('1 the translation-language selector offers German and Spanish', "['de', 'es'].every(v => [...document.getElementById('target-lang').options].some(o => o.value === v))")
check('2 a stored German target language is accepted (selector shows it)', "state.targetLang === 'de' && document.getElementById('target-lang').value === 'de'")
check('3 neither becomes a menu language: a stored UI language "es" is rejected, a German system gets the first supported entry (uk here), not de',
      "state.uiLang !== 'es' && state.uiLang !== 'de' && ![...document.getElementById('ui-lang').options].some(o => ['de', 'es'].includes(o.value)) && ['uk', 'en'].includes(state.uiLang)")
check('4 prompts and speech know both languages', "LANG_NAMES.de.length > 3 && LANG_NAMES.es.length > 3 && LANG_TAGS.de === 'de-DE' && LANG_TAGS.es === 'es-ES'")
c.js("""(() => { window.__spoken = []; window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; this.voice = null; this.lang = ''; } };
  const mk = (name, lang, uri, local) => ({name, lang, voiceURI: uri, localService: local, default: false});
  ttsSynth = { getVoices: () => [mk('Google Deutsch', 'de-DE', 'de-google', false), mk('Anna', 'de-DE', 'de-anna', true), mk('Google español', 'es-ES', 'es-google', false), mk('Google français', 'fr-FR', 'fr-google', false)],
    cancel() {}, speak(u) { __spoken.push({voice: u.voice && u.voice.voiceURI, lang: u.lang, text: u.text}); setTimeout(() => u.onend && u.onend(new Event('end')), 0); }, addEventListener() {}, speaking: false, pending: false, paused: false };
  loadVoices(); return 1; })()""")
check('5 the voice list has German and Spanish groups', "[...document.querySelectorAll('#voice-select optgroup')].map(g => g.label).filter(l => ['Німецька', 'Іспанська', 'German', 'Spanish'].includes(l)).length === 2")
check('6 a voice is auto-picked for each', "!!state.selectedVoiceURIByLang.de && !!state.selectedVoiceURIByLang.es")
c.js("speakInLang('Guten Tag', 'de', 'tr'); 1"); time.sleep(0.5)
check('7 the German translation is spoken with a German voice (de-DE)', "__spoken.length === 1 && __spoken[0].lang.startsWith('de') && /^de-/.test(__spoken[0].voice)")
c.js("speakInLang('Buenos días', 'es', 'tr'); 1"); time.sleep(0.5)
check('8 the Spanish translation is spoken with a Spanish voice (es-ES)', "__spoken.length === 2 && __spoken[1].lang.startsWith('es') && __spoken[1].voice === 'es-google'")
print('ALL PASS')
