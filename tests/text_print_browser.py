# Copyright (c) 2026 Ihor. All rights reserved. Proprietary software, see LICENSE.
# Copying, modification, distribution or commercial use without written permission is prohibited.
"""Printing a page of a TEXT book (EPUB/FB2/MD/TXT… — printCurrentReaderPage in js/quick-wheel.js, the menu's 🖨 and Ctrl+P).

Owner, 2026-11-15: «потрібно перевірити функцію друку». The text path glued the text of every node whose PARENT started in
the current column: paragraphs and the heading ran into one line («Chapter OneAn italic epigraph.Paragraph 1…»), a paragraph
coming over from the previous page was lost, and one going on to the next page was printed whole. Now the page is the exact
character range on screen (currentTextPageRange), cloned with its structure into a print document with book typography.

Checks on a phone page: the heading and the italics arrive as elements, paragraphs stay apart; printing every page of the
chapter in turn gives the whole chapter text exactly once — nothing lost at a page boundary, nothing printed twice; a page
starts with the continuation of a paragraph from the previous page when that is what the screen shows. The native print
dialog cannot be automated: the print iframe's window.print is replaced by a capture stub when the iframe is inserted.
"""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=412, height=915, deviceScaleFactor=1, mobile=True)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__prints = []; window.__errors = [];
addEventListener('error', e => __errors.push(e.message));
const realAppend = Element.prototype.append;
Element.prototype.append = function (...nodes) {
  const out = realAppend.apply(this, nodes);
  for (const n of nodes) if (n && n.tagName === 'IFRAME') {
    const w = n.contentWindow;
    w.print = () => { const d = n.contentDocument; __prints.push({ text: d.body.innerText, h1: d.querySelectorAll('h1').length, em: d.querySelectorAll('em').length, p: d.querySelectorAll('p').length, css: d.head.textContent });
                      setTimeout(() => w.dispatchEvent(new Event('afterprint')), 20); };
  }
  return out;
};''')
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof printCurrentReaderPage==='function'", timeout=30)
c.js("localStorage.setItem('reader_onboarding_done','1'); localStorage.setItem('reader_fullscreen','0'); showUpdateBanner = () => {}; 1")


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


PARAS = '\n\n'.join('Paragraph %d begins here and it is long enough to wrap over several lines of the narrow phone page, so that some paragraphs cross a page boundary. End of paragraph %d.' % (i, i) for i in range(1, 40))
MD = '# Chapter One\n\n*An italic epigraph.*\n\n' + PARAS
c.js("openBookFile(new File([%s], 'print.md')); 1" % json.dumps(MD))
c.wait("state.bookKey && state.totalPagesInChapter > 3", timeout=30); time.sleep(1)


def print_page(n):
    c.js("goToPageInChapter(%d, false); 1" % n); time.sleep(0.4)
    c.js("__prints.length = 0; printCurrentReaderPage(); 1")
    c.wait("__prints.length === 1", timeout=10)
    return json.loads(c.js("JSON.stringify(__prints[0])"))


first = print_page(0)
assert first['h1'] == 1 and first['em'] == 1 and first['p'] >= 2 and first['text'].startswith('Chapter One\n'), first
assert 'Chapter OneAn italic' not in first['text'] and 'paragraph 1.\n' in first['text'], first['text'][:300]
print('PASS 1 the first page keeps its structure: the heading and the italics arrive as elements, paragraphs stay apart', flush=True)
assert 'Georgia' in first['css'] and '@page' in first['css'], first['css']
print('PASS 2 the print document has book typography and page margins', flush=True)

total = c.js("state.totalPagesInChapter")
printed = [first['text']] + [print_page(n)['text'] for n in range(1, total)]
norm = lambda s: ' '.join(s.split())
whole = norm(c.js("els.pages.innerText"))
joined = norm(' '.join(printed))
assert joined.replace(' ', '') == whole.replace(' ', ''), ('pages do not add up to the chapter', len(joined), len(whole))
print('PASS 3 every page of the chapter printed in turn gives the whole chapter text exactly once (%d pages: nothing lost or doubled at a page boundary)' % total, flush=True)

cont = next((i for i in range(1, total) if not norm(printed[i]).startswith('Paragraph')), None)
assert cont is not None, 'no page starts inside a paragraph in this layout'
print('PASS 4 a page that starts inside a paragraph prints that continuation (page %d: «%s…»)' % (cont + 1, norm(printed[cont])[:30]), flush=True)
check('5 no application errors', "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL TEXT PRINT CHECKS PASSED')
