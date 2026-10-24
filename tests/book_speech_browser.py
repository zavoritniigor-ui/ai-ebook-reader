"""Browser tests for js/book-speech.js: import a narration (MP3 + JSON), tap a word or select a sentence in a PDF, hear it.

The narration is real: two sentences of the edge-tts voice fr-CA-SylvieNeural («Je viens du Maroc. Je viens du Japon.»),
cut from the book's MP3 with their aligned JSON entries (tools/book_tts/align.py). The words repeat, so the test also
checks that a tap finds the occurrence it touched, and what a selection or the expand button plays. A tap plays the word
said on its own (the JSON's lexicon, tools/book_tts/words.py); without it, the system voice reads it. A pair of words
(two words or more of a sentence) is always left to the system voice; only a whole sentence plays the sentence narration.
"""
import base64, json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
FIXTURE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixtures', 'book_speech')


def page_pdf_b64():
    """One page with «Je viens du Maroc. Je viens du Japon.» in one text line (the text layer the reader works on)."""
    ops = b'BT /F1 14 Tf 50 700 Td (Je viens du Maroc. Je viens du Japon.) Tj ET'
    objs = [
        b'<< /Type /Catalog /Pages 2 0 R >>',
        b'<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
        b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
        b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        f'<< /Length {len(ops)} >>\nstream\n'.encode() + ops + b'\nendstream',
    ]
    data = b'%PDF-1.4\n'
    offsets = []
    for i, obj in enumerate(objs, 1):
        offsets.append(len(data))
        data += f'{i} 0 obj\n'.encode() + obj + b'\nendobj\n'
    xref = len(data)
    data += f'xref\n0 {len(objs) + 1}\n0000000000 65535 f \n'.encode()
    for off in offsets:
        data += f'{off:010d} 00000 n \n'.encode()
    data += f'trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode()
    return base64.b64encode(data).decode()


with open(os.path.join(FIXTURE, 'speech_test.mp3'), 'rb') as f:
    SPEECH_MP3 = f.read()
with open(os.path.join(FIXTURE, 'speech_test.json'), encoding='utf-8') as f:
    SPEECH_JSON = f.read()
META = json.loads(SPEECH_JSON)
WORDS = [[(w['start'] / 1000, w['end'] / 1000) for w in s['words']] for s in META['sentences']]


