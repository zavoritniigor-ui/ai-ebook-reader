"""EVERY AI request goes to Groq first -- also for a learner who saved an OWN OpenAI (or Gemini) key; OpenAI only when Groq does not answer.

User report: «now all requests go through OpenAI and they take long; I asked for everything (grammar, breakdown, all) to go to Groq,
OpenAI only if Groq does not answer». Cause (js/ai-client.js aiProviderForTask): Groq was chosen only when the learner had an OWN
Groq key; with an own OpenAI key and no own Groq key every deep task (grammar, breakdown, Ask, rules, practice) and the active provider
took the request, although the site keeps a shared Groq key (the settings text even promised «saved keys or the site's key»).

Checked: the routing matrix for the real combinations of own / shared keys, the real HTTP layer (mocked fetch, the shared key goes
through /api/ai), a real word tap (the answer carries the ⚡ Groq mark, OpenAI is never asked), Groq failing (ONE repeat on the own OpenAI
key), the shared-key probe that could not reach the site at start (app opened offline) and heals itself -- without ever holding a
request longer than ~2.5 s -- and the diagnostics report that shows which provider answered each request, with no key in it.
No network, no real keys."""
import base64, json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Network.enable'); c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Emulation.setDeviceMetricsOverride', width=1100, height=850, deviceScaleFactor=1, mobile=False)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__calls = []; window.__probeCalls = 0; window.__probe = 'ok'; window.__sharedGroq = null; window.__errors = [];
addEventListener('error', e => __errors.push(e.message)); addEventListener('unhandledrejection', e => __errors.push(String(e.reason)));
const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  const a = String(url);
  if (a.split('?')[0].endsWith('/api/ai') && (!options.method || options.method === 'GET')) {          // the site's shared-key probe
    __probeCalls++;
    if (__probe === 'fail') throw new TypeError('Failed to fetch');
    if (__probe === 'hang') return new Promise(() => {});
    return new Response(JSON.stringify({groq: true, openai: true, format: {groq: true, openai: true}}), {status: 200});
  }
  let provider = null, shared = false;
  if (a.includes('/api/ai?provider=')) { provider = a.split('provider=')[1]; shared = true; }
  else if (a.includes('api.openai.com')) provider = 'openai'; else if (a.includes('api.groq.com')) provider = 'groq'; else if (a.includes('generativelanguage.googleapis.com')) provider = 'gemini';
  if (!provider) return originalFetch(url, options);
  __calls.push(provider + (shared ? '(shared)' : ''));
  if (provider === 'groq' && window.__sharedGroq === 'http') return new Response('{"error":"overloaded"}', {status: 503});
  const text = String(options.body || '').includes('alignment') ? '{"translation":"зелене яблуко","alignment":[]}' : '{"direct":"груша","context":null}';
  return new Response(JSON.stringify(provider === 'openai' ? {status: 'completed', output: [{type: 'message', role: 'assistant', content: [{type: 'output_text', text}]}]}
    : provider === 'groq' ? {choices: [{message: {content: text}}]} : {candidates: [{content: {parts: [{text}]}}]}));
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


c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof aiProviderForTask==='function'", timeout=30)
c.js("localStorage.clear(); showUpdateBanner=()=>{}; document.getElementById('sw-update-banner')?.remove(); 1")
check('0 the app learns the site\'s shared keys by itself at start (the probe)', "sharedAiProviders.groq === true && sharedAiProviders.openai === true", timeout=5)

ALL = ['translation', 'ask', 'grammar_analysis', 'grammar_paradigm', 'grammar_lookup', 'grammar', 'sentence_structure', 'structure_deep', 'rules_search', 'rules_explain',
       'practice_reading', 'language_level', 'vision', 'default']


def setup(own=(), active='openai', routing='auto', shared_groq=True, shared_openai=True):
    c.js("""(() => { state.openaiKey = %s; state.groqKey = %s; state.apiKey = %s; state.activeAiProvider = %s; state.aiRouting = %s;
      sharedAiProviders.groq = %s; sharedAiProviders.openai = %s; window.__sharedGroq = null; __calls.length = 0; return 1; })()"""
         % (json.dumps('sk-own-openai' if 'openai' in own else ''), json.dumps('gsk-own-groq' if 'groq' in own else ''), json.dumps('AIza-own-gemini' if 'gemini' in own else ''),
            json.dumps(active), json.dumps(routing), 'true' if shared_groq else 'false', 'true' if shared_openai else 'false'))


def routes():
    return c.js("(%s).map(t => aiProviderForTask(t))" % json.dumps(ALL))


# ---------------------------------------------------------------- 1. the routing matrix
setup(own=('openai',), active='openai')
r = routes()
ok('1a THE REPORTED CASE: an own OpenAI key, no own Groq key, the site has a shared Groq -> every task starts on Groq (was: all on OpenAI)',
      set(r) == {'groq'}, dict(zip(ALL, r)))
