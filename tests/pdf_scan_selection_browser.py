"""A long selection in a SCANNED PDF must highlight every word between its two ends (user report: "when selecting it skips
words, for one or two sentences it works fine", with a screenshot of an Internet Archive book).

Root causes found on a real scan (Internet Archive OCR, 754 pages; 12 of 12 sampled one-column pages were split into 2-3
"columns", 11 of 144 random drags lost words):
  1. OCR word boxes of one line differ in height and drift down along a slightly rotated line; the old line rule
     (a word belongs to the band whose FIRST word's top is within 0.6 line heights) cut such a line in two and the piece
     that started mid-page counted as a second column;
  2. every jump of the sorted left edges counted as a column: a centred heading, a stage direction, an indented paragraph,
     a speaker label followed by a gap -- on a page of prose none of them is a column;
  3. a drag inside one "column" kept only that column's words, and the words between were taken in DOM order, which for
     an OCR text layer is a block order unrelated to reading.

Every case below is a synthetic text layer built like the real scan (word boxes, drift, tall initials, blocks in another
DOM order) and dragged through the app's own functions (rangeBetweenWords -> resolveCanonicalPdfSelection ->
wrapRangeInSpans, the pipeline of a mouse / touch drag). The same cases pass on a real two-column bilingual page so the
fix cannot simply merge columns. The tap path (the sentence around a tapped word, pdfVisualGroup) had the same root cause: a sentence
that wraps from an indented first line was cut at the line end. READER_TEST_URL can target another build. READER_TEST_URL can target another build."""
import json, os, random
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Network.enable'); c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Emulation.setDeviceMetricsOverride', width=900, height=1100, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof resolveCanonicalPdfSelection==='function'", timeout=30)
c.js("localStorage.clear(); showUpdateBanner=()=>{}; document.getElementById('sw-update-banner')?.remove(); window.__errors=[]; addEventListener('error', e => __errors.push(e.message)); 1")

WORDS = ('the quick brown fox jumps over a lazy dog while every honest clerk counts silver coins and nobody asks where '
         'they came from because it is only stolen money if it is claimed').split()


def prose_page(seed, drift=0.025):
    """One-column page of a scan, in READING order: [{text, left, top, width, height, line}], plus the layer height."""
    rng = random.Random(seed)
    words, top, line = [], 30.0, 0

    def add_line(texts, left, tall_first=False, label=None):
        nonlocal top, line
        x = left
        for k, t in enumerate(texts):
            w = 8 * len(t) + 4
            h = 22 + rng.choice([0, 0, 1, 3])                     # OCR boxes: ascenders make some words taller
            y = top + drift * (x - 60) - (3 if h > 23 else 0)       # a slightly rotated scan: the line sinks to the right
            if tall_first and k == 0:                              # a drop-cap / tall initial next to small words
                h, y = 36, y - 12
            words.append(dict(text=t, left=round(x, 1), top=round(y, 1), width=w, height=h, line=line))
            x += w + 9
            if label and k == 0:
                x = 200                                            # speaker label, a wide gap, then the speech
        top += 32; line += 1

    def take(n): return [rng.choice(WORDS) for _ in range(n)]
    add_line(['ACT', 'FIVE'], 340)                                  # centred heading
    add_line(['SCENE', 'ONE.'], 330)                                # centred stage direction
    for para in range(3):
        add_line(take(9), 100, tall_first=True)                    # indented first line with a tall initial
        for _ in range(4): add_line(take(rng.randint(9, 11)), 60)
        if para == 1: add_line(['KATRYA.'] + take(7), 60, label=True)   # speaker label, gap, speech: not a column
        add_line(['FIRST', 'EXIT.'], 320)                           # stage direction in the middle of the page
    return words, top + 30


def two_column_page():
    """A bilingual vocabulary page: French cell | English cell on 8 rows (the real gutter, ~270px)."""
    rows = [('le professeur', 'the teacher'), ('la maison', 'the house'), ('le livre', 'the book'), ('la fenêtre', 'the window'),
            ('le chemin', 'the road'), ('la voiture', 'the car'), ('le jardin', 'the garden'), ('la table', 'the table')]
    words = []
    for i, (fr, en) in enumerate(rows):
        words.append(dict(text=fr, left=60, top=40 + i * 34, width=8 * len(fr) + 4, height=22, line=i, col=0))
        words.append(dict(text=en, left=420, top=40 + i * 34, width=8 * len(en) + 4, height=22, line=i, col=1))
    return words, 40 + len(rows) * 34 + 30


BUILD = """((spec, domOrder, height) => {
  document.querySelectorAll('.pdf-text-layer.scan-fixture').forEach(l => l.remove());
  const layer = document.createElement('div'); layer.className = 'pdf-text-layer scan-fixture';
  layer.style.cssText = 'position:absolute;left:0;top:0;width:800px;height:' + height + 'px;';
  document.body.appendChild(layer);
  window.__fx = new Array(spec.length);
  for (const i of domOrder) { const w = spec[i]; const s = document.createElement('span'); s.textContent = w.text;
    s.style.cssText = 'position:absolute;white-space:pre;left:' + w.left + 'px;top:' + w.top + 'px;width:' + w.width + 'px;height:' + w.height + 'px;';
    layer.appendChild(s); window.__fx[i] = s; }
  window.__layer = layer; return layer.querySelectorAll('span').length; })"""

