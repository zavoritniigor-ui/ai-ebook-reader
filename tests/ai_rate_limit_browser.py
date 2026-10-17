"""WHY Groq did not answer: a 429 now says which limit was hit, its numbers and when to come back (js/ai-client.js aiRateDetails, functions/api/ai.js).

User report: «most of my translations come from OpenAI, the Groq priority does not work». Measured on the production site: every request DID start on
Groq, and Groq answered HTTP 429 to ~90% of them (the shared key sits on Groq's free plan: 30 requests/min, 1000/day, 8000 tokens/min, 200000/day for
gpt-oss-120b), after which the app asked OpenAI, as designed. Until now the app threw the reason away, so «Groq is limited» could not be told from
«routing is broken». Also the Groq vision model (qwen3.6) was withdrawn (HTTP 404) and every photo check silently fell to OpenAI.

Checked with a mocked fetch: the shared path (the site's {rate:{...}}), an own key (Groq's own text and the retry-after header), an unreadable 429
and a 500 (no details), nothing of the provider's text or account in what is kept, the request log and the 📋 diagnostics carrying the details, and
the vision request using a model that exists. No network, no real keys."""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Network.enable'); c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__mode = 'shared429'; window.__bodies = []; window.__errors = [];
addEventListener('error', e => __errors.push(e.message)); addEventListener('unhandledrejection', e => __errors.push(String(e.reason)));
const originalFetch = window.fetch;
const GROQ_TEXT = 'Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01secretaccount` service tier `on_demand` on requests per day (RPD): Limit 1000, Used 1000, Requested 1. Please try again in 14m22.6s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing';
window.fetch = async (url, options = {}) => {
  const a = String(url);
  if (a.split('?')[0].endsWith('/api/ai') && (!options.method || options.method === 'GET')) return new Response(JSON.stringify({groq: true, openai: true, format: {groq: true, openai: true}}), {status: 200});
  const shared = a.includes('/api/ai?provider='), provider = shared ? a.split('provider=')[1] : a.includes('api.groq.com') ? 'groq' : a.includes('api.openai.com') ? 'openai' : null;
  if (!provider) return originalFetch(url, options);
  if (options.body) { try { __bodies.push({provider, shared, body: JSON.parse(options.body)}); } catch (e) {} }
  if (provider === 'groq') {
    if (__mode === 'shared429') return new Response(JSON.stringify({error: 'upstream', status: 429, rate: {kind: 'TPM', limit: 8000, used: 6905, requested: 1500, retryAfterSec: 2}}), {status: 429});
    if (__mode === 'own429') return new Response(JSON.stringify({error: {message: GROQ_TEXT, type: 'requests', code: 'rate_limit_exceeded'}}), {status: 429, headers: {'retry-after': '3'}});
    if (__mode === 'own429nohdr') return new Response(JSON.stringify({error: {message: GROQ_TEXT}}), {status: 429});
    if (__mode === 'unreadable429') return new Response('quota', {status: 429});
    if (__mode === 'http500') return new Response(JSON.stringify({error: {message: GROQ_TEXT}}), {status: 500});
    return new Response(JSON.stringify({choices: [{message: {content: 'ok'}}]}));
  }
  return new Response(JSON.stringify({status: 'completed', output: [{type: 'message', role: 'assistant', content: [{type: 'output_text', text: 'відповідь OpenAI'}]}]}));
};
''')


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof aiRateDetails==='function' && sharedAiProbeAnswered === true", timeout=30)
c.js("localStorage.clear(); showUpdateBanner=()=>{}; document.getElementById('sw-update-banner')?.remove(); 1")
RUN = """(async (mode, own, forced) => { __mode = mode; __bodies.length = 0; state.groqKey = own ? 'gsk-own-groq' : ''; state.openaiKey = ''; state.activeAiProvider = 'groq'; state.aiRouting = 'auto';
  sharedAiProviders.groq = true; sharedAiProviders.openai = true; const before = readerAiRequests().length; let out = null, error = null;
  try { out = await callAI('Translate: pomme', undefined, 'translation', undefined, forced ? {provider: 'groq'} : {}); } catch (e) { error = {reason: e.reason, status: e.status, rate: e.rate}; }
  return {out, error, log: readerAiRequests().slice(before)}; })"""

r = c.js(f"({RUN})('shared429', false, true)")
groq = r['log'][0]
assert r['out'] == 'відповідь OpenAI' and [e['provider'] for e in r['log']] == ['groq', 'openai'], r
assert groq['ok'] is False and groq['reason'] == 'http' and groq['status'] == 429 and groq['shared'] is True, groq
assert groq['rate'] == {'kind': 'TPM', 'limit': 8000, 'used': 6905, 'requested': 1500, 'retryAfterSec': 2}, groq
print('PASS 1 the site\'s shared Groq key refused with a 429: the request log says WHICH limit, the numbers and the wait; the shared OpenAI then answered', flush=True)

r = c.js(f"({RUN})('own429', true, true)")
rate = r['error']['rate']
assert r['out'] is None and r['error']['reason'] == 'http' and r['error']['status'] == 429, r
assert rate == {'kind': 'RPD', 'limit': 1000, 'used': 1000, 'requested': 1, 'retryAfterSec': 3}, rate
print('PASS 2 an own Groq key: the limit is read from the provider\'s text, and the retry-after header (3 s) wins over the text (14 m 22.6 s)', flush=True)

r = c.js(f"({RUN})('own429nohdr', true, true)")
assert r['error']['rate'] == {'kind': 'RPD', 'limit': 1000, 'used': 1000, 'requested': 1, 'retryAfterSec': 862.6}, r['error']
print('PASS 3 without the header the wait is read from the text ("14m22.6s" = 862.6 s)', flush=True)

for mode, why in (('unreadable429', 'a 429 whose text says nothing'), ('http500', 'a 500 whose text looks like a limit')):
    r = c.js(f"({RUN})('{mode}', true, true)")
    assert r['error']['rate'] is None, (why, r['error'])
print('PASS 4 no details are invented: an unreadable 429 and a 500 carry none', flush=True)

check('5 nothing of the provider\'s text or account is kept in the log or the diagnostics',
      "(async () => { await " + RUN + "('own429', true, true); const kept = JSON.stringify([readerAiRequests(), buildDiagnosticsReport()]); return !kept.includes('org_01secretaccount') && !kept.includes('console.groq.com') && !kept.includes('Rate limit reached') && !kept.includes('gsk-own-groq'); })()")
check('6 the 📋 diagnostics report shows the limit that refused Groq (so «why OpenAI?» can be answered on the device itself)',
      "(async () => { await " + RUN + "('shared429', false, true); const recent = JSON.parse(buildDiagnosticsReport()).ai.recent; const refused = recent.filter(e => e.provider === 'groq' && e.status === 429).at(-1); "
      "return !!refused && refused.rate.kind === 'TPM' && refused.rate.retryAfterSec === 2 && recent.at(-1).provider === 'openai' && recent.at(-1).ok === true; })()")
check('7 the developer diagnostics carry it as well', "readerAiDiagnostics().some(e => e.provider === 'groq' && e.httpStatus === 429 && e.rate && e.rate.kind === 'TPM')")

r = c.js("""(async () => { __mode = 'ok'; __bodies.length = 0; state.groqKey = 'gsk-own-groq'; state.openaiKey = ''; state.activeAiProvider = 'groq'; state.aiRouting = 'auto';
  const out = await callAIVision('Reply ok', 'data:image/png;base64,iVBORw0KGgo=', undefined, {provider: 'groq'}); return {out, models: __bodies.map(b => b.body.model), constant: GROQ_VISION_MODEL}; })()""")
assert r['models'] == ['qwen/qwen3.8-27b'] and r['constant'] == 'qwen/qwen3.8-27b', r
print('PASS 8 a photo check asks Groq for a vision model that exists (qwen3.8; qwen3.6 now answers 404 and every photo check used to fall to OpenAI)', flush=True)
check('9 nothing threw', "__errors.length === 0 ? true : JSON.stringify(__errors)")
print('ALL PASS')
