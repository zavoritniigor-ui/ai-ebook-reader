"""Format compatibility audit: DOCX, TXT, HTML/HTM and RTF had ZERO automated
regression coverage before this suite (only FB2/FB2.ZIP/EPUB/Markdown were
covered by tests/formats_browser.py, and PDF by the pdf_*_browser.py suites) —
found while tracing the app's complete supported-format list (js/main.js's
openBookFile() extension router, index.html's <input accept=>, FORMAT_SUPPORT.md)
against what actually had a test. This suite closes that gap and fixes two real
bugs found while writing it:

1. HTML/HTM title leak + spurious blank first "chapter" (real, common case: any
   full saved webpage, which is the NORMAL shape of a .html file people actually
   have — not a body-only fragment). initRichDoc() used to pass the raw file text
   straight into safeHtml(), whose allowlist neither renders NOR drops <title> —
   it falls into the "not a content tag, walk its children" branch, so a title's
   own TEXT content silently became visible reader content. Because the leaked
   title text sits before the document's first real heading, splitIntoChapters()
   (which starts a new chapter at every heading) turned it into an entire
   separate first "chapter" — the reader opened directly on a near-blank page
   showing only the leaked title, with the real content one chapter further in.
   Fixed in two places: js/formats.js's HTML/HTM branch now parses the file with
   DOMParser and keeps only .body.innerHTML (mirroring how loadEpubChapter()
   already handles real XHTML spine documents, for the identical reason), and
   core.js's safeHtml() sanitizer now drops <title> outright as defense in depth.

2. splitIntoChapters() started a new chapter at a heading even when everything
   accumulated so far was insignificant whitespace (a single "\\n" text node
   between <body> and its first <h1> — extremely common in hand-formatted or
   exported HTML). That produced a spurious whitespace-only first "chapter" the
   reader opened on, independent of the title-leak bug above (bug #1 made this
   reproduce on the FIRST heading of nearly every real HTML file; this fix is
   the actual, general-purpose correction). Now a heading only closes out the
   PREVIOUS chapter if that chapter has some non-whitespace content.

3. initTxt() had no "empty file" guard, unlike every other format's
   initRichDoc() path (which all throw emptyDoc for blank content) — an empty
   .txt used to silently "succeed" into a blank single-page reader instead of
   the same clear error every other unusable file gets. Fixed for consistency.

Also traces and confirms (not bugs, verified as already correct): extension
routing is case-insensitive and compound-extension-aware (.TXT, .Md, .FB2.ZIP
all route correctly); filenames with spaces and Ukrainian/Polish characters
work; RTF's DOCUMENTED "plain text only, no bold/italic/image" limitation
(FORMAT_SUPPORT.md) holds -- this is intentional, not tested as a bug; error
handling for empty/corrupted/extension-mismatched/unsupported files is already
robust across every format (clear localized message, state fully resets,
document.body never left inert, no uncaught JS errors) -- this suite adds
DOCX/TXT/HTML/RTF instances of that same matrix alongside the ones
tests/formats_browser.py already covers for FB2/EPUB.

DOCX fixtures are minimal, hand-built OOXML (no python-docx available, and per
the audit's own "don't add unnecessary binary fixtures" instruction, generating
deterministic zip/XML in-memory matches this project's existing convention for
EPUB/FB2.ZIP fixtures in tests/formats_browser.py) -- covering a heading,
bold/italic runs, an external hyperlink, and an embedded raster image (the
minimum real-document shape mammoth.js needs to exercise its actual conversion
paths, not a stub).
"""
import base64, io, json, os, zipfile
from browser_cdp import CDP

c = CDP(); c.call('Network.enable'); c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Page.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.navigate', url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert")
# The DOCX reopen/persistence check deliberately re-uploads the same filename
# with a saved bookmark still present -- but that same filename/lastModified
# must not pick up a STALE bookmark from an earlier run of this file against
# the same browser profile (harmless in a fresh CI profile, but real when
# iterating locally, or if another suite happened to use the same name).
c.js("localStorage.clear()")


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def upload(name, data):
    if isinstance(data, str): data = data.encode()
    c.js(f"openBookFile(new File([Uint8Array.from(atob({json.dumps(base64.b64encode(data).decode())}),c=>c.charCodeAt(0))],{json.dumps(name)},{{lastModified:123}}))")


