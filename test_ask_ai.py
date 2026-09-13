import json
from tests.browser_cdp import CDP
c = CDP()
c.call('Page.enable')
c.call('Page.navigate', url='http://127.0.0.1:8765/index.html')
c.wait("document.readyState==='complete'")
setup = c.js('''(()=>{
    state.translateMode=true; state.format='txt';
    els.pages.classList.add('no-anim'); els.pages.style.transform='none';
    document.body.classList.add('immersive-mode');
    return true;
})()''')
result = c.js('''(async()=>{
    const sentence = "The house is big (La maison est grande).";
    els.pages.replaceChildren(Object.assign(document.createElement('p'),{textContent: sentence}));
    els.pages.firstChild.style.marginTop='180px';
    const r = sentenceRangeAt(150, 200);
    return r ? r.toString() : null;
})()''')
print("sentenceRangeAt returned:", repr(result))
