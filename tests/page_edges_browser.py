"""No edge of the previous/next page is visible beside the current one: the gap between page columns was 48px while the
reader's side padding is 56px on a landscape tablet, so cut-off lines of the neighbouring pages showed in the margins
(reported with library books). Checked at several widths, after turning pages. No network."""
import base64, json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


para = lambda i: f'Paragraph {i}. ' + 'A readable sentence with several words in it, long enough to fill lines. ' * 8
MD = '# Chapter\n\n' + '\n\n'.join(para(i) for i in range(60))
VISIBLE_FOREIGN = """(() => { const box = els.container.getBoundingClientRect(), step = columnStep(), pl = els.pages.getBoundingClientRect().left;
  const w = document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT); let n, bad = [];
  while ((n = w.nextNode())) { const r = document.createRange(); r.selectNodeContents(n);
    for (const q of r.getClientRects()) { if (!q.width) continue; const col = Math.floor((q.left - pl + 1) / step);
      if (col !== state.pageInChapter && q.right > box.left + 1 && q.left < box.right - 1) bad.push({col, left: Math.round(q.left), right: Math.round(q.right)}); } }
  return bad.length === 0 || JSON.stringify(bad.slice(0, 3)); })()"""
for w, h in ((1280, 800), (1024, 768), (800, 1280), (390, 844)):
    c.call('Emulation.setDeviceMetricsOverride', width=w, height=h, deviceScaleFactor=1, mobile=w < 900)
    c.call('Page.navigate', url=URL)
    c.wait("document.readyState==='complete' && !document.body.inert", timeout=30)
    c.js(f"openBookFile(new File([Uint8Array.from(atob({json.dumps(base64.b64encode(MD.encode()).decode())}),ch=>ch.charCodeAt(0))],'edges.md',{{lastModified:{w}}}))")
    c.wait("state.totalPagesInChapter > 3", timeout=20); time.sleep(0.8)
    c.js("goToPageInChapter(2, false); 1"); time.sleep(0.3)
    check(f'{w}x{h}: no text of the neighbouring pages is visible in the reader', VISIBLE_FOREIGN)
print('ALL PASS')
