"""EPUB footnotes and internal links (owner, 2026-10-31: «починай виноски»).

Before: a «#id» link inside a chapter survived sanitizing but nothing handled a tap on it (the tap went to translating the
digit), a link into another file of the book (notes.xhtml#n1 — how most notes are made) was dropped by safeHtml, and the
noteref marker (epub:type) never reached the page. js/formats.js now rewrites every internal link BEFORE safeHtml into
an anchor safeHtml keeps; a note reference opens the note's text in a card beside it, other internal links go to their
place.

Checked on a synthetic book (no network), with study mode ON so a stray tap would show the translation popup: EPUB 3
noterefs into a notes file, Gutenberg «fnanchor» notes inside the chapter, and a bare superscript number all open their
note — and neither the translation popup nor a page turn happens; «Go to the note» opens the note in place; an ordinary
link into another chapter lands on its anchor page; a reference to a missing note opens no card; markup and script in a
note never run; Escape and a tap elsewhere close the card; and the chapter TEXT is unchanged by the rewrite, so saved
reading places keep pointing at the same characters.
"""
import base64, io, json, os, time, zipfile
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')


def epub(files, spine):
    buf = io.BytesIO()
    manifest = ''.join(f'<item id="i{i}" href="{n}" media-type="application/xhtml+xml"/>' for i, n in enumerate(files))
    with zipfile.ZipFile(buf, 'w') as z:
        z.writestr(zipfile.ZipInfo('mimetype'), 'application/epub+zip', compress_type=zipfile.ZIP_STORED)
        z.writestr('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">'
                   '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
        z.writestr('OEBPS/content.opf', '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id">'
                   '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">t</dc:identifier><dc:title>T</dc:title><dc:language>en</dc:language></metadata>'
                   f'<manifest>{manifest}</manifest><spine>' + ''.join(f'<itemref idref="i{list(files).index(n)}"/>' for n in spine) + '</spine></package>')
        for name, body in files.items():
            z.writestr('OEBPS/' + name, body)
    return buf.getvalue()


def xhtml(body):
    return ('<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">'
            f'<head><title>x</title></head><body>{body}</body></html>')


CH1_BODY = ('<h1>Chapter one</h1>'
            '<p id="start">The first claim<a epub:type="noteref" href="notes.xhtml#n1">1</a> and the second claim'
            '<a id="FNanchor_2" href="#Footnote_2" class="fnanchor">[2]</a> and the third claim<sup><a href="ch1.xhtml#n3">3</a></sup>'
            ' and a missing one<a epub:type="noteref" href="notes.xhtml#nope">4</a> and a bad one<a epub:type="noteref" href="notes.xhtml#n5">5</a>.'
            ' See <a href="ch2.xhtml#sec">the second chapter</a> for more.</p>'
            + ''.join(f'<p>Filler paragraph {i} with ordinary words for the page.</p>' for i in range(40))
            + '<div class="footnote"><p><a id="Footnote_2" href="#FNanchor_2"><span class="label">[2]</span></a> Second note inside the chapter.</p></div>'
            + '<p id="n3">Third note as a plain paragraph.</p>')
CH1 = xhtml(CH1_BODY)
CH2 = xhtml('<h1>Chapter two</h1>' + ''.join(f'<p>Second chapter paragraph {i} with words enough to fill pages.</p>' for i in range(90))
            + '<h2 id="sec">The section linked from chapter one</h2><p>Section text.</p>')
NOTES = xhtml('<h1>Notes</h1><aside epub:type="footnote" id="n1"><p>Note one text from the notes file.</p></aside>'
              '<aside epub:type="footnote" id="n5"><p>Bad <img src="x" onerror="window.__pwned=1"/> <script>window.__pwned=2</script>note text.</p></aside>')
BOOK = epub({'ch1.xhtml': CH1, 'ch2.xhtml': CH2, 'notes.xhtml': NOTES}, ['ch1.xhtml', 'ch2.xhtml', 'notes.xhtml'])

c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1280, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof rewriteEpubLinks==='function'", timeout=30)
c.js("showUpdateBanner = () => {}; window.__errors = []; addEventListener('error', e => __errors.push(e.message)); 1")
b64 = base64.b64encode(BOOK).decode()
c.js("""(() => { const bytes = Uint8Array.from(atob(%r), c => c.charCodeAt(0));
  const dt = new DataTransfer(); dt.items.add(new File([bytes], 'notes.epub', {type: 'application/epub+zip'}));
  const i = document.getElementById('file-upload'); i.files = dt.files; i.dispatchEvent(new Event('change')); return 1; })()""" % b64)
c.wait("state.format === 'epub' && /Chapter one/.test(els.pages.textContent)", timeout=40)
c.js('new Promise(r => setTimeout(r, 600))')
# Study mode ON: a tap that leaked to the reader would open the translation popup.
c.js("state.translateMode = true; speakText = () => {}; speakInLang = () => {}; aiAvailable = () => true; callAI = async () => '{\"direct\":\"x\"}'; machineTranslate = async () => ({html: '', extras: ''}); 1")


def check(name, expression, timeout=0):
    deadline = time.monotonic() + timeout
    result = c.js(expression)
    while result is not True and time.monotonic() < deadline:
        time.sleep(.1); result = c.js(expression)
    assert result is True, (name, result, c.js("JSON.stringify({idx: state.currentIndex, page: state.pageInChapter, note: (document.getElementById('epub-note')||{}).hidden, body: (document.querySelector('#epub-note .epub-note-body')||{}).textContent, tip: els.tooltip.style.display})"))
    print('PASS', name, flush=True)


def tap(text):
    """A real mouse click on the link whose text is `text` (the capture handler must win over the reader's own tap)."""
    c.js("document.getElementById('tt-close-btn')?.click(); els.tooltip.style.display = 'none'; 1")
    p = c.js("""(t => { const a = [...els.pages.querySelectorAll('a')].find(a => a.textContent.trim() === t); if (!a) return null;
      const r = a.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2}; })(%s)""" % json.dumps(text))
    assert p, ('link not on the page', text)
    for kind in ('mousePressed', 'mouseReleased'):
        c.call('Input.dispatchMouseEvent', type=kind, x=p['x'], y=p['y'], button='left', clickCount=1)
    c.js('new Promise(r => setTimeout(r, 400))')


NOTE_OPEN = "(() => { const b = document.getElementById('epub-note'); return !!b && !b.hidden; })()"
NOTE_TEXT = "(document.querySelector('#epub-note .epub-note-body') || {}).textContent || ''"
NO_TRANSLATION = "els.tooltip.style.display === 'none' || getComputedStyle(els.tooltip).display === 'none'"

check('1 every internal link is rewritten to an anchor safeHtml keeps; note references are told apart from ordinary links',
      """(() => { const hrefs = [...els.pages.querySelectorAll('a')].map(a => a.getAttribute('href'));
         const n = hrefs.filter(h => /^#book-epubref-n-/.test(h)).length, l = hrefs.filter(h => /^#book-epubref-l-/.test(h)).length;
         return (n === 5 && l === 2) || JSON.stringify({n, l, hrefs}); })()""")
check('1b the chapter TEXT is unchanged by the rewrite, so saved reading places keep pointing at the same characters',
      """(() => { const raw = new DOMParser().parseFromString(%s, 'text/html').body.textContent.replace(/\\s+/g, ' ').trim();
         const shown = els.pages.textContent.replace(/\\s+/g, ' ').trim(); return raw === shown || [raw.length, shown.length]; })()""" % json.dumps(CH1_BODY))

page0, idx0 = c.js('state.pageInChapter'), c.js('state.currentIndex')
tap('1')
check('2 a tap on an EPUB 3 noteref opens the note from the notes file in a card beside it', "%s && /Note one text from the notes file/.test(%s)" % (NOTE_OPEN, NOTE_TEXT), timeout=3)
check('2b ... in study mode the tap does NOT translate the digit, and the book does not move',
      "(%s) && state.currentIndex === %d && state.pageInChapter === %d" % (NO_TRANSLATION, idx0, page0))
check('2c the card is labelled and can be closed by a button with a name',
      "document.getElementById('epub-note-title').textContent === t('noteTitle') && document.querySelector('#epub-note .epub-note-close').getAttribute('aria-label') === t('tClose')")

c.js("document.querySelector('#epub-note .epub-note-go').click(); 1")
check('3 «Go to the note» opens the note in its place in the book, and the card closes',
      "state.currentIndex === 2 && /Note one text/.test(els.pages.textContent) && document.getElementById('epub-note').hidden", timeout=10)
c.js("loadEpubChapter(0); 1"); c.wait("state.currentIndex === 0 && /Chapter one/.test(els.pages.textContent)", timeout=10); c.js('new Promise(r => setTimeout(r, 400))')

tap('[2]')
check('4 a Gutenberg-style «fnanchor» note inside the chapter opens too', "%s && /Second note inside the chapter/.test(%s) && (%s)" % (NOTE_OPEN, NOTE_TEXT, NO_TRANSLATION), timeout=3)
c.js("document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'})); 1")
check('4b Escape closes the card', "document.getElementById('epub-note').hidden")

tap('3')
check('5 a bare superscript number pointing at a paragraph is a note too', "%s && /Third note as a plain paragraph/.test(%s)" % (NOTE_OPEN, NOTE_TEXT), timeout=3)
c.call('Input.dispatchMouseEvent', type='mousePressed', x=640, y=850, button='left', clickCount=1)
c.call('Input.dispatchMouseEvent', type='mouseReleased', x=640, y=850, button='left', clickCount=1)
c.js('new Promise(r => setTimeout(r, 300))')
check('5b a tap elsewhere closes the card', "document.getElementById('epub-note').hidden")
c.js("document.getElementById('tt-close-btn')?.click(); els.tooltip.style.display = 'none'; if (state.pageInChapter !== 0) goToPageInChapter(0, false); 1")
c.js('new Promise(r => setTimeout(r, 300))')

tap('5')
check('6 markup in a note is only shown: its image handler and script never run, no image or script reaches the card',
      "%s && /Bad\\s+note text/.test(%s) && !document.querySelector('#epub-note img, #epub-note script') && !window.__pwned" % (NOTE_OPEN, NOTE_TEXT), timeout=3)
c.js("document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'})); 1")

tap('4')
check('7 a reference to a note that is not in the book opens no card (it goes to the notes file instead)',
      "document.getElementById('epub-note').hidden && state.currentIndex === 2", timeout=10)
c.js("loadEpubChapter(0); 1"); c.wait("state.currentIndex === 0 && /Chapter one/.test(els.pages.textContent)", timeout=10); c.js('new Promise(r => setTimeout(r, 400))')

tap('the second chapter')
check('8 an ordinary link into another chapter lands on the page holding its anchor, with no card',
      """state.currentIndex === 1 && state.pageInChapter > 0 && document.getElementById('epub-note').hidden && (() => {
         const t = document.getElementById('book-sec'); const r = document.createRange(); r.selectNodeContents(t); return pageIndexForRange(r) === state.pageInChapter; })()""", timeout=10)

check('9 nothing threw', "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL EPUB NOTES CHECKS PASSED')
