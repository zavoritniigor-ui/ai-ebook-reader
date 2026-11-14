"""Isolated guided-demo review page: actual reader actions, controlled providers.
The Practice panel is explicitly created/opened to exercise leaving it for ink;
this does not claim a live AI-generated exercise or physical device validation.
"""
import os,time,json,urllib.request,base64
from pathlib import Path
from browser_cdp import CDP
class BrowserCDP(CDP):
    def call(self, method, **params):
        if method == 'Inspector.enable':
            return {}  # Page-only domain; this connection owns browser contexts.
        return super().call(method, **params)

endpoint='http://127.0.0.1:'+os.environ.get('READER_CDP_PORT','9222')
control=BrowserCDP.__new__(BrowserCDP)
control._connect(json.load(urllib.request.urlopen(endpoint+'/json/version'))['webSocketDebuggerUrl'])
context=control.call('Target.createBrowserContext')['browserContextId']
target=control.call('Target.createTarget',url='about:blank',browserContextId=context)['targetId']
try:
    tabs=json.load(urllib.request.urlopen(endpoint+'/json'))
    c=CDP(next(t['webSocketDebuggerUrl'] for t in tabs if t['id']==target))
    c.call('Page.enable');c.call('Runtime.enable')
    c.call('Page.addScriptToEvaluateOnNewDocument',source="window.__previewErrors=[];addEventListener('error',e=>__previewErrors.push(e.message));addEventListener('DOMContentLoaded',()=>{if(typeof handleWordOrSelection==='function'){aiAvailable=()=>false;aiCanAnswer=()=>false;translateLocally=async()=>null;machineTranslate=async()=>({plain:'переклад',html:'переклад',extras:''});appendDictionaries=()=>{};speakText=()=>{};speakInLang=()=>{};}});")
    c.call('Emulation.setDeviceMetricsOverride',width=820,height=1180,deviceScaleFactor=1,mobile=True)
    url=os.environ.get('READER_TEST_URL','http://127.0.0.1:8765/index.html').rsplit('/',1)[0]+'/preview-demo.html'
    c.call('Page.navigate',url=url)
    c.wait("!!window.readerPreview&&!document.getElementById('p-next').disabled",timeout=40)
    assert c.js("document.body.classList.contains('preview-demo')&&document.querySelector('.workspace').getBoundingClientRect().top>=document.getElementById('preview-controls').getBoundingClientRect().bottom-1")
    print('PASS isolated preview loads real reader without covering its workspace',flush=True)
    c.js("document.getElementById('p-next').click();true")
    c.wait("document.getElementById('p-phase').textContent.includes('Спробуйте самі')&&!document.getElementById('p-next').disabled",timeout=45)
    assert c.js("document.getElementById('word-tooltip').style.display==='flex'")
    assert c.js("['p-title','p-copy','p-next'].every(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return hit===e||e.contains(hit);})"),'explanation and controls must not be covered by inherited reader styles'
    print('PASS automatic word show leaves a genuine translation popup for free exploration',flush=True)
    if os.environ.get('READER_PREVIEW_SCREENSHOT'):
        Path(os.environ['READER_PREVIEW_SCREENSHOT']).write_bytes(base64.b64decode(c.call('Page.captureScreenshot',format='png')['data']))
    c.js("document.getElementById('p-next').click();true")
    c.wait("document.getElementById('p-phase').textContent.includes('2 із')&&!document.getElementById('p-next').disabled",timeout=15)
    print('PASS explicit next advances to sentence chapter',flush=True)
    for step in range(3,11):
     if step==7:c.js("getPracticePanel().hidden=false;true")
     c.js("document.getElementById('p-next').click();true")
     c.wait("document.getElementById('phase').textContent.includes('PLACEHOLDER')".replace("getElementById('phase')","getElementById('p-phase')").replace('PLACEHOLDER',str(step)+' із')+"&&!document.getElementById('p-next').disabled",timeout=35)
     if step==7:assert c.js("state.inkMode&&document.getElementById('practice-panel').hidden")
     if step==8:
      assert c.js("!document.getElementById('audio-player').hidden&&bookAudio.tracks.length>0")
      print('PASS imported audio uses the real visible book player',flush=True)
     if step==9:assert c.js("document.getElementById('audio-player').hidden"),'the player closes before the menu chapter'
     print('PASS chapter',step,flush=True)
    c.js("document.getElementById('p-exit').click();true")
    c.wait("document.getElementById('p-phase').textContent==='Огляд завершено'")
    c.js("document.getElementById('p-next').click();document.getElementById('p-exit').click();true")
    c.js('new Promise(r=>setTimeout(r,1800))')
    assert c.js("document.getElementById('p-phase').textContent==='Огляд завершено'")
    print('PASS exit cancels a pending start without reopening the review',flush=True)
    c.call('Emulation.setDeviceMetricsOverride',width=390,height=844,deviceScaleFactor=1,mobile=True)
    assert c.js("[...document.querySelectorAll('#preview-controls button:not([hidden])')].every(el=>{const b=el.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.bottom<=innerHeight;})")
    assert c.js('__previewErrors.length===0')
    print('PASS phone controls fit and no host errors',flush=True)
finally:
    control.call('Target.disposeBrowserContext',browserContextId=context)
    control.sock.close()
