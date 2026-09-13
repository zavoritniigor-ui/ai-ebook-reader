"""BYOK providers, REST normalization and cancellation. All AI HTTP is mocked.
No real credentials or paid requests are used. Request records omit auth values.
"""
import os
import time
from browser_cdp import CDP

c = CDP(); c.sock.settimeout(45)
c.call('Page.enable'); c.call('Runtime.enable')
c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride',width=1280,height=900,deviceScaleFactor=1,mobile=False)
bootstrap = c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__keys={openai:'sk-proj-test-only-not-a-real-key',groq:'gsk_test_only_not_real',gemini:'AIza_test_only_not_real'};
window.__calls=[];window.__logs=[];window.__errors=[];window.__pending=[];window.__mode='success';window.__aborts=0;
for(const name of ['log','warn','error']) { const original=console[name];console[name]=(...args)=>{__logs.push(args.map(String).join(' '));original.apply(console,args)}; }
addEventListener('error',e=>__errors.push(e.message));
addEventListener('unhandledrejection',e=>__errors.push(String(e.reason)));
const originalFetch=window.fetch;
window.fetch=async(url,options={})=>{
 const address=String(url);
 const provider=address.includes('api.openai.com')?'openai':address.includes('api.groq.com')?'groq':address.includes('generativelanguage.googleapis.com')?'gemini':null;
 if(!provider)return originalFetch(url,options);
 const headers=new Headers(options.headers),body=JSON.parse(options.body);
 const auth=headers.get(provider==='gemini'?'x-goog-api-key':'Authorization');
 __calls.push({provider,url:address,body,authMatches:auth===(provider==='gemini'?__keys[provider]:'Bearer '+__keys[provider])});
 const response=text=>new Response(JSON.stringify(provider==='openai'?{status:'completed',output:[
  {type:'reasoning',summary:[{text:'never show reasoning'}]},
  {type:'message',role:'assistant',content:[{type:'output_text',text}]}
 ]}:provider==='groq'?{choices:[{message:{content:text}}]}:{candidates:[{content:{parts:[{text}]}}]}));
 const sseResponse=text=>{
  const events=[];
  if(text.length>0){
   events.push({type:'response.output_text.delta',delta:text.substring(0,Math.floor(text.length/2))});
   events.push({type:'response.output_text.delta',delta:text.substring(Math.floor(text.length/2))});
  }
  events.push({type:'response.output_text.done'});
  const encoder=new TextEncoder();
  let eventIndex=0;
  const stream=new ReadableStream({
   pull(controller){
    if(eventIndex>=events.length){controller.close();return;}
    const event=events[eventIndex++];
    const line='data: '+JSON.stringify(event)+'\n\n';
    const chunk=encoder.encode(line);
    if(eventIndex===2){
     const split=Math.floor(chunk.length/2);
     controller.enqueue(chunk.slice(0,split));
     controller.enqueue(chunk.slice(split));
    }else{
     controller.enqueue(chunk);
    }
   }
  });
  return new Response(stream,{headers:{'content-type':'text/event-stream'}});
 };
 if(__mode==='network')throw new TypeError('network '+__keys.openai);
 if(__mode==='401'||__mode==='429'||__mode==='503')return new Response(JSON.stringify({error:{message:__keys.openai+' Authorization: '+__keys.groq}}),{status:Number(__mode)});
 if(__mode==='malformed')return new Response('{broken');
 if(__mode==='null')return new Response('null');
 if(__mode==='empty')return provider==='openai'&&body.stream?sseResponse(''):response('');
 if(__mode==='incomplete')return new Response(JSON.stringify({status:'incomplete',output:[]}));
 if(__mode==='refusal')return new Response(JSON.stringify({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'refusal',refusal:'No'}]}]}));
 if(__mode==='multi')return new Response(JSON.stringify({status:'completed',output:[{type:'reasoning'},{type:'message',role:'assistant',content:[{type:'output_text',text:'One'},{type:'output_text',text:'Two'}]}]}));
 if(__mode==='defer'||__mode==='abortable'){
  const abortable=__mode==='abortable';
  return new Promise((resolve,reject)=>{
   __pending.push({resolve:text=>resolve(response(text)),signal:options.signal});
   options.signal.addEventListener('abort',()=>{__aborts++;if(abortable)reject(new DOMException('Cancelled','AbortError'))},{once:true});
  });
 }
 if(__mode==='translation')return response('Bonjour');
 if(provider==='openai'&&body.stream)return sseResponse('<p>Provider answer</p><img src="x" onerror="window.__unsafe=1"><script>window.__unsafe=1</script>');
 return response('<p>Provider answer</p><img src="x" onerror="window.__unsafe=1"><script>window.__unsafe=1</script>');
};
''')['identifier']
c.call('Page.navigate',url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert")
c.js("localStorage.clear();showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove()")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert")
c.js("showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove();state.uiLang='en';applyI18n()")

def check(name,expression):
    value=c.js(expression)
    assert value is True,(name,value)
    print('PASS',name,flush=True)

def secure():
    check('credentials absent from current-page logs and URLs', "!Object.values(__keys).some(k=>JSON.stringify([__calls.map(x=>x.url),__logs,__errors,document.body.textContent]).includes(k)) && __errors.length===0")

def select(provider):
    c.js(f"document.querySelector('input[name=\"ai-provider\"][value=\"{provider}\"]').click()")

def save():
    c.js("document.querySelector('#settings-modal .btn-primary').click()")

# Legacy migration keeps Groq priority once, then honors explicit selection.
for legacy, expected in [('gemini', 'gemini'), ('groq', 'groq')]:
    c.js("localStorage.clear();localStorage.setItem('reader_gemini_key',__keys.gemini)" + (";localStorage.setItem('reader_groq_key',__keys.groq)" if legacy == 'groq' else ''))
    c.call('Page.reload');c.wait("document.readyState==='complete' && !document.body.inert")
    check('legacy '+legacy+' settings migrate', f"state.activeAiProvider==='{expected}' && readStored('reader_active_ai_provider')==='{expected}'")
c.js('localStorage.clear()')
c.call('Page.reload');c.wait("document.readyState==='complete' && !document.body.inert")
c.js('openKeySettings()')
for provider in ['openai', 'gemini', 'groq']:
    check(provider+' key field visible', f"(()=>{{const el=document.getElementById(AI_PROVIDERS['{provider}'].input);el.scrollIntoView();const r=el.getBoundingClientRect();return el.checkVisibility() && r.width>0 && r.height>0 && r.top>=0 && r.bottom<=innerHeight}})()")
select('openai')
check('empty OpenAI cannot be selected', "document.querySelector('input[name=\"ai-provider\"]:checked').value==='gemini' && !document.getElementById('ai-provider-error').hidden && document.getElementById('ai-provider-error').textContent===missingAiKey('openai') && state.activeAiProvider==='gemini'")
# Real text insertion into the masked field; other keys share the same save flow.
c.js("document.getElementById('openai-key-input').focus()")
c.call('Input.insertText',text='sk-proj-test-only-not-a-real-key')
c.js("document.getElementById('api-key-input').value=__keys.gemini;document.getElementById('groq-key-input').value=__keys.groq")
select('openai')
check('selection remains a draft until Save', "state.activeAiProvider==='gemini' && document.querySelector('input[name=\"ai-provider\"]:checked').value==='openai'")
save()
check('keys coexist and provider saved', "Object.entries(AI_PROVIDERS).every(([p,x])=>state[x.key]===__keys[p] && readStored(x.storage)===__keys[p]) && state.activeAiProvider==='openai' && readStored('reader_active_ai_provider')==='openai'")
for provider in ['openai', 'groq', 'gemini']:
    check('missing selected '+provider+' key rejects despite other saved keys', f"(async()=>{{const previous=state.activeAiProvider,field=AI_PROVIDERS['{provider}'].key,key=state[field];try{{state.activeAiProvider='{provider}';state[field]='';__calls=[];try{{await callAI('missing');return false}}catch(e){{return !aiAvailable()&&__calls.length===0&&e.message===missingAiKey('{provider}')}}}}finally{{state[field]=key;state.activeAiProvider=previous}}}})()")
check('closed dialog clears key values', "Object.values(AI_PROVIDERS).every(x=>document.getElementById(x.input).value==='')")
c.js('openKeySettings()')
check('saved keys remain password masked', "Object.entries(AI_PROVIDERS).every(([p,x])=>{const el=document.getElementById(x.input);return el.type==='password'&&el.value===__keys[p]})")
select('groq');c.js('closeKeySettings()')
check('Cancel discards provider edits', "state.activeAiProvider==='openai' && readStored('reader_active_ai_provider')==='openai'")
for provider in ['groq','gemini','openai']:
    c.js('openKeySettings()');select(provider);save()
    secure()
    c.call('Page.reload');c.wait("document.readyState==='complete' && !document.body.inert")
    check(provider+' selection survives reload',f"state.activeAiProvider==='{provider}' && readStored('reader_active_ai_provider')==='{provider}'")
    c.js("__calls=[];__mode='success'")
    check(provider+' text routes only to active provider',f"(async()=>{{const out=await callAI('test');return out.includes('Provider answer') && __calls.length===1 && __calls[0].provider==='{provider}' && __calls[0].authMatches && !__calls[0].url.includes('key=')}})()")
    c.js('__calls=[]')
    check(provider+' image routes only to active provider',f"(async()=>{{const out=await callAIVision('image','data:image/png;base64,AA==');return out.includes('Provider answer') && __calls.length===1 && __calls[0].provider==='{provider}' && __calls[0].authMatches}})()")
    c.js("__calls=[];__mode='503'")
    check(provider+' errors never trigger fallback',f"(async()=>{{try{{await callAI('failure');return false}}catch(e){{return __calls.length===1&&__calls[0].provider==='{provider}'&&!Object.values(__keys).some(k=>e.message.includes(k))}}}})()")

c.js("__mode='success';__calls=[];state.uiLang='en';applyI18n()")
check('OpenAI Responses request contract', "(async()=>{await callAIVision('image','data:image/png;base64,AA==');const r=__calls[0];return r.url==='https://api.openai.com/v1/responses' && r.body.model===OPENAI_MODEL && r.body.store===false && r.body.input[0].content[1].type==='input_image' && r.body.input[0].content[1].image_url.startsWith('data:image/png')})()")
c.js("__mode='multi'")
check('REST text blocks normalized, reasoning ignored', "(async()=>await callAI('test')===['One','Two'].join(String.fromCharCode(10)))()")
c.js("__mode='success'")
for mode in ['ask','grammar','level']:
    check('OpenAI '+mode+' uses existing safe rendering',f"(async()=>{{await startAiTask('Hello world.','{mode}');const el={'els.grammarContent' if mode=='grammar' else 'els.askContent'};return el.textContent.includes('Provider answer')&&!el.querySelector('script,[onerror]')&&!window.__unsafe}})()")
check('OpenAI image exercises use existing rendering', "(async()=>{await checkExerciseImage('data:image/png;base64,AA==');return els.askContent.textContent.includes('Provider answer')&&!els.askContent.querySelector('script,[onerror]')})()")
c.js("__mode='translation'")
check('AI translation routes to OpenAI', "(async()=>await aiTranslateText('Hello','en',undefined,'fr')==='Bonjour')()")
for mode,key in [('401','aiAuthError'),('429','aiRateError'),('network','aiNetworkError'),('malformed','aiInvalidResponse'),('null','aiInvalidResponse'),('empty','aiEmptyResponse'),('incomplete','aiInvalidResponse'),('refusal','aiEmptyResponse')]:
    c.js(f"__mode='{mode}';__calls=[]")
    check('safe localized '+mode+' error in existing panel',f"(async()=>{{await startAiTask('test','ask');return els.askContent.textContent===t('{key}').replace('{{provider}}','OpenAI') && __calls.length===1 && !Object.values(__keys).some(k=>els.askContent.textContent.includes(k))}})()")

c.js("__mode='abortable';__calls=[];__pending=[];window.__controller=new AbortController();window.__cancelled=callAI('abort',__controller.signal).then(()=>false,e=>e.name==='AbortError');void 0")
c.js('__controller.abort()')
check('in-flight request cancellation', '(async()=>await __cancelled && __calls.length===1 && aiRequests.size===0)()')
check('pre-aborted request never sends', "(async()=>{__calls=[];try{await callAIVision('x','data:image/png;base64,AA==',__controller.signal);return false}catch(e){return e.name==='AbortError'&&__calls.length===0}})()")
# Simulate a transport which returns even after abort; old results must not render.
c.js("__mode='defer';__pending=[];window.__first=startAiTask('First','ask');window.__second=startAiTask('Second','ask');void 0")
c.js("__pending[1].resolve('<p>Newest answer</p>')")
c.js("__pending[0].resolve('<p>Stale answer</p>')")
check('rapid actions cannot overwrite newest response', "(async()=>{await Promise.all([__first,__second]);return els.askContent.textContent==='Newest answer' && aiRequests.size===0})()")
c.js("__pending=[];window.__switchTask=startAiTask('Old provider','ask');openKeySettings()")
select('groq');save();c.js("__mode='success';window.__newTask=startAiTask('New provider','ask');__pending[0].resolve('<p>Old provider answer</p>')")
check('provider switch aborts and rejects stale response', "(async()=>{await Promise.all([__switchTask,__newTask]);return __pending[0].signal.aborted && els.askContent.textContent==='Provider answer' && __calls.at(-1).provider==='groq'})()")
# A late transport response after a page/document change is never returned.
c.js("__mode='defer';__pending=[];window.__pageRequest=callAI('Old page').then(()=>false,e=>e.name==='AbortError');void 0")
c.js("state.currentIndex++;__pending[0].resolve('<p>Old page</p>')")
check('page navigation rejects late response', '(async()=>await __pageRequest)()')
c.js("__pending=[];window.__bookRequest=callAI('Old book').then(()=>false,e=>e.name==='AbortError');void 0")
c.js("readerEpoch.book++;__pending[0].resolve('<p>Old book</p>')")
check('book replacement rejects late response', '(async()=>await __bookRequest)()')
c.js("__mode='abortable';__pending=[];window.__keyRequest=callAI('Old key').then(()=>false,e=>e.name==='AbortError');openKeySettings();document.getElementById('groq-key-input').value='gsk_replacement_test_only';saveApiKey();void 0")
check('replacing active key aborts old request', '(async()=>await __keyRequest && aiRequests.size===0)()')
c.js("openKeySettings();document.getElementById('groq-key-input').value=__keys.groq;saveApiKey()")
secure()
c.js("openKeySettings();document.getElementById('openai-key-input').value='';document.getElementById('api-key-input').value='';saveApiKey();openKeySettings()")
for provider in ['openai','gemini']:
    select(provider)
    check('missing '+provider+' rejected without silent switch',f"state.activeAiProvider==='groq' && document.querySelector('input[name=\"ai-provider\"]:checked').value==='groq' && document.getElementById('ai-provider-error').textContent===missingAiKey('{provider}')")
c.js("document.getElementById('groq-key-input').value='';saveApiKey();__calls=[]")
check('deleting active key disables AI without fallback', "(async()=>{try{await callAI('x');return false}catch(e){return state.activeAiProvider==='groq'&&!aiAvailable()&&__calls.length===0&&e.message===missingAiKey('groq')}})()")
secure()
c.call('Page.reload');c.wait("document.readyState==='complete' && !document.body.inert")
check('empty selected provider survives restart without reselection', "state.activeAiProvider==='groq'&&!aiAvailable()")
# All new UI/error strings are explicitly translated, not English fallbacks.
check('all eight languages have settings and error strings', "['openaiKeyTitle','groqKeyTitle','aiProviderLabel','aiAddKey','aiAuthError','aiRateError','aiNetworkError','aiInvalidResponse','aiEmptyResponse','aiRequestError','keyNote','tAiKey'].every(k=>SUPPORTED_LANGUAGE_CODES.every(lang=>typeof I18N[k][lang]==='string'&&I18N[k][lang]!==k))")
check('no credential leaks in URLs, console or error events', "!Object.values(__keys).some(k=>JSON.stringify([__calls.map(x=>x.url),__logs,__errors,document.body.textContent]).includes(k)) && __errors.length===0")
c.js("localStorage.clear();cancelAIRequests();closeKeySettings()")
c.call('Page.removeScriptToEvaluateOnNewDocument',identifier=bootstrap)
c.call('Emulation.clearDeviceMetricsOverride')
print('PASS all AI provider checks',flush=True)