ok('1b ... and the own OpenAI key is the BACKUP; a tapped word asks Groq first, OpenAI only if Groq gave nothing',
      c.js("aiBackupProvider('groq')") == 'openai' and c.js("translationProviders()") == ['groq', 'openai'])
setup(own=('openai', 'gemini'), active='gemini')
ok('1c own OpenAI + Gemini (active Gemini): still every task on Groq; the backup is OpenAI', set(routes()) == {'groq'} and c.js("aiBackupProvider('groq')") == 'openai')
setup(own=('gemini',), active='gemini', shared_openai=False)
ok('1d own Gemini only: every task on Groq; the backup is Gemini', set(routes()) == {'groq'} and c.js("aiBackupProvider('groq')") == 'gemini')
setup(own=())
ok('1e no own keys at all: shared Groq first, shared OpenAI the backup (as before)', set(routes()) == {'groq'} and c.js("aiBackupProvider('groq')") == 'openai')
setup(own=('groq', 'openai'), shared_groq=False, shared_openai=False)
ok('1f an own Groq key: Groq first (as before)', set(routes()) == {'groq'} and c.js("aiBackupProvider('groq')") == 'openai')
setup(own=('openai',), active='openai', routing='off')
ok('1g routing OFF stays the single active provider, no backup (unchanged)', set(routes()) == {'openai'} and c.js("aiBackupProvider('groq')") is None)
setup(own=('openai',), active='openai', shared_groq=False)
r = routes()
ok('1h NO usable Groq at all (the site has none): the old rule stays -- deep tasks OpenAI, the rest the active provider',
      dict(zip(ALL, r))['grammar_analysis'] == 'openai' and dict(zip(ALL, r))['translation'] == 'openai' and c.js("aiBackupProvider('openai')") is None)

# ---------------------------------------------------------------- 2. the real HTTP layer
setup(own=('openai',), active='openai')
c.js("(async () => { for (const t of %s) await callAI('x', undefined, t); window.__done = true; })()" % json.dumps(['translation', 'ask', 'grammar_analysis', 'sentence_structure', 'structure_deep', 'rules_search', 'grammar_lookup']))
check('2a seven kinds of request, own OpenAI key saved: ALL went to the site\'s Groq through /api/ai, OpenAI was never asked',
      "window.__done === true && JSON.stringify(__calls) === JSON.stringify(Array(7).fill('groq(shared)')) || JSON.stringify(__calls)", timeout=15)
c.js("window.__done = false; window.__sharedGroq = 'http'; __calls.length = 0; window.__meta = {}; (async () => { window.__out = await callAI('x', undefined, 'grammar_analysis', undefined, {meta: __meta}); window.__done = true; })()")
check('2b Groq does not answer (HTTP 503): the SAME request is repeated once, on the own OpenAI key, and its answer is returned',
      "window.__done === true && JSON.stringify(__calls) === JSON.stringify(['groq(shared)', 'openai']) && __meta.provider === 'openai' && __out.includes('груша') || JSON.stringify([__calls, window.__out])", timeout=15)
c.js("window.__sharedGroq = null; 1")

# ---------------------------------------------------------------- 3. a real word tap
BOOK = "# Lecture\n\nIl mange une pomme verte dans le jardin.\n"
c.js("openBookFile(new File([Uint8Array.from(atob(%s),ch=>ch.charCodeAt(0))],'lecture.md',{lastModified:%d}))" % (json.dumps(base64.b64encode(BOOK.encode()).decode()), int(time.time())))
c.wait("els.pages.textContent.includes('pomme verte')", timeout=20); time.sleep(0.8)
if not c.js('state.translateMode'):
    c.js('els.translateBtn.click()'); time.sleep(0.3)
setup(own=('openai',), active='openai')
c.js("state.targetLang = 'uk'; state.translationCache = {}; window.Translator = undefined; 1")
pos = c.js(r"""(()=>{ const w='pomme'; const walker=document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT); let n;
  while((n=walker.nextNode())){ const i=n.nodeValue.indexOf(w); if(i!==-1){ const r=document.createRange(); r.setStart(n,i); r.setEnd(n,i+w.length); const b=r.getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2}; } } return null; })()""")
for kind in ('mousePressed', 'mouseReleased'):
    c.call('Input.dispatchMouseEvent', type=kind, x=pos['x'], y=pos['y'], button='left', clickCount=1)
check('3 a tapped word with an own OpenAI key saved: the answer comes from the site\'s Groq (⚡), and OpenAI is never asked',
      "els.ttTranslation.textContent.includes('⚡') && !els.ttTranslation.textContent.includes('🧠') && __calls.every(x => x === 'groq(shared)') && __calls.length >= 1 || JSON.stringify([els.ttTranslation.textContent, __calls])", timeout=10)

