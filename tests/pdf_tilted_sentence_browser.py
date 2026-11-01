"""A tilted frame on a PDF page (a textbook «Mémo» box printed at 3.5°): the «sentence» of a tapped word is its own
sentence, whole. Before, the screen boxes of the rotated lines were so tall that neighbouring lines fused into one
«line»: the sentence skipped a line or ran on into the next. Fixture: tests/fixtures/pdf/tilted-memo.pdf (straight
column on the left, a box at 3.5° on the right whose third line is split into two text items). No network."""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=900, height=1200, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL); c.wait("document.readyState==='complete' && !document.body.inert && typeof openBookFile==='function'", timeout=30)
c.js("localStorage.clear(); localStorage.setItem('reader_onboarding_done','1'); 1")
c.js("fetch('tests/fixtures/pdf/tilted-memo.pdf').then(r => r.blob()).then(b => openBookFile(new File([b], 'tilted-memo.pdf', {type: 'application/pdf', lastModified: 3}))); 1")
c.wait("state.format === 'pdf' && [...document.querySelectorAll('.pdf-text-layer span')].some(s => /quatre/.test(s.textContent))", timeout=40)
time.sleep(1)
# a tap on the glyphs of an item: its origin plus a little way along its own (rotated) baseline
SENT = """(re => { const sp = [...document.querySelectorAll('.pdf-text-layer span')].find(s => re.test(s.textContent)); state.lastWordNode = null;
  const L = sp.offsetParent, lr = L.getBoundingClientRect(), k = lr.width / L.offsetWidth, a = (parseFloat(sp.style.getPropertyValue('--rotate')) || 0) * Math.PI / 180, u = 14, v = sp.offsetHeight / 2;
  const x = lr.left + (sp.offsetLeft + u * Math.cos(a) - v * Math.sin(a)) * k, y = lr.top + (sp.offsetTop + u * Math.sin(a) + v * Math.cos(a)) * k;
  const r = sentenceRangeAt(x, y); return r ? r.toString() : null; })"""


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


check('0 the box is rotated in the text layer (the test is about tilted items)',
      "[...document.querySelectorAll('.pdf-text-layer span')].some(s => /quatre/.test(s.textContent) && Math.abs(parseFloat(s.style.getPropertyValue('--rotate')) - 3.5) < 0.1)")
check('1 a word of the last line: its sentence is that line, not the bullet above it',
      "(t => t === \"– Ca fait quatre mois que j'ai mal au dos.\" || t)(%s(/quatre/))" % SENT)
# the heading and the bullet above have no full stop, so they may lead into the example; it must end at its own full stop,
# hold both items of its line and nothing of the next line or of the straight column
OK2 = "(t => !!t && t.endsWith('Ex.: – Ca fait deux jours que mon bras elance.') && !/quatre|verbes|auxiliaire/.test(t) || t)"
check('2 the first part of a line split in two items: the whole example sentence, both items', "%s(%s(/Ca fait deux/))" % (OK2, SENT))
check('3 the second part of that line gives the same sentence', "%s(%s(/jours que/))" % (OK2, SENT))
check('4 the straight column beside the box is not mixed in',
      "(t => t === 'Les verbes pronominaux se forment avec l\\'auxiliaire etre suivi du participe passe.' || t)(%s(/^Les verbes/))" % SENT)
print('ALL TILTED SENTENCE CHECKS PASSED')
