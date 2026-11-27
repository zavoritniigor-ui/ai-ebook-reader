# Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
# Copying, modification, distribution or commercial use without written permission is prohibited.
"""Real PaddleOCR output on a known French/English page with a synthetic book-spine curve.

The PDF (528 KiB, one page) was produced by OCR Document Server with PP-OCRv5 on RTX 3060.
Its left column rises ~55 image pixels along each line. The invisible text's content-stream order
is correct, but sorting word boxes into horizontal bands scrambled sentence context while each
word still tapped correctly. Reference boxes come from the source image's known font ink bounds,
with its applied curve, independently of OCR/PDF coordinates. No model, GPU or external service
is required to run this regression. All word hits and sentence contexts are checked at 100/200/400%.
"""
import json
import os
from pathlib import Path

from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
reference = json.loads((Path(__file__).parent / 'fixtures/pdf/curved-ocr-reference.json').read_text())
c = CDP()
c.call('Page.enable')
c.call('Runtime.enable')
c.call('Network.enable')
c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Network.setBlockedURLs', urls=['https://*'])
c.call('Emulation.setDeviceMetricsOverride', width=1280, height=1000, deviceScaleFactor=1, mobile=True)
c.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof initPdf==='function'", timeout=40)
c.js("""localStorage.clear(); localStorage.setItem('reader_onboarding_done','1');
    window.__renders=0; window.__lastRenderAt=performance.now(); const originalRender=renderPdfPageInto;
    renderPdfPageInto=async(...args)=>{__renders++;try{return await originalRender(...args)}
        finally{__renders--;__lastRenderAt=performance.now()}};
    window.__tapEvidence=null; window.__fixtureOpened=false;
    handleWordOrSelection=word=>{__tapEvidence={word,sentence:state.ctxSentence}};
    bsSpeakTap=()=>false; window.__errors=[]; addEventListener('error',e=>__errors.push(e.message));
    state.format='pdf'; state.pdfFit='width';state.pdfScale=1;state.pdfZoom=1;
    document.body.classList.add('pdf-mode','immersive-mode');
    fetch('tests/fixtures/pdf/curved-ocr.pdf').then(r=>r.blob()).then(async b=>{
        await initPdf(new File([b],'curved-ocr.pdf'));__fixtureOpened=true;});
    1""")
c.wait("__fixtureOpened && __renders===0 && performance.now()-__lastRenderAt>400 && "
       "document.querySelectorAll('.pdf-text-layer span').length>40", timeout=40)
c.js("state.translateMode=true; state.inkMode=false; els.pages.classList.add('mode-translate');1")

for scale in (1, 2, 4):
    c.js(f'setPdfScale({scale})')
    c.wait(f'__renders===0 && Math.abs(state.pdfScale-{scale})<.01 && performance.now()-__lastRenderAt>400', timeout=40)
    tapped = set()
    for probe in reference['words']:
        left, top, right, bottom = probe['bbox']
        for fraction in (.3, .5, .7):
            x, y = left + (right-left)*fraction, (top+bottom)/2
            point = c.js(f"""(async()=>{{invalidateSelection();const page=document.querySelector('.pdf-page-wrapper');
                let b=page.getBoundingClientRect();const box=els.container.getBoundingClientRect();
                const cx=(Math.max(0,box.left)+Math.min(innerWidth,box.right))/2;
                const cy=(Math.max(0,box.top)+Math.min(innerHeight,box.bottom))/2;
                els.container.scrollLeft+=b.left+{x/reference['width']}*b.width-cx;
                els.container.scrollTop+=b.top+{y/reference['height']}*b.height-cy;
                await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
                b=page.getBoundingClientRect();return {{x:b.left+{x/reference['width']}*b.width,y:b.top+{y/reference['height']}*b.height}};
            }})()""")
            got = c.js(f"selectWordAtPoint({point['x']},{point['y']})")
            assert got == probe['word'], (scale, fraction, probe, got)
            context = c.js(f"sentenceRangeAt({point['x']},{point['y']})?.toString()")
            assert context == probe['sentence'], (scale, fraction, probe, context)
            if fraction == .5 and probe['sentence'] not in tapped:
                c.js('invalidateSelection();__tapEvidence=null;state.tooltipJustClosed=false;1')
                c.touch_tap(point['x'], point['y'])
                c.wait('__tapEvidence!==null')
                evidence = c.js('__tapEvidence')
                assert evidence == {'word': probe['word'], 'sentence': probe['sentence']}, (scale, probe, evidence)
                tapped.add(probe['sentence'])
    drag = c.js("""(()=>{invalidateSelection();const spans=pdfTextSpans(document.querySelector('.pdf-text-layer'));
        const a=spans.find(s=>s.textContent.trim()===\"L'école\"),b=spans.find(s=>s.textContent.trim()==='forêt.');
        const nodes=s=>{const w=document.createTreeWalker(s,NodeFilter.SHOW_TEXT),out=[];let n;
            while(n=w.nextNode())if(n.nodeValue.length)out.push(n);return out;};
        const head=nodes(a)[0],tail=nodes(b).at(-1),r=document.createRange();
        r.setStart(head,0);r.setEnd(tail,tail.nodeValue.length);
        return resolveCanonicalPdfSelection(r,{sourceType:'phrase_translation'})?.text;})()""")
    assert drag == "L'école française est près de la forêt.", (scale, 'curved drag', drag)
    print(f'PASS curved OCR {scale*100}%: {len(reference["words"])*3} independent word hits and contexts; '
          f'{len(tapped)} touch-dispatched sentence contexts; complete curved drag', flush=True)

# A usable OCR stream is only a fallback inside a column; arbitrary PDF stream order still needs geometry.
fallback = c.js("""(()=>{
    const test=(texts,rects,order)=>{
        const layer=document.createElement('div');layer.className='pdf-text-layer';
        layer.style.cssText='position:fixed;left:0;top:0;width:800px;height:300px';document.body.appendChild(layer);
        const spans=texts.map((t,i)=>{const s=document.createElement('span');s.textContent=t;
            s.style.cssText=`position:absolute;left:${rects[i][0]}px;top:${rects[i][1]}px;width:90px;height:20px`;
            return s;});
        for(const i of order)layer.appendChild(spans[i]);
        const text=pdfSpansToText(pdfVisualGroup(layer,spans[0]));layer.remove();return text;
    };
    return {
        lateStyle:test(['The','bold','word','belongs','here.'],[[20,40],[120,40],[220,40],[320,40],[420,40]],[0,2,3,4,1]),
        offsetStyle:test(['The','bold','word','belongs','here.'],[[20,40],[120,46],[220,40],[320,40],[420,40]],[0,2,3,4,1]),
        lateBlock:test(['First','line','continues','on','second','line.'],[[20,40],[120,40],[220,40],[20,70],[120,70],[220,70]],[3,4,5,0,1,2])
    };
})()""")
assert fallback == {'lateStyle': 'The bold word belongs here.', 'offsetStyle': 'The bold word belongs here.',
                    'lateBlock': 'First line continues on second line.'}, fallback
print('PASS arbitrary stream order: late style run and upward block jump use visual order', flush=True)

assert c.js('__errors.length===0'), c.js('__errors')
c.call('Network.setBlockedURLs', urls=[])
print('ALL CURVED OCR CHECKS PASSED', flush=True)
