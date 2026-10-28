"""Browser tests for js/book-audio.js: tap a 'piste' mark in a PDF -> hear the track."""
import base64, json, os, struct, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')


def make_wav_b64(duration_ms=250, freq=440, sample_rate=8000):
    n_samples = max(1, int(sample_rate * duration_ms / 1000))
    import math
    pcm = bytearray()
    for i in range(n_samples):
        val = int(12000 * math.sin(2 * math.pi * freq * i / sample_rate))
        pcm += struct.pack('<h', val)
    data_size = len(pcm)
    header = struct.pack(
        '<4sI4s4sIHHIIHH4sI',
        b'RIFF', 36 + data_size, b'WAVE',
        b'fmt ', 16, 1, 1, sample_rate, sample_rate * 2, 2, 16,
        b'data', data_size,
    )
    return base64.b64encode(header + pcm).decode()


def make_piste_pdf_b64():
    """Two-page synthetic PDF with textbook-style piste marks:
      Page 1:
        - 'Activite 1 (CD1 - piste 3) Ecoutez le dialogue.' in one text item
        - 'CD2 -' and 'piste 15' split across two adjacent text items on one line
        - 'Look at track 5 in the table and piste 0.' (neither is a valid piste mark!)
        - 'Ecoutez piste 7.' (bare piste mark without CD)
      Page 2 (rotated /Rotate 90):
        - 'Exercice : CD1 - piste 3 encore.'
    """
    objs = [
        b'<< /Type /Catalog /Pages 2 0 R >>',
        b'',
        b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ]
    p1_ops = '\n'.join([
        'BT /F1 14 Tf 50 720 Td (Activite 1 \\(CD1 - piste 3\\) Ecoutez le dialogue.) Tj ET',
        'BT /F1 14 Tf 50 660 Td (Dialogue : CD2 -) Tj ET',
        'BT /F1 14 Tf 162 660 Td (piste 15 dans le livre.) Tj ET',
        'BT /F1 14 Tf 50 600 Td (Look at track 5 in the table and piste 0.) Tj ET',
        'BT /F1 14 Tf 50 540 Td (Ecoutez piste 7 maintenant.) Tj ET',
    ]).encode()
    p2_ops = b'BT /F1 14 Tf 60 400 Td (Exercice : CD1 - piste 3 encore.) Tj ET'

    objs.append(b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R >>')
    objs.append(f'<< /Length {len(p1_ops)} >>\nstream\n'.encode() + p1_ops + b'\nendstream')
    objs.append(b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Rotate 90 /Resources << /Font << /F1 3 0 R >> >> /Contents 7 0 R >>')
    objs.append(f'<< /Length {len(p2_ops)} >>\nstream\n'.encode() + p2_ops + b'\nendstream')
    objs[1] = b'<< /Type /Pages /Count 2 /Kids [4 0 R 6 0 R] >>'

    data = b'%PDF-1.4\n'
    offsets = [0]
    for i, obj in enumerate(objs, 1):
        offsets.append(len(data))
        data += f'{i} 0 obj\n'.encode() + obj + b'\nendobj\n'
    xref = len(data)
    data += f'xref\n0 {len(objs)+1}\n0000000000 65535 f \n'.encode()
    data += b''.join(f'{o:010d} 00000 n \n'.encode() for o in offsets[1:])
    data += f'trailer << /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF'.encode()
    return base64.b64encode(data).decode()


c = CDP()


def check(name, expr, timeout=10):
    deadline = time.monotonic() + timeout
    last = None
    while time.monotonic() < deadline:
        last = c.js(expr)
        if last is True:
            print('PASS:', name)
            return
        time.sleep(0.1)
    raise AssertionError(f'FAIL: {name} -> {last!r}')


c.call('Page.enable')
c.call('Runtime.enable')
c.call('Emulation.setDeviceMetricsOverride', width=1024, height=768, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState === 'complete' && !document.body.inert")
c.js("window.__errors = []; window.addEventListener('error', e => __errors.push(e.message));")

# ---------------------------------------------------------------- 1. File-name & mark parsing unit contracts
check('1 baParseFile parses a French textbook folder/file names and FLS2_EP01_P1 without confusing EP01 for track 1', """(() => {
    const a = baParseFile('01 Track 01.m4a', 'audio 12/A1 CD1/01 Track 01.m4a');
    const b = baParseFile('15 Track 15.m4a', 'audio 12/A1 CD2/15 Track 15.m4a');
    const c = baParseFile('03 Track 03 1.m4a', '03 Track 03 1.m4a');
    const d = baParseFile('FLS2_EP01_P3.mp3', 'FLS2_EP01_P3.mp3');
    const e = baParseFile('Track 00.mp3', 'Track 00.mp3');
    return a.cd === 1 && a.track === 1 &&
           b.cd === 2 && b.track === 15 &&
           c.cd === null && c.track === 3 && c.copy === 1 &&
           d.cd === null && d.track === 3 &&
           e.track === null;
})()""")

check('1b Generic name rules (book_audio_rules §4): sections, «t006» over a page «p011», parts of discs, disc and section numbers never taken for the track, hidden folders', """(() => {
    const s = baParseFile('XYZ_EP02_P12.mp3', 'audio/XYZ_EP02_P12.mp3');
    const page = baParseFile('ABC_CA_B2_p011_t006.mp3', 'ABC_CA_B2_p011_t006.mp3');
    const part = baParseFile('23 Audio Track.m4a', 'audio/A2 CD1-2/23 Audio Track.m4a');
    const part2 = baParseFile('5 Audio Track.aiff', 'audio/CD 2-1/5 Audio Track.aiff');
    const unit = baParseFile('02.mp3', 'Unit 4/02.mp3');
    const flat = baParseFile('CD1 - 14 Audio Track.aiff', 'CD1 - 14 Audio Track.aiff');
    const onlyEp = baParseFile('EP03.mp3', 'EP03.mp3');
    return s.section === 2 && s.track === 12 && s.cd === null && baSetOf(s) === 'sec' &&
           page.track === 6 && page.section === null &&
           part.cd === 1 && part.track === 23 && baSetOf(part) === 'cd' &&
           part2.cd === 2 && part2.track === 5 &&
           unit.section === 4 && unit.track === 2 &&
           flat.cd === 1 && flat.track === 14 &&
           onlyEp.section === 3 && onlyEp.track === null &&
           baHiddenPath('Book/.work/cache/0001.mp3') && baHiddenPath('__MACOSX/a/b.mp3') && !baHiddenPath('Book/audio 12/A1 CD1/01 Track 01.m4a') && !baHiddenPath('.hidden-name.mp3')
        || JSON.stringify([s, page, part, part2, unit, flat, onlyEp]);
})()""")

check('2 baAssignDiscs splits flat duplicate track numbers into CD1 and CD2 by copy suffix', """(() => {
    const list = baAssignDiscs([
        baParseFile('03 Track 03 1.m4a', '03 Track 03 1.m4a'),
        baParseFile('03 Track 03.m4a', '03 Track 03.m4a'),
        baParseFile('07 Piste 07.mp3', '07 Piste 07.mp3'),
    ]);
    const t3 = list.filter(x => x.track === 3);
    const t7 = list.find(x => x.track === 7);
    return t3.length === 2 &&
           t3.find(x => x.copy === 0).cd === 1 &&
           t3.find(x => x.copy === 1).cd === 2 &&
           t7.cd === null;
})()""")

check('3 baFindMarks finds CD+piste and bare French/Spanish piste/plage/pista, ignoring bare English track and piste 0', """(() => {
    const m = baFindMarks('Activite (CD1 - piste 3), CD2- piste 015, bare piste 7, track 5, CD1 - track 9, apiste 2, piste 0, étage. iCD1- piste 4, 10. la plage 11. le ruisseau, sur la plage 3');
    return JSON.stringify(m.map(x => [x.cd, x.track])) === JSON.stringify([[1,3],[2,15],[null,7],[1,9],[1,4]]);
})()""")

check('3b A word of the next table column is not a mark («10. plage      20. calepin»); a mark split over two touching items still is', """(() => {
    const vp = { convertToViewportPoint: (x, y) => [x, 800 - y] };
    const it = (str, x, w) => ({ str, transform: [12, 0, 0, 12, x, 500], width: w, height: 12 });
    const table = baMarkBoxes([it('10. plage', 50, 50), it('20. calepin', 300, 60)], vp);
    const split = baMarkBoxes([it('Dialogue : CD2 -', 50, 100), it('piste 15', 152, 45)], vp);
    return table.length === 0 && split.length === 1 && split[0].cd === 2 && split[0].track === 15 || JSON.stringify({ table, split });
})()""")

# ---------------------------------------------------------------- 2. Open PDF and verify markers
PDF_B64 = make_piste_pdf_b64()
WAV_B64 = make_wav_b64()
c.js(f"window.__WAV = '{WAV_B64}'; 1")

c.js(f"""(async () => {{
    const raw = atob('{PDF_B64}');
    const u8 = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
    const file = new File([u8], 'Textbook_test.pdf', {{ type: 'application/pdf' }});
    await openBookFile(file);
}})()""")

check('4 PDF opens with 3 piste markers on page 1 (single-item CD1-piste 3, split-item CD2-piste 15, bare piste 7 taking CD2 from the mark above)', """(() => {
    const marks = [...document.querySelectorAll('.pdf-page-wrapper[data-page="1"] .pdf-audio-marker')];
    return marks.length === 3 &&
           JSON.stringify(marks.map(b => [b.dataset.cd, b.dataset.track])) === JSON.stringify([['1','3'],['2','15'],['2','7']]);
})()""")

check('5 Tapping a piste marker before audio is connected opens #book-audio-dialog with the connect prompt and does not trigger word translation', """(() => {
    state.translateMode = true;
    const btn = document.querySelector('.pdf-page-wrapper[data-page="1"] .pdf-audio-marker[data-track="3"]');
    btn.click();
    const dlg = document.getElementById('book-audio-dialog');
    return dlg && dlg.open &&
           dlg.querySelector('.ba-subtitle').textContent.includes('Textbook_test') &&
           !dlg.querySelector('.ba-message').hidden &&
           els.tooltip.style.display !== 'flex';
})()""")

check('6 Closing #book-audio-dialog works cleanly', """(() => {
    document.querySelector('#book-audio-dialog .ba-close').click();
    return !document.getElementById('book-audio-dialog').open;
})()""")

# ---------------------------------------------------------------- 3. Import tracks & verify IndexedDB separation
c.js(f"""(async () => {{
    const raw = atob('{WAV_B64}');
    const u8 = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
    const makeFile = (name, relPath) => {{
        const f = new File([u8], name, {{ type: 'audio/wav' }});
        Object.defineProperty(f, 'webkitRelativePath', {{ value: relPath }});
        return f;
    }};
    await importBookAudio([
        makeFile('03 Track 03.wav', 'audio/A1 CD1/03 Track 03.wav'),
        makeFile('15 Track 15.wav', 'audio/A1 CD2/15 Track 15.wav'),
        makeFile('07 Track 07.wav', 'audio/A1 CD1/07 Track 07.wav'),
        makeFile('07 Track 07.wav', 'audio/A1 CD2/07 Track 07.wav'),
    ]);
}})()""")

check('7 Tracks imported: metadata is in tracks store without blobs, blobs are in blobs store, and markers update has-audio', """(async () => {
    const db = await baDb();
    const metaRows = await baReq(db.transaction('tracks', 'readonly').objectStore('tracks').getAll());
    const blobRows = await baReq(db.transaction('blobs', 'readonly').objectStore('blobs').getAll());
    const p1Marks = [...document.querySelectorAll('.pdf-page-wrapper[data-page="1"] .pdf-audio-marker')];
    return bookAudio.tracks.length === 4 &&
           metaRows.length === 4 && metaRows.every(r => !('blob' in r)) &&
           blobRows.length === 4 && blobRows.every(r => r.blob instanceof Blob) &&
           p1Marks[0].classList.contains('has-audio') &&
           p1Marks[1].classList.contains('has-audio') &&
           p1Marks[2].dataset.cd === '2' && p1Marks[2].classList.contains('has-audio');   // bare «piste 7» under «CD2 - piste 15»
})()""")

# ---------------------------------------------------------------- 4. Playback, pause/resume, rate, TTS coordination, stop
check('8 Tapping CD1 - piste 3 starts playback, shows #audio-player, and marks the button .playing', """(async () => {
    const btn = document.querySelector('.pdf-page-wrapper[data-page="1"] .pdf-audio-marker[data-track="3"]');
    btn.click();
    await new Promise(r => setTimeout(r, 80));
    const player = document.getElementById('audio-player');
    return !!bookAudio.playing &&
           player && !player.hidden &&
           player.querySelector('#ap-label').textContent === 'CD1 · piste 3' &&
           btn.classList.contains('has-audio');
})()""")

check('9 Cycling speed updates playbackRate and #ap-rate label', """(() => {
    const rateBtn = document.getElementById('ap-rate');
    rateBtn.click();
    return bookAudioRate() === 1.25 && rateBtn.textContent === '1.25×' && baAudio.playbackRate === 1.25;
})()""")

check('10 Starting TTS pauses book audio automatically', """(() => {
    const u = new SpeechSynthesisUtterance('Bonjour');
    startUtterance(u, state.ttsGen, false);
    if (ttsSynth) ttsSynth.cancel();
    return baAudio.paused === true;
})()""")

check('11 Closing #audio-player stops playback without firing a false baError toast', """(() => {
    const toast = document.getElementById('reader-toast');
    if (toast) toast.classList.remove('show');
    document.getElementById('ap-close').click();
    const errShown = toast && toast.classList.contains('show') && toast.textContent === t('baError');
    return !bookAudio.playing && document.getElementById('audio-player').hidden && !errShown;
})()""")

check('12 A bare piste 7 under «CD2 - piste 15» plays CD2 track 7; a bare piste with no disc on its page and two discs is ambiguous', """(async () => {
    const btn = document.querySelector('.pdf-page-wrapper[data-page="1"] .pdf-audio-marker[data-track="7"]');
    btn.click();
    await new Promise(r => setTimeout(r, 80));
    const played = !!bookAudio.playing && bookAudio.playing.label === 'CD2 · piste 7';
    stopBookAudio();
    const loose = document.createElement('button');
    loose.dataset.cd = ''; loose.dataset.track = '7';
    tapBookAudioMark(loose);
    const toast = document.getElementById('reader-toast');
    return played && !!toast && toast.classList.contains('show') && toast.textContent.includes('piste 7');
})()""")

check('12b Tapping a piste whose track was not chosen opens the dialog to add it (not just a toast)', """(() => {
    const dialog = document.getElementById('book-audio-dialog');
    if (dialog.open) dialog.close();
    const btn = document.createElement('button');
    btn.dataset.cd = '1'; btn.dataset.track = '42';
    tapBookAudioMark(btn);
    const msg = dialog.querySelector('.ba-message');
    const ok = dialog.open && !msg.hidden && msg.textContent.includes('piste 42');
    dialog.close();
    return ok;
})()""")

check('12c A book narration chosen as tracks is not saved as a track («textbook 3-4 …» is not track 4)', """(async () => {
    const safe = n => [(n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f];
    const meta = { voice: 'test-voice', sentences: [{ page: 1, text: 'Bonjour.', bytes: [0, 4], duration: 1, words: [] }] };
    const body = [...new TextEncoder().encode('\\u0003application/json\\u0000narration.json\\u0000ai-ebook-reader-narration\\u0000' + JSON.stringify(meta))];
    const frame = [...new TextEncoder().encode('GEOB'), ...safe(body.length), 0, 0, ...body];
    const bytes = new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, ...safe(frame.length), ...frame, 0xff, 0xfb, 0x90, 0]);
    const before = bookAudio.tracks.length;
    await importBookAudio([new File([bytes], 'textbook 3-4 - Kokoro (ff_siwis).mp3', { type: 'audio/mpeg' })]);
    return bookAudio.tracks.length === before && !bookAudio.tracks.some(r => r.track === 4)
        && bsTrace.some(x => x.ev === 'tracks-narration') || JSON.stringify([before, bookAudio.tracks.map(r => r.name)]);
})()""")

# ---------------------------------------------------------------- 5. Rotated PDF page (page 2 has /Rotate 90)
c.js("navigateToPdfPage(2, { instant: true }); 1")
check('13 Rotated page 2 builds its .pdf-audio-marker for CD1 - piste 3', """(() => {
    const btn = document.querySelector('.pdf-page-wrapper[data-page="2"] .pdf-audio-marker[data-track="3"]');
    if (!btn) return false;
    const r = btn.getBoundingClientRect();
    return btn.dataset.cd === '1' && btn.classList.contains('has-audio') && r.width >= 46 && r.height >= 28;
})()""")

# ---------------------------------------------------------------- 6. Remove book audio
check('13b The dialog is one folder button, «Add by hand» beside a red «Remove», and a green status under them; no «piste», no extra sections', """(() => {
    openBookAudioDialog('');
    const d = document.getElementById('book-audio-dialog'), folder = d.querySelector('.ba-folder'), files = d.querySelector('.ba-files'), remove = d.querySelector('.ba-remove');
    const side = Math.abs(files.getBoundingClientRect().top - remove.getBoundingClientRect().top) < 4;
    const red = getComputedStyle(remove).color !== getComputedStyle(files).color;
    const below = d.querySelector('.ba-status').getBoundingClientRect().top > remove.getBoundingClientRect().bottom;
    const buttons = Array.from(d.querySelectorAll('.ba-body button')).filter(b => b.offsetParent).length;
    return d.querySelector('.ba-status').classList.contains('ba-ok') && folder.classList.contains('btn-primary') && folder.textContent === t('baPickFolder')
        && files.textContent === t('baManual') && !remove.hidden && side && red && below && buttons === 3
        && !d.querySelector('details, .ba-speech, .ba-books') && !/piste/i.test(d.querySelector('.ba-lead').textContent + t('mAudioDesc'))
        || JSON.stringify({ status: d.querySelector('.ba-status').className, folder: folder.textContent, side, red, below, buttons });
})()""")

# the remove asks first: a «no» keeps the audio
c.js("window.__confirm = window.confirm; window.confirm = () => false; document.querySelector('#book-audio-dialog .ba-remove').click(); 1")
check('13c Answering «no» to the remove question keeps the tracks', "bookAudio.tracks.length > 0")
c.js("window.confirm = () => true; document.querySelector('#book-audio-dialog .ba-remove').click(); window.confirm = window.__confirm; 1")
check('14 Removing book audio clears tracks and blobs from IndexedDB and removes .has-audio from markers', """(async () => {
    if (bookAudio.tracks.length !== 0) return false;
    const db = await baDb();
    const metaRows = await baReq(db.transaction('tracks', 'readonly').objectStore('tracks').getAll());
    const blobRows = await baReq(db.transaction('blobs', 'readonly').objectStore('blobs').getAll());
    const anyHasAudio = !!document.querySelector('.pdf-audio-marker.has-audio');
    return metaRows.length === 0 && blobRows.length === 0 && !anyHasAudio;
})()""")

check('16 Tracks saved under the same name and size with another lastModified are still listed', """(async () => {
    const k1 = 'reader_bookmark_book.pdf_123_111', k2 = 'reader_bookmark_book.pdf_123_222';
    await baPut({ id: k1 + '\u0000x', bookKey: k1, cd: 0, track: 1, name: 't', path: 't', type: 'audio/wav', size: 1, blob: new Blob(['a']) });
    const rows = await baList(k2);
    await baDeleteBook(k1);
    return rows.length === 1;
})()""")

check('17 Removing a book also removes tracks saved under the same name and size with another lastModified', """(async () => {
    const k1 = 'reader_bookmark_book.pdf_123_111', k2 = 'reader_bookmark_book.pdf_123_222';
    await baPut({ id: k1 + '\\u0000y', bookKey: k1, cd: 0, track: 1, name: 't', path: 't', type: 'audio/wav', size: 1, blob: new Blob(['a']) });
    await baDeleteBook(k2);
    const left = await baList(k1);
    return left.length === 0;
})()""")

check('14b AIFF and AIFC (NONE, sowt) convert to WAV that decodes to the same samples; compressed AIFC is left alone', """(async () => {
    // 441 frames, 2 channels, 16-bit, 44100 Hz: left +12000, right -12000 in every frame
    function build(form, compression, le) {
        const frames = 441, pcm = new Uint8Array(frames * 4), pv = new DataView(pcm.buffer);
        for (let i = 0; i < frames; i++) { pv.setInt16(i * 4, 12000, le); pv.setInt16(i * 4 + 2, -12000, le); }
        const comm = new Uint8Array(form === 'AIFC' ? 24 : 18), cv = new DataView(comm.buffer);
        cv.setUint16(0, 2); cv.setUint32(2, frames); cv.setUint16(6, 16); cv.setUint16(8, 16398); cv.setBigUint64(10, BigInt(44100) << 48n);
        if (form === 'AIFC') for (let i = 0; i < 4; i++) comm[18 + i] = compression.charCodeAt(i);
        const ssnd = new Uint8Array(8 + pcm.length); ssnd.set(pcm, 8);
        const parts = [];
        for (const [id, body] of [['COMM', comm], ['SSND', ssnd]]) {
            const h = new Uint8Array(8), hv = new DataView(h.buffer);
            for (let i = 0; i < 4; i++) h[i] = id.charCodeAt(i);
            hv.setUint32(4, body.length); parts.push(h, body);
        }
        const sum = parts.reduce((n, x) => n + x.length, 0), out = new Uint8Array(12 + sum), ov = new DataView(out.buffer);
        for (let i = 0; i < 4; i++) out[i] = 'FORM'.charCodeAt(i);
        ov.setUint32(4, 4 + sum);
        for (let i = 0; i < 4; i++) out[8 + i] = (form === 'AIFC' ? 'AIFC' : 'AIFF').charCodeAt(i);
        let o = 12; for (const x of parts) { out.set(x, o); o += x.length; }
        return out;
    }
    async function decodes(bytes) {
        const blob = baAiffToWav(bytes.buffer);
        if (!blob) return false;
        const buf = await new OfflineAudioContext(2, 1, 44100).decodeAudioData(await blob.arrayBuffer());
        const L = buf.getChannelData(0), R = buf.getChannelData(1);
        return buf.numberOfChannels === 2 && buf.sampleRate === 44100 && buf.length === 441 &&
               Math.abs(L[100] - 12000 / 32768) < 0.001 && Math.abs(R[100] + 12000 / 32768) < 0.001;
    }
    const aiff = await decodes(build('AIFF', null, false));
    const aifcNone = await decodes(build('AIFC', 'NONE', false));
    const aifcSowt = await decodes(build('AIFC', 'sowt', true));
    const compressed = baAiffToWav(build('AIFC', 'ulaw', false).buffer) === null;
    const notAiff = baAiffToWav(new TextEncoder().encode('ID3 not an aiff file').buffer) === null;
    const kept = (await baPlayableBlob(new File([build('AIFC', 'ulaw', false)], 'x.aiff'))).type === '';
    // stored as Opus where the browser can make it (14i), else as WAV: never as the AIFF Chrome cannot play
    const converted = ['audio/ogg', 'audio/wav'].includes((await baPlayableBlob(new File([build('AIFF', null, false)], 'x.aiff'))).type);
    return aiff && aifcNone && aifcSowt && compressed && notAiff && kept && converted;
})()""")

check('14a .aif/.aiff files are audio and «N Audio Track.aiff» parses to track N, with no CD guessed for a flat set', """(() => {
    const names = ['1 Audio Track.aiff', '2 Audio Track.aiff', '3 Audio Track.aiff', '4 Audio Track.aiff', '5 Audio Track.aiff', '6 Audio Track.aiff'];
    const audio = names.every(n => baIsAudio({ name: n, type: '' }));
    const aif = baIsAudio({ name: '7 Audio Track.aif', type: '' });
    const notAudio = !baIsAudio({ name: 'Audio Track.txt', type: '' });
    const parsed = baAssignDiscs(names.map(n => baParseFile(n, n)));
    const tracks = parsed.map(p => p.track).join(',') === '1,2,3,4,5,6';
    const noCd = parsed.every(p => p.cd === null && p.copy === 0);
    const inFolder = baParseFile('1 Audio Track.aiff', 'Audio CD2/1 Audio Track.aiff');
    return audio && aif && notAudio && tracks && noCd && inFolder.cd === 2 && inFolder.track === 1;
})()""")

check('14c A plain file pick with a chosen disc stores its files on that disc; the same files without a disc stay unplaced', """(async () => {
    const saved = state.bookKey, probe = 'probe_disc_pick';
    state.bookKey = probe;
    try {
        const file = name => new File([new Uint8Array(8)], name, { type: '' });
        await importBookAudio([file('1 Audio Track.aiff'), file('2 Audio Track.aiff')], 2);
        const rows = await baList(probe);
        return rows.length === 2 && rows.every(r => r.cd === 2) && rows.map(r => r.track).sort().join(',') === '1,2';
    } finally {
        await baDeleteBook(probe);
        state.bookKey = saved;
    }
})()""")

check('14d Disc-less files in a book with discs ask «which disc» after the pick; the answer places them; files whose folder names the disc are not asked', """(async () => {
    const saved = state.bookKey, probe = 'probe_disc_ask', dialog = document.getElementById('book-audio-dialog');
    const file = name => new File([new Uint8Array(8)], name, { type: '' });
    const rowsAfter = async n => { for (let i = 0; i < 40; i++) { const rows = await baList(probe); if (rows.length >= n && !baImporting) return rows; await new Promise(r => setTimeout(r, 50)); } return baList(probe); };
    state.bookKey = probe;
    try {
        openBookAudioDialog('');
        const ask = dialog.querySelector('.ba-disc-ask');
        if (!dialog.querySelector('.pdf-audio-marker[data-cd="1"]') && !document.querySelector('.pdf-audio-marker[data-cd="1"]')) return 'no CD1 marker on the page';
        const noSelect = !dialog.querySelector('select');
        baImportOrAskDisc([file('1 Audio Track.aiff'), file('2 Audio Track.aiff')]);
        const labels = Array.from(ask.querySelectorAll('button')).map(b => b.textContent).join('|');
        if (ask.hidden || labels !== 'CD1|CD2|' + t('baDiscNone')) return 'ask: ' + ask.hidden + ' ' + labels;
        if ((await baList(probe)).length) return 'imported before the answer';
        ask.querySelector('[data-disc="2"]').click();
        const rows = await rowsAfter(2);
        const placed = ask.hidden && rows.length === 2 && rows.every(r => r.cd === 2);
        // files whose folder names the disc are not asked about
        baImportOrAskDisc([Object.defineProperty(file('3 Audio Track.aiff'), 'webkitRelativePath', { value: 'Audio/CD 1-1/3 Audio Track.aiff' })]);
        const folderNotAsked = ask.hidden;
        const rows2 = await rowsAfter(3);
        const dropHint = dialog.querySelector('.ba-drop').hidden === !matchMedia('(any-pointer: fine)').matches;
        return noSelect && placed && folderNotAsked && rows2.some(r => r.cd === 1 && r.track === 3) && dropHint
            || JSON.stringify({ noSelect, placed, folderNotAsked, rows2: rows2.map(r => [r.cd, r.track]), dropHint });
    } finally {
        await baDeleteBook(probe);
        state.bookKey = saved;
        dialog.close();
    }
})()""")

check('14e Without audio the status is grey and there is no «Remove»; a folder with nothing recognisable says so and lights up «Add by hand»', """(async () => {
    const saved = state.bookKey, kept = bookAudio.tracks, probe = 'probe_auto_fail';
    state.bookKey = probe; bookAudio.tracks = [];
    try {
        openBookAudioDialog('');
        const d = document.getElementById('book-audio-dialog');
        const empty = d.querySelector('.ba-remove').hidden && !d.querySelector('.ba-status').classList.contains('ba-ok');
        await importBookAudio([new File([new Uint8Array(8)], 'Intro.mp3', { type: 'audio/mpeg' })]);
        const msg = d.querySelector('.ba-message');
        const told = !msg.hidden && msg.textContent === t('baAutoFail') && d.querySelector('.ba-files').classList.contains('ba-hint');
        d.close();
        return empty && told || JSON.stringify({ empty, msg: msg.textContent, hint: d.querySelector('.ba-files').className });
    } finally {
        await baDeleteBook(probe);
        state.bookKey = saved; bookAudio.tracks = kept;
    }
})()""")

check('14f A disc set and a section set of one book live side by side; a «.work» cache is not read; a track saved before sets were kept apart is replaced, not doubled', """(async () => {
    stopBookAudio();
    await baDeleteBook(state.bookKey); await refreshBookAudio();
    const wav = await (await fetch('data:audio/wav;base64,' + window.__WAV)).blob();
    const make = (name, rel) => { const f = new File([wav], name, { type: 'audio/wav' }); Object.defineProperty(f, 'webkitRelativePath', { value: rel }); return f; };
    await baPut({ id: state.bookKey + '\u0000' + '1-3', bookKey: state.bookKey, cd: 1, track: 3, name: 'old.wav', path: 'old.wav', type: 'audio/wav', size: wav.size, blob: wav });
    await importBookAudio([
        make('03 Track 03.wav', 'Book/Tracks/A1 CD1/03 Track 03.wav'),
        make('XYZ_EP01_P3.wav', 'Book/audio 56/XYZ_EP01_P3.wav'),
        make('0003.wav', 'Book/.work/cache/0003.wav'),
        make('0004.wav', 'Book/__MACOSX/0004.wav'),
    ]);
    const rows = bookAudio.tracks;
    const disc = baFind(1, 3).rec, bare = baFind(null, 3).rec;
    return rows.length === 2 && rows.filter(r => r.cd === 1 && r.track === 3).length === 1 &&
           disc && disc.name === '03 Track 03.wav' && bare && bare.name === 'XYZ_EP01_P3.wav' && bare.section === 1 &&
           !rows.some(r => /0003|0004|old/.test(r.name)) || JSON.stringify(rows.map(r => [r.id, r.name]));
})()""")

check('14g The status counts the book\'s marks that play, not the files: all / some / none (amber, names a missing mark); never a stale green', """(async () => {
    openBookAudioDialog('');
    const d = document.getElementById('book-audio-dialog'), st = d.querySelector('.ba-status');
    const wait = async ok => { for (let i = 0; i < 50 && !ok(); i++) await new Promise(r => setTimeout(r, 100)); return ok(); };
    await wait(() => baMarks.key === state.bookKey && baMarks.list);
    const total = baMarks.list.length;   // page 1: CD1 · 3, CD2 · 15, CD2 · 7 (bare, under CD2); page 2: CD1 · 3
    // left by 14f: CD1 · 3 and a section track
    const some = st.textContent === t('baMarksSome').replace('{k}', 2).replace('{n}', 4) && st.classList.contains('ba-ok');
    stopBookAudio(); await baDeleteBook(state.bookKey); await refreshBookAudio();
    const wav = await (await fetch('data:audio/wav;base64,' + window.__WAV)).blob();
    const make = (name, rel) => { const f = new File([wav], name, { type: 'audio/wav' }); Object.defineProperty(f, 'webkitRelativePath', { value: rel }); return f; };
    // no tracks at all in a book with marks: amber, never «Audio connected» (owner 2026-10-28: a narration showed a green «connected»)
    const empty = st.classList.contains('ba-warn') && st.textContent === t('baMarksEmpty').replace('{n}', 4);
    await importBookAudio([make('XYZ_EP01_P9.wav', 'Book/audio/XYZ_EP01_P9.wav')]);
    const none = st.classList.contains('ba-warn') && !st.classList.contains('ba-ok') && st.parentElement.classList.contains('ba-warn-box')
        && st.textContent.includes('CD1 · piste 3') && d.querySelector('.ba-tap').hidden;
    await importBookAudio(['CD1/03 Track 03.wav', 'CD2/15 Track 15.wav', 'CD2/07 Track 07.wav'].map(r => make(r.split('/')[1], 'Book/audio/' + r)));
    const all = st.textContent === t('baMarksAll').replace('{n}', 4) && st.classList.contains('ba-ok') && !st.classList.contains('ba-warn') && !d.querySelector('.ba-tap').hidden;
    d.close();
    return total === 4 && some && empty && none && all || JSON.stringify({ total, some, empty, none, all, text: st.textContent });
})()""")

check('14h The 📋 report names the audio code version, the stored sets and the marks that play, and what the last pick held', """(() => {
    const r = bsReport(), last = bsTrace.filter(x => x.ev === 'tracks-import').pop();
    return /^[0-9a-f]{12}$/.test(r.audioJs) && r.trackSets && r.trackSets.CD1 >= 1 && r.marks && r.marks.all === 4 && r.marks.playing === 4
        && last && last.audio >= 1 && last.sets && last.sample.length >= 1 || JSON.stringify({ audioJs: r.audioJs, trackSets: r.trackSets, marks: r.marks, last });
})()""")

check('14i AIFF and WAV are stored as Opus about ten times smaller, same length and level, and <audio> plays it; MP3 is stored untouched', """(async () => {
    // 2 s, stereo, 16-bit, 44100 Hz: a 440 Hz tone at 12000 / 32768 left, 220 Hz right
    const rate = 44100, frames = rate * 2, pcm = new Uint8Array(frames * 4), pv = new DataView(pcm.buffer);
    for (let i = 0; i < frames; i++) { pv.setInt16(i * 4, Math.round(12000 * Math.sin(2 * Math.PI * 440 * i / rate))); pv.setInt16(i * 4 + 2, Math.round(12000 * Math.sin(2 * Math.PI * 220 * i / rate))); }
    const comm = new Uint8Array(18), cv = new DataView(comm.buffer);
    cv.setUint16(0, 2); cv.setUint32(2, frames); cv.setUint16(6, 16); cv.setUint16(8, 16398); cv.setBigUint64(10, BigInt(rate) << 48n);
    const ssnd = new Uint8Array(8 + pcm.length); ssnd.set(pcm, 8);
    const chunk = (id, body) => { const h = new Uint8Array(8 + body.length), hv = new DataView(h.buffer); for (let i = 0; i < 4; i++) h[i] = id.charCodeAt(i); hv.setUint32(4, body.length); h.set(body, 8); return h; };
    const c1 = chunk('COMM', comm), c2 = chunk('SSND', ssnd), aiff = new Uint8Array(12 + c1.length + c2.length), av = new DataView(aiff.buffer);
    aiff.set([70, 79, 82, 77]); av.setUint32(4, 4 + c1.length + c2.length); aiff.set([65, 73, 70, 70], 8); aiff.set(c1, 12); aiff.set(c2, 12 + c1.length);
    const wav = baAiffToWav(aiff.buffer);
    const opus = await baPlayableBlob(new File([aiff], 'CD1 - 01 Audio Track.aiff'));
    const fromWav = await baPlayableBlob(new File([wav], '02 Audio Track.wav', { type: 'audio/wav' }));
    const mp3 = new File([new Uint8Array([73, 68, 51, 4, 0, 0, 0, 0, 0, 0])], '03 Track 03.mp3', { type: 'audio/mpeg' });
    const keptMp3 = (await baPlayableBlob(mp3)) === mp3;
    const buf = await new OfflineAudioContext(2, 1, 48000).decodeAudioData(await opus.arrayBuffer());
    let peak = 0; const L = buf.getChannelData(0); for (let i = 4800; i < L.length - 4800; i++) peak = Math.max(peak, Math.abs(L[i]));
    const url = URL.createObjectURL(opus), el = new Audio();
    const played = await new Promise(r => { el.onloadedmetadata = () => r(el.duration); el.onerror = () => r(-1); el.src = url; });
    URL.revokeObjectURL(url);
    const ok = opus.type === 'audio/ogg' && fromWav.type === 'audio/ogg' && opus.size * 8 < wav.size && keptMp3
        && Math.abs(buf.duration - 2) < 0.03 && buf.numberOfChannels === 2 && Math.abs(peak - 12000 / 32768) < 0.06 && Math.abs(played - 2) < 0.1;
    return ok || JSON.stringify({ type: opus.type, wavType: fromWav.type, opus: opus.size, wav: wav.size, keptMp3, duration: buf.duration, ch: buf.numberOfChannels, peak, played });
})()""", timeout=40)

check('14j MP4 is audio; WMA (which Chrome cannot play) is refused with a message that names it, and nothing is stored', """(async () => {
    const mp4 = baIsAudio(new File([new Uint8Array(4)], '05 Audio Track.mp4', { type: 'video/mp4' }));
    const wmaRefused = baUnplayable({ name: '04 Track 04.wma' }) && !baUnplayable({ name: '04 Track 04.mp3' }) && !baUnplayable({ name: 'x.mp4' });
    stopBookAudio(); await baDeleteBook(state.bookKey); await refreshBookAudio();
    const f = new File([new Uint8Array(64)], '04 Track 04.wma', { type: 'audio/x-ms-wma' });
    Object.defineProperty(f, 'webkitRelativePath', { value: 'Book/CD1/04 Track 04.wma' });
    await importBookAudio([f]);
    const d = document.getElementById('book-audio-dialog'), msg = d && d.open ? d.querySelector('.ba-message').textContent : '';
    const said = msg === t('baUnsupported').replace('{n}', 1).replace('{ext}', 'WMA');
    if (d && d.open) d.close();
    return mp4 && wmaRefused && said && bookAudio.tracks.length === 0 || JSON.stringify({ mp4, wmaRefused, msg, n: bookAudio.tracks.length });
})()""")

check('14k A book\'s track table decides the track: rows read per disc column, page shift measured, «CDn - piste k» and «CDn - Exercice k» play their row; table rows give no buttons', """(() => {
    const it = (str, x, y) => ({ str, transform: [10, 0, 0, 10, x, y], width: str.length * 5, height: 10 });
    const items = [it('CD1 : 6 pistes', 50, 700), it('CD2 : 5 pistes', 320, 700)];
    const left = [['Épisode 1 - piste 1', '10'], ['Épisode 1 - piste 2', '11'], ['Épisode 1 - piste 3', '11, 12'], ['Épisode 2 - piste 1', '14'], ['Épisode 2 - piste 2', '15'], ['Épisode 3 - piste 1', '18']];
    const right = [['Épisode 4 - piste 1', '20'], ['Épisode 4 - piste 2', '21'], ['Épisode 5 - piste 1', '24'], ['Phonétique - exercice 1', '30'], ['Phonétique - exercice 2', '30, 31']];
    left.forEach(([name, pages], i) => items.push(it(String(i + 1), 55, 670 - 20 * i), it(name, 90, 670 - 20 * i), it(pages, 250, 670 - 20 * i)));
    right.forEach(([name, pages], i) => items.push(it(String(i + 1), 325, 670 - 20 * i), it(name, 360, 670 - 20 * i), it(pages, 520, 670 - 20 * i)));
    const rows = baTableRows(items), tables = baWholeTables(rows);
    const vp = { width: 600, height: 800, convertToViewportPoint: (x, y) => [x, 800 - y] };
    const noButtons = buildPdfAudioLayer(items, vp, 200) === null;
    // the marks on the pages: the PDF page = the book's page + 2 (cover and title pages)
    const m = (cd, track, page, kind = 'piste') => ({ cd, track, page, kind });
    const list = [m(1, 1, 12), m(1, 2, 13), m(1, 3, 14), m(1, 1, 16), m(1, 2, 17), m(1, 1, 20), m(2, 1, 22), m(2, 2, 23), m(2, 1, 26), m(2, 1, 32, 'ex'), m(2, 2, 33, 'ex'), m(1, 4, 12), Object.assign(m(1, 1, 150), { ref: 14 })];
    Object.assign(baMarks, { key: state.bookKey, list, tables, shift: baPageShift(list, tables), busy: null });
    const rec = (cd, track) => ({ id: 'x' + cd + '-' + track, cd, track, section: null });
    bookAudio.tracks = [1, 2, 3, 4, 5, 6].map(n => rec(1, n)).concat([1, 2, 3, 4, 5].map(n => rec(2, n)));
    const plays = x => { const f = baFindMark(x); return f.rec ? f.rec.cd + '-' + f.rec.track : f.blocked; };
    const got = list.map(plays).join(' ');
    const want = '1-1 1-2 1-3 1-4 1-5 1-6 2-1 2-2 2-3 2-4 2-5 row 1-4';   // the last: a transcript's «CD1 - piste 1, p. 14»
    const named = baTarget(m(2, 1, 26)).name === 'Épisode 5';
    const refRead = JSON.stringify(baFindMarks('i CD1 - piste 5, p. 22   Dialogue').map(x => [x.cd, x.track, x.ref])) === '[[1,5,22]]';
    return rows.length === 11 && tables.size === 2 && tables.get(1).length === 6 && tables.get(2).length === 5 && baMarks.shift === 2 && noButtons && got === want && named && refRead
        || JSON.stringify({ refRead, rows: rows.map(r => [r.cd, r.track, r.kind, r.piste, r.pages]), shift: baMarks.shift, noButtons, got });
})()""")

check('14l Without a table, numbers that restart per section do not play and the status says so in amber; numbers that run through the disc play as printed', """(() => {
    const m = (track, page) => ({ cd: 1, track, page, kind: 'piste' });
    const rec = n => ({ id: 'y' + n, cd: 1, track: n, section: null });
    bookAudio.tracks = Array.from({ length: 12 }, (_, i) => rec(i + 1));
    Object.assign(baMarks, { key: state.bookKey, tables: new Map(), shift: 0, busy: null,
        list: [m(1, 5), m(2, 6), m(3, 7), m(1, 10), m(2, 11), m(1, 15), m(2, 16), m(3, 17)] });
    const restart = baFindMark(m(2, 11)).blocked === 'restart';
    openBookAudioDialog('');
    const st = document.getElementById('book-audio-dialog').querySelector('.ba-status');
    const amber = st.textContent === t('baRestart') && st.classList.contains('ba-warn') && !st.classList.contains('ba-ok');
    baMarks.list = Array.from({ length: 12 }, (_, i) => m(i + 1, 5 + i));
    const through = baFindMark(m(7, 11)).rec && baFindMark(m(7, 11)).rec.track === 7;
    document.getElementById('book-audio-dialog').close();
    Object.assign(baMarks, { key: null, list: null, tables: null, shift: 0 });
    return restart && amber && through || JSON.stringify({ restart, amber, through, text: st.textContent });
})()""")

check('15 No uncaught errors occurred', "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL BOOK AUDIO CHECKS PASSED')
