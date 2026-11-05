"""A cropped PNG goes directly to Google image search on an explicit click.

The multipart navigation is intercepted; no image leaves the test browser.
The endpoint/field are the file-upload form used by Chromium's Lens search.
Check real PNG bytes, synchronous user activation, source preview retention,
no Gemini/clipboard/AI detour, limits and an OS-share/manual-save fallback.
"""
import base64, json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
PNG = ('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR4nGP8//8/AzJgYkAD'
       'IxcAAP//AwAD/wH/PQAAAABJRU5ErkJggg==')
c=CDP(); c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled',cacheDisabled=True); c.call('Network.setBypassServiceWorker',bypass=True)
c.call('Emulation.setDeviceMetricsOverride',width=1280,height=900,deviceScaleFactor=1,mobile=False)
c.call('Page.addScriptToEvaluateOnNewDocument',source=r'''
window.__uploads=[];window.__shared=[];window.__opened=[];window.__copies=[];window.__cropErrors=[];
window.__noTransfer=false;window.__submitFails=false;window.__canShare=true;window.__shareError='';window.__forceHidden=false;
addEventListener('error',e=>__cropErrors.push(e.message));
Object.defineProperty(document,'hidden',{configurable:true,get:()=>__forceHidden});
const NativeTransfer=window.DataTransfer;
window.DataTransfer=function(){if(__noTransfer)throw new Error('File assignment unsupported');return new NativeTransfer();};
HTMLFormElement.prototype.submit=function(){
 if(__submitFails)throw new Error('Submission failed');
 const file=this.querySelector('input[type=file]');window.__lastUploadFile=file?.files[0];
 __uploads.push({action:this.action,method:this.method,enctype:this.enctype,target:this.target,rel:this.rel,
                field:file?.name,filename:__lastUploadFile?.name,type:__lastUploadFile?.type,size:__lastUploadFile?.size,
                active:navigator.userActivation.isActive,connected:this.isConnected});
};
window.open=(...args)=>{__opened.push(args);return {};};
Object.defineProperty(navigator,'clipboard',{configurable:true,value:{write:async items=>__copies.push(items.length)}});
Object.defineProperty(navigator,'canShare',{configurable:true,value:data=>__canShare&&!!data.files?.length});
Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{
 if(__shareError)throw Object.assign(new Error('test'),{name:__shareError});
 __shared.push({files:data.files.map(f=>({name:f.name,type:f.type,size:f.size})),active:navigator.userActivation.isActive});
}});
''')
c.call('Page.navigate',url=URL)
c.wait("document.readyState==='complete'&&!document.body.inert&&document.getElementById('crop-google')&&typeof GOOGLE_IMAGE_SEARCH_URL==='string'",timeout=35)
c.js("state.apiKey='';state.openaiKey='';state.groqKey='';state.currentIndex=7;window.__visionCalls=0;callAIVision=()=>{__visionCalls++;throw new Error('AI not allowed');};true")

def check(name, expression):
    got=c.js(expression)
    assert got is True,(name,got,c.js('({uploads:__uploads,shared:__shared,errors:__cropErrors,status:document.getElementById("crop-status").textContent})'))
    print('PASS',name,flush=True)


def reset():
    c.js("closeCropPreview();__uploads.length=0;__shared.length=0;__opened.length=0;__copies.length=0;__noTransfer=false;__submitFails=false;__canShare=true;__shareError='';__forceHidden=false;openCropPreview('data:image/png;base64,"+PNG+"');true")
    c.wait("document.getElementById('crop-preview').complete&&document.getElementById('crop-preview').naturalWidth===2",timeout=5)


def press():
    point=c.js('(()=>{const r=document.getElementById("crop-google").getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()')
    for kind in ['mousePressed','mouseReleased']:
        c.call('Input.dispatchMouseEvent',type=kind,x=point['x'],y=point['y'],button='left',clickCount=1)
    c.js('new Promise(r=>setTimeout(r,120))')


