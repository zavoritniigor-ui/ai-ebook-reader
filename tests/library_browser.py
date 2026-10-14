"""Free library window: the header button opens it, a search request carries the query/language/genre, results are listed with a
Read button, Read downloads the EPUB through /api/library and opens it in the reader; Wikisource and Internet Archive (PDF/EPUB) as
further sources. The network is mocked. No network."""
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
  window.fetch = async (url, opts) => { url = String(url); if (url.startsWith('/api/library')) { __reqs.push(url); return new Response(url.includes('op=file') ? new Blob(['fake epub bytes']) : '', {status: 200}); }
    return real(url, opts); };
  openBookFile = async (file) => { __opened = {name: file.name, type: file.type, lm: file.lastModified}; };
  return 1; })()""")
check('1 the quick wheel has a Library action', "[...document.querySelectorAll('.qm-item')].some(b => b.dataset.action === 'btn-library')")
c.js("openLibrary(); 1"); c.wait("document.querySelectorAll('#library-list .library-card').length > 0", timeout=20)
names = lambda: c.js("[...document.querySelectorAll('#library-list .library-name')].map(e => e.textContent)")
check('2 the built-in catalog lists French books first (default language), 30 per page, with a Read button each and a Show-more button',
      "document.getElementById('library-modal').classList.contains('open') && document.querySelectorAll('#library-list .library-card').length === 30 && document.querySelectorAll('#library-list .btn-primary').length === 30 && !document.getElementById('library-more').hidden")
check('3 no network search request is made: filtering is local', "__reqs.every(r => !r.includes('op=search'))")
c.js("(() => { const q = document.getElementById('library-q'); q.value = 'jules verne'; q.dispatchEvent(new Event('input')); return 1; })()"); time.sleep(0.8)
check('4 searching by author finds Jules Verne books only (accent-insensitive)', "(a => a.length > 3 && a.every(e => e.textContent.includes('Verne')))([...document.querySelectorAll('#library-list .library-author')])")
c.js("window.__before = document.querySelectorAll('#library-list .library-card').length; 1")
c.js("(() => { const g = document.getElementById('library-genre'); g.value = 'adventure'; g.dispatchEvent(new Event('change')); return 1; })()"); time.sleep(0.8)
check('5 a genre narrows the same search further', "document.querySelectorAll('#library-list .library-card').length > 0 && document.querySelectorAll('#library-list .library-card').length < __before")
c.js("(() => { document.getElementById('library-q').value = 'zzzzqqq'; document.getElementById('library-q').dispatchEvent(new Event('input')); return 1; })()"); time.sleep(0.8)
check('6 no match shows the empty message', "document.getElementById('library-status').textContent === t('libEmpty') && document.querySelectorAll('#library-list .library-card').length === 0")
c.js("(() => { document.getElementById('library-genre').value = ''; const q = document.getElementById('library-q'); q.value = 'candide'; q.dispatchEvent(new Event('input')); return 1; })()"); time.sleep(0.8)
c.js("document.querySelector('#library-list .btn-primary').click(); 1"); time.sleep(1)
check('7 Read downloads the EPUB through /api/library and opens it as a stable file (lastModified = book id)',
      "__reqs.some(r => /op=file&id=\\d+/.test(r)) && __opened && __opened.name.endsWith('.epub') && __opened.type === 'application/epub+zip' && __opened.lm > 0")
check('8 the window closes after opening', "!document.getElementById('library-modal').classList.contains('open')")

c.js("openLibrary(); 1"); time.sleep(0.5)
c.js("""(() => { window.__written = null; window.__picker = null;
  window.showSaveFilePicker = async (opts) => { __picker = opts; return { createWritable: async () => ({ write: async f => { __written = f; }, close: async () => {} }) }; };
  document.querySelector('#library-list .library-save').click(); return 1; })()"""); time.sleep(1)
check('9 Save asks for a folder/file name (showSaveFilePicker) and writes the EPUB there',
      "!!__picker && __picker.suggestedName.endsWith('.epub') && !!__written && __written.type === 'application/epub+zip' && document.getElementById('library-status').textContent === t('libSaved')")
c.js("""(() => { delete window.showSaveFilePicker; window.__dl = null; const orig = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (this.download) { __dl = { name: this.download, href: this.href }; return; } return orig.call(this); };
  document.querySelector('#library-list .library-save').click(); return 1; })()"""); time.sleep(1)
check('10 without a folder picker (Android) Save downloads the file into Downloads', "!!__dl && __dl.name.endsWith('.epub') && __dl.href.startsWith('blob:') && document.getElementById('library-status').textContent === t('libSavedDownloads')")
check('11 the second save reused the downloaded file (no new request)', "__reqs.filter(r => r.includes('op=file')).length <= 2")

# ---- Wikisource (second source) ----
c.js("""(() => { window.__wsReqs = []; const prev = window.fetch;
  const page = (body) => new Response('<!DOCTYPE html><html><body>' + body + '</body></html>', {status: 200, headers: {'content-type': 'text/html'}});
  window.fetch = async (url, opts) => { url = String(url);
    if (url.includes('op=ws-')) { __wsReqs.push(decodeURIComponent(url));
      if (url.includes('op=ws-search')) return new Response(JSON.stringify({results: [{title: 'Твір/II', words: 900}, {title: 'Твір', words: 40}, {title: 'Інший', words: 3000}]}), {status: 200});
      if (url.includes('op=ws-subpages')) return new Response(JSON.stringify({pages: []}), {status: 200});
      const title = decodeURIComponent(url.split('title=')[1]);
      if (title === 'Твір') return page('<table class="wst-header"><tr><td>НАВІГАЦІЯ</td></tr></table><ul><li><a href="./Твір/I">I</a></li><li><a href="./Твір/II">II</a></li><li><a href="./Автор:X">X</a></li></ul>');
      if (title === 'Твір/I') return page('<div class="ws-noexport">шапка</div><p>Перший розділ <a href="./Слово">тексту</a> достатньо довгий для книги, щоб пройти перевірку.</p><span class="pagenum">[12]</span><img src="https://upload.wikimedia.org/x.png">');
      if (title === 'Твір/II') return page('<p>Другий розділ теж має достатньо слів для перевірки довжини.</p>');
      return page('<p>Інший твір без розділів, одна сторінка тексту достатньої довжини.</p>');
    }
    return prev(url, opts); };
  const s = document.getElementById('library-source'); s.value = 'wikisource'; s.dispatchEvent(new Event('change'));
  const q = document.getElementById('library-q'); q.value = 'твір'; q.dispatchEvent(new Event('input')); return 1; })()"""); time.sleep(1.5)
check('12 Wikisource: source switch shows its languages (Ukrainian first), hides genres, and lists works once (chapter hits fold into the work)',
      """document.getElementById('library-lang').value === 'uk' && document.getElementById('library-genre').hidden
         && [...document.querySelectorAll('#library-list .library-name')].map(e => e.textContent).join('|') === 'Твір|Інший'
         && __wsReqs.some(r => r.includes('op=ws-search&lang=uk&q=твір'))""")
c.js("[...document.querySelectorAll('#library-list .library-card')][0].querySelector('.btn-primary').click(); 1"); time.sleep(1.5)
check('13 Read builds ONE HTML book from the chapters in order, without Wikisource navigation, page numbers, links or images',
      """(async () => { const f = libraryFiles.get('ws:uk:Твір'); if (!f || !__opened) return 'not opened'; const html = await f.text();
         const i1 = html.indexOf('Перший розділ'), i2 = html.indexOf('Другий розділ');
         return __opened.name === 'Твір.html' && __opened.type === 'text/html' && i1 > 0 && i2 > i1 && !/НАВІГАЦІЯ|шапка|\\[12\\]|<a |<img/.test(html) && /<h1>I<\\/h1>/.test(html) || html.slice(0, 400); })()""")
check('14 the choice of source is remembered', "JSON.parse(localStorage.getItem('reader_library_filters')).source === 'wikisource'")

# ---- Internet Archive (third source: PDF / EPUB) ----
c.js("""(() => { window.__iaReqs = []; window.__opened = null; const prev = window.fetch;
  const files = { kobzar_1889: {scan: true, files: [{name: 'kobzar_1889.epub', format: 'EPUB', size: 31e6}, {name: 'kobzar_1889_text.pdf', format: 'Additional Text PDF', size: 2000}]},
                  modern_book: {scan: false, files: [{name: 'modern.pdf', format: 'Text PDF', size: 900}, {name: 'modern.epub', format: 'EPUB', size: 1200}]},
                  huge_scan: {scan: true, files: [{name: 'huge.pdf', format: 'Text PDF', size: 400 * 1048576}]} };
  window.fetch = async (url, opts) => { url = String(url);
    if (url.includes('op=ia-')) { __iaReqs.push(decodeURIComponent(url));
      if (url.includes('op=ia-search')) return new Response(JSON.stringify({total: 3, results: [
        {id: 'kobzar_1889', title: 'Кобзар', creator: ['Шевченко, Тарас'], year: '1889', lang: 'ukr', pdf: true, epub: true},
        {id: 'modern_book', title: 'Modern', creator: [], year: '2015', lang: 'ukr', pdf: true, epub: true},
        {id: 'huge_scan', title: 'Huge', creator: [], year: '1900', lang: 'ukr', pdf: true, epub: false}]}), {status: 200});
      if (url.includes('op=ia-files')) return new Response(JSON.stringify(files[url.split('id=')[1]]), {status: 200});
      if (url.includes('op=ia-file')) return new Response(new Blob([url.includes('.pdf') ? '%PDF-1.4 fake' : 'PK fake epub']), {status: 200});
      if (url.includes('op=ia-cover')) return new Response('', {status: 404});
    }
    return prev(url, opts); };
  document.getElementById('library-q').value = ''; const s = document.getElementById('library-source'); s.value = 'archive'; s.dispatchEvent(new Event('change')); return 1; })()"""); time.sleep(0.5)
check('15 Internet Archive: its languages (Ukrainian first), no genres, and a hint until something is typed',
      "document.getElementById('library-lang').value === 'ukr' && document.getElementById('library-genre').hidden && document.getElementById('library-status').textContent === t('libIaHint') && !__iaReqs.length")
c.js("const q = document.getElementById('library-q'); q.value = 'кобзар'; q.dispatchEvent(new Event('input')); 1"); time.sleep(1.5)
check('16 search goes through the proxy with the language and lists author · year · formats',
      """__iaReqs.some(r => r.includes('op=ia-search&lang=ukr&q=кобзар&page=1'))
         && document.querySelector('#library-list .library-author').textContent === 'Шевченко, Тарас · 1889 · PDF · EPUB'
         && document.querySelectorAll('#library-list .library-card').length === 3""")
c.js("document.querySelectorAll('#library-list .library-card')[0].querySelector('.btn-primary').click(); 1"); time.sleep(1.5)
check('17 a scanned book opens as its text PDF (not the OCR EPUB)', "!!__opened && __opened.name === 'Кобзар.pdf' && __opened.type === 'application/pdf' && __iaReqs.some(r => r.includes('op=ia-file&id=kobzar_1889&name=kobzar_1889_text.pdf'))")
c.js("window.__opened = null; document.querySelectorAll('#library-list .library-card')[1].querySelector('.btn-primary').click(); 1"); time.sleep(1.5)
check('18 a born-digital book opens as EPUB', "!!__opened && __opened.name === 'Modern.epub' && __opened.type === 'application/epub+zip'")
c.js("window.__opened = null; openLibrary(); document.querySelectorAll('#library-list .library-card')[2].querySelector('.btn-primary').click(); 1"); time.sleep(1.5)
check('19 a file over 300 MB is not downloaded; the reader is told why', "__opened === null && !__iaReqs.some(r => r.includes('name=huge.pdf')) && document.getElementById('library-status').textContent.includes('400')")
check('20 the Internet Archive choice and its language are remembered', "(() => { const f = JSON.parse(localStorage.getItem('reader_library_filters')); return f.source === 'archive' && f.iaLang === 'ukr'; })()")
print('ALL PASS')
