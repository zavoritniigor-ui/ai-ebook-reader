"""Document scanner (js/scanner.js): photo → sheet edges → straightened page → enhanced → PDF / JPG / PNG, print, share, save.

Owner (2026-10-30): «застосунок сканер, який з фото робить зручні формати для друку».

The «photo» is drawn in the page: a white sheet (3:4, with lines of «text») photographed at an angle — a perspective-distorted
quadrilateral on a dark table, with a shadow across it — saved as JPEG.
Checks: the menu row, the start-screen button and the ✦ wheel open the scanner; the sheet's corners are found (each within 3% of
the drawn ones); the straightened page has the sheet's proportions; «Document» makes the shadowed paper white and keeps the text
dark; «B/W» gives black and white only; corners can be dragged in the editor and Done re-renders the page; rotation swaps the
sides; pages can be reordered and deleted; a photo that is not an image is reported and skipped; the PDF (A4 and «photo size»)
is a real PDF that the reader opens with the right page count and page size; several JPGs come as a ZIP, one PNG as a PNG file;
nothing is sent over the network; Escape / Android Back close the editor first, then the scanner.
"""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(120)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=412, height=915, deviceScaleFactor=2, mobile=True)
READY = "document.readyState==='complete' && !document.body.inert && typeof openScanner==='function'"


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.2); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


c.call('Page.navigate', url=URL); c.wait(READY, timeout=30)
c.js("localStorage.clear(); localStorage.setItem('reader_onboarding_done','1'); 1"); c.call('Page.reload'); c.wait(READY, timeout=30)
c.js("""showUpdateBanner=()=>{}; window.showSaveFilePicker = undefined; window.__net = []; const realFetch = window.fetch; window.fetch = (u, o) => { window.__net.push(String(u)); return realFetch(u, o); }; 1""")

# ---- the three ways in
check('1 the scanner row is in the menu Tools section and opens it',
      "(() => { const row = document.getElementById('btn-scanner'); const ok = row.closest('section').querySelector('#ms-tools') !== null; row.click(); const open = scanIsOpen(); closeScanner(); return ok && open; })()")
check('1b ... and the start-screen button', "(() => { document.getElementById('home-scanner').click(); const open = scanIsOpen(); closeScanner(); return open; })()")
check('1c ... and the ✦ wheel has a Scanner action', "!!document.querySelector('.qm-item[data-action=\"btn-scanner\"]')")
c.js("openScanner(); 1"); time.sleep(0.3)
check('1d empty: the hint shows, no output buttons yet', "!document.getElementById('scan-empty').hidden && document.getElementById('scan-out').hidden")

# ---- the «photo»: 2000x1500 table, a 3:4 sheet seen at an angle, a shadow across it, lines of text
QUAD = [[0.30, 0.10], [0.72, 0.16], [0.68, 0.92], [0.26, 0.86]]
c.js("""window.__photo = async (quad, name) => { const W = 2000, H = 1500, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
  x.fillStyle = '#3a3530'; x.fillRect(0, 0, W, H);
  const P = quad.map(([a, b]) => [a * W, b * H]);
  // the sheet: draw a flat 600x800 page, then map it with a homography (the app's own maths would make the test circular, so pixels are mapped here by bilinear blending of the corners)
  const page = document.createElement('canvas'); page.width = 600; page.height = 800; const p = page.getContext('2d');
  p.fillStyle = '#fbfaf6'; p.fillRect(0, 0, 600, 800); p.fillStyle = '#111';
  for (let i = 0; i < 22; i++) p.fillRect(60, 80 + i * 30, 480 - (i % 4) * 40, 10);
  p.fillStyle = '#c62828'; p.fillRect(380, 690, 150, 70); p.fillStyle = '#1565c0'; p.fillRect(70, 700, 120, 40);   // a red stamp and a blue marker
  const src = p.getImageData(0, 0, 600, 800).data, img = x.getImageData(0, 0, W, H), d = img.data;
  for (let v = 0; v < 800; v += 0.5) for (let u = 0; u < 600; u += 0.5) { const s = u / 600, t = v / 800;
    const X = (1 - t) * ((1 - s) * P[0][0] + s * P[1][0]) + t * ((1 - s) * P[3][0] + s * P[2][0]), Y = (1 - t) * ((1 - s) * P[0][1] + s * P[1][1]) + t * ((1 - s) * P[3][1] + s * P[2][1]);
    const o = ((Y | 0) * W + (X | 0)) * 4, i = ((v | 0) * 600 + (u | 0)) * 4; d[o] = src[i]; d[o + 1] = src[i + 1]; d[o + 2] = src[i + 2]; }
  // a shadow across the sheet (darker towards the right), as from a hand or a phone
  for (let y = 0; y < H; y++) for (let X = 0; X < W; X++) { const k = 1 - 0.38 * Math.max(0, (X - 900) / 1100); const o = (y * W + X) * 4; d[o] *= k; d[o + 1] *= k; d[o + 2] *= k * 0.93; }
  x.putImageData(img, 0, 0);
  const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.92)); return new File([blob], name, {type: 'image/jpeg', lastModified: 1}); }; 1""")

