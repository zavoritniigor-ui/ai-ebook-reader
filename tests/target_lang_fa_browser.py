"""Persian (Farsi) is a TRANSLATION language (owner, 2026-10-26), and every language list of the menus shows the country's flag.

Persian: the selector offers it, a stored choice is kept, prompts and speech know it (fa-IR), a Persian answer passes the
script check, its voice is picked by itself and speaks the translation, the translation reads right to left; it is not a
menu language. Flags: every option of the translation, menu, book and microphone language lists starts with a flag, and so
do the offline pack languages. No network.
"""
import os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof loadVoices==='function'", timeout=30)
c.js("localStorage.clear(); localStorage.setItem('reader_target_lang','fa'); localStorage.setItem('reader_ui_lang','fa'); 1")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof loadVoices==='function'", timeout=30)


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


check('1 the translation-language selector offers Persian with the Iranian flag',
      "[...document.getElementById('target-lang').options].some(o => o.value === 'fa' && o.textContent.startsWith('🇮🇷'))")
check('2 a stored Persian target language is kept (the selector shows it)', "state.targetLang === 'fa' && document.getElementById('target-lang').value === 'fa'")
check('3 Persian is not a menu language (a stored menu language "fa" is refused)',
      "state.uiLang !== 'fa' && ![...document.getElementById('ui-lang').options].some(o => o.value === 'fa')")
check('4 prompts and speech know Persian', "LANG_NAMES.fa.includes('фарсі') && /Persian/.test(LANGUAGE_CONFIG.fa.promptName) && LANG_TAGS.fa === 'fa-IR'")
check('5 a Persian answer passes the script check; a Cyrillic tail is cut off',
      "normalizeTranslation('سلام', 'fa', true) === 'سلام' && normalizeTranslation('کتاب (книга)', 'fa', true) === 'کتاب'")
check('6 the translation reads right to left', "getComputedStyle(document.getElementById('tt-translation')).unicodeBidi === 'plaintext'")
c.js("""(() => { window.__spoken = []; window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; this.voice = null; this.lang = ''; } };
  const mk = (name, lang, uri, local) => ({name, lang, voiceURI: uri, localService: local, default: false});
  ttsSynth = { getVoices: () => [mk('Google فارسی', 'fa-IR', 'fa-google', false), mk('Dariush', 'fa-IR', 'fa-local', true), mk('Google français', 'fr-FR', 'fr-google', false)],
    cancel() {}, speak(u) { __spoken.push({voice: u.voice && u.voice.voiceURI, lang: u.lang}); setTimeout(() => u.onend && u.onend(new Event('end')), 0); }, addEventListener() {}, speaking: false, pending: false, paused: false };
  loadVoices(); return 1; })()""")
check('7 the best Persian voice is picked by itself', "state.selectedVoiceURIByLang.fa === 'fa-google'")
c.js("speakInLang('سلام', 'fa', 'tr'); 1"); time.sleep(0.5)
check('8 the Persian translation is spoken with a Persian voice', "__spoken.length === 1 && __spoken[0].lang.startsWith('fa') && __spoken[0].voice === 'fa-google'")

FLAG = r"/^[\u{1F1E6}-\u{1F1FF}]{2} /u"
for sel, name in (('#target-lang', 'translation'), ('#ui-lang', 'menu'), ('#mic-lang', 'microphone')):
    check(f'9 every option of the {name} language list starts with a flag',
          f"(() => {{ const o = [...document.querySelectorAll('{sel} option')]; return o.length > 3 && o.every(x => {FLAG}.test(x.textContent)); }})()")
check('9 every language of the book language list starts with a flag (the «automatic» entry is not a language)',
      f"(() => {{ const o = [...document.querySelectorAll('#book-lang-select option')].filter(x => x.value); return o.length > 3 && o.every(x => {FLAG}.test(x.textContent)); }})()")
check('10 the offline pack languages carry their flag; their order is by name', "offlineTrLangName('fr').startsWith('🇫🇷 ') && !offlineTrLangName('fr', false).includes('🇫🇷')")
check('11 the library language lists carry flags', "LIBRARY_LANGS.filter(([c]) => c).every(([, l]) => /^[\\u{1F1E6}-\\u{1F1FF}]{2} /u.test(l)) && LIBRARY_IA_LANGS.filter(([c]) => c).every(([, l]) => /^[\\u{1F1E6}-\\u{1F1FF}]{2} /u.test(l))")
print('ALL PASS')
