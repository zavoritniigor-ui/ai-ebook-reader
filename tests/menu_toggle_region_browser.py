"""(1) Opening/closing the main menu in a text book changes the visible text ONCE (the repagination after the transition), not on
every frame: the container height animates for 0.3 s and the page columns used to reflow on each frame while the page offset
stayed put, so different passages flashed by («chaotic redraw»). The reading place stays on screen afterwards.
(2) «✂️ Region» works in text books (EPUB/FB2/TXT/HTML/MD…): the text inside the drawn frame becomes the selection and the
translation popup opens; words outside the frame are not taken. Before, it only said «works in PDF». No network."""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
READY = "document.readyState==='complete' && !document.body.inert && typeof openBookFile==='function'"


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.2); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


BOOK = "# Book\n\n" + "\n\n".join(f"Paragraph {i}: " + " ".join(f"word{i}x{j}" for j in range(60)) for i in range(120))
TOGGLE = """new Promise(res => { const seen = []; const t0 = performance.now(); const mc = new MessageChannel();
  const first = () => { const c = els.container.getBoundingClientRect(); const w = document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { if (!n.nodeValue.trim()) continue; const r = document.createRange(); r.selectNodeContents(n);
      const b = [...r.getClientRects()].find(b => b.width && b.left >= c.left - 1 && b.right <= c.right + 1 && b.top >= c.top - 1); if (b) return n.nodeValue.trim().slice(0, 24); } return ''; };
  mc.port1.onmessage = () => { const s = first(); if (seen[seen.length - 1] !== s) seen.push(s); if (performance.now() - t0 < 1300) requestAnimationFrame(() => mc.port2.postMessage(0)); else res(JSON.stringify(seen)); };
  document.getElementById('menu-handle').click(); requestAnimationFrame(() => mc.port2.postMessage(0)); })"""
ANCHOR_ON_PAGE = "pageForBookTextOffset(state.bookTextOffset) === state.pageInChapter"

for w, h, mobile in [(1180, 820, False), (390, 844, True)]:
    c.call('Emulation.setDeviceMetricsOverride', width=w, height=h, deviceScaleFactor=1, mobile=mobile)
    c.call('Page.navigate', url=URL); c.wait(READY, timeout=30)
    c.js("localStorage.clear(); localStorage.setItem('reader_onboarding_done','1'); 1"); c.call('Page.reload'); c.wait(READY, timeout=30); time.sleep(0.5)
    c.js("window.__ok = 0; openBookFile(new File([%s], 'menu.md', {lastModified: %d})).then(() => { window.__ok = 1; }); 1" % (json.dumps(BOOK), w))
    c.wait("window.__ok === 1", timeout=30); time.sleep(2)
    c.js("for (let i = 0; i < 4; i++) goNext(); 1"); time.sleep(1.5)
    for k in range(4):
        seen = json.loads(c.js(TOGGLE)); time.sleep(0.6)
        assert len(seen) <= 2, ('%dx%d toggle %d: the visible text changed %d times %s' % (w, h, k, len(seen) - 1, seen))
        check('%dx%d menu %s: the text changes at most once and the reading place stays on screen' % (w, h, 'closed' if k % 2 else 'opened'), ANCHOR_ON_PAGE, timeout=2)

# «✂️ Region» in a text book
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=800, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL); c.wait(READY, timeout=30)
c.js("localStorage.clear(); localStorage.setItem('reader_onboarding_done','1'); 1"); c.call('Page.reload'); c.wait(READY, timeout=30); time.sleep(0.5)
c.js("window.__ok = 0; openBookFile(new File([%s], 'region.md', {lastModified: 7})).then(() => { window.__ok = 1; }); 1" % json.dumps(BOOK))
c.wait("window.__ok === 1", timeout=30); time.sleep(2)
c.js("state.translateMode = true; window.__asked = []; aiAvailable = () => false; speakText = () => {}; 1")
c.js("document.getElementById('btn-region').click(); 1"); time.sleep(0.4)
check('region mode opens in a text book with a text hint (not «works in PDF»)', "document.body.classList.contains('region-mode') && document.getElementById('region-hint').textContent === t('regionHintText')")
# five consecutive words on ONE visible line of the current page
box = json.loads(c.js("""JSON.stringify((() => { const c = els.container.getBoundingClientRect(); const it = document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT); let n;
  while ((n = it.nextNode())) { const re = /word\\d+x\\d+/g; let m, line = [];
    while ((m = re.exec(n.nodeValue))) { const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length); const b = r.getBoundingClientRect();
      if (!(b.width && b.left >= c.left && b.right <= c.right && b.top > c.top + 60 && b.bottom < c.bottom - 80)) { line = []; continue; }
      if (line.length && Math.abs(line[0].b.top - b.top) > 2) line = [];
      line.push({w: m[0], b}); if (line.length === 5) { const a = line[0], z = line[4]; return {first: a.w, last: z.w, x0: a.b.left - 2, y0: a.b.top - 2, x1: z.b.right + 2, y1: z.b.bottom + 2}; } } }
  return null; })())"""))
assert box, 'no visible line found'
c.call('Input.dispatchMouseEvent', type='mouseMoved', x=box['x0'], y=box['y0'])
c.call('Input.dispatchMouseEvent', type='mousePressed', x=box['x0'], y=box['y0'], button='left', buttons=1, clickCount=1)
for i in range(1, 8): c.call('Input.dispatchMouseEvent', type='mouseMoved', x=box['x0'] + (box['x1'] - box['x0']) * i / 7, y=box['y0'] + (box['y1'] - box['y0']) * i / 7, button='left', buttons=1); time.sleep(0.03)
c.call('Input.dispatchMouseEvent', type='mouseReleased', x=box['x1'], y=box['y1'], button='left', buttons=0, clickCount=1)
check('the text inside the frame becomes the selection and the translation popup opens', "els.tooltip.style.display === 'flex' && !document.body.classList.contains('region-mode')", timeout=3)
check('... exactly the five framed words, nothing outside', "(() => { const s = els.ttOriginal.textContent.trim(); return s.startsWith(%s) && s.endsWith(%s) && s.split(/\\s+/).length === 5; })() || els.ttOriginal.textContent" % (json.dumps(box['first']), json.dumps(box['last'])))
print('ALL PASS')