t0 = time.time()
c.js("__photo(%s, 'one.jpg').then(f => scanAddFiles([f], false)).then(() => window.__added = 1); window.__added = 0; 1" % json.dumps(QUAD))
c.wait("window.__added === 1", timeout=60)
print('   one photo processed in %.1f s' % (time.time() - t0), flush=True)
check('2 one page; its corners are found within 3% of the sheet',
      "scanState.pages.length === 1 && scanState.pages[0].corners.every((p, i) => Math.abs(p[0] - %s[i][0]) < .03 && Math.abs(p[1] - %s[i][1]) < .03) || JSON.stringify(scanState.pages[0]?.corners)" % (json.dumps(QUAD), json.dumps(QUAD)))
# ---- harder photos for the edge finder: a sheet turned by 40° on a light, speckled table; a finger over one corner
c.js("""window.__hard = async (angle, bg, finger) => { const W = 1600, H = 1200, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(${90 + rnd() * 60 | 0},${80 + rnd() * 50 | 0},${70 + rnd() * 40 | 0},0.18)`; x.fillRect(rnd() * W, rnd() * H, 4 + rnd() * 14, 2 + rnd() * 6); }
  const cxp = W / 2, cyp = H / 2, pw = 520, ph = 700, a = angle * Math.PI / 180;
  x.save(); x.translate(cxp, cyp); x.rotate(a); x.fillStyle = '#fbfaf6'; x.fillRect(-pw / 2, -ph / 2, pw, ph);
  x.fillStyle = '#222'; for (let i = 0; i < 20; i++) x.fillRect(-pw / 2 + 50, -ph / 2 + 70 + i * 28, pw - 100 - (i % 3) * 50, 9); x.restore();
  const corner = (u, v) => [(cxp + u * Math.cos(a) - v * Math.sin(a)) / W, (cyp + u * Math.sin(a) + v * Math.cos(a)) / H];
  const quad = [corner(-pw / 2, -ph / 2), corner(pw / 2, -ph / 2), corner(pw / 2, ph / 2), corner(-pw / 2, ph / 2)];
  if (finger) { const [fx, fy] = quad[2]; x.fillStyle = '#c58f6e'; x.beginPath(); x.ellipse(fx * W + 10, fy * H + 30, 34, 70, -0.5, 0, 2 * Math.PI); x.fill(); }
  const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.9)); return { file: new File([blob], 'hard.jpg', {type: 'image/jpeg'}), quad }; }; 1""")
for label, args in [('a sheet turned by 40° on a light speckled table', "40, '#d9d4cb', false"), ('a sheet with a finger over its bottom-right corner', "-12, '#8a7a66', true")]:
    res = c.js("__hard(%s).then(async h => { const src = await scanLoad(h.file, SCAN_WORK_SIDE); const got = scanDetectCorners(src); src.width = 0; return JSON.stringify({got, quad: h.quad}); })" % args)
    res = json.loads(res)
    sort_key = lambda p: p
    # the app returns TL, TR, BR, BL; compare each expected corner with the nearest found one
    err = max(min(abs(g[0] - q[0]) + abs(g[1] - q[1]) for g in res['got']) for q in res['quad'])
    assert err < 0.035, (label, res)
    print('PASS 2b the edge finder handles ' + label + ' (max corner error %.3f)' % err, flush=True)
