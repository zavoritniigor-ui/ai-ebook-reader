"""After Groq refuses for a quota (HTTP 429) the request goes straight to the backup, and the reader is told WHY the answer carries OpenAI's mark.

User report: «most translations come from OpenAI, the Groq priority does not work». Measured on production with Groq's own numbers: the shared key's free-plan
DAILY token limit (200000 for gpt-oss-120b) was 99.5% used, so only the odd request fitted; every other one was refused with a 429 and answered by OpenAI as
designed. (Other Groq models were measured as a way round it and are NOT usable: gpt-oss-20b and qwen3.8-27b put Russian words into Ukrainian translations,
llama-3.3-70b answers 404.) What changes: a model that has just refused is not asked again until its limit lifts (no wasted round trip); an outage (5xx), a
network error, a timeout or a cancelled request start no cooldown; photo checks have their own model and are untouched; a tapped word whose answer carries
OpenAI's mark after a refused Groq says «ліміт Groq» beside it; and a sentence's alignment view shows the mark of the provider that REALLY answered (it used
to say ⚡ whoever answered). Mocked fetch, no network, no keys."""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Network.enable'); c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__asked = []; window.__behave = 'ok'; window.__errors = []; window.__bodies = [];
addEventListener('error', e => __errors.push(e.message)); addEventListener('unhandledrejection', e => __errors.push(String(e.reason)));
const originalFetch = window.fetch;
const reply = (provider, text) => provider === 'openai' ? {status: 'completed', output: [{type: 'message', role: 'assistant', content: [{type: 'output_text', text}]}]} : {choices: [{finish_reason: 'stop', message: {content: text}}]};
window.fetch = async (url, options = {}) => {
  const a = String(url);
  if (a.split('?')[0].endsWith('/api/ai') && (!options.method || options.method === 'GET')) return new Response(JSON.stringify({groq: true, openai: true, format: {groq: true, openai: true}}), {status: 200});
  const shared = a.includes('/api/ai?provider='), provider = shared ? a.split('provider=')[1] : a.includes('api.groq.com') ? 'groq' : a.includes('api.openai.com') ? 'openai' : null;
  if (!provider) return originalFetch(url, options);
  let body = {}; try { body = JSON.parse(options.body); } catch (e) {}
  const prompt = JSON.stringify(body.messages || body.input || '');
  const alignment = prompt.includes('alignment');
  const text = alignment ? '{"translation":"зелене яблуко","alignment":[{"source":["pomme"],"target":"яблуко","confidence":"high"},{"source":["verte"],"target":"зелене","confidence":"high"}]}'
    : '{"direct":"відповідь ' + (provider === 'openai' ? 'OpenAI' : 'Groq') + '","context":null}';
  if (body.model && /qwen/.test(body.model)) { __asked.push('vision'); return new Response(JSON.stringify(reply('groq', 'фото ok'))); }
  __asked.push(provider);
  if (provider === 'groq') {
    if (__behave === '429') return new Response(JSON.stringify({error: 'upstream', status: 429, rate: {kind: 'TPD', limit: 200000, used: 199119, requested: 941, retryAfterSec: 30}}), {status: 429});
    if (__behave === '429short') return new Response(JSON.stringify({error: 'upstream', status: 429, rate: {kind: 'TPM', limit: 8000, used: 7900, requested: 700, retryAfterSec: 1}}), {status: 429});
    if (__behave === '429long') return new Response(JSON.stringify({error: 'upstream', status: 429, rate: {kind: 'TPD', limit: 200000, used: 200000, requested: 941, retryAfterSec: 86000}}), {status: 429});
    if (__behave === '503') return new Response('{"error":"overloaded"}', {status: 503});
    if (__behave === 'network') throw new TypeError('Failed to fetch');
  }
  return new Response(JSON.stringify(reply(provider, text)));
};
''')


def ok(name, cond, detail=None):
    assert cond, (name, detail)
    print('PASS', name, flush=True)


c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof groqCoolingDown==='function' && sharedAiProbeAnswered === true", timeout=30)
c.js("localStorage.clear(); showUpdateBanner=()=>{}; document.getElementById('sw-update-banner')?.remove(); 1")

SETUP = """((behave, own) => { __behave = behave; __asked.length = 0; groqCooldownUntil = 0; groqLimitedAt = 0; state.groqKey = own ? 'gsk-own' : ''; state.openaiKey = own ? 'sk-own' : ''; state.activeAiProvider = 'groq';
  state.aiRouting = 'auto'; sharedAiProviders.groq = !own; sharedAiProviders.openai = !own; return 1; })"""
ASK = """(async (task, forced, dataUrl) => { __asked.length = 0; const before = readerAiRequests().length; let out = null, error = null;
  try { out = dataUrl ? await callAIVision('Reply ok', dataUrl, undefined, {}) : await callAI('Translate: pomme', undefined, task, undefined, forced ? {provider: 'groq'} : {}); } catch (e) { error = {reason: e.reason, status: e.status, name: e.name}; }
  return {out, error, asked: __asked.slice(), log: readerAiRequests().slice(before).map(e => ({provider: e.provider, ok: e.ok, status: e.status, reason: e.reason, skipped: e.skipped, rate: e.rate})),
          cool: Math.round((groqCooldownUntil - Date.now()) / 1000) }; })"""
setup = lambda behave='ok', own=False: c.js(f"({SETUP})({json.dumps(behave)}, {json.dumps(own)})")
ask = lambda task='translation', forced=True, vision=False: c.js(f"({ASK})({json.dumps(task)}, {json.dumps(forced)}, {json.dumps('data:image/png;base64,iVBORw0KGgo=' if vision else None)})")

setup('429')
r = ask()
ok('A Groq refuses with a 429: OpenAI answers, the log keeps the limit that refused', 'OpenAI' in r['out'] and r['asked'] == ['groq', 'openai'] and r['log'][0]['status'] == 429 and r['log'][0]['rate']['kind'] == 'TPD', r)
ok('A ... and Groq is left alone for as long as the limit says (30 s)', 25 <= r['cool'] <= 31, r['cool'])

r = ask()
ok('B while it refuses, the next request does NOT go to Groq at all: OpenAI answers at once', r['asked'] == ['openai'] and 'OpenAI' in r['out'], r)
ok('B ... the log says why no Groq request came first', r['log'][0] == {'provider': 'groq', 'ok': False, 'status': 429, 'reason': 'cooldown', 'skipped': True}, r['log'])

c.js("groqCooldownUntil = Date.now() - 1; __behave = 'ok'; 1")
r = ask()
ok('C once the limit has lifted Groq is asked first again and answers', r['asked'] == ['groq'] and 'Groq' in r['out'], r)

for behave, low, high, why in (('429short', 2, 3, 'a limit that lifts in 1 s still leaves Groq alone for 3 s (not a hot loop)'), ('429long', 590, 600, 'a daily limit that lifts in a day is waited for at most 10 minutes')):
    setup(behave); r = ask()
    ok('D ' + why, low <= r['cool'] <= high, r['cool'])

for behave, why in (('503', 'an outage (503)'), ('network', 'a network error')):
    setup(behave); ask(); c.js("__behave = 'ok'; 1"); r = ask()
    ok(f'E {why} starts no cooldown: the very next request is asked of Groq again', r['asked'] == ['groq'] and 'Groq' in r['out'], r)

setup('429')
r = ask(vision=True)
ok('F a photo check has its own Groq model: it is sent even while the text model refuses, and a 429 of the text model does not stop it', r['asked'] == ['vision'] and r['out'] == 'фото ok', r)
setup('ok'); c.js("groqCooldownUntil = Date.now() + 100000; 1")
r = ask(vision=True)
ok('F ... also during a cooldown that the text model started', r['asked'] == ['vision'], r)

setup('429')
r = c.js("""(async () => { const ctl = new AbortController(); const p = callAI('x', ctl.signal, 'translation', undefined, {provider: 'groq'}).then(() => 'answered', e => e.name); ctl.abort(); return {r: await p, cool: groqCoolingDown()}; })()""")
ok('G a cancelled request starts no cooldown', r['r'] == 'AbortError' and r['cool'] is False, r)

setup('429', own=True)
r = ask(forced=False)
ok('H own Groq + own OpenAI keys: the same (a 429 -> OpenAI, then Groq is skipped while it refuses)', r['asked'] == ['groq', 'openai'] and ask(forced=False)['asked'] == ['openai'], r)

# the reader sees why
TAP = """(async (word) => { state.translationCache = {}; els.ttCloseBtn && els.ttCloseBtn.click(); handleWordOrSelection(word, 200, 200, null);
  for (let i = 0; i < 100 && !/відповідь|яблуко/.test(els.ttTranslation.textContent); i++) await new Promise(r => setTimeout(r, 50)); return els.ttTranslation.textContent; })"""
c.js("""(() => { Object.defineProperty(navigator, 'onLine', {configurable: true, get: () => true}); state.targetLang = 'uk'; machineTranslate = async () => ({html: '', plain: '', extras: ''}); translateLocally = async () => null; return 1; })()""")
setup('429')
text = c.js(f"({TAP})('pomme')")
ok('I a tapped word after a refused Groq: OpenAI\'s mark with the reason beside it', '🧠' in text and 'ліміт Groq' in text and '⚡' not in text, text)
text = c.js(f"({TAP})('verte')")
ok('I ... and the next tap, answered by OpenAI without even asking Groq, says the same', '🧠' in text and 'ліміт Groq' in text and c.js('__asked.filter(x => x === "groq").length') == 1, (text, c.js('__asked')))
setup('503')
text = c.js(f"({TAP})('pomme')")
ok('I a Groq outage is NOT a quota: OpenAI\'s mark without the note', '🧠' in text and 'ліміт' not in text, text)
setup('ok')
text = c.js(f"({TAP})('pomme')")
ok('I Groq answering: ⚡, no note', '⚡' in text and '🧠' not in text and 'ліміт' not in text, text)

SENT = """(async (sentence) => { els.pages.textContent = "Voici " + sentence + "."; state.translationCache = {}; els.ttCloseBtn && els.ttCloseBtn.click(); handleWordOrSelection(sentence, 200, 200, null);
  for (let i = 0; i < 100 && !document.querySelector('#tt-translation .alignment-word'); i++) await new Promise(r => setTimeout(r, 50));
  return {text: els.ttTranslation.textContent, words: document.querySelectorAll('#tt-translation .alignment-word').length}; })"""
setup('429')
r = c.js(f"({SENT})('une pomme verte')")
ok('J a sentence view with word links shows the mark of the provider that REALLY answered (OpenAI after a refused Groq), not always ⚡', r['words'] == 2 and '🧠' in r['text'] and 'ліміт Groq' in r['text'] and '⚡' not in r['text'], r)
setup('ok')
r = c.js(f"({SENT})('une pomme verte')")
ok('J ... and ⚡ when Groq answered', r['words'] == 2 and '⚡' in r['text'] and '🧠' not in r['text'], r)

ok('K the note exists in all 9 menu languages and is not the English text where the language differs',
   c.js("['uk','en','fr','ru','zh','ko','hi','ga','es'].every(l => typeof I18N.aiNoteGroqLimit[l] === 'string' && I18N.aiNoteGroqLimit[l].length > 3) && ['uk','fr','ru','zh','ko','hi','ga','es'].every(l => I18N.aiNoteGroqLimit[l] !== I18N.aiNoteGroqLimit.en)"))
ok('L nothing threw', c.js("__errors.length") == 0, c.js("__errors"))
print('ALL PASS')
