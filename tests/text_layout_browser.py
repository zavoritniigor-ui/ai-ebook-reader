"""The look of the book text (owner: «Moon+ and KOReader have a font, line spacing, margins, alignment and hyphenation»).
Until now only the size (A-/A+) and the theme could be changed; the typeface, the interline, the page margins, the
justification and the hyphens were written into the CSS of index.html and could not be reached from the menu.

Checked here (no network): the five new menu rows change exactly their own CSS variable and nothing else; a fresh profile
looks EXACTLY as the hardcoded CSS used to (Georgia, 1.7, 56px margins, justified, hyphens on), so no reader's page
changes by itself after the update; every choice survives a reload and an unknown stored name falls back to the default
(nothing from storage ever reaches the stylesheet as text -- only the names in TEXT_LAYOUT are applied); a change
repaginates the book and keeps the reader at the same place in the text; the rows are hidden for a PDF and the PDF's own
text layer keeps its own font, alignment and hyphens; the switch is a real switch (role/aria-checked).
"""
import base64, os, time
from browser_cdp import CDP, pdf_bytes

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
KEYS = ('reader_text_font', 'reader_line_height', 'reader_margin', 'reader_align', 'reader_hyphens')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
# A computer-sized window: the base padding of #reader-container (56px) applies, not the phone/tablet media queries.
c.call('Emulation.setDeviceMetricsOverride', width=1400, height=900, deviceScaleFactor=1, mobile=False)

HELPERS = """window.__tl = {
    pad: () => Math.round(parseFloat(getComputedStyle(els.container).paddingLeft)),
    ratio: () => +(parseFloat(getComputedStyle(els.pages).lineHeight) / parseFloat(getComputedStyle(els.pages).fontSize)).toFixed(2),
    font: () => getComputedStyle(els.pages).fontFamily,
    align: () => getComputedStyle(els.pages).textAlign,
    hyphens: () => getComputedStyle(els.pages).hyphens || getComputedStyle(els.pages).webkitHyphens,
    layerFont: () => getComputedStyle(document.querySelector('.pdf-text-layer')).fontFamily,
    layerAlign: () => getComputedStyle(document.querySelector('.pdf-text-layer')).textAlign,
    layerHyphens: () => getComputedStyle(document.querySelector('.pdf-text-layer')).hyphens || getComputedStyle(document.querySelector('.pdf-text-layer')).webkitHyphens,
    row: (id) => document.getElementById(id).closest('.menu-row').offsetParent !== null
}; 1"""


def load(stored=None):
    """(Re)load the reader. `stored`: dict written BEFORE the app's scripts run ({} = a fresh profile)."""
    script = None
    if stored is not None:
        body = ';'.join(["localStorage.removeItem(%r)" % k for k in KEYS]
                        + ["localStorage.setItem(%r, %r)" % (k, v) for k, v in stored.items()])
        script = c.call('Page.addScriptToEvaluateOnNewDocument', source=body)['identifier']
    c.call('Page.navigate', url=URL)
    c.wait("document.readyState==='complete' && !document.body.inert && typeof applyTextLayout==='function' && typeof setTextLayout==='function'", timeout=30)
    if script:
        c.call('Page.removeScriptToEvaluateOnNewDocument', identifier=script)
    c.js("showUpdateBanner = () => {}; document.getElementById('sw-update-banner')?.remove(); window.__errors = []; addEventListener('error', e => __errors.push(e.message)); 1")
    c.js(HELPERS)


def check(name, expression, timeout=0):
    deadline = time.monotonic() + timeout
    result = c.js(expression)
    while result is not True and time.monotonic() < deadline:
        time.sleep(.1); result = c.js(expression)
    assert result is True, (name, result, c.js("JSON.stringify({pad: __tl.pad(), ratio: __tl.ratio(), font: __tl.font(), align: __tl.align(), hyphens: __tl.hyphens(), stored: Object.fromEntries(%s.map(k => [k, localStorage.getItem(k)])), format: state.format})" % list(KEYS)))
    print('PASS', name, flush=True)


def choose(select_id, value):
    c.js("(() => { const s = document.getElementById(%r); s.value = %r; s.dispatchEvent(new Event('change')); return 1; })()" % (select_id, value))
    c.js('new Promise(r => setTimeout(r, 120))')