check('3 the straightened page has the sheet\'s 3:4 proportions', "(p => Math.abs(p.w / p.h - 0.75) < 0.06 || JSON.stringify([p.w, p.h]))(scanState.pages[0])")
STATS = """(async (blob) => { const b = await createImageBitmap(blob), cv = document.createElement('canvas'); cv.width = b.width; cv.height = b.height; const x = cv.getContext('2d'); x.drawImage(b, 0, 0);
  const d = x.getImageData(0, 0, cv.width, cv.height).data; let paper = [], ink = 0, mid = 0, n = 0;
  // margin strip on the right (no text there, and the darkest shadow): x 92..97%, y 20..80%
  for (let y = Math.round(cv.height * .2); y < cv.height * .8; y += 3) for (let X = Math.round(cv.width * .92); X < cv.width * .97; X += 3) { const o = (y * cv.width + X) * 4; paper.push((d[o] + d[o + 1] + d[o + 2]) / 3); }
  let cast = 0, cn = 0; for (let y = Math.round(cv.height * .2); y < cv.height * .8; y += 3) for (let X = Math.round(cv.width * .92); X < cv.width * .97; X += 3) { const o = (y * cv.width + X) * 4; cast += Math.max(d[o], d[o + 1], d[o + 2]) - Math.min(d[o], d[o + 1], d[o + 2]); cn++; }
  for (let i = 0; i < d.length; i += 4 * 7) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; n++; if (v < 60) ink++; else if (v < 200) mid++; }
  return JSON.stringify({paper: paper.reduce((a, b) => a + b, 0) / paper.length, cast: cast / cn, ink: ink / n, mid: mid / n}); })"""
doc = json.loads(c.js(STATS + "(scanState.pages[0].out)"))
assert doc['paper'] > 235 and doc['cast'] < 8 and doc['ink'] > 0.03, doc
print('PASS 4 «Colour» (default): the shadowed, cream margin is white (%.0f, colour cast %.1f), the text stays dark (%.1f%% ink)' % (doc['paper'], doc['cast'], doc['ink'] * 100), flush=True)
COLOR = """(async (blob) => { const b = await createImageBitmap(blob), cv = document.createElement('canvas'); cv.width = b.width; cv.height = b.height; const x = cv.getContext('2d'); x.drawImage(b, 0, 0);
  const px = (fx, fy) => [...x.getImageData(Math.round(cv.width * fx), Math.round(cv.height * fy), 1, 1).data.slice(0, 3)];
  return JSON.stringify({red: px(455 / 600, 725 / 800), blue: px(130 / 600, 720 / 800)}); })"""
col = json.loads(c.js(COLOR + "(scanState.pages[0].out)"))
# drawn: red (198, 40, 40), blue (21, 101, 192); the shadow darkens the photo, «Colour» must bring them back, not wash them out
assert col['red'][0] > 150 and col['red'][1] < 90 and col['red'][2] < 90 and col['blue'][2] > 150 and col['blue'][0] < 90 and col['blue'][1] < 160, col
print('PASS 4a «Colour» keeps colours: the red stamp stays red %s, the blue marker blue %s' % (col['red'], col['blue']), flush=True)
check('4b no network request while processing', "__net.length === 0 || JSON.stringify(__net)")

# ---- editor: drag a corner, filters, rotation, Done
c.js("scanOpenEditor(scanState.pages[0]); 1"); time.sleep(1.0)
check('5 the editor shows the photo and four corner handles on the sheet corners',
      "(() => { const e = scanState.edit, hs = [...document.querySelectorAll('#scanner .scan-handle')]; return !!e && !document.getElementById('scan-edit-view').hidden && hs.length === 4 && hs.every((h, i) => { const r = h.getBoundingClientRect(); return Math.abs(r.left + r.width / 2 - (e.box.left + e.corners[i][0] * e.box.w)) < 2; }); })()")
h = c.js("(r => [r.left + r.width / 2, r.top + r.height / 2])(document.querySelectorAll('#scanner .scan-handle')[0].getBoundingClientRect())")
before = c.js("scanState.edit.corners[0][0]")
c.call('Input.dispatchMouseEvent', type='mousePressed', x=h[0], y=h[1], button='left', buttons=1, clickCount=1)
for i in range(1, 6):
    c.call('Input.dispatchMouseEvent', type='mouseMoved', x=h[0] - 4 * i, y=h[1] - 3 * i, button='left', buttons=1)
