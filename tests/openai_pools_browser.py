"""OpenAI requests use the models of OpenAI's FREE daily token pools: gpt-5.4 (250K tokens a day) first, gpt-5.4-mini (2.5M a day) once this device has
used 90% of the big pool today (UTC). OpenAI does not refuse when a pool is used up -- it bills -- so the app counts the usage OpenAI reports with every
reply itself (also of a cut-off reply and of a streamed one). Owner's request 2026-10-18 («use one pool, then the other»); measured on production that
gpt-5.4 translates as well as the billed gpt-5.6-luna used before, gpt-5.4-mini a little worse. A tapped word answered by the small model says «🧠 mini».
Mocked fetch, no network, no keys."""
import json, os
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Network.enable'); c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__models = []; window.__behave = 'ok'; window.__errors = [];
addEventListener('error', e => __errors.push(e.message)); addEventListener('unhandledrejection', e => __errors.push(String(e.reason)));
const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  const a = String(url);
  if (a.split('?')[0].endsWith('/api/ai') && (!options.method || options.method === 'GET')) return new Response(JSON.stringify({groq: false, openai: true, format: {groq: false, openai: true}}), {status: 200});
  if (!a.includes('/api/ai?provider=openai') && !a.includes('api.openai.com')) return originalFetch(url, options);
  let body = {}; try { body = JSON.parse(options.body); } catch (e) {}
  __models.push(body.model);
  const prompt = JSON.stringify(body.input || '');
  const text = prompt.includes('"direct"') ? '{"direct":"яблуко","context":null}' : 'відповідь';
  const usage = {input_tokens: 600, output_tokens: 400, total_tokens: 1000};
  const model = body.model + '-2026-03-05';   // OpenAI answers with a dated snapshot name
  if (body.stream) {
    const done = __behave === 'cut' ? {type: 'response.incomplete', response: {incomplete_details: {reason: 'max_output_tokens'}, usage}} : {type: 'response.completed', response: {status: 'completed', usage}};
    const sse = 'data: ' + JSON.stringify({type: 'response.output_text.delta', delta: text}) + '\n\n' + 'data: ' + JSON.stringify(done) + '\n\n';
    return new Response(sse, {status: 200, headers: {'content-type': 'text/event-stream'}});
  }
  const status = __behave === 'cut' ? 'incomplete' : 'completed';
  return new Response(JSON.stringify({status, model, incomplete_details: status === 'incomplete' ? {reason: 'max_output_tokens'} : null, usage,
    output: [{type: 'message', role: 'assistant', content: [{type: 'output_text', text}]}]}));
};
''')


def ok(name, cond, detail=None):
    assert cond, (name, detail)
    print('PASS', name, flush=True)


c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof openaiModel==='function' && sharedAiProbeAnswered === true", timeout=30)
c.js("localStorage.clear(); showUpdateBanner=()=>{}; document.getElementById('sw-update-banner')?.remove(); 1")
c.js("""(() => { state.groqKey = ''; state.openaiKey = ''; state.apiKey = ''; state.activeAiProvider = 'openai'; state.aiRouting = 'auto';
  sharedAiProviders.groq = false; sharedAiProviders.openai = true; return 1; })()""")

TODAY = c.js("new Date().toISOString().slice(0, 10)")
used = lambda: c.js("JSON.parse(localStorage.getItem('reader_openai_pool_usage') || 'null')")
setused = lambda v: c.js(f"localStorage.setItem('reader_openai_pool_usage', {json.dumps(json.dumps(v))}); 1")
ASK = """(async (task, behave) => { __behave = behave || 'ok'; __models.length = 0; const meta = {}; let out = null, error = null;
  try { out = await callAI('Say ok', undefined, task, task === 'ask' ? () => {} : undefined, {meta}); } catch (e) { error = e.reason || String(e); }
  return {out, error, models: __models.slice(), model: meta.model, last: readerAiRequests().slice(-1)[0]}; })"""
ask = lambda task='grammar_paradigm', behave='ok': c.js(f"({ASK})({json.dumps(task)}, {json.dumps(behave)})")

r = ask()
ok('A a fresh day: OpenAI is asked with gpt-5.4 (the big free pool)', r['models'] == ['gpt-5.4'] and r['out'] == 'відповідь', r)
ok('A ... and the 1000 tokens of its reply are counted for today', used() == {'day': TODAY, 'used': {'gpt-5.4': 1000}}, used())
ok('A ... the request log names the model that answered', r['last']['model'].startswith('gpt-5.4') and r['last']['provider'] == 'openai', r['last'])

setused({'day': TODAY, 'used': {'gpt-5.4': 224000}})
r = ask()
ok('B just below 90% of 250K the big model is still used', r['models'] == ['gpt-5.4'], r)
ok('B ... and that reply reaches 225000 = 90%', used()['used']['gpt-5.4'] == 225000, used())
r = ask()
ok('C at 90% of the big pool the next request goes to gpt-5.4-mini (the 2.5M pool)', r['models'] == ['gpt-5.4-mini'] and r['out'] == 'відповідь', r)
ok('C ... its tokens are counted for the mini pool, not the big one', used()['used'] == {'gpt-5.4': 225000, 'gpt-5.4-mini': 1000}, used())

setused({'day': '2000-01-01', 'used': {'gpt-5.4': 9999999}})
ok('D yesterday\'s count does not hold: a new UTC day starts on gpt-5.4 again', ask()['models'] == ['gpt-5.4'] and used() == {'day': TODAY, 'used': {'gpt-5.4': 1000}}, used())
c.js("localStorage.setItem('reader_openai_pool_usage', '{broken'); 1")
ok('D a damaged record counts as a fresh day, nothing throws', ask()['models'] == ['gpt-5.4'] and used()['used'] == {'gpt-5.4': 1000}, used())

setused({'day': TODAY, 'used': {'gpt-5.4': 300000, 'gpt-5.4-mini': 3000000}})
ok('E both pools used up: the mini model stays (billed, the cheaper one) -- never back to the billed luna', ask()['models'] == ['gpt-5.4-mini'], c.js('__models'))

c.js("localStorage.removeItem('reader_openai_pool_usage'); 1")
r = ask('ask')
ok('F a streamed request (Ask AI) uses the pool model and counts the usage from the stream\'s end event', r['models'] == ['gpt-5.4'] and r['out'] == 'відповідь' and used()['used'] == {'gpt-5.4': 1000}, (r, used()))
r = ask('ask', 'cut')
ok('F ... a streamed reply cut off by the token cap was paid for too: counted', r['error'] == 'truncated' and used()['used'] == {'gpt-5.4': 2000}, (r, used()))
r = ask('grammar_paradigm', 'cut')
ok('G a cut-off non-streamed reply is counted as well', r['error'] == 'truncated' and used()['used'] == {'gpt-5.4': 3000}, (r, used()))

TAP = """(async (word) => { state.translationCache = {}; els.ttCloseBtn && els.ttCloseBtn.click(); handleWordOrSelection(word, 200, 200, null);
  for (let i = 0; i < 100 && !/яблуко/.test(els.ttTranslation.textContent); i++) await new Promise(r => setTimeout(r, 50)); return els.ttTranslation.textContent; })"""
c.js("""(() => { Object.defineProperty(navigator, 'onLine', {configurable: true, get: () => true}); state.targetLang = 'uk'; __behave = 'ok';
  machineTranslate = async () => ({html: '', plain: '', extras: ''}); translateLocally = async () => null; return 1; })()""")
c.js("localStorage.removeItem('reader_openai_pool_usage'); 1")
text = c.js(f"({TAP})('pomme')")
ok('H a tapped word answered by gpt-5.4: 🧠 without «mini»', '🧠' in text and 'mini' not in text, text)
setused({'day': TODAY, 'used': {'gpt-5.4': 240000}})
text = c.js(f"({TAP})('verte')")
ok('H ... answered by the small model: «🧠 mini»', '🧠 mini' in text and c.js('__models.slice(-1)[0]') == 'gpt-5.4-mini', text)

rep = json.loads(c.js("buildDiagnosticsReport()"))['ai']['openaiPools']
ok('I the 📋 report shows today\'s tokens per pool and the model now in use', rep['day'] == TODAY and rep['model'] == 'gpt-5.4-mini' and rep['used']['gpt-5.4'] >= 240000 and rep['pools'] == {'gpt-5.4': 250000, 'gpt-5.4-mini': 2500000}, rep)
ok('J nothing threw', c.js("__errors.length") == 0, c.js("__errors"))
print('ALL PASS')