# The drag, through the app's own pipeline. Returns what the reader sees highlighted (in reading order) and the text.
DRAG = """((a, b) => {
  // the word under the pointer, as wordBoundsAt gives it: word characters only (no leading / trailing punctuation)
  const word = i => { const n = window.__fx[i].firstChild, t = n.nodeValue; let s = 0; while (s < t.length && !IS_WORD_CH(t[s])) s++; let e = s; while (e < t.length && IS_WORD_CH(t[e])) e++; return {node: n, start: s, end: e}; };
  const r = rangeBetweenWords(word(a), word(b)); if (!r) return {error: 'no range'};
  const can = resolveCanonicalPdfSelection(r, {sourceType: 'phrase_translation'});
  const wrapped = wrapRangeInSpans(r, 'sel-word');
  const seen = new Set(wrapped.map(w => w.parentElement));
  const shown = window.__fx.map((s, i) => seen.has(s) ? i : -1).filter(i => i >= 0);
  unwrapSpans(wrapped);
  return {shown, text: can && can.text, cross: !!(can && can.isCrossColumn), columns: can && can.columns ? can.columns.length : 0}; })"""


def load(words, dom_order, height):
    n = c.js(f"({BUILD})({json.dumps(words)}, {json.dumps(dom_order)}, {height})")
    assert n == len(words), (n, len(words))


def columns():
    return c.js("(() => { const l = window.__layer; return pdfComputeColumns(pdfTextSpans(l), l.getBoundingClientRect().width).columnCount; })()")


def drag(a, b):
    return c.js(f"({DRAG})({a}, {b})")


def check(name, ok, detail=None):
    assert ok, (name, detail)
    print('PASS', name, flush=True)


def check_drags(name, words, pairs, expected_indices):
    """expected_indices(a, b) -> the word indices that must be highlighted and read, in reading order."""
    for a, b in pairs:
        got = drag(a, b)
        want = expected_indices(a, b)
        # the two ends are whole WORDS (no punctuation around them); everything between is read as it stands
        texts = [words[i]['text'] for i in want]
        texts[0] = texts[0].lstrip('.'); texts[-1] = texts[-1].rstrip('.')
        text_want = ' '.join(texts)
        assert got.get('shown') == want, (name, 'highlight', a, b, 'missing', sorted(set(want) - set(got.get('shown', []))),
                                           'extra', sorted(set(got.get('shown', [])) - set(want)), got)
        assert got.get('text') == text_want, (name, 'text', a, b, got.get('text'), text_want)
    print('PASS', name, f'({len(pairs)} drags)', flush=True)