def packed(pages, meta=META):
    """One-file narration as tools/book_tts/pack.py writes it: the JSON in an ID3v2.4 GEOB frame before the MP3."""
    def safe(n):
        return bytes([(n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f])
    meta = dict(meta, pdf={'name': 'Speech_test.pdf', 'pages': pages})
    body = (b'\x03application/json\x00narration.json\x00ai-ebook-reader-narration\x00'
            + json.dumps(meta, ensure_ascii=False).encode('utf-8'))
    frame = b'GEOB' + safe(len(body)) + b'\x00\x00' + body
    return b'ID3\x04\x00\x00' + safe(len(frame)) + frame + SPEECH_MP3


# another book with the same page count: the same timings over other words
OTHER_TEXT = dict(META, sentences=[dict(x, text=t) for x, t in zip(META['sentences'], ['Nous partons pour Lyon.', 'Elle aime le chocolat.'])])
ALONE = {k: (v['start'] / 1000, v['end'] / 1000) for k, v in META['lexicon'].items()}   # words said on their own (words.py)

c = CDP()
c.call('Page.enable')
c.call('Runtime.enable')
c.call('Emulation.setDeviceMetricsOverride', width=1024, height=768, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState === 'complete' && !document.body.inert")
c.js("window.__errors = []; window.addEventListener('error', e => __errors.push(e.message));")


def check(name, expr, timeout=15):
    deadline = time.monotonic() + timeout
    last = None
    while time.monotonic() < deadline:
        last = c.js(expr)
        if last is True:
            print('PASS:', name)
            return
        time.sleep(0.1)
    raise AssertionError(f'FAIL: {name} -> {last!r}')


PDF_B64 = page_pdf_b64()
SPEECH_MP3_B64 = base64.b64encode(SPEECH_MP3).decode()
SPEECH_JSON_B64 = base64.b64encode(SPEECH_JSON.encode('utf-8')).decode()

c.js(f"""(async () => {{
    const toFile = (b64, name, type) => {{
        const raw = atob(b64), u8 = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
        return new File([u8], name, {{ type }});
    }};
    await openBookFile(toFile('{PDF_B64}', 'Speech_test.pdf', 'application/pdf'));
    window.__mp3 = toFile('{SPEECH_MP3_B64}', 'speech_test.mp3', 'audio/mpeg');
    window.__json = toFile('{SPEECH_JSON_B64}', 'speech_test.json', 'application/json');
    window.__packed = toFile('{base64.b64encode(packed(1)).decode()}', 'Speech test - voice.mp3', 'audio/mpeg');
    window.__sameSize = toFile('{base64.b64encode(packed(1, OTHER_TEXT)).decode()}', 'Same size - voice.mp3', 'audio/mpeg');
    window.__otherBook = toFile('{base64.b64encode(packed(99)).decode()}', 'Other book - voice.mp3', 'audio/mpeg');
}})()""")

check('1 The PDF opens and its page 1 text layer is there', """(() => {
    const w = document.querySelector('.pdf-page-wrapper[data-page="1"]');
    return !!w && w.textContent.includes('Maroc');
})()""")

check('2 Importing a MP3 + JSON pair stores one narration for the book', """(async () => {
    await bsImport([window.__json, window.__mp3]);
    return bsSets.list.length === 1 && bsSets.list[0].sentences.length === 2 && bsSets.list[0].voice === 'fr-CA-SylvieNeural';
})()""", timeout=20)

check('3 A JSON that describes another MP3 file is refused and not stored', """(async () => {
    const other = new File([new Uint8Array([1, 2, 3])], 'other.mp3', { type: 'audio/mpeg' });
    const before = bsSets.list.length;
    await bsImport([window.__json, other]);
    return bsSets.list.length === before;
})()""")


def word_point(word, nth=0):
    """The screen point of the nth occurrence of a word on page 1 (earlier taps split the text into several nodes)."""
    return c.js(f"""(() => {{
        state.translateMode = true;
        const layer = document.querySelector('.pdf-page-wrapper[data-page="1"] .pdf-text-layer');
        const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT), nodes = [];
        let text = '';
        for (let t = walker.nextNode(); t; t = walker.nextNode()) {{ nodes.push([t, text.length]); text += t.nodeValue; }}
        let at = -1;
        for (let k = 0; k <= {nth}; k++) at = text.indexOf({json.dumps(word)}, at + 1);
        const [node, base] = nodes.filter(([t, b]) => b <= at).pop();
        const r = document.createRange();
        r.setStart(node, at - base); r.setEnd(node, at - base + 1);
        const b = r.getBoundingClientRect();
        return [b.left + b.width / 2, b.top + b.height / 2];
    }})()""")


def played(expect):
    """bsLast equals the plan [(sentence index or word key, from s, to s)] to the millisecond."""
    return f"""(() => {{
        const want = {json.dumps(expect)};
        return !!bsLast && bsLast.length === want.length && bsLast.every((p, k) => (typeof want[k][0] === 'string' ? p.word : p.i) === want[k][0]
            && Math.abs(p.from - want[k][1]) < 0.001 && Math.abs(p.to - want[k][2]) < 0.001) || JSON.stringify(bsLast);
    }})()"""


def clear_layer_marks():
    # earlier taps wrap words in spans; reopening is not needed, the matching reads the text nodes
    c.js("bsLast = null; bsStop();")


c.js("""(() => {
    window.__spoke = 0;   // the app's own voice: every automatic reading of the original
    const speak = window.speakText;
    window.speakText = (text, side, ...rest) => { if (side === 'orig') window.__spoke++; return speak(text, side, ...rest); };
    state.speakSide = 'original';
})()""")

check('4 Aligned timings are kept on import', "bsActiveSet().timing === 'aligned'")

x, y = word_point('Maroc')
c.touch_tap(x, y)   # a real tap on the word: the reader wraps it and calls bsTapWord
check('5 Tapping «Maroc» plays the word said on its own (its sound, without the silence around it)', played([['maroc', *ALONE['maroc']]]))
check('5b Only the bytes of that word were decoded (no sentence)', """(() => {
    const set = bsActiveSet(), buf = bsDecoded.get(set.id + '#@maroc');
    return !!buf && buf.duration > ALONE_END && bsDecoded.size === 1;
})()""".replace('ALONE_END', str(ALONE['maroc'][1])))
check('5c A tap the narration covers is not read again by the system voice', "window.__spoke === 0")
c.js("bsLast = null; 1")
c.js("els.ttReplayBtn.click(); 1")   # the 🔊 of the translation window
check('5d The 🔊 in the translation window plays «Maroc» said on its own again', played([['maroc', *ALONE['maroc']]]))
check('5e ...not with the system voice', "window.__spoke === 0")

clear_layer_marks()
x, y = word_point('viens', 1)
c.touch_tap(x, y)
check('6 The second «viens» on the page is the second sentence\'s «viens», not the first one',
      "bsWordCue(state.lastWordNode, 'viens').x.i === 1 || JSON.stringify(bsWordCue(state.lastWordNode, 'viens').x)")
check('6b ...and plays «viens» said on its own', played([['viens', *ALONE['viens']]]))

clear_layer_marks()
x, y = word_point('Je', 1)
c.touch_tap(x, y)
check('7 The second «Je» is found in sentence 2', "bsWordCue(state.lastWordNode, 'Je').x.i === 1")

clear_layer_marks()
c.js("els.ttExpandBtn.click(); els.ttExpandBtn.click();")   # word → to the sentence end → the whole sentence
check('8 The expand button plays the selected sentence from the narration', played([[1, WORDS[1][0][0], WORDS[1][3][1]]]))
check('8b ...and the system voice stays silent for it', "window.__spoke === 0")
c.js("bsStop(); bsLast = null; els.ttReplayBtn.click(); 1")
check('8f The 🔊 replays the whole sentence from the narration', played([[1, WORDS[1][0][0], WORDS[1][3][1]]]))
check('8g A press while it plays starts it again from the start', "(() => { bsLast = null; els.ttReplayBtn.click(); return true; })()")
check('8h ...the same sentence, no system voice', "(" + played([[1, WORDS[1][0][0], WORDS[1][3][1]]]) + ") === true && window.__spoke === 0")

check('8c A word still decoding when the sentence is asked for does not play over it (the newer tap wins)', """(async () => {
    const decode = bsDecode;
    bsDecoded.clear(); bsLast = null;
    bsDecode = async (set, index) => {   // the word said alone decodes slowly, as a big file on a tablet does
        const buf = await decode(set, index);
        if (typeof index === 'string') await new Promise(r => setTimeout(r, 500));
        return buf;
    };
    try {
        const node = document.querySelector('.pdf-page-wrapper[data-page="1"] .pdf-text-layer span');
        const word = bsTapWord(state.lastWordNode, 'Je');
        await bsTapPhrase(node, 'Je viens du Japon.');
        await word;
    } finally { bsDecode = decode; }
    return true;
})()""")
check('8d ...the sentence is what was played last', played([[1, WORDS[1][0][0], WORDS[1][3][1]]]))
check('8e A stop cancels a tap that is still decoding', """(async () => {
    bsDecoded.clear(); bsLast = null;
    const word = bsTapWord(state.lastWordNode, 'Je');
    bsStop();
    await word;
    return bsLast === null && bsCurrent === null;
})()""")

check('9 A later lookup from another path is read by the system voice again (the mark is used once)', """(() => {
    handleWordOrSelection('bonjour', 200, 200);
    return window.__spoke === 1 || window.__spoke;
})()""")

check('10 A selected pair of words of a sentence is left to the system voice (owner: words said alone strung together sound choppy)', f"""(async () => {{
    window.__starts = [];   // when each piece is scheduled (AudioBufferSourceNode.start)
    const start = AudioBufferSourceNode.prototype.start;
    if (!start.__wrapped) {{ AudioBufferSourceNode.prototype.start = function (when, ...rest) {{ __starts.push([when, ...rest]); return start.call(this, when, ...rest); }}; AudioBufferSourceNode.prototype.start.__wrapped = true; }}
    const node = document.querySelector('.pdf-page-wrapper[data-page="1"] .pdf-text-layer span');
    bsLast = null;
    return (await bsTapPhrase(node, 'viens du')) === false && bsCanPhrase(node, 'viens du') === false && bsLast === null;
}})()""")
check('10b ...and through the reader\'s entry: not taken by the narration, so the system voice reads it', """(() => {
    const node = document.querySelector('.pdf-page-wrapper[data-page="1"] .pdf-text-layer span');
    return bsSpeakTap(node, 'viens du', false) === false && bsTrace[bsTrace.length - 1].why === 'not in the narration';
})()""")
check('10c One word selected inside a sentence still plays that word said alone', f"""(async () => {{
    const node = document.querySelector('.pdf-page-wrapper[data-page="1"] .pdf-text-layer span');
    return (await bsTapPhrase(node, 'viens')) === true;
}})()""")
check('10d ...«viens» said on its own', played([['viens', *ALONE['viens']]]))

check('11 A selection over the end of one sentence and the start of the next (pairs of words): the system voice', """(() => {
    const node = document.querySelector('.pdf-page-wrapper[data-page="1"] .pdf-text-layer span');
    return bsCanPhrase(node, 'du Maroc. Je viens') === false && bsCanPhrase(node, 'Je viens du Maroc. Je viens') === false;
})()""")
check('11b2 A whole sentence plus one word of the next: the sentence\'s speech, then that word said alone', f"""(async () => {{
    const node = document.querySelector('.pdf-page-wrapper[data-page="1"] .pdf-text-layer span');
    return (await bsTapPhrase(node, 'Je viens du Maroc. Je')) === true;
}})()""")
check('11b3 ...sentence 1 whole, then «Je» said alone', played([[0, WORDS[0][0][0], WORDS[0][3][1]], ['je', *ALONE['je']]]))

check('11c A word printed in pieces («Jap» + a coloured «on») plays the whole word', """(async () => {
    const layer = document.querySelector('.pdf-page-wrapper[data-page="1"] .pdf-text-layer');
    const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT);
    let t; while ((t = walker.nextNode()) && !t.nodeValue.includes('Japon'));
    const at = t.nodeValue.indexOf('Japon');
    const r1 = document.createRange(); r1.setStart(t, at); r1.setEnd(t, at + 3);
    const jap = document.createElement('span'); r1.surroundContents(jap);
    const rest = jap.nextSibling, r2 = document.createRange(); r2.setStart(rest, 0); r2.setEnd(rest, 2);
    r2.surroundContents(document.createElement('span'));
    return (await bsTapWord(jap, 'Jap')) === true;
})()""")
check('11d ...«Japon» said on its own', played([['japon', *ALONE['japon']]]))

check('11e A word the lexicon lacks is NOT cut from its sentence: the tap falls to the system voice', """(async () => {
    const set = bsActiveSet();
    delete set.lexicon.maroc;
    bsLast = null;
    const layer = document.querySelector('.pdf-page-wrapper[data-page="1"] .pdf-text-layer');
    const node = [...layer.querySelectorAll('.word-visited')].find(n => n.textContent === 'Maroc');
    return (await bsTapWord(node, 'Maroc')) === false && bsCanWord(node, 'Maroc') === false && bsLast === null;
})()""")
check('11f ...and a part of a sentence holding that word is not played either (no piece cut out of the sentence)', """(() => {
    const node = document.querySelector('.pdf-page-wrapper[data-page="1"] .pdf-text-layer span');
    return bsCanPhrase(node, 'du Maroc') === false && bsCanPhrase(node, 'Je viens du Maroc.') === true;
})()""")

check('12 A word that is not in the narration is not played', """(async () => {
    const node = document.querySelector('.pdf-page-wrapper[data-page="1"] span');
    return (await bsTapWord(node, 'Paris')) === false;
})()""")

check('13 Removing the narration from the dialog empties the list', """(async () => {
    await bsRemoveFromDialog();
    return bsSets.list.length === 0 && bsActiveSet() === null;
})()""")

check('13b One file (the JSON inside the MP3\'s tag) is enough to add a narration', """(async () => {
    await bsImport([window.__packed]);
    const set = bsActiveSet();
    return !!set && set.sentences.length === 2 && !!set.lexicon.maroc && set.timing === 'aligned' && set.audioName === 'Speech test - voice.mp3';
})()""", timeout=20)
check('13c ...and it plays: the audio is the part after the tag', """(async () => {
    const node = document.querySelector('.pdf-page-wrapper[data-page="1"] .pdf-text-layer span');
    return (await bsTapPhrase(node, 'Je viens du Japon.')) === true && bsDecoded.get(bsActiveSet().id + '#1').duration > 2;
})()""")
check('13d A narration made for another book (other page count) is refused', """(async () => {
    await bsRemoveFromDialog();
    await bsImport([window.__otherBook]);
    return bsSets.list.length === 0;
})()""", timeout=20)
check('13d2 Another book with the same page count is refused by its text', """(async () => {
    await bsImport([window.__sameSize]);
    return bsSets.list.length === 0 && bsTrace.some(x => x.ev === 'import-refused' && x.why === 'another book (text differs)');
})()""", timeout=20)
check('13e A plain MP3 that is not a narration is refused', """(async () => {
    await bsImport([new File([new Uint8Array([0xff, 0xfb, 0x90, 0x00, 1, 2, 3, 4, 5, 6, 7, 8])], 'song.mp3', { type: 'audio/mpeg' })]);
    return bsSets.list.length === 0;
})()""")

check('13f The 📋 report tells what the narration did: taps, the refused import of another book, stored narrations', """(async () => {
    await bsImport([window.__packed]);
    await bsReadStored();
    const r = JSON.parse(buildDiagnosticsReport()).bookSpeech, ev = r.trace.map(x => x.ev);
    const why = r.trace.filter(x => x.ev === 'tap').map(x => x.why);
    return r.book === state.bookKey && r.narrations.length === 1 && r.narrations[0].sentences === 2 && r.active === r.narrations[0].voice
        && why.includes('narration') && r.trace.some(x => x.ev === 'import-refused' && x.why === 'another book')
        && ev.includes('import-saved') && r.stored.speech.some(id => id.startsWith(state.bookKey + ' | ')) || JSON.stringify(r);
})()""", timeout=20)
check('13g A book without narration: the tap is recorded as falling to the system voice', """(() => {
    const keep = bsSets.list; bsSets.list = [];
    const node = document.querySelector('.pdf-page-wrapper[data-page="1"] .pdf-text-layer span');
    const said = bsSpeakTap(node, 'Maroc', true);
    bsSets.list = keep;
    const last = bsTrace[bsTrace.length - 1];
    return said === false && last.ev === 'tap' && last.why === 'no narration for this book' || JSON.stringify(last);
})()""")

# The Grammar panel's conjugation rows are said with one tap, from the open book's narration: a recorded sentence saying
# exactly the row, else (one word) that word said alone, else the system voice.
check('16 The book\'s narration is back for the Grammar checks', """(async () => {
    await bsRemoveFromDialog();
    await bsImport([window.__packed]);
    return bsSets.list.length === 1;
})()""", timeout=20)
check('16b A phrase that is a whole recorded sentence plays that sentence, whole', """(() => {
    const f = bsPhraseAnywhere('Je viens du Maroc.');
    return !!f && f.plan.length === 1 && f.plan[0].i === 0 && f.plan[0].word === undefined || JSON.stringify(f && f.plan);
})()""")
check('16c A phrase of two words no sentence says («je viens») is left to the system voice', "bsPhraseAnywhere('je viens') === null")
check('16c2 One recorded word plays that word said alone', """(() => {
    const f = bsPhraseAnywhere('viens');
    return !!f && f.plan.map(p => p.word).join() === 'viens' || JSON.stringify(f && f.plan);
})()""")
check('16d A phrase with a word nobody recorded is left to the system voice', "bsPhraseAnywhere('nous venons') === null")
c.js("""(() => {
    window.__spoke = 0; bsLast = null;
    window.__sayIn = []; const sayIn = window.speakInLang; window.speakInLang = (text, lang, ...rest) => { __sayIn.push([text, lang]); };
    renderGrammarFocusDetail({ pos: 'verb', surface: 'viens', lemma: 'venir', features: {},
        forms: { 'je': 'viens', 'tu': 'viens', 'il / elle / on': 'vient', 'nous': 'venons', 'vous': 'venez', 'ils / elles': 'viennent' } }, 'fr');
    return 1;
})()""")
check("17 A verb's conjugation rows in Grammar are buttons saying «je viens», «nous venons»…", """(() => {
    const rows = [...els.grammarContent.querySelectorAll('.grammar-grid-row.speakable')];
    return rows.length === 6 && rows[0].getAttribute('aria-label') === 'je viens' && rows[2].getAttribute('aria-label') === 'il vient' || rows.map(r => r.getAttribute('aria-label')).join();
})()""")
c.js("els.tooltip.style.display = 'none'; els.grammarContent.querySelector('.grammar-grid-row.speakable').click(); 1")
check('17b One tap on «je viens» (two words, no recorded sentence): the system voice, in French, no window', """(() =>
    bsLast === null && JSON.stringify(__sayIn) === JSON.stringify([['je viens', 'fr']]) && els.tooltip.style.display !== 'flex' || [JSON.stringify(bsLast), JSON.stringify(__sayIn)].join(' | '))()""")
c.js("bsLast = null; __sayIn.length = 0; els.grammarContent.querySelectorAll('.grammar-grid-row.speakable')[3].click(); 1")
check('17c One tap on «nous venons» (not recorded): the system voice, in French', "bsLast === null && JSON.stringify(__sayIn) === JSON.stringify([['nous venons', 'fr']]) || JSON.stringify(__sayIn)")

check('14 No uncaught errors occurred', "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL BOOK SPEECH CHECKS PASSED')