# One proven-decodable 1x1 PNG, reused from tests/formats_browser.py's own fixture.
PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZ0AAAAASUVORK5CYII='
PNG_HEX = base64.b64decode(PNG_B64).hex()


def minimal_docx(paragraphs_xml, with_image=False):
    """A minimal, real, mammoth-parseable OOXML .docx: heading styles, an
    external-hyperlink relationship, and (optionally) one embedded raster image
    wired through the full wp:inline/a:graphic/pic:pic/wp:docPr chain mammoth's
    readBlip() actually requires (element.first('wp:docPr').attributes -- a bare
    pic:blipFill with no wp:docPr sibling throws, discovered empirically while
    building this fixture)."""
    content_types = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        + ('<Default Extension="png" ContentType="image/png"/>' if with_image else '') +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
        '</Types>')
    root_rels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        '</Relationships>')
    doc_rels_items = ['<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>']
    if with_image:
        doc_rels_items.append('<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>')
    doc_rels_items.append('<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com/" TargetMode="External"/>')
    doc_rels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + ''.join(doc_rels_items) + '</Relationships>')
    styles_xml = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:outlineLvl w:val="0"/></w:pPr></w:style>'
        '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:outlineLvl w:val="1"/></w:pPr></w:style>'
        '</w:styles>')
    document_xml = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
        'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
        'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
        'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        '<w:body>' + paragraphs_xml + '<w:sectPr/></w:body></w:document>')
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', content_types)
        z.writestr('_rels/.rels', root_rels)
        z.writestr('word/document.xml', document_xml)
        z.writestr('word/styles.xml', styles_xml)
        z.writestr('word/_rels/document.xml.rels', doc_rels)
        if with_image:
            z.writestr('word/media/image1.png', bytes.fromhex(PNG_HEX))
    return buf.getvalue()


# ============================== DOCX ========================================
docx_paragraphs = (
    '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Розділ 1: Zażółć</w:t></w:r></w:p>'
    '<w:p><w:r><w:t xml:space="preserve">Plain text with </w:t></w:r>'
    '<w:r><w:rPr><w:b/></w:rPr><w:t>bold bonjour</w:t></w:r><w:r><w:t xml:space="preserve"> and </w:t></w:r>'
    '<w:r><w:rPr><w:i/></w:rPr><w:t>italic café</w:t></w:r>'
    '<w:r><w:t xml:space="preserve">. Polish: zażółć gęślą jaźń. English: &quot;quoted text&quot; and it&apos;s fine.</w:t></w:r></w:p>'
    '<w:p><w:r><w:t xml:space="preserve">Link: </w:t></w:r>'
    '<w:hyperlink r:id="rId3"><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>example.com</w:t></w:r></w:hyperlink></w:p>'
    '<w:p><w:r><w:drawing><wp:inline><wp:extent cx="304800" cy="304800"/>'
    '<wp:docPr id="1" name="pic.png" descr="A tiny illustration"/>'
    '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
    '<pic:pic><pic:blipFill><a:blip r:embed="rId2"/></pic:blipFill>'
    '<pic:spPr><a:xfrm><a:ext cx="304800" cy="304800"/></a:xfrm></pic:spPr></pic:pic>'
    '</a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'
    '<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Section 2</w:t></w:r></w:p>'
    '<w:p><w:r><w:t>Mixed: Привіт, cześć, hello — three languages одному реченні.</w:t></w:r></w:p>'
)
upload('fixture.docx', minimal_docx(docx_paragraphs, with_image=True))
check('DOCX imports and renders heading/bold/italic', "state.format==='txt' && !!els.pages.querySelector('h1') && els.pages.querySelector('strong').textContent==='bold bonjour' && els.pages.querySelector('em').textContent==='italic café'")
check('DOCX chapter 1 preserves Ukrainian/Polish text and punctuation', "els.pages.textContent.includes('Zażółć') && els.pages.textContent.includes('zażółć gęślą jaźń') && els.pages.textContent.includes('\"quoted text\"') && els.pages.textContent.includes(\"it's fine\")")
c.js("renderDocChapter(1)")
check('DOCX chapter 2 preserves mixed-language text', "els.pages.textContent.includes('Привіт, cześć, hello')")
c.js("renderDocChapter(0)")
check('DOCX external hyperlink renders safely (target=_blank, rel=noopener)', "(()=>{const a=els.pages.querySelector('a[href=\"https://example.com/\"]');return !!a && a.target==='_blank' && a.rel.includes('noopener')})()")
check('DOCX embedded image decodes with alt text, no pagination break', "(()=>{const img=els.pages.querySelector('img');return !!img && img.alt==='A tiny illustration' && img.src.startsWith('data:image/png;base64,')})()")
check('DOCX headings split into separate chapters (TOC works)', 'state.totalPages===2')
check('DOCX TTS extraction is clean prose, no HTML/entities leaking', "(()=>{const t=state.extractedTextForTTS;return !t.includes('<') && !t.includes('&quot;') && !t.includes('&amp;') && t.includes('bold bonjour') && t.includes('italic café')})()")