def open_file(data, name, mime, ready):
    b64 = base64.b64encode(data).decode()
    c.js("""(() => { const bytes = Uint8Array.from(atob(%r), c => c.charCodeAt(0));
      const dt = new DataTransfer(); dt.items.add(new File([bytes], %r, {type: %r}));
      const i = document.getElementById('file-upload'); i.files = dt.files; i.dispatchEvent(new Event('change')); return 1; })()""" % (b64, name, mime))
    c.wait(ready, timeout=40); c.js('new Promise(r => setTimeout(r, 500))')


TXT = ('Chapter one. ' + 'An extraordinarily complicated interdisciplinary sentence for pagination. ' * 24 + '\n') * 40

# ---------------------------------------------------------------- the look nobody chose
load({})
check('1 a fresh profile keeps exactly the old hardcoded look: Georgia, 1.7, 56px margins, justified, hyphens on',
      "__tl.font().includes('Georgia') && __tl.ratio() === 1.7 && __tl.pad() === 56 && __tl.align() === 'justify' && __tl.hyphens() === 'auto'")
check('1b ... and nothing is stored until the reader chooses something',
      "%s.every(k => localStorage.getItem(k) === null)" % list(KEYS))
check('1c the five rows are in the Reading section, each with its own control',
      "['text-font','text-line','text-margin','text-align'].every(id => !!document.getElementById(id).closest('#app-header')) && document.getElementById('btn-hyphens').closest('.menu-section').querySelector('.menu-section-title').textContent === t('mSecReading')")

open_file(TXT.encode(), 'layout.txt', 'text/plain', "state.format === 'txt'")
pages = c.js('state.totalPagesInChapter')
assert isinstance(pages, int) and pages > 2, pages

# ---------------------------------------------------------------- each control moves its own property
choose('text-font', 'sans')
check('2 the font list changes the typeface of the book text and nothing else',
      "!__tl.font().includes('Georgia') && __tl.ratio() === 1.7 && __tl.pad() === 56 && localStorage.getItem('reader_text_font') === 'sans'")
choose('text-font', 'book')
check('2b «Book serif» asks for Palatino first and keeps a serif fallback', "__tl.font().includes('Palatino') && __tl.font().includes('serif')")

choose('text-line', 'loose')
check('3 the line-spacing list changes the interline only', "__tl.ratio() === 2.1 && __tl.pad() === 56 && localStorage.getItem('reader_line_height') === 'loose'")
choose('text-line', 'tight')
check('3b ... and the tight choice is tighter than the default 1.7', "__tl.ratio() === 1.35")

choose('text-margin', 'narrow')
check('4 the margins list changes the page padding only (56px -> 25px)', "__tl.pad() === 25 && __tl.ratio() === 1.35 && localStorage.getItem('reader_margin') === 'narrow'")
choose('text-margin', 'wide')
check('4b ... and the wide choice is wider than the default', "__tl.pad() === 90")

choose('text-align', 'left')
check('5 the alignment list drops justification, keeping the text direction of the book',
      "['start','left'].includes(__tl.align()) && __tl.hyphens() === 'auto' && localStorage.getItem('reader_align') === 'left'")

check('6 hyphenation is a real switch, on by default', "document.getElementById('btn-hyphens').getAttribute('role') === 'switch' && document.getElementById('btn-hyphens').getAttribute('aria-checked') === 'true'")
c.js("document.getElementById('btn-hyphens').click(); 1"); c.js('new Promise(r => setTimeout(r, 120))')
check('6b switching it off stops the hyphens and moves the switch, not the title',
      "__tl.hyphens() === 'manual' && document.getElementById('btn-hyphens').getAttribute('aria-checked') === 'false' && document.getElementById('btn-hyphens').querySelector('.mr-title').textContent === t('mHyphens') && localStorage.getItem('reader_hyphens') === 'manual'")

# ---------------------------------------------------------------- the book is repaginated, the reader stays put
choose('text-margin', 'normal'); choose('text-line', 'normal'); choose('text-font', 'serif'); choose('text-align', 'justify')
c.js("document.getElementById('btn-hyphens').click(); 1"); c.js('new Promise(r => setTimeout(r, 200))')
check('7 returning every list to its default returns the original look', "__tl.font().includes('Georgia') && __tl.ratio() === 1.7 && __tl.pad() === 56 && __tl.align() === 'justify' && __tl.hyphens() === 'auto'")
check('7b ... and the page count is the one the book had before any change', "state.totalPagesInChapter === %d" % pages, timeout=3)

