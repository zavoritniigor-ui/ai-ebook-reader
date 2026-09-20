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

    // Exercise line 3: "3. Ils (plaindre)" [175px gap] "la pauvre femme."
    const span3a = document.createElement('span');
    span3a.textContent = '3. Ils (plaindre)';
    span3a.style.cssText = 'position:absolute;left:190px;top:50px;width:130px;height:20px;';

    const span3b = document.createElement('span');
    span3b.textContent = 'la pauvre femme.';
    span3b.style.cssText = 'position:absolute;left:495px;top:50px;width:150px;height:20px;';

    // Exercise line 4: "4. La muraille (ceindre)" [175px gap] "la ville."
    const span4a = document.createElement('span');
    span4a.textContent = '4. La muraille (ceindre)';
    span4a.style.cssText = 'position:absolute;left:190px;top:90px;width:190px;height:20px;';

    const span4b = document.createElement('span');
    span4b.textContent = 'la ville.';
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
assert exercise_test['sentence'] == 'Ils (plaindre) la pauvre femme.', exercise_test
print('PASS Defect 1 regression: fill-in-the-blank exercise preserves complete sentence across gap', flush=True)

# ---------------------------------------------------------------------------------------
# Fill-in-the-blank exercise lines vs REAL column gutters (the PDF is "Complete French All-in-One":
# "3. Ils (plaindre)   <blank>   la pauvre femme."). The blank is wider than a column gap but the
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
    [('3. Ils (plaindre)', 176, 120), ('la pauvre femme.', 457, 137)],
    [('4. La muraille (ceindre)', 176, 150), ('la ville.', 457, 60)],
    [('5. Vous (feindre)', 176, 120), ('l’indifférence.', 457, 100)],
    [('6. Nous (craindre)', 176, 125), ('le ridicule.', 457, 80)],
    [('10. Elle (se plaindre)', 176, 140), ('tout le temps.', 457, 90)],
])
assert all(r['joined'] for r in real221), real221
wanted = ['Ils (plaindre) la pauvre femme.', 'La muraille (ceindre) la ville.', 'Vous (feindre) l’indifférence.',
          'Nous (craindre) le ridicule.', 'Elle (se plaindre) tout le temps.']
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

check('no application errors', 'window.__errors.length===0 || JSON.stringify(window.__errors)')
print('ALL PDF BILINGUAL COLUMN CHECKS PASSED', flush=True)