# Reopen/persistence: navigate into chapter 2, "reload" (fresh openBookFile call
# with the identical name/size/lastModified -- what bookKeyFor() keys on), and
# confirm the saved chapter is restored.
c.js("renderDocChapter(1)")
before_idx = c.js("state.currentIndex")
assert before_idx == 1, before_idx
upload('fixture.docx', minimal_docx(docx_paragraphs, with_image=True))
check('DOCX reopen restores the last chapter (persistence)', 'state.currentIndex===1')

# ============================== TXT =========================================
txt_content = ('Перший рядок українською.\n'
               'Drugi wiersz po polsku: zażółć gęślą jaźń.\n'
               'Third line in English with "quotes" and it\'s fine.\n'
               'Mixed: Привіт, cześć, hello!\n' +
               '\n'.join(f'Line {i}: filler text to make this a multi-page file.' for i in range(200)))
upload('Українська книга з пробілами.txt', txt_content)
check('TXT imports with a Ukrainian filename containing spaces', "state.format==='txt'")
check('TXT preserves Ukrainian/Polish/English/mixed text exactly', "els.pages.textContent.includes('Перший рядок українською') && els.pages.textContent.includes('zażółć gęślą jaźń') && els.pages.textContent.includes('Mixed: Привіт, cześć, hello!')")
check('TXT large-enough file paginates into multiple blocks', 'state.totalPages>1')
upload('BOOK.TXT', 'Uppercase extension still routes to the text reader.')
check('TXT uppercase .TXT extension is routed correctly', "state.format==='txt' && els.pages.textContent.includes('Uppercase extension')")
upload('empty.txt', '')
check('TXT empty file fails gracefully with a clear message (regression, was silently blank before)', 'state.format===null && els.pages.textContent.length>0')
check('TXT empty file: state fully reset, no broken UI', 'state.format===null && !document.body.inert')

# ============================== HTML / HTM ==================================
# The realistic case: a FULL saved webpage, not a bare fragment -- this is what
# actually broke (see module docstring, bugs #1 and #2).
full_html = ('<!DOCTYPE html><html lang="uk"><head><meta charset="utf-8">'
             '<title>Секретний заголовок що не повинен бути видимим</title>'
             '<meta name="description" content="hidden meta">'
             '<style>body{color:red}</style><script>window.__htmlScriptRan=true;</script></head>'
             '<body>\n<h1>Видимий заголовок</h1>\n'
             '<p>Paragraph with <b>bold</b> and <i>italic</i> and Ukrainian: Привіт, світ! '
             'Polish: zażółć gęślą jaźń.</p>\n'
             '<ul><li>Item one</li><li>Item two</li></ul>\n'
             f'<img src="data:image/png;base64,{PNG_B64}" alt="alt text must not leak into TTS">\n'
             '</body></html>')
