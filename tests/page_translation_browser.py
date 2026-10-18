"""A whole page translated ahead in ONE request, shown only for the word or sentence the reader touches (js/page-translate.js).

Why: a tapped word costs ~700 Groq tokens, a page of taps ~10 000, the free plan's day is 200 000 (HANDOFF.md «Groq's DAILY token limit»). One request for
the page (sentences + a meaning for every word, ~3-4 thousand tokens) then answers every tap on it instantly with no request at all.

Checked with a mocked fetch on a real book page: the first tap on a page goes the usual way while the page is requested in the background; later taps on
words, a sentence and a run of sentences are answered from it (mark 📄⚡) with NO request; a word or text it cannot answer goes the usual way; the page is
requested from Groq only (a refused Groq is never repeated on OpenAI for a page, nothing is requested during the cooldown, a failure is not retried at
once); the stored page answers after a restart; the switch in the key dialog; PDF and panels are left alone; the line-based answer survives a cut-off, junk
lines, an empty meaning and compound / elided words; a long page is cut to a window around the tapped sentence; the 📋 report carries no text.
No network, no keys."""
import base64, json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Network.enable'); c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Emulation.setDeviceMetricsOverride', width=1100, height=1000, deviceScaleFactor=1, mobile=False)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__reqs = []; window.__mode = 'ok'; window.__errors = []; window.__pageText = null;
addEventListener('error', e => __errors.push(e.message)); addEventListener('unhandledrejection', e => __errors.push(String(e.reason)));
const originalFetch = window.fetch;
const reply = (provider, text) => provider === 'openai' ? {status: 'completed', output: [{type: 'message', role: 'assistant', content: [{type: 'output_text', text}]}]} : {choices: [{finish_reason: 'stop', message: {content: text}}]};
window.fetch = async (url, options = {}) => {
  const a = String(url);
  if (a.split('?')[0].endsWith('/api/ai') && (!options.method || options.method === 'GET')) return new Response(JSON.stringify({groq: true, openai: true, format: {groq: true, openai: true}}), {status: 200});
  const shared = a.includes('/api/ai?provider='), provider = shared ? a.split('provider=')[1] : a.includes('api.groq.com') ? 'groq' : a.includes('api.openai.com') ? 'openai' : null;
  if (!provider) return originalFetch(url, options);
  let body = {}; try { body = JSON.parse(options.body); } catch (e) {}
  const prompt = typeof body.input === 'string' ? body.input : JSON.stringify(body.messages || '');
  const prompt2 = body.messages ? body.messages[0].content : prompt;
  const kind = prompt2.includes('Sentences:\n') ? 'page' : prompt2.includes('Слово "') ? 'word' : 'sentence';
  __reqs.push({kind, provider, prompt: prompt2, max: body.max_completion_tokens || body.max_output_tokens});
  if (kind === 'page') {
    if (__mode === 'page429' && provider === 'groq') return new Response(JSON.stringify({error: 'upstream', status: 429, rate: {kind: 'TPD', limit: 200000, used: 199900, requested: 900, retryAfterSec: 40}}), {status: 429});
    if (__mode === 'pageHang') return new Promise(() => {});
    const lines = prompt2.split('Sentences:\n')[1].split('\n').filter(Boolean).map(l => /^(\d+)\.\s(.*)$/.exec(l)).filter(Boolean);
    const blocks = lines.map(m => { const words = m[2].split(/\s+/); return m[1] + '\nT: Речення ' + m[1] + ': ' + m[2].split(/\s+/).slice(0, 3).join(' ') + '\nW: ' + words.map(w => w + '=сл:' + w.replace(/[^\p{L}'’-]/gu, '').toLowerCase()).join(' | '); });
    let text = blocks.join('\n\n');
    if (__pageText) text = __pageText(text, lines);
    return new Response(JSON.stringify(reply(provider, text)));
  }
  if (__mode === 'groq429' && provider === 'groq') return new Response(JSON.stringify({error: 'upstream', status: 429, rate: {kind: 'TPD', limit: 200000, used: 199900, requested: 900, retryAfterSec: 40}}), {status: 429});
  const text = kind === 'word' ? '{"direct":"слово-окремо","context":null}' : 'окреме речення';
  return new Response(JSON.stringify(reply(provider, text)));
};
''')


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.05); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def ok(name, cond, detail=None):
    assert cond, (name, detail)
    print('PASS', name, flush=True)


SENTENCES = ["Quand il est arrivé, nous avions déjà fini de dîner, mais il a voulu goûter la vieille tarte aux pommes.",
             "Elle a décidé de partir sans prévenir personne, car elle savait qu'ils tenteraient de la retenir.",
             "Les enfants jouaient dans le jardin pendant que leur mère préparait le repas du soir.",
             "Il faut absolument que tu viennes demain, sinon nous ne pourrons pas terminer le travail à temps.",
             "Malgré la pluie, les touristes se sont promenés le long de la rivière jusqu'à la tombée de la nuit.",
             "Je ne pensais pas qu'il oserait lui dire la vérité devant tout le monde.",
             "Chaque matin, le boulanger ouvre sa boutique avant que le soleil ne se lève sur la place.",
             "Si j'avais su que le train serait en retard, je serais resté à la maison."]
BOOK = "# Lecture\n\n" + " ".join(SENTENCES[:4]) + "\n\n" + " ".join(SENTENCES[4:]) + "\n"


def open_book(book=BOOK, name='lecture.md', marker='boulanger'):
    c.js("openBookFile(new File([Uint8Array.from(atob(%s),ch=>ch.charCodeAt(0))],%s,{lastModified:%d}))" % (json.dumps(base64.b64encode(book.encode()).decode()), json.dumps(name), int(time.time())))
    c.wait("els.pages.textContent.includes(%s)" % json.dumps(marker), timeout=20); time.sleep(0.8)
    if not c.js('state.translateMode'):
        c.js('els.translateBtn.click()'); time.sleep(0.3)
    time.sleep(1.2)   # the book lays itself out a moment after it opens
    for kind in ('mousePressed', 'mouseReleased'):   # the very first tap after opening a book only dismisses the page's hint: spend it on the margin
        c.call('Input.dispatchMouseEvent', type=kind, x=6, y=700, button='left', clickCount=1)
    time.sleep(0.4)


def fresh_app():
    c.call('Page.navigate', url=URL)
    c.wait("document.readyState==='complete' && !document.body.inert && typeof pageTranslationFor==='function' && sharedAiProbeAnswered === true", timeout=30)
    c.js("localStorage.clear(); indexedDB.deleteDatabase('reader-page-translations'); indexedDB.deleteDatabase('reader-translations'); showUpdateBanner=()=>{}; document.getElementById('sw-update-banner')?.remove(); 1")
    c.call('Page.reload')
    c.wait("document.readyState==='complete' && !document.body.inert && typeof pageTranslationFor==='function' && sharedAiProbeAnswered === true", timeout=30)
    c.js("""(() => { Object.defineProperty(navigator, 'onLine', {configurable: true, get: () => true}); state.targetLang = 'uk'; state.groqKey = ''; state.openaiKey = ''; state.activeAiProvider = 'groq'; state.aiRouting = 'auto';
        sharedAiProviders.groq = true; sharedAiProviders.openai = true; translateLocally = async () => null; machineTranslate = async () => ({html: '', plain: '', extras: ''}); return 1; })()""")


TAP = """(async (word, nth) => { const walker = document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT); let n, seen = 0, pos = null;
  while ((n = walker.nextNode())) { let i = -1; while ((i = n.nodeValue.indexOf(word, i + 1)) !== -1) { if (seen++ === nth) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + word.length); const b = r.getBoundingClientRect(); pos = {x: b.left + b.width / 2, y: b.top + b.height / 2}; break; } } if (pos) break; }
  return pos; })"""


def tap(word, nth=0):
    pos = c.js(f"({TAP})({json.dumps(word, ensure_ascii=False)}, {nth})")
    assert pos, word
    c.js("state.translationCache = {}; state.tooltipJustClosed = false; 1")
    for kind in ('mousePressed', 'mouseReleased'):
        c.call('Input.dispatchMouseEvent', type=kind, x=pos['x'], y=pos['y'], button='left', clickCount=1)


def shown():
    return c.js("els.ttTranslation.textContent")


def reqs(kind=None):
    return [r for r in c.js("__reqs") if kind is None or r['kind'] == kind]


def wait_text(pred_js, timeout=8):
    c.wait(pred_js, timeout=timeout)
    return shown()


# ---- 1. the first tap goes the usual way, the page is requested behind it -----------------------------------------------------
fresh_app(); open_book()
tap('enfants')
text = wait_text("/(⚡|🧠)/.test(els.ttTranslation.textContent)")
ok('1a the first tap on a page is answered the usual way, at once (one word request to Groq, no page mark)', '📄' not in text and '⚡' in text and len(reqs('word')) == 1 and reqs('word')[0]['provider'] == 'groq', (text, reqs()))
check('1b ... and the whole page is requested behind it', "pageTr.pages.size === 1 && [...pageTr.pages.values()][0].status === 'ready'", timeout=8)
page = reqs('page')
ok('1c ONE page request, to Groq only, for the sentences of the page (numbered), with a token budget made for them', len(page) == 1 and page[0]['provider'] == 'groq' and 'Sentences:\n1. Lecture\n2. Quand il est arrivé' in page[0]['prompt'] and page[0]['prompt'].count('\n') < 40 and 500 < page[0]['max'] < 6000, page and (page[0]['provider'], page[0]['max']))
ok('1d the page prompt asks for plain lines, not JSON, and for a meaning of every word', 'W: <word>=<meaning>' in page[0]['prompt'] and 'no JSON' in page[0]['prompt'])
c.js("els.ttCloseBtn.click(); 1")

# ---- 2. later taps are answered by the page, with no request -------------------------------------------------------------------
n_before = len(reqs())
tap('jardin')
text = wait_text("/📄/.test(els.ttTranslation.textContent)")
ok('2a a word of the same page: its meaning from the page, marked 📄⚡', text.startswith('сл:jardin') and '📄⚡' in text, text)
ok('2b ... without a single request', len(reqs()) == n_before, reqs()[n_before:])
tap('tarte')
text = wait_text("/📄/.test(els.ttTranslation.textContent)")
ok('2c another word, in another sentence of the page', text.startswith('сл:tarte') and len(reqs()) == n_before, text)
tap('qu', 0)   # a fragment that is not a whole word of the sentence is not a word tap at all -> nothing is asserted about it
c.js("els.ttCloseBtn.click(); 1")

# a sentence (the reader's 'sentence' button): the page's translation of exactly that sentence
c.js("state.translationCache = {}; handleWordOrSelection(%s, 300, 300, null); 1" % json.dumps(SENTENCES[2]))
text = wait_text("/📄/.test(els.ttTranslation.textContent)")
ok('2d a whole sentence: the page\'s translation of that sentence, no request', text.startswith('Речення 4: Les enfants jouaient') and len(reqs()) == n_before, text)
c.js("state.translationCache = {}; handleWordOrSelection(%s, 300, 300, null); 1" % json.dumps(" ".join(SENTENCES[:2])))
text = wait_text("/📄/.test(els.ttTranslation.textContent)")
ok('2e a run of sentences (a paragraph selection): their translations joined, no request', 'Речення 2:' in text and 'Речення 3:' in text and len(reqs()) == n_before, text)

# ---- 3. what the page cannot answer goes the usual way ---------------------------------------------------------------------------
c.js("state.translationCache = {}; handleWordOrSelection('partir sans prévenir', 300, 300, null); 1")
text = wait_text("els.ttTranslation.textContent.includes('окреме')")
ok('3a a phrase inside a sentence is not a sentence of the page: the usual sentence request', 1 <= len(reqs('sentence')) <= 2 and '📄' not in text, (text, reqs()))
c.js("state.ctxSentence = %s; state.translationCache = {}; handleWordOrSelection('absent', 300, 300, null); 1" % json.dumps(SENTENCES[0]))
text = wait_text("els.ttTranslation.textContent.includes('слово-окремо')")
ok('3b a word the page has no meaning for goes the usual way', '📄' not in text and len(reqs('word')) == 2, (text, reqs()))
c.js("state.ctxSentence = 'Une phrase qui n\\'est pas sur cette page, du tout.'; state.translationCache = {}; handleWordOrSelection('phrase', 300, 300, null); 1")
text = wait_text("els.ttTranslation.textContent.includes('слово-окремо')")
ok('3c a word of a sentence that is not on the page goes the usual way and does not start another page request', len(reqs('page')) == 1, reqs('page'))

# ---- 4. the stored page answers after a restart --------------------------------------------------------------------------------------
c.js("els.ttCloseBtn.click(); 1")
time.sleep(0.6)
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof pageTranslationFor==='function' && sharedAiProbeAnswered === true", timeout=30)
c.js("""(() => { Object.defineProperty(navigator, 'onLine', {configurable: true, get: () => true}); state.targetLang = 'uk'; state.groqKey = ''; sharedAiProviders.groq = true; sharedAiProviders.openai = true; translateLocally = async () => null; machineTranslate = async () => ({html: '', plain: '', extras: ''}); return 1; })()""")
open_book()
tap('enfants')
text = wait_text("/(📄|⚡|🧠)/.test(els.ttTranslation.textContent)")
ok('4a after a restart the FIRST tap on the page is answered from the stored page: no word request, no page request', '📄' in text and text.startswith('сл:enfants') and c.js('__reqs.length') == 0, (text, reqs()))
c.js("els.ttCloseBtn.click(); 1")

# ---- 5. Groq only, nothing during a refusal -----------------------------------------------------------------------------------------
fresh_app(); open_book()
c.js("__mode = 'page429'; 1")
tap('enfants')
wait_text("/(⚡|🧠)/.test(els.ttTranslation.textContent)")
check('5a Groq refuses the page (429): the page is marked failed, the reader\'s tap was answered the usual way', "[...pageTr.pages.values()][0].status === 'failed' && pageTr.last.ok === false", timeout=8)
ok('5b ... and the page was NOT repeated on OpenAI (not even with the site\'s shared OpenAI key): one page request, to Groq', [(r['kind'], r['provider']) for r in reqs('page')] == [('page', 'groq')], reqs('page'))
c.js("els.ttCloseBtn.click(); 1")
n = len(reqs('page'))
tap('jardin'); wait_text("/(⚡|🧠)/.test(els.ttTranslation.textContent)")
ok('5c while Groq refuses (cooldown) and within a minute of the failure no new page request is made', len(reqs('page')) == n, reqs('page'))
# a DIFFERENT page while Groq is cooling down: still nothing is requested (the cooldown, not the failed-page memory, is what stops it)
n = c.js("pageTr.requests")
c.js("""(() => { window.__html = els.pages.innerHTML; els.pages.innerHTML = '<p>Un autre texte, tout à fait différent. Et une seconde phrase, pour faire bonne mesure.</p>'; groqCooldownUntil = Date.now() + 30000; return 1; })()""")
c.js("""pageTranslationFor('texte', 'Un autre texte, tout à fait différent.', false, 'fr', 'uk').then(r => { window.__other = r; })""")
time.sleep(0.6)
ok('5c2 another page while Groq is cooling down: nothing is requested', c.js("pageTr.requests") == n and c.js("__other") is None, reqs('page'))
c.js("els.pages.innerHTML = __html; 1")
c.js("els.ttCloseBtn.click(); [...pageTr.pages.values()][0].at -= 61000; groqCooldownUntil = 0; __mode = 'ok'; 1")
tap('tarte'); wait_text("/(⚡|🧠)/.test(els.ttTranslation.textContent)")
check('5d a minute later (and Groq answering) the page is requested again and becomes ready', "[...pageTr.pages.values()][0].status === 'ready'", timeout=8)

# ---- 6. the switch and the formats that are left alone -----------------------------------------------------------------------------------
fresh_app(); open_book()
c.js("openKeySettings(); 1")
check('6a the key dialog has the switch, on by default, with its text', "document.getElementById('page-tr-input').checked === true && t('pageTrLabel').length > 10 && document.getElementById('page-tr-input').closest('label').textContent.includes(t('pageTrLabel'))")
c.js("document.getElementById('page-tr-input').click(); 1")
ok('6b switched off: stored', c.js("localStorage.getItem('reader_page_translate')") == '0')
c.js("closeKeySettings(); 1")
tap('enfants'); wait_text("/(⚡|🧠)/.test(els.ttTranslation.textContent)"); time.sleep(0.8)
ok('6c with the switch off nothing is requested for a page', len(reqs('page')) == 0 and c.js("pageTr.pages.size") == 0, reqs())
c.js("localStorage.removeItem('reader_page_translate'); els.ttCloseBtn.click(); state.format = 'pdf'; 1")
tap('jardin'); wait_text("/(⚡|🧠)/.test(els.ttTranslation.textContent)"); time.sleep(0.8)
ok('6d a PDF is left alone for now (its sentences are broken by columns and need their own check on real books)', len(reqs('page')) == 0, reqs())
c.js("state.format = 'md'; els.ttCloseBtn.click(); 1")
c.js("document.getElementById('ask-content') && 0; 1")

# ---- 7. a long page is cut to a window around the tapped sentence --------------------------------------------------------------------
long_sentences = [f"Phrase numéro {i} de la page très longue, avec assez de mots pour occuper de la place sur la ligne." for i in range(1, 61)]
fresh_app(); open_book("# Long\n\n" + " ".join(long_sentences) + "\n", 'long.md', 'Phrase numéro 1 ')
c.js("els.ttCloseBtn && els.ttCloseBtn.click(); 1")
win = c.js("""(() => { const s = pageTrSentences(); const w = pageTrWindow(s, s[30]); return {all: s.length, n: w.length, first: w[0], has: w.includes(s[30]), chars: w.join(' ').length}; })()""")
ok('7a a long page is cut to at most 28 sentences / 3000 characters, containing the tapped sentence', win['all'] > 28 and win['n'] <= 28 and win['has'] and win['chars'] <= 3000, win)
ok('7b a tapped sentence that is not on the page gives no window', c.js("pageTrWindow(pageTrSentences(), 'Rien de tel sur cette page, vraiment pas.') === null"))

# ---- 8. the line-based answer is read tolerantly ---------------------------------------------------------------------------------------
PARSE = """((raw) => { const s = ['Il est arrivé hier.', "L'homme peut-être viendra.", 'Troisième phrase ici.']; const it = pageTrParse(raw, s, 'uk'); return it && it.map(i => ({t: i.t, w: i.w})); })"""
parse = lambda raw: c.js(f"({PARSE})({json.dumps(raw, ensure_ascii=False)})")
good = "1\nT: Він прибув учора.\nW: Il=він | est arrivé=прибув | hier=учора\n\n2\nT: Людина, можливо, прийде.\nW: L'homme=людина | peut-être=можливо | viendra=прийде\n\n3\nT: Третє речення тут.\nW: Troisième=третє | phrase=речення | ici=тут"
r = parse(good)
ok('8a a complete answer: every sentence and word is taken', r and all(i['t'] for i in r) and sum(len(i['w']) for i in r) == 9, r)
r = parse(good[:good.index('3\nT:') + 12])
ok('8b an answer cut off in the middle: the finished sentences are kept, the cut one gives what is whole', r and r[0]['t'] and r[1]['t'] and r[1]['w'], r)
r = parse("Here is the translation:\n" + good.replace('\n\n', '\n\nнезрозумілий рядок\n') + "\n```")
ok('8c junk lines and fences are ignored', r and all(i['t'] for i in r) and sum(len(i['w']) for i in r) == 9, r)
r = parse("1\nT: Він прибув.\nW: Il=він | est=- | arrivé=— | hier=...\n")
ok('8d an empty meaning ("-", "—", "...") is not a meaning: that word is left to the usual request', r and [w[0] for w in r[0]['w']] == ['Il'], r and r[0]['w'])
r = parse("1\nT: Він прибув.\nW: Il=he | arrivé=arrived\n")
ok('8e meanings and translations in the wrong script are refused (Latin for Ukrainian)', r is None or (not r[0]['w'] and True), r)
r = parse("2\nT: Людина.\nW: L'homme=людина\n\n2\nT: ДУБЛЬ.\nW: x=дубль")
ok('8f a repeated number does not overwrite the first block; unknown numbers are ignored', r and r[1]['t'] == 'Людина.' and r[0]['t'] is None, r)
ok('8g nothing usable at all gives null (the page is then marked failed)', parse("sorry, I cannot") is None)
find = c.js("""(() => { const page = {status: 'ready', src: 'fr', tgt: 'uk', provider: 'groq', items: [{text: "L'homme peut-être viendra.", t: 'Т', w: [["L'homme", 'людина'], ['peut-être', 'можливо'], ['est arrivé', 'прибув']]}]};
   pageTr.pages.clear(); pageTr.pages.set('k', page); const f = w => { const h = pageTrFind(w, "L'homme peut-être viendra.", false, 'fr', 'uk'); return h && h.text; };
   return {elided: f('homme'), compound: f('arrivé'), hyphen: f('être'), punct: f('viendra.'), caseless: f('HOMME'), none: f('absent')}; })()""")
ok('8h a tapped word is found inside an elided / hyphenated / compound item and ignores case and punctuation',
   find == {'elided': 'людина', 'compound': 'прибув', 'hyphen': 'можливо', 'punct': None, 'caseless': 'людина', 'none': None}, find)

# ---- 8b. one request at a time, and panels are not pages ---------------------------------------------------------------------------------
fresh_app(); open_book()
c.js("__mode = 'pageHang'; 1")
tap('enfants'); wait_text("/(⚡|🧠)/.test(els.ttTranslation.textContent)")
tap('jardin'); wait_text("/(⚡|🧠)/.test(els.ttTranslation.textContent)"); time.sleep(0.5)
ok('8i while the page is still being translated further taps are answered the usual way and do NOT start a second page request', len(reqs('page')) == 1 and len(reqs('word')) == 2, [(r['kind']) for r in reqs()])
fresh_app(); open_book()
n = c.js("pageTr.requests")
c.js("""(() => { els.askContent.textContent = """ + json.dumps(SENTENCES[2]) + """; state.lastSelectedRange = null; state.lastWordNode = els.askContent.firstChild; state.ctxSentence = """ + json.dumps(SENTENCES[2]) + """; state.translationCache = {}; handleWordOrSelection('enfants', 300, 300, null); return 1; })()""")
wait_text("/(⚡|🧠)/.test(els.ttTranslation.textContent)"); time.sleep(0.5)
ok('8j a tap inside a panel (Ask / Grammar) is not a page of the book: no page lookup, no page request', c.js("pageTr.requests") == n and len(reqs('page')) == 0 and '📄' not in shown(), reqs())

# a page whose answer is unusable is not asked for again at once (nothing to do with a Groq cooldown), and a second PAGE is not asked for while one is running
fresh_app(); open_book()
c.js("__pageText = () => 'sorry, I cannot'; 1")
tap('enfants'); wait_text("/(⚡|🧠)/.test(els.ttTranslation.textContent)")
check('8k an unusable page answer marks the page failed (no Groq cooldown involved)', "[...pageTr.pages.values()][0].status === 'failed' && !groqCoolingDown()", timeout=8)
tap('jardin'); wait_text("/(⚡|🧠)/.test(els.ttTranslation.textContent)"); time.sleep(0.5)
ok('8l ... and the next tap within a minute does not ask for it again', len(reqs('page')) == 1, reqs('page'))
c.js("__pageText = null; [...pageTr.pages.values()][0].at -= 61000; 1")
tap('tarte'); wait_text("/(⚡|🧠)/.test(els.ttTranslation.textContent)")
check('8m ... a minute later it is asked for again and succeeds', "[...pageTr.pages.values()][0].status === 'ready' && __reqs.filter(r => r.kind === 'page').length === 2", timeout=8)
fresh_app(); open_book()
c.js("__mode = 'pageHang'; 1")
tap('enfants'); wait_text("/(⚡|🧠)/.test(els.ttTranslation.textContent)")
c.js("""(() => { window.__html = els.pages.innerHTML; els.pages.innerHTML = '<p>Un autre texte, tout à fait différent. Et une seconde phrase, pour faire bonne mesure.</p>'; return 1; })()""")
c.js("pageTranslationFor('texte', 'Un autre texte, tout à fait différent.', false, 'fr', 'uk'); 1"); time.sleep(0.6)
ok('8n while one page is being translated no second page is requested', len(reqs('page')) == 1, reqs('page'))
c.js("els.pages.innerHTML = __html; 1")

# ---- 9. diagnostics, languages ---------------------------------------------------------------------------------------------------------
fresh_app(); open_book()
tap('enfants'); wait_text("/(⚡|🧠)/.test(els.ttTranslation.textContent)")
check('9a the page is ready', "[...pageTr.pages.values()][0] && [...pageTr.pages.values()][0].status === 'ready'", timeout=8)
rep = c.js("JSON.parse(buildDiagnosticsReport()).pageTranslation")
ok('9b the 📋 report says how many pages and requests, and the last request — with no text of the book', rep['ready'] == 1 and rep['requests'] == 1 and rep['last']['ok'] is True and rep['last']['sentences'] == 9 and 'enfants' not in json.dumps(rep) and 'Речення' not in json.dumps(rep), rep)
ok('9c both texts exist in all 9 menu languages', c.js("['pageTrLabel','pageTrHint'].every(k => ['uk','en','fr','ru','zh','ko','hi','ga','es'].every(l => typeof I18N[k][l] === 'string' && I18N[k][l].length > 8))"))
ok('9d nothing threw', c.js("__errors.length") == 0, c.js("__errors"))
print('ALL PASS')
