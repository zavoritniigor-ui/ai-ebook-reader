"""Independent reader interactions and offline imports for all 11 extensions.

Real fixture bytes go through openBookFile for every row. Only external AI/
translation responses and the speech engine are mocked, never parsing/layout.
The five viewport sizes emulate Android geometry, not physical Android hardware.
Standalone is an explicit display-mode branch simulation, not a WebAPK install.
"""
import base64
import io
import json
import os
import zipfile
from browser_cdp import CDP, pdf_bytes


def archive(files):
    out = io.BytesIO()
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for path, content in files.items():
            z.writestr(zipfile.ZipInfo(path, (2020, 1, 1, 0, 0, 0)), content)
    return out.getvalue()


def fixtures():
    sentence = 'Hello world. The reader shows a useful sentence. Another sentence follows.'
    paragraphs = [sentence] + [f'Paragraph {i}. ' + sentence * 3 for i in range(45)]
    html = ''.join('<p>' + p + '</p>' for p in paragraphs)
    fb2 = '<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0"><body><section>' + html + '</section></body></FictionBook>'
    docx = archive({
        '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
        '_rels/.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
        'word/document.xml': '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + ''.join('<w:p><w:r><w:t>' + p + '</w:t></w:r></w:p>' for p in paragraphs) + '</w:body></w:document>',
    })
    epub = archive({
        'mimetype': 'application/epub+zip',
        'META-INF/container.xml': '<container><rootfiles><rootfile full-path="OPS/package.opf"/></rootfiles></container>',
        'OPS/package.opf': '<package><manifest><item id="c" href="chapter.xhtml"/></manifest><spine><itemref idref="c"/></spine></package>',
        'OPS/chapter.xhtml': '<html><body>' + html + '</body></html>',
    })
    return {
        'pdf': pdf_bytes(), 'epub': epub, 'txt': '\n\n'.join(paragraphs).encode(),
        'docx': docx, 'fb2': fb2.encode(), 'fb2.zip': archive({'Книга/book.fb2': fb2}),
        'md': '\n\n'.join(paragraphs).encode(), 'markdown': '\n\n'.join(paragraphs).encode(),
        'html': ('<!DOCTYPE html><html><head><title>Metadata</title></head><body>' + html + '</body></html>').encode(),
        'htm': ('<!DOCTYPE html><html><body>' + html + '</body></html>').encode(),
        'rtf': ('{\\rtf1\\ansi ' + '\\par '.join(paragraphs) + '}').encode(),
    }


BOOTSTRAP = """
window.__auditErrors=[]; window.__auditSpeech=[];
addEventListener('error',e=>__auditErrors.push(e.message));
addEventListener('unhandledrejection',e=>__auditErrors.push(String(e.reason)));
Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
 getVoices:()=>[{voiceURI:'audit-en',name:'Audit English',lang:'en-US',localService:true}],
 speak:u=>__auditSpeech.push({text:u.text,lang:u.lang}),cancel(){},pause(){},resume(){}}});
window.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
"""

VISIBLE = """(()=>{
 const box=els.container.getBoundingClientRect();
 if(box.width<=0||box.height<=0)return false;
 if(state.format==='pdf'){
  const canvas=els.pages.querySelector('.pdf-canvas');
  if(!canvas||!canvas.width||!canvas.height)return false;
  const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  let dark=0;for(let i=0;i<pixels.length;i+=16)if(pixels[i+3]>0&&Math.min(pixels[i],pixels[i+1],pixels[i+2])<220)dark++;
  const r=canvas.getBoundingClientRect();return dark>20&&r.right>box.left&&r.left<box.right&&r.bottom>box.top&&r.top<box.bottom;
 }
 return currentPageVocabulary().words.length>0&&state.pageInChapter<state.totalPagesInChapter;
})()"""


