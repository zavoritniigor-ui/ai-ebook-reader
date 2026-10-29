"""A tapped PDF word that the file cuts into several text items is ONE word (owner 2026-10-29: a conjugation book prints a
verb's stem in another font, so «étudier» is «é» + «tudier», «gagner» «ga» + «gner»; a tap gave «tudier»). Items that touch on
one line are joined (pdfSpansContinueWord, the rule the sentences use); a real gap still separates two words."""
import base64, json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
H = 14                                     # font size; Helvetica widths (1/1000 em): g a 556, e-acute 556, m 833, o 556, t 278
w = lambda units: units * H / 1000


def pdf_b64():
    # the second piece in another font, as the book prints a stem: pdf.js keeps them two text items (one font would be merged)
    items = [
        ('F1', 50, 700, '\\351'), ('F2', 50 + w(556), 700, 'tudier'),                  # «é» + «tudier»: touching
        ('F1', 50, 650, 'ga'), ('F2', 50 + w(1112), 650, 'gner les verbes'),           # «ga» + «gner»: touching
        ('F1', 50, 600, 'mot'), ('F2', 50 + w(833 + 556 + 278) + 6, 600, 'suivant'),    # a real gap: two words
        ('F1', 50, 550, 'jouer manger'),                                                # one item, two words
    ]
    ops = '\n'.join(f'BT /{f} {H} Tf {x:.3f} {y} Td ({t}) Tj ET' for f, x, y, t in items).encode()
    objs = [b'<< /Type /Catalog /Pages 2 0 R >>', b'<< /Type /Pages /Count 1 /Kids [4 0 R] >>',
            b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
            b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R /F2 6 0 R >> >> /Contents 5 0 R >>',
            f'<< /Length {len(ops)} >>\nstream\n'.encode() + ops + b'\nendstream',
            b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>']
    data, offsets = b'%PDF-1.4\n', []
    for i, obj in enumerate(objs, 1):
        offsets.append(len(data)); data += f'{i} 0 obj\n'.encode() + obj + b'\nendobj\n'
    xref = len(data)
    data += f'xref\n0 {len(objs) + 1}\n0000000000 65535 f \n'.encode() + b''.join(f'{o:010d} 00000 n \n'.encode() for o in offsets)
    data += f'trailer << /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF'.encode()
    return base64.b64encode(data).decode()


c = CDP()
c.call('Page.enable'); c.call('Runtime.enable')
c.call('Emulation.setDeviceMetricsOverride', width=900, height=1200, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState === 'complete' && typeof openBookFile === 'function' && !document.body.inert", timeout=60)
c.js(f"""(async () => {{ const raw = atob('{pdf_b64()}'), u8 = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
    await openBookFile(new File([u8], 'Split words.pdf', {{ type: 'application/pdf', lastModified: 1 }})); return 1; }})()""")
c.wait("typeof pdfContinuousReady !== 'undefined' && pdfContinuousReady && document.querySelectorAll('.pdf-text-layer span').length >= 1", timeout=60)
time.sleep(0.5)
TAP = """((piece, nth) => { const layer = document.querySelector('.pdf-text-layer'); const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT); let n, k = 0;
    while ((n = walker.nextNode())) { const i = n.data.indexOf(piece); if (i < 0 || k++ < (nth || 0)) continue;
        const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + piece.length); const b = r.getBoundingClientRect();
        return selectWordAtPoint(b.left + b.width / 2, b.top + b.height / 2); } return 'no piece ' + piece; })"""


def tap(piece, want, name):
    got = c.js(f"{TAP}({json.dumps(piece)})")
    assert got == want, (name, got)
    print('PASS', name, flush=True)


tap('tudier', 'étudier', '1 a tap on «tudier» (after a touching «é») gives the whole «étudier»')
tap('é', 'étudier', '2 a tap on the detached «é» gives «étudier» too')
tap('gner', 'gagner', '3 «ga» + «gner les verbes»: the tap on «gner» gives «gagner», not the next word')
tap('suivant', 'suivant', '4 an item after a real gap is another word: «suivant», not «motsuivant»')
tap('mot', 'mot', '5 ... and «mot» stays «mot»')
tap('manger', 'manger', '6 two words inside one item are still two words')
marked = c.js("JSON.stringify([...document.querySelectorAll('.pdf-text-layer .word-visited')].map(s => [s.textContent, !!s.parentElement.closest('.word-visited')]))")
assert '["é",false]' in marked and '["tudier",false]' in marked and 'true' not in marked, ('both pieces marked once, nothing nested', marked)
print('PASS 7 every piece of a joined word is marked as visited', flush=True)
tap('tudier', 'étudier', '8 a second tap on the marked word gives the whole word again')
assert c.js("__errors.length === 0") if c.js("typeof __errors !== 'undefined'") else True
print('ALL SPLIT WORD CHECKS PASSED')
