"""Browser test: free dictionaries (js/dictionaries.js) under a word's translation, by themselves.

The network answers are stubbed (no real Wiktionary/Wikipedia): the entry of the book's language is shown (part of speech and
first meanings), never another language's; a definition's HTML is reduced to plain text (a <script> or an <img onerror> in an
answer creates no element); a capitalised name gets Wikipedia; nothing found or the network failing adds nothing; a newer
lookup is never given an older word's dictionaries; and a real word tap in the reader appends the block under the translation.
"""
import os
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')

c = CDP()
c.call('Page.enable')
c.call('Runtime.enable')
c.call('Page.navigate', url=URL)
c.wait("document.readyState === 'complete' && !document.body.inert && typeof dictBlock === 'function'")
c.js("localStorage.clear(); showUpdateBanner = () => {}; document.getElementById('sw-update-banner')?.remove();")

c.js(r"""(() => {
  window.__urls = [];
  const realFetch = window.fetch;
  const json = v => Promise.resolve(new Response(JSON.stringify(v), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  window.fetch = (url, opts) => {
    const u = String(url);
    if (!/wiktionary|wikipedia/.test(u)) return realFetch(url, opts);
    __urls.push(u);
    if (u.includes('/definition/suis')) return json({
      fr: [{ partOfSpeech: 'Verb', language: 'French', definitions: [
        { definition: 'first-person singular present indicative of <a href="/wiki/être">être</a>' },
        { definition: '<style>.mw-parser-output .defdate{font-size:smaller}</style>evil<script>window.__pwned=1</script><img src=x onerror="window.__pwned=2">' }] }],
      en: [{ partOfSpeech: 'Noun', language: 'English', definitions: [{ definition: 'ENGLISH-ONLY-SENSE' }] }] });
    if (u.includes('/definition/Montr')) return Promise.resolve(new Response('{}', { status: 404 }));
    if (u.includes('/definition/montr')) return Promise.resolve(new Response('{}', { status: 404 }));
    if (u.includes('fr.wikipedia.org') && u.includes('Montr')) return json({ type: 'standard', extract: 'Montréal est la plus grande ville du Québec.' });
    if (u.includes('/definition/rien')) return Promise.reject(new TypeError('Failed to fetch'));
    if (u.includes('fr.wikipedia.org')) return Promise.resolve(new Response('{}', { status: 404 }));
    return Promise.resolve(new Response('{}', { status: 404 }));
  };
  return true;
})()""")


def check(name, ok):
    if ok is not True:
        raise AssertionError(f'FAIL: {name} -> {ok!r}')
    print('PASS:', name)


html = c.js("dictBlock('suis', 'fr')")
check('a French word gets its Wiktionary entry, its part of speech and meanings',
      'Wiktionary' in html and 'Verb' in html and 'first-person singular present indicative of être' in html)
check('only the entry in the book\'s language is shown', 'ENGLISH-ONLY-SENSE' not in html)
check('inline CSS of a definition is not shown as text', 'mw-parser-output' not in html)
probe = c.js(f"(() => {{ const d = document.createElement('div'); d.innerHTML = {html!r}; return {{ script: d.querySelectorAll('script,img,a').length, text: d.textContent }}; }})()")
check('a definition\'s HTML becomes plain text: no script, image or link element', probe['script'] == 0)
c.js("(() => { const d = document.createElement('div'); d.innerHTML = " + repr(html) + "; document.body.appendChild(d); return true; })()")
check('nothing in an answer runs', c.js("window.__pwned === undefined"))

name = c.js("dictBlock('Montréal', 'fr')")
check('a name with no Wiktionary entry gets its Wikipedia lines', 'Wikipedia' in name and 'plus grande ville du Québec' in name)
check('the network failing adds nothing (and throws nothing)', c.js("dictBlock('rien', 'fr').then(h => h === '')"))
check('a phrase or a number is not looked up', c.js("Promise.all([dictBlock('deux mots', 'fr'), dictBlock('2024', 'fr')]).then(a => a.join('') === '')"))
before = c.js("__urls.length")
c.js("dictBlock('suis', 'fr')")
check('the same word is asked once (cached)', c.js("__urls.length") == before)

# appendDictionaries: only into the lookup that is still shown
c.js("""(() => { els.tooltip.style.display = 'block'; els.tooltip.style.top = '10px'; els.ttTranslation.innerHTML = 'je suis → я є'; state.lookupToken = 7; return true; })()""")
c.js("appendDictionaries('suis', 'fr', 6)")
check('an older lookup does not add its dictionaries to a newer one', c.js("!document.querySelector('#tt-dict-host .tt-dict')"))
c.js("appendDictionaries('suis', 'fr', 7)")
check('the current lookup gets the block under its translation, outside the translation text', c.js("!!document.querySelector('#tt-dict-host .tt-dict') && els.ttTranslation.textContent === 'je suis → я є'"))
check('the spoken translation leaves the dictionaries out', c.js("!mainTranslationText().includes('Wiktionary')"))

# a real tap path: handleWordOrSelection appends the block after the translation
c.js("""(() => { aiAvailable = () => true; speakText = () => {}; speakInLang = () => {}; state.translationCache = {};
  aiTranslateText = async () => 'я є'; machineTranslate = async () => ({ html: '', extras: '' });
  translationProviders = () => ['groq']; ensureSharedAiProviders = () => null; langForText = () => 'fr';
  els.ttTranslation.innerHTML = ''; return true; })()""")
c.js("handleWordOrSelection('suis', 200, 60, null)")
c.wait("els.ttTranslation.textContent.includes('я є') && !!document.querySelector('#tt-dict-host .tt-dict')", timeout=10)
check('a word looked up in the reader shows the dictionaries by themselves', c.js("document.getElementById('tt-dict-host').textContent.includes('first-person singular')"))
check('a new lookup clears the previous word\'s dictionaries at once', c.js("(() => { handleWordOrSelection('autre', 200, 60, null); return document.getElementById('tt-dict-host').textContent === ''; })()"))
check('a button of the popup (Grammar) puts the dictionaries aside at once', c.js("(() => { document.getElementById('tt-dict-host').innerHTML = '<div class=\"tt-dict\">x</div>'; document.getElementById('tt-ai-btn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return document.getElementById('tt-dict-host').textContent === ''; })()"))
check('with a side panel open a late answer adds nothing', c.js("(async () => { els.tooltip.style.display = 'flex'; document.getElementById('grammar-panel').classList.add('expanded'); state.lookupToken = 99; await appendDictionaries('suis', 'fr', 99); const empty = document.getElementById('tt-dict-host').textContent === ''; document.getElementById('grammar-panel').classList.remove('expanded'); return empty; })()"))
check('a side panel opening puts the dictionaries aside', c.js("(async () => { document.getElementById('tt-dict-host').innerHTML = '<div class=\"tt-dict\">x</div>'; document.getElementById('ask-panel').classList.add('expanded'); await new Promise(r => setTimeout(r, 50)); const empty = document.getElementById('tt-dict-host').textContent === ''; document.getElementById('ask-panel').classList.remove('expanded'); return empty; })()"))
check('the popup never moves for the dictionaries; with no room below it they are not shown', c.js("""(async () => {
  els.tooltip.style.display = 'flex'; els.tooltip.style.top = (innerHeight - 40) + 'px'; state.lookupToken = 120;
  const before = els.tooltip.getBoundingClientRect().top; await appendDictionaries('suis', 'fr', 120);
  return els.tooltip.getBoundingClientRect().top === before && document.getElementById('tt-dict-host').textContent === ''; })()"""))
print('PASS: all free dictionary checks')
