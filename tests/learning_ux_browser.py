"""Learning UX checks. Uses isolated Chrome/server as documented in README.
SpeechRecognition and AI are mocked; browser DOM, touch and layout are real.
"""
import base64, json, time
from browser_cdp import CDP, pdf_bytes
c=CDP();c.call('Emulation.setEmulatedMedia',features=[]);c.call('Page.enable');c.call('Network.setBypassServiceWorker',bypass=True)
# Keep gesture/timer waits on the browser clock even when the Python process is descheduled.
def pause(seconds): c.js(f'new Promise(resolve=>setTimeout(resolve,{seconds * 1000}))')
c.call('Emulation.setDeviceMetricsOverride',width=1000,height=1180,deviceScaleFactor=2,mobile=True)
c.call('Emulation.setTouchEmulationEnabled',enabled=True,maxTouchPoints=5)
preload=c.call('Page.addScriptToEvaluateOnNewDocument',source='''
window.__speech=[];window.__errors=[];
window.addEventListener('error',e=>__errors.push(e.message));
window.addEventListener('unhandledrejection',e=>__errors.push(String(e.reason)));
window.SpeechRecognition=class {
 constructor(){this.results=[];__speech.push(this)}
 start(){this.started=true;this.onstart?.()}
 abort(){this.aborted=true;this.onend?.()}
 stop(){this.onend?.()}
 final(text){const r=[{transcript:text}];r.isFinal=true;this.results.push(r);this.onresult?.({resultIndex:this.results.length-1,results:this.results})}
 interim(text){const r=[{transcript:text}];r.isFinal=false;this.onresult?.({resultIndex:this.results.length,results:[...this.results,r]})}
 end(){this.onend?.()}
 error(error){this.onerror?.({error});this.onend?.()}
};
''')['identifier']
c.call('Page.navigate',url='http://127.0.0.1:8765/index.html');c.wait("document.readyState==='complete' && !document.body.inert");pause(1)
def js(s):return c.js(s)
def check(name,s):
 r=js(s);assert r is True,(name,r);print('PASS',name,flush=True)
def tap(x,y):
 c.touch_tap(x,y)
