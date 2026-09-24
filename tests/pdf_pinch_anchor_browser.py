"""Physical page/focal anchor at gesture release; CDP is not tablet acceptance."""
import base64
import os
from browser_cdp import CDP
from pdf_audit_fixtures import pdf_document

class StrictCDP(CDP):
    FATAL_EVENTS = CDP.FATAL_EVENTS + ('Runtime.exceptionThrown',)

c = StrictCDP()
c.call('Page.enable')
c.call('Runtime.enable')
c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Emulation.setDeviceMetricsOverride', width=1200, height=1000, deviceScaleFactor=1, mobile=True)
c.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
c.call('Page.navigate', url='about:blank')
c.wait("location.href==='about:blank'")
c.call('Page.navigate', url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("location.protocol==='http:' && document.readyState==='complete' && !document.body.inert && typeof initPdf==='function'")
data = base64.b64encode(pdf_document([{'text': f'Physical page {n}', 'size': (600, 800)} for n in range(1, 431)])).decode()
c.js(f"""(async () => {{
    localStorage.clear(); state.format='pdf'; state.bookKey='pinch-test'; state.pdfScale=1; state.pdfFit='width'; document.body.classList.add('pdf-mode');
    await initPdf(new File([Uint8Array.from(atob('{data}'), c=>c.charCodeAt(0))], 'pinch.pdf'));
}})()""")

def settle():
    c.js('new Promise(r=>setTimeout(r,800))')

def touch(kind, x, y, distance=0):
    c.call('Input.dispatchTouchEvent', type=kind, touchPoints=[] if kind == 'touchEnd' else [
        dict(id=1, x=x-distance, y=y, radiusX=5, radiusY=5, force=1),
        dict(id=2, x=x+distance, y=y, radiusX=5, radiusY=5, force=1)])

settle()
for sidebar, grammar in ((False, False), (True, False), (False, True), (True, True)):
    c.js(f"document.getElementById('sidebar').classList.toggle('collapsed', {str(not sidebar).lower()}); updatePdfWorkspaceLayout()")
    if c.js("document.getElementById('grammar-panel').classList.contains('expanded')") != grammar:
        c.js("document.getElementById('grammar-tab').click()")
    settle()
    print('PANELS', sidebar, grammar, flush=True)
    for page in (10, 200, 410):
        for fraction in (.15, .5, .85):
            c.js(f"setPdfScale(1); navigateToPdfPage({page}, {{instant:true, focus:{{x:.5,y:{fraction}}}}})")
            settle()
            for ratio in (1.5, 1/1.5, 1.4, 1/1.4):
                point = c.js(f"""(() => {{
                    const w=pdfPageWrappers[{page}], r=w.getBoundingClientRect(), v=els.container.getBoundingClientRect();
                    const x=v.left+els.container.clientWidth/2, y=v.top+els.container.clientHeight*.4;
                    window.__pinchPoint={{page:{page}, x:(x-r.left)/r.width, y:(y-r.top)/r.height, clientX:x, clientY:y}};
                    return {{x,y}};
                }})()""")
                x, y = point['x'], point['y']
                touch('touchStart', x, y, 70)
                for i in range(1, 6):
                    touch('touchMove', x, y, 70*(1+(ratio-1)*i/5))
                    c.js('new Promise(r=>requestAnimationFrame(r))')
                touch('touchEnd', x, y)
                settle()
                result = c.js("""(() => {
                    const a=__pinchPoint,r=pdfPageWrappers[a.page].getBoundingClientRect();
                    return {page:state.currentIndex, dx:r.left+a.x*r.width-a.clientX, dy:r.top+a.y*r.height-a.clientY,
                        zoom:state.pdfZoom, canvases:els.pages.querySelectorAll('.pdf-page-wrapper canvas').length};
                })()""")
                assert abs(result['dx']) < 3 and abs(result['dy']) < 3, (page, fraction, ratio, result)
                assert result['zoom'] == 1 and result['canvases'] <= 16, result
                print('PASS focal anchor', page, fraction, ratio, result, flush=True)
c.sock.close()
