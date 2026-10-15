"""Highlights and notes in text books (js/book-marks.js): a real tap on a word, then 📝 in the translation popup highlights the
word's sentence (CSS Custom Highlight, the book DOM is untouched) and opens a note field; the note is kept per book and survives
reopening the book; tapping inside a highlight opens its note again; an explicit selection is highlighted as selected; the
sidebar lists the highlights (quote → jumps to it, also from another chapter; note editable; 🗑 removes); PDF has no 📝.
No network."""
import io, json, os, time, zipfile, base64
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1280, height=850, deviceScaleFactor=1, mobile=False)
READY = "document.readyState==='complete' && !document.body.inert && typeof openBookFile==='function'"


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.2); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def arch(files):
    o = io.BytesIO()
    with zipfile.ZipFile(o, 'w') as z:
        for n, d in files.items(): z.writestr(n, d)
    return o.getvalue()


SENT = 'Le chat noir dort sur le tapis rouge.'
EPUB = arch({'META-INF/container.xml': '<container><rootfiles><rootfile full-path="OPS/p.opf"/></rootfiles></container>',
             'OPS/p.opf': '<package><manifest><item id="a" href="a.xhtml"/><item id="b" href="b.xhtml"/></manifest><spine><itemref idref="a"/><itemref idref="b"/></spine></package>',
             'OPS/a.xhtml': '<html><body><h1>Un</h1><p>Il fait beau. ' + SENT + ' Puis il se réveille.</p><p>Marie lit un livre dans le jardin.</p></body></html>',
             'OPS/b.xhtml': '<html><body><h1>Deux</h1><p>Le deuxième chapitre commence ici.</p></body></html>'})
B64 = base64.b64encode(EPUB).decode()


def open_book():
    c.js("window.__ok = 0; openBookFile(new File([Uint8Array.from(atob(%s), ch => ch.charCodeAt(0))], 'marks.epub', {type: 'application/epub+zip', lastModified: 77})).then(() => { window.__ok = 1; }); 1" % json.dumps(B64))
    c.wait("window.__ok === 1", timeout=30); time.sleep(1.2)
    c.js("aiAvailable = () => false; translateLocally = async () => null; machineTranslate = async (t) => ({html: 'TR-' + t, plain: 'TR-' + t, extras: ''}); if (!state.translateMode) els.translateBtn.click(); 1")


def word_xy(word):
    return c.js("""(w => { const it = document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT); let n;
      while ((n = it.nextNode())) { const i = n.nodeValue.indexOf(w); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + w.length);
        const b = r.getBoundingClientRect(); if (b.width) return {x: b.left + b.width / 2, y: b.top + b.height / 2}; } } return null; })(%s)""" % json.dumps(word))


def tap(word):
    p = word_xy(word)
    assert p, word
    for kind in ('mousePressed', 'mouseReleased'):
        c.call('Input.dispatchMouseEvent', type=kind, x=p['x'], y=p['y'], button='left', clickCount=1)
    time.sleep(0.9)


c.call('Page.navigate', url=URL); c.wait(READY, timeout=30)
c.js("localStorage.clear(); localStorage.setItem('reader_onboarding_done','1'); 1"); c.call('Page.reload'); c.wait(READY, timeout=30); time.sleep(0.4)
open_book()
check('1 the translation popup has a 📝 button', "!!document.getElementById('tt-mark-btn') && document.getElementById('tt-mark-btn').title === t('tMark')")
tap('noir')
check('2 a real tap on «noir» opens the popup', "els.tooltip.style.display === 'flex' && els.ttOriginal.textContent === 'noir'", timeout=3)
c.js("document.getElementById('tt-mark-btn').click(); 1"); time.sleep(0.4)
check('3 📝 highlights the WHOLE sentence of the tapped word, without changing the book DOM',
      "currentBookMarks().length === 1 && currentBookMarks()[0].text === %s && CSS.highlights.has('book-mark') && !els.pages.querySelector('mark, .book-mark')" % json.dumps(SENT))
