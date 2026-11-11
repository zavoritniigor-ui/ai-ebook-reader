"""Actual Practice mouse/pen drags cross clickable targets without opening Grammar."""
import json, os, time
from browser_cdp import CDP
from practice_fixtures import VERBS_FR

c=CDP(); c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker',bypass=True)
c.call('Emulation.setDeviceMetricsOverride',width=1100,height=1000,deviceScaleFactor=1,mobile=False)
c.call('Page.navigate',url=os.environ.get('READER_TEST_URL','http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert")
c.js("localStorage.clear(); closeFullMenu(); showUpdateBanner=()=>{}; 1")
c.js("window.__reading=validatePracticeReading("+json.dumps(VERBS_FR)+"); const session=createPracticeSession({sourceLanguage:'fr',targetLanguage:'uk',mode:'verbs'}); session.status='ready'; session.reading=__reading; currentPracticeSession=session; displayPracticeSession(session); window.__lookups=[]; window.__focus=[]; handleWordOrSelection=(text)=>__lookups.push(text); focusGrammarItem=(item)=>__focus.push(item); state.format='pdf'; 1")
time.sleep(.6)

def box(word,row=0):
 return c.js("""(word=>{const root=document.querySelectorAll('.practice-sentence-text')[%d];root.scrollIntoView({block:'center'});const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const i=n.nodeValue.indexOf(word);if(i<0)continue;const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+word.length);const b=r.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2};}})(%s)"""%(row,json.dumps(word)))

def drag(first,last,pointer,last_row=0,first_row=0):
 c.js("dismissReaderPopup(); window.__lookups=[];window.__focus=[];getSelection().removeAllRanges();1")
 a,b=box(first,first_row),box(last,last_row)
 c.call('Input.dispatchMouseEvent',type='mousePressed',**a,button='left',buttons=1,clickCount=1,pointerType=pointer)
 if pointer=='pen':
  assert c.js("!getPracticePanel().dispatchEvent(new Event('touchmove',{bubbles:true,cancelable:true}))"), 'pen touch events must not become native panning'
 for k in range(1,13):
  c.call('Input.dispatchMouseEvent',type='mouseMoved',x=a['x']+(b['x']-a['x'])*k/12,y=a['y']+(b['y']-a['y'])*k/12,button='left',buttons=1,pointerType=pointer)
  time.sleep(.025)
  if k==6:
   time.sleep(.5)
   assert c.js('__lookups.length===0 && __focus.length===0'), 'a drag must not translate/open Grammar before release'
 c.call('Input.dispatchMouseEvent',type='mouseReleased',**b,button='left',buttons=0,clickCount=1,pointerType=pointer)
 time.sleep(.6)
 return c.js('({lookups:__lookups,focus:__focus.length,selection:state.lastSelectionText})')

for pointer in ('mouse','pen'):
 for first,last,expected in [('parlons','français','parlons français'),('français','parlons','parlons français'),('Nous','jours','Nous parlons français tous les jours')]:
  got=drag(first,last,pointer)
  assert got['lookups']==[expected] and got['focus']==0 and got['selection']==expected,(pointer,first,last,got)
  print('PASS',pointer,first,last,flush=True)
got=drag('parlons','professeur','mouse',1)
expected='parlons français tous les jours. Hier, nous avons parlé avec notre professeur'
assert got['lookups']==[expected] and got['focus']==0,got
assert c.js("[...CSS.highlights.get(SEL_HL_NAME)].every(r=>!/[🔊🌐]/u.test(r.toString()))")
print('PASS selection across sentences excludes action icons')
story_row=c.js("[...document.querySelectorAll('.practice-sentence-text')].indexOf(document.querySelector('.practice-paragraph .practice-sentence-text'))")
got=drag('Marie','longtemps','pen',story_row,story_row)
assert got['lookups']==['Marie a parlé longtemps'] and got['focus']==0,got
print('PASS generated story paragraphs support selection too')
# A click still opens the exact target, with no translation; keyboard activation remains native.
a=box('parlons'); c.js('window.__lookups=[];window.__focus=[];getSelection().removeAllRanges();1')
for kind in ('mousePressed','mouseReleased'):
 c.call('Input.dispatchMouseEvent',type=kind,**a,button='left',clickCount=1)
time.sleep(.2)
assert c.js("__focus.length===1 && __focus[0].surface==='parlons' && __lookups.length===0")
print('PASS target click still opens exact Grammar occurrence')

# Native handle selection on a target must translate too, without consuming the handles.
c.js("window.__lookups=[];window.__focus=[];const nativeRange=document.createRange();nativeRange.selectNodeContents(document.querySelector('.practice-target'));getSelection().removeAllRanges();getSelection().addRange(nativeRange);1")
time.sleep(.7)
assert c.js("__lookups.length===1 && __lookups[0]==='parlons' && __focus.length===0 && getSelection().toString()==='parlons'")
print('PASS native selection of a target translates and retains selection handles')
