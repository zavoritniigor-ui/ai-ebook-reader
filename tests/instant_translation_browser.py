"""Instant multi-source word translation (js/translation.js translateWordMultiSource + js/translation-cache.js).

A word tap runs its sources side by side and renders into ONE popup line by rank, never "last response wins":
    L0a memory (final) > L0b IndexedDB exact context (final) > L3 refinement (OpenAI) > L2 fast AI (Groq)
    > L0c IndexedDB word (provisional) > L1 on-device translator / network machine translation
An exact-context cache hit makes zero network calls; everything else refines the same line in place.

Deterministic mocks only, at the lowest layers (the pipeline, IndexedDB and the provider layer are real): the
on-device Translator API, the provider transports (callGroq / callOpenAI / callGemini, abort-aware), the Google
endpoint (fetch) and navigator.onLine. No real AI provider, translator download or network translation is used.
Taps are real mouse clicks. Timings printed at the end are from mocks (headless desktop Chrome), not a device.
"""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1280, height=900, deviceScaleFactor=1, mobile=False)
# Pre-load mocks (survive reloads): Translator API, Google endpoint, navigator.onLine, storage.persist.
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__errors = []; addEventListener('error', e => __errors.push(e.message)); addEventListener('unhandledrejection', e => __errors.push(String(e.reason)));
window.__online = true; Object.defineProperty(navigator, 'onLine', {configurable: true, get: () => __online});
// On-device translator: availability per pair, a small dictionary, a delay.
window.__tr = {availability: 'available', delay: 10, calls: 0, dict: {
  'fr>uk': {prendre: 'брати', chat: 'кіт', dort: 'спить', partir: 'йти', mer: 'море'},
  'en>uk': {run: 'бігти', chat: 'чат', company: 'компанія'}}};
