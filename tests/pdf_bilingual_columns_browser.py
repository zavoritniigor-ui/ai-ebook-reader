"""User-reported bug: a real (text-based) PDF bilingual textbook page — French in
a left column, its English translation printed in the row-aligned right column,
several sentences carrying an inline bold marker word mid-sentence ("Premierement,"
/ "First," etc., matching real "Firstly/Secondly/..." bilingual-book style) —
selecting a sentence in one column grabbed text from BOTH columns at once, and
words on the right (English) column were read aloud with an inconsistent mix of
French/English pronunciation.

Root cause, in js/selection.js's pdfVisualGroup(): column membership used to be
decided by clustering each individual PDF text FRAGMENT's own left edge. A PDF
generator splits a line into multiple fragments wherever the style changes mid-
sentence (the bold marker word) — and while those fragments sit genuinely
adjacent to each other (the cursor continues, no real gap), their raw left-edge
values populate the SAME global sort/gap-threshold pool as the true column
boundary. In a real bilingual layout, French and English lines are also often at
the EXACT same height (row-aligned, as in the book) — so a naive "group by Y
first" fix doesn't work either, since it would merge the two columns' same-height
lines into one row outright.

Fix: pdfVisualGroup() now clusters in two stages — Y-bands first (which CAN mix
both columns' same-height lines), then, within each band, fragments are sorted by
X and cut into "segments" wherever the gap between one fragment's RIGHT edge and
the next fragment's LEFT edge exceeds the threshold (a real column gutter) rather
than being contiguous (a same-line style break). Only each segment's own start-X
— not every fragment's — then feeds the column clustering, so inline style
breaks no longer pollute it.

Uses bilingual_pdf_bytes() — a fixture built with an ACTUAL font change (Helvetica
-> Helvetica-Bold) and runs shown continuously within one BT/ET block (no
repositioning Td between them), so fragment gaps come out realistically small
within a line and realistically large across the column gutter, the same way a
real PDF generator lays them out — not hand-picked X offsets that could pass a
test for the wrong reason. READER_TTS_URL can target production.
"""
import base64, os, json
from browser_cdp import CDP, bilingual_pdf_bytes

