"""EPUB chapters are XHTML, but the reader parses them as HTML. Project Gutenberg books (Les Misérables, library id 17489)
contain «<pre/>» and «<a id="Chapitre_XII"/>»: as HTML those OPEN a <pre> / <a> that swallows the rest of the chapter, so
on a phone every line stopped wrapping (a 58 000 px wide block) and pieces of the neighbouring pages showed on the page.
Self-closing non-void tags must stay empty; void ones (<br/>, <img/>, <hr/>) keep working. No network."""
import base64, io, os, time, zipfile
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=390, height=844, deviceScaleFactor=1, mobile=True)


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


toc = ''.join(f'<a href="c.xhtml#ch{i}" class="pginternal"><b>Chapitre {i}--Solitude de monseigneur Bienvenu, évêque de Digne et de la province</b></a><br/>\n' for i in range(1, 40))
body = (f'<section><p>Header</p></section><pre/>\n<hr style="width: 65%;"/>\n<h1>Les Misérables</h1>\n<p class="toc">{toc}</p>\n'
        + ''.join(f'<h2 id="h{i}"> <a id="ch{i}"/><a href="c.xhtml#top" class="pginternal">Chapitre {i}</a></h2>\n<p>Il y a presque toujours autour d\'un évêque une escouade de petits abbés comme autour d\'un général une volée de jeunes officiers. ' * 3 + '</p>\n' for i in range(1, 25)))
chapter = f'<?xml version="1.0" encoding="utf-8"?>\n<html xmlns="http://www.w3.org/1999/xhtml" lang="fr"><head><title>T</title></head><body>{body}</body></html>'
o = io.BytesIO()
with zipfile.ZipFile(o, 'w') as z:
    z.writestr('META-INF/container.xml', '<container><rootfiles><rootfile full-path="OPS/p.opf"/></rootfiles></container>')
    z.writestr('OPS/p.opf', '<package xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata><dc:language>fr</dc:language></metadata><manifest><item id="c" href="c.xhtml"/></manifest><spine><itemref idref="c"/></spine></package>')
    z.writestr('OPS/c.xhtml', chapter)
b64 = base64.b64encode(o.getvalue()).decode()

c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof openBookFile==='function'", timeout=30)
c.js("localStorage.clear(); window.__ok = 0; openBookFile(new File([Uint8Array.from(atob('%s'), ch => ch.charCodeAt(0))], 'mis.epub', {lastModified: 17489})).then(() => { window.__ok = 1; }); 1" % b64)
c.wait("window.__ok === 1 && els.pages.textContent.includes('Bienvenu')", timeout=30); time.sleep(0.8)

check('1 «<pre/>» stays empty: no book text ends up inside a <pre>', "[...els.pages.querySelectorAll('pre')].every(p => !p.textContent.trim())")
check('2 «<a id/>» stays empty: no anchor swallows headings, tables of contents or paragraphs',
      "[...els.pages.querySelectorAll('a[id]')].every(a => !a.textContent.trim()) && ![...els.pages.querySelectorAll('a')].some(a => a.querySelector('p,h1,h2,a'))")
check('3 the long table-of-contents lines wrap inside the page column (nothing wider than the column)',
      "(() => { const col = parseFloat(getComputedStyle(els.pages).columnWidth); return [...els.pages.querySelectorAll('p, b')].every(e => getComputedStyle(e).whiteSpace !== 'pre' && [...e.getClientRects()].every(r => r.width <= col + 1)); })()")
check('4 void tags keep working: <br/> breaks lines, <hr/> stays a rule', "els.pages.querySelectorAll('br').length === 39 && els.pages.querySelectorAll('hr').length === 1")
check('5 expandSelfClosingTags leaves void tags and ordinary markup alone',
      "expandSelfClosingTags('<p>a<br/>b<img src=\"x.png\"/><span class=\"s\"/></p><pre/>') === '<p>a<br/>b<img src=\"x.png\"/><span class=\"s\"></span></p><pre></pre>'")
print('ALL PASS')
