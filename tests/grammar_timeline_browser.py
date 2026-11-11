"""French tense chronology, present centering and quiet theme-aware tinting."""
import os,time,base64
from pathlib import Path
from browser_cdp import CDP
c=CDP(); c.call('Page.enable'); c.call('Runtime.enable');c.call('Network.setBypassServiceWorker',bypass=True)
c.call('Emulation.setDeviceMetricsOverride',width=1000,height=1000,deviceScaleFactor=1,mobile=False)
c.call('Page.navigate',url=os.environ.get('READER_TEST_URL','http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert")
c.js("closeFullMenu(); grammarContext.mode='verbs';grammarContext.analysis={language:'fr',items:[]};grammarContext.focused=null;grammarContext.sourceLanguage='fr';renderGrammarControlsBar('fr');els.grammarPanel.classList.add('expanded');1")
time.sleep(.6)

def check(name,expr):
 value=c.js(expr);assert value is True,(name,value)
 print('PASS',name,flush=True)

check('past is ordered far-to-near, present is central, future is on the right',"""(()=>{const b=[...document.querySelectorAll('.grammar-time-rail button')];return b.map(x=>x.dataset.tenseId).join('|')==='plus_que_parfait|indicatif_imparfait|indicatif_passe_compose|indicatif_present|indicatif_futur' && b.every((x,i)=>!i||x.getBoundingClientRect().left>b[i-1].getBoundingClientRect().left)})()""")
check('moods retain their own row and all original tense actions exist exactly once',"""(()=>{const ids=[...document.querySelectorAll('#grammar-controls-bar button')].map(x=>x.dataset.tenseId);return ids.length===GRAMMAR_LANG_CONFIG.fr.verb.tenses.length&&new Set(ids).size===ids.length&&[...document.querySelectorAll('.grammar-mood-controls button')].map(x=>x.dataset.tenseId).join('|')==='conditionnel_present|subjonctif_present|imperatif'&&GRAMMAR_LANG_CONFIG.fr.verb.tenses[0].id==='indicatif_present'})()""")
CENTER="""(()=>{const s=document.querySelector('.grammar-time-scroll').getBoundingClientRect(),p=document.querySelector('[data-tense-id="indicatif_present"]').getBoundingClientRect();return Math.abs((s.left+s.width/2)-(p.left+p.width/2))<2 || {s:s.toJSON(),p:p.toJSON()}})()"""
check('present starts in the visible center',CENTER)
# The own-word lookup renders once for focus and again for the default tense,
# before either pending animation frame can run.
c.js("grammarContext.mode='adjectives';renderGrammarControlsBar('fr');grammarContext.mode='verbs';renderGrammarControlsBar('fr');renderGrammarControlsBar('fr');1")
time.sleep(.1)
check('back-to-back initial renders still center present (lookup path)',CENTER)
c.js("showGrammarLookupItem({pos:'verb',lemma:'parler',surface:'parle',sentence:'Je parle français.',start:3,end:8,features:{tense:'présent'},forms:{je:'parle',tu:'parles','il / elle / on':'parle',nous:'parlons',vous:'parlez','ils / elles':'parlent'}},'fr');1")
time.sleep(.15)
check('the actual own-word lookup centers its default present tense',CENTER)
c.js("grammarContext.focused=null;1")


c.js("document.querySelector('.grammar-time-scroll').scrollLeft=0;document.querySelector('[data-tense-id=plus_que_parfait]').click();1")
time.sleep(.15)
check('choosing a distant past tense keeps its selected state and scroll position',"document.querySelector('[data-tense-id=plus_que_parfait]').getAttribute('aria-pressed')==='true' && document.querySelector('.grammar-time-scroll').scrollLeft===0")
for width in (360,820):
 c.call('Emulation.setDeviceMetricsOverride',width=width,height=1100,deviceScaleFactor=1,mobile=width<500)
 time.sleep(.4)
 check('present recenters when the viewport changes: '+str(width),CENTER)
 check('timeline remains inside the panel without page overflow',"(()=>{const s=document.querySelector('.grammar-time-scroll').getBoundingClientRect(),p=els.grammarPanel.getBoundingClientRect();return s.left>=p.left&&s.right<=p.right+1&&p.right<=innerWidth+1})()")
 for theme in ('light','dark','sepia'):
  # Global button colors transition for 150 ms; measure the settled theme.
  c.js("""(async()=>{document.documentElement.dataset.theme='%s';getComputedStyle(document.querySelector('.grammar-time-rail button')).backgroundColor;await Promise.all(document.getAnimations().filter(a=>a.effect?.target?.closest?.('.grammar-time-rail')).map(a=>a.finished.catch(()=>{})));return 1})()"""%theme)
  check(theme+' has distinct soft past shades and readable labels',"""(()=>{const bs=[...document.querySelectorAll('.grammar-time-rail button')];const past=bs.filter(x=>x.dataset.time==='past').map(x=>getComputedStyle(x).backgroundColor);const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');function rgb(s){ctx.clearRect(0,0,1,1);ctx.fillStyle=s;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3)}function lum(v){return v.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0)}return new Set(past).size===3&&bs.every(b=>{const s=getComputedStyle(b),a=lum(rgb(s.color)),z=lum(rgb(s.backgroundColor));return (Math.max(a,z)+.05)/(Math.min(a,z)+.05)>=4.5})})()""")
  if os.environ.get('TIMELINE_SCREENSHOT_DIR'):
   folder=Path(os.environ['TIMELINE_SCREENSHOT_DIR']);folder.mkdir(exist_ok=True,parents=True)
   result=c.call('Page.captureScreenshot',format='png')
   (folder/f'{width}-{theme}.png').write_bytes(base64.b64decode(result['data']))
c.js("grammarContext.mode='adjectives';renderGrammarControlsBar('fr');1")
check('adjectives clear all timeline controls',"document.getElementById('grammar-controls-bar').childElementCount===0")
c.js("grammarContext.mode='verbs';renderGrammarControlsBar('en');1")
check('other languages retain their own configured controls',"document.querySelectorAll('.grammar-time-rail').length===0 && document.querySelectorAll('#grammar-controls-bar button').length===GRAMMAR_LANG_CONFIG.en.verb.tenses.length")