def settle():pause(.25)
check('application initialized','typeof toggleDictation==="function" && __errors.length===0')
js("els.askPanel.classList.add('expanded');els.askInput.value='My question:';toggleDictation();recognition.final('First part');recognition.interim('still thinking')")
check('dictation final appended, interim separate',"els.askInput.value==='My question: First part' && dictationStatus.textContent==='still thinking'")
js('recognition.onresult({resultIndex:0,results:recognition.results});recognition.end()')
pause(8)
check('eight-second pause retains text and restarts once',"els.askInput.value==='My question: First part' && dictation.wanted && __speech.length===2")
js("recognition.final('Second part');els.askInput.value='Edited by hand.';recognition.final('Continuation')")
check('manual edit then continued speech',"els.askInput.value==='Edited by hand. Continuation'")
js("window.__oldRecognition=recognition;toggleDictation();__oldRecognition.final('late result')")
check('Stop ignores late events and retains text',"!dictation.wanted && els.askInput.value==='Edited by hand. Continuation' && els.micBtn.getAttribute('aria-pressed')==='false'")
js("toggleDictation();recognition.stop=function(){this.final('Final words at stop');this.onend()};toggleDictation()")
check('Stop finalizes pending speech without restarting', "els.askInput.value.endsWith('Final words at stop') && !dictation.wanted && !dictation.finishing")
js("toggleDictation();recognition.final('New session');recognition.error('not-allowed');window.__count=__speech.length")
pause(1.4)
check('permission error never restarts',"!dictation.wanted && __speech.length===__count && els.askInput.value.endsWith('New session')")
js("toggleDictation();recognition.error('network');window.__count=__speech.length");pause(.8)
check('system/network error never restarts','!dictation.wanted && __speech.length===__count')
js('toggleDictation();recognition.end();stopBackgroundActivity();window.__count=__speech.length');pause(1.4)
check('background cancels pending restart','!dictation.wanted && __speech.length===__count && dictation.timer===null')
js("toggleDictation();els.askPanel.classList.remove('expanded')");settle()
check('closing panel stops dictation','!dictation.wanted')
# Exercise bounded empty session ends (no infinite permission/start loop).
js("els.askPanel.classList.add('expanded');toggleDictation();recognition.end()")
pause(1.3);js('recognition.end()');pause(2.5);js('recognition.end()');pause(3.1);js('recognition.end()');settle()
check('empty restart loop is bounded','!dictation.wanted && dictation.timer===null')
js("els.askPanel.classList.remove('expanded');state.translateMode=true;state.format='txt';els.pages.classList.add('no-anim');els.pages.style.transform='none';document.body.classList.add('immersive-mode');window.__prompts=[];aiAvailable=()=>true;speakText=()=>{};speakInLang=()=>{};machineTranslate=async()=>({plain:'Fallback',html:'Fallback',extras:''});callAI=async prompt=>{__prompts.push(prompt);return JSON.stringify(__fixture)}")
cases=[
 ('simple English','The cat sleeps.','Кіт спить.',[(['The cat'],'Кіт'),(['sleeps'],'спить')]),
 ('French','Je vois la maison.','Я бачу будинок.',[(['Je'],'Я'),(['vois'],'бачу'),(['la maison'],'будинок')]),
 ('reordered Ukrainian','Yesterday John bought a book.','Книгу Джон купив учора.',[(['Yesterday'],'учора'),(['John'],'Джон'),(['bought'],'купив'),(['a book'],'Книгу')]),
 ('separated phrasal verb','She picked the book up.','Вона підняла книгу.',[(['She'],'Вона'),(['picked','up'],'підняла'),(['the book'],'книгу')]),
 ('passé composé','Il a mangé une pomme.','Він з’їв яблуко.',[(['Il'],'Він'),(['a mangé'],'з’їв'),(['une pomme'],'яблуко')]),
 ('many source words to one target','They have been waiting.','Вони чекають.',[(['They'],'Вони'),(['have been waiting'],'чекають')]),
]
for name,source,target,links in cases:
 fixture=dict(translation=target,alignment=[dict(source=a,target=b,confidence='high') for a,b in links])
 js(f"window.__fixture={json.dumps(fixture)};els.pages.replaceChildren(Object.assign(document.createElement('p'),{{textContent:{json.dumps(source)}}}));els.pages.firstChild.style.marginTop='180px';state.ctxSentence={json.dumps(source)};state.lastSelectedRange=document.createRange();state.lastSelectedRange.selectNodeContents(els.pages.firstChild)")
 js(f"selectRangeAndTranslate(state.lastSelectedRange,150,200)");settle()
 check(name+' structured translation',f'activeAlignment?.links.length==={len(links)} && mainTranslationText()==={json.dumps(target)}')
 for i,(parts,target_part) in enumerate(links):
  check(name+' source phrase '+str(i),f"sourceAlignmentRanges(activeAlignment.links[{i}]).map(r=>r.toString()).join('|')==={json.dumps('|'.join(parts))}")
 js("els.ttTranslation.querySelector('[data-alignment]').click()")
 check(name+' target click flashes source',"alignmentFlash.children.length>0 && !!els.ttTranslation.querySelector('.alignment-active')")
