"""Actual image codecs, rendered pixels, text failure isolation and PDF lifecycle.

Start the usual server at 8765 and Chrome CDP at READER_CDP_PORT (default 9222).
Use --repro-only for the production blank-canvas regression; --text-repro-only
for the independent failure of optional text extraction. No external services.
"""
import base64
import json
import os
import sys
from browser_cdp import CDP
from pdf_audit_fixtures import ASSETS, pdf_document, pdf_fixtures

c = CDP()
c.call('Page.enable')
c.call('Runtime.enable')
c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1280, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert && !!window.pdfjsLib")
c.js("""localStorage.clear(); window.__pdfAuditErrors=[]; window.__pdfAuditWarnings=[];
addEventListener('error',e=>__pdfAuditErrors.push(e.message));
addEventListener('unhandledrejection',e=>__pdfAuditErrors.push(String(e.reason)));
const oldWarn=console.warn;console.warn=(...args)=>{__pdfAuditWarnings.push(args.join(' '));oldWarn(...args)};
window.__pdfSettled=async()=>{await new Promise(r=>setTimeout(r,700));
for(let i=0;i<200&&(pdfTasks.render||pdfTasks.text);i++)await new Promise(r=>setTimeout(r,50));
await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))};
window.__pixels=()=>{const c=els.pages.querySelector('.pdf-canvas');if(!c)return {canvas:false,text:els.pages.textContent};
const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
let painted=0,opaque=0;for(let i=0;i<d.length;i+=4){if(d[i+3]>0)opaque++;if(d[i+3]>0&&Math.min(d[i],d[i+1],d[i+2])<235)painted++;}
const r=c.getBoundingClientRect(),style=getComputedStyle(c);
return {canvas:true,width:c.width,height:c.height,painted,opaque,total:d.length/4,
fraction:painted/(d.length/4),visible:r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&style.display!=='none'&&style.visibility!=='hidden'&&style.opacity!=='0',
text:els.pages.querySelector('.pdf-text-layer')?.textContent||'',page:state.currentIndex,pages:state.totalPages};};""")


def check(name, condition, details=None):
    assert condition, (name, details)
    print('PASS', name, json.dumps(details, ensure_ascii=False) if details is not None else '', flush=True)


def upload(data, name):
    payload = base64.b64encode(data).decode()
    return c.js(f"""(async()=>{{state.pdfScale=1;state.pdfFit='width';
const f=new File([Uint8Array.from(atob('{payload}'),c=>c.charCodeAt(0))],{json.dumps(name)},{{type:'application/pdf'}});
await openBookFile(f);await __pdfSettled();return __pixels();}})()""")


def assert_pixels(name, result, fraction=.01):
    check(name, result.get('canvas') and result['width']>0 and result['height']>0 and result['visible']
          and result['fraction']>fraction and result['total']<=8_000_000
          and max(result['width'],result['height'])<=8192, result)


fixtures = pdf_fixtures()
if '--text-repro-only' not in sys.argv:
    for name in ['B image-heavy JPX', 'C image-only scan CCITT']:
        assert_pixels(name+' remains painted after settle', upload(fixtures[name], name+'.pdf'))
if '--repro-only' in sys.argv:
    print('PDF BLANK-CANVAS REGRESSIONS PASSED')
    sys.exit(0)

# A real loaded PDF page with just the optional API made to fail. Its graphical
# operators and pixels are untouched; losing text extraction must not lose them.
upload(fixtures['G no extractable text'], 'text extraction independence.pdf')
result = c.js("""(async()=>{const p=await state.pdfDoc.getPage(1),original=p.getTextContent;
p.getTextContent=async()=>{throw new Error('audit injected text extraction failure')};
els.pages.replaceChildren();const ok=await renderPdfPage(1);p.getTextContent=original;
await __pdfSettled();return {ok,pixels:__pixels()};})()""")
assert_pixels('text extraction failure preserves graphical page', result['pixels'])
if '--text-repro-only' in sys.argv:
    print('PDF TEXT EXTRACTION REGRESSION PASSED')
    sys.exit(0)

for name, data in fixtures.items():
    result = upload(data, f"{name} Україна Żółć (reader's {'long name ' * 4}).pdf")
    if name == 'valid blank page':
        check('valid blank PDF has a sized canvas and working page controls',result.get('canvas') and result['width']>0 and result['page']==1,result)
    elif name == 'almost empty':
        assert_pixels(name, result, 0)
    else:
        # 'A text' and 'I alternating pages' both open on a sparse, image-free
        # text-only first page (real glyphs paint a small fraction of pixels,
        # unlike an image fill) -- the same lenient threshold applies to both,
        # not just the one literally named 'A text'.
        assert_pixels(name, result, .0001 if name in ('A text', 'I alternating pages') else .01)
    if result.get('pages',0)>1:
        pages = list(range(2,result['pages']+1)) if result['pages']<=4 else [2,24,48,1]
        for page in pages:
            later = c.js(f'(async()=>{{await renderPdfPage({page});await __pdfSettled();return __pixels()}})()')
            assert_pixels(f'{name} page {page}', later, .0001)

