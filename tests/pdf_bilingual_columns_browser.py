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
import base64, os
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
    const file=new File([Uint8Array.from(atob('{data}'),c=>c.charCodeAt(0))],'fixture.pdf');
    await initPdf(file); return {{text: els.pages.textContent}};
}})()''')
assert 'Je n' in loaded['text'] and 'I was not' in loaded['text'], loaded


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

check('no application errors', 'window.__errors.length===0 || JSON.stringify(window.__errors)')
print('ALL PDF BILINGUAL COLUMN CHECKS PASSED', flush=True)