# Reverse uses the real reader touch stream; no new lookup/network call.
pos=js("(()=>{const r=sourceAlignmentRanges(activeAlignment.links[0])[0].getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()")
js("""window.__calls=__prompts.length;clearAlignmentFlash();
window.__alignmentEvents=[];
for(const name of ['pointerdown','pointerup','click'])document.addEventListener(name,e=>__alignmentEvents.push({name,t:performance.now(),source:alignmentSourceAt(e.clientX,e.clientY),suppress:state.suppressNextClick}),{once:true,capture:true});
window.__alignmentTapSeen=new Promise(resolve=>{
 let timer;
 const observer=new MutationObserver(()=>{
  if(els.ttTranslation.querySelector('.alignment-active')){clearTimeout(timer);observer.disconnect();resolve(true);}
 });
 // Start the observation deadline with the gesture, not a separate CDP command.
 document.addEventListener('pointerdown',()=>{
  timer=setTimeout(()=>{observer.disconnect();resolve(false);},2000);
 },{once:true,capture:true});
 observer.observe(els.ttTranslation,{subtree:true,attributes:true,attributeFilter:['class']});
});void 0;""");tap(pos['x'],pos['y']);settle()
check('source tap flashes translation without second lookup',"(async()=>await __alignmentTapSeen && __prompts.length===__calls || {events:__alignmentEvents,calls:__prompts.length,before:__calls})()")
check('no positional fallback for repeated or invalid spans',"validateAlignment('a a cat','кіт',[{source:['a'],target:'кіт',confidence:'high'},{source:['dog'],target:'кіт',confidence:'high'}]).length===0")
check('low confidence and substrings rejected',"validateAlignment('theater','театр',[{source:['the'],target:'театр',confidence:'high'},{source:['theater'],target:'театр',confidence:'low'}]).length===0")
check('overlapping target links rejected',"validateAlignment('a cat sleeps','кіт спить',[{source:['cat'],target:'кіт',confidence:'high'},{source:['sleeps'],target:'кіт спить',confidence:'high'}]).length===0")
# Existing AI function still returns plain strings to other callers.
check('panel translation retains string contract',"(async()=>{const old=callAI;callAI=async()=> 'Bonjour';const r=await aiTranslateText('Hello','en');callAI=old;return r==='Bonjour'})()")
# No alignment payload => plain translation; rejected JSON uses existing fallback.
js("clearAlignment();state.translationCache={};callAI=async()=>'{broken';handleWordOrSelection('A new sentence. ',100,200)");settle()
check('malformed alignment falls back safely',"activeAlignment===null && mainTranslationText()==='Fallback'")
# The same mapping resolves live PDF text ranges after a 300% render.
pdf=base64.b64encode(pdf_bytes()).decode()
js(f"(async()=>{{state.format='pdf';state.bookKey='learning-pdf';state.pdfScale=3;state.pdfFit='free';document.body.classList.add('pdf-mode');await initPdf(new File([Uint8Array.from(atob('{pdf}'),c=>c.charCodeAt(0))],'fixture.pdf'))}})()")
settle()
js("callAI=async()=>JSON.stringify({translation:'Привіт, світе. PDF сторінка 1.',alignment:[{source:['Hello world'],target:'Привіт, світе',confidence:'high'}]});state.translationCache={};state.lastSelectedRange=document.createRange();state.lastSelectedRange.selectNodeContents(els.pages.querySelector('.pdf-text-layer span'));selectRangeAndTranslate(state.lastSelectedRange,200,200)")
settle()
check('PDF alignment keeps live source after zoom', "activeAlignment?.links.length===1 && sourceAlignmentRanges(activeAlignment.links[0])[0].toString()==='Hello world'")
js('flashAlignment(0)')
check('PDF source flash follows transformed screen coordinates', "(()=>{const a=alignmentFlash.firstElementChild?.getBoundingClientRect();const b=sourceAlignmentRanges(activeAlignment.links[0])[0].getBoundingClientRect();return a && Math.abs(a.left-b.left)<1 && Math.abs(a.width-b.width)<1})()")
# Grammar click/phrase calls the current lookup, preserving language context and markup.
js("invalidateSelection();els.grammarPanel.classList.add('expanded');window.__lookups=[];handleWordOrSelection=(word,x,y)=>__lookups.push({word,lang:langForText(word),context:state.ctxSentence});")
c.wait("getComputedStyle(els.grammarPanel).transform==='none'")
for text,lang in [('The birds are singing.','en'),('Les oiseaux chantent.','fr')]:
 js(f"els.grammarContent.innerHTML='<p></p>';els.grammarContent.firstChild.textContent={json.dumps(text)}")
 pos=js("(()=>{const node=els.grammarContent.firstChild.firstChild;const r=document.createRange();const start=node.textContent.indexOf(' ')+1;r.setStart(node,start);r.setEnd(node,node.textContent.indexOf(' ',start));const b=r.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2}})()")
 js('window.__lookupCount=__lookups.length')
 settle();tap(pos['x'],pos['y']);c.wait('__lookups.length>__lookupCount')
 check('grammar shared lookup '+lang,f'__lookups.at(-1)?.lang.startsWith({json.dumps(lang)})')
