"""The PDF page slider collapses by itself into an oval page-number button after a few idle seconds (so an accidental
touch cannot scrub far ahead); a tap on the oval expands it; using the slider keeps it open; it re-collapses. No network."""
import os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof updatePdfScrubber==='function'", timeout=30)


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def tap_scrubber():
    pos = c.js("(b => ({x: b.left + b.width / 2, y: b.top + b.height / 2}))(document.getElementById('pdf-scrubber').getBoundingClientRect())")
    for kind in ('mousePressed', 'mouseReleased'):
        c.call('Input.dispatchMouseEvent', type=kind, x=pos['x'], y=pos['y'], button='left', clickCount=1)


c.js("document.body.classList.add('pdf-mode'); state.format='pdf'; state.totalPages=300; state.currentIndex=5; updatePdfScrubber(); 1"); time.sleep(0.3)
check('1 starts collapsed: an oval with the page number, slider hidden',
      "(s => s.classList.contains('collapsed') && getComputedStyle(document.getElementById('pdf-page-range')).display === 'none' && s.getBoundingClientRect().height < 60 && document.getElementById('pdf-page-preview').value == 5)(document.getElementById('pdf-scrubber'))")
tap_scrubber(); time.sleep(0.3)
check('2 a tap on the oval expands the slider', "!document.getElementById('pdf-scrubber').classList.contains('collapsed') && getComputedStyle(document.getElementById('pdf-page-range')).display !== 'none'")
time.sleep(1.8)
c.js("document.getElementById('pdf-page-range').dispatchEvent(new Event('input')); 1")
time.sleep(1.8)
check('3 using the slider postpones the collapse', "!document.getElementById('pdf-scrubber').classList.contains('collapsed')")
time.sleep(2.0)
check('4 collapses again after ~3 s idle', "document.getElementById('pdf-scrubber').classList.contains('collapsed')")
c.js("document.body.classList.remove('pdf-mode'); 1")
print('ALL PASS')
