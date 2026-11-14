"""Run the bundled PDF tour through real controls; isolate external providers only."""
import os
from browser_cdp import CDP

c = CDP()
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=800, height=1280, deviceScaleFactor=1, mobile=False)
c.call('Page.addScriptToEvaluateOnNewDocument', source="window.__demoErrors=[];addEventListener('error',e=>__demoErrors.push(e.message));")
c.call('Page.navigate', url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete'&&!document.body.inert&&typeof openDemoTextbook==='function'", timeout=30)
c.js("""
aiAvailable=()=>false; aiCanAnswer=()=>false;
translateLocally=async()=>null;
machineTranslate=async()=>({plain:'переклад',html:'переклад',extras:''});
appendDictionaries=()=>{}; speakText=()=>{}; speakInLang=()=>{};
callAI=async()=>JSON.stringify({questions:[{id:'q1',type:'choice',prompt:'Choose:',options:['Bonjour','Salut'],answer:'Bonjour'}]});
window.__demoShelved=0; scheduleShelveBook=()=>__demoShelved++;
window.__demoPractice=0; const realRulePractice=startRulePractice;
startRulePractice=(...args)=>{
    __demoPractice++;
    const p=document.getElementById('practice-panel');
    if(p){p.hidden=false;}
    return realRulePractice(...args);
};
window.__demoSettings={target:state.targetLang,translate:state.translateMode};
// The reader's own PDFs are zoomed in (a stored «free» ×3): the tour must still show its textbook fitted to the width
// (zoomed in, the words it taps lie off screen), and leave the reader's zoom as it was (found 2026-11-14).
state.pdfFit='free'; state.pdfScale=3; localStorage.setItem('reader_pdf_fit','free'); localStorage.setItem('reader_pdf_scale','3');
document.getElementById('btn-demo-textbook').click(); true
""")
c.wait('!demoTour.busy&&state.pdfDoc&&state.demoMode&&!demoTour.root.hidden', timeout=35)
# What closed the word popup, if a step finds it closed (a CI-only failure of the notes step, 2026-11-14): every path
# that hides it is recorded with the time and the caller, and the failure message shows the last ones.
c.js("""
window.__hides = [];
const __note = (what) => __hides.push([Math.round(performance.now()), what, els.tooltip.style.display, (new Error().stack || '').split('\\n').slice(2, 5).map(l => l.trim()).join(' < ')]);
for (const name of ['invalidateSelection', 'dismissReaderPopup', 'scheduleTooltipHide']) {
    const real = window[name];
    window[name] = function (...args) { __note(name); return real.apply(this, args); };
}
document.addEventListener('pointerdown', e => __note('pointerdown on ' + (e.target.id || e.target.className || e.target.localName)), true);
els.container.addEventListener('scroll', () => __note('scroll'), { passive: true });
true
""")


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result, c.js('[demoTour.step, demoTour.status?.textContent, els.tooltip?.style.display, els.ttOriginal?.textContent, els.ttTranslation?.textContent, __demoErrors, Math.round(performance.now()), (window.__hides || []).slice(-12)]'))
    print('PASS', name, flush=True)


def next_step(step):
    p = c.js("(()=>{const r=demoTour.next.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()")
    for kind in ('mousePressed', 'mouseReleased'):
        c.call('Input.dispatchMouseEvent', type=kind, x=p['x'], y=p['y'], button='left', clickCount=1)
    c.wait('!demoTour.busy', timeout=35)
    check('tour step ' + str(step), f'demoTour.step==={step}&&!demoTour.root.hidden')
    check('no tour application errors', '__demoErrors.length===0')