check('4 …and opens the note field in the popup', "!document.getElementById('tt-mark-host').hidden && state.tooltipPersistent === true")
c.js("(() => { const a = document.getElementById('tt-mark-note'); a.value = 'Нотатка про кота'; a.dispatchEvent(new Event('input')); return 1; })()")
check('5 the note is saved for this book', "JSON.parse(localStorage.getItem('reader_marks_v1:' + state.bookKey))[0].note === 'Нотатка про кота'")
check('6 the sidebar lists it: the quote and the note', """(li => !!li && li.querySelector('.mark-quote').textContent === %s && li.querySelector('.mark-note').value === 'Нотатка про кота')
      (document.querySelector('#marks-list .mark-item'))""" % json.dumps(SENT))

c.call('Page.reload'); c.wait(READY, timeout=30); time.sleep(0.4)
open_book()
check('7 after reopening the book the highlight is painted again and listed', "CSS.highlights.has('book-mark') && document.querySelectorAll('#marks-list .mark-item').length === 1", timeout=3)
tap('tapis')
check('8 tapping inside the highlight opens its note', "!document.getElementById('tt-mark-host').hidden && document.getElementById('tt-mark-note').value === 'Нотатка про кота'", timeout=3)
tap('Marie')
check('9 a tap elsewhere has no note field', "document.getElementById('tt-mark-host').hidden", timeout=3)

c.js("""(() => { const it = document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT); let n; while ((n = it.nextNode())) { const i = n.nodeValue.indexOf('un livre');
  if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 8); const b = r.getBoundingClientRect(); selectRangeAndTranslate(r, b.left + 4, b.top + 4, 'phrase_translation'); return 1; } } return 0; })()""")
time.sleep(0.8)
c.js("document.getElementById('tt-mark-btn').click(); 1"); time.sleep(0.4)
check('10 an explicit selection is highlighted exactly as selected', "currentBookMarks().length === 2 && currentBookMarks()[1].text === 'un livre'")

c.js("goNext(); 1"); time.sleep(0.2)
c.js("loadEpubChapter(1); 1")
check('11 (in chapter 2 nothing from chapter 1 is painted)', "state.currentIndex === 1 && !CSS.highlights.has('book-mark')", timeout=6)
c.js("document.querySelector('#marks-list .mark-item .mark-quote').click(); 1")
check('12 the quote in the list goes back to chapter 1, on the page that holds the highlight',
      "state.currentIndex === 0 && CSS.highlights.has('book-mark') && pageForBookTextOffset(currentBookMarks()[0].start) === state.pageInChapter", timeout=8)
c.js("document.querySelector('#marks-list .mark-item .mark-del').click(); 1"); time.sleep(0.3)
check('13 🗑 removes it (storage, list, painting keeps only the other one)',
      "currentBookMarks().length === 1 && currentBookMarks()[0].text === 'un livre' && document.querySelectorAll('#marks-list .mark-item').length === 1 && CSS.highlights.get('book-mark').size === 1")
c.js("document.querySelector('#marks-list .mark-item .mark-del').click(); 1"); time.sleep(0.3)
check('14 with none left the list says how to add one and storage is clean',
      "!CSS.highlights.has('book-mark') && document.querySelector('#marks-list .marks-empty').textContent === t('marksEmpty') && localStorage.getItem('reader_marks_v1:' + state.bookKey) === null")
check('15 another book starts with no highlights', """(async () => { await openBookFile(new File(['# Autre\\n\\nUn autre livre.'], 'autre.md', {lastModified: 5})); await new Promise(r => setTimeout(r, 800));
      return currentBookMarks().length === 0 && !CSS.highlights.has('book-mark'); })()""")
check('16 PDF mode hides 📝 (PDF has its own ✍️ writing)', "(() => { document.body.classList.add('pdf-mode'); const hidden = getComputedStyle(document.getElementById('tt-mark-btn')).display === 'none'; document.body.classList.remove('pdf-mode'); return hidden; })()")
print('ALL PASS')
