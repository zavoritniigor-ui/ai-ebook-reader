"""AI task routing + instant local translation of a tapped word.

Routing (js/ai-client.js aiProviderForTask): with routing 'auto' translation goes to Groq and grammar / breakdowns / rules / practice /
ask / language level go to OpenAI WHEN those keys are stored; everything else (vision, default) and any task whose preferred provider
has no key use the ACTIVE provider; routing 'off' = the single active provider as before. Checked on the real HTTP layer (mocked fetch).

Instant layer (js/translation.js): for a single word the on-device Chrome translator is started in the tap handler (a user gesture, which
creating a 'downloadable' model requires) and its result is shown at once with the ⌂ mark; the AI answer then REPLACES it (⚡). Sentences
never start the local translator. No network, no real keys.
"""
import base64, json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1100, height=850, deviceScaleFactor=1, mobile=False)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__calls = []; window.__errors = [];
addEventListener('error', e => __errors.push(e.message)); addEventListener('unhandledrejection', e => __errors.push(String(e.reason)));
const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  const a = String(url);
  const provider = a.includes('api.openai.com') ? 'openai' : a.includes('api.groq.com') ? 'groq' : a.includes('generativelanguage.googleapis.com') ? 'gemini' : null;
  if (!provider) return originalFetch(url, options);
  __calls.push(provider);
  const text = String(options.body || '').includes('alignment') ? '{"translation":"зелене яблуко","alignment":[]}' : '{"direct":"груша","context":null}';
  return new Response(JSON.stringify(provider === 'openai' ? {status:'completed', output:[{type:'message', role:'assistant', content:[{type:'output_text', text}]}]}
    : provider === 'groq' ? {choices:[{message:{content:text}}]} : {candidates:[{content:{parts:[{text}]}}]}));
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
c.wait("document.readyState==='complete' && !document.body.inert && typeof aiProviderForTask==='function'", timeout=30)
c.js("localStorage.clear(); showUpdateBanner=()=>{}; document.getElementById('sw-update-banner')?.remove(); 1")

# ---- 1. routing matrix ----
def route(task, active='gemini', routing='auto', keys=('openai', 'groq', 'gemini')):
    return c.js("""(() => { state.openaiKey = %s; state.groqKey = %s; state.apiKey = %s; state.activeAiProvider = %s; state.aiRouting = %s; return aiProviderForTask(%s); })()"""
                % (json.dumps('sk-test' if 'openai' in keys else ''), json.dumps('gsk-test' if 'groq' in keys else ''), json.dumps('AIza-test' if 'gemini' in keys else ''),
                   json.dumps(active), json.dumps(routing), json.dumps(task)))

assert route('translation') == 'groq' and route('translation', active='openai') == 'groq'
for t in ['grammar_analysis', 'grammar_paradigm', 'grammar', 'practice_reading', 'sentence_structure', 'structure_deep', 'rules_search', 'rules_explain', 'language_level', 'ask']:
    assert route(t, active='groq') == 'openai', t
print('PASS 1 routing: translation -> Groq; grammar/breakdown/rules/practice/ask/level -> OpenAI (whatever the active provider is)', flush=True)
assert route('vision', active='gemini') == 'gemini' and route('default', active='groq') == 'groq'
print('PASS 2 other tasks (vision, default) use the active provider', flush=True)
assert route('translation', active='openai', keys=('openai',)) == 'openai' and route('grammar_analysis', active='groq', keys=('groq',)) == 'groq'
assert route('translation', active='gemini', keys=('gemini',)) == 'gemini'
print('PASS 3 a task whose preferred provider has no key falls back to the ACTIVE provider (decided before the request, never after a failure)', flush=True)
assert route('translation', routing='off') == 'gemini' and route('grammar_analysis', active='groq', routing='off') == 'groq'
print('PASS 4 routing off = the single active provider, as before', flush=True)

# ---- 2. the real HTTP layer ----
c.js("state.openaiKey='sk-test'; state.groqKey='gsk-test'; state.apiKey='AIza-test'; state.activeAiProvider='gemini'; state.aiRouting='auto'; __calls.length = 0; 1")
c.js("(async () => { await callAI('x', undefined, 'translation'); await callAI('x', undefined, 'grammar_analysis'); await callAI('x', undefined, 'rules_search'); await callAI('x', undefined, 'default'); window.__done = true; })()")
check("5 requests really go to Groq (translation), OpenAI (grammar, rules) and the active Gemini (default)", "window.__done === true && JSON.stringify(__calls) === JSON.stringify(['groq', 'openai', 'openai', 'gemini']) || JSON.stringify(__calls)", timeout=10)
c.js("window.__done = false; state.aiRouting='off'; __calls.length = 0; (async () => { await callAI('x', undefined, 'translation'); await callAI('x', undefined, 'grammar_analysis'); window.__done = true; })()")
check("6 with routing off both go to the active provider", "window.__done === true && JSON.stringify(__calls) === JSON.stringify(['gemini', 'gemini']) || JSON.stringify(__calls)", timeout=10)

# ---- 3. settings checkbox ----
c.js("state.aiRouting='auto'; localStorage.removeItem('reader_ai_routing'); openKeySettings(); 1")
check("7 the key dialog shows the routing option, on by default", "document.getElementById('ai-routing-input').checked === true && document.querySelector('.ai-routing').offsetHeight >= 44")
c.js("document.getElementById('ai-routing-input').checked = false; saveApiKey(); 1")
check("8 turning it off is applied and stored; reopening shows it off",
      "state.aiRouting === 'off' && localStorage.getItem('reader_ai_routing') === 'off' && (openKeySettings(), document.getElementById('ai-routing-input').checked === false)")
