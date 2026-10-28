"""Browser tests for js/book-speech.js (the books folder): a book opened from a folder where its narration lies gets the
narration by itself. The real folder picker (showDirectoryPicker) cannot be driven from a test, so the remembered folder is a
stand-in with the same methods (queryPermission, requestPermission, entries) holding the packed narration of
tools/book_tts/pack.py. The rules checked: a matching narration is imported when the book opens; one in a subfolder too; a
narration of another book is refused; a book that has its narration is left alone; the permission is asked only from a click.
"""
import base64, json, os, time
from browser_cdp import CDP

FIXTURE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixtures', 'book_speech')
with open(os.path.join(FIXTURE, 'speech_test.mp3'), 'rb') as f:
    SPEECH_MP3 = f.read()
with open(os.path.join(FIXTURE, 'speech_test.json'), encoding='utf-8') as f:
    META = json.loads(f.read())


def page_pdf_b64():
    """One page with «Je viens du Maroc. Je viens du Japon.» in its text layer (the same fixture as book_speech_browser.py)."""
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


def packed(pages, meta=META):
    """One-file narration as tools/book_tts/pack.py writes it: the JSON in an ID3v2.4 GEOB frame before the MP3."""
    def safe(n):
        return bytes([(n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f])
    meta = dict(meta, pdf={'name': 'Speech_test.pdf', 'pages': pages})
    body = (b'\x03application/json\x00narration.json\x00ai-ebook-reader-narration\x00'
            + json.dumps(meta, ensure_ascii=False).encode('utf-8'))
    frame = b'GEOB' + safe(len(body)) + b'\x00\x00' + body
    return b'ID3\x04\x00\x00' + safe(len(frame)) + frame + SPEECH_MP3


URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')

c = CDP()
c.call('Page.enable')
c.call('Runtime.enable')
c.call('Emulation.setDeviceMetricsOverride', width=1024, height=768, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState === 'complete' && !document.body.inert")
c.js("localStorage.clear(); showUpdateBanner = () => {}; document.getElementById('sw-update-banner')?.remove();")


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


def b64(data):
    return base64.b64encode(data).decode()


PDF = page_pdf_b64()
MATCH = b64(packed(1))                                   # this book: 1 page, named as the open PDF below
OTHER = b64(packed(99))                                  # another book (another page count)

# The stand-in folder. Browsers need a click for the permission; the test records how it was asked.
c.js(f"""(() => {{
    const toFile = (b64, name, type) => {{
        const raw = atob(b64), u8 = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
        return new File([u8], name, {{ type }});
    }};
    window.__pdf = toFile('{PDF}', 'Speech_test.pdf', 'application/pdf');
    window.__match = toFile('{MATCH}', 'Speech test - voice.mp3', 'audio/mpeg');
    window.__other = toFile('{OTHER}', 'Other book - voice.mp3', 'audio/mpeg');
    window.__perm = 'granted';   // the permission the user gave in this session; test 5 starts again from 'prompt'
    window.__asked = [];
    const file = (name, data) => ({{ kind: 'file', getFile: async () => data }});
    const folder = (name, entries) => ({{ kind: 'directory', name, entries: () => (async function* () {{ for (const e of entries) yield e; }})() }});
    window.__folder = (entries) => ({{
        name: 'Books', kind: 'directory',
        queryPermission: async () => window.__perm,
        requestPermission: async (opts) => {{ window.__asked.push(opts && opts.mode); window.__perm = 'granted'; return 'granted'; }},
        entries: () => (async function* () {{ for (const e of entries) yield e; }})()
    }});
    window.__file = file; window.__folderEntry = folder;
    if (!window.showDirectoryPicker) window.showDirectoryPicker = async () => {{ throw new Error('cancelled'); }};
    window.__remember = (dir) => {{ window.bfGet = async () => ({{ id: 'books', handle: dir, name: dir.name }}); }};
    return true;
}})()""")

# 1. the book opens: its narration lies in the remembered folder, so it is imported by itself
c.js("window.__remember(window.__folder([['Speech test - voice.mp3', window.__file('Speech test - voice.mp3', window.__match)]]))")
c.js("openBookFile(window.__pdf)")
check('1 Opening the book imports its narration from the remembered folder', """(async () => {
    for (let i = 0; i < 100 && !(bsSets.list.length === 1 && state.bookKey); i++) await new Promise(r => setTimeout(r, 100));
    return bsSets.list.length === 1 && bsSets.list[0].voice === 'fr-CA-SylvieNeural' && bsSets.list[0].sentences.length === 2;
})()""", timeout=30)

# 2. the book has its narration now: a second run does nothing (and does not ask for anything)
check('2 A book that has its narration is left alone', """(async () => {
    const before = bsSets.list.length;
    const got = await bsAutoImportFromFolder(false);
    return got === false && bsSets.list.length === before && window.__asked.length === 0;
})()""")

# 3. the narration is in a subfolder of the remembered folder (one level down)
c.js("""(async () => {
    await bsDelete(state.bookKey); await bsRefresh();
    window.__remember(window.__folder([['Lectures', window.__folderEntry('Lectures', [['voix.mp3', window.__file('voix.mp3', window.__match)]])]]));
})()""")
check('3 A narration in a subfolder of the remembered folder is found too', """(async () => {
    const got = await bsAutoImportFromFolder(false);
    return got === true && bsSets.list.length === 1;
})()""", timeout=30)

# 4. another book's narration in the folder is refused; nothing is stored
c.js("""(async () => {
    await bsDelete(state.bookKey); await bsRefresh();
    window.__remember(window.__folder([['Other book - voice.mp3', window.__file('Other book - voice.mp3', window.__other)]]));
})()""")
check('4 Another book’s narration in the folder is refused', """(async () => {
    const got = await bsAutoImportFromFolder(false);
    return got === false && bsSets.list.length === 0;
})()""", timeout=30)

# 5. the permission is asked only from a click: quiet runs leave a 'prompt' alone, a click asks and imports
c.js("""(async () => {
    window.__perm = 'prompt'; window.__asked = [];
    window.__remember(window.__folder([['Speech test - voice.mp3', window.__file('Speech test - voice.mp3', window.__match)]]));
})()""")
check('5a A quiet run with no permission does not ask for it and imports nothing', """(async () => {
    const got = await bsAutoImportFromFolder(false);
    return got === false && window.__asked.length === 0 && bsSets.list.length === 0;
})()""")
check('5b A click asks for the permission and imports the narration', """(async () => {
    const got = await bsAutoImportFromFolder(true);
    return got === true && window.__asked.length === 1 && window.__asked[0] === 'read' && bsSets.list.length === 1;
})()""", timeout=30)

# 6. nothing remembered: nothing happens and nothing breaks
c.js("""(async () => {
    await bsDelete(state.bookKey); await bsRefresh();
    window.bfGet = async () => null;
})()""")
check('6 With no folder remembered the book opens without a narration and no error', """(async () => {
    const got = await bsAutoImportFromFolder(true);
    return got === false && bsSets.list.length === 0 && typeof bsRenderFolderRow === 'function';
})()""")

# 7. the book's package (its PDF and an audio folder of any name with a CD track) gives the dialogue tracks when the book opens
c.js("""(async () => {
    await bsDelete(state.bookKey); await bsRefresh(); await baDeleteBook(state.bookKey); await refreshBookAudio();
    window.__m4a = new File([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])], '74 Track 74.m4a', { type: 'audio/mp4' });
    window.bfGet = async () => ({ id: 'books', handle: window.__folder([
        ['Speech_test.pdf', window.__file('Speech_test.pdf', window.__pdf)],
        // the audio folder may be called anything (book_audio_rules §5.1); a «.work» cache and another book's package are not read
        ['Tracks', window.__folderEntry('Tracks', [['A1 CD1', window.__folderEntry('A1 CD1', [['74 Track 74.m4a', window.__file('74 Track 74.m4a', window.__m4a)]])]])],
        ['.work', window.__folderEntry('.work', [['0001.m4a', window.__file('0001.m4a', window.__m4a)]])],
        ['Other book', window.__folderEntry('Other book', [['Other.pdf', window.__file('Other.pdf', window.__pdf)], ['12 Track 12.m4a', window.__file('12 Track 12.m4a', window.__m4a)]])],
    ]), name: 'Books' });
    openBookFile(window.__pdf);
})()""")
check('7 Opening the book imports its dialogue track from the package folder', """(async () => {
    for (let i = 0; i < 100 && !bookAudio.tracks.length; i++) await new Promise(r => setTimeout(r, 100));
    return bookAudio.tracks.length === 1 && bookAudio.tracks[0].track === 74 && bookAudio.tracks[0].cd === 1;
})()""", timeout=30)

# 8-11 (owner, 2026-10-26: «знаходить папку, і все»): a whole storage chosen as the folder, a newer narration file,
# and nothing left silent
c.js("""(async () => {
    await bsDelete(state.bookKey); await bsRefresh(); window.__perm = 'granted';
    window.__toasts = []; const keep = showToast; window.showToast = (m) => { window.__toasts.push(String(m)); return keep(m); };
    const deep = window.__folderEntry('textbook 5-6', [['Speech test - voice.mp3', window.__file('Speech test - voice.mp3', window.__match)]]);
    window.__remember(window.__folder([['Download', window.__folderEntry('Download', [['Books', window.__folderEntry('Books', [['a French textbook', window.__folderEntry('a French textbook', [['textbook 5-6', deep]])]])]])]]));
})()""")
check('8 A narration four folders down (a whole storage chosen as the folder) is found, with a message', """(async () => {
    const got = await bsAutoImportFromFolder(true);
    return got === true && bsSets.list.length === 1 && window.__toasts.some(m => m === t('bfFound')) && window.__toasts.some(m => m.startsWith(t('bfSearching').split('«')[0]));
})()""", timeout=30)
c.js("""(async () => {
    window.__toasts = [];
    window.__remember(window.__folder([['Speech test - voice v2.mp3', window.__file('Speech test - voice v2.mp3', new File([window.__match], 'Speech test - voice v2.mp3', { type: 'audio/mpeg' }))]]));
})()""")
check('9 A newer narration file of the same voice replaces the one the book has (was: left alone forever)', """(async () => {
    const got = await bsAutoImportFromFolder(false);
    return got === true && bsSets.list.length === 1 && bsSets.list[0].audioName === 'Speech test - voice v2.mp3';
})()""", timeout=30)
check('10 The same file again: nothing is stored twice, a click says it is connected already', """(async () => {
    window.__toasts = []; const got = await bsAutoImportFromFolder(true);
    return got === false && bsSets.list.length === 1 && window.__toasts.includes(t('bfUpToDate'));
})()""")
c.js("""(async () => { window.__toasts = []; window.__remember(window.__folder([['Other book - voice.mp3', window.__file('Other book - voice.mp3', window.__other)]])); })()""")
check('11 No narration of this book in the folder: a click says so (never silent)', """(async () => {
    const got = await bsAutoImportFromFolder(true);
    return got === false && window.__toasts.some(m => m.includes('Speech_test.pdf'));
})()""")
check('12 A narration chosen with no book open, or while one is still being connected, says why', """(async () => {
    window.__toasts = []; bsImporting = true; await bsImport([window.__match]); bsImporting = false;
    return window.__toasts.includes(t('spkBusy'));
})()""")

print('PASS: all book folder checks')