check('real PDF stays out of My Books', 'state.pdfDoc.numPages>3&&__demoShelved===0')
check('the tour shows its textbook fitted to the width, whatever zoom the reader uses', "state.pdfFit==='width'&&state.pdfScale===1&&localStorage.getItem('reader_pdf_scale')==='3'")
for step in range(1, 15):
    next_step(step)
    if step == 1:
        check('word result remains open', "els.tooltip.style.display==='flex'&&els.ttOriginal.textContent==='salle'&&els.ttTranslation.textContent.includes('переклад')")
        check('tour card leaves the word result visible', "(()=>{const r=els.tooltip.getBoundingClientRect();return !!document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('#word-tooltip');})()")
    elif step == 2:
        check('whole sentence uses normal reader expansion', "els.tooltip.style.display==='flex'&&els.ttOriginal.textContent==='C’est une salle de classe.'")
    elif step == 3:
        check('Grammar panel is visible', "els.grammarPanel.classList.contains('expanded')")
    elif step == 4:
        check('Ask panel is visible', "els.askPanel.classList.contains('expanded')")
    elif step == 5:
        check('Rules catalogue is visible', "document.getElementById('rules-panel').classList.contains('expanded')")
        c.js('aiAvailable=()=>true;aiCanAnswer=()=>true;true')
    elif step == 6:
        check('Practice invokes and opens practice panel', "__demoPractice===1&&!document.getElementById('practice-panel').hidden")
    elif step == 7:
        check('Practice closed before Audio', "document.getElementById('practice-panel').hidden")
        check('Book audio track imported and player visible', "bookAudio.tracks.some(tr=>tr.track===1)&&!document.getElementById('audio-player').hidden")
        c.js("document.getElementById('ap-rate').click();true")
        check('Audio player rate control works', "document.getElementById('ap-rate').textContent.includes('×')")
        # User changes page during Try it yourself before next step
        c.js("demoSetPage(1);true")
    elif step == 8:
        check('Ink restores target page, closes Practice/Audio, and shows visible canvas', "state.inkMode&&document.getElementById('practice-panel').hidden&&document.getElementById('audio-player').hidden&&inkStrokes(activeInkPage()).length===1&&activeInkCanvas().getBoundingClientRect().top>-1")   # a scroll to the page can stop a fraction of a pixel short
        c.js("document.getElementById('ink-undo').click();true")
        check('demo stroke supports normal Undo', 'inkStrokes(activeInkPage()).length===0')
        c.js("document.getElementById('ink-redo').click();true")
        check('demo stroke supports normal Redo', 'inkStrokes(activeInkPage()).length===1')
        # Replay step should not duplicate strokes
        c.js("demoTour.replay.click();true")
        c.wait('!demoTour.busy', timeout=20)
        check('replay ink keeps ink active and replaces the tour stroke instead of adding a second one', 'state.inkMode&&inkStrokes(activeInkPage()).length===1')
    elif step == 9:
        check('Quick wheel opens', "!!document.getElementById('quick-menu-dock')")
    elif step == 10:
        check('Sidebar opens', "!document.getElementById('sidebar').classList.contains('collapsed')")
    elif step == 11:
        check('Scanner opens with sample page', "document.getElementById('scanner').classList.contains('open')&&scanState.pages.length>=1")
    elif step == 12:
        check('Fragment step closes scanner and highlights region button', "!document.getElementById('scanner').classList.contains('open')&&demoTour.target===document.getElementById('btn-region')")
    elif step == 13:
        check('Print step highlights print button', "demoTour.target===document.getElementById('btn-print-page')")
    elif step == 14:
        check('Text notes step shows tooltip', "els.tooltip.style.display==='flex'")

# Phone viewport check
c.call('Emulation.setDeviceMetricsOverride', width=390, height=844, deviceScaleFactor=2, mobile=True)
c.js("demoPlaceCard();true")
check('tour card fits inside phone viewport', "(()=>{const r=document.querySelector('#demo-tour .demo-tour-box').getBoundingClientRect();return r.left>=0&&r.right<=390&&r.top>=0&&r.bottom<=844;})()")
c.call('Emulation.setDeviceMetricsOverride', width=800, height=1280, deviceScaleFactor=1, mobile=False)

c.js('demoTour.next.click();true')
c.wait('!demoTour.busy', timeout=10)
check('tour completes', 'demoTour.next.hidden')
c.js('demoTour.exit.click();true')
check('exit restores settings and closes demo tools', "demoTour.root.hidden&&!state.demoMode&&!state.inkMode&&state.targetLang===__demoSettings.target&&state.translateMode===__demoSettings.translate&&!els.grammarPanel.classList.contains('expanded')&&!els.askPanel.classList.contains('expanded')&&document.getElementById('practice-panel').hidden&&document.getElementById('audio-player').hidden")
c.js("persistCriticalState();true")   # what the app stores when it is hidden or closed
check("exit gives the reader's zoom back, and the tour never stored its own", "state.pdfFit==='free'&&state.pdfScale===3&&localStorage.getItem('reader_pdf_fit')==='free'&&localStorage.getItem('reader_pdf_scale')==='3'")

# Exit while step 1 is running
c.js('openDemoTextbook();true')
c.wait('!demoTour.busy&&!demoTour.root.hidden', timeout=35)
c.js('demoTour.next.click();demoTour.exit.click();true')
c.js('new Promise(resolve=>setTimeout(resolve,1200))')
check('exit cancels pending tour continuation', 'demoTour.root.hidden&&!demoTour.busy&&!state.demoMode&&demoTour.step===0&&state.translateMode===__demoSettings.translate&&__demoErrors.length===0')

# Keep PDF import pending at completion boundary, then exit
c.js("""window.__releaseDemoImport=null;const realDemoInitPdf=initPdf;
initPdf=async(...args)=>{await realDemoInitPdf(...args);await new Promise(resolve=>__releaseDemoImport=resolve);};
openDemoTextbook();true""")
c.wait("typeof __releaseDemoImport==='function'", timeout=35)
c.js('demoTour.exit.click();__releaseDemoImport();true')
c.wait('!state.bookOpening', timeout=15)
check('exiting during PDF import never shelves the demo', 'demoTour.root.hidden&&__demoShelved===0')
c.js("initPdf=realDemoInitPdf;openBookFile(new File(['Ordinary reader book.'],'normal.txt'));true")
c.wait('!state.bookOpening', timeout=15)
check('ordinary book imports still reach My Books', '__demoShelved===1&&!state.demoMode')
c.js('openDemoTextbook();true')
c.wait('!demoTour.busy&&!demoTour.root.hidden', timeout=35)
next_step(1)
c.js("openBookFile(new File(['A different ordinary book.'],'another.txt'));true")
c.wait('!state.bookOpening', timeout=15)
check('opening another book ends the tour before it can act on that book', 'demoTour.root.hidden&&!state.demoMode&&__demoShelved===2&&__demoErrors.length===0')
print('ALL DEMO TEXTBOOK CHECKS PASSED', flush=True)
