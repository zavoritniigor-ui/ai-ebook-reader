"""Fast page scrolling for EPUB/FB2/DOCX/TXT/MD/HTML (the PDF slider now also covers text books, positioned over the whole
book) and the reading-place ribbon: a coloured mark on the left margin next to the sentence where the reader stopped (last
tapped word's sentence / read-aloud sentence), remembered per book, shown only on its page, also in PDF. No network."""
import base64, io, json, os, time, zipfile
from browser_cdp import CDP, pdf_bytes

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=900, height=1100, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof commitTextScrub==='function'", timeout=30)
c.js("localStorage.clear(); 1")


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def upload(name, data, stamp=7):
    if isinstance(data, str): data = data.encode()
    c.js(f"openBookFile(new File([Uint8Array.from(atob({json.dumps(base64.b64encode(data).decode())}),ch=>ch.charCodeAt(0))],{json.dumps(name)},{{lastModified:{stamp}}}))")
    c.wait("state.bookKey && state.totalPagesInChapter >= 1 && els.pages.textContent.length > 50", timeout=20); time.sleep(1.2)


para = lambda i: f'Paragraph {i}. ' + 'A readable sentence with several words in it. ' * 10
MD = '\n\n'.join(f'# Chapter {k}\n\n' + '\n\n'.join(para(i) for i in range(25)) for k in range(4))
upload('scrub.md', MD)
check('1 a text book shows the page slider (collapsed pill: page / pages of the WHOLE book)',
      "(s => s.classList.contains('available') && getComputedStyle(s).display !== 'none' && document.getElementById('pdf-page-preview').value === '1\\n/ ' + bookPageModel().total)(document.getElementById('pdf-scrubber'))", timeout=5)
check('1b the whole-book estimate is close to 4 chapters x the real pages of one (equal chapters)',
      "(m => m.total >= 4 * state.totalPagesInChapter - 2 && m.total <= 4 * state.totalPagesInChapter + 2 && m.total > 4)(bookPageModel())")
check('1c the footer shows the book page too', "/≈1\\/\\d+$/.test(els.progress.textContent)")
c.js("commitTextScrub(620); 1")
check('2 the slider jumps across blocks: 62% of 4 equal blocks is block 3, its page by the same fraction',
      "(m => state.currentIndex === 2 && Math.abs(m.page - Math.round(0.62 * (m.total - 1))) <= 2)(bookPageModel())", timeout=6)
check('3 the slider value follows the position', "Number(document.getElementById('pdf-page-range').value) === textScrubPosition()", timeout=3)
c.js("previewTextScrub(100); 1")
check('4 dragging previews the target page of the book', "(v => v === `${Math.round(0.1 * (bookPageModel().total - 1)) + 1}\\n/ ${bookPageModel().total}`)(document.getElementById('pdf-page-preview').value)")
c.js("commitTextScrub(1000); 1")
check('5 the end of the slider is the last page of the last block', "state.currentIndex === 3 && state.pageInChapter === state.totalPagesInChapter - 1", timeout=6)
check('5b ... and the book page shown is the last one', "(m => m.page + 1 === m.total)(bookPageModel())")

def arch(files):
    o = io.BytesIO()
    with zipfile.ZipFile(o, 'w') as z:
        for n, d in files.items(): z.writestr(n, d)
    return o.getvalue()
EPUB = arch({'META-INF/container.xml': '<container><rootfiles><rootfile full-path="OPS/p.opf"/></rootfiles></container>',
    'OPS/p.opf': '<package><manifest>' + ''.join(f'<item id="c{k}" href="c{k}.xhtml"/>' for k in range(3)) + '</manifest><spine>' + ''.join(f'<itemref idref="c{k}"/>' for k in range(3)) + '</spine></package>',
    **{f'OPS/c{k}.xhtml': f'<html><body><h1>Chapter {k}</h1>' + ''.join(f'<p>{para(i)}</p>' for i in range(20)) + '</body></html>' for k in range(3)}})
