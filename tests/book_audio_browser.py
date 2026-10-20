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
    """Two-page synthetic PDF with Par ici style piste marks:
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
check('1 baParseFile parses Par ici folder/file names and FLS2_EP01_P1 without confusing EP01 for track 1', """(() => {
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
    const m = baFindMarks('Activite (CD1 - piste 3), CD2- piste 015, bare piste 7, track 5, CD1 - track 9, apiste 2, piste 0.');
    return JSON.stringify(m.map(x => [x.cd, x.track])) === JSON.stringify([[1,3],[2,15],[null,7],[1,9]]);
})()""")

# ---------------------------------------------------------------- 2. Open PDF and verify markers
PDF_B64 = make_piste_pdf_b64()
WAV_B64 = make_wav_b64()

c.js(f"""(async () => {{
    const raw = atob('{PDF_B64}');
    const u8 = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
    const file = new File([u8], 'Par_ici_test.pdf', {{ type: 'application/pdf' }});
    await openBookFile(file);
}})()""")

check('4 PDF opens with 3 piste markers on page 1 (single-item CD1-piste 3, split-item CD2-piste 15, bare piste 7)', """(() => {
    const marks = [...document.querySelectorAll('.pdf-page-wrapper[data-page="1"] .pdf-audio-marker')];
    return marks.length === 3 &&
           JSON.stringify(marks.map(b => [b.dataset.cd, b.dataset.track])) === JSON.stringify([['1','3'],['2','15'],['','7']]);
})()""")

check('5 Tapping a piste marker before audio is connected opens #book-audio-dialog with the connect prompt and does not trigger word translation', """(() => {
    state.translateMode = true;
    const btn = document.querySelector('.pdf-page-wrapper[data-page="1"] .pdf-audio-marker[data-track="3"]');
    btn.click();
    const dlg = document.getElementById('book-audio-dialog');
    return dlg && dlg.open &&
           dlg.querySelector('.ba-subtitle').textContent.includes('Par_ici_test') &&
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
           !p1Marks[2].classList.contains('has-audio');
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

check('12 Tapping bare piste 7 when both CD1 and CD2 have track 7 shows the ambiguous-disc toast', """(() => {
    const btn = document.querySelector('.pdf-page-wrapper[data-page="1"] .pdf-audio-marker[data-track="7"]');
    btn.click();
    const toast = document.getElementById('reader-toast');
    return !!toast && toast.classList.contains('show') && toast.textContent.includes('piste 7');
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
c.js("openBookAudioDialog(''); document.querySelector('#book-audio-dialog .ba-remove').click(); 1")
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

check('15 No uncaught errors occurred', "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL BOOK AUDIO CHECKS PASSED')