c.call('Input.dispatchMouseEvent', type='mouseReleased', x=h[0] - 20, y=h[1] - 15, button='left', buttons=0, clickCount=1)
check('5b dragging a handle moves that corner (and only in the editor copy)', "scanState.edit.corners[0][0] < %s - 0.005 && scanState.pages[0].corners[0][0] > scanState.edit.corners[0][0]" % before)
c.js("scanEl('scan-edit-cancel').click(); 1"); time.sleep(0.5)
check('5c Cancel keeps the page as it was', "!scanState.edit && Math.abs(scanState.pages[0].corners[0][0] - %s) < 1e-9" % before)
c.js("scanOpenEditor(scanState.pages[0]); 1"); time.sleep(1.0)
c.js("document.querySelector('#scanner .scan-filter[data-filter=\"bw\"]').click(); document.querySelector('#scanner [data-i18n-title=\"scanRotR\"]').click(); 1"); time.sleep(0.5)
check('6 B/W chip is the active one; a small preview is shown', "document.querySelector('#scanner .scan-filter.active').dataset.filter === 'bw' && !!document.getElementById('scan-preview').src", timeout=5)
w0, h0 = c.js("[scanState.pages[0].w, scanState.pages[0].h]")
c.js("scanEl('scan-edit-done').click(); 1")
check('6b Done re-renders the page: rotated (sides swapped), black and white', "!scanState.busy && scanState.pages[0].w === %d && scanState.pages[0].h === %d && scanState.pages[0].filter === 'bw'" % (h0, w0), timeout=30)
bw = json.loads(c.js(STATS + "(scanState.pages[0].out)"))
assert bw['mid'] < 0.06 and bw['ink'] > 0.03, bw
print('PASS 6c B/W: only black and white (%.1f%% grey after JPEG)' % (bw['mid'] * 100), flush=True)
check('6d the B/W choice is remembered for the next photos', "localStorage.getItem('reader_scan_filter') === 'bw'")
c.js("localStorage.setItem('reader_scan_filter', 'doc'); 1")

# ---- more pages, order, delete, a bad file
c.js("Promise.all([__photo(%s, 'two.jpg'), __photo(%s, 'three.jpg')]).then(fs => scanAddFiles([fs[0], new File(['not an image'], 'notes.jpg', {type: 'image/jpeg'}), fs[1]], false)).then(() => window.__added = 2); 1"
     % (json.dumps([[0.2, 0.1], [0.8, 0.1], [0.8, 0.9], [0.2, 0.9]]), json.dumps([[0.25, 0.12], [0.75, 0.1], [0.78, 0.88], [0.22, 0.9]])))
c.wait("window.__added === 2", timeout=90)
check('7 a file that is not a photo is reported by name and skipped; the other two are added', "scanState.pages.length === 3 && document.getElementById('scan-status').textContent.includes('notes.jpg')")
check('7b three page cards with numbers', "[...document.querySelectorAll('#scan-pages .scan-num')].map(n => n.textContent).join() === '1,2,3'")
ids = c.js("scanState.pages.map(p => p.id)")
c.js("document.querySelectorAll('#scan-pages .scan-card')[0].querySelector('.scan-card-bar button:last-child').click(); 1"); time.sleep(0.2)
check('8 ▶ moves the first page after the second', "JSON.stringify(scanState.pages.map(p => p.id)) === %s" % json.dumps(json.dumps([ids[1], ids[0], ids[2]], separators=(',', ':'))))
c.js("document.querySelectorAll('#scan-pages .scan-card')[2].querySelector('[aria-label=\"' + t('scanDelete') + '\"]').click(); 1"); time.sleep(0.2)
check('8b 🗑 deletes a page', "scanState.pages.length === 2 && !scanState.pages.some(p => p.id === %d)" % ids[2])

