"""Focused checks for current-page stats, added languages, and grammar rules."""
from browser_cdp import CDP

c = CDP()
c.call('Page.enable')
c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1100, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url='http://127.0.0.1:8765/index.html')
c.wait("document.readyState==='complete' && !document.body.inert")

def check(name, expression):
    value = c.js(expression)
    assert value is True, (name, value)
    print('PASS', name, flush=True)

check('statistics API and compact toolbar control are available', """(()=>{
 const button=document.getElementById('reading-stats-button'), pop=document.getElementById('reading-stats-popover');
 return typeof calculateCurrentPageStats==='function' && button && pop.hidden && button.getBoundingClientRect().width<=100;
})()""")

# A PDF-style one-page text root avoids pagination timing while exercising the same
# stable-offset data model used by real PDF rendering.
c.js("""(()=>{
 localStorage.removeItem('reader_learning_stats_v1:stats-book-one');
 localStorage.removeItem('reader_learning_stats_v1:stats-book-two');
 state.bookKey='stats-book-one';state.format='pdf';state.currentIndex=1;state.sourceLang='en-US';
 els.pages.innerHTML='<div class="pdf-text-layer"><span>The cat, cat reads 42 xylophonic.</span></div>';
 loadLearningStatsForBook();
 window.__wrapWord=(needle,from=0)=>{const host=els.pages.querySelector('.pdf-text-layer');
  const walker=document.createTreeWalker(host,NodeFilter.SHOW_TEXT);let node,start;
  while(node=walker.nextNode()){start=node.data.indexOf(needle,from);if(start>=0)break;}
  const range=document.createRange();range.setStart(node,start);range.setEnd(node,start+needle.length);
  const span=document.createElement('span');span.className='word-visited';range.surroundContents(span);return span;};
})()""")
check('meaningful page word count excludes punctuation and page numbers', "calculateCurrentPageStats().total===5")

c.js("window.__cat1=__wrapWord('cat');trackWordHelp('cat',__cat1);trackWordHelp('cat',__cat1)")
check('repeat tap on one occurrence does not inflate stats', "calculateCurrentPageStats().helped===1")
c.js("window.__cat2=__wrapWord('cat',1);trackWordHelp('cat',__cat2)")
check('same lexical word on the page remains unique', "calculateCurrentPageStats().helped===1")
c.js("window.__unknown=__wrapWord('xylophonic');trackWordHelp('xylophonic',__unknown)")
check('known and unknown CEFR values are handled conservatively', """(()=>{
 const s=calculateCurrentPageStats();return s.helped===2&&s.distribution.A1===1&&s.distribution.unknown===1&&s.readingPercent===60&&s.helpPercent===40;
})()""")
check('book learning data is persisted locally', "!!JSON.parse(localStorage.getItem('reader_learning_stats_v1:stats-book-one')).scopes['pdf:1']")

c.js("state.currentIndex=2;els.pages.innerHTML='<div class=\"pdf-text-layer\"><span>Another clean page.</span></div>';refreshReadingStats()")
check('page change recalculates count without carrying page-one taps', "(()=>{const s=calculateCurrentPageStats();return s.total===3&&s.helped===0})()")
c.js("state.bookKey='stats-book-two';state.currentIndex=1;els.pages.innerHTML='<div class=\"pdf-text-layer\"><span>The cat, cat reads 42 xylophonic.</span></div>';loadLearningStatsForBook()")
check('book change does not mix unrelated statistics', "calculateCurrentPageStats().helped===0")
c.wait("!document.getElementById('reading-stats-button').disabled")

c.js("document.getElementById('reading-stats-button').click()")
check('expanded statistics remain a lightweight popover', """(()=>{const p=document.getElementById('reading-stats-popover'),r=p.getBoundingClientRect();return !p.hidden&&r.width<=340&&r.height<window.innerHeight})()""")

check('new interface and target languages are registered', """(()=>{
 const wanted=['zh','ko','hi','ga'];
 return wanted.every(code=>SUPPORTED_LANGUAGE_CODES.includes(code)&&els.targetLang.querySelector(`option[value="${code}"]`)&&els.uiLang.querySelector(`option[value="${code}"]`));
})()""")
check('new dictation locales are present', "['zh-CN','ko-KR','hi-IN','ga-IE'].every(code=>els.micLang.querySelector(`option[value=\"${code}\"]`))")
check('new interface strings are localized', """(()=>{const old=state.uiLang;try{
 const expected={zh:'打开',ko:'열기',hi:'खोलें',ga:'Oscail'};
 return Object.entries(expected).every(([lang,word])=>{state.uiLang=lang;return t('open').includes(word)&&t('statsTitle')!==I18N.statsTitle.en;});
 }finally{state.uiLang=old;}})()""")
check('new script and Irish detection works', """detectLang('这是一本很好的书。')==='zh-CN'&&detectLang('이 책을 읽고 있습니다.')==='ko-KR'&&detectLang('यह एक अच्छी किताब है।')==='hi-IN'&&detectLang('Tá Gaeilge maith agus tá an leabhar anseo.')==='ga-IE'""")
check('TTS locale fallback is honest when no matching voice exists', """(()=>{const old=voices;try{voices=[];const r=voiceForLangCode('ga');return r.lang==='ga-IE'&&r.voice===null;}finally{voices=old;}})()""")
check('unsupported local translation pair returns null', """(async()=>{
 const old=window.Translator;try{window.Translator={availability:async()=> 'unavailable',create:async()=>{throw Error('must not create')}};localTranslators.clear();return await translateLocally('hello','en','ga')===null;}finally{window.Translator=old;localTranslators.clear();}
})()""")

check('French grammar prompt requests only present rules and localized section', """(()=>{
 state.sourceLang='fr-FR';const p=buildGrammarPrompt('a terminé','Il a terminé son travail.','en');
 return p.includes('<h4>Grammar rules used</h4>')&&p.includes('passé composé')&&p.includes('uniquement celles réellement présentes')&&p.includes('A1/A2/B1/B2/C1/C2');
})()""")
check('English grammar prompt uses selected explanation language', """(()=>{
 state.sourceLang='en-US';const p=buildGrammarPrompt('finished','She has finished her work.','fr');
 return p.includes('Answer in French')&&p.includes('<h4>Règles grammaticales utilisées</h4>')&&p.includes('passive voice')&&p.includes('only name those actually present');
})()""")
check('Grammar and Ask AI execution paths still render sanitized responses', """(async()=>{
 const oldAvailable=aiAvailable,oldCall=callAI,oldTarget=state.targetLang,oldKey=state.groqKey;
 try{aiAvailable=()=>true;state.groqKey='test';state.targetLang='en';
 callAI=async prompt=>prompt.includes('Grammar rules used')?'<section><h4>Grammar rules used</h4><div><b>Present perfect · B1</b><br>Links a past action to now.</div></section>':'<p>Ask answer</p>';
 state.sourceLang='en-US';state.lastGrammarSentence='She has finished her work.';
 await startAiTask('finished','grammar');if(!els.grammarContent.querySelector('section h4')||!els.grammarPanel.classList.contains('ready'))return false;
 await startAiTask('word','ask','Why?');return els.askContent.textContent==='Ask answer'&&els.askPanel.classList.contains('ready');
 }finally{aiAvailable=oldAvailable;callAI=oldCall;state.targetLang=oldTarget;state.groqKey=oldKey;}
})()""")

print('ALL LEARNING STATS / LANGUAGES / GRAMMAR CHECKS PASSED', flush=True)
