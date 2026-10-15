"""Sentence boundaries (sentenceCuts / sentenceSpans in js/core.js), shared by the sentence tap, the read-aloud queue, the PDF
text layer, Grammar and Practice. A full stop after an abbreviation, an initial or a title («Mr. Smith», «M. Dupont»,
«J. K. Rowling», «т. зв.», «etc. and», «p. 12») does not end the sentence; closing quotes belong to it («"Go." she said»,
French «Viens. »»); «?!» and «...» are one end; CJK full stops end it without a space. Before, any «. ! ?» before a space
ended the sentence everywhere. No network."""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=800, deviceScaleFactor=1, mobile=False)
READY = "document.readyState==='complete' && !document.body.inert && typeof openBookFile==='function'"
c.call('Page.navigate', url=URL); c.wait(READY, timeout=30)
c.js("localStorage.clear(); localStorage.setItem('reader_onboarding_done','1'); 1"); c.call('Page.reload'); c.wait(READY, timeout=30); time.sleep(0.5)


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


SPLIT = "(s => sentenceSpans(s).map(([a, b]) => s.slice(a, b)))"
CASES = [
    ('Mr. Smith went home. He slept.', ['Mr. Smith went home.', 'He slept.']),
    ('M. Dupont est arrivé. Il dort.', ['M. Dupont est arrivé.', 'Il dort.']),
    ('J. K. Rowling wrote it. Then she rested.', ['J. K. Rowling wrote it.', 'Then she rested.']),
    ('Це т. зв. правило. Інше речення.', ['Це т. зв. правило.', 'Інше речення.']),
    ('Він живе в м. Київ. Проф. Іваненко прийшов.', ['Він живе в м. Київ.', 'Проф. Іваненко прийшов.']),
    ('Apples, pears, etc. and more. Done!', ['Apples, pears, etc. and more.', 'Done!']),
    ('"Go." she said. He went.', ['"Go." she said.', 'He went.']),
    ('Il dit : « Viens. » Puis il part.', ['Il dit : « Viens. »', 'Puis il part.']),
    ('Is it? Yes! Really?! Ok...', ['Is it?', 'Yes!', 'Really?!', 'Ok...']),
    ('Price is 3.5 dollars. See p. 12 and vol. 2. He left. 1990 was hard.', ['Price is 3.5 dollars.', 'See p. 12 and vol. 2.', 'He left.', '1990 was hard.']),
    ('Mme Bovary rêve. Charles dort.', ['Mme Bovary rêve.', 'Charles dort.']),
    ('你好。我很好！真的吗？', ['你好。', '我很好！', '真的吗？']),
]
for text, want in CASES:
    check('split: ' + text, "JSON.stringify(%s(%s)) === %s || JSON.stringify(%s(%s))" % (SPLIT, json.dumps(text), json.dumps(json.dumps(want, ensure_ascii=False, separators=(',', ':'))), SPLIT, json.dumps(text)))

BOOK = ('<html><body><h1>T</h1><p id="p1">Mr. Smith went to <i>St.</i> Paul\'s church with M. Dupont. He prayed there for an hour. '
        '"Go." she said. Then they left.</p></body></html>')
c.js("window.__ok = 0; openBookFile(new File([%s], 'sentences.html', {type: 'text/html', lastModified: 5})).then(() => { window.__ok = 1; }); 1" % json.dumps(BOOK))
c.wait("window.__ok === 1", timeout=30); time.sleep(1.5)
# centre of the word «Smith» and of «she»
POINT = """(w => { const p = [...els.pages.querySelectorAll('p')].find(e => e.textContent.includes('Smith')); const it = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let n;
  while ((n = it.nextNode())) { const i = n.nodeValue.indexOf(w); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + w.length); const b = r.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; } } return null; })"""
check('a tap on «Smith» takes the WHOLE sentence (Mr. and St. do not end it, even across the <i> element)',
      "(pt => { const r = sentenceRangeAt(pt[0], pt[1]); return !!r && r.toString().trim() === \"Mr. Smith went to St. Paul's church with M. Dupont.\" || (r && r.toString()); })(%s('Smith'))" % POINT)
check('a tap on «she» takes the quoted sentence with its quotes («"Go." she said.»)',
      "(pt => { const r = sentenceRangeAt(pt[0], pt[1]); return !!r && r.toString().trim() === '\"Go.\" she said.' || (r && r.toString()); })(%s('she'))" % POINT)
check('the read-aloud queue for the paragraph has four sentences, not six',
      """(() => { const p = [...els.pages.querySelectorAll('p')].find(e => e.textContent.includes('Smith')); const r = document.createRange(); r.selectNodeContents(p);
         const s = buildSentenceRanges(r).map(x => x.text); return s.length === 4 && s[0].startsWith('Mr. Smith') && s[1] === 'He prayed there for an hour.' || JSON.stringify(s); })()""")
check('PDF text layer: sentences from spans keep «M. Dupont» together',
      """(() => { const layer = document.createElement('div'); layer.className = 'pdf-text-layer'; layer.style.cssText = 'position:fixed;left:0;top:0;width:600px;height:40px;';
         ['Voici M.', ' Dupont qui', ' arrive. Il', ' dort.'].forEach((t, i) => { const s = document.createElement('span'); s.textContent = t; s.style.cssText = 'position:absolute;top:10px;font:16px sans-serif;left:' + (i * 110) + 'px'; layer.append(s); });
         document.body.append(layer); const out = buildSentenceRangesFromSpans([...layer.children]).map(s => s.text.replace(/\\s+/g, ' ')); layer.remove();
         return out.length === 2 && out[0] === 'Voici M. Dupont qui arrive.' && out[1] === 'Il dort.' || JSON.stringify(out); })()""")
check('Practice: the sentence around a target does not stop at «M.»',
      "(t => { const i = t.indexOf('Dupont'); return sentenceAround(t, i, i + 6) === 'Il voit M. Dupont au marché.' || sentenceAround(t, i, i + 6); })('Il dort. Il voit M. Dupont au marché. Puis il part.')")
check('Grammar: sentence split and the sentence around a tapped word use the same rule',
      """(t => { const parts = grammarSplitSentences(t); const i = t.indexOf('Smith'); const r = grammarSentenceAround(t, i, i + 5);
         return parts.length === 2 && t.slice(r.from, r.to) === 'Mr. Smith arrived.' || JSON.stringify([parts, t.slice(r.from, r.to)]); })('Mr. Smith arrived. He sat down.')""")
print('ALL PASS')