js("els.grammarContent.innerHTML='<table><tbody><tr><td>il a mangé</td></tr></tbody></table>';els.grammarContent.querySelector('td').click()")
check('grammar phrase preserves table and translates together',"__lookups.at(-1).word==='il a mangé' && !!els.grammarContent.querySelector('table td')")
js("els.grammarContent.innerHTML='<button class=\"verb-chip\">manger</button>';window.__calls=__lookups.length;els.grammarContent.querySelector('button').click()")
check('grammar controls do not trigger translation','__lookups.length===__calls')
# Onboarding on first pages only, persisted before the three soft cycles.
js("els.grammarPanel.classList.remove('expanded','loading','ready');els.askPanel.classList.remove('expanded','loading','ready');stopOnboarding();onboardingState={};localStorage.removeItem(ONBOARDING_KEY);state.bookKey='learning-fixture';state.format='pdf';state.currentIndex=1;scheduleReaderOnboarding();window.__onboardingAtStart=new Promise(resolve=>setTimeout(()=>resolve(getComputedStyle(els.askTab).animationIterationCount===\"3\" && els.askTab.classList.contains(\"onboarding-cue\") && els.menuHandle.classList.contains(\"onboarding-cue\")),800))")
check('three soft onboarding cycles','__onboardingAtStart')
check('onboarding state persisted at start','JSON.parse(localStorage.getItem(ONBOARDING_KEY)).ask===true')
js("els.askPanel.classList.add('loading')");settle()
check('red request status overrides onboarding',"!els.askTab.classList.contains('onboarding-cue') && getComputedStyle(els.askTab).backgroundColor==='rgba(220, 53, 69, 0.14)'")
js("els.askPanel.classList.remove('loading');els.grammarTab.click();stopOnboarding();state.currentIndex=2;scheduleReaderOnboarding()");pause(.8)
check('interaction/page two never repeats onboarding',"!document.querySelector('.onboarding-cue, .onboarding-static')")
js('onboardingState={};state.currentIndex=4;scheduleReaderOnboarding()');settle()
check('past first pages marks onboarding complete',"Object.keys(onboardingGroups).every(k=>onboardingState[k]) && !document.querySelector('.onboarding-cue')")
c.call('Emulation.setEmulatedMedia',features=[dict(name='prefers-reduced-motion',value='reduce')])
js("els.grammarPanel.classList.remove('expanded');onboardingState={};state.currentIndex=1;scheduleReaderOnboarding();window.__reducedAtStart=new Promise(resolve=>setTimeout(()=>resolve(els.askTab.classList.contains('onboarding-static') && getComputedStyle(els.askTab).animationName==='none'),800))")
check('reduced motion gets static cue only','__reducedAtStart')
js('new Promise(resolve=>setTimeout(resolve,5000))')
check('onboarding returns to normal','!document.querySelector(".onboarding-cue, .onboarding-static")')
check('no application errors','__errors.length===0')
c.call('Page.removeScriptToEvaluateOnNewDocument',identifier=preload)
c.call('Emulation.setEmulatedMedia',features=[])
print('ALL LEARNING UX CHECKS PASSED')
