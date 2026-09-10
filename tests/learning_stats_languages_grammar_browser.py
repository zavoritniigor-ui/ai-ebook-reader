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

# A PDF-style text root avoids pagination timing while exercising the stable
# source-offset model used by real PDF rendering. Repeating the same lexeme 100
# times proves that identity belongs to an occurrence, not to a vocabulary string.
c.js("""(()=>{
 localStorage.removeItem('reader_learning_stats_v1:stats-book-one');
 localStorage.removeItem('reader_learning_stats_v1:stats-book-two');
 state.bookKey='stats-book-one';state.format='pdf';state.currentIndex=1;state.sourceLang='en-US';
 window.__showStatsPage=(page,count,word='the')=>{
  state.currentIndex=page;
  els.pages.innerHTML=`<div class="pdf-text-layer"><span>${Array(count).fill(word).join(' ')}</span></div>`;
 };
 window.__wordRange=(start,end)=>{const words=currentPageVocabulary().words;
  const first=words[start].pieces[0],last=words[end-1].pieces.at(-1),range=document.createRange();
  range.setStart(first.node,first.start);range.setEnd(last.node,last.end);return range;};
 window.__help=(start,end,type)=>recordHelpForSpan(__wordRange(start,end),type);
 window.__clearStats=()=>{learningStatsBook={version:LEARNING_STATS_VERSION,scopes:{}};saveLearningStatsForBook();};
 __showStatsPage(1,100);loadLearningStatsForBook();
})()""")

check('A. 100 words with no help is 100% independent', """(()=>{const s=calculateCurrentPageStats();return s.total===100&&s.helped===0&&s.independent===100&&s.readingPercent===100&&s.helpPercent===0})()""")
c.js("window.__diag=__help(0,1,'word_tap')")
check('B. one tapped occurrence is 99% independent', "__diag.addedOccurrenceIds.length===1&&__diag.stats.helped===1&&__diag.stats.independent===99&&__diag.stats.readingPercent===99&&__diag.stats.helpPercent===1")
c.js("for(let i=1;i<10;i++)__help(i,i+1,'word_tap')")
check('C. ten different occurrences are counted separately', "(()=>{const s=calculateCurrentPageStats();return s.helped===10&&s.independent===90&&s.readingPercent===90&&s.helpPercent===10})()")
c.js("for(let i=0;i<5;i++)window.__repeatDiag=__help(0,1,'word_tap')")
check('D. reopening the same occurrence is deduplicated', "__repeatDiag.addedOccurrenceIds.length===0&&calculateCurrentPageStats().helped===10")

c.js("__clearStats();window.__paragraphDiag=__help(0,20,'paragraph_translation')")
check('E. a 20-word paragraph marks 20 occurrences', "__paragraphDiag.addedOccurrenceIds.length===20&&__paragraphDiag.stats.helped===20&&__paragraphDiag.stats.readingPercent===80")
c.js("window.__paragraphRepeat=__help(0,20,'paragraph_translation')")
check('F. reopening a paragraph does not increase coverage', "__paragraphRepeat.addedOccurrenceIds.length===0&&calculateCurrentPageStats().helped===20")

c.js("__clearStats();__help(0,20,'phrase_translation');window.__overlapDiag=__help(10,30,'phrase_translation')")
check('G. overlapping 20-word spans cover 30 occurrences', "__overlapDiag.addedOccurrenceIds.length===10&&__overlapDiag.stats.helped===30&&__overlapDiag.stats.readingPercent===70")
c.js("__clearStats();window.__allDiag=__help(0,100,'paragraph_translation')")
check('H. translating all meaningful text reaches 100% help', "__allDiag.stats.helped===100&&__allDiag.stats.independent===0&&__allDiag.stats.readingPercent===0&&__allDiag.stats.helpPercent===100")

c.js("__clearStats();__help(0,20,'paragraph_translation');for(let i=15;i<25;i++)__help(i,i+1,'word_tap')")
check('I. paragraph and word taps share one deduplicated set', "(()=>{const s=calculateCurrentPageStats();return s.helped===25&&s.independent===75&&s.helpPercent===25})()")
c.js("__showStatsPage(2,50,'cat');refreshReadingStats()")
check('J. changing page shows only the new page statistics', "(()=>{const s=calculateCurrentPageStats();return s.total===50&&s.helped===0&&s.readingPercent===100})()")
c.js("for(let i=0;i<5;i++)__help(i,i+1,'word_tap');__showStatsPage(1,100,'the');refreshReadingStats()")
check('K. returning to a page restores its occurrence coverage', "(()=>{const s=calculateCurrentPageStats();return s.total===100&&s.helped===25&&s.readingPercent===75})()")

check('tokenization handles punctuation, compounds, contractions, and OCR noise', """(()=>{
 const text=`Hello, state-of-the-art l'amour aujourd’hui porte-monnaie 42 !!! aaaaaa ${'x'.repeat(41)}`;
 return vocabularyTokens(text,'fr').map(token=>token.word).join('|')===`Hello|state-of-the-art|l'amour|aujourd’hui|porte-monnaie`;
})()""")
check('known and unknown CEFR values remain conservative', "cachedCefrLevel('cat','en')==='A1'&&cachedCefrLevel('xylophonic','en')==='unknown'")
check('independent percentage follows its own occurrence formula', """(()=>{
 __showStatsPage(8,8,'eight');delete learningStatsBook.scopes['pdf:8'];__help(0,1,'word_tap');
 const s=calculateCurrentPageStats();return s.helpPercent===12.5&&s.readingPercent===87.5&&s.independent===7;
})()""")
c.js("els.pages.innerHTML='<div>Reader chrome must not count</div><div class=\"pdf-text-layer\"><span>one</span> <em>two</em></div>';state.currentIndex=3")
check('page chrome is excluded and inline whitespace keeps words separate', "(()=>{const s=calculateCurrentPageStats();return s.total===2&&currentPageVocabulary().words.map(w=>w.word).join('|')==='one|two'})()")

check('book learning data is persisted locally', "!!JSON.parse(localStorage.getItem('reader_learning_stats_v1:stats-book-one')).scopes['pdf:1']")
c.js("""(()=>{
 __showStatsPage(4,10,'help');__clearStats();
 const oldHandle=handleWordOrSelection;handleWordOrSelection=()=>{};
 try{selectRangeAndTranslate(__wordRange(0,3),10,10,'sentence_translation');}
 finally{handleWordOrSelection=oldHandle;}
 window.__delayedHelp=recordHelpForSpan(__wordRange(3,4),'word_tap');
 recordHelpForSpan(__delayedHelp,'ask_ai');recordHelpForSpan(__delayedHelp,'grammar');
})()""")
check('selection translation dispatches through the centralized span recorder', """(()=>{
 const records=learningStatsBook.scopes['pdf:4'];
 return calculateCurrentPageStats().helped===4&&Object.values(records).filter(r=>r.sources.includes('sentence_translation')).length===3;
})()""")
check('delayed Ask and Grammar reuse occurrence IDs without increasing coverage', """(()=>{
 const records=learningStatsBook.scopes['pdf:4'],record=records[__delayedHelp.matchedOccurrenceIds[0]];
 return calculateCurrentPageStats().helped===4&&record.sources.includes('word_tap')&&record.sources.includes('ask_ai')&&record.sources.includes('grammar');
})()""")
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