c.js("document.getElementById('ai-routing-input').checked = true; saveApiKey(); 1")
check("9 turning it back on", "state.aiRouting === 'auto' && localStorage.getItem('reader_ai_routing') === 'auto'")
check("10 the option text exists in all 8 UI languages with its own wording",
      "(() => { const bad = []; for (const k of ['aiRoutingLabel','aiRoutingHint']) for (const l of ['uk','en','fr','ru','zh','ko','hi','ga']) { const v = I18N[k] && I18N[k][l]; if (!v || (l !== 'en' && v === I18N[k].en)) bad.push(k + ':' + l); } return bad.length === 0 || JSON.stringify(bad); })()")

# ---- 4. instant local layer ----
BOOK = "# Lecture\n\nIl mange une pomme verte dans le jardin.\n"
c.js("openBookFile(new File([Uint8Array.from(atob(%s),ch=>ch.charCodeAt(0))],'lecture.md',{lastModified:%d}))" % (json.dumps(base64.b64encode(BOOK.encode()).decode()), int(time.time())))
c.wait("els.pages.textContent.includes('pomme verte')", timeout=20); time.sleep(0.8)
if not c.js('state.translateMode'):
    c.js('els.translateBtn.click()'); time.sleep(0.3)
c.js("""(() => { state.targetLang = 'uk'; state.openaiKey = 'sk-test'; state.groqKey = 'gsk-test'; state.activeAiProvider = 'gemini'; state.aiRouting = 'auto';
  window.__local = { created: 0, activeAtCreate: null, translated: [] };
  window.Translator = { availability: async () => 'downloadable', create: async (opts) => { __local.created++; __local.activeAtCreate = navigator.userActivation.isActive;
      return { translate: async (t) => { __local.translated.push(t); await new Promise(r => setTimeout(r, 30)); return 'ЛОКАЛЬНО ' + t; } }; } };
  localTranslators.clear();
  window.__aiDelay = 700; window.__timeline = [];
  const realFetch = window.fetch;
  window.fetch = async (url, options = {}) => { if (String(url).includes('api.groq.com')) await new Promise(r => setTimeout(r, __aiDelay)); return realFetch(url, options); };
  new MutationObserver(() => __timeline.push([Math.round(performance.now()), els.ttTranslation.textContent])).observe(els.ttTranslation, { childList: true, characterData: true, subtree: true });
  state.translationCache = {}; __calls.length = 0; return 1; })()""")
pos = c.js(r"""(()=>{ const w='pomme'; const walker=document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT); let n;
  while((n=walker.nextNode())){ const i=n.nodeValue.indexOf(w); if(i!==-1){ const r=document.createRange(); r.setStart(n,i); r.setEnd(n,i+w.length); const b=r.getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2}; } } return null; })()""")
t0 = c.js("performance.now()")
for kind in ('mousePressed', 'mouseReleased'):
    c.call('Input.dispatchMouseEvent', type=kind, x=pos['x'], y=pos['y'], button='left', clickCount=1)
check("11 a tapped word shows the on-device translation at once (before the AI answers), marked ⌂",
      "els.ttTranslation.textContent.includes('ЛОКАЛЬНО pomme') && els.ttTranslation.textContent.includes('⌂')", timeout=3)
check("12 the local model was created inside the tap's user activation (what 'downloadable' requires)", "__local.created === 1 && __local.activeAtCreate === true")
check("13 the AI (Groq by routing) answer then REPLACES it: translation + ⚡, no ⌂ left",
      "els.ttTranslation.textContent.includes('груша') && els.ttTranslation.textContent.includes('⚡') && !els.ttTranslation.textContent.includes('ЛОКАЛЬНО')", timeout=8)
check("14 the instant layer really came first: local shown, then AI, in that order, with a clear gap",
      "(() => { const tl = __timeline; const li = tl.findIndex(x => x[1].includes('ЛОКАЛЬНО')); const ai = tl.findIndex(x => x[1].includes('груша')); return li !== -1 && ai > li && tl[ai][0] - tl[li][0] >= 300 || JSON.stringify(tl); })()")
check("15 the request went to Groq (routing), not to the active Gemini", "JSON.stringify(__calls) === JSON.stringify(['groq']) || JSON.stringify(__calls)")

# sentence/multi-word: no local translator
c.js("els.ttCloseBtn.click(); __local.created = 0; __local.translated.length = 0; state.translationCache = {}; handleWordOrSelection('une pomme verte', 300, 300, null); 1")
check("16 a multi-word fragment does NOT start the on-device translator (only single words get the instant layer)",
      "(async () => { await new Promise(r => setTimeout(r, 1200)); return __local.created === 0 && __local.translated.length === 0; })()", timeout=6)

# no Translator at all (mobile / old Chrome): AI only, nothing breaks
c.js("els.ttCloseBtn.click(); delete window.Translator; localTranslators.clear(); state.translationCache = {}; __timeline.length = 0; window.__aiDelay = 100; handleWordOrSelection('verte', 300, 300, null); 1")
check("17 without the Translator API the word is simply answered by the AI", "els.ttTranslation.textContent.includes('груша') && !els.ttTranslation.textContent.includes('ЛОКАЛЬНО')", timeout=6)
check("18 no application errors", "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL AI ROUTING + INSTANT TRANSLATION CHECKS PASSED')
