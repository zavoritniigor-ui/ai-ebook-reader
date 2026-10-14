"""Books in other Latin-script languages are read with their own voice: the old heuristic only knew English vs French, so a
German book was spoken with a French (or English) voice. Covers detection of de/es/it/pt/nl/pl, the book language, a tapped
word inside a German book, read-aloud segments and voice choice for languages without their own config (Italian).
English/French detection is unchanged. Section 9+: real library books (Gutenberg) read ~30% of Spanish sentences in English/French:
a Spanish «sin» + an accent made a whole chapter IRISH, a chapter's language came only from its first 6000 characters (the English
Gutenberg header), and short Italian sentences slid into pt/es/pl. Fixed + the book's own language (EPUB dc:language) and a per-book
«Мова книги» select in the side panel. No network."""
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

# ---- 9. regressions from real library books ----
check('9 a Spanish sentence with «sin» and accents is NOT Irish', "detectLang('Lo hizo sin pensar, y después se marchó a la ciudad con él.') === 'es-ES' || detectLang('Lo hizo sin pensar, y después se marchó a la ciudad con él.')")
check('9b real Irish is still Irish', "detectLang('Tá an leabhar seo go maith agus is maith liom é.') === 'ga-IE'")
check('10 short sentences of an Italian book stay Italian (were pt / es / pl)',
      "['A poco a poco tutti se ne andarono.', 'Ella sentì smarrire la ragione:', 'E i ragazzi e Giovanna ricominciarono a ridere.', 'A Napoli i condannati furono separati:'].every(t => buildLanguageSegments(t, 'it').map(x => x.lang).join() === 'it')")
check('10b ... while a clearly English sentence in that book is still English', "buildLanguageSegments('You may copy it, give it away or re-use it under the terms of the license.', 'it').map(x => x.lang).join() === 'en'")
header = "The Project Gutenberg eBook of Torquemada, by Galdós. This ebook is for the use of anyone anywhere in the United States and most other parts of the world at no cost and with almost no restrictions whatsoever. " * 30
spanish = "En el día de la fecha, el señor don Francisco Torquemada se encontraba en su casa, y no quería salir porque hacía mucho frío en las calles de Madrid. " * 120
c.js(f"state.bookLangManual = ''; state.bookLangMeta = ''; els.pages.innerHTML = '<p>' + {header!r} + '</p><p>' + {spanish!r} + '</p>'; updateSourceLang(); 1")
check('11 a chapter that STARTS with the English Gutenberg header but is Spanish is Spanish', "state.sourceLang === 'es-ES' || state.sourceLang")

# ---- 12. the book's own language + the «Мова книги» select ----
import base64, io, json, zipfile
def epub(lang):
    o = io.BytesIO()
    with zipfile.ZipFile(o, 'w') as z:
        z.writestr('META-INF/container.xml', '<container><rootfiles><rootfile full-path="OPS/p.opf"/></rootfiles></container>')
        z.writestr('OPS/p.opf', f'<package xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata><dc:language>{lang}</dc:language></metadata><manifest><item id="c" href="c.xhtml"/></manifest><spine><itemref idref="c"/></spine></package>')
        z.writestr('OPS/c.xhtml', '<html><body><p>Hola. Sí. Vale, vale.</p><p>' + 'Muy bien, gracias. ' * 3 + '</p></body></html>')
    return base64.b64encode(o.getvalue()).decode()
c.js("localStorage.clear(); openBookFile(new File([Uint8Array.from(atob(%s),ch=>ch.charCodeAt(0))],'meta.epub',{lastModified:11})); 1" % json.dumps(epub('es')))
c.wait("state.format === 'epub' && els.pages.textContent.includes('Hola')", timeout=20); time.sleep(0.5)
check('12 an EPUB with dc:language=es is read as Spanish even when its text is too short to tell', "state.bookLangMeta === 'es' && pageLang() === 'es-ES' || [state.bookLangMeta, pageLang()].join()")
check('12b the side panel shows «Мова книги: Автоматично (Español)»', "(s => !s.disabled && s.value === '' && s.options[0].textContent.includes('Español'))(document.getElementById('book-lang-select'))")
c.js("const s = document.getElementById('book-lang-select'); s.value = 'de'; s.dispatchEvent(new Event('change')); 1")
check('13 choosing a language by hand overrides it at once (reading, translation, voice)', "pageLang() === 'de-DE' && buildLanguageSegments('Hola, gracias.', pageLang().slice(0, 2)).map(x => x.lang).join() === 'de'")
c.js("openBookFile(new File([Uint8Array.from(atob(%s),ch=>ch.charCodeAt(0))],'other.epub',{lastModified:12})); 1" % json.dumps(epub('it')))
c.wait("state.format === 'epub' && state.bookLangMeta === 'it' && els.pages.textContent.includes('Hola')", timeout=20); time.sleep(0.3)
check('14 the choice belongs to that book: another book is automatic again', "document.getElementById('book-lang-select').value === '' && pageLang() === 'it-IT'")
c.js("openBookFile(new File([Uint8Array.from(atob(%s),ch=>ch.charCodeAt(0))],'meta.epub',{lastModified:11})); 1" % json.dumps(epub('es')))
c.wait("state.format === 'epub' && state.bookLangMeta === 'es' && els.pages.textContent.includes('Hola')", timeout=20); time.sleep(0.3)
check('15 reopening the first book restores its hand-picked language', "document.getElementById('book-lang-select').value === 'de' && pageLang() === 'de-DE'")
c.js("const s2 = document.getElementById('book-lang-select'); s2.value = ''; s2.dispatchEvent(new Event('change')); 1")
check('16 «Автоматично» returns to the file language and forgets the choice', "pageLang() === 'es-ES' && !Object.keys(localStorage).some(k => k.startsWith('reader_book_lang:'))")
check('17 the new texts exist in all 8 UI languages', "['bookLangLabel','bookLangAuto'].every(k => ['uk','en','fr','ru','zh','ko','hi','ga'].every(l => I18N[k][l]))")
print('ALL PASS')