# ---- outputs
c.js("window.__zip = null; scanMakeFile('jpg').then(async f => { const z = await JSZip.loadAsync(f); window.__zip = {name: f.name, type: f.type, files: Object.keys(z.files)}; }); 1")
check('9 two pages as JPG come in one ZIP with two .jpg files', "!!__zip && __zip.type === 'application/zip' && __zip.files.length === 2 && __zip.files.every(n => /^scan-.*-0[12]\\.jpg$/.test(n)) || JSON.stringify(__zip)", timeout=20)
c.js("window.__png = null; const keep = scanState.pages; scanState.pages = [keep[0]]; scanMakeFile('png').then(async f => { const b = await createImageBitmap(f); window.__png = {type: f.type, name: f.name, w: b.width}; scanState.pages = keep; }); 1")
check('9b one page as PNG is a real PNG file', "!!__png && __png.type === 'image/png' && /\\.png$/.test(__png.name) && __png.w === scanState.pages[0].w || JSON.stringify(__png)", timeout=20)
c.js("window.__pdf = null; scanBuildPdf(scanState.pages, 'a4').then(async b => { const t = new TextDecoder('latin1').decode(new Uint8Array(await b.arrayBuffer())); window.__pdf = {head: t.slice(0, 8), tail: t.slice(-6), pages: (t.match(/\\/Type \\/Page /g) || []).length}; }); 1")
check('10 the PDF has a PDF header, %%EOF and two pages', "!!__pdf && __pdf.head === '%PDF-1.4' && __pdf.tail.startsWith('%%EOF') && __pdf.pages === 2 || JSON.stringify(__pdf)", timeout=20)
c.js("(f => { f.value = 'pdf-a4'; f.dispatchEvent(new Event('change')); })(document.getElementById('scan-format')); document.getElementById('scan-open').click(); 1")
check('11 «Open in the reader»: the scanner closes and the reader opens the A4 PDF with both pages', "!scanIsOpen() && state.format === 'pdf' && state.totalPages === 2", timeout=30)
check('11b ... its pages are A4', "state.pdfDoc.getPage(1).then(p => Math.abs(p.view[2] - 595.28) < 0.5 && Math.abs(p.view[3] - 841.89) < 0.5 || JSON.stringify([p.view, scanState.pages.map(q => [q.w, q.h, q.corners])]))", timeout=10)
c.wait("!scanState.busy", timeout=20)   # «Open» stays busy until the reader has opened the A4 PDF
c.js("openScanner(); (f => { f.value = 'pdf-fit'; f.dispatchEvent(new Event('change')); })(document.getElementById('scan-format')); document.getElementById('scan-open').click(); 1")
check('11c «PDF · photo size»: pages in the page\'s own proportions', "state.format === 'pdf' && state.pdfDoc.getPage(1).then(p => Math.abs(p.view[2] / p.view[3] - scanState.pages[0].w / scanState.pages[0].h) < 0.01)", timeout=30)
c.js("openScanner(); (f => { f.value = 'jpg'; f.dispatchEvent(new Event('change')); })(document.getElementById('scan-format')); document.getElementById('scan-save').click(); 1")
check('12 Save without a file picker downloads the file and says so', "document.getElementById('scan-status').textContent === t('scanSavedDownloads')", timeout=20)
check('12b the chosen format is remembered', "localStorage.getItem('reader_scan_format') === 'jpg'")
check('12c still no network request', "__net.filter(u => !/\\/(vendor|js)\\//.test(u)).length === 0 || JSON.stringify(__net)")

# ---- a series: the camera button becomes «Next page», one filter for all pages, all pages as one image, drop several photos
check('15 with pages the camera button says «Next page» (a series is shot without the editor in between)', "document.getElementById('scan-shoot').textContent === t('scanCameraNext')")
c.js("window.__added = 0; __photo(%s, 'cam.jpg').then(f => scanAddFiles([f], true)).then(() => window.__added = 1); 1" % json.dumps(QUAD))
c.wait("window.__added === 1", timeout=60); time.sleep(0.3)
check('15b a camera shot with a found sheet goes straight to the list, no editor', "!scanState.edit && scanState.pages.length === 3")
c.js("document.querySelector('#scan-all .scan-all-filter[data-filter=\"gray\"]').click(); 1")
check('16 «For all pages: Grey» re-renders every page in grey', "!scanState.busy && scanState.pages.every(p => p.filter === 'gray') && document.querySelector('#scan-all .scan-all-filter.active')?.dataset.filter === 'gray'", timeout=60)
c.js("window.__one = null; scanMakeFile('jpg-one').then(async f => { const b = await createImageBitmap(f); window.__one = {type: f.type, name: f.name, w: b.width, h: b.height}; }); 1")
check('17 «JPG · all pages as one image» joins the pages one under another into one JPEG',
      "!!__one && __one.type === 'image/jpeg' && /\\.jpg$/.test(__one.name) && __one.h > __one.w * 2 || JSON.stringify(__one)", timeout=30)