check('Google search replaces the Gemini action in the crop dialog', "document.getElementById('crop-google').textContent.trim()===t('cropGoogleSearch')&&!document.getElementById('crop-gemini')")
check('AI provider settings remain available independently', "!!document.getElementById('gemini-key-label')")
reset()
check('opening a crop does not send or share it automatically','__uploads.length===0&&__shared.length===0&&__opened.length===0&&__visionCalls===0')
press()
check('one multipart file navigation opens Google Lens', "__uploads.length===1&&__uploads[0].action==='https://lens.google.com/v3/upload?ep=cntpubb&re=df&s=4'&&__uploads[0].method==='post'&&__uploads[0].enctype==='multipart/form-data'")
check('the selected crop is sent as a PNG file in encoded_image',"__uploads[0].field==='encoded_image'&&__uploads[0].filename==='pdf-page-7.png'&&__uploads[0].type==='image/png'&&__uploads[0].size>0")
check('PNG bytes are exactly the cropped image',"(async()=>{const bytes=new Uint8Array(await __lastUploadFile.arrayBuffer());return btoa(String.fromCharCode(...bytes))==="+json.dumps(PNG)+";})()")
check('navigation stays in the user click and isolates the new tab',"__uploads[0].active&&__uploads[0].connected&&__uploads[0].target==='_blank'&&/noopener/.test(__uploads[0].rel)&&/noreferrer/.test(__uploads[0].rel)")
check('no clipboard, Gemini window or AI call is needed','__copies.length===0&&__opened.length===0&&__visionCalls===0')
check('preview remains available after requesting search',"cropDialog.open&&document.getElementById('crop-preview').naturalWidth===2&&document.getElementById('crop-status').textContent===t('cropGoogleOpening')")
c.js('new Promise(r=>setTimeout(r,1100))')
check('temporary upload form is cleaned up',"!document.querySelector('form[action^=\"https://lens.google.com/\"]')")

reset();c.js('__noTransfer=true;true');press()
check('unsupported file assignment offers the original PNG through OS share',"__uploads.length===0&&__shared.length===1&&__shared[0].files[0].type==='image/png'&&__shared[0].files[0].name==='pdf-page-7.png'&&__shared[0].active&&document.getElementById('crop-status').textContent===t('cropGoogleShare')")
reset();c.js('__noTransfer=true;__canShare=false;true');press()
check('without sharing, saving/uploading manually is explained and crop retained',"__uploads.length===0&&__shared.length===0&&cropDialog.open&&document.getElementById('crop-preview').naturalWidth===2&&document.getElementById('crop-status').textContent===t('cropGoogleUnsupported')")
reset();c.js('__submitFails=true;true');press()
check('a failed form submission cleans up and offers native share',"__uploads.length===0&&__shared.length===1&&!document.querySelector('form[action^=\"https://lens.google.com/\"]')")
reset();c.js('__noTransfer=true;__shareError="AbortError";true');press()
check('cancelling OS sharing leaves the crop available without an error',"__uploads.length===0&&cropDialog.open&&document.getElementById('crop-status').textContent===t('cropGoogleShare')")
reset();c.js('__noTransfer=true;__shareError="NotAllowedError";true');press()
check('a denied share shows the save/upload fallback',"document.getElementById('crop-status').textContent===t('cropGoogleUnsupported')")
reset();c.js('cropBlob=new Blob([new Uint8Array(GOOGLE_IMAGE_MAX_BYTES+1)],{type:"image/png"});true');press()
check('crops above the service limit are not uploaded or shared',"__uploads.length===0&&__shared.length===0&&document.getElementById('crop-status').textContent===t('cropGoogleTooLarge')")
reset();c.js('__forceHidden=true;true');press()
check('background document cannot initiate an image upload','__uploads.length===0&&__shared.length===0')
c.js('__forceHidden=false;closeCropPreview();__uploads.length=0;document.getElementById("crop-google").click();true')
check('a closed preview cannot reuse an old crop','__uploads.length===0&&__shared.length===0')
check('new text is available in all nine menu languages',"(()=>{const keys=['cropGoogleSearch','cropGoogleOpening','cropGoogleShare','cropGoogleUnsupported','cropGoogleTooLarge'];return keys.every(k=>['uk','en','fr','ru','zh','ko','hi','ga','es'].every(l=>typeof I18N[k]?.[l]==='string'&&I18N[k][l]!==k));})()")
check('nothing threw','__cropErrors.length===0')
print('ALL GOOGLE IMAGE SEARCH CROP CHECKS PASSED',flush=True)
