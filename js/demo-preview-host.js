(() => {
'use strict';
for(const type of ['pointerdown','click'])document.getElementById('preview-controls').addEventListener(type,e=>e.stopPropagation());
const next=document.getElementById('p-next'),again=document.getElementById('p-again'),exit=document.getElementById('p-exit');
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==window||e.data?.type!=='reader-preview')return;const d=e.data;for(const name of ['phase','title','copy','status'])if(typeof d[name]==='string')document.getElementById('p-'+name).textContent=d[name];next.disabled=!!d.busy;next.textContent=d.next||'Далі';again.hidden=!d.started||!!d.busy;exit.hidden=!d.started;next.hidden=!!d.done;});
for(const [button,action]of [[next,'next'],[again,'again'],[exit,'exit']])button.addEventListener('click',()=>{window.readerPreview?.[action]();});
})();