c.js("window.__htmlScriptRan=false")
upload('page.html', full_html)
check('HTML: <title> text does not leak into visible content (regression)', "!els.pages.textContent.includes('Секретний заголовок')")
check('HTML: real content (h1/p/ul/img) is NOT pushed to a second chapter (regression)', 'state.totalPages===1')
check('HTML: heading and paragraph render correctly with formatting', "!!els.pages.querySelector('h1') && els.pages.querySelector('h1').textContent==='Видимий заголовок' && !!els.pages.querySelector('b') && !!els.pages.querySelector('i')")
check('HTML: list items render', "els.pages.querySelectorAll('li').length===2")
check('HTML: Ukrainian/Polish text preserved', "els.pages.textContent.includes('Привіт, світ!') && els.pages.textContent.includes('zażółć gęślą jaźń')")
check('HTML: embedded image renders', "!!els.pages.querySelector('img[alt=\"alt text must not leak into TTS\"]')")
check('HTML: <script> never executes (sanitizer holds for a full document upload)', 'window.__htmlScriptRan===false')
check('HTML: <style>/<script>/<meta> content does not leak as visible text', "!els.pages.textContent.includes('hidden meta') && !els.pages.textContent.includes('color:red')")
check('HTML: TTS extraction is the real content, not the title, and excludes img alt', "(()=>{const t=state.extractedTextForTTS;return t.startsWith('Видимий заголовок') && !t.includes('Секретний') && !t.includes('must not leak')})()")

# A bare fragment (no <html>/<head>/<body> at all) must still work exactly as
# before -- the DOMParser body-extraction fix must not regress this common case.
upload('fragment.htm', '<h1>Fragment Heading</h1><p>Fragment paragraph, Привіт.</p>')
check('HTML: a bare body-only fragment (.htm) still renders correctly', "state.format==='txt' && state.totalPages===1 && !!els.pages.querySelector('h1') && els.pages.textContent.includes('Привіт')")

# ============================== RTF ==========================================
def rtf_u_escape(s):
    return ''.join(ch if ord(ch) < 128 else f'\\u{ord(ch)}?' for ch in s)

rtf_uk = rtf_u_escape('Привіт, світе!')
rtf_pl = rtf_u_escape('zażółć gęślą jaźń')
rtf = (r'{\rtf1\ansi\deff0{\fonttbl{\f0\froman Times New Roman;}{\f1\fswiss Arial;}}'
       r'{\colortbl;\red0\green0\blue0;\red255\green0\blue0;}{\stylesheet{\s0 Normal;}}'
       r'{\*\generator Microsoft Word;}\f0\fs24 '
       r'Plain paragraph with \b bold text\b0  and \i italic text\i0 .\par ' +
       rtf_uk + r'\par ' + rtf_pl + r"\par English with 'apostrophe' punctuation.\par}")
upload('fixture.rtf', rtf.encode('latin-1', errors='replace'))
check('RTF imports and extracts readable paragraphs', "state.format==='txt' && els.pages.querySelectorAll('p').length===4")
check('RTF strips font/color/stylesheet/generator header junk (no "Times New Roman" leaking)', "!els.pages.textContent.includes('Times New Roman') && !els.pages.textContent.includes('fonttbl') && !els.pages.textContent.includes('Microsoft Word')")
check('RTF decodes \\\\u Unicode escapes correctly (Ukrainian)', "els.pages.textContent.includes('Привіт, світе!')")
check('RTF decodes \\\\u Unicode escapes correctly (Polish)', "els.pages.textContent.includes('zażółć gęślą jaźń')")
check("RTF preserves apostrophes", "els.pages.textContent.includes(\"'apostrophe'\")")
check('RTF: bold/italic control words are stripped along with formatting (documented limitation, not a bug)', "els.pages.textContent.includes('bold text') && !els.pages.querySelector('b') && !els.pages.querySelector('strong')")