c.js("""(async () => { window.__added = 0; const fs = await Promise.all([__photo(%s, 'd1.jpg'), __photo(%s, 'd2.jpg')]); const dt = new DataTransfer(); fs.forEach(f => dt.items.add(f));
  document.getElementById('scanner').dispatchEvent(new DragEvent('drop', {dataTransfer: dt, bubbles: true, cancelable: true})); 1; })()""" % (json.dumps(QUAD), json.dumps(QUAD)))
check('18 several photos dropped into the window become pages at once', "!scanState.busy && scanState.pages.length === 5", timeout=90)

# ---- recognised text: the scanner's PDF gets an invisible text layer, so its words are clickable in the reader
c.js("""window.__ocr = null; (async () => { const cv = document.createElement('canvas'); cv.width = 1240; cv.height = 1754; const x = cv.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.fillStyle = '#111'; x.font = '56px serif';
  ['Bonjour tout le monde,', 'le petit prince regardait', 'les étoiles chaque soir.'].forEach((line, i) => x.fillText(line, 120, 260 + i * 110));
  const out = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.92));
  const page = { id: 999, out, w: cv.width, h: cv.height, filter: 'doc', rotation: 0 };
  const t0 = performance.now(); await scanOcrPage(page, 'fra'); const ms = performance.now() - t0;
  const pdf = await scanBuildPdf([page], 'a4');
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await pdf.arrayBuffer()) }).promise;
  const tc = await (await doc.getPage(1)).getTextContent();
  const text = tc.items.map(i => i.str).join(' ').replace(/\\s+/g, ' ');
  const bon = tc.items.find(i => /Bonjour/.test(i.str));
  window.__ocrPdf = pdf;
  window.__ocr = { ms, words: page.ocr.words.length, text, bonX: bon && bon.transform[4], bonY: bon && bon.transform[5] }; })().catch(e => { window.__ocr = { error: String(e) }; }); 1""")
check('19 OCR on the device finds the words of a page (French)', "!!__ocr && !__ocr.error && __ocr.words >= 10 || JSON.stringify(__ocr)", timeout=120)
print('   OCR of one page took %.1f s' % (c.js("__ocr.ms") / 1000), flush=True)
check('19b the PDF has an invisible text layer PDF.js reads back: «Bonjour … étoiles», at the word\'s place on the page',
      "/Bonjour/.test(__ocr.text) && /étoiles/.test(__ocr.text) && __ocr.bonX > 40 && __ocr.bonX < 90 && __ocr.bonY > 650 && __ocr.bonY < 740 || JSON.stringify(__ocr)")
c.js("openBookFile(new File([__ocrPdf], 'ocr.pdf', {type: 'application/pdf', lastModified: 5})); 1")
check('19d opened in the reader, the scanned page has a text layer with its words (taps translate them)',
      "state.format === 'pdf' && [...document.querySelectorAll('.pdf-text-layer span')].some(s => /Bonjour/.test(s.textContent))", timeout=40)
c.js("openScanner(); 1"); time.sleep(0.3)
check('19c the «Recognise text» switch is on by default and shown for PDF formats only',
      "(() => { const f = document.getElementById('scan-format'), row = document.getElementById('scan-ocr-row'); f.value = 'pdf-a4'; f.dispatchEvent(new Event('change')); const a = !row.hidden && document.getElementById('scan-ocr').checked; f.value = 'png'; f.dispatchEvent(new Event('change')); const b = row.hidden; f.value = 'pdf-a4'; f.dispatchEvent(new Event('change')); return a && b; })()")

# ---- Escape / Back
c.js("scanOpenEditor(scanState.pages[0]); 1"); time.sleep(1.0)
check('13 Back (overlay stack) closes the editor first', "topOpenOverlay() === 'scanner' && (closeTopOverlay('scanner'), !scanState.edit && scanIsOpen())", timeout=2)
c.js("document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); 1"); time.sleep(0.3)
check('13b ... then Escape closes the scanner; the pages stay for this session', "!scanIsOpen() && scanState.pages.length === 5")
c.js("openScanner(); 1"); time.sleep(0.3)
c.js("document.getElementById('scan-clear').click(); 1")
check('14 Clear asks for a second tap', "scanState.pages.length === 5 && document.getElementById('scan-clear').textContent === t('scanClearSure')")
c.js("document.getElementById('scan-clear').click(); 1")
check('14b ... and then clears everything', "scanState.pages.length === 0 && !document.getElementById('scan-empty').hidden")
print('ALL SCANNER CHECKS PASSED')
