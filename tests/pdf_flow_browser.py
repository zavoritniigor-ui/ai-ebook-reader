# Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
# Copying, modification, distribution or commercial use without written permission is prohibited.
"""The tapped sentence and a drag on a textbook page come from the page's own reading flow (js/pdf-flow.js): the order the
PDF writes its text in, checked by geometry and fonts. Before, the visual columns fused a paragraph with a table printed
beside it, exercise items with each other and a heading with its text, so one tapped «sentence» ran on into the next ones.
Fixture: tests/fixtures/pdf/flow-layout.pdf (tools/make_pdf_flow_fixture.py), the layouts of a Par Ici page. No network."""
import os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=900, height=1200, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL); c.wait("document.readyState==='complete' && !document.body.inert && typeof openBookFile==='function'", timeout=30)
c.js("localStorage.clear(); localStorage.setItem('reader_onboarding_done','1'); 1")
c.js("fetch('tests/fixtures/pdf/flow-layout.pdf').then(r => r.blob()).then(b => openBookFile(new File([b], 'flow-layout.pdf', {type: 'application/pdf', lastModified: 4}))); 1")
c.wait("state.format === 'pdf' && [...document.querySelectorAll('.pdf-text-layer span')].some(s => /colonne de droite/.test(s.textContent))", timeout=40)
time.sleep(1)

# The sentence of a tap a little way into the item that matches `re` (the same call the reader makes).
SENT = """((re, word) => { const sp = [...document.querySelectorAll('.pdf-text-layer span')].find(s => re.test(s.textContent)); sp.scrollIntoView({block: 'center'});
  let b = sp.getBoundingClientRect(), x = b.left + Math.min(12, b.width / 2);
  if (word) { const n = sp.firstChild, at = n.nodeValue.indexOf(word), w = document.createRange(); w.setStart(n, at); w.setEnd(n, at + word.length); const wb = w.getBoundingClientRect(); x = wb.left + wb.width / 2; }
  const r = sentenceRangeAt(x, b.top + b.height / 2); return r ? r.toString() : null; })"""
# A drag from the first character of one item to the last of another, resolved as the reader resolves a drag.
DRAG = """((reA, reB) => { const spans = [...document.querySelectorAll('.pdf-text-layer span')]; const a = spans.find(s => reA.test(s.textContent)), b = spans.find(s => reB.test(s.textContent));
  const r = document.createRange(); r.setStart(a.firstChild, 0); r.setEnd(b.firstChild, b.firstChild.nodeValue.length);
  const sel = resolveCanonicalPdfSelection(r, { sourceType: 'phrase_translation' }); return sel ? sel.text : null; })"""


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


check('0 the text layer carries each item\'s font (two fonts on the page)',
      "new Set([...document.querySelectorAll('.pdf-text-layer span')].map(s => s.dataset.font).filter(Boolean)).size === 2")
MEMO = "A l'oral, quand le pronom en suit un autre pronom, on ajoute parfois un z avant le en pour creer une liaison entre les deux pronoms."
check('1 the memo paragraph: its sentence, none of the table rows beside it',
      "(t => t === %r || t)(%s(/pronom en suit/))" % (MEMO, SENT))
check('2 a line of the paragraph next to a table row gives the same sentence',
      "(t => t === %r || t)(%s(/^un autre pronom/))" % (MEMO, SENT))
check('3 the next sentence of the paragraph stops at its own full stop',
      "(t => t === \"D'autres liaisons peuvent aussi etre faites.\" || t)(%s(/^liaisons peuvent/))" % SENT)
check('4 a table row is not part of the paragraph',
      "(t => !!t && /mwaza/.test(t) && !/pronom|liaison/.test(t) || t)(%s(/^moi \\+ en/))" % SENT)
check('5 the instruction is its own sentence, not the items under it',
      "(t => t === 'Ecoutez et completez.' || t)(%s(/Ecoutez et completez/, 'completez'))" % SENT)
check('6 an exercise item keeps the text after its blanks and none of the other items',
      "(t => t === 'b. Il faudrait que vous en avec le adjoint, pour confirmer.' || t)(%s(/^b\\. Il faudrait/))" % SENT)
check('7 the text after a blank gives the same item',
      "(t => t === 'b. Il faudrait que vous en avec le adjoint, pour confirmer.' || t)(%s(/^adjoint, pour/))" % SENT)
check('8 an item that wraps onto a second line keeps it, and stops before the next item',
      "(t => t === \"c. Il faut que tu ton montage, va voir le technicien pour emprunter l'equipement necessaire.\" || t)(%s(/^c\\. Il faut/))" % SENT)
check('9 a bold heading is not glued to the text under it',
      "(t => t === 'Les connecteurs de temps' || t)(%s(/^Les connecteurs de temps/))" % SENT)
check('10 the text under the heading starts its own sentence',
      "(t => t === \"Pour indiquer l'ordre des etapes dans le temps, on utilise des connecteurs comme d'abord, ensuite et enfin.\" || t)(%s(/^Pour indiquer/))" % SENT)
THREAD = 'La phrase suivante commence en bas de la colonne de gauche et elle continue dans la colonne de droite sans aucun point avant la fin de la phrase.'
check('11 a sentence that goes on at the top of the next column is whole (tap in the left column)',
      "(t => t === %r || t)(%s(/^La phrase suivante/))" % (THREAD, SENT))
check('12 the same sentence from the right column',
      "(t => t === %r || t)(%s(/^avant la fin/))" % (THREAD, SENT))
check('15 a conjugation column is not glued to the column beside it',
      "(t => t === 'je prevaudrai tu prevaudras il prevaudra ils prevaudront' || t)(%s(/^il prevaudra/))" % SENT)
check('13 a drag over the memo paragraph selects the paragraph, not the table rows between its lines',
      "(t => t === %r || t)(%s(/^A l'oral/, /^liaisons peuvent/))" % (MEMO + " D'autres liaisons peuvent aussi etre faites.", DRAG))
check('14 a drag over two exercise items selects those two items',
      "(t => t === 'a. Ce serait bien que tu rendez-vous avec la . b. Il faudrait que vous en avec le adjoint, pour confirmer.' || t)(%s(/^a\\. Ce serait/, /^adjoint, pour/))" % DRAG)
print('ALL PDF FLOW CHECKS PASSED')
