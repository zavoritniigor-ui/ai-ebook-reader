# Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
# Copying, modification, distribution or commercial use without written permission is prohibited.
"""proxy-assets/translate.js — the script the reading proxy (functions/p/[[path]].js) puts first into every page.

A local page stands in for a proxied one (tests/fixtures/proxy/page.html). Checked: the site's run-time requests
(root-relative, or to a listed site) go to /p/<host>/…, other sites are left alone; a frame added later with a listed
site's address is pointed at the proxy; a selected word or sentence opens the bottom panel with its translation
(Google Translate stubbed) and 🔊; a plain tap opens nothing (the exercises keep their taps); a frame's selection sent
up with postMessage shows the same panel; ✕ closes it; the chosen language is remembered.
"""
import json, os, subprocess, sys, time
from browser_cdp import CDP

# The server side first (functions/p/[[path]].js, sites mocked): it runs here because this suite is in the CI list and
# .github/ is owner-reviewed only.
unit = subprocess.run(['node', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reading_proxy_test.mjs')], capture_output=True, text=True, timeout=120)
print(unit.stdout, end='')
if unit.returncode != 0:
    print(unit.stderr, file=sys.stderr); sys.exit('FAIL tests/reading_proxy_test.mjs')

BASE = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html').rsplit('/', 1)[0]
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=412, height=860, deviceScaleFactor=1, mobile=True)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__errors = []; addEventListener('error', e => __errors.push(e.message));
window.__asked = []; window.__tr = [];
window.__dev = [];
// Sound: Google Translate's voice is an <audio>; the device's voice is speechSynthesis. Both recorded, nothing plays.
window.__plays = []; window.__sys = []; window.__audioFails = false;
window.Audio = function (src) { return { src, play() { __plays.push(src); return __audioFails ? Promise.reject(new Error('NotAllowedError')) : Promise.resolve(); }, pause() {} }; };
// __voices: what getVoices() lists (none, as on CI, unless a check sets them). __natMode: how a voice behaves — 'start'
// (starts reading), 'error' (fails, as Edge's online voice offline), 'silent' (never starts).
window.__voices = []; window.__natMode = 'start'; window.__sysV = [];
window.SpeechSynthesisUtterance = function (text) { this.text = text; };
Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak(u) { __sys.push(u.text + '|' + u.lang); __sysV.push(u.text + '|' + (u.voice ? u.voice.name : ''));
  if (__natMode === 'start') setTimeout(() => u.onstart && u.onstart(), 10); else if (__natMode === 'error') setTimeout(() => u.onerror && u.onerror({ error: 'network' }), 10); },
  cancel() {}, resume() {}, getVoices: () => __voices } });
// Chrome on a computer has its own Translator API (CI's does, with no model): off, except where it is what is tested.
try { delete window.Translator; } catch (e) {} window.Translator = undefined; delete window.Translator;
if (sessionStorage.getItem('pp_test_on_device') === '1') window.Translator = {
  availability: async o => (__dev.push('availability:' + o.sourceLanguage + '>' + o.targetLanguage), 'available'),
  create: async o => ({ translate: async t => (__dev.push(t), '[device ' + o.targetLanguage + '] ' + t) }) };
const realFetch = window.fetch;
// Every request leaves through here (after translate.js's own wrapper): record it; answer Google Translate with a stub.
window.__local = []; window.__localVoice = 'off';
window.fetch = (input, init) => { const u = typeof input === 'string' ? input : input.url; __asked.push(u);
  // The owner's speech server (/api/speech): 'on' answers with sound, 'off' as when the computer is off.
  if (u === '/api/speech/speak') { __local.push(JSON.parse(init.body));
    return Promise.resolve(__localVoice === 'on' ? new Response(new Blob([new Uint8Array(64)], { type: 'audio/wav' }), { status: 200 }) : new Response('offline', { status: 502 })); }
  if (/translate\.googleapis\.com/.test(u)) { const q = new URL(u); __tr.push({ tl: q.searchParams.get('tl'), q: q.searchParams.get('q') });
    return Promise.resolve(new Response(JSON.stringify([[['[' + q.searchParams.get('tl') + '] ' + q.searchParams.get('q'), q.searchParams.get('q')]], null, 'fr']), { headers: { 'content-type': 'application/json' } })); }
  return Promise.resolve(new Response('{}', { status: 404 })); };
const realOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (m, u, ...r) { __asked.push(String(u)); return realOpen.call(this, m, u, ...r); };
''')
c.call('Page.navigate', url=BASE + '/tests/fixtures/proxy/page.html')
c.wait("document.readyState === 'complete'", timeout=20)


def pause(s): c.js(f'new Promise(r => setTimeout(r, {int(s * 1000)}))')


def check(name, expression, timeout=0):
    deadline = time.monotonic() + timeout
    result = c.js(expression)
    while result is not True and time.monotonic() < deadline:
        time.sleep(.15); result = c.js(expression)
    assert result is True, (name, result, c.js("JSON.stringify({asked: __asked, tr: __tr, errors: __errors})"))
    print('PASS', name, flush=True)


PANEL = "document.querySelector('div[data-pp]')"
SHOWN = f"(p => !!p && p.style.display === 'block')({PANEL})"
TR = f"({PANEL}?.shadowRoot.querySelector('.tr').textContent || '')"


def select(sel):
    c.js(f"(e => {{ const r = document.createRange(); r.selectNodeContents(e); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }})(document.querySelector({json.dumps(sel)})); 1")


# ---------------------------------------------------------------- the site's own requests
c.js("""fetch('/build/data.json'); fetch('https://fle-rfi.h5p.com/ajax/x?y=1'); fetch('https://www.rfi.fr/other');
  const x = new XMLHttpRequest(); x.open('GET', '/api/thing'); 1""")
check('1 root-relative and listed-site requests go through /p/<host>/; other sites are left alone', """JSON.stringify(__asked.slice(0, 4)) === JSON.stringify(
   ['/p/francaisfacile.rfi.fr/build/data.json', '/p/fle-rfi.h5p.com/ajax/x?y=1', 'https://www.rfi.fr/other', '/p/francaisfacile.rfi.fr/api/thing'])""")
c.js("""const f = document.createElement('iframe'); f.id = 'ex'; f.src = 'https://fle-rfi.h5p.com/content/1/embed'; document.body.append(f);
  const g = document.createElement('iframe'); g.id = 'other'; g.src = 'about:blank'; document.body.append(g); 1""")
check('2 an exercise frame added later is pointed at the proxy (so it gets this script too)', "document.getElementById('ex').getAttribute('src') === '/p/fle-rfi.h5p.com/content/1/embed' && document.getElementById('other').getAttribute('src') === 'about:blank'", timeout=2)

c.js("""window.__s1 = document.createElement('script'); __s1.src = '/build/6517.chunk.js';
  window.__s2 = document.createElement('script'); __s2.setAttribute('src', 'https://fle-rfi.h5p.com/js/a.js');
  window.__s3 = document.createElement('img'); __s3.src = 'https://www.rfi.fr/logo.png'; 1""")
check('2b an address the site sets on a new script (webpack chunks) is mapped before it loads, by property or setAttribute',
      "__s1.getAttribute('src') === '/p/francaisfacile.rfi.fr/build/6517.chunk.js' && __s2.getAttribute('src') === '/p/fle-rfi.h5p.com/js/a.js' && __s3.getAttribute('src') === 'https://www.rfi.fr/logo.png'")
check('2c the site cannot install its service worker over the proxy host', "navigator.serviceWorker.register('/sw.js').then(() => false, e => e.name === 'SecurityError')")

# ---------------------------------------------------------------- selection → translation
c.js("document.getElementById('b').click(); 1"); pause(.8)
check('3 a plain tap opens nothing (the exercise keeps its taps)', f"!{SHOWN} && __tr.length === 0")
select('#t')
check('4 a selected sentence opens the panel with its translation', f"{SHOWN} && {TR} === '[uk] Le prix Goncourt' && {PANEL}.shadowRoot.querySelector('.src').textContent === 'Le prix Goncourt'", timeout=3)
check('4b the panel has 🔊 and a language choice, Ukrainian first', f"!!{PANEL}.shadowRoot.querySelector('.speak') && {PANEL}.shadowRoot.querySelector('.tl').value === 'uk'")
c.js(f"(s => {{ s.value = 'en'; s.dispatchEvent(new Event('change')); }})({PANEL}.shadowRoot.querySelector('.tl')); 1")
check('5 another language translates again and is remembered', f"{TR} === '[en] Le prix Goncourt' && localStorage.getItem('pp_target_lang') === 'en'", timeout=3)
c.js(f"{PANEL}.shadowRoot.querySelector('.close').click(); 1")
check('6 ✕ closes the panel', f"!{SHOWN}")
c.js("getSelection().removeAllRanges(); window.postMessage({ pp: 'translate', text: '  Bonjour  ' }, location.origin); 1")
check('7 a selection sent up from an exercise frame shows the same panel', f"{SHOWN} && {TR} === '[en] Bonjour'", timeout=3)
c.js("window.postMessage({ pp: 'translate', text: '1234 ...' }, location.origin); 1"); pause(.5)
check('7b text without letters is ignored', f"{PANEL}.shadowRoot.querySelector('.src').textContent === 'Bonjour'")
# ---------------------------------------------------------------- one tap on a word (owner: long press was too fiddly)
c.js(f"{PANEL}.shadowRoot.querySelector('.close').click(); getSelection().removeAllRanges(); 1")


def tap_word(sel, word):
    """A real tap (mouse press + release) in the middle of `word` inside the element `sel`."""
    pt = c.js(f"""(() => {{ const el = document.querySelector({json.dumps(sel)}); const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) {{ const i = n.data.indexOf({json.dumps(word)}); if (i >= 0) {{ const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + {len(word)});
        const b = r.getBoundingClientRect(); return {{ x: b.left + b.width / 2, y: b.top + b.height / 2 }}; }} }} return null; }})()""")
    assert pt, ('no such word', sel, word)
    c.call('Input.dispatchMouseEvent', type='mousePressed', x=pt['x'], y=pt['y'], button='left', clickCount=1)
    c.call('Input.dispatchMouseEvent', type='mouseReleased', x=pt['x'], y=pt['y'], button='left', clickCount=1)
    pause(.6)


c.js("window.__clicks = []; addEventListener('click', e => __clicks.push(e.defaultPrevented)); 1")
tap_word('#q', 'frère')
check('9 one tap on a word: the word is highlighted and translated, no long press', f"{SHOWN} && {PANEL}.shadowRoot.querySelector('.src').textContent === 'frère' && {TR} === '[en] frère' && CSS.highlights.has('pp-word')", timeout=3)
check("9a the tap is marked handled (Chrome's own Touch to Search sheet stays closed)", "__clicks.length === 1 && __clicks[0] === true")
check('9b «Речення ⤢» is offered for the sentence around it', f"!{PANEL}.shadowRoot.querySelector('.sent').hidden")
c.js(f"{PANEL}.shadowRoot.querySelector('.sent').click(); 1")
check('9c «Речення ⤢» translates exactly the sentence with the word, and marks it', f"{PANEL}.shadowRoot.querySelector('.src').textContent === \"Je vais à l'école aujourd'hui avec mon frère.\" && {TR}.startsWith('[en] Je vais') && CSS.highlights.has('pp-sentence') && {PANEL}.shadowRoot.querySelector('.sent').hidden", timeout=3)
tap_word('#q', 'école')
check("10 «l'école»: the tap gives the word «école»", f"{PANEL}.shadowRoot.querySelector('.src').textContent === 'école'", timeout=3)
tap_word('#q', "aujourd'hui")
check("10b «aujourd'hui» stays one word", f"{PANEL}.shadowRoot.querySelector('.src').textContent === \"aujourd'hui\"", timeout=3)
c.js(f"{PANEL}.shadowRoot.querySelector('.close').click(); window.__tr.length = 0; 1")
check('10c ✕ also clears the highlight', "!CSS.highlights.has('pp-word') && !CSS.highlights.has('pp-sentence')")
for sel, word, what in [('#r', 'Réponse', 'an answer of the exercise'), ('#b', 'Valider', 'a button'), ('#clickable', 'cliquable', 'something drawn as clickable')]:
    tap_word(sel, word)
    check(f'11 a tap on {what} is left to the page: no translation, not marked handled', f"!{SHOWN} && __tr.length === 0 && __clicks[__clicks.length - 1] === false")
c.js("(h => { const r = document.createRange(); r.selectNodeContents(h); const b = r.getBoundingClientRect(); window.__blank = { x: Math.min(innerWidth - 4, b.right + 40), y: b.top + b.height / 2 }; })(document.querySelector('#t')); 1")   # right of the heading's text, same line
pt = c.js("__blank")
c.call('Input.dispatchMouseEvent', type='mousePressed', x=pt['x'], y=pt['y'], button='left', clickCount=1)
c.call('Input.dispatchMouseEvent', type='mouseReleased', x=pt['x'], y=pt['y'], button='left', clickCount=1); pause(.6)
check('11b a tap in empty space next to the text translates nothing', f"!{SHOWN} && __tr.length === 0")
CHIP = "document.querySelector('button[data-pp]')"
check('12 the «⇄» switch is in the corner, on', f"{CHIP}?.getAttribute('aria-pressed') === 'true'")
c.js(f"{CHIP}.click(); 1")
tap_word('#q', 'chat')
check('12b switched off: a tap on a word does nothing, and it is remembered', f"!{SHOWN} && __tr.length === 0 && localStorage.getItem('pp_tap') === '0' && {CHIP}.getAttribute('aria-pressed') === 'false'")
c.js(f"{CHIP}.click(); 1")
tap_word('#q', 'chat')
check('12c switched on again: the tap translates', f"{SHOWN} && {PANEL}.shadowRoot.querySelector('.src').textContent === 'chat'", timeout=3)
c.js("window.postMessage({ pp: 'translate', text: 'dort', sentence: 'Le chat dort.', frame: true }, location.origin); 1")
check('13 a word tapped inside an exercise frame comes with its sentence', f"{PANEL}.shadowRoot.querySelector('.src').textContent === 'dort' && !{PANEL}.shadowRoot.querySelector('.sent').hidden", timeout=3)
# ---------------------------------------------------------------- speed
check('14 the connection to Google Translate is opened as the page loads', "!!document.querySelector('link[rel=preconnect][href=\"https://translate.googleapis.com\"]')")
c.js(f"{PANEL}.shadowRoot.querySelector('.close').click(); window.__tr.length = 0; 1")
tap_word('#p', 'monde')
check('14b a tapped word\'s sentence is translated in the background, before «Речення ⤢»', "__tr.some(x => x.q === 'monde') && __tr.some(x => x.q === 'Bonjour tout le monde.')", timeout=3)
n = c.js("__tr.length")
c.js(f"{PANEL}.shadowRoot.querySelector('.sent').click(); 1")
check('14c «Речення ⤢» then shows it with no new request', f"{TR} === '[en] Bonjour tout le monde.' && __tr.length === {n}", timeout=3)
c.js(f"{PANEL}.shadowRoot.querySelector('.close').click(); 1")
tap_word('#p', 'monde')
check('14d a word translated before comes from memory, no request', f"{TR} === '[en] monde' && __tr.length === {n}", timeout=3)
c.call('Page.reload'); c.wait("document.readyState === 'complete'", timeout=20); pause(.5)
tap_word('#p', 'monde')
check('14e ... and after the page is reloaded too (kept in this site\'s storage)', f"{TR} === '[en] monde' && __tr.length === 0", timeout=3)
# ---------------------------------------------------------------- the offline dictionary (French → Ukrainian)
c.js(f"(s => {{ s.value = 'uk'; s.dispatchEvent(new Event('change')); }})({PANEL}.shadowRoot.querySelector('.tl')); {PANEL}.shadowRoot.querySelector('.close').click(); 1")
DICT = f"[...{PANEL}.shadowRoot.querySelectorAll('.dict .d')].map(d => d.textContent).join(' || ')"
tap_word('#q', 'chat')
check('15 a tapped word shows its dictionary entry: lemma, part of speech, meanings (dict/fr-uk.json, offline)', f"{DICT}.startsWith('chat ім. m кіт')", timeout=20)
c.js(f"{PANEL}.shadowRoot.querySelector('.close').click(); 1")
tap_word('#q', 'école')
check("15b «l'école» → the entry of «école»", f"{DICT}.startsWith('école ім. f школа')", timeout=5)
c.js(f"{PANEL}.shadowRoot.querySelector('.close').click(); 1")
tap_word('#q', 'vais')
check('15c a conjugated form gives its infinitive', f"/^aller дієсл\\./.test({DICT})", timeout=5)
check('15d the dictionary file is kept in this site\'s cache (fetched once)', "caches.open('pp-dict-v1').then(c => c.match('/dict/fr-uk.json')).then(r => !!r)", timeout=5)
c.js(f"(s => {{ s.value = 'en'; s.dispatchEvent(new Event('change')); }})({PANEL}.shadowRoot.querySelector('.tl')); 1")
check('15e another target language: no Ukrainian dictionary lines', f"{PANEL}.shadowRoot.querySelector('.dict').hidden", timeout=3)

# ---------------------------------------------------------------- Chrome's on-device translator, when the browser has it
c.js("sessionStorage.setItem('pp_test_on_device', '1'); localStorage.removeItem('pp_tr_cache'); 1")
c.call('Page.reload'); c.wait("document.readyState === 'complete'", timeout=20); pause(.5)
tap_word('#q', 'frère')
check('16 with the Translator API (Chrome on a computer) the word is translated on the device, nothing sent to Google', f"{TR} === '[device en] frère' && __tr.length === 0 && __dev.includes('availability:fr>en')", timeout=5)
c.js(f"{PANEL}.shadowRoot.querySelector('.close').click(); window.__slow = true; 1")
c.js("sessionStorage.setItem('pp_test_on_device', 'slow'); localStorage.removeItem('pp_tr_cache'); 1")
c.call('Page.reload'); c.wait("document.readyState === 'complete'", timeout=20); pause(.5)
c.js("window.Translator = { availability: async () => 'available', create: async () => ({ translate: () => new Promise(() => {}) }) }; 1")
tap_word('#q', 'chat')
check('16b an on-device translator that never answers (model still downloading) falls back to Google within 1.5 s', f"{TR} === '[en] chat' && __tr.some(x => x.q === 'chat')", timeout=5)
c.js("sessionStorage.removeItem('pp_test_on_device'); 1")
# ---------------------------------------------------------------- speech, read at once (owner: «хочу щоб озвучення було автоматично»)
c.js(f"(d => {{ if (d) d.shadowRoot.querySelector('.close').click(); }})({PANEL}); localStorage.removeItem('pp_autospeak'); __plays.length = 0; __sys.length = 0; 1")
PLAYED = "__plays.map(u => new URL(u).searchParams.get('q') + '|' + new URL(u).searchParams.get('tl'))"
tap_word('#q', 'chat')
check('17 a tapped word is read at once, in Google Translate\'s French voice', f"JSON.stringify({PLAYED}) === JSON.stringify(['chat|fr']) && new URL(__plays[0]).pathname === '/translate_tts'", timeout=3)
check('17a «Авто 🔊» is on by default', f"{PANEL}.shadowRoot.querySelector('.auto').getAttribute('aria-pressed') === 'true'")
c.js(f"__plays.length = 0; {PANEL}.shadowRoot.querySelector('.sent').click(); 1")
check('17b «Речення ⤢» reads the sentence', f"{PLAYED}[0] === 'Le chat dort.|fr'", timeout=3)
c.js(f"{PANEL}.shadowRoot.querySelector('.auto').click(); {PANEL}.shadowRoot.querySelector('.close').click(); __plays.length = 0; 1")
tap_word('#q', 'frère')
check('17c «Авто 🔊» off: a tap translates silently, and it is remembered', f"{SHOWN} && __plays.length === 0 && localStorage.getItem('pp_autospeak') === '0'", timeout=3)
c.js(f"{PANEL}.shadowRoot.querySelector('.speak').click(); 1")
check('17d 🔊 still reads it', f"{PLAYED}[0] === 'frère|fr'", timeout=3)
c.js(f"{PANEL}.shadowRoot.querySelector('.auto').click(); {PANEL}.shadowRoot.querySelector('.close').click(); __plays.length = 0; __audioFails = true; 1")
tap_word('#q', 'vais')
check("17e Google's voice refused (no network, or the browser blocks it): the device's own French voice reads it", "__sys.some(x => x === 'vais|fr-FR')", timeout=3)
c.js("__audioFails = false; 1")

# ---------------------------------------------------------------- words that a tap could not reach before
c.js(f"{PANEL}.shadowRoot.querySelector('.close').click(); 1")
tap_word('#ns', 'protégé')
check('18 a word in text the page made unselectable is found under the finger', f"{SHOWN} && {PANEL}.shadowRoot.querySelector('.src').textContent === 'protégé'", timeout=3)
c.js(f"{PANEL}.shadowRoot.querySelector('.close').click(); 1")
tap_word('#bigclick', 'cliquable')
check('18b a big block drawn as clickable (a whole card of text) is not taken for a button', f"{SHOWN} && {PANEL}.shadowRoot.querySelector('.src').textContent === 'cliquable'", timeout=3)
c.js(f"{PANEL}.shadowRoot.querySelector('.close').click(); 1")
pt = c.js("""(() => { const n = document.querySelector('#r').firstChild; const r = document.createRange(); r.setStart(n, 0); r.setEnd(n, 7); const b = r.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()""")
c.js(f"window.__cm = new MouseEvent('contextmenu', {{ bubbles: true, cancelable: true, clientX: {pt['x']}, clientY: {pt['y']} }}); document.querySelector('#r').dispatchEvent(__cm); 1")
check('19 a long press on an answer translates its word (and no system menu), the answer is not chosen', f"__cm.defaultPrevented && {SHOWN} && {PANEL}.shadowRoot.querySelector('.src').textContent === 'Réponse'", timeout=3)
# ---------------------------------------------------------------- the owner's own voice (Kokoro on their computer)
c.call('Page.reload'); c.wait("document.readyState === 'complete'", timeout=20); pause(.5)
c.js("localStorage.removeItem('pp_autospeak'); __localVoice = 'on'; __plays.length = 0; __local.length = 0; 1")
tap_word('#q', 'chat')
check("20 the owner's speech server reads the word first (their Kokoro voice), not Google", "__local.length === 1 && __local[0].text === 'chat' && __local[0].lang === 'fr' && __plays.length === 1 && __plays[0].startsWith('blob:')", timeout=3)
c.js(f"{PANEL}.shadowRoot.querySelector('.speak').click(); 1")
check('20b a repeat plays the kept sound, no new request to the computer', "__local.length === 1 && __plays.length === 2 && __plays[1] === __plays[0]", timeout=3)
c.call('Page.reload'); c.wait("document.readyState === 'complete'", timeout=20); pause(.5)
c.js("__localVoice = 'off'; __plays.length = 0; __local.length = 0; 1")
tap_word('#q', 'frère')
check('20c the computer off: Google\'s voice reads it', f"__local.length === 1 && {PLAYED}[0] === 'frère|fr'", timeout=5)
c.js(f"{PANEL}.shadowRoot.querySelector('.close').click(); __plays.length = 0; 1")
tap_word('#q', 'chat')
check('20d ... and the next words do not wait for the computer again (two minutes)', f"__local.length === 1 && {PLAYED}[0] === 'chat|fr'", timeout=5)
# ---------------------------------------------------------------- Edge's own natural voice first (owner, 2026-11-23)
EDGE_VOICES = """[{ name: 'Microsoft Hortense - French (France)', lang: 'fr-FR', localService: true },
  { name: 'Microsoft Antoine Online (Natural) - French (Canada)', lang: 'fr-CA', localService: false },
  { name: 'Microsoft Denise Online (Natural) - French (France)', lang: 'fr-FR', localService: false }]"""
c.call('Page.reload'); c.wait("document.readyState === 'complete'", timeout=20); pause(.5)
c.js(f"__voices = {EDGE_VOICES}; __natMode = 'start'; __localVoice = 'on'; __plays.length = 0; __local.length = 0; __sysV.length = 0; 1")
tap_word('#q', 'chat')
check("21 Edge with a natural French voice: it reads the word first (France's, not Canada's); no computer, no Google",
      "__sysV[0] === 'chat|Microsoft Denise Online (Natural) - French (France)' && __local.length === 0 && __plays.length === 0", timeout=3)
c.js(f"{PANEL}.shadowRoot.querySelector('.close').click(); __natMode = 'error'; __sysV.length = 0; 1")
tap_word('#q', 'frère')
check("21b the natural voice fails (Edge offline): the owner's computer reads it", "__local.length === 1 && __local[0].text === 'frère' && __plays.length === 1", timeout=3)
c.js(f"{PANEL}.shadowRoot.querySelector('.close').click(); __natMode = 'silent'; __plays.length = 0; 1")
tap_word('#q', 'vais')
check('21c the natural voice never starts: after 3 s the next voice reads it', "__local.some(x => x.text === 'vais') && __plays.length === 1", timeout=6)
c.js(f"{PANEL}.shadowRoot.querySelector('.close').click(); __voices = [{{ name: 'Google français', lang: 'fr-FR', localService: false }}]; __natMode = 'start'; __plays.length = 0; __sysV.length = 0; 1")
tap_word('#q', 'école')
check('21d a browser without a natural voice (Chrome): unchanged, the computer reads first', "__sysV.length === 0 && __local.some(x => /école/.test(x.text))", timeout=3)
c.js("__voices = []; 1")
check('8 no page errors', "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL PASS')
