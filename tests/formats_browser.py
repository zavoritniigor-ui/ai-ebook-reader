"""Synthetic, redistributable format fixtures; real import/ZIP guard/DOM/layout."""
import base64, io, json, os, zipfile
from browser_cdp import CDP
c = CDP(); c.call('Page.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.navigate', url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert")
def check(name, expression):
    result = c.js(expression); assert result is True, (name, result); print('PASS', name, flush=True)
def upload(name, data):
    if isinstance(data, str): data = data.encode()
    c.js(f"openBookFile(new File([Uint8Array.from(atob({json.dumps(base64.b64encode(data).decode())}),c=>c.charCodeAt(0))],{json.dumps(name)},{{lastModified:123}}))")
def archive(files):
    out = io.BytesIO()
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, data in files.items(): z.writestr(name, data)
    return out.getvalue()
png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZ0AAAAASUVORK5CYII='
fb2 = f'''<?xml version="1.0" encoding="utf-8"?><FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:l="http://www.w3.org/1999/xlink"><body><section><title><p>Chapter</p></title><p>bon<strong>jour</strong> l’emphase café.</p><image l:href="#cover"/></section></body><body name="notes"><section id="note"><p>Footnote</p></section></body><binary id="cover" content-type="image/png">{png}</binary></FictionBook>'''
for name, data in [('fixture.fb2', fb2), ('fixture.fb2.zip', archive({'Book/book.fb2':fb2}))]:
    upload(name, data)
    check(name+' image decoded and both bodies retained', "state.format==='txt' && state.docChapters.join('').includes('Footnote') && els.pages.querySelector('img').naturalWidth===1")
    check(name+' cross-formatting word', "(()=>{const n=els.pages.querySelector('b').firstChild; const b=reflowWordBounds(n,1); return rangeBetweenWords(b,b).toString()==='bonjour'})()")
    check(name+' tap highlights entire word and repeats', "(()=>{const n=els.pages.querySelector('b').firstChild;const r=document.createRange();r.selectNodeContents(n);const b=r.getBoundingClientRect();const x=b.x+b.width/2,y=b.y+b.height/2;return selectWordAtPoint(x,y)==='bonjour' && selectWordAtPoint(x,y)==='bonjour' && Array.from(els.pages.querySelectorAll('.word-visited')).some(s=>s.textContent==='bon')})()")
legacy = fb2.replace('utf-8','windows-1251').replace('café', 'кафе')
upload('legacy.fb2', legacy.encode('cp1251'))
check('FB2 XML declared encoding', "els.pages.textContent.includes('кафе')")
upload('bad.fb2', '<FictionBook><body>broken')
check('malformed XML rejected', 'state.format===null')
upload('ambiguous.fb2.zip', archive({'a.fb2':fb2,'b.fb2':fb2}))
check('ambiguous archive rejected', 'state.format===null')
upload('slip.fb2.zip', archive({'../a.fb2':fb2}))
check('ZIP traversal guard retained', 'state.format===null')
upload('fixture.md', '# Heading\n\nA **bold** and *italic* word.\n\n- one\n- two\n\n```js\nconst x = 1;\n```\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n<script>window.__unsafe=1</script><img src="x" onerror="window.__unsafe=1">')
check('Markdown structure and sanitization', "!!els.pages.querySelector('strong') && !!els.pages.querySelector('ul') && !!els.pages.querySelector('pre code') && !!els.pages.querySelector('table') && !els.pages.querySelector('script,[onerror]') && !window.__unsafe")
epub = archive({'META-INF/container.xml':'<container><rootfiles><rootfile full-path="OPS/package.opf"/></rootfiles></container>',
    'OPS/package.opf':'<package><manifest><item id="c" href="Text/chapter.xhtml"/></manifest><spine><itemref idref="c"/></spine></package>',
    'OPS/Text/chapter.xhtml':'<html><body><h1>EPUB</h1><p>Visible text.</p><img src="../Images/a%20b.png"/><img src="../Images/vector.svg"/><svg xmlns="http://www.w3.org/2000/svg"><image href="../Images/a%20b.png"/></svg><img src="missing.png"/></body></html>',
    'OPS/Images/a b.png':base64.b64decode(png),
    'OPS/Images/vector.svg':'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><script>window.__unsafe=1</script><rect width="20" height="10" fill="red"/></svg>'})
upload('fixture.epub', epub)
check('EPUB relative/encoded paths, vector and SVG cover decoded', "state.format==='epub' && [...els.pages.querySelectorAll('img')].slice(0,3).every(i=>i.complete&&i.naturalWidth>0) && !els.pages.querySelectorAll('img')[3].hasAttribute('src') && !window.__unsafe")
check('archive URL rejects escaping and remote references', "resolveEpubPath('OPS/','../../x')==='' && resolveEpubPath('OPS/','%2e%2e/%2e%2e/x')==='' && resolveEpubPath('OPS/','https://host/x')===''")
check('stale resource completion cannot paginate new book', "(async()=>{let called=0;const old=paginateContainer;paginateContainer=()=>called++;await settleBookLayout(()=>false,0);paginateContainer=old;return called===0})()")
check('combining marks and inline boundaries', "(()=>{els.pages.innerHTML='<p>cafe<b>́</b> l’<em>homme</em> word<br>next</p>'; const n=els.pages.querySelector('b').firstChild;const b=reflowWordBounds(n,1);return rangeBetweenWords(b,b).toString()==='café'})()")
check('margin tap does not snap to the nearby reflow word', "(()=>{els.pages.innerHTML='<p>bonjour</p>';const r=document.createRange();r.selectNodeContents(els.pages.firstChild);const b=r.getBoundingClientRect();return selectWordAtPoint(b.right+35,b.top+b.height/2)===null && !els.pages.querySelector('.word-visited')})()")
check('invalid SVG namespace fails safely', "(async()=>await bookSvgPng('<svg xmlns=\"urn:invalid\"/>')==='')()")
check('pagination waits for image decode', "(async()=>{els.pages.innerHTML='<p>Ready</p><img>';const img=els.pages.querySelector('img');let release;img.decode=()=>new Promise(r=>release=r);let calls=0;const old=paginateContainer;paginateContainer=()=>{calls++;old()};const pending=settleBookLayout(()=>true,0);const before=calls;release();await pending;paginateContainer=old;return before===0&&calls===1})()")
check('Markdown vendor ready offline shell', "typeof marked.parse==='function'")
upload('long.md', '# Long chapter\n\n' + '\n\n'.join(f'Paragraph {i}. ' + 'A readable sentence with words. ' * 12 for i in range(80)))
check('long book paginates', 'state.totalPagesInChapter>3')
check('font resize preserves the saved text fragment', "(()=>{goToPageInChapter(2,false);const offset=state.bookTextOffset;state.fontSize+=8;els.pages.style.fontSize=state.fontSize+'px';repaginateBook();return pageForBookTextOffset(offset)===state.pageInChapter && Number.isInteger(loadBookmark().textOffset)})()")
# state.fontSize is a persistent user preference, not reset by openBookFile()
# -- unlike this test's format="txt" and other scratch state, a +8px bump
# left here would silently carry into EVERY *_browser.py suite that runs
# after this one in the same CI job (they all share one Chrome tab), changing
# how much content fits per page for any test not expecting it.
c.js("state.fontSize-=8;els.pages.style.fontSize=state.fontSize+'px'")
check('resource settle restores character bookmark', "(async()=>{const offset=state.bookTextOffset;await renderDocChapter(0,false,0,offset);return pageForBookTextOffset(offset)===state.pageInChapter})()")
print('All format checks passed', flush=True)