c = CDP(); c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Network.enable'); c.call('Network.setCacheDisabled', cacheDisabled=True)
def pause(seconds): c.js(f'new Promise(resolve=>setTimeout(resolve,{seconds * 1000}))')
c.call('Emulation.setDeviceMetricsOverride', width=900, height=1200, deviceScaleFactor=2, mobile=True)
c.call('Page.navigate', url=os.environ.get('READER_TTS_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert")
pause(1)


def check(name, expr):
    value = c.js(expr)
    assert value is True, (name, value)
    print('PASS', name, flush=True)


data = base64.b64encode(bilingual_pdf_bytes()).decode()
loaded = c.js(f'''(async()=>{{
    localStorage.clear(); state.pdfScale=1; state.pdfFit='width'; state.format='pdf'; state.bookKey='bilingual-columns-test';
    document.body.classList.add('pdf-mode','immersive-mode');
    window.__errors=[]; window.addEventListener('error',e=>__errors.push(e.message));
    window.__pendingPdfRenders=0; window.__lastPdfRender=performance.now();
    const originalRender=renderPdfPageInto;
    renderPdfPageInto=async(...args)=>{{
        __pendingPdfRenders++; __lastPdfRender=performance.now();
        try {{ return await originalRender(...args); }}
        finally {{ __pendingPdfRenders--; __lastPdfRender=performance.now(); }}
    }};
    const file=new File([Uint8Array.from(atob('{data}'),c=>c.charCodeAt(0))],'fixture.pdf');
    await initPdf(file); return {{text: els.pages.textContent}};
}})()''')
assert 'Je n' in loaded['text'] and 'I was not' in loaded['text'], loaded

# Match the reselect suite: viewport setup may queue a delayed resize render.
c.wait('__pendingPdfRenders===0 && performance.now()-__lastPdfRender>400')


def sentence_for(needle):
    return c.js('''(()=>{
        const layer = document.querySelector('.pdf-text-layer');
        const spans = pdfTextSpans(layer);
        const target = spans.find(s => s.textContent.includes(''' + repr(needle) + '''));
        if (!target) return null;
        const r = target.getBoundingClientRect();
        const s = sentenceRangeAt(r.left + 5, r.top + r.height / 2);
        return s ? s.toString() : null;
    })()''')


# The bold-marker line: tapping the FRENCH side of it must reconstruct the
# COMPLETE French sentence — including the words before AND after the bold
# marker — and must never include any English.
s = sentence_for('netait pas')
assert s == "Premierement, le personnel netait pas attentif: par exemple, on a oublie de me reveiller le premier matin.", s
print('PASS bold-marker line: French sentence reconstructs completely, no dropped words', flush=True)
assert 'First' not in s and 'personnel were not' not in s
print('PASS bold-marker line: French sentence has no English bleed-through', flush=True)

# Same line, tapping the ENGLISH side — must reconstruct the complete English
# sentence, never touching French.
s2 = sentence_for('First,')
assert s2 == "First, the personnel were not attentive: for example, they forgot to wake me up on the first morning.", s2
print('PASS bold-marker line: English sentence reconstructs completely, no dropped words', flush=True)
assert 'Premierement' not in s2 and 'netait pas' not in s2
print('PASS bold-marker line: English sentence has no French bleed-through', flush=True)

# A plain (no bold marker) tap on each side, for a baseline sanity check.
check('plain French sentence, unaffected', f'''
    {sentence_for("Je n") !r} === "Je n\\u2019etais pas satisfait du service a votre hotel."
''')
check('plain English sentence, unaffected', f'''
    {sentence_for("I was not") !r} === "I was not at all satisfied with the service at your hotel."
''')

# Whole-column groups: every fragment in the French column's group must be
# French, every fragment in the English column's group must be English — this
# is the direct "selecting one column doesn't grab both at once" guarantee.
groups = c.js('''(()=>{
    const layer = document.querySelector('.pdf-text-layer');
    const spans = pdfTextSpans(layer);
    const fr = pdfVisualGroup(layer, spans.find(s => s.textContent.includes("Je n"))).map(s => s.textContent).join(' ');
    const en = pdfVisualGroup(layer, spans.find(s => s.textContent.includes("I was not"))).map(s => s.textContent).join(' ');
    return { fr, en };
})()''')
assert 'First' not in groups['fr'] and 'satisfied' not in groups['fr'], groups
print('PASS French column group contains no English text at all', flush=True)
assert 'Premierement' not in groups['en'] and 'Deuxiemement' not in groups['en'], groups
print('PASS English column group contains no French text at all', flush=True)
assert 'Deuxiemement' in groups['fr'] and 'Secondly' in groups['en'], groups
print('PASS both columns still contain their own full text (nothing lost)', flush=True)

# Defect 1 regression: Fill-in-the-blank exercise line with large horizontal gap (~175px)
# must not be split into separate columns by pdfVisualGroup, and buildSentenceRangesFromSpans
# must reconstruct the complete sentence.
exercise_test = c.js('''(() => {
    const container = document.createElement('div');
    container.className = 'pdf-text-layer';
    container.style.cssText = 'position:relative;width:1000px;height:200px;';

    // Exercise line 3: "3. Ils (plaindre)" [175px gap] "le vieux voisin."
    const span3a = document.createElement('span');
    span3a.textContent = '3. Ils (plaindre)';
    span3a.style.cssText = 'position:absolute;left:190px;top:50px;width:130px;height:20px;';

    const span3b = document.createElement('span');
    span3b.textContent = 'le vieux voisin.';
    span3b.style.cssText = 'position:absolute;left:495px;top:50px;width:150px;height:20px;';

    // Exercise line 4: "4. Le mur (ceindre)" [175px gap] "le jardin."
    const span4a = document.createElement('span');
    span4a.textContent = '4. Le mur (ceindre)';
    span4a.style.cssText = 'position:absolute;left:190px;top:90px;width:190px;height:20px;';

    const span4b = document.createElement('span');
    span4b.textContent = 'le jardin.';
    span4b.style.cssText = 'position:absolute;left:555px;top:90px;width:60px;height:20px;';

    container.appendChild(span3a);
    container.appendChild(span3b);
    container.appendChild(span4a);
    container.appendChild(span4b);
    document.body.appendChild(container);

    const g3a = pdfVisualGroup(container, span3a);
    const g3b = pdfVisualGroup(container, span3b);
    const sentences3a = buildSentenceRangesFromSpans(g3a);
    const plaindreSentence = sentences3a.find(s => s.text.includes('plaindre'));

    const result = {
        sameGroup: g3a.includes(span3b) && g3b.includes(span3a),
        sentence: plaindreSentence ? plaindreSentence.text : null
    };
    container.remove();
    return result;
})()''')
assert exercise_test['sameGroup'] is True, exercise_test
assert exercise_test['sentence'] == 'Ils (plaindre) le vieux voisin.', exercise_test
print('PASS Defect 1 regression: fill-in-the-blank exercise preserves complete sentence across gap', flush=True)

# ---------------------------------------------------------------------------------------
# Fill-in-the-blank exercise lines vs REAL column gutters (the PDF is a bilingual French/English grammar workbook:
# "3. Ils (plaindre)   <blank>   le vieux voisin."). The blank is wider than a column gap but the
# halves are ONE line -- and ONLY unmistakable exercise content may bridge it. Geometry below is the
# real page 221 one (left fragment x=176..296, right fragment x=457..594 on a ~1000px layer).
# ---------------------------------------------------------------------------------------
LAYOUT_JS = '''(rows => {
    const container = document.createElement('div'); container.className = 'pdf-text-layer';
    container.style.cssText = 'position:relative;width:1000px;height:' + (rows.length * 40 + 80) + 'px;';
    document.body.appendChild(container);
    const spans = rows.map((row, ri) => row.map(([text, left, width]) => {
        const s = document.createElement('span'); s.textContent = text;
        s.style.cssText = 'position:absolute;left:' + left + 'px;top:' + (40 + ri * 40) + 'px;width:' + width + 'px;height:20px;';
        container.appendChild(s); return s; }));
    const out = spans.map(row => {
        const g = pdfVisualGroup(container, row[0]);
        return { joined: row.slice(1).every(sp => g.includes(sp)), sentences: buildSentenceRangesFromSpans(g).map(x => x.text) };
    });
    container.remove(); return out; })(%s)'''


def layout(rows):
    """rows: [[(text, left, width), ...], ...], one visual line each (40px apart) -> per row {joined, sentences}."""
    return c.js(LAYOUT_JS % json.dumps(rows, ensure_ascii=False))


# --- exercise lines with the real page-221 geometry: every one becomes its complete sentence
real221 = layout([
    [('3. Ils (plaindre)', 176, 120), ('le vieux voisin.', 457, 137)],
    [('4. Le mur (ceindre)', 176, 150), ('le jardin.', 457, 60)],
    [('5. Vous (feindre)', 176, 120), ('la surprise.', 457, 100)],
    [('6. Nous (craindre)', 176, 125), ('l’orage.', 457, 80)],
    [('10. Elle (se plaindre)', 176, 140), ('chaque matin.', 457, 90)],
])
assert all(r['joined'] for r in real221), real221
wanted = ['Ils (plaindre) le vieux voisin.', 'Le mur (ceindre) le jardin.', 'Vous (feindre) la surprise.',
          'Nous (craindre) l’orage.', 'Elle (se plaindre) chaque matin.']
for row, sentence in zip(real221, wanted):
    assert sentence in row['sentences'], (sentence, row['sentences'])
print('PASS real page-221 exercise geometry: each line yields its complete sentence (not "Ils (plaindre) 4.")', flush=True)

# --- other real cue shapes: reflexive after a modal, negated, interrogative, bare "?" continuation, blank marks
shapes = layout([
    [('1. J’aime (se promener)', 176, 150), ('le long de la Seine.', 457, 130)],
    [('2. Leurs méthodes (ne pas être)', 176, 190), ('très efficaces.', 457, 100)],
    [('3. Est-ce qu’il (être)', 176, 130), ('aussi amusant que son frère?', 457, 190)],
    [('4. Ça (aller)', 176, 80), ('?', 457, 10)],
    [('5. Elle ______', 176, 90), ('à la banque.', 457, 90)],
])
assert all(r['joined'] for r in shapes), shapes
assert 'J’aime (se promener) le long de la Seine.' in shapes[0]['sentences'], shapes[0]
assert 'Leurs méthodes (ne pas être) très efficaces.' in shapes[1]['sentences'], shapes[1]
assert 'Elle ______ à la banque.' in shapes[4]['sentences'], shapes[4]
print('PASS reflexive / negated / interrogative / bare-? / underscore-blank exercise lines are one line', flush=True)


# --- NEGATIVE CONTROLS: real column gutters and tables must NOT be bridged
def stays_apart(name, rows):
    r = layout(rows)
    assert not any(x['joined'] for x in r), (name, r)
    left_key, right_key = rows[0][0][0].split()[-1], rows[0][1][0].split()[0]
    assert not any(left_key in t and right_key in t for x in r for t in x['sentences']), (name, r)
    print('PASS still separate columns: ' + name, flush=True)


stays_apart('vocabulary rows ending in a gender tag  "l’allemand (m.) | German"',
            [[('l’allemand (m.)', 176, 110), ('German', 457, 50)], [('l’anglais (m.)', 176, 100), ('English', 457, 55)]])
stays_apart('a French line ending in an English gloss  "le professeur (teacher) | the teacher"',
            [[('le professeur (teacher)', 176, 170), ('the teacher', 457, 80)]])
stays_apart('a wrapped numbered list whose right column starts lowercase (the old marker+lowercase rule merged it)',
            [[('3. Il parle avec son ami et', 176, 200), ('his friend listens', 457, 130)]])
stays_apart('a table cell ending in "(familiar)"', [[('tu es you are (familiar)', 176, 180), ('vous êtes you are', 457, 130)]])
stays_apart('a gender tag followed by lowercase text in the next column', [[('la lettre (f.)', 176, 100), ('the letter', 457, 70)]])

# two-column EXERCISES: the right column's own item number means it is a different item, not a continuation
two_col = layout([[('3. Ils (plaindre)', 176, 120), ('8. Ils (craindre)', 457, 120)]])
assert not two_col[0]['joined'], two_col
print('PASS two-column exercises: the right column starts with its own item number, so it is not merged', flush=True)

# the original bilingual two-column separation is unchanged
assert 'Deuxiemement' in groups['fr'] and 'Secondly' in groups['en'] and 'Secondly' not in groups['fr'], groups
print('PASS the original bilingual two-column separation is unchanged', flush=True)

# ---------------------------------------------------------------------------------------
# Words the PDF splits into several text items (real page: GUIAPP_systeme_frigorifique_classe_1.pdf, p.11).
# A line such as "3. a|ppliquer les mesures ..." has a DETACHED FIRST LETTER, and small-caps headings
# ("Préparer les travaux") are cut mid-word ("Pr","ÉP","ar","E","r"). The sentence builder used to put a space
# after EVERY span, so the model was handed "a ppliquer" and "Pr ÉP ar E r LES trava U x" -- a word it can
# never return as a valid (whole-word, literal) item. Spans that CONTINUE a glyph run on the same line are now
# joined; a real gap (a word space, a bullet, another line) still separates. Geometry below is the real page's.
# ---------------------------------------------------------------------------------------
split_words = layout([
    [('3.', 109, 13), ('a', 134, 10), ('ppliquer les mesures sécuritaires liées au travail.', 145, 500)],
    [('4.', 109, 13), ('a', 134, 10), ('ssurer l’approvisionnement en divers matériaux.', 145, 360)],
    [('A', 115, 23), ('Pr', 164, 22), ('ÉP', 186, 21), ('ar', 206, 24), ('E', 230, 13), ('r', 240, 6), ('LES', 256, 30), ('trava', 289, 57), ('U', 346, 14), ('x.', 359, 10)],
])
sents = [x for r in split_words for x in r['sentences']]
assert 'appliquer les mesures sécuritaires liées au travail.' in sents, sents
assert 'assurer l’approvisionnement en divers matériaux.' in sents, sents
assert any(x.endswith('PrÉParEr LES travaUx.') for x in sents), sents          # the PDF's own letters, joined into words
assert not any('a ppliquer' in x or 'a ssurer' in x or 'Pr ÉP' in x for x in sents), sents
print('PASS split words: a detached first letter is joined (appliquer, assurer) and a small-caps heading is not exploded into letters: %r' % [x for x in sents if 'LES' in x][0], flush=True)

# real gaps still separate: the word space before LES (10px), the bullet before its text, and two lines
gaps = layout([
    [('¡', 132, 6), ('Observation visuelle et olfactive', 151, 300)],
    [('Utilisation', 102, 90), ('appropriée', 197, 90)],                 # 5px gap: a real word space with the space char omitted
    [('à effectuer', 102, 90)], [('Décision justifiée', 102, 120)],       # two separate lines
])
joined = ' '.join(' '.join(r['sentences']) for r in gaps)
assert '¡ Observation visuelle et olfactive' in joined and 'Utilisation appropriée' in joined and 'effectuer Décision' in joined, joined
print('PASS real gaps are kept: bullet / word space / next line still separate the words', flush=True)

# ---------------------------------------------------------------------------------------
# A gutter narrower than the column gap threshold (seen on a real textbook page with a three-column article; the text here is
# the test's own):
# three justified columns 264px wide with 21px between them, about one line height. The lines of all three used to fuse
# into one, and the «sentence» button selected the neighbouring columns too.
# ---------------------------------------------------------------------------------------
COLS = (141, 426, 711)
article = layout([[(text, x, 264) for text, x in zip(row, COLS)] for row in [
    ('Le fleuve est très ancien. Princi-', 'des plus belles routes de la région', 'Il est conseillé de réserver à tout'),
    ('palement alimenté par les lacs du', 'est de suivre le fleuve en bateau', 'moment de l’année une place opti-'),
    ('nord du continent américain, ce fleuve', 'au printemps ou en été, et ce,', 'male. Cela dit, certaines personnes'),
    ('traverse aussi des villes et des', 'dès le matin. La lumière du fleuve', 'préfèrent voyager en hiver quand'),
    ('forêts immenses.', 'change toute la journée pour une per-', 'le fleuve est couvert de glace'),
]])
assert not any(r['joined'] for r in article), article
assert 'Princi- palement alimenté par les lacs du nord du continent américain, ce fleuve traverse aussi des villes et des forêts immenses.' in article[0]['sentences'], article[0]
assert not any('belles' in t or 'conseillé' in t for t in article[0]['sentences']), article[0]
third = c.js(LAYOUT_JS.replace('pdfVisualGroup(container, row[0])', 'pdfVisualGroup(container, row[2])') % json.dumps(
    [[(t, x, 264) for t, x in zip(('Le fleuve est très ancien.', 'des plus belles routes', 'Il est conseillé de réserver à tout'), COLS)],
     [(t, x, 264) for t, x in zip(('Sa source principale est un', 'est de suivre le fleuve', 'moment de l’année une place opti-'), COLS)],
     [(t, x, 264) for t, x in zip(('grand lac au sud-ouest', 'en bateau, au printemps.', 'male. Cela dit, certaines personnes'), COLS)]], ensure_ascii=False))
assert 'Il est conseillé de réserver à tout moment de l’année une place opti- male.' in third[0]['sentences'], third
print('PASS a three-column article with a 21px gutter: each column reads its own sentences', flush=True)
# A drag over a few words of one column reads exactly those words, not their whole lines: three words were translated and
# narrated as their whole line (each PDF item of that page is a whole line). The texts here are the test's own.
drags = c.js('''(rows => {
    const container = document.createElement('div'); container.className = 'pdf-text-layer';
    container.style.cssText = 'position:relative;width:1000px;height:' + (rows.length * 40 + 80) + 'px;';
    document.body.appendChild(container);
    rows.forEach((row, ri) => row.forEach(([text, left, width]) => {
        const s = document.createElement('span'); s.textContent = text;
        s.style.cssText = 'position:absolute;left:' + left + 'px;top:' + (40 + ri * 40) + 'px;width:' + width + 'px;height:20px;';
        container.appendChild(s); }));
    const word = (w) => { const s = [...container.children].find(x => x.textContent.includes(w)), n = s.firstChild, at = n.nodeValue.indexOf(w);
        return { node: n, start: at, end: at + w.length }; };
    const read = (a, b) => resolveCanonicalPdfSelection(rangeBetweenWords(word(a), word(b))).text;
    const out = [read('alimenté', 'lacs'), read('continent', 'alimenté'), read('plus', 'région')];
    container.remove(); return out; })(%s)''' % json.dumps([[(text, x, 264) for text, x in zip(row, COLS)] for row in [
    ('Le fleuve est très ancien. Princi-', 'des plus belles routes de la région', 'Il est conseillé de réserver à tout'),
    ('palement alimenté par les lacs du', 'est de suivre le fleuve en bateau', 'moment de l’année une place opti-'),
    ('nord du continent américain, ce fleuve', 'au printemps ou en été, et ce,', 'male. Cela dit, certaines personnes'),
]], ensure_ascii=False))
assert drags == ['alimenté par les lacs', 'alimenté par les lacs du nord du continent', 'plus belles routes de la région'], drags
print('PASS a drag inside one column of that page reads only the dragged words (also over two lines, also upwards)', flush=True)
# the cells of a table («je | faisais», short words a narrow gap apart) do not count as such a gutter: one line stays one line
table = layout([[('je', 176, 20), ('faisais', 217, 50), ('je', 300, 20), ('prenais', 341, 55)] for _ in range(5)])
assert all(r['joined'] for r in table), table
print('PASS the narrow gaps of a conjugation table are not column gutters', flush=True)
# the run-in items of an answer key (the bilingual workbook p. 640) line up at one x by chance, but the lines between them run across it
key = layout([
    [('7. En marchant vite, j’ai rattrapé mon ami.', 189, 320), ('8. En tournant à gauche après le pont,', 530, 300)],
    [('vous verrez la poste. 9. En lisant chaque jour, on progresse beaucoup en français.', 189, 640)],
    [('10. En ouvrant la fenêtre, elle a vu la neige.', 189, 320), ('11. En chantant, il oublie la pluie.', 530, 280)],
    [('12. En cuisinant ensemble, nous parlons beaucoup. 13. Voyant le ciel, il sourit.', 189, 660)],
    [('14. N’ayant pas lu le livre, je l’écoute.', 189, 320), ('15. En courant le matin, ils restent en forme.', 530, 320)],
])
assert all(r['joined'] for r in key[::2]), key
print('PASS run-in answer-key items that line up by chance are not a column gutter', flush=True)

# Where a drag's end lands (wordBoundsAt with the drag's anchor): never on a word the finger has not reached. Found with real
# touch drags on book 56 (scratch hl_stress.py): an end in the space after the last word highlighted the next word too.
ends = c.js(r'''(() => {
    const box = document.createElement('div'); box.className = 'pdf-text-layer';
    box.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:600px;background:#fff;z-index:2147483647;font:20px monospace;';
    document.body.appendChild(box);
    const put = (text, left, top) => { const s = document.createElement('span'); s.textContent = text;
        s.style.cssText = 'position:absolute;white-space:pre;left:' + left + 'px;top:' + top + 'px;--font-height:20px;pointer-events:auto;transform:none;'; box.appendChild(s); return s; };
    const line = put('dorée pour la suite', 100, 100), a = put('soleil', 100, 200), b = put('cette', 190, 200), far = put('ailleurs', 400, 320);
    const at = (span, word) => { const n = span.firstChild, i = n.nodeValue.indexOf(word), r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + word.length);
        return { node: n, start: i, end: i + word.length, box: r.getBoundingClientRect() }; };
    const said = w => w === false ? 'kept' : w === null ? 'none' : w.node.nodeValue.slice(w.start, w.end);
    const dorée = at(line, 'dorée'), pour = at(line, 'pour'), la = at(line, 'la'), suite = at(line, 'suite'), soleil = at(a, 'soleil'), cette = at(b, 'cette');
    const mid = (l, r) => [(l.box.right + r.box.left) / 2, (l.box.top + l.box.bottom) / 2];
    const out = {
        forwardGap: said(wordBoundsAt(...mid(dorée, pour), dorée)),          // a forward drag stops in the space after «dorée»
        backwardGap: said(wordBoundsAt(...mid(pour, la), suite)),             // a backward drag stops in the space before «la»
        onWord: said(wordBoundsAt(pour.box.left + 3, (pour.box.top + pour.box.bottom) / 2, dorée)),
        nextItemNotReached: said(wordBoundsAt(cette.box.left - 2, (cette.box.top + cette.box.bottom) / 2, soleil)),   // «cette» is another text item
        nextItemReached: said(wordBoundsAt(cette.box.left + 3, (cette.box.top + cette.box.bottom) / 2, soleil)),
        otherLine: said(wordBoundsAt(far.getBoundingClientRect().left + 10, 210, soleil)),   // beside the line, text only lower on the page
        noAnchorGap: said(wordBoundsAt(pour.box.right + 2, (pour.box.top + pour.box.bottom) / 2)),   // a tap or hold: the nearer word
    };
    box.remove(); return out; })()''')
assert ends == {'forwardGap': 'dorée', 'backwardGap': 'la', 'onWord': 'pour', 'nextItemNotReached': 'kept', 'nextItemReached': 'cette',
                'otherLine': 'none', 'noAnchorGap': 'pour'}, ends
print('PASS a drag never reaches past the finger: a space takes the word on the anchor side, the next text item counts only once touched, text on another line is not taken', flush=True)

check('no application errors', 'window.__errors.length===0 || JSON.stringify(window.__errors)')
print('ALL PDF BILINGUAL COLUMN CHECKS PASSED', flush=True)
