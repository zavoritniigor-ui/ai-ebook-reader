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
window.__demoShelved=0; scheduleShelveBook=()=>__demoShelved++;
window.__demoPractice=0; const realRulePractice=startRulePractice;
startRulePractice=(...args)=>{__demoPractice++;return realRulePractice(...args);};
window.__demoSettings={target:state.targetLang,translate:state.translateMode};
document.getElementById('btn-demo-textbook').click(); true
""")
c.wait('!demoTour.busy&&state.pdfDoc&&state.demoMode&&!demoTour.root.hidden', timeout=35)


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result, c.js('__demoErrors'))
    print('PASS', name, flush=True)


def next_step(step):
    # Physical control events also prove that the tour's pointerdown does not
    # dismiss the word popup before its sentence/Grammar/Ask actions can use it.
    p = c.js("(()=>{const r=demoTour.next.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()")
    for kind in ('mousePressed', 'mouseReleased'):
        c.call('Input.dispatchMouseEvent', type=kind, x=p['x'], y=p['y'], button='left', clickCount=1)
    c.wait('!demoTour.busy', timeout=35)
    check('tour step ' + str(step), f'demoTour.step==={step}&&!demoTour.root.hidden')
    check('no tour application errors', '__demoErrors.length===0')


check('real PDF stays out of My Books', 'state.pdfDoc.numPages>3&&__demoShelved===0')
for step in range(1, 14):
    next_step(step)
    if step == 1:
        check('autoplay is active with Pause button visible', 'demoTour.autoplay&&!demoTour.pause.hidden')
    elif step == 3:
        check('text target belongs to the real reader', 'demoTour.target.isConnected&&els.pages.contains(demoTour.target)')
    elif step == 4:
        check('word result remains open', "els.tooltip.style.display==='flex'&&els.ttOriginal.textContent==='salle'&&els.ttTranslation.textContent.includes('переклад')")
        check('tour card leaves the word result visible', "(()=>{const r=els.tooltip.getBoundingClientRect();return !!document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('#word-tooltip');})()")
    elif step == 5:
        check('whole sentence uses normal reader expansion', "els.tooltip.style.display==='flex'&&els.ttOriginal.textContent==='C’est une salle de classe.'")
    elif step == 6:
        check('Grammar panel is visible', "els.grammarPanel.classList.contains('expanded')")
    elif step == 7:
        check('Ask panel is visible', "els.askPanel.classList.contains('expanded')")
    elif step == 8:
        check('Rules catalogue is visible', "document.getElementById('rules-panel').classList.contains('expanded')")
    elif step == 9:
        check('Practice invokes the normal no-key path', '__demoPractice===1')
    elif step == 10:
        check('ink is on a visible page with one undoable stroke', "state.inkMode&&inkStrokes(activeInkPage()).length===1&&activeInkCanvas().getBoundingClientRect().top>=0")
        c.js("document.getElementById('ink-undo').click();true")
        check('demo stroke supports normal Undo', 'inkStrokes(activeInkPage()).length===0')
        c.js("document.getElementById('ink-redo').click();true")
        check('demo stroke supports normal Redo', 'inkStrokes(activeInkPage()).length===1')
    elif step == 11:
        c.wait('demoTour.player.readyState>=2', timeout=15)
        check('bundled dialogue audio is playable', 'Number.isFinite(demoTour.player.duration)&&demoTour.player.duration>0')
        c.js('stopBackgroundActivity();true')
        check('PWA background/exit switch pauses demo audio', 'demoTour.player.paused')
    elif step == 12:
        check('bottom reading bar is highlighted', "!!demoTour.target&&demoTour.target.classList.contains('demo-tour-target')")
    elif step == 13:
        check('sidebar is opened and highlighted', "!document.getElementById('sidebar').classList.contains('collapsed')")

c.js('demoTour.next.click();true')
c.wait('!demoTour.busy', timeout=10)
check('tour completes', 'demoTour.next.hidden')
c.js('demoTour.exit.click();true')
check('exit restores settings and closes demo tools', "demoTour.root.hidden&&!state.demoMode&&!state.inkMode&&state.targetLang===__demoSettings.target&&state.translateMode===__demoSettings.translate&&!els.grammarPanel.classList.contains('expanded')&&!els.askPanel.classList.contains('expanded')")

# Exit while the cover-to-text transition is awaiting animation. Its old
# continuation must not reopen the tour or re-enable translate mode.
c.js('openDemoTextbook();true')
c.wait('!demoTour.busy&&!demoTour.root.hidden', timeout=35)
next_step(1)
c.js('demoTour.next.click();demoTour.exit.click();true')
c.js('new Promise(resolve=>setTimeout(resolve,2300))')
check('exit cancels pending tour continuation', 'demoTour.root.hidden&&!demoTour.busy&&!state.demoMode&&demoTour.step===0&&state.translateMode===__demoSettings.translate&&__demoErrors.length===0')

# Keep the actual PDF import pending at its completion boundary, then exit.
# The file's demo identity must survive the restored UI settings.
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
