"""Browser tests for the book's own list of its recordings (js/book-audio.js, rules §6.4): a book that numbers its pistes
anew in every station and prints, at the end, the list of its own recordings («i Piste 5, page 27» under «STATION 2») —
the mark knows the page and the group of its number, and a file set that carries the page or the group in its name plays on
every mark."""
import base64, os, struct, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')


def make_wav_b64(duration_ms=200, freq=440, sample_rate=8000):
    n_samples = max(1, int(sample_rate * duration_ms / 1000))
    import math
    pcm = bytearray()
    for i in range(n_samples):
        pcm += struct.pack('<h', int(12000 * math.sin(2 * math.pi * freq * i / sample_rate)))
    header = struct.pack('<4sI4s4sIHHIIHH4sI', b'RIFF', 36 + len(pcm), b'WAVE', b'fmt ', 16, 1, 1, sample_rate,
                          sample_rate * 2, 2, 16, b'data', len(pcm))
    return base64.b64encode(header + pcm).decode()


def make_annex_pdf_b64():
    """Four-page synthetic PDF of a book whose numbers restart in every station:
      Page 1 (the book's page 10): «piste 1», «piste 2»   — station 1
      Page 2 (the book's page 11): «piste 3»                — station 1
      Page 3 (the book's page 12): «piste 1», «piste 2», «piste 3» — station 2 (the same numbers, other dialogues)
      Page 4: the book's own list of its recordings:
              «STATION 1» / «Piste 1, page 10» / «Piste 2, page 10» / «Piste 3, page 11»
              «STATION 2» / «Piste 1, page 12» / «Piste 2, page 12» / «Piste 3, page 12»
    The book's pages are the PDF's pages minus nine (the front matter).
    """
    objs = [
        b'<< /Type /Catalog /Pages 2 0 R >>',
        b'',
        b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ]

    def page_ops(lines):
        return '\n'.join('BT /F1 14 Tf 50 %d Td (%s) Tj ET' % (720 - 40 * i, t.replace('(', r'\(').replace(')', r'\)'))
                         for i, t in enumerate(lines)).encode()

    p1 = page_ops(['Ecoutez piste 1 et piste 2.'])
    p2 = page_ops(['Ecoutez piste 3.'])
    p3 = page_ops(['Ecoutez piste 1, piste 2 et piste 3.'])
    p4 = page_ops(['STATION 1', 'i Piste 1, page 10', 'i Piste 2, page 10', 'i Piste 3, page 11',
                   'STATION 2', 'i Piste 1, page 12', 'i Piste 2, page 12', 'i Piste 3, page 12'])

    objs.append(b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R >>')
    objs.append(b'<< /Length %d >>\nstream\n' % len(p1) + p1 + b'\nendstream')
    objs.append(b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents 7 0 R >>')
    objs.append(b'<< /Length %d >>\nstream\n' % len(p2) + p2 + b'\nendstream')
    objs.append(b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents 9 0 R >>')
    objs.append(b'<< /Length %d >>\nstream\n' % len(p3) + p3 + b'\nendstream')
    objs.append(b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents 11 0 R >>')
    objs.append(b'<< /Length %d >>\nstream\n' % len(p4) + p4 + b'\nendstream')
    objs[1] = b'<< /Type /Pages /Count 4 /Kids [4 0 R 6 0 R 8 0 R 10 0 R] >>'

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


def check(name, expr, timeout=20):
    deadline = time.monotonic() + timeout
    last = None
    while time.monotonic() < deadline:
        last = c.js(expr)
        if last is True:
            print('PASS:', name)
            return
        time.sleep(0.2)
    raise AssertionError(f'FAIL: {name} -> {last!r}')


c.call('Page.enable')
c.call('Runtime.enable')
c.call('Emulation.setDeviceMetricsOverride', width=1024, height=768, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState === 'complete' && !document.body.inert")
c.js("window.__errors = []; window.addEventListener('error', e => __errors.push(e.message));")

# ---------------------------------------------------------------- 1. The name of a file carries its page or its group
check('1 A file name carries its group («Station 02 - piste 5», a folder «Station 3») or its page («page 27 - piste 5», «p027 piste 5»)', """(() => {
    const a = baParseFile('Station 02 - piste 5.mp3', 'Station 02 - piste 5.mp3');
    const b = baParseFile('03 piste 03.mp3', 'Station 3/03 piste 03.mp3');
    const c = baParseFile('page 27 - piste 5.mp3', 'page 27 - piste 5.mp3');
    const d = baParseFile('p027 piste 5.mp3', 'p027 piste 5.mp3');
    const e = baParseFile('Piste 5.mp3', 'Piste 5.mp3');
    const f = baParseFile('CD1 - piste 5.mp3', 'CD1 - piste 5.mp3');
    return a.group === 'station 2' && a.track === 5 && baSetOf(a) === 'grp' &&
           b.group === 'station 3' && b.track === 3 && baSetOf(b) === 'grp' &&
           c.page === 27 && c.track === 5 && baSetOf(c) === 'pg' && c.group === null &&
           d.page === 27 && d.track === 5 && baSetOf(d) === 'pg' &&
           e.track === 5 && baSetOf(e) === 'one' && e.group === null && e.page === null &&
           f.cd === 1 && baSetOf(f) === 'cd' ||
           JSON.stringify([a, b, c, d, e, f]);
})()""")

# ---------------------------------------------------------------- 2. The book says the page and the group of every number
PDF_B64 = make_annex_pdf_b64()
WAV_B64 = make_wav_b64()
c.js(f"window.__WAV = '{WAV_B64}'; 1")
c.js(f"""(async () => {{
    const raw = atob('{PDF_B64}');
    const u8 = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
    const file = new File([u8], 'Stations_test.pdf', {{ type: 'application/pdf' }});
    await openBookFile(file);
}})()""")

check('2 The book’s own list is read: its six recordings, two groups, and the shift between its pages and the PDF’s', """(async () => {
    baScanMarks();
    if (baMarks.busy) await baMarks.busy;
    const a = baMarks.annex;
    return a && a.entries === 6 && a.groups === 2 && a.mapped === 6 && a.shift === -9 ||
           JSON.stringify(a);
})()""")

check('3 A mark knows the page and the group of its number: piste 1 of the first page is station 1, piste 1 of the third page is station 2', """(() => {
    const one = baAnnexOf({ page: 1, track: 1 }), two = baAnnexOf({ page: 3, track: 1 });
    const three = baAnnexOf({ page: 2, track: 3 }), other = baAnnexOf({ page: 1, track: 9 });
    return one && one.ref === 10 && one.group === 'station 1' && one.label === 'STATION 1' &&
           two && two.ref === 12 && two.group === 'station 2' &&
           three && three.ref === 11 && three.group === 'station 1' && other === null ||
           JSON.stringify({ one, two, three, other });
})()""")

check('4 The target of the mark is the recording of its own list, not a number of another page', """(() => {
    const t1 = baTarget({ page: 1, track: 1 }), t2 = baTarget({ page: 3, track: 1 });
    return t1.entry && t2.entry && t1.entry.ref === 10 && t2.entry.ref === 12 &&
           t1.cd === null && t2.cd === null || JSON.stringify({ t1, t2 });
})()""")

# ---------------------------------------------------------------- 3. The files play on the marks
c.js(f"""(async () => {{
    const raw = atob('{WAV_B64}');
    const u8 = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
    const makeFile = name => {{ const f = new File([u8], name, {{ type: 'audio/wav' }}); return f; }};
    await importBookAudio([
        makeFile('Station 01 - piste 01.wav'),
        makeFile('Station 01 - piste 02.wav'),
        makeFile('Station 01 - piste 03.wav'),
        makeFile('Station 02 - piste 01.wav'),
        makeFile('Station 02 - piste 02.wav'),
        makeFile('Station 02 - piste 03.wav'),
    ]);
}})()""")

check('5 The files of both groups are stored apart, each with its group', """(async () => {
    const rows = await baList(state.bookKey);
    const s1 = rows.filter(r => r.group === 'station 1'), s2 = rows.filter(r => r.group === 'station 2');
    return rows.length === 6 && s1.length === 3 && s2.length === 3 &&
           s1.every(r => r.cd === null && r.set === 'grp') && s2.every(r => r.cd === null && r.set === 'grp') &&
           s1.map(r => r.track).sort((a, b) => a - b).join(',') === '1,2,3' &&
           s2.map(r => r.track).sort((a, b) => a - b).join(',') === '1,2,3' ||
           JSON.stringify(rows.map(r => [r.group, r.track]));
})()""")

check('6 Every mark plays the file of its own group: the same number in two groups plays two different recordings', """(() => {
    const m1 = baFindMark({ page: 1, track: 1 }), m3 = baFindMark({ page: 3, track: 1 });
    const m2 = baFindMark({ page: 2, track: 3 });
    return !!(m1.rec && m3.rec && m2.rec) && m1.rec.id !== m3.rec.id &&
           m1.rec.group === 'station 1' && m3.rec.group === 'station 2' && m2.rec.group === 'station 1' ||
           JSON.stringify([m1, m3, m2]);
})()""")

check('7 A file that carries the page of the book plays on the mark of that page', """(async () => {
    const raw = atob(window.__WAV);
    const u8 = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
    await importBookAudio([new File([u8], 'page 12 - piste 01.wav', { type: 'audio/wav' })]);
    const m = baFindMark({ page: 3, track: 1 });
    return m.rec && m.rec.set === 'pg' && m.rec.page === 12 || JSON.stringify(m);
})()""")

check('8 The marker of the third page is solid (its recording is on the device) and the label names the group and the page', """(async () => {
    if (typeof navigateToPdfPage === 'function') await navigateToPdfPage(3);
    await new Promise(r => setTimeout(r, 1500));
    const btn = document.querySelector('.pdf-page-wrapper[data-page="3"] .pdf-audio-marker[data-track="1"]');
    const one = document.querySelector('.pdf-page-wrapper[data-page="1"] .pdf-audio-marker[data-track="1"]');
    return !!btn && btn.classList.contains('has-audio') && !!one && one.classList.contains('has-audio') &&
           /STATION 1/.test(one.title) && /10/.test(one.title) &&
           /STATION 2/.test(btn.title) && /12/.test(btn.title) ||
           JSON.stringify([one && one.title, btn && btn.title]);
})()""")

check('9 A number that the book’s list does not place stays undecided: no other group’s recording plays', """(() => {
    const m = baFindMark({ page: 1, track: 9 });
    return !m.rec && !m.ambiguous || JSON.stringify(m);
})()""")

check('10 No error was thrown while the book was read', "(() => !window.__errors.length || window.__errors.join(' | '))()")
