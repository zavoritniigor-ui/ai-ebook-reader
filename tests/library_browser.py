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
      if (url.includes('op=ws-search') && url.includes('cats=')) return new Response(JSON.stringify(url.includes('page=2')
          ? {total: 45, results: [{title: 'Байка 1/Частина', words: 10}, {title: 'Байка 41', words: 10}]}
          : {total: 45, results: Array.from({length: 40}, (_, i) => ({title: 'Байка ' + (i + 1), words: 100}))}), {status: 200});
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
check('12 Wikisource: source switch shows its languages (Ukrainian first) and lists works once (chapter hits fold into the work)',
      """document.getElementById('library-lang').value === 'uk'
         && [...document.querySelectorAll('#library-list .library-name')].map(e => e.textContent).join('|') === 'Твір|Інший'
         && __wsReqs.some(r => r.includes('op=ws-search&lang=uk&q=твір'))""")
c.js("[...document.querySelectorAll('#library-list .library-card')][0].querySelector('.btn-primary').click(); 1"); time.sleep(1.5)
check('13 Read builds ONE HTML book from the chapters in order, without Wikisource navigation, page numbers, links or images',
      """(async () => { const f = libraryFiles.get('ws:uk:Твір'); if (!f || !__opened) return 'not opened'; const html = await f.text();
         const i1 = html.indexOf('Перший розділ'), i2 = html.indexOf('Другий розділ');
         return __opened.name === 'Твір.html' && __opened.type === 'text/html' && i1 > 0 && i2 > i1 && !/НАВІГАЦІЯ|шапка|\\[12\\]|<a |<img/.test(html) && /<h1>I<\\/h1>/.test(html) || html.slice(0, 400); })()""")
check('14 the choice of source is remembered', "JSON.parse(localStorage.getItem('reader_library_filters')).source === 'wikisource'")
check('14a Wikisource genres: only those the language section has categories for (Ukrainian: poetry yes, detective no; French: detective yes)',
      """(() => { openLibrary(); const g = document.getElementById('library-genre'), l = document.getElementById('library-lang');
         const has = k => [...g.options].some(o => o.value === k);
         const uk = !g.hidden && has('') && has('poetry') && has('myth') && !has('detective') && !has('scifi');
         l.value = 'fr'; l.dispatchEvent(new Event('change')); const fr = has('detective') && has('scifi');
         l.value = 'uk'; l.dispatchEvent(new Event('change')); return uk && fr && !has('detective'); })()""")
c.js("(() => { __wsReqs.length = 0; document.getElementById('library-q').value = ''; const g = document.getElementById('library-genre'); g.value = 'myth'; g.dispatchEvent(new Event('change')); return 1; })()"); time.sleep(1.5)
check('14b a genre lists its works WITHOUT a query: the request carries the section\'s categories, Show more is offered',
      """__wsReqs.some(r => r.includes('op=ws-search&lang=uk&q=&cats=Легенди|Українські_народні_легенди|Міфи|Скандинавські_міфи|Байки') && !r.includes('page='))
         && document.querySelectorAll('#library-list .library-card').length === 40 && !document.getElementById('library-more').hidden
         && JSON.parse(localStorage.getItem('reader_library_filters')).topic === 'myth'""")
c.js("document.getElementById('library-more').click(); 1"); time.sleep(1.5)
check('14c Show more fetches the next page and appends only new works (a chapter of a listed work is not repeated)',
      """__wsReqs.some(r => r.includes('&page=2')) && document.querySelectorAll('#library-list .library-card').length === 41
         && document.querySelector('#library-list .library-card:last-child .library-name').textContent === 'Байка 41' && document.getElementById('library-more').hidden""")
c.js("(() => { const g = document.getElementById('library-genre'); g.value = ''; g.dispatchEvent(new Event('change')); return 1; })()"); time.sleep(1.2)
check('14d with neither a query nor a genre the hint asks for one', "document.getElementById('library-status').textContent === t('libWsHint') && !document.querySelectorAll('#library-list .library-card').length")

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
check('15 Internet Archive: its languages (Ukrainian first), every genre, and a hint until something is typed or a genre is chosen',
      "document.getElementById('library-lang').value === 'ukr' && !document.getElementById('library-genre').hidden && document.getElementById('library-genre').options.length === 17 && document.getElementById('library-status').textContent === t('libIaHint') && !__iaReqs.length")
c.js("(() => { const g = document.getElementById('library-genre'); g.value = 'poetry'; g.dispatchEvent(new Event('change')); return 1; })()"); time.sleep(1.5)
check('15a a genre alone browses Internet Archive by subject', "__iaReqs.some(r => r.includes('op=ia-search&lang=ukr&q=&page=1&genre=poetry')) && document.querySelectorAll('#library-list .library-card').length === 3")
c.js("(() => { __iaReqs.length = 0; const g = document.getElementById('library-genre'); g.value = ''; g.dispatchEvent(new Event('change')); return 1; })()"); time.sleep(1.2)
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

