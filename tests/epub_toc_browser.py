"""The real table of contents of an EPUB (owner, 2026-10-31: «стандарт ебук не відповідає»).

The contents panel used to list the book's FILES in reading order as «Розділ 1, 2, 3…»: no titles, and one file is
often not one chapter. The standard gives the real contents two ways — EPUB 3's navigation document (the manifest item
with properties="nav", <nav epub:type="toc">) and EPUB 2's toc.ncx (named by <spine toc="…">). js/formats.js reads the
first, else the second, else falls back to the old list.

Checked on synthetic books built here (no network): titles and nesting from the navigation document; a heading with no
link and a link to a file outside the reading order are shown but inert; an entry pointing INTO a chapter (file#anchor)
opens that chapter on the page that holds the anchor, not on its first page; the current chapter is marked; an EPUB 2
book gets its contents from toc.ncx; with both, the navigation document wins; a broken navigation document falls back to
the old list; a title is only ever text (markup in it never becomes an element); another book's contents are forgotten.
"""
import base64, io, os, time, zipfile
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')


def epub(files, opf_manifest, opf_spine, spine_attrs=''):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w') as z:
        z.writestr(zipfile.ZipInfo('mimetype'), 'application/epub+zip', compress_type=zipfile.ZIP_STORED)
        z.writestr('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">'
                   '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
        z.writestr('OEBPS/content.opf', '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id">'
                   '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">t</dc:identifier><dc:title>T</dc:title><dc:language>en</dc:language></metadata>'
                   f'<manifest>{opf_manifest}</manifest><spine{spine_attrs}>{opf_spine}</spine></package>')
        for name, body in files.items():
            z.writestr('OEBPS/' + name, body)
    return buf.getvalue()


def xhtml(title, body):
    return ('<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">'
            f'<head><title>{title}</title></head><body>{body}</body></html>')


LONG = ''.join(f'<p>Paragraph {i} of the first chapter, long enough to fill the page with ordinary reading text.</p>' for i in range(90))
CH1 = xhtml('One', '<h1 id="top">The first chapter</h1>' + LONG + '<h2 id="deep">The deep section</h2><p>Deep text.</p>' + LONG[:2000])
CH2 = xhtml('Two', '<h1>The second chapter</h1><p>Second chapter text.</p>')
CH3 = xhtml('Three', '<h1>The third chapter</h1><p>Third chapter text.</p>')
CHAPTERS = {'ch1.xhtml': CH1, 'ch2.xhtml': CH2, 'ch3.xhtml': CH3}
MANIFEST = ''.join(f'<item id="c{i}" href="ch{i}.xhtml" media-type="application/xhtml+xml"/>' for i in (1, 2, 3))
SPINE = ''.join(f'<itemref idref="c{i}"/>' for i in (1, 2, 3))

NAV = xhtml('Contents', '''<nav epub:type="toc"><h1>Contents</h1><ol>
  <li><a href="ch1.xhtml">First <b>chapter</b></a>
    <ol><li><a href="ch1.xhtml#deep">The deep section</a></li></ol></li>
  <li><a href="ch2.xhtml">&lt;img src=x onerror=alert(1)&gt;Second</a></li>
  <li><span>Part without a link</span>
    <ol><li><a href="ch3.xhtml">Third</a></li><li><a href="notes.xhtml">Notes outside the spine</a></li></ol></li>
</ol></nav><nav epub:type="landmarks"><ol><li><a href="ch2.xhtml">Landmark, not contents</a></li></ol></nav>''')

NCX = '''<?xml version="1.0"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><navMap>
  <navPoint id="n1"><navLabel><text>NCX one</text></navLabel><content src="ch1.xhtml"/>
    <navPoint id="n2"><navLabel><text>NCX deep</text></navLabel><content src="ch1.xhtml#deep"/></navPoint></navPoint>
  <navPoint id="n3"><navLabel><text>NCX two</text></navLabel><content src="ch2.xhtml"/></navPoint>
  <navPoint id="n4"><navLabel><text>NCX three</text></navLabel><content src="ch3.xhtml"/></navPoint>
</navMap></ncx>'''

EPUB3 = epub(dict(CHAPTERS, **{'nav.xhtml': NAV}), MANIFEST + '<item id="nav" href="nav.xhtml" properties="nav" media-type="application/xhtml+xml"/>', SPINE)
EPUB2 = epub(dict(CHAPTERS, **{'toc.ncx': NCX}), MANIFEST + '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>', SPINE, ' toc="ncx"')
BOTH = epub(dict(CHAPTERS, **{'nav.xhtml': NAV, 'toc.ncx': NCX}),
            MANIFEST + '<item id="nav" href="nav.xhtml" properties="nav" media-type="application/xhtml+xml"/><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
            SPINE, ' toc="ncx"')
BROKEN = epub(dict(CHAPTERS, **{'nav.xhtml': '<html><body><p>no nav here at all'}),
              MANIFEST + '<item id="nav" href="nav.xhtml" properties="nav" media-type="application/xhtml+xml"/>', SPINE)

c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1280, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof readEpubToc==='function'", timeout=30)
c.js("showUpdateBanner = () => {}; window.__errors = []; addEventListener('error', e => __errors.push(e.message)); 1")


def open_epub(data, name):
    b64 = base64.b64encode(data).decode()
    c.js("""(() => { const bytes = Uint8Array.from(atob(%r), c => c.charCodeAt(0));
      const dt = new DataTransfer(); dt.items.add(new File([bytes], %r, {type: 'application/epub+zip'}));
      const i = document.getElementById('file-upload'); i.files = dt.files; i.dispatchEvent(new Event('change')); return 1; })()""" % (b64, name))
    c.wait("state.format === 'epub' && els.toc.children.length > 0 && !!els.pages.textContent.trim()", timeout=40)
    c.js('new Promise(r => setTimeout(r, 500))')


def check(name, expression, timeout=0):
    deadline = time.monotonic() + timeout
    result = c.js(expression)
    while result is not True and time.monotonic() < deadline:
        time.sleep(.1); result = c.js(expression)
    assert result is True, (name, result, c.js("JSON.stringify({toc: [...els.toc.children].map(li => [li.textContent, li.dataset.depth, li.className]), idx: state.currentIndex, page: state.pageInChapter, pages: state.totalPagesInChapter})"))
    print('PASS', name, flush=True)


ITEMS = "[...els.toc.children].map(li => li.textContent)"
item = lambda title: "[...els.toc.children].find(li => li.textContent === %r)" % title

# ---------------------------------------------------------------- EPUB 3 navigation document
open_epub(EPUB3, 'nav.epub')
check('1 the contents come from the navigation document: real titles in reading order, not «Розділ N»',
      "JSON.stringify(%s) === JSON.stringify(['First chapter','The deep section','<img src=x onerror=alert(1)>Second','Part without a link','Third','Notes outside the spine'])" % ITEMS)
check('1b only the toc nav is read, the landmarks nav is not mixed in', "!%s.includes('Landmark, not contents')" % ITEMS)
check('2 nesting is kept: sub-entries are one level deeper',
      "%s.dataset.depth === '0' && %s.dataset.depth === '1' && %s.dataset.depth === '1'" % (item('First chapter'), item('The deep section'), item('Third')))
check('3 a title is only text: markup inside it never becomes an element in the panel',
      "!els.toc.querySelector('img, b, script') && %s.textContent.startsWith('<img')" % item('<img src=x onerror=alert(1)>Second'))
check('4 a heading without a link and a link outside the reading order are shown but inert',
      "%s.classList.contains('disabled') && %s.classList.contains('disabled') && !%s.onclick" % (item('Part without a link'), item('Notes outside the spine'), item('Part without a link')))
check('5 the chapter being read is marked in the contents', "%s.classList.contains('current') && %s.getAttribute('aria-current') === 'true'" % (item('First chapter'), item('First chapter')))

c.js("%s.click(); 1" % item('<img src=x onerror=alert(1)>Second'))
check('6 an entry opens its chapter, and the mark moves with it',
      "state.currentIndex === 1 && /second chapter/.test(els.pages.textContent) && %s.classList.contains('current') && !%s.classList.contains('current')"
      % (item('<img src=x onerror=alert(1)>Second'), item('First chapter')), timeout=10)

c.js("%s.click(); 1" % item('The deep section'))
check('7 an entry pointing INTO a chapter opens it on the page that holds the anchor, not on its first page',
      """state.currentIndex === 0 && state.pageInChapter > 0 && (() => { const t = document.getElementById('book-deep'); const r = document.createRange(); r.selectNodeContents(t);
         return pageIndexForRange(r) === state.pageInChapter; })()""", timeout=10)
c.js("%s.click(); 1" % item('First chapter'))
check('7b ... and the chapter entry itself goes back to the chapter start', "state.currentIndex === 0 && state.pageInChapter === 0", timeout=10)

c.js("%s.click(); 1" % item('Part without a link'))
c.js('new Promise(r => setTimeout(r, 300))')
check('8 tapping an inert heading does nothing', "state.currentIndex === 0")

check('9 reading on with ‹ › still walks every file of the book, the contents only add a way in',
      "state.spine.length === 3 && state.totalPages === 3")

# ---------------------------------------------------------------- EPUB 2 toc.ncx
open_epub(EPUB2, 'ncx.epub')
check('10 an EPUB 2 book gets its contents from toc.ncx, nesting included',
      "JSON.stringify(%s) === JSON.stringify(['NCX one','NCX deep','NCX two','NCX three']) && %s.dataset.depth === '1'" % (ITEMS, item('NCX deep')))
check("10b the previous book's contents are gone", "!%s.some(t => /First chapter|Second/.test(t))" % ITEMS)
c.js("%s.click(); 1" % item('NCX deep'))
check('11 an NCX entry with an anchor lands on the anchor page too', "state.currentIndex === 0 && state.pageInChapter > 0", timeout=10)

# ---------------------------------------------------------------- both: the navigation document wins
open_epub(BOTH, 'both.epub')
check('12 with both, the EPUB 3 navigation document wins', "%s[0] === 'First chapter' && !%s.includes('NCX one')" % (ITEMS, ITEMS))

# ---------------------------------------------------------------- broken: the old list
open_epub(BROKEN, 'broken.epub')
check('13 a navigation document without contents falls back to the old list of files',
      "JSON.stringify(%s) === JSON.stringify(['Розділ 1','Розділ 2','Розділ 3'])" % ITEMS)
c.js("els.toc.children[2].click(); 1")
check('13b ... which still opens the chapters', "state.currentIndex === 2 && /third chapter/.test(els.pages.textContent)", timeout=10)

check('14 nothing threw', "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL EPUB TOC CHECKS PASSED')
