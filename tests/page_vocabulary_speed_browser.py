"""Tapping a word in a BIG chapter (library books: Pride and Prejudice has a 130k-character chapter) must not freeze the
page: the reading statistics used to re-read the whole chapter and measure every word's position on each tap and page
turn (0.5 s on a desktop before the translation popup appeared, seconds on a tablet). The fast page-word detection must
give exactly the same words as the full per-word check on every page, phone and tablet sizes, also with an element that
overflows its column, and measure far fewer positions than there are words. No network."""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(120)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


FULL = r"""(() => { const model = readableTextModel(); const toks = vocabularyTokens(model.text, pageLang().slice(0, 2));
  return toks.filter(t => { const pieces = [];
    for (const seg of model.segments) { const f = Math.max(t.start, seg.start), to = Math.min(t.end, seg.end); if (to > f) pieces.push({node: seg.node, start: f - seg.start, end: to - seg.start}); }
    return tokenIsOnCurrentPage(pieces); }).map(t => t.start + ':' + normalizedLearningWord(t.word)); })"""

BOOK = r"""(() => { const words = 'the morning was cold and every window of the house looked out on a grey garden where nobody walked'.split(' ');
  let html = '<html lang="en"><body><div><h1>Chapter</h1>';
  for (let p = 0; p < 2000; p++) {
    let s = ''; for (let w = 0; w < 28; w++) s += words[(p * 7 + w * 3) % words.length] + (w % 9 === 8 ? '. ' : ' ');
    html += '<p>' + s + '<em>' + words[p % words.length] + '</em> end.</p>';
    if (p === 40) html += '<table style="width:1600px"><tr><td>' + 'wide table cell text '.repeat(40) + '</td></tr></table>';
    if (p === 300) html += '<pre>' + 'a very long preformatted line that never wraps '.repeat(20) + '</pre>';
  }
  return html + '</div></body></html>'; })()"""

for width, height in [(1180, 820), (390, 844)]:
    c.call('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=1, mobile=width < 600)
    c.call('Page.navigate', url=URL)
    c.wait("document.readyState==='complete' && !document.body.inert && typeof openBookFile==='function'", timeout=30)
    c.js("localStorage.clear(); window.__ok = 0; openBookFile(new File([%s], 'big.html', {type: 'text/html', lastModified: %d})).then(() => { window.__ok = 1; }); 1" % (BOOK, width))
    c.wait("window.__ok === 1 && els.pages.textContent.length > 100000", timeout=60); time.sleep(0.8)
    mismatches, pages = [], 0
    for step in range(25):
        r = json.loads(c.js("JSON.stringify({fast: currentPageVocabulary().words.map(w => w.id), full: %s(), page: state.pageInChapter})" % FULL))
        pages += 1
        if r['fast'] != r['full'] or not r['full']: mismatches.append((r['page'], len(r['fast']), len(r['full'])))
        c.js("for (let i = 0; i < 3; i++) goNext(); 1"); time.sleep(0.5)
    assert not mismatches, mismatches
    print('PASS %dx%d: the page words equal the full per-word check on %d pages' % (width, height, pages), flush=True)
    counts = json.loads(c.js("""(() => { currentPageVocabulary(); let n = 0; const R = Range.prototype, gb = R.getBoundingClientRect, gc = R.getClientRects;
      R.getBoundingClientRect = function () { n++; return gb.call(this); }; R.getClientRects = function () { n++; return gc.call(this); };
      try { currentPageVocabulary(); } finally { R.getBoundingClientRect = gb; R.getClientRects = gc; }
      return JSON.stringify({measures: n, tokens: vocabularyTokens(readableTextModel().text).length}); })()"""))
    print('   layout measurements per call', counts, flush=True)
    assert counts['measures'] * 5 < counts['tokens'], counts
    print('PASS %dx%d: a page needs far fewer position measurements than there are words in the chapter' % (width, height), flush=True)

check('chapter text model is linear (no quadratic string scans): 4x text costs < 8x time', """(() => {
  const T = () => { const t0 = performance.now(); readableTextModel(); return performance.now() - t0; };
  const one = Math.max(1, T()); const extra = [...els.pages.querySelectorAll('p')]; const host = extra[0].parentElement;
  for (let k = 0; k < 3; k++) extra.forEach(p => host.appendChild(p.cloneNode(true)));
  const four = T(); return four < one * 8 + 20; })()""")
print('ALL PASS')
