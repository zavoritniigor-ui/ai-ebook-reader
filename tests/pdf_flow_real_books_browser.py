# Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
# Copying, modification, distribution or commercial use without written permission is prohibited.
"""Gold set for the tapped sentence on REAL book pages (js/pdf-flow.js), each expected sentence checked by hand against
the printed page. One case per kind of layout the visual columns got wrong, plus pages they got right and must keep.
The books are not in the repository (copyright): a book that is not on this computer is skipped, so on CI only the
fixture suite tests/pdf_flow_browser.py runs. Paths: ~/Books (READER_BOOKS_DIR to change)."""
import base64, json, os, re, time, unicodedata
from browser_cdp import CDP

BOOKS = os.environ.get('READER_BOOKS_DIR') or os.path.expanduser('~/Books')
URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')

# (book, page, item that holds the tapped word, the word, the expected sentence)
CASES = {
    'Par Ici 5-6/Par Ici 5-6 Manuel de compréhension orale.pdf': [
        # a «Mémo» frame: the rule beside a table of «moi + en = [mwazã]» rows (the owner's screenshot)
        (29, r'^un autre pronom', 'autre', 'À l’oral, quand le pronom en [ã] suit un autre pronom, on ajoute parfois un z [z] avant le en pour créer une liaison entre les deux pronoms.'),
        # a gap-fill exercise item with a hanging second line, between items c. and d.
        (26, r'^en audiovisuel', 'audiovisuel', 'c. Il faut que tu ton montage vidéo, va voir le en audiovisuel pour emprunter l’équipement nécessaire.'),
        # a list of steps: one item, not the list
        (27, r'Effectuer la commande', 'Effectuer', 'b. Effectuer la commande.'),
        # a bold heading over its text
        (27, r'^Les connecteurs de temps', 'connecteurs', 'Les connecteurs de temps'),
        # a sentence whose next line starts with a bold word that did not fit on the line before
        (27, r'Ces mots servent', 'servent', 'Ces mots servent à indiquer l’ordre dans une suite, comme : d’abord, premièrement, ensuite, deuxièmement, puis, de plus, troisièmement, après, plus tard, enfin, finalement, pour finir, etc.'),
        # a sentence printed round a «V / F» box
        (62, r'réseaux sociaux', 'sociaux', 'Pour y accéder, on peut chercher sur les réseaux sociaux comme LinkedIn ou Facebook, en parler aux gens autour de nous, envoyer une candidature spontanée à un employeur, contacter une agence de placement ou un centre d’aide à l’emploi.'),
    ],
    'Par Ici 5-6/livre 56.pdf': [
        # a paragraph that begins after a paragraph space keeps its last line
        (46, r'^recevoir une contravention', 'contravention', 'Les personnes qui ne respectent pas l’avis concernant l’arrosage peuvent recevoir une contravention.'),
        (54, r'Une cycliste', 'cycliste', 'b. Une cycliste a été blessée par une voiture.'),
    ],
    'Complete French/Complete French All-in-One .pdf': [
        # a parallel text written line by line in turn: each language is its own sentence
        (277, r'aurait échoué', 'aurait', 'Au cas où il aurait échoué à l’examen, on lui donnera une autre chance.'),
        (277, r'^In case he failed', 'failed', 'In case he failed the exam, we’ll give him another chance.'),
        (385, r'quelle est ton', 'quelle', 'Et toi, quelle est ton opinion?'),
        # a paragraph with an indented first line
        (437, r'^comma\. However', 'comma', 'The number of the house or building should be separated from the name of the street by a comma.'),
    ],
    'Petites histoires pour apprendre le français/Petites histoires pour apprendre le français.pdf': [
        # a page printed from Firefox: plain text first, the words in another style after, filling its holes
        (119, r'Pardon', 'Pardon', '— Pardon, mais les médecins sont-ils au courant de notre présence ?'),
    ],
    'Adventures of Sherlock Holmes.pdf': [
        # an OCR scan (one invisible font): the visual columns, exactly as before
        (21, r'^Insensibly', 'Insensibly', 'Insensibly one begins to twist facts to suit theories, instead of theories to suit facts.'),
    ],
}

present = {b: cases for b, cases in CASES.items() if os.path.exists(os.path.join(BOOKS, b))}
if not present:
    print('NOTE: none of the gold-set books is in %s -- skipped (CI has no copies; tests/pdf_flow_browser.py covers the layouts)' % BOOKS)
    print('ALL PDF FLOW REAL-BOOK CHECKS PASSED (0 books)')
    raise SystemExit(0)

c = CDP(); c.sock.settimeout(180)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1400, height=1000, deviceScaleFactor=1, mobile=False)

TAP = """((page, re, word) => { const sp = [...document.querySelectorAll('.pdf-page-wrapper[data-page="' + page + '"] .pdf-text-layer span')].find(s => re.test(s.textContent));
  if (!sp) return 'NO ITEM';
  sp.scrollIntoView({block: 'center', inline: 'center'});
  const n = sp.firstChild, at = Math.max(0, n.nodeValue.indexOf(word)), w = document.createRange(); w.setStart(n, at); w.setEnd(n, Math.min(n.nodeValue.length, at + word.length));
  const b = w.getBoundingClientRect(); const r = sentenceRangeAt(b.left + b.width / 2, b.top + b.height / 2); return r ? r.toString() : null; })"""

failures, done = [], 0
for book, cases in present.items():
    c.call('Page.navigate', url=URL); c.wait("document.readyState==='complete' && !document.body.inert && typeof openBookFile==='function'", timeout=30)
    c.js("localStorage.clear(); localStorage.setItem('reader_onboarding_done','1'); 1")
    c.js("window.__b64 = %s; 1" % json.dumps(base64.b64encode(open(os.path.join(BOOKS, book), 'rb').read()).decode()))
    c.js("(() => { const bin = atob(window.__b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); openBookFile(new File([u], 'book.pdf', {type: 'application/pdf', lastModified: 7})); window.__b64 = null; return 1; })()")
    c.wait("state.format === 'pdf' && !!state.pdfDoc && typeof goToPhysicalPage === 'function'", timeout=120)
    time.sleep(2)
    for page, item, word, expected in cases:
        c.js("goToPhysicalPage(%d, {instant: true}); 1" % page)
        c.wait("document.querySelectorAll('.pdf-page-wrapper[data-page=\"%d\"] .pdf-text-layer span[data-font]').length > 0 || document.querySelectorAll('.pdf-page-wrapper[data-page=\"%d\"] .pdf-text-layer span').length > 0" % (page, page), timeout=60)
        time.sleep(1.2)
        got = c.js("%s(%d, new RegExp(%s), %s)" % (TAP, page, json.dumps(item), json.dumps(word)))
        name = '%s p.%d «%s»' % (os.path.basename(book), page, word)
        # Compared as text: «ã» may be «a» + a combining tilde, a font may print its spaces as private-use glyphs (a page
        # printed from Firefox), no-break and thin spaces are spaces.
        same = lambda t: ' '.join(re.sub('[\ue000-\uf8ff]', ' ', unicodedata.normalize('NFC', str(t))).split())
        if got is not None and same(got) == same(expected):
            print('PASS', name, flush=True); done += 1
        else:
            print('FAIL', name, '\n   expected:', ascii(expected), '\n   got:     ', ascii(got), flush=True); failures.append(name)

assert not failures, failures
print('ALL PDF FLOW REAL-BOOK CHECKS PASSED (%d taps in %d books)' % (done, len(present)))