upload('scrub.epub', EPUB)
c.js("commitTextScrub(700); 1")
check('6 EPUB: the slider loads another chapter', "state.format === 'epub' && state.currentIndex === 2", timeout=8)
check('6b EPUB: chapter sizes are known, the pill shows page / pages', "!!state.blockWeights && state.blockWeights.length === 3 && /^\\d+\\n\\/ \\d+$/.test(document.getElementById('pdf-page-preview').value)", timeout=5)

# ---- reading ribbon, text ----
upload('ribbon.md', MD, stamp=9)
c.js("""(() => { goToPageInChapter(1, false); const w = document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT); let n, hits = [];
  const left = els.pages.getBoundingClientRect().left, step = columnStep();
  while ((n = w.nextNode())) { if (!n.nodeValue.includes('Paragraph')) continue; const r = document.createRange(); r.selectNodeContents(n);
    const x = r.getBoundingClientRect().left - left; if (Math.floor((x + 1) / step) === 1) { hits.push(n); } }
  const node = hits[1]; const r = document.createRange(); r.setStart(node, 0); r.setEnd(node, node.nodeValue.indexOf('.') + 1);
  window.__sentenceTop = r.getClientRects()[0].top; markReadingPoint(r); return 1; })()""")
check('7 marking a sentence shows the ribbon on the left margin next to it',
      """(() => { const el = document.getElementById('reading-ribbon'), r = el.getBoundingClientRect(), textLeft = els.container.getBoundingClientRect().left + els.pages.offsetLeft;
         return !el.hidden && r.width > 2 && r.right <= textLeft + 1 && r.left >= els.container.getBoundingClientRect().left && Math.abs(r.top - __sentenceTop) < 4 || JSON.stringify({hidden: el.hidden, r, top: __sentenceTop, textLeft}); })()""")
c.js("goNext(); 1"); time.sleep(0.5)
check('8 on another page the ribbon is hidden', "document.getElementById('reading-ribbon').hidden")
c.js("goPrev(); 1"); time.sleep(0.5)
check('9 back on its page it is shown again', "!document.getElementById('reading-ribbon').hidden")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof commitTextScrub==='function'", timeout=30)
upload('ribbon.md', MD, stamp=9)
c.js("goToPageInChapter(1, false); 1"); time.sleep(0.3)
check('10 reopening the book restores the ribbon at the same sentence', "!document.getElementById('reading-ribbon').hidden && readingPoint && readingPoint.chapter === 0")
upload('other.md', MD.replace('Chapter', 'Part'), stamp=11)
check('11 another book has no ribbon', "document.getElementById('reading-ribbon').hidden && readingPoint === null")

# ---- reading ribbon, PDF ----
b64 = base64.b64encode(pdf_bytes()).decode()
c.js(f"""(() => {{ const bytes = Uint8Array.from(atob({b64!r}), ch => ch.charCodeAt(0));
  const dt = new DataTransfer(); dt.items.add(new File([bytes], 'ribbon.pdf', {{type: 'application/pdf', lastModified: 3}}));
  const i = document.getElementById('file-upload'); i.files = dt.files; i.dispatchEvent(new Event('change')); }})()""")
c.wait("state.format === 'pdf' && pdfContinuousReady && document.querySelectorAll('.pdf-page-wrapper[data-page=\"1\"] .pdf-text-layer span').length > 0", timeout=60)
c.js("""(() => { const s = [...document.querySelectorAll('.pdf-page-wrapper[data-page="1"] .pdf-text-layer span')].find(x => x.textContent.includes('Hello'));
  const r = document.createRange(); r.selectNodeContents(s); window.__spanTop = s.getBoundingClientRect().top; markReadingPoint(r); return 1; })()""")
check('12 PDF: the ribbon sits inside page 1 next to the marked line',
      """(() => { const el = document.getElementById('reading-ribbon'); const w = document.querySelector('.pdf-page-wrapper[data-page="1"]');
         return !el.hidden && el.parentElement === w && Math.abs(el.getBoundingClientRect().top - __spanTop) < 6 || JSON.stringify({hidden: el.hidden, top: el.getBoundingClientRect().top, spanTop: __spanTop}); })()""")
check('13 the PDF keeps its own page slider (numbers, not %)', "Number(document.getElementById('pdf-page-range').min) === 1 && !String(document.getElementById('pdf-page-preview').value).includes('%')")
print('ALL PASS')
