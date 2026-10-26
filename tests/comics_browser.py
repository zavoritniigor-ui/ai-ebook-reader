"""Browser test: a CBZ comic or magazine archive opens and turns pages. Each page is one image; the pages go in the natural
order of their file names (2.png before 10.png); files that are not images are skipped."""
import base64, io, os, time, zipfile
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
ICON = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons', 'icon-192.png'), 'rb').read()

buf = io.BytesIO()
with zipfile.ZipFile(buf, 'w') as z:
    z.writestr('10.png', ICON); z.writestr('2.png', ICON); z.writestr('1.png', ICON)
    z.writestr('ComicInfo.xml', '<ComicInfo/>')
CBZ_B64 = base64.b64encode(buf.getvalue()).decode()

c = CDP()
c.call('Page.enable'); c.call('Runtime.enable')
c.call('Emulation.setDeviceMetricsOverride', width=1024, height=768, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState === 'complete' && !document.body.inert && typeof initCbz === 'function'")
c.js("localStorage.clear(); showUpdateBanner = () => {}; document.getElementById('sw-update-banner')?.remove();")


def check(name, expr, timeout=15):
    deadline = time.monotonic() + timeout
    last = None
    while time.monotonic() < deadline:
        last = c.js(expr)
        if last is True:
            print('PASS:', name); return
        time.sleep(0.1)
    raise AssertionError(f'FAIL: {name} -> {last!r}')


c.js(f"""(() => {{
    const raw = atob('{CBZ_B64}'), u8 = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
    openBookFile(new File([u8], 'test-comic.cbz', {{ type: 'application/vnd.comicbook+zip' }}));
}})()""")

check('1 The archive opens as a CBZ with three pages (the non-image file is skipped)',
      "state.format === 'cbz' && state.totalPages === 3")
check('2 The pages are in natural order by file name', "JSON.stringify(state.cbzNames) === JSON.stringify(['1.png', '2.png', '10.png'])")
check('3 The first page is shown as a loaded image', """(() => { const i = document.querySelector('#reader-pages img.cbz-page');
    return !!i && i.complete && i.naturalWidth > 0; })()""")
c.js("goNext()")
check('4 Next turns to page 2', "state.currentIndex === 1 && !!document.querySelector('img.cbz-page')")
c.js("goNext()"); c.js("goNext()"); c.js("goNext()")
check('5 Turning past the last page stays on the last page', "state.currentIndex === 2")
c.js("goPrev()")
check('6 Previous turns back', "state.currentIndex === 1")
print('PASS: all CBZ checks')