for filename in ['reportlab-multilingual-illustrated.pdf','ghostscript-illustrated.pdf','high-resolution-photo.pdf']:
    if not (ASSETS / filename).exists():
        raise AssertionError('Missing committed producer fixture: '+filename)
    result=upload((ASSETS / filename).read_bytes(),filename)
    assert_pixels(filename,result,.0001)
    if filename.startswith('reportlab'):
        check('PDF embedded Unicode font extracts Ukrainian Polish English',all(t in result['text'] for t in ['Україна','Żółć','English']),result['text'])

# Each form factor receives actual codec data and a separate pixel observation.
for label,width,height,mobile,dpr in [('desktop',1280,900,False,1),('phone portrait',390,844,True,3),('phone landscape',844,390,True,3),('tablet portrait',820,1180,True,2),('tablet landscape',1180,820,True,2)]:
    c.call('Emulation.setDeviceMetricsOverride',width=width,height=height,deviceScaleFactor=dpr,mobile=mobile)
    for name in ['B image-heavy JPX','C image-only scan CCITT','D full-page JPEG','H scanned invisible OCR','M rotated','O large embedded bitmap']:
        result=upload(fixtures[name],f'{label} {name}.pdf')
        assert_pixels(label+' '+name,result)
        result=c.js('(async()=>{state.pdfFit="free";state.pdfScale=4;await renderPdfPage(state.totalPages,{preserve:true});await __pdfSettled();return __pixels()})()')
        assert_pixels(label+' zoom and navigation '+name,result)
# CI runs every *_browser.py suite against the SAME Chrome tab in one session
# (see .github/workflows/ci.yml): an emulated viewport left active here leaks
# straight into whichever suite runs next (archive_formats_audit_browser.py
# immediately follows this file there), silently changing ITS pagination
# geometry. Restore a real desktop viewport (an explicit SET, not a clear --
# clearing reverts to the underlying headless-launch native viewport, which
# can itself be smaller than any real desktop size the next suite assumes)
# before this script's own device matrix is done with it.
c.call('Emulation.setDeviceMetricsOverride', width=1280, height=900, deviceScaleFactor=1, mobile=False)
# The device matrix above cycles through narrow (<=1180px) viewports, and
# openBookFile() auto-ADDS immersive-mode below that width (js/main.js) --
# but nothing auto-REMOVES it once the viewport widens back out, so it was
# still active here even at the desktop size just restored above. Immersive
# mode gives the reader extra vertical room (no header/footer chrome), which
# silently changes how much content fits per page for whichever suite runs
# next -- confirmed directly as the actual cause of a flaky pagination count
# in archive_formats_audit_browser.py.
c.js("document.body.classList.remove('immersive-mode')")

# Malformed/empty/encrypted input returns an understandable state and next upload works.
for name,data in [('truncated.pdf',b'%PDF-1.7\n1 0 obj <<'),('empty.pdf',b''),('wrong content.pdf',b'<html>Not PDF</html>'),('encrypted.pdf',(ASSETS/'encrypted.pdf').read_bytes())]:
    result=upload(data,name)
    check(name+' has useful failure message',not result.get('canvas') and 'Помилка' in result.get('text','') and len(result['text'])>35,result)
    assert_pixels(name+' reader recovers',upload(fixtures['B image-heavy JPX'],'recovery.pdf'))

# Repeated opening destroys the preceding PDF task, releases old canvas nodes,
# and leaves a single visible raster and optional text layer after fast switches.
c.call('HeapProfiler.collectGarbage')
baseline=c.call('Memory.getDOMCounters')
heap_baseline=c.call('Runtime.getHeapUsage')
for cycle in range(12):
    upload(fixtures['long 48 pages'],f'cycle {cycle}.pdf')
    result=c.js('''(async()=>{window.__destroyedPdf=state.pdfDoc;
await openBookFile(new File(['Readable other book.'], 'switch.txt'));
return {destroyed:__destroyedPdf.loadingTask.destroyed,canvases:els.pages.querySelectorAll('canvas').length}})()''')
    check(f'cycle {cycle} destroys old PDF',result['destroyed'] and result['canvases']==0,result)
    assert_pixels(f'cycle {cycle} reopen',upload(fixtures['B image-heavy JPX'],f'reopen {cycle}.pdf'))
    c.js('(async()=>{await Promise.all([renderPdfPage(1),renderPdfPage(1),renderPdfPage(1)]);await __pdfSettled()})()')
    assert_pixels(f'cycle {cycle} concurrent rerenders',c.js('__pixels()'))
c.call('HeapProfiler.collectGarbage')
after=c.call('Memory.getDOMCounters')
heap_after=c.call('Runtime.getHeapUsage')
check('repeated PDF switches bound retained DOM',after['nodes']<=baseline['nodes']+60 and after['jsEventListeners']<=baseline['jsEventListeners']+10,{'before':baseline,'after':after,'heap_before':heap_baseline,'heap_after':heap_after})
check('no uncaught application errors',c.js('__pdfAuditErrors.length===0'),c.js('__pdfAuditErrors'))
print('PDF AUDIT WARNINGS',json.dumps(c.js('__pdfAuditWarnings'),ensure_ascii=False))
print('ALL PDF RENDERING AUDIT CHECKS PASSED')