# ---------------------------------------------------------------- 4. the probe that could not reach the site heals itself
setup(own=('openai',), active='openai', shared_groq=False, shared_openai=False)
c.js("window.__probe = 'fail'; window.__probeCalls = 0; sharedAiProbeAnswered = false; sharedAiProbeAt = 0; sharedAiProbePromise = null; sharedAiProbeWaited = false; window.__done = false; (async () => { await callAI('x', undefined, 'grammar_analysis'); window.__done = true; })()")
check('4a the app was opened offline (the probe failed): this request has no shared Groq to use and goes to the own OpenAI key',
      "window.__done === true && JSON.stringify(__calls) === JSON.stringify(['openai']) && sharedAiProviders.groq === false || JSON.stringify(__calls)", timeout=10)
n = c.js("__probeCalls")
c.js("window.__done = false; __calls.length = 0; (async () => { await callAI('x', undefined, 'grammar_analysis'); window.__done = true; })()")
check('4b a second request right after a failed probe does NOT probe again (at most every 20 s)', "window.__done === true && __probeCalls === %d" % n, timeout=10)
c.js("window.__probe = 'ok'; window.dispatchEvent(new Event('online')); 1")
check('4c the connection is back (online event): the probe is repeated and the shared Groq is learned', "sharedAiProviders.groq === true && sharedAiProbeAnswered === true", timeout=5)
c.js("window.__done = false; __calls.length = 0; (async () => { await callAI('x', undefined, 'grammar_analysis'); window.__done = true; })()")
check('4d ... and the next request goes to Groq again', "window.__done === true && JSON.stringify(__calls) === JSON.stringify(['groq(shared)']) || JSON.stringify(__calls)", timeout=10)

setup(own=('openai',), active='openai', shared_groq=False, shared_openai=False)
c.js("window.__probe = 'hang'; sharedAiProbeAnswered = false; sharedAiProbeAt = 0; sharedAiProbePromise = null; sharedAiProbeWaited = false; window.__done = false; window.__t0 = performance.now(); (async () => { await callAI('x', undefined, 'grammar_analysis'); window.__ms1 = Math.round(performance.now() - __t0); window.__t1 = performance.now(); await callAI('x', undefined, 'grammar_analysis'); window.__ms2 = Math.round(performance.now() - __t1); window.__done = true; })()")
check('4e a probe that HANGS (captive portal) holds the first request for ~2.5 s at most and the next ones not at all',
      "window.__done === true && __ms1 >= 2300 && __ms1 < 3800 && __ms2 < 800 && JSON.stringify(__calls) === JSON.stringify(['openai', 'openai']) || JSON.stringify([window.__ms1, window.__ms2, __calls])", timeout=15)
c.js("window.__probe = 'ok'; sharedAiProbePromise = null; sharedAiProbeAnswered = true; 1")

# ---------------------------------------------------------------- 5. the diagnostics show which provider answered
setup(own=('openai',), active='openai')
c.js("sharedAiProviders.groq = true; window.__done = false; (async () => { await callAI('x', undefined, 'grammar_analysis'); await callAI('x', undefined, 'translation'); window.__done = true; })()")
check('5a the diagnostics report names what each task starts on and which provider answered the last requests (shared Groq, ok, ms), and holds no key',
      """(async () => { while (!window.__done) await new Promise(r => setTimeout(r, 50)); state.groqKey = 'gsk-SECRET-123'; state.openaiKey = 'sk-SECRET-abc';
         const raw = buildDiagnosticsReport(); const rep = JSON.parse(raw); const recent = rep.ai.recent.slice(-2);
         return rep.ai.startsOn.grammar === 'groq' && rep.ai.startsOn.breakdown === 'groq' && rep.ai.ownKeys.openai === true && rep.ai.sharedOnSite.groq === true
           && recent.length === 2 && recent.every(x => x.provider === 'groq' && x.shared === true && x.ok === true && typeof x.ms === 'number') && !raw.includes('SECRET') || raw.slice(0, 600); })()""", timeout=10)

# ---------------------------------------------------------------- 6. the settings text no longer says own keys replace the site's
check('6 the key dialog text names «Groq first» and the backup role of the other keys, in all UI languages (es included)',
      "(() => { const bad = []; for (const l of ['uk','en','fr','ru','zh','ko','hi','ga']) { const v = I18N.aiSiteKeyOwnSaved[l]; if (!v || !/Groq/.test(v)) bad.push(l); } if (typeof I18N_ES === 'undefined' || !/Groq/.test(I18N_ES.aiSiteKeyOwnSaved || '')) bad.push('es'); return bad.length === 0 || JSON.stringify(bad); })()")
check('no application errors', "(window.__errors || []).length === 0")
print('ALL GROQ-FIRST / OWN-KEYS CHECKS PASSED')