# ---- Bibliothèque numérique romande and Standard Ebooks (French and English classics, EPUB) ----
c.js("""(() => { window.__catReqs = []; window.__opened = null; const prev = window.fetch;
  window.fetch = async (url, opts) => { url = String(url);
    if (/op=(bnr|se)-/.test(url)) { __catReqs.push(decodeURIComponent(url));
      if (url.includes('-search')) { const se = url.includes('op=se-'), p2 = url.includes('page=2');
        return new Response(JSON.stringify({more: !p2, results: [{id: se ? 'leo-tolstoy/resurrection/louise-maude' : 'balzac-honore-de-le-pere-goriot' + (p2 ? '-2' : ''),
          title: se ? 'Resurrection' : 'Le Père Goriot', author: se ? 'Leo Tolstoy' : 'Balzac Honoré de', cover: se ? '' : '2022/07/goriot.jpg'}]}), {status: 200}); }
      if (url.includes('-file')) return new Response(new Blob(['PK fake epub']), {status: 200});
      if (url.includes('-cover')) return new Response('', {status: 404});
    }
    return prev(url, opts); };
  openLibrary(); document.getElementById('library-q').value = ''; const s = document.getElementById('library-source'); s.value = 'bnr'; s.dispatchEvent(new Event('change')); return 1; })()"""); time.sleep(1)
check('21 Bibliothèque numérique romande: French only, its own genres, and without a query it lists books at once',
      """document.getElementById('library-lang').options.length === 1 && document.getElementById('library-lang').value === 'fr'
         && document.getElementById('library-genre').options.length === 15 && !document.querySelector('#library-genre option[value="history"]')
         && __catReqs.some(r => r.includes('op=bnr-search&q=&page=1')) && document.querySelector('#library-list .library-name').textContent === 'Le Père Goriot'
         && document.querySelector('#library-list .library-author').textContent === 'Balzac Honoré de' && document.querySelector('#library-list img').src.includes('op=bnr-cover&path=2022%2F07%2Fgoriot.jpg')
         && document.querySelector('#library-modal .library-source').textContent === t('libBnrSource') && !document.getElementById('library-more').hidden""")
c.js("document.getElementById('library-more').click(); 1"); time.sleep(1)
check('21a Show more appends the next page', "__catReqs.some(r => r.includes('op=bnr-search&q=&page=2')) && document.querySelectorAll('#library-list .library-card').length === 2 && document.getElementById('library-more').hidden")
c.js("(() => { const g = document.getElementById('library-genre'); g.value = 'detective'; g.dispatchEvent(new Event('change')); const q = document.getElementById('library-q'); q.value = 'goriot'; q.dispatchEvent(new Event('input')); return 1; })()"); time.sleep(1.5)
check('22 query and genre go to the proxy', "__catReqs.some(r => r.includes('op=bnr-search&q=goriot&page=1&genre=detective'))")
c.js("document.querySelector('#library-list .library-card .btn-primary').click(); 1"); time.sleep(1.5)
check('22a Read opens the EPUB', "!!__opened && __opened.name === 'Le Père Goriot.epub' && __opened.type === 'application/epub+zip' && __catReqs.some(r => r.includes('op=bnr-file&id=balzac-honore-de-le-pere-goriot'))")
c.js("""(() => { window.__opened = null; openLibrary(); const q = document.getElementById('library-q'); q.value = ''; const s = document.getElementById('library-source'); s.value = 'se'; s.dispatchEvent(new Event('change')); return 1; })()"""); time.sleep(1)
check('23 Standard Ebooks: English only, no genre without a subject there (romance), books listed at once',
      """document.getElementById('library-lang').value === 'en' && document.getElementById('library-lang').options.length === 1 && !document.querySelector('#library-genre option[value="love"]')
         && document.getElementById('library-genre').value === 'detective' && __catReqs.some(r => r.includes('op=se-search&q=&page=1&genre=detective'))
         && document.querySelector('#library-list .library-name').textContent === 'Resurrection'""")
c.js("document.querySelector('#library-list .library-card .btn-primary').click(); 1"); time.sleep(1.5)
check('23a Read opens its EPUB', "!!__opened && __opened.name === 'Resurrection.epub' && __catReqs.some(r => r.includes('op=se-file&id=leo-tolstoy/resurrection/louise-maude'))")
check('24 the choice is remembered', "JSON.parse(localStorage.getItem('reader_library_filters')).source === 'se'")
print('ALL PASS')