# ============================== DEVICE / VIEWPORT MATRIX ====================
# Emulation only -- NOT a substitute for a real Android device (no real touch
# input latency, GPU compositing quirks, or OS-level memory pressure). Exercised
# against DOCX (the richest of the four newly-covered formats: headings, inline
# formatting, an image, multi-chapter split) as a representative sample rather
# than the full format x viewport product, which would be prohibitively slow
# for marginal additional signal -- the rendering/pagination pipeline these
# formats share with EPUB/FB2/Markdown is already viewport-tested there.
big_docx_paragraphs = (
    '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Viewport chapter</w:t></w:r></w:p>'
    + ''.join(f'<w:p><w:r><w:t>Paragraph {i}. A readable sentence with several words in it, repeated for length. </w:t></w:r></w:p>' for i in range(60))
)
upload('viewport.docx', minimal_docx(big_docx_paragraphs, with_image=False))
check('DOCX baseline (desktop viewport) paginates into multiple pages', 'state.totalPagesInChapter>1')

c.call('Emulation.setDeviceMetricsOverride', width=390, height=844, deviceScaleFactor=3, mobile=True)
check('DOCX phone-portrait viewport: still renders, valid page state', "state.format==='txt' && state.pageInChapter>=0 && state.pageInChapter<state.totalPagesInChapter && els.pages.textContent.includes('Viewport chapter')")

c.call('Emulation.setDeviceMetricsOverride', width=844, height=390, deviceScaleFactor=3, mobile=True)
check('DOCX phone-landscape viewport: still renders, valid page state', "state.format==='txt' && state.pageInChapter>=0 && state.pageInChapter<state.totalPagesInChapter")

c.call('Emulation.setDeviceMetricsOverride', width=810, height=1080, deviceScaleFactor=2, mobile=True)
check('DOCX tablet-portrait viewport: still renders, valid page state', "state.format==='txt' && state.pageInChapter>=0 && state.pageInChapter<state.totalPagesInChapter")

c.call('Emulation.setDeviceMetricsOverride', width=1080, height=810, deviceScaleFactor=2, mobile=True)
document_body_immersive_before = c.js("document.body.classList.contains('immersive-mode')")
c.js("document.body.classList.toggle('immersive-mode')")
check('DOCX tablet-landscape + immersive-mode toggle: still renders, valid page state, no crash', "state.format==='txt' && state.pageInChapter>=0 && state.pageInChapter<state.totalPagesInChapter && !document.body.inert")
c.js(f"document.body.classList.toggle('immersive-mode', {json.dumps(document_body_immersive_before)})")

c.call('Emulation.setDeviceMetricsOverride', width=1280, height=800, deviceScaleFactor=1, mobile=False)
check('DOCX back to desktop viewport: content and page position still consistent', "state.format==='txt' && state.pageInChapter>=0 && state.pageInChapter<state.totalPagesInChapter")

# ============================== ERROR HANDLING ===============================
def try_bad(label, name, data):
    upload(name, data)
    result = c.js("({format: state.format, inert: document.body.inert, shown: els.pages.textContent.length>0})")
    assert result['format'] is None and result['inert'] is False and result['shown'] is True, (label, result)
    print('PASS', label, flush=True)

try_bad('DOCX: empty file fails gracefully', 'empty.docx', '')
try_bad('DOCX: extension does not match content (plain text, not a zip)', 'fake.docx', 'This is not a real docx zip container.')
upload('weird.html', bytes([0, 159, 146, 150]))
check('HTML: garbage bytes with a mismatched extension degrade gracefully (text-shaped formats have no stronger content signature to validate, unlike PDF/DOCX/EPUB above) -- no crash, no broken state, replacement-character text shown', "state.format==='txt' && !document.body.inert && els.pages.textContent.length>0")
try_bad('RTF: empty file fails gracefully', 'empty.rtf', '')
try_bad('unsupported extension is rejected with a clear message', 'file.xyz', 'hello world')
try_bad('no extension at all is rejected with a clear message', 'noextension', 'hello world')

check('no application errors accumulated across this whole run', "typeof window.__errors==='undefined' || window.__errors.length===0")
print('ALL RICH TEXT FORMAT CHECKS PASSED', flush=True)
