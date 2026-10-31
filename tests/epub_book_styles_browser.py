"""Italics, bold and centring that an EPUB sets through its own CSS classes reach the page (js/formats.js, applyEpubBookStyles).

Owner (2026-10-30): «Чи епуб відображається правильно». A real Bibliothèque numérique romande book marks every italic word as
<span class="T6"> with `span.T6 { font-style: italic }` in its stylesheet, and its dedications as <p class="Centre">. The
page never gets the book's CSS (safeHtml drops classes, <style> and <link>), so all of that was shown as plain text.

Checks: italic / bold / centre / right from a linked stylesheet and from a <style> element; a centred wrapper centres its
paragraphs (the app justifies every <p>); an element's own style beats the stylesheet; the book's font size, colour and
margins are NOT taken (A+/A− and the theme stay in charge); no class, <style> or <link> reaches the page.
2026-10-31 («працюй далі», broader publisher CSS): the paragraph indent (text-indent, positive only, capped at 3em),
small caps (font-variant / font-variant-caps) and text-transform are taken too.
"""
import base64, io, json, os, time, zipfile
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=412, height=915, deviceScaleFactor=2, mobile=True)
READY = "document.readyState==='complete' && !document.body.inert && typeof openBookFile==='function'"


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


CSS = """span.T6 { font-style: italic; font-size: 3em; color: #ff0000 }
span.T3 { font-weight: bold }
p.Centre { text-align: center; margin-left: 9em; font-family: Papyrus }
div.droite { text-align: right }
p.Standard { text-align: justify; text-indent: 1em }
.droit { font-style: normal }
.sc { font-variant: small-caps } .caps { font-variant-caps: all-small-caps }
h2.titre { text-transform: uppercase }
p.big { text-indent: 20em } p.hang { text-indent: -2em } p.px { text-indent: 24px } p.weird { text-indent: calc(1em + 5vw) }
@media print { span.T6 { font-style: normal } }"""
CHAPTER = """<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>x</title>
<link href="../Styles/style.css" rel="stylesheet" type="text/css"/>
<style>.gras { font-weight: 700 } .souligne { text-decoration: underline }</style></head>
<body>
<p class="Centre" id="dedi">À mon ami le lecteur.</p>
<p class="Standard" id="para">Je connais leurs <span class="T6" id="ital">frimousses</span> et leurs <span class="T3" id="bold">ruses</span>, dit-il <span class="gras" id="gras">enfin</span>.</p>
<p class="Standard">Un mot <span class="T6 droit" id="both">mixte</span> et un <span class="T6" style="font-style: normal" id="own">propre</span> style.</p>
<h2 class="titre" id="titre">Chapitre premier</h2>
<p class="Standard"><span class="sc" id="sc">Valère</span>, <span class="caps" id="caps">Harpagon</span>.</p>
<p class="big" id="big">Grand.</p><p class="hang" id="hang">Pendu.</p><p class="px" id="px">Pixels.</p><p class="weird" id="weird">Bizarre.</p>
<div class="droite" id="wrap"><p class="Standard" id="sign">Honoré de Balzac.</p></div>
</body></html>"""


def epub():
    o = io.BytesIO()
    with zipfile.ZipFile(o, 'w') as z:
        z.writestr('mimetype', 'application/epub+zip')
        z.writestr('META-INF/container.xml', '<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>')
        z.writestr('OEBPS/content.opf', '<package><metadata><dc:language xmlns:dc="http://purl.org/dc/elements/1.1/">fr</dc:language></metadata>'
                   '<manifest><item id="a" href="Text/a.xhtml"/><item id="s" href="Styles/style.css"/></manifest><spine><itemref idref="a"/></spine></package>')
        z.writestr('OEBPS/Styles/style.css', CSS)
        z.writestr('OEBPS/Text/a.xhtml', CHAPTER)
    return o.getvalue()


c.call('Page.navigate', url=URL); c.wait(READY, timeout=30)
c.js("localStorage.clear(); localStorage.setItem('reader_onboarding_done','1'); 1"); c.call('Page.reload'); c.wait(READY, timeout=30)
c.js("showUpdateBanner=()=>{}; callAI = async () => { throw new Error('offline'); }; window.__cspErr = []; document.addEventListener('securitypolicyviolation', e => __cspErr.push(e.violatedDirective)); 1")
c.js("window.__ok=0; openBookFile(new File([Uint8Array.from(atob(%s), ch => ch.charCodeAt(0))], 'styles.epub', {type:'application/epub+zip', lastModified: 9})).then(() => { window.__ok=1; }, e => { window.__ok=String(e); }); 1"
     % json.dumps(base64.b64encode(epub()).decode()))
c.wait("window.__ok !== 0", timeout=30); time.sleep(1)
assert c.js("window.__ok") == 1, c.js("window.__ok")
cs = "(id => getComputedStyle(document.getElementById('book-' + id)))"

check('1 italic from a class in the linked stylesheet (span.T6)', f"{cs}('ital').fontStyle === 'italic'")
check('2 bold from the stylesheet and from a <style> element (font-weight 700)', f"+{cs}('bold').fontWeight >= 600 && +{cs}('gras').fontWeight >= 600")
check('3 a centred paragraph (p.Centre) is centred', f"{cs}('dedi').textAlign === 'center'")
check('4 a right-aligned wrapper puts its justified paragraph on the right', f"{cs}('sign').textAlign === 'right'")
check('5 justified paragraphs stay as the app sets them', f"{cs}('para').textAlign === 'justify'")
check('6 a later rule wins (.droit after .T6) and the element\'s own style beats the stylesheet',
      f"{cs}('both').fontStyle === 'normal' && {cs}('own').fontStyle === 'normal'")
check('7 the book\'s font size, colour, font and margins are not taken; a print-only rule is ignored',
      f"""(() => {{ const i = document.getElementById('book-ital'), p = document.getElementById('book-para'), d = document.getElementById('book-dedi');
          return getComputedStyle(i).fontSize === getComputedStyle(p).fontSize && getComputedStyle(i).color === getComputedStyle(p).color
              && getComputedStyle(d).fontFamily === getComputedStyle(p).fontFamily && getComputedStyle(d).marginLeft === getComputedStyle(p).marginLeft
              && !i.getAttribute('style').includes('size') && {cs}('ital').fontStyle === 'italic'; }})()""")
check('8 no class, <style>, <link> or data- attribute of the book reaches the page, and nothing broke the CSP',
      "!els.pages.querySelector('[class*=\"T6\"], .Centre, style, link') && ![...els.pages.querySelectorAll('*')].some(e => [...e.attributes].some(a => a.name.startsWith('data-book'))) && !__cspErr.length")
check('9 the paragraph indent of the book (p.Standard 1em) reaches the page',
      f"document.getElementById('book-para').style.textIndent === '1em' && parseFloat({cs}('para').textIndent) > 0")
check('10 small caps from font-variant and from font-variant-caps', f"{cs}('sc').fontVariantCaps === 'small-caps' && {cs}('caps').fontVariantCaps === 'small-caps'")
check('11 text-transform: uppercase on a heading', f"{cs}('titre').textTransform === 'uppercase'")
check('12 a huge indent is capped at 3em, px becomes em, a negative or calc() indent is not taken',
      "['big','hang','px','weird'].map(id => document.getElementById('book-' + id).style.textIndent).join() === '3em,,1.5em,'")
print('ALL EPUB BOOK STYLE CHECKS PASSED')
