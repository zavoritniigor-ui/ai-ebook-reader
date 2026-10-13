"""Books in other Latin-script languages are read with their own voice: the old heuristic only knew English vs French, so a
German book was spoken with a French (or English) voice. Covers detection of de/es/it/pt/nl/pl, the book language, a tapped
word inside a German book, read-aloud segments and voice choice for languages without their own config (Italian).
English/French detection is unchanged. No network."""
import os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof detectLang==='function'", timeout=30)


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


SAMPLES = {
    'de-DE': "Als Gregor Samsa eines Morgens aus unruhigen Träumen erwachte, fand er sich in seinem Bett zu einem ungeheueren Ungeziefer verwandelt.",
    'es-ES': "En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho tiempo que vivía un hidalgo.",
    'it-IT': "Nel mezzo del cammin di nostra vita mi ritrovai per una selva oscura, ché la diritta via era smarrita.",
    'pt-PT': "Não tenho ambições nem desejos. Ser poeta não é uma ambição minha, é a minha maneira de estar sozinho.",
    'nl-NL': "Het was een koude dag in de stad en de mensen liepen snel naar huis omdat het begon te regenen.",
    'pl-PL': "Litwo! Ojczyzno moja! ty jesteś jak zdrowie. Ile cię trzeba cenić, ten tylko się dowie, kto cię stracił.",
    'fr-FR': "Je pense que tu as raison, mais il faut attendre. Le père de Marie travaille à Paris depuis dix ans.",
    'en-US': "He was in the garden when it began to rain. I do not know what he said to them.",
}
for locale, text in SAMPLES.items():
    check(f'1 {locale} text is detected as {locale}', f"detectLang({text!r}) === {locale!r} || detectLang({text!r})")
check('2 short English/French sentences and a French sentence with an English gloss keep the en/fr logic',
      "detectLang('Je ne sais pas.') === 'fr-FR' && detectLang('If you can come, we will be happy.') === 'en-US' && buildLanguageSegments('Le père (father) parle.', 'fr').map(s => s.lang).join() === 'fr,en,fr'")

c.js("""(() => { window.__spoken = []; window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; this.voice = null; this.lang = ''; } };
  const mk = (name, lang, uri) => ({name, lang, voiceURI: uri, localService: false, default: false});
  ttsSynth = { getVoices: () => [mk('Google français', 'fr-FR', 'fr-google'), mk('Google US English', 'en-US', 'en-google'), mk('Google Deutsch', 'de-DE', 'de-google'), mk('Google italiano', 'it-IT', 'it-google')],
    cancel() {}, speak(u) { __spoken.push({voice: u.voice && u.voice.voiceURI, lang: u.lang, text: u.text}); setTimeout(() => u.onend && u.onend(new Event('end')), 0); }, addEventListener() {}, speaking: false, pending: false, paused: false };
  loadVoices(); return 1; })()""")
c.js(f"els.pages.innerHTML = '<p>' + {SAMPLES['de-DE']!r} + ' Ja.</p>'; updateSourceLang(); 1")
check('3 a German page sets the book language to German (and lang="de" for hyphenation)', "state.sourceLang === 'de-DE' && els.pages.lang === 'de'")
check('4 in a German book a single word and a short sentence stay German (not guessed as en/fr)',
      "(() => { state.ctxSentence = 'Er fand sich in seinem Bett.'; return langForText('Bett') === 'de-DE' && buildLanguageSegments('Ja.', 'de')[0].lang === 'de'; })()")
c.js(f"speakText({SAMPLES['de-DE']!r}, 'orig'); 1"); time.sleep(0.5)
check('5 a German sentence is spoken with the German voice', "__spoken.length >= 1 && __spoken.at(-1).voice === 'de-google' || JSON.stringify(__spoken)")
check('6 read-aloud segments of a German sentence pick the German voice', f"buildLanguageSegments({SAMPLES['de-DE']!r}, pageLang().slice(0, 2)).every(s => voiceForLangCode(s.lang).voice?.voiceURI === 'de-google')")
c.js(f"state.ctxSentence = ''; speakText({SAMPLES['it-IT']!r}, 'orig'); 1"); time.sleep(0.5)
check('7 Italian (no own language config) is spoken with the Italian voice, not English', "__spoken.at(-1).voice === 'it-google' || JSON.stringify(__spoken.at(-1))")
c.js(f"els.pages.innerHTML = '<p>' + {SAMPLES['fr-FR']!r} + '</p>'; updateSourceLang(); 1")
check('8 a French page is still French', "state.sourceLang === 'fr-FR'")
print('ALL PASS')