window.Translator = {
  availability: async ({sourceLanguage: s, targetLanguage: t}) => (__tr.availability === 'unavailable' ? 'unavailable' : __tr.availability),
  create: async ({sourceLanguage: s, targetLanguage: t}) => ({ translate: text => new Promise(res => {
      __tr.calls++; setTimeout(() => res((__tr.dict[s + '>' + t] || {})[text.toLowerCase()] || ''), __tr.delay); }) })
};
// Google machine translation endpoint (network): off unless a test turns it on.
window.__gt = {on: false, calls: 0, delay: 20, map: {}};
const realFetch = window.fetch;
window.fetch = (url, opts) => {
  if (String(url).includes('translate.googleapis.com')) {
    __gt.calls++;
    if (!__online) return Promise.reject(new TypeError('Failed to fetch'));
    const q = decodeURIComponent((String(url).match(/[?&]q=([^&]*)/) || [])[1] || '');
    if (!__gt.on) return new Promise((_, rej) => setTimeout(() => rej(new TypeError('Failed to fetch')), __gt.delay));
    return new Promise(res => setTimeout(() => res(new Response(JSON.stringify([[[__gt.map[q] || ('mt-' + q), q]], null, 'fr']), {status: 200})), __gt.delay));
  }
  return realFetch(url, opts);
};
window.__persist = {asked: 0, grant: false};
if (navigator.storage) navigator.storage.persist = async () => { __persist.asked++; return __persist.grant; };
''')


def load():
    c.call('Page.navigate', url=URL)
    c.wait("document.readyState==='complete' && !document.body.inert && typeof translateWordMultiSource==='function'", timeout=30)
    c.js(r"""(() => { showUpdateBanner = () => {}; document.getElementById('sw-update-banner')?.remove();
      state.translateMode = true; state.format = 'txt'; state.targetLang = 'uk'; state.uiLang = 'en';
      state.bookKey = window.__book || 'reader_bookmark_bookA.txt_1000_1'; state.speakSide = 'original';
      state.activeAiProvider = 'openai'; state.groqKey = 'test-groq-key'; state.openaiKey = 'test-openai-key'; state.apiKey = '';
      speakText = () => {}; window.__spoken = []; speakInLang = (text) => { __spoken.push(text); };
      // Provider transports (abort-aware). reply(provider, word, sentence) -> {direct, context}.
      window.__ai = {calls: [], groq: {delay: 300, fail: false}, openai: {delay: 900, fail: false}, gemini: {delay: 500, fail: false}};
      const table = [
        ['prendre', 'décision', {groq: ['прийняти', null], openai: ['прийняти', 'prendre une décision — прийняти рішення']}],
        ['prendre', 'bus', {groq: ['сісти', null], openai: ['сісти', 'prendre le bus — сісти на автобус']}],
        ['run', 'company', {groq: ['керувати', null], openai: ['керувати', 'run the company — керувати компанією']}],
        ['run', 'morning', {groq: ['бігати', null], openai: ['бігати', null]}],
        ['chat', 'dort', {groq: ['кіт', null], openai: ['кіт', null]}],
        ['chat', 'long', {groq: ['розмова', null], openai: ['розмова', null]}]];
      const reply = (provider, prompt) => {
        const word = (prompt.match(/Слово "([^"]+)"/) || [])[1] || '', sentence = (prompt.match(/вжите: "([^"]*)"/) || [])[1] || '';
        const row = table.find(r => r[0] === word.toLowerCase() && sentence.includes(r[1]));
        const [direct, note] = row ? row[2][provider === 'groq' ? 'groq' : 'openai'] : [word + '-' + provider, null];
        return JSON.stringify({direct, context: note});
      };
      const transport = provider => (prompt, dataUrl, key, signal) => new Promise((resolve, reject) => {
        __ai.calls.push({provider, key: !!key, word: (prompt.match(/Слово "([^"]+)"/) || [])[1]});
        const cfg = __ai[provider];
        const timer = setTimeout(() => cfg.fail ? reject(new Error(provider + ' failed')) : resolve(reply(provider, prompt)), cfg.delay);
        signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); }, {once: true});
      });
      callGroq = transport('groq'); callOpenAI = transport('openai'); callGemini = transport('gemini');
      const sentences = {fr1: 'Il faut prendre une décision.', fr2: 'Je vais prendre le bus.', fr3: 'Le chat dort sur le canapé.',
        fr4: 'Il faut partir maintenant.', fr5: 'Nous voyons la mer.', en1: 'Run the company well.', en2: 'I run every morning.', en3: 'The chat was long.'};
      els.pages.replaceChildren(...Object.entries(sentences).map(([id, text]) => { const p = document.createElement('p'); p.id = 's-' + id; p.textContent = text;
        p.style.cssText = 'margin:14px 40px;font-size:22px;line-height:1.6'; return p; }));
      // Observe every visible state of the translation line: [ms since tap, text].
      window.__seq = []; new MutationObserver(() => { if (window.__t0) __seq.push([Math.round(performance.now() - __t0), mainTranslationText(), els.ttTranslation.textContent]); })
        .observe(els.ttTranslation, {childList: true, characterData: true, subtree: true});
      return 1; })()""")


def pause(s): c.js(f'new Promise(r => setTimeout(r, {int(s * 1000)}))')


def check(name, expression, timeout=0):
    deadline = time.monotonic() + timeout
    result = c.js(expression)
    while result is not True and time.monotonic() < deadline:
        time.sleep(.05); result = c.js(expression)
    assert result is True, (name, result, c.js("JSON.stringify({text: els.ttTranslation.textContent, seq: __seq.slice(-6), calls: __ai.calls.map(x => x.provider + ':' + x.word), tr: __tr.calls, gt: __gt.calls})"))
    print('PASS', name, flush=True)


def reset(*, clear_db=True, memory=True):
    c.js(f"""(async () => {{ els.ttCloseBtn?.click(); els.tooltip.style.display = 'none'; {"state.translationCache = {};" if memory else ""}
      {"await clearAllTranslationCaches();" if clear_db else ""} __ai.calls.length = 0; __tr.calls = 0; __gt.calls = 0; __spoken.length = 0;
      __ai.groq = {{delay: 300, fail: false}}; __ai.openai = {{delay: 900, fail: false}}; __ai.gemini = {{delay: 500, fail: false}};
      __tr.availability = 'available'; __tr.delay = 10; __gt.on = false; localTranslatorReady.clear(); localTranslators.clear(); __online = true; state.tooltipJustClosed = false; state.touchJustCommitted = 0;
      state.groqKey = 'test-groq-key'; state.openaiKey = 'test-openai-key'; return 1; }})()""")
    pause(.15)


def tap(word, sid):
    # Any text node of the sentence (a tap wraps the word in a highlight span), case-insensitive ("Run the company").
    p = c.js("""((w, id) => { const walker = document.createTreeWalker(document.getElementById('s-' + id), NodeFilter.SHOW_TEXT); let n;
      while ((n = walker.nextNode())) { const i = n.nodeValue.toLowerCase().indexOf(w); if (i < 0) continue;
        const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + w.length); const b = r.getBoundingClientRect();
        return {x: b.left + b.width / 2, y: b.top + b.height / 2}; } return null; })(%s, %s)""" % (json.dumps(word), json.dumps(sid)))
    assert p, ('word not found', word, sid)
    c.js("__seq.length = 0; window.__t0 = performance.now(); 1")
    for kind in ('mousePressed', 'mouseReleased'):
        c.call('Input.dispatchMouseEvent', type=kind, x=p['x'], y=p['y'], button='left', clickCount=1)


MAIN = "mainTranslationText()"
TIMES = {}
def first_time(text):   # ms from tap until the line first showed `text`
    return c.js("(t => { const e = __seq.find(s => s[1] === t); return e ? e[0] : null; })(%s)" % json.dumps(text))


window_book = 'reader_bookmark_bookA.txt_1000_1'
load()

# ---- priority / ordering -------------------------------------------------------------------------------------
reset(); tap('prendre', 'fr1')
check('5 local translator first: the on-device result is shown almost at once', f"{MAIN} === 'брати'", timeout=1)
TIMES['local first result'] = first_time('брати')
check('8 ... then fast AI (Groq) refines the same line', f"{MAIN} === 'прийняти'", timeout=2)
TIMES['fast AI refinement'] = first_time('прийняти')
check('8 ... then OpenAI adds the contextual note, in place', "els.ttTranslation.textContent.includes('prendre une décision — прийняти рішення')", timeout=3)
TIMES['OpenAI refinement'] = c.js("(__seq.find(s => s[2].includes('прийняти рішення')) || [null])[0]")
check('local-first: the "Translating..." loading state never appeared', "!__seq.some(s => s[2].includes(t('translating')))")
check('8 order on screen: local -> fast -> refinement, no blank in between',
      "(s => { const texts = s.map(x => x[1]).filter(Boolean); const firstAt = s.findIndex(x => x[1]);"
      " return texts.indexOf('брати') < texts.indexOf('прийняти') && firstAt >= 0 && !s.slice(firstAt).some(x => !x[2].trim()); })(__seq)")
check('popup stayed the same element and stayed open through all refinements', "els.tooltip.style.display === 'flex'")

reset(); c.js("__tr.availability = 'downloadable'; __ai.groq.delay = 60; __ai.openai.delay = 600; 1"); tap('run', 'en1')
check('6 fast AI first (no ready on-device pack): Groq result shown first', f"{MAIN} === 'керувати'", timeout=2)
check('6 ... a pack that still needs downloading never delayed the tap (no translator call)', "__tr.calls === 0")
check('6 ... OpenAI refines with its note', "els.ttTranslation.textContent.includes('керувати компанією')", timeout=3)

reset(); c.js("state.groqKey = ''; __tr.availability = 'unavailable'; __ai.openai.delay = 120; 1"); tap('chat', 'fr3')
check('7 OpenAI first (only an OpenAI key, no local): its result is the first shown', f"{MAIN} === 'кіт'", timeout=2)
check('7 ... and only OpenAI was asked', "__ai.calls.length === 1 && __ai.calls[0].provider === 'openai'")

reset(); c.js("__ai.openai.delay = 50; __ai.groq.delay = 400; __tr.delay = 700; 1"); tap('prendre', 'fr2')
check('9 OpenAI answers before fast AI and local', "els.ttTranslation.textContent.includes('сісти на автобус')", timeout=2)
pause(1.0)
check('10 a later fast-AI or local result never overwrites the higher-ranked OpenAI result',
      "els.ttTranslation.textContent.includes('сісти на автобус') && __tr.calls === 1 && __ai.calls.length === 2")

# ---- failure isolation -----------------------------------------------------------------------------------------
reset(); c.js("__ai.groq.fail = true; __ai.openai.fail = true; 1"); tap('partir', 'fr4')
check('11 local succeeds, both AI fail: the local result stays (no error replaces it)', f"{MAIN} === 'йти'", timeout=1)
pause(1.2); check('11 ... still the local result after both failures', f"{MAIN} === 'йти' && !els.ttTranslation.textContent.includes(t('translationUnavailable'))")
reset(); c.js("__tr.availability = 'unavailable'; __ai.openai.fail = true; __ai.groq.delay = 80; 1"); tap('run', 'en2')
check('12 fast AI succeeds, OpenAI fails: the fast result stays', f"{MAIN} === 'бігати'", timeout=2)
pause(1.2); check('12 ... unchanged after the OpenAI failure', f"{MAIN} === 'бігати'")
reset(); c.js("__tr.availability = 'unavailable'; __ai.groq.fail = true; __ai.openai.fail = true; 1"); tap('partir', 'fr4')
check('13 all network sources fail and nothing local: a localized message, never "Failed to fetch"',
      "els.ttTranslation.textContent === t('translationUnavailable')", timeout=3)
check('13 ... the message is not auto-closed', "els.tooltip.style.display === 'flex'")

# ---- caches ----------------------------------------------------------------------------------------------------
reset(); tap('prendre', 'fr1'); check('cache setup: OpenAI result', "els.ttTranslation.textContent.includes('прийняти рішення')", timeout=3)
pause(.3); reset(clear_db=False, memory=False); tap('prendre', 'fr1')
check('1 memory cache hit: final result at once', "els.ttTranslation.textContent.includes('прийняти рішення')", timeout=.5)
TIMES['memory cache hit'] = c.js("(__seq.find(s => s[2].includes('прийняти')) || [null])[0]")
check('1 ... zero network translation calls', "__ai.calls.length === 0 && __gt.calls === 0")
reset(clear_db=False, memory=True); tap('prendre', 'fr1')
check('2 IndexedDB exact-context hit (memory cleared): final result', "els.ttTranslation.textContent.includes('прийняти рішення')", timeout=1)
TIMES['IndexedDB exact-context hit'] = c.js("(__seq.find(s => s[2].includes('прийняти')) || [null])[0]")
check('2/18 ... zero network translation calls (the on-device result, if any, is never shown over the cached one)',
      "__ai.calls.length === 0 && __gt.calls === 0 && !__seq.some(s => s[1] === 'брати')")
reset(clear_db=False, memory=True); c.js("__tr.availability = 'unavailable'; __ai.groq.delay = 400; 1"); tap('prendre', 'fr2')
check('3 IndexedDB word-only hit (new sentence): the known word translation shows at once as provisional',
      f"{MAIN} === 'прийняти'", timeout=.6)
check('3 ... then the contextual AI refines it for THIS sentence', "els.ttTranslation.textContent.includes('сісти на автобус')", timeout=3)

# ---- persistence across reload ---------------------------------------------------------------------------------
pause(.3); load(); reset(clear_db=False, memory=True)
tap('prendre', 'fr1')
check('4 after a reload the exact word + sentence is instant from IndexedDB', "els.ttTranslation.textContent.includes('прийняти рішення')", timeout=1)
TIMES['repeat after reload (IndexedDB)'] = c.js("(__seq.find(s => s[2].includes('прийняти')) || [null])[0]")
check('18 repeated context after reload: zero new AI calls', "__ai.calls.length === 0 && __gt.calls === 0")

# ---- offline ---------------------------------------------------------------------------------------------------
reset(clear_db=False, memory=True); c.js("__online = false; 1"); tap('prendre', 'fr1')
check('14 offline + cached context: the cached AI result', "els.ttTranslation.textContent.includes('прийняти рішення')", timeout=1)
reset(); c.js("__online = false; 1"); tap('mer', 'fr5')
check('15 offline + ready on-device pack: the local result', f"{MAIN} === 'море'", timeout=1)
check('15 ... no network attempted', "__ai.calls.length === 0 && __gt.calls === 0")
reset(); c.js("__online = false; __tr.availability = 'unavailable'; 1"); tap('mer', 'fr5')
check('16 offline, nothing local: "No offline translation is available for this word."',
      "els.ttTranslation.textContent === t('offlineNoTranslation') && t('offlineNoTranslation') === 'No offline translation is available for this word.'", timeout=2)
check('16 ... no network attempted, no raw "Failed to fetch"', "__ai.calls.length === 0 && __gt.calls === 0 && !/Failed to fetch/.test(els.ttTranslation.textContent)")

# ---- race ------------------------------------------------------------------------------------------------------
reset(); c.js("__tr.availability = 'unavailable'; __ai.groq.delay = 900; __ai.openai.delay = 1200; 1"); tap('prendre', 'fr1')
# B is tapped in the last sentence, well away from A's popup (a tap under the popup would hit the popup instead).
pause(.1); c.js("__ai.groq.delay = 60; __ai.openai.delay = 150; 1"); tap('chat', 'en3')
check('17 tap A then B: B shows its own translation', f"{MAIN} === 'розмова'", timeout=2)
pause(1.5)
check("17 ... A's late answers never overwrite B (A's requests were cancelled)",
      f"{MAIN} === 'розмова' && els.ttOriginal.textContent === 'chat' && !els.ttTranslation.textContent.includes('прийняти')")

# ---- isolation and meanings ------------------------------------------------------------------------------------
reset(); tap('chat', 'fr3'); check('20 FR->UK: French "chat" = кіт', f"{MAIN} === 'кіт'", timeout=3); pause(1.2)
reset(clear_db=False, memory=True); tap('chat', 'en3')
check('19/21 EN->UK: English "chat" (same spelling) is NOT served from the French entry', f"{MAIN} === 'чат'", timeout=1)
check('19/21 ... it is refined to its own meaning (розмова)', f"{MAIN} === 'розмова'", timeout=3)
pause(1.2); reset(clear_db=False, memory=True); tap('chat', 'fr3')
check('21 ... and the French entry is still intact', f"{MAIN} === 'кіт' && __ai.calls.length === 0", timeout=1)
reset(); tap('run', 'en1'); check('22 "run" in "run the company" = керувати', f"{MAIN} === 'керувати'", timeout=3); pause(1.2)
reset(clear_db=False, memory=True); c.js("__tr.availability = 'unavailable'; 1"); tap('run', 'en2')
check('22 "run" in "I run every morning" is refined to бігати (its own context)', f"{MAIN} === 'бігати'", timeout=3)
pause(1.2); reset(clear_db=False, memory=True); tap('run', 'en1')
check('22 ... each context keeps its own cached meaning', f"{MAIN}.startsWith('керувати') && __ai.calls.length === 0", timeout=1)
reset(); tap('prendre', 'fr1'); check('23 prendre une décision -> прийняти рішення', "els.ttTranslation.textContent.includes('прийняти рішення')", timeout=3)
reset(clear_db=False, memory=True); tap('prendre', 'fr2'); check('23 prendre le bus -> сісти на автобус', "els.ttTranslation.textContent.includes('сісти на автобус')", timeout=3)

# ---- speech, timer ---------------------------------------------------------------------------------------------
reset(); c.js("state.speakSide = 'translation'; 1"); tap('prendre', 'fr1')
check('24 speech: the first useful translation is spoken', "__spoken.length === 1 && __spoken[0] === 'брати'", timeout=1)
check('24 ... refinements arrive', "els.ttTranslation.textContent.includes('прийняти рішення')", timeout=3)
check('24 ... and are NOT spoken again', "__spoken.length === 1")
c.js("state.speakSide = 'original'; 1")
reset(); c.js("__ai.groq.delay = 200; __ai.openai.delay = 1500; 1"); tap('prendre', 'fr1')
check('25 timer: first result on screen', f"{MAIN} === 'брати'", timeout=1)
pause(1.4); check('25 ... the popup is still open when the refinement is 1.5 s away', "els.tooltip.style.display === 'flex'")
check('25 ... the refinement lands in the open popup', "els.ttTranslation.textContent.includes('прийняти рішення')", timeout=2)
c.js("window.__refinedAt = performance.now(); 1")
c.wait("els.tooltip.style.display === 'none'", timeout=5)
closed_after = c.js("performance.now() - __refinedAt")
assert 1400 <= closed_after <= 2600, ('25 the reading interval restarts at the refinement', closed_after)
print('PASS 25 ... and it closes a full reading interval after the refinement (%d ms)' % closed_after)

# ---- books, eviction, storage ----------------------------------------------------------------------------------
reset(); tap('prendre', 'fr1'); check('26 book A cached', "els.ttTranslation.textContent.includes('прийняти рішення')", timeout=3); pause(.3)
reset(clear_db=False, memory=True); c.js("state.bookKey = 'reader_bookmark_bookB.txt_2000_2'; 1"); tap('prendre', 'fr1')
check('26 book B: book A\'s cache is not used (a fresh AI request)', "__ai.calls.length >= 1", timeout=2)
check('26 ... book B gets its own result', "els.ttTranslation.textContent.includes('прийняти рішення')", timeout=3)
pause(.3)
stats = c.js("(async () => { const a = await translationCacheStats(tcBookId('reader_bookmark_bookA.txt_1000_1')); const b = await translationCacheStats(tcBookId('reader_bookmark_bookB.txt_2000_2'));"
             " const removed = await clearBookTranslationCache(tcBookId('reader_bookmark_bookA.txt_1000_1'));"
             " const a2 = await translationCacheStats(tcBookId('reader_bookmark_bookA.txt_1000_1')); const b2 = await translationCacheStats(tcBookId('reader_bookmark_bookB.txt_2000_2'));"
             " return {a: a.entries, b: b.entries, removed, a2: a2.entries, b2: b2.entries, bytes: b2.bytes}; })()")
assert stats['a'] >= 2 and stats['b'] >= 2 and stats['a2'] == 0 and stats['b2'] == stats['b'], ('26 clear one book only', stats)
print('PASS 26 clearing book A removes only book A (A %d -> 0 entries, B keeps %d, %d bytes)' % (stats['a'], stats['b2'], stats['bytes']))
c.js("state.bookKey = 'reader_bookmark_bookA.txt_1000_1'; 1")

ev = c.js("""(async () => { await clearAllTranslationCaches(); translationCacheConfig.maxEntries = 10;
  for (let i = 0; i < 30; i++) { await tcStore({book: 'bEvict', src: 'fr', tgt: 'uk', word: 'mot' + i, ctxHash: 'h' + i, translation: 'слово' + i, note: null, provider: 'openai', rank: 4});
    await new Promise(r => setTimeout(r, 2)); }
  await new Promise(r => setTimeout(r, 200)); const s = await translationCacheStats();
  const newest = await tcLookup('bEvict', 'fr', 'uk', 'mot29', 'h29'), oldest = await tcLookup('bEvict', 'fr', 'uk', 'mot0', 'h0');
  translationCacheConfig.maxEntries = 10000; return {entries: s.entries, newest: !!newest.exact, oldest: !!oldest.exact}; })()""")
assert ev['entries'] <= 12 and ev['newest'] and not ev['oldest'], ('27 eviction', ev)
print('PASS 27 eviction: 60 records written with a 10-entry limit -> %d kept; newest kept, oldest evicted' % ev['entries'])

reset(); c.js("window.__realTcOpen = tcOpen; tcOpen = async () => null; 1"); tap('prendre', 'fr1')
check('28 IndexedDB unavailable: translation still works (local, then AI)', "els.ttTranslation.textContent.includes('прийняти рішення')", timeout=3)
c.js("tcOpen = __realTcOpen; 1")
st = c.js("(async () => { const s = await translationCacheStats(); return {persisted: s.persisted, asked: __persist.asked, flag: localStorage.getItem('reader_storage_persist_asked'), quota: s.quota, usage: s.usage}; })()")
assert st['asked'] <= 1 and st['flag'] == '1' and st['persisted'] is not True, ('29 persist denied', st)
print('PASS 29 storage.persist denied: asked once (%d), not persisted, translation unaffected; quota=%s usage=%s' % (st['asked'], st['quota'], st['usage']))
reset(); c.js("delete window.Translator; localTranslatorReady.clear(); 1"); tap('run', 'en1')
check('30 no on-device Translator API at all: AI translation still works', f"{MAIN} === 'керувати'", timeout=3)

# ---- Gemini as the active provider (no OpenAI/Groq keys) -------------------------------------------------------
reset(); c.js("state.groqKey = ''; state.openaiKey = ''; state.activeAiProvider = 'gemini'; state.apiKey = 'test-gemini-key'; __tr.availability = 'unavailable'; 1")
tap('dort', 'fr3')
check('an active Gemini is the one AI stage when no Groq/OpenAI keys are saved', "__ai.calls.length === 1 && __ai.calls[0].provider === 'gemini'", timeout=2)
c.js("state.activeAiProvider = 'openai'; state.apiKey = ''; 1")

check('no API key reached the persistent cache', """(async () => { const db = await tcOpen(); return await new Promise(res => { const out = [];
  const r = db.transaction('entries').objectStore('entries').openCursor(); r.onsuccess = () => { const cur = r.result; if (!cur) return res(!out.some(v => /test-(groq|openai|gemini)-key/.test(v))); out.push(JSON.stringify(cur.value)); cur.continue(); }; }); })()""")
check('no application errors', "__errors.length === 0 || JSON.stringify(__errors)")
print('TIMINGS (mocked sources, headless desktop Chrome):', json.dumps(TIMES))
print('ALL INSTANT TRANSLATION CHECKS PASSED')
