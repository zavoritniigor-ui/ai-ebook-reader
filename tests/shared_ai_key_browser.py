"""Shared AI key (functions/api/ai.js + js/ai-client.js SHARED_AI_KEY): a visitor without an own key uses the key the site keeps
as a Cloudflare secret. The browser never sees that key: requests go to /api/ai?provider=… WITHOUT an Authorization header and the
server adds it. An own key always wins; the key dialog shows only own keys; with the shared key only, a tapped word asks ONE
provider (Groq), not two. No network: /api/ai and the providers are mocked."""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1100, height=850, deviceScaleFactor=1, mobile=False)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__calls = []; window.__shared = {groq: true, openai: true};
const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  const a = String(url), h = options.headers || {};
  if (a === '/api/ai' && !options.method) return new Response(JSON.stringify(__shared));
  const viaServer = a.startsWith('/api/ai?provider=');
  const provider = viaServer ? a.split('=')[1] : a.includes('api.openai.com') ? 'openai' : a.includes('api.groq.com') ? 'groq' : null;
  if (!provider) return originalFetch(url, options);
  __calls.push({provider, viaServer, auth: h.Authorization || h.authorization || null});
  const text = '{"direct":"груша","context":null}';
  return new Response(JSON.stringify(provider === 'openai' ? {status:'completed', output:[{type:'message', role:'assistant', content:[{type:'output_text', text}]}]}
    : {choices:[{message:{content:text}}]}));
};
''')


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.05); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof aiEffectiveKey==='function'", timeout=30)
c.js("localStorage.clear(); state.openaiKey = ''; state.groqKey = ''; state.apiKey = ''; state.activeAiProvider = 'gemini'; state.aiRouting = 'auto'; 1")
check('1 the app learns which shared keys the site has', "sharedAiProviders.groq === true && sharedAiProviders.openai === true", timeout=5)
check('2 with no own key AI is available and tasks are routed to the shared providers',
      "aiAvailable() && aiProviderForTask('translation') === 'groq' && aiProviderForTask('grammar_analysis') === 'openai' && aiProviderForTask('vision') === 'openai'")
check('3 a tapped word asks ONE provider (Groq) with the shared key, not two', "JSON.stringify(translationProviders()) === '[\"groq\"]'")
c.js("window.__out = null; callAI('Translate: pear', new AbortController().signal, 'translation').then(r => __out = r, e => __out = 'ERR ' + e.message); 1")
check('4 the request goes to /api/ai with NO Authorization header (the key is added by the server)',
      "__out === '{\"direct\":\"груша\",\"context\":null}' && __calls.length === 1 && __calls[0].viaServer && __calls[0].provider === 'groq' && __calls[0].auth === null", timeout=5)
c.js("window.__out = null; callAI('Explain', new AbortController().signal, 'grammar_analysis').then(r => __out = r, e => __out = 'ERR ' + e.message); 1")
check('5 OpenAI tasks also go through the server', "__out !== null && __calls.length === 2 && __calls[1].viaServer && __calls[1].provider === 'openai' && __calls[1].auth === null", timeout=5)
check('6 the key dialog does not treat the shared key as an own key', "aiProviderKey('groq') === '' && aiProviderKey('openai') === ''")
c.js("state.groqKey = 'gsk-own'; window.__out = null; callAI('Translate: pear', new AbortController().signal, 'translation').then(r => __out = r, e => __out = 'ERR ' + e.message); 1")
check('7 an own key wins: the request goes straight to the provider with the own key', "__out !== null && __calls.length === 3 && !__calls[2].viaServer && __calls[2].auth === 'Bearer gsk-own'", timeout=5)
c.js("state.groqKey = ''; sharedAiProviders.groq = false; sharedAiProviders.openai = false; 1")
check('8 no own and no shared key: AI is unavailable as before', "!aiAvailable() && translationProviders().length === 0")
# ---- the shared Groq key is refused: one retry on shared OpenAI; later requests skip Groq ----
c.js("sharedAiProviders.groq = true; sharedAiProviders.openai = true; window.__groqStatus = 401; __calls.length = 0; 1")
c.js("""(() => { const f = window.fetch; window.fetch = async (url, o = {}) => { if (String(url) === '/api/ai?provider=groq' && window.__groqStatus) { __calls.push({provider: 'groq', viaServer: true, auth: null, status: __groqStatus});
  return new Response(JSON.stringify({error: 'upstream', status: __groqStatus}), {status: __groqStatus}); } return f(url, o); }; return 1; })()""")
c.js("window.__out = null; callAI('Translate: pear', new AbortController().signal, 'translation', undefined, {provider: 'groq'}).then(r => __out = r, e => __out = 'ERR ' + e.message); 1")
check('9 shared Groq refused (401): the same request is answered by shared OpenAI', "__out === '{\"direct\":\"груша\",\"context\":null}' && __calls.length === 2 && __calls[0].provider === 'groq' && __calls[1].provider === 'openai' && __calls[1].viaServer", timeout=5)
check('10 ... and the refused shared Groq is no longer used (translation goes to OpenAI)', "sharedAiProviders.groq === false && JSON.stringify(translationProviders()) === '[\"openai\"]'")
c.js("sharedAiProviders.groq = true; state.openaiKey = 'sk-own'; __calls.length = 0; window.__out = null; callAI('x', new AbortController().signal, 'translation', undefined, {provider: 'groq'}).then(r => __out = r, e => __out = 'ERR ' + e.message); 1")
check('11 no fallback onto an OWN key: the shared failure is shown', "typeof __out === 'string' && __out.startsWith('ERR') && __calls.length === 1", timeout=5)
c.js("state.openaiKey = ''; 1")
# ---- the site reports the Groq secret has the wrong format: Groq is not used at all ----
c.js("window.__shared = {groq: true, openai: true, format: {groq: false, openai: true}}; 1")
c.js("window.__done = false; loadSharedAiProviders().then(() => __done = true); 1")
check('12 a shared Groq key with the wrong format is skipped: translation asks OpenAI directly', "__done && sharedAiProviders.groq === false && sharedAiProviders.openai === true && JSON.stringify(translationProviders()) === '[\"openai\"]'", timeout=5)
print('ALL SHARED AI KEY CHECKS PASSED')