def pairs_for(n, seed, count):
    rng = random.Random(seed)
    out = [(0, n - 1), (n - 1, 0), (3, n - 4), (5, 6), (n // 2, n // 2 + 1)]
    while len(out) < count:
        a, b = rng.randrange(n), rng.randrange(n)
        if a != b: out.append((a, b))
    return out


between = lambda a, b: list(range(min(a, b), max(a, b) + 1))

# ---------------------------------------------------------------- 1. one column of prose with every trap of a scan
words, height = prose_page(seed=11)
load(words, list(range(len(words))), height)
check('1a a one-column scan page with a centred heading, indented paragraphs, tall initials, a speaker label and a '
      'stage direction is ONE column', columns() == 1, columns())
check_drags('1b every word between the two ends is highlighted and read (including reversed drags)', words,
            pairs_for(len(words), 5, 60), between)

# ---------------------------------------------------------------- 2. the same page, strongly rotated scan
words2, height2 = prose_page(seed=12, drift=0.03)
load(words2, list(range(len(words2))), height2)
check('2a a strongly rotated scan (a line sinks ~19px over its width) is still ONE column', columns() == 1, columns())
check_drags('2b long drags over the rotated scan lose no word', words2, pairs_for(len(words2), 6, 40), between)

# ---------------------------------------------------------------- 3. blocks listed in another order than they are read
words3, height3 = prose_page(seed=13)
by_line = {}
for i, w in enumerate(words3): by_line.setdefault(w['line'], []).append(i)
lines = sorted(by_line)
half = len(lines) // 2
block_order = [i for ln in lines[half:] for i in by_line[ln]] + [i for ln in lines[:half] for i in by_line[ln]]   # lower block FIRST in the DOM
load(words3, block_order, height3)
check('3a text layer blocks in a DOM order unrelated to reading: still one column', columns() == 1, columns())
check_drags('3b a drag selects the words between its ends ON THE PAGE, not in DOM order', words3,
            pairs_for(len(words3), 7, 50), between)

# ---------------------------------------------------------------- 4. a real two-column page keeps its columns
tw, th = two_column_page()
load(tw, list(range(len(tw))), th)
check('4a a bilingual page of eight rows is TWO columns', columns() == 2, columns())
french = [i for i, w in enumerate(tw) if w['col'] == 0]
for a, b in ((french[0], french[-1]), (french[2], french[5]), (french[6], french[1])):
    got = drag(a, b)
    want = [i for i in french if min(a, b) <= i <= max(a, b)]
    assert got['shown'] == want and not got['cross'], ('4b', a, b, got, want)
    assert 'the ' not in got['text'] and ' house' not in got['text'], ('4b text', got['text'])
print('PASS 4b a drag down the French column highlights French cells only, never the English beside them', flush=True)
got = drag(french[1], len(tw) - 3)
check('4c a drag from the French column into the English one is a cross-column selection', got['cross'] is True and got['columns'] == 2, got)

# ---------------------------------------------------------------- 4d. a drag asks for the page's columns on every pointer move: they are kept
# while the page does not change, and judged afresh when it does (a re-render builds new spans in the SAME layer element)
words_a, height_a = prose_page(seed=21)
load(words_a, list(range(len(words_a))), height_a)
check('4d (setup) one-column page; a drag fills the per-page column cache', columns() == 1 and drag(0, 40)['shown'] == between(0, 40))
tw2, _ = two_column_page()
c.js("""((spec) => { const layer = window.__layer; layer.replaceChildren(); window.__fx = new Array(spec.length);
  spec.forEach((w, i) => { const s = document.createElement('span'); s.textContent = w.text; s.style.cssText = 'position:absolute;white-space:pre;left:' + w.left + 'px;top:' + w.top + 'px;width:' + w.width + 'px;height:' + w.height + 'px;'; layer.appendChild(s); window.__fx[i] = s; });
  return layer.querySelectorAll('span').length; })(%s)""" % json.dumps(tw2))
french2 = [i for i, w in enumerate(tw2) if w['col'] == 0]
got = drag(french2[0], french2[-1])
check('4e the same layer element re-rendered as a two-column page is judged afresh (the cached one-column verdict is not reused)',
      columns() == 2 and got['shown'] == french2 and not got['cross'], (columns(), got))

# ---------------------------------------------------------------- 5. the sentence around a TAPPED word (pdfVisualGroup)
def sentence_of(index):
    return c.js("""((i) => { const layer = window.__layer, target = window.__fx[i];
      const sentences = buildSentenceRangesFromSpans(pdfVisualGroup(layer, target));
      const hit = sentences.find(x => x.range._pdfPieces.some(p => p.span === target)); return hit ? hit.text : null; })(%d)""" % index)


def span(text, left, top, width, height):
    return dict(text=text, left=left, top=top, width=width, height=height)


# 5a. the real geometry of page 221 of a bilingual French/English grammar workbook: a stacked label in the left margin (EXERCICE / 3·1, fonts
# 8.7 and 21px) and the instruction to its right (13px), body lines at the margin. The indented instruction used to count as a
# second «column».
label = [span('The sky was grey.', 120, 60, 150, 14), span('Elle regarde la télévision.', 120, 100, 215, 14), span('Il ouvre la porte.', 120, 140, 150, 14),
         span('EXERCICE', 138, 335, 46, 9), span('3·1', 133, 347, 56, 21),
         span('Écrire chaque phrase ci-dessous en employant', 220, 373, 218, 13), span('tu', 440, 373, 12, 13), span('et la forme', 455, 373, 57, 13),
         span('est-ce que', 515, 373, 56, 13), span('si nécessaire.', 573, 373, 68, 13),
         span('1. She is painting the kitchen.', 126, 409, 180, 14), span('2. There is a dog in the car.', 126, 462, 163, 14), span('3. They pity the poor child.', 126, 516, 163, 14)]
load(label, list(range(len(label))), 600)
check('5a a stacked «EXERCICE 3·1» label beside its instruction (real page 221 geometry) is not a second column', columns() == 1, columns())
# 5e. a sentence that wraps from a deeply indented first line (page 180: "...either on Saturday or on / Sunday.") was cut at the end of
# the first line: the indented line counted as a column of its own.
wrap = [span('The children were happy.', 60, 100, 200, 14),
        span('I will go to the movies', 140, 160, 190, 14), span('either', 336, 160, 52, 14), span('on Saturday', 394, 160, 92, 14), span('or', 492, 160, 20, 14), span('on', 518, 160, 20, 14),
        span('Sunday.', 60, 178, 60, 14), span('It will be fun.', 126, 178, 120, 14),
        span('We bring snacks.', 60, 196, 130, 14), span('Then we eat.', 60, 214, 100, 14)]
load(wrap, list(range(len(wrap))), 300)
want = 'I will go to the movies either on Saturday or on Sunday.'
check('5e a sentence that wraps from a deeply indented first line is read whole, from any word of it',
      all(sentence_of(i) == want for i in (1, 3, 5, 6)), [sentence_of(i) for i in (1, 3, 5, 6)])
check('5f ... and the sentences around it are not dragged in', sentence_of(0) == 'The children were happy.' and sentence_of(7) == 'It will be fun.', (sentence_of(0), sentence_of(7)))

check('no application errors', c.js('(window.__errors || []).length === 0'), c.js('window.__errors'))
print('ALL PDF SCAN SELECTION CHECKS PASSED')
