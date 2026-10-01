"""AI key replacement / re-entry through the real settings dialog -- no reload needed.

Reported bug: a key could not be reliably re-entered. Root cause: the provider radio REFUSED a provider
whose field was still empty, so the usual order -- pick the provider, then paste its key, Save -- stored
the key but silently kept the OLD provider active (often one with no / an invalid key): every AI action
still failed or asked for a key. Now the radio is a draft choice, Save makes it active together with its
key (and refuses only if it has none), a cleared field never deletes a key (explicit "Remove key" does),
masked/garbage input is rejected, and a 401/403 offers "Update AI key" whose Retry uses the new key.

Every key here is a FAKE test value. The fetch mock records only a LABEL per request; output never
prints a key. The dialog is driven like a user: click, select-all + Input.insertText, click Save.
"""
import json, os, time
from browser_cdp import CDP

c = CDP(); c.sock.settimeout(45)
c.call('Page.enable'); c.call('Runtime.enable')
c.call('Emulation.setDeviceMetricsOverride', width=1280, height=900, deviceScaleFactor=1, mobile=False)
KEYS = {'OAI_1': 'sk-test-only-one-aaaaaaaa', 'OAI_2': 'sk-test-only-two-bbbbbbbb', 'OAI_BAD': 'sk-test-only-bad-cccccccc',
        'OAI_A': 'sk-test-only-rapid-a-dddd', 'OAI_B': 'sk-test-only-rapid-b-eeee',
        'GROQ': 'gsk_test_only_groq_ffffffff', 'GEM': 'AIza_test_only_gemini_gggggg'}
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__K=''' + json.dumps({v: k for k, v in KEYS.items()}) + r''';
window.__calls=[];window.__logs=[];window.__defer=false;window.__pending=[];
for (const n of ['log','info','warn','error']) { const o=console[n]; console[n]=(...a)=>{__logs.push(a.map(String).join(' '));o.apply(console,a)}; }
const realFetch=window.fetch;
window.fetch=async(url,o={})=>{
  const a=String(url);const p=a.includes('api.openai.com')?'openai':a.includes('api.groq.com')?'groq':a.includes('generativelanguage')?'gemini':null;
  if(!p)return realFetch(url,o);
  const raw=(new Headers(o.headers).get(p==='gemini'?'x-goog-api-key':'Authorization')||'').replace(/^Bearer /,'');
  const label=__K[raw]||'UNKNOWN';const body=JSON.parse(o.body);__calls.push({p,label,url:a});
  // A provider that echoes the credential in its error body: it must never reach the learner.
  if(label==='OAI_BAD')return new Response(JSON.stringify({error:{message:'Incorrect API key provided: '+raw}}),{status:401});
  const text=body.text&&body.text.format?.type==='json_object'||/Return STRICT JSON|JSON only/i.test(JSON.stringify(body))?'{"items":[]}':'<p>answer from '+label+'</p>';
  const reply=()=>{if(p==='openai'&&body.stream){const e=new TextEncoder();return new Response(new ReadableStream({start(ct){ct.enqueue(e.encode('data: '+JSON.stringify({type:'response.output_text.delta',delta:text})+'\n\n'));ct.enqueue(e.encode('data: {"type":"response.output_text.done"}\n\n'));ct.close()}}),{headers:{'content-type':'text/event-stream'}})}
    return new Response(JSON.stringify(p==='openai'?{status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text}]}]}:p==='groq'?{choices:[{message:{content:text}}]}:{candidates:[{content:{parts:[{text}]}}]}))};
  if(__defer)return new Promise((res,rej)=>{__pending.push({label,signal:o.signal,resolve:()=>res(reply())});o.signal?.addEventListener('abort',()=>rej(new DOMException('Cancelled','AbortError')),{once:true})});
  return reply();
};''')
URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')

def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.monotonic() + timeout
    while result is not True and time.monotonic() < deadline:
        time.sleep(0.1); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)

def boot():
    c.wait("document.readyState==='complete' && !document.body.inert && typeof openKeySettings==='function'")
    c.js("showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove();window.__toasts=[];const st=showToast;showToast=m=>{__toasts.push(m);st(m)};true")

c.call('Page.navigate', url=URL); boot()
c.js("localStorage.clear()"); c.call('Page.reload'); boot()

INP = {'openai': 'openai-key-input', 'groq': 'groq-key-input', 'gemini': 'api-key-input'}
def open_dialog(): c.js("document.querySelector('button[onclick=\"openKeySettings()\"]').click()")
def radio(p): c.js(f"document.querySelector('input[name=ai-provider][value={p}]').click()")
def save(): c.js("document.querySelector('#api-keys-form button[type=submit]').click()")
def type_key(provider, text):
    """Select-all in the masked field and type over it, as a user replacing a key would."""
    c.js(f"(()=>{{const i=document.getElementById({INP[provider]!r});i.focus();i.select()}})()")
    c.call('Input.insertText', text=text)
def label_of(expr): return c.js(f"(()=>{{const k={expr};return k?(__K[k]||'OTHER'):''}})()")
def labels():
    return c.js("""JSON.stringify(Object.fromEntries(Object.entries(AI_PROVIDERS).map(([p,x])=>[p,
        [state[x.key]?(__K[state[x.key]]||'OTHER'):'', localStorage.getItem(x.storage)?(__K[localStorage.getItem(x.storage)]||'OTHER'):'']])))""")
def ask(q='Que veut dire ce mot ?'):
    """Ask AI through the panel's own input + Send; returns the labels of the requests it made."""
    n = c.js("__calls.length")
    c.js(f"els.askPanel.classList.add('expanded');els.askInput.value={q!r};document.getElementById('ask-send-btn').click()")
    c.wait("!els.askPanel.classList.contains('loading')", timeout=8); time.sleep(.2)
    return c.js(f"JSON.stringify(__calls.slice({n}).map(x=>x.p+':'+x.label))")

# ---- TEST 1 / CASE C: no key -> pick provider FIRST, then paste key, Save -> usable at once --------------------
check('T1 setup: no key, AI unavailable', "!aiAvailable() && !state.openaiKey && !localStorage.getItem('reader_openai_key')")
open_dialog(); radio('openai')
check('T1 empty provider is a draft choice (not refused) with an add-key hint', "document.querySelector('input[name=ai-provider]:checked').value==='openai' && !document.getElementById('ai-provider-error').hidden")
type_key('openai', KEYS['OAI_1'])
check('T1 hint clears once the key is typed', "document.getElementById('ai-provider-error').hidden")
save()
check('T1 Save: OpenAI active, aiAvailable(), aiProviderKey() is the new key, stored', "state.activeAiProvider==='openai' && aiAvailable() && __K[aiProviderKey()]==='OAI_1' && __K[localStorage.getItem('reader_openai_key')]==='OAI_1' && localStorage.getItem('reader_active_ai_provider')==='openai'")
assert ask() == '["openai:OAI_1"]'
print('PASS T1 next Ask uses the new key, no reload')

# ---- TEST 2 / CASE A: replace an existing key ---------------------------------------------------------------------
open_dialog()
check('T2 dialog shows the saved key in a password field', "document.getElementById('openai-key-input').type==='password' && __K[document.getElementById('openai-key-input').value]==='OAI_1'")
type_key('openai', KEYS['OAI_2']); save()
open_dialog()
check('T2 reopened dialog is consistent with state and storage', f"__K[document.getElementById('openai-key-input').value]==='OAI_2'")
c.js("document.querySelector('#settings-modal .btn-ghost').click()")  # Cancel
assert json.loads(labels())['openai'] == ['OAI_2', 'OAI_2'], labels()
assert ask() == '["openai:OAI_2"]'
print('PASS T2 replacement used by the next request (never the stale key)')

# ---- TEST 3 / CASE B: invalid key -> 401 -> Update AI key -> replace -> Retry -------------------------------------
open_dialog(); type_key('openai', KEYS['OAI_BAD']); save()
assert ask() == '["openai:OAI_BAD"]'
check('T3 localized auth error + Retry + "Update AI key" action', "els.askContent.textContent.includes(t('aiAuthError').replace('{provider}','OpenAI')) && [...els.askContent.querySelectorAll('button')].map(b=>b.textContent).join('|')===t('retry')+'|'+t('aiUpdateKey')")
check('T3 the error never shows the key (provider echoed it)', f"!els.askContent.textContent.includes({KEYS['OAI_BAD']!r}) && !document.body.textContent.includes({KEYS['OAI_BAD']!r})")
c.js("[...els.askContent.querySelectorAll('button')].find(b=>b.textContent===t('aiUpdateKey')).click()")
check('T3 Update AI key opens the dialog', "document.getElementById('settings-modal').style.display==='flex'")
type_key('openai', KEYS['OAI_2']); save()
n = c.js("__calls.length")
c.js("[...els.askContent.querySelectorAll('button')].find(b=>b.textContent===t('retry')).click()")
check('T3 Retry (same closure) now uses the replacement key and succeeds', f"__calls.length==={n + 1} && __calls.at(-1).label==='OAI_2' && els.askContent.textContent.includes('answer from OAI_2')", timeout=8)

# ---- TEST 5 / 6 / CASE D: three providers, isolated keys, switching ---------------------------------------------
open_dialog(); radio('groq'); type_key('groq', KEYS['GROQ']); save()
check('CASE D: Groq active with the Groq key; OpenAI key untouched', "state.activeAiProvider==='groq' && __K[aiProviderKey()]==='GROQ' && __K[state.openaiKey]==='OAI_2'")
assert ask() == '["groq:GROQ"]'
open_dialog(); radio('gemini'); type_key('gemini', KEYS['GEM']); save()
assert ask() == '["gemini:GEM"]'
expect = {'openai': 'OAI_2', 'groq': 'GROQ', 'gemini': 'GEM'}
for p in ['openai', 'groq', 'gemini', 'groq', 'openai', 'gemini', 'openai']:
    open_dialog(); radio(p); save()
    got = ask()
    assert got == f'["{p}:{expect[p]}"]', (p, got)
    assert json.loads(labels()) == {k: [v, v] for k, v in expect.items()}, labels()
print('PASS T5 three keys stay isolated in state and storage across 7 switches')
print('PASS T6 every request went to the active provider with ITS key only')

# ---- TEST 4: reload rehydrates ------------------------------------------------------------------------------------
c.call('Page.reload'); boot()
check('T4 after reload: provider and all three keys rehydrated', "state.activeAiProvider==='openai' && __K[state.openaiKey]==='OAI_2' && __K[state.groqKey]==='GROQ' && __K[state.apiKey]==='GEM'")
assert ask() == '["openai:OAI_2"]'
print('PASS T4 Ask works after reload')

# ---- TEST 7: masked / garbage text is never persisted ---------------------------------------------------------------
before = labels()
for bad in ['••••••••••', 'sk-…bbbb', '********', 'sk-test only']:
    open_dialog(); type_key('openai', bad); save()
    check(f'T7 rejected with a localized message: {bad.encode("ascii", "backslashreplace").decode()[:12]}', "document.getElementById('settings-modal').style.display==='flex' && document.getElementById('ai-provider-error').textContent===t('aiKeyInvalid').replace('{provider}','OpenAI')")
    c.js("closeKeySettings()")
    assert labels() == before, labels()
print('PASS T7 state/storage unchanged after every rejected masked value')

# ---- TEST 8: open + Save without editing, and a CLEARED field, never corrupt a secret ---------------------------------
open_dialog(); save()
assert labels() == before
open_dialog()
c.js("(()=>{const i=document.getElementById('openai-key-input');i.focus();i.select()})()")
c.call('Input.dispatchKeyEvent', type='keyDown', key='Backspace', code='Backspace', windowsVirtualKeyCode=8)
c.call('Input.dispatchKeyEvent', type='keyUp', key='Backspace', code='Backspace', windowsVirtualKeyCode=8)
check('T8 a cleared field shows "key saved" guidance instead of deleting', "document.getElementById('openai-key-input').value==='' && document.getElementById('openai-key-input').placeholder===t('aiKeySavedHint')")
save()
assert labels() == before, labels()
print('PASS T8 Save unchanged / cleared field keeps every key byte-identical')

# ---- TEST 12: leading/trailing whitespace trimmed --------------------------------------------------------------------
open_dialog(); type_key('openai', '   ' + KEYS['OAI_1'] + ' \t '); save()
check('T12 surrounding whitespace trimmed, inner characters exact', f"state.openaiKey==={KEYS['OAI_1']!r} && localStorage.getItem('reader_openai_key')==={KEYS['OAI_1']!r}")
assert ask() == '["openai:OAI_1"]'

# ---- TEST 11: two rapid saves -> the second is authoritative -----------------------------------------------------------
open_dialog(); type_key('openai', KEYS['OAI_A']); save(); open_dialog(); type_key('openai', KEYS['OAI_B']); save()
check('T11 B authoritative in state and storage', "__K[state.openaiKey]==='OAI_B' && __K[localStorage.getItem('reader_openai_key')]==='OAI_B'")
assert ask() == '["openai:OAI_B"]'
print('PASS T11 next request uses B')

# ---- TEST 10: replacing the key cancels the in-flight request made with the old one -----------------------------------
c.js("__defer=true;__pending=[];window.__old=startAiTask('Old key request','ask');void 0")
check('T10 setup: request in flight with the old key', "__pending.length===1 && __pending[0].label==='OAI_B' && els.askPanel.classList.contains('loading')", timeout=5)
open_dialog(); type_key('openai', KEYS['OAI_2']); save()
check('T10 old request aborted by the key replacement', "__pending[0].signal.aborted")
c.js("__defer=false;__pending[0].resolve()")
check('T10 its late reply is never shown', "(async()=>{await __old;return !els.askContent.textContent.includes('answer from OAI_B')})()")
assert ask() == '["openai:OAI_2"]'
print('PASS T10 next request uses the replacement')

# ---- TEST 9: explicit Remove key -----------------------------------------------------------------------------------------
open_dialog()
check('T9 Remove is offered only for saved keys', "!document.getElementById('openai-key-input-remove').hidden")
c.js("document.getElementById('openai-key-input-remove').click()")
check('T9 Remove is pending until Save (field says so)', "state.openaiKey!=='' && document.getElementById('openai-key-input').placeholder===t('aiKeyRemovePending')")
save()
check('T9 runtime + storage cleared, AI unavailable (active provider)', "state.openaiKey==='' && localStorage.getItem('reader_openai_key')===null && state.activeAiProvider==='openai' && !aiAvailable() && __K[state.groqKey]==='GROQ' && __K[state.apiKey]==='GEM'")
n = c.js("__calls.length")
c.js("els.askPanel.classList.add('expanded');els.askInput.value='x';document.getElementById('ask-send-btn').click()")
check('T9 next AI action shows localized add-key guidance and sends nothing', f"__toasts.at(-1)===t('needKey') && __calls.length==={n}")
open_dialog(); c.js("document.getElementById('groq-key-input-remove').click()"); type_key('groq', KEYS['GROQ'])
check('T9 typing after Remove cancels the pending removal', "!document.getElementById('groq-key-input').dataset.remove")
c.js("closeKeySettings()")

# ---- ACCEPTANCE (user-reported flow): replace -> Ask -> reload -> Ask -> replace -> Grammar / Practice ------------------
open_dialog(); radio('openai'); type_key('openai', KEYS['OAI_1']); save()
assert ask() == '["openai:OAI_1"]'
c.call('Page.reload'); boot()
assert ask() == '["openai:OAI_1"]'
open_dialog(); type_key('openai', KEYS['OAI_2']); save()
n = c.js("__calls.length")
c.js("startAiTask('Il parle avec son ami.','grammar');void 0")
check('ACCEPTANCE Grammar right after replacement uses the new key', f"__calls.length>{n} && __calls.slice({n}).every(x=>x.p==='openai'&&x.label==='OAI_2')", timeout=8)
n = c.js("__calls.length")
c.js("generatePracticeReading({sourceText:'Il parle.',sourceLanguage:'fr',targetLanguage:'en',bookId:null,mode:'verbs',lemmas:['parler'],seenForms:[],level:null}).catch(()=>{});void 0")
check('ACCEPTANCE Practice right after replacement uses the new key', f"__calls.length>{n} && __calls.slice({n}).every(x=>x.p==='openai'&&x.label==='OAI_2')", timeout=8)

# ---- Service worker: the cached app path keeps credentials, and no cache entry contains one -----------------------------
c.call('Network.setBypassServiceWorker', bypass=False)
c.js("navigator.serviceWorker.register('sw.js').catch(()=>{});void 0")
check('SW active', "(async()=>{const r=await navigator.serviceWorker.ready;return !!r.active})()", timeout=20)
c.call('Page.reload'); boot()
check('SW-controlled reload keeps provider and keys', "!!navigator.serviceWorker.controller && state.activeAiProvider==='openai' && __K[state.openaiKey]==='OAI_2' && __K[state.groqKey]==='GROQ'", timeout=10)
secret_list = json.dumps(list(KEYS.values()))
check('no key in any Cache Storage entry', f"""(async()=>{{const keys={secret_list};for(const name of await caches.keys()){{const cache=await caches.open(name);
    for(const req of await cache.keys()){{if(keys.some(k=>req.url.includes(k)))return false;const body=await (await cache.match(req)).text();if(keys.some(k=>body.includes(k)))return false}}}}return true}})()""", timeout=20)

# ---- Security: no key in logs, diagnostics, DOM text, URLs, error messages --------------------------------------------
check('no key in console, AI diagnostics, request URLs or DOM text', f"""(()=>{{const keys={secret_list};const hay=JSON.stringify([__logs,readerAiDiagnostics(),__calls.map(x=>x.url),document.body.textContent,location.href]);
    return !keys.some(k=>hay.includes(k)) && __calls.every(x=>!/[?&]key=/.test(x.url))}})()""")
c.js("closeKeySettings()")
check('closed dialog holds no key values', "Object.values(AI_PROVIDERS).every(x=>document.getElementById(x.input).value==='')")
c.js("localStorage.clear()")
print('ALL AI KEY REPLACEMENT TESTS PASSED')
