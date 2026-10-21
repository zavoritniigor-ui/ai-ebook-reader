"""Browser tests for js/book-speech.js: import a narration (MP3 + JSON), tap a word or select a sentence in a PDF, hear it.

The narration here is synthetic: two WAV sentences joined into one file named like a generated MP3. Chrome sniffs the content,
so the decode of a byte range, the word cut and the import all run as they do for a real chapter; the MP3 frames are not tested.
"""
import base64, json, os, struct, math, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
RATE = 8000


def wav_bytes(duration_ms, freq):
    n = max(1, int(RATE * duration_ms / 1000))
    pcm = b''.join(struct.pack('<h', int(12000 * math.sin(2 * math.pi * freq * i / RATE))) for i in range(n))
    return struct.pack('<4sI4s4sIHHIIHH4sI', b'RIFF', 36 + len(pcm), b'WAVE', b'fmt ', 16, 1, 1, RATE, RATE * 2, 2, 16,
                       b'data', len(pcm)) + pcm


def page_pdf_b64():
    """One page with «Je viens du Maroc. Je suis espagnol.» in one text line (the text layer the reader works on)."""
    ops = b'BT /F1 14 Tf 50 700 Td (Je viens du Maroc. Je suis espagnol.) Tj ET'
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


A = wav_bytes(600, 440)   # «Je viens du Maroc.»
B = wav_bytes(800, 330)   # «Je suis espagnol.»
SPEECH_MP3 = A + B
SPEECH_JSON = json.dumps({
    'voice': 'fr-TEST-Voice', 'rate': '0%', 'pages': [1], 'audio': 'speech_test.mp3',
    'sentences': [
        {'page': 1, 'text': 'Je viens du Maroc.', 'bytes': [0, len(A)], 'duration': 0.6,
         'words': [{'s': 0, 'e': 2, 'start': 0, 'end': 150}, {'s': 3, 'e': 8, 'start': 170, 'end': 350},
                   {'s': 9, 'e': 11, 'start': 370, 'end': 430}, {'s': 12, 'e': 17, 'start': 450, 'end': 600}]},
        {'page': 1, 'text': 'Je suis espagnol.', 'bytes': [len(A), len(A) + len(B)], 'duration': 0.8,
         'words': [{'s': 0, 'e': 2, 'start': 0, 'end': 150}, {'s': 3, 'e': 7, 'start': 170, 'end': 350},
                   {'s': 8, 'e': 17, 'start': 370, 'end': 780}]},
    ],
}, ensure_ascii=False)

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
}})()""")

check('1 The PDF opens and its page 1 text layer is there', """(() => {
    const w = document.querySelector('.pdf-page-wrapper[data-page="1"]');
    return !!w && w.textContent.includes('Maroc');
})()""")

check('2 Importing a MP3 + JSON pair stores one narration for the book', """(async () => {
    await bsImport([window.__json, window.__mp3]);
    return bsSets.list.length === 1 && bsSets.list[0].sentences.length === 2 && bsSets.list[0].voice === 'fr-TEST-Voice';
})()""", timeout=20)

check('3 A JSON that describes another MP3 file is refused and not stored', """(async () => {
    const other = new File([new Uint8Array([1, 2, 3])], 'other.mp3', { type: 'audio/mpeg' });
    const before = bsSets.list.length;
    await bsImport([window.__json, other]);
    return bsSets.list.length === before;
})()""")

state_js = """(() => {
    state.translateMode = true;
    const text = [...document.querySelectorAll('.pdf-page-wrapper[data-page="1"] span')].find(n => n.textContent.includes('Maroc')).firstChild;
    const at = text.textContent.indexOf('Maroc');
    const r = document.createRange();
    r.setStart(text, at); r.setEnd(text, at + 3);
    const b = r.getBoundingClientRect();
    return [b.left + b.width / 2, b.top + b.height / 2];
})()"""
x, y = c.js(state_js)
c.touch_tap(x, y)   # a real tap on the word: the reader wraps it and calls bsTapWord

check('4 Tapping a word plays it from its sentence (the decode uses that sentence\'s bytes only)', """(() => {
    const set = bsActiveSet();
    return !!bsCurrent && bsDecoded.has(set.id + '#0') && bsDecoded.get(set.id + '#0').duration > 0.5;
})()""")

check('5 A word that is not in the narration is not played', """(async () => {
    const node = document.querySelector('.pdf-page-wrapper[data-page="1"] span');
    return (await bsTapWord(node, 'Paris')) === false;
})()""")

check('6 A selected sentence plays from its own bytes', """(async () => {
    const node = document.querySelector('.pdf-page-wrapper[data-page="1"] span');
    const played = await bsTapPhrase(node, 'Je suis espagnol.');
    return played === true && bsDecoded.has(bsActiveSet().id + '#1');
})()""")

check('7 Removing the narration from the dialog empties the list', """(async () => {
    await bsRemoveFromDialog();
    return bsSets.list.length === 0 && bsActiveSet() === null;
})()""")

check('8 No uncaught errors occurred', "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL BOOK SPEECH CHECKS PASSED')