def main():
    c = CDP()
    c.call('Page.enable')
    c.call('Network.enable')
    c.call('Network.setCacheDisabled', cacheDisabled=True)
    c.call('Network.setBypassServiceWorker', bypass=True)
    script = c.call('Page.addScriptToEvaluateOnNewDocument', source=BOOTSTRAP)['identifier']
    url = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
    c.call('Emulation.setDeviceMetricsOverride', width=1366, height=900, deviceScaleFactor=1, mobile=False)
    c.call('Page.navigate', url=url)
    c.wait("document.readyState==='complete' && !document.body.inert && !!window.pdfjsLib")
    c.js('localStorage.clear()')
    data = fixtures()

    def check(name, expr):
        result = c.js(expr)
        assert result is True, (name, result)
        print('PASS', name, flush=True)

    def pause():
        c.js('new Promise(r=>setTimeout(r,650))')

    def upload(ext, suffix='', mime='application/octet-stream'):
        name = "Reader Україна Zażółć (author's long file name) " + suffix + '.' + ext
        encoded = base64.b64encode(data[ext]).decode()
        c.js(f"openBookFile(new File([Uint8Array.from(atob({json.dumps(encoded)}),c=>c.charCodeAt(0))],{json.dumps(name)},{{lastModified:123,type:{json.dumps(mime)}}}))")
        pause()
        expected = 'pdf' if ext == 'pdf' else 'epub' if ext == 'epub' else 'txt'
        check(ext + ' open ' + suffix, f'state.format==={json.dumps(expected)} && !document.body.inert')

    check('picker exactly matches separately exercised extensions',
          'JSON.stringify(els.upload.accept.split(",").sort())===' + json.dumps(json.dumps(sorted('.' + ext for ext in data), separators=(',', ':'))))
    for ext in data:
        upload(ext, 'features')
        check(ext + ' visible settled content', VISIBLE)
        check(ext + ' word sentence paragraph backward selection', """(()=>{
          const root=state.format==='pdf'?els.pages.querySelector('.pdf-text-layer'):els.pages;
          const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
          while((n=walker.nextNode())&&!n.data.includes('Hello world')){}
          if(!n)return 'missing fixture text';
          const start=n.data.indexOf('Hello');const r=document.createRange();r.setStart(n,start+1);r.setEnd(n,start+2);
          const b=r.getBoundingClientRect(),x=b.x+b.width/2,y=b.y+b.height/2;
          state.lastWordNode=null;
          const sentence=sentenceRangeAt(x,y),paragraph=paragraphRangeAt(x,y);
          if(!sentence?.toString().includes('Hello world.')||!paragraph?.toString().includes('Hello world.'))return 'sentence/paragraph';
          const a={node:n,start,end:start+5},z={node:n,start:start+6,end:start+11};
          if(rangeBetweenWords(z,a)?.toString()!=='Hello world')return 'backward';
          window.__auditPoint={x,y};window.__auditSentence=sentence.cloneRange();
          return selectWordAtPoint(x,y)==='Hello';
        })()""")
        check(ext + ' translation, Ask AI and grammar panels', """(async()=>{
          const old=[aiTranslateText,machineTranslate,callAI,aiAvailable,state.groqKey];
          try{
            state.groqKey='audit-placeholder';state.translationCache={};
            aiTranslateText=async()=> 'Переклад перевірено';machineTranslate=async()=>({html:'Переклад перевірено',extras:''});
            aiAvailable=()=>true;callAI=async()=>'<p>Audit response</p><script>window.__auditUnsafe=1</script>';
            const {x,y}=__auditPoint;
            await handleWordOrSelection('Hello',x,y);
            if(!els.ttTranslation.textContent.includes('Переклад перевірено'))return 'translation';
            els.ttAskBtn.click();await new Promise(r=>setTimeout(r,20));
            if(!els.askPanel.classList.contains('ready')||!els.askContent.textContent.includes('Audit response'))return 'Ask';
            els.ttAiBtn.click();await new Promise(r=>setTimeout(r,20));
            if(!els.grammarPanel.classList.contains('ready')||!els.grammarContent.textContent.includes('Audit response'))return 'grammar';
            return !window.__auditUnsafe&&!els.askContent.querySelector('script')&&calculateCurrentPageStats().helped>0;
          }finally{
            [aiTranslateText,machineTranslate,callAI,aiAvailable,state.groqKey]=old;
            els.tooltip.style.display='none';els.askPanel.classList.remove('ready','expanded');els.grammarPanel.classList.remove('ready','expanded');
            stopTooltipSpeech();invalidateSelection();
          }
        })()""")
        check(ext + ' TTS consumes real book text', """(async()=>{
          __auditSpeech=[];startTTS();await new Promise(r=>setTimeout(r,150));
          const ok=__auditSpeech.some(u=>u.text.includes('Hello world'))&&state.ttsQueue.length>0;
          stopGlobalTTS();return ok;
        })()""")
        c.js('window.__auditBefore={index:state.currentIndex,page:state.pageInChapter};goNext()')
        pause()
        check(ext + ' next page changes reading position', 'state.currentIndex!==__auditBefore.index || state.pageInChapter!==__auditBefore.page')
        c.js('goPrev()')
        pause()
        check(ext + ' previous page restores position and statistics', 'state.currentIndex===__auditBefore.index && state.pageInChapter===__auditBefore.page && calculateCurrentPageStats().helped>0')
        c.js('goNext()')
        pause()
        bookmark = c.js('JSON.stringify(loadBookmark())')
        upload(ext, 'features')
        check(ext + ' reopen restores saved position',
              '(()=>{const b=' + bookmark + ';return state.currentIndex===b.currentIndex && (state.format===\'pdf\' || state.pageInChapter===pageForBookTextOffset(b.textOffset))})()')
        check(ext + ' visible after reopen', VISIBLE)

    for label, width, height, dpr, mobile in [
        ('desktop', 1366, 900, 1, False), ('phone portrait', 390, 844, 3, True),
        ('phone landscape', 844, 390, 3, True), ('tablet portrait', 800, 1280, 2, True),
        ('tablet landscape', 1280, 800, 2, True),
    ]:
        c.call('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=dpr, mobile=mobile)
        c.call('Emulation.setTouchEmulationEnabled', enabled=mobile)
        pause()
        for ext in data:
            upload(ext, label)
            check(ext + ' ' + label + ' visible', VISIBLE)
            c.js("document.body.classList.toggle('immersive-mode')")
            pause()
            check(ext + ' ' + label + ' immersive resize settled', VISIBLE)

    # A fresh navigation under the real service worker, then disconnected reload.
    c.call('Network.setBypassServiceWorker', bypass=False)
    c.call('Page.navigate', url=url)
    c.wait("document.readyState==='complete' && !document.body.inert && !!navigator.serviceWorker.controller", timeout=30)
    check('offline shell has installed completely', "(async()=>{const r=await navigator.serviceWorker.ready;return !!r.active&&(await caches.keys()).some(n=>n.startsWith('ai-reader-shell-'))})()")
    standalone = c.call('Page.addScriptToEvaluateOnNewDocument', source="""
      const auditMatchMedia=window.matchMedia.bind(window);
      window.matchMedia=query=>query==='(display-mode: standalone)'?{matches:true,media:query,addEventListener(){},removeEventListener(){}}:auditMatchMedia(query);
    """)['identifier']
    c.call('Network.emulateNetworkConditions', offline=True, latency=0, downloadThroughput=0, uploadThroughput=0)
    try:
        c.call('Page.reload')
        c.wait("document.readyState==='complete' && !document.body.inert && !!window.pdfjsLib", timeout=30)
        check('offline reload with standalone branch and active service worker', "navigator.serviceWorker.controller!==null && matchMedia('(display-mode: standalone)').matches")
        for ext in data:
            upload(ext, 'offline restart', 'text/plain')
            check(ext + ' offline reimport with mismatched MIME', VISIBLE)
            c.js('goNext()')
            pause()
            upload(ext, 'offline restart', 'text/plain')
            check(ext + ' offline navigation and reopen', VISIBLE)
        check('no uncaught browser errors or unhandled rejections', '__auditErrors.length===0 || JSON.stringify(__auditErrors)')
    finally:
        c.call('Network.emulateNetworkConditions', offline=False, latency=0, downloadThroughput=-1, uploadThroughput=-1)
        c.call('Page.removeScriptToEvaluateOnNewDocument', identifier=standalone)
        c.call('Page.removeScriptToEvaluateOnNewDocument', identifier=script)
        c.call('Network.setBypassServiceWorker', bypass=True)
        # An explicit SET, not a clear: every *_browser.py suite in CI shares
        # this one Chrome tab, and clearing reverts to the underlying
        # headless-launch native viewport, which can itself be smaller than
        # any real desktop size a later suite assumes.
        c.call('Emulation.setDeviceMetricsOverride', width=1366, height=900, deviceScaleFactor=1, mobile=False)
        c.call('Emulation.setTouchEmulationEnabled', enabled=False)
    print('ALL 11 EXTENSION READER / MOBILE / OFFLINE CHECKS PASSED', flush=True)


if __name__ == '__main__':
    main()
