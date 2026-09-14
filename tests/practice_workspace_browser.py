"""Practice workspace geometry and mounted-session transitions."""
import os
from browser_cdp import CDP

c = CDP()
c.call('Page.enable')
c.call('Runtime.enable')
c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1600, height=1000, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState === 'complete' && !document.body.inert")

def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name)

def settle():
    c.js("""(async () => {
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await Promise.all(document.getAnimations().filter(a =>
            a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})));
        await new Promise(resolve => requestAnimationFrame(resolve));
    })()""")

c.js('''
showUpdateBanner=()=>{};
document.getElementById('sw-update-banner')?.remove();
document.querySelector('nav').classList.add('collapsed');
initTxt('Original book text. '.repeat(500));
window.workspaceRequests = 0;
callAI = async () => { workspaceRequests++; throw new Error('Unexpected generation'); };
currentPracticeSession = createPracticeSession({sourceLanguage:'en', targetLanguage:'uk'});
currentPracticeSession.status = 'ready';
currentPracticeSession.worksheet = {metadata:{title:'Workspace exercises'}, exercises:
    Array.from({length:20}, (_, i) => ({id:'workspace-'+i, type:'fill_form', difficulty:1,
        instruction:'Complete the sentence', prompt:'A long exercise sentence. '.repeat(12),
        expectedConcept:'past tense', hints:['First hint', 'Second hint']}))};
window.workspaceSession = currentPracticeSession;
window.grammarNode = document.createElement('button');
grammarNode.textContent = 'Reference rule';
grammarNode.onclick = () => { window.grammarUsed = true; };
document.getElementById('grammar-content').appendChild(grammarNode);
document.getElementById('grammar-panel').classList.add('expanded');
displayPracticeSession(currentPracticeSession);
window.workspacePanel = document.getElementById('practice-panel');
window.boundsOK = () => {
    const r = workspacePanel.getBoundingClientRect();
    return r.left >= 0 && r.top >= 0 && r.right <= innerWidth+1 && r.bottom <= innerHeight+1;
};
window.noOverflow = () => document.documentElement.scrollWidth <= innerWidth &&
    document.documentElement.scrollHeight <= innerHeight;
''')
settle()
check('Expanded fills central workspace beside Grammar', '''(() => {
const p=workspacePanel.getBoundingClientRect(), g=document.getElementById('grammar-panel').getBoundingClientRect();
return p.left === 0 && Math.abs(p.right-g.left)<2 && p.width > 600;
})()''')
check('Grammar remains usable', '''(() => {
const r=grammarNode.getBoundingClientRect();
const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
hit.click(); return grammarUsed === true && grammarNode.isConnected;
})()''')
check('Inside viewport with internal scrolling', "boundsOK() && workspacePanel.querySelector('.practice-scroll').scrollHeight > workspacePanel.querySelector('.practice-scroll').clientHeight")
c.js("document.getElementById('ask-panel').classList.add('expanded')")
settle()
check('Reserves Ask AI and Grammar widths', '''(() => {
const p=workspacePanel.getBoundingClientRect(), a=document.getElementById('ask-panel').getBoundingClientRect(), g=document.getElementById('grammar-panel').getBoundingClientRect();
return p.left>=a.right-1 && p.right<=g.left+1 && boundsOK();
})()''')
c.js("document.getElementById('ask-panel').classList.remove('expanded'); document.getElementById('practice-next-page').click(); workspacePanel.querySelector('.hint-reveal-btn').click(); window.mountedScroll=workspacePanel.querySelector('.practice-scroll'); mountedScroll.scrollTop=180; window.savedScroll=mountedScroll.scrollTop; document.getElementById('practice-collapse').click()")
settle()
check('Bottom collapse keeps mounted content and reveals book', "workspacePanel.inert && mountedScroll.isConnected && getComputedStyle(workspacePanel).visibility==='hidden' && document.elementFromPoint(300,400).closest('#main-area') !== null")
check('Bottom bar is visible and inside viewport', "!document.getElementById('practice-restore').hidden && document.getElementById('practice-restore').getBoundingClientRect().bottom<=innerHeight && practiceWorkspaceMode==='collapsed-bottom'")
c.js("document.getElementById('practice-restore').click()")
settle()
check('Restore preserves session, page, hints, DOM and scroll', "getCurrentPracticeSession()===workspaceSession && workspaceSession.currentPage===1 && workspaceSession.revealedHints['workspace-12']===1 && mountedScroll===workspacePanel.querySelector('.practice-scroll') && mountedScroll.scrollTop===savedScroll && !workspacePanel.inert")
c.js("document.getElementById('practice-bookmark').click()")
settle()
check('Bookmark attached outside Grammar left edge', "(() => {const tab=document.getElementById('practice-restore').getBoundingClientRect(), grammar=document.getElementById('grammar-panel').getBoundingClientRect();return Math.abs(tab.right-grammar.left)<2 && tab.left>=0;})()")
check('Bookmark leaves only vertical tab', "practiceWorkspaceMode==='bookmark' && getComputedStyle(workspacePanel).visibility==='hidden' && !document.getElementById('practice-restore').hidden && document.getElementById('practice-restore').getBoundingClientRect().width===44")
c.js("document.getElementById('practice-restore').click()")
settle()
check('Bookmark restore preserves session without requests', "getCurrentPracticeSession()===workspaceSession && workspaceSession.currentPage===1 && workspaceRequests===0 && mountedScroll.scrollTop===savedScroll")
check('No body overflow on desktop', 'noOverflow()')
# Finishing asynchronous rendering must not expand a collapsed workspace.
c.js("setPracticeWorkspaceMode('collapsed-bottom'); workspaceSession.status='generating'; displayPracticeSession(workspaceSession); workspaceSession.status='error'; workspaceSession.lastError={message:'Network unavailable'}; displayPracticeSession(workspaceSession)")
check('Async error stays collapsed with controls mounted', "practiceWorkspaceMode==='collapsed-bottom' && workspacePanel.inert && workspacePanel.textContent.includes('Network unavailable') && !!document.getElementById('practice-collapse')")
c.js("setPracticeWorkspaceMode('bookmark'); workspaceSession.status='ready'; displayPracticeSession(workspaceSession)")
check('Async ready stays bookmarked', "practiceWorkspaceMode==='bookmark' && workspacePanel.inert && getCurrentPracticeSession()===workspaceSession")
for width, height in [(900,700),(390,844),(667,375),(320,568)]:
    c.call('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=1, mobile=False)
    c.js("document.getElementById('grammar-panel').classList.add('expanded'); setPracticeWorkspaceMode('expanded')")
    settle()
    check(f'{width}x{height} expanded bounds and overflow', 'boundsOK() && noOverflow() && !workspacePanel.inert')
    c.js("document.getElementById('practice-collapse').click()")
    settle()
    check(f'{width}x{height} bottom collapse', "getComputedStyle(workspacePanel).visibility==='hidden' && !document.getElementById('practice-restore').hidden && noOverflow()")
    c.js("document.getElementById('practice-restore').click(); document.getElementById('practice-bookmark').click()")
    settle()
    check(f'{width}x{height} bookmark', "document.getElementById('practice-restore').getBoundingClientRect().right<=innerWidth && noOverflow() && getCurrentPracticeSession()===workspaceSession")
c.js("setPracticeWorkspaceMode('expanded'); document.getElementById('grammar-tab').click()")
settle()
check('Narrow Grammar tab opens the retained drawer', "practiceWorkspaceMode==='collapsed-bottom' && document.getElementById('grammar-panel').classList.contains('expanded') && grammarNode.isConnected")
c.js("setPracticeWorkspaceMode('bookmark'); document.getElementById('grammar-panel').classList.add('expanded')")
settle()
check('Phone bookmark stays outside Grammar content', "(() => {const tab=document.getElementById('practice-restore').getBoundingClientRect(), grammar=document.getElementById('grammar-panel').getBoundingClientRect();return tab.left>=0 && Math.abs(tab.right-grammar.left)<2 && grammar.right<=innerWidth && noOverflow();})()")
r = c.js("document.getElementById('practice-restore').getBoundingClientRect().toJSON()")
c.touch_tap(r['x'] + r['width']/2, r['y'] + r['height']/2)
settle()
check('Touch on outside bookmark restores the retained session', "practiceWorkspaceMode==='expanded' && getCurrentPracticeSession()===workspaceSession")
c.call('Emulation.setEmulatedMedia', features=[{'name':'prefers-reduced-motion','value':'reduce'}])
check('Reduced motion respected', "getComputedStyle(workspacePanel).transitionDuration==='0s'")
c.js('closePractice()')
check('Explicit close removes restore tab', "workspacePanel.hidden && document.getElementById('practice-restore').hidden")
print('Practice workspace tests passed')
