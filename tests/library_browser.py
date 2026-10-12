"""Free library window: the header button opens it, a search request carries the query/language/genre, results are listed with a
Read button, Read downloads the EPUB through /api/library and opens it in the reader. The network is mocked. No network."""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof openLibrary==='function'", timeout=30)
c.js("localStorage.clear(); 1"); c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof openLibrary==='function'", timeout=30)


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


c.js("""(() => { window.__reqs = []; window.__opened = null; const real = window.fetch.bind(window);
  window.fetch = async (url, opts) => { url = String(url); if (!url.startsWith('/api/library')) return real(url, opts); __reqs.push(url);
    const p = new URL(url, location.href).searchParams;
    if (p.get('op') === 'search') return new Response(JSON.stringify({count: 2, hasMore: false, page: 1, results: [
      {id: 101, title: 'Le Comte de Monte-Cristo', authors: ['Dumas, Alexandre'], lang: 'fr'}, {id: 102, title: 'Candide', authors: ['Voltaire'], lang: 'fr'}]}), {status: 200});
    if (p.get('op') === 'file') return new Response(new Blob(['fake epub bytes']), {status: 200});
    return new Response('', {status: 404}); };
  openBookFile = async (file) => { __opened = {name: file.name, type: file.type, lm: file.lastModified}; };
  return 1; })()""")
check('1 the quick wheel has a Library action', "[...document.querySelectorAll('.qm-item')].some(b => b.dataset.action === 'btn-library')")
c.js("openLibrary(); 1"); time.sleep(0.8)
check('2 the window opens and lists the books with a Read button each',
      "document.getElementById('library-modal').classList.contains('open') && document.querySelectorAll('#library-list .library-card').length === 2 && document.querySelectorAll('#library-list .btn-primary').length === 2")
check('3 the first search used the default language (fr) and no genre', "__reqs[0].includes('op=search') && __reqs[0].includes('lang=fr') && __reqs[0].includes('page=1')")
c.js("(() => { const g = document.getElementById('library-genre'); g.value = 'detective'; g.dispatchEvent(new Event('change')); const q = document.getElementById('library-q'); q.value = 'Dumas'; q.dispatchEvent(new Event('input')); return 1; })()"); time.sleep(1)
check('4 changing genre + typing a query searches again with both', "(r => r.includes('topic=detective') && r.includes('q=Dumas'))(__reqs[__reqs.length - 1])")
c.js("document.querySelector('#library-list .btn-primary').click(); 1"); time.sleep(1)
check('5 Read downloads the EPUB and opens it as a stable file (lastModified = book id)',
      "__reqs.some(r => r.includes('op=file&id=101')) && __opened && __opened.name.endsWith('.epub') && __opened.type === 'application/epub+zip' && __opened.lm === 101")
check('6 the window closes after opening', "!document.getElementById('library-modal').classList.contains('open')")
print('ALL PASS')