c.js("goToPageInChapter(2, false); 1"); c.js('new Promise(r => setTimeout(r, 300))')
offset = c.js('state.bookTextOffset')
choose('text-line', 'loose')
check('8 a change repaginates the book (more spacing = more pages)', "state.totalPagesInChapter > %d" % pages, timeout=3)
check('8b ... and the reader is left at the same place in the text, not on the same page number',
      "state.bookTextOffset === %d" % offset, timeout=3)

# ---------------------------------------------------------------- what is stored, and what a bad value does
load({'reader_text_font': 'sans', 'reader_line_height': 'tight', 'reader_margin': 'wide', 'reader_align': 'left', 'reader_hyphens': 'manual'})
check('9 every choice survives a reload', "!__tl.font().includes('Georgia') && __tl.ratio() === 1.35 && __tl.pad() === 90 && ['start','left'].includes(__tl.align()) && __tl.hyphens() === 'manual'")
check('9b ... and the menu shows what is applied, not the defaults',
      "document.getElementById('text-font').value === 'sans' && document.getElementById('text-line').value === 'tight' && document.getElementById('text-margin').value === 'wide' && document.getElementById('text-align').value === 'left' && document.getElementById('btn-hyphens').getAttribute('aria-checked') === 'false'")

load({'reader_text_font': 'Comic Sans; color: red', 'reader_line_height': '99', 'reader_margin': 'calc(100px)', 'reader_align': 'center', 'reader_hyphens': 'none'})
check('10 a stored name that is not in TEXT_LAYOUT reads as the default: nothing from storage reaches the stylesheet',
      "__tl.font().includes('Georgia') && !__tl.font().includes('Comic') && __tl.ratio() === 1.7 && __tl.pad() === 56 && __tl.align() === 'justify' && __tl.hyphens() === 'auto'")
check('10b ... and a refused value is not silently kept as applied in the menu',
      "document.getElementById('text-font').value === 'serif' && document.getElementById('text-line').value === 'normal' && document.getElementById('text-margin').value === 'normal' && document.getElementById('text-align').value === 'justify'")

# ---------------------------------------------------------------- PDF has its own fixed layout
# The settings here are the ones a PDF must ignore: a sans typeface, justified text and hyphens on.
load({'reader_text_font': 'sans', 'reader_line_height': 'loose', 'reader_margin': 'narrow', 'reader_align': 'justify', 'reader_hyphens': 'auto'})
open_file(pdf_bytes(), 'layout.pdf', 'application/pdf', "state.format === 'pdf' && pdfContinuousReady")
c.js("openFullMenu(); 1"); c.js('new Promise(r => setTimeout(r, 450))')
check('11 for a PDF the five rows are hidden (the page has its own layout), the PDF fit row is shown',
      "['text-font','text-line','text-margin','text-align','btn-hyphens'].every(id => !__tl.row(id)) && __tl.row('pdf-fit')")
check('11b the chosen typeface never reaches the PDF text layer: it keeps the application\'s own font',
      "__tl.layerFont() === getComputedStyle(document.body).fontFamily && __tl.layerFont() !== getComputedStyle(document.body).getPropertyValue('--reader-font').trim()")
check('11c the PDF text layer is never justified and never hyphenated, although the book text is both',
      "__tl.align() === 'justify' && __tl.layerAlign() !== 'justify' && __tl.hyphens() === 'auto' && __tl.layerHyphens() === 'manual'")
c.js("closeFullMenu(); 1")
open_file(TXT.encode(), 'layout.txt', 'text/plain', "state.format === 'txt'")
check('11d back in a text book the reader\'s own choices are applied again', "__tl.pad() === 25 && __tl.ratio() === 2.1 && !__tl.font().includes('Georgia')")

check('12 nothing threw', "__errors.length === 0 || JSON.stringify(__errors)")
# CI runs every suite in ONE browser profile: leave the default look, later suites measure real geometry.
load({})
check('13 cleanup: the next suite finds the default look', "__tl.pad() === 56 && __tl.ratio() === 1.7 && __tl.align() === 'justify' && %s.every(k => localStorage.getItem(k) === null)" % list(KEYS))
print('ALL TEXT LAYOUT CHECKS PASSED')
