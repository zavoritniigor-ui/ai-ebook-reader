"""Independent DOCX/TXT/HTML/HTM/MD/MARKDOWN/RTF corpus and rendering audit.

Only stdlib at runtime; DOCX fixtures were produced by python-docx (see generator).
Each extension is uploaded independently through openBookFile, including aliases.
Feature/device/PWA coverage is in the separate all-format feature suite.
"""
import base64
import json
import os
from pathlib import Path

from browser_cdp import CDP

FIXTURES = Path(__file__).parent / 'fixtures' / 'text-audit'
TEXT = 'Hello reader. The little bird sings clearly. Привіт, світе! Zażółć gęślą jaźń. Café café 👩🏽‍💻 — it’s readable.'
PNG = base64.b64encode((FIXTURES / 'pattern.png').read_bytes()).decode()
JPEG = base64.b64encode((FIXTURES / 'pattern.jpg').read_bytes()).decode()
IMAGES = ''.join(f'<img src="data:image/{kind};base64,{data}" alt="Pattern {n}">' for n, (kind, data) in enumerate([('png', PNG), ('jpeg', JPEG)] * 2))
NAMES = ["Book with spaces", "Українська книга", "Zażółć gęślą jaźń", "Book (edition 2)", "Reader's book", 'A very long filename ' * 9]


def rtf_text(text):
    result = []
    for ch in text:
        if ch in '{}\\':
            result.append('\\' + ch)
        elif ch == '\n':
            result.append('\\par ')
        elif ord(ch) < 128:
            result.append(ch)
        else:
            encoded = ch.encode('utf-16-le')
            for n in range(0, len(encoded), 2):
                value = int.from_bytes(encoded[n:n + 2], 'little', signed=True)
                result.append(f'\\u{value}?')
    return ''.join(result)


def corpus():
    for variant in ('text', 'mixed', 'images', 'almost-empty', 'long'):
        yield 'docx', variant, (FIXTURES / (variant + '.docx')).read_bytes()
    for ext in ('html', 'htm'):
        structure = '<h1>Audit chapter one</h1><p>' + TEXT + '</p><ul><li>Bullet one<ul><li>Nested</li></ul></li></ul><ol><li>Number one</li></ol><table><caption>Table caption</caption><tr><th>Language</th><td>Polski</td></tr></table><p style="color: #134567; font-weight: bold">Styled text <a href="https://example.com/">Safe link</a>.</p>'
        for variant, body in [('text', structure * 4), ('mixed', structure + IMAGES + '<figcaption>Illustration caption</figcaption>'), ('images', IMAGES), ('almost-empty', '<p>A</p>'), ('long', '<h1>Long chapter</h1>' + ''.join('<p>' + TEXT * 5 + '</p>' for _ in range(220))), ('messy', '<h1>Messy heading<p>' + TEXT + '<ul><li>Open list')]:
            yield ext, variant, '<!DOCTYPE html><html><head><title>Hidden title</title><meta charset="UTF-8"></head><body>\n' + body + '</body></html>'
    for ext in ('md', 'markdown'):
        structure = '# Audit chapter one\n\n' + TEXT + '\n\n- Bullet one\n  - Nested\n\n1. Number one\n\n> A blockquote.\n\n```js\nconst answer = 42;\n```\n\n| Language | Text |\n|---|---|\n| Polski | Zażółć |\n\n[Safe link](https://example.com/)\n'
        imgs = '\n\n'.join(f'![Pattern {n}](data:image/{kind};base64,{data})' for n, (kind, data) in enumerate([('png', PNG), ('jpeg', JPEG)] * 2))
        for variant, data in [('text', structure * 4), ('mixed', structure + '\n' + imgs), ('images', imgs), ('almost-empty', 'A'), ('long', '# Long chapter\n\n' + '\n\n'.join(TEXT * 5 for _ in range(220)))]:
            yield ext, variant, data
    for variant, data in [('text', (TEXT + '\n') * 30), ('bom', '\ufeff' + TEXT), ('crlf', (TEXT + '\r\n') * 60), ('lf', (TEXT + '\n') * 60), ('almost-empty', 'A'), ('long', (TEXT + '\n') * 800), ('long-line', TEXT * 250)]:
        yield 'txt', variant, data
    for variant, text in [('text', (TEXT + '\n') * 30), ('formatted', '\\b Bold\\b0  and \\i italic\\i0.\\par ' + rtf_text(TEXT)), ('almost-empty', 'A'), ('long', (TEXT + '\n') * 400)]:
        yield 'rtf', variant, '{\\rtf1\\ansi\\uc1 ' + (text if variant == 'formatted' else rtf_text(text)) + '}'


def main():
    c = CDP()
    c.call('Network.enable')
    c.call('Network.setCacheDisabled', cacheDisabled=True)
    c.call('Network.setBypassServiceWorker', bypass=True)
    c.call('Page.enable')
    c.call('Page.addScriptToEvaluateOnNewDocument', source="window.__auditErrors=[];addEventListener('error',e=>{if(e.error)__auditErrors.push(e.message)});addEventListener('unhandledrejection',e=>__auditErrors.push(String(e.reason)));")
    # Every *_browser.py suite in CI runs against the SAME Chrome tab in one
    # session -- don't trust whatever viewport a previous suite left active.
    # An explicit SET, not a clear: clearing reverts to the underlying
    # (headless-launch-flag) native viewport, which can itself be smaller
    # than any real desktop size this file assumes.
    c.call('Emulation.setDeviceMetricsOverride', width=1280, height=900, deviceScaleFactor=1, mobile=False)
    c.call('Page.navigate', url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html'))
    c.wait("document.readyState==='complete' && !document.body.inert")
    c.js("localStorage.clear();document.body.classList.add('immersive-mode');stopOnboarding()")
    failures = []
    count = 0

    def check(name, expression):
        nonlocal count
        count += 1
        try:
            result = c.js(expression)
        except Exception as error:
            result = str(error)
        if result is not True:
            failures.append((name, result))
        print('PASS' if result is True else 'FAIL', name, '' if result is True else repr(result), flush=True)

    def upload(name, data, mime=''):
        if isinstance(data, str):
            data = data.encode()
        encoded = json.dumps(base64.b64encode(data).decode())
        c.js(f"openBookFile(new File([Uint8Array.from(atob({encoded}),c=>c.charCodeAt(0))],{json.dumps(name)},{{lastModified:128,type:{json.dumps(mime)}}}))")

    visible = """(()=>{const box=els.container.getBoundingClientRect();const rects=[];const walker=document.createTreeWalker(els.pages,NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode()){if(!n.textContent.trim())continue;const r=document.createRange();r.selectNodeContents(n);rects.push(...r.getClientRects())}for(const i of els.pages.querySelectorAll('img'))if(i.naturalWidth)rects.push(i.getBoundingClientRect());return rects.some(r=>r.width>0&&r.height>0&&r.right>box.left&&r.left<box.right&&r.bottom>box.top&&r.top<box.bottom)})()"""
    for i, (ext, variant, data) in enumerate(corpus()):
        label = f'{ext}/{variant}'
        upload(NAMES[i % len(NAMES)] + '-' + variant + '.' + ext, data)
        check(label + ' opens', "state.format==='txt' && !document.body.inert")
        check(label + ' content intersects visible reader', visible)
        if variant in ('images', 'mixed'):
            check(label + ' all four PNG/JPEG images decoded', "[...els.pages.querySelectorAll('img')].filter(i=>i.complete&&i.naturalWidth===320&&i.naturalHeight===220).length===4")
            check(label + ' image pixels contain colors', "(()=>{const i=els.pages.querySelector('img');if(!i)return false;const a=document.createElement('canvas');a.width=a.height=16;const x=a.getContext('2d');x.drawImage(i,0,0,16,16);const p=x.getImageData(0,0,16,16).data;return p.some((v,n)=>n%4!==3&&v<100)&&new Set(p).size>10})()")
        if variant in ('text', 'mixed', 'bom', 'crlf', 'lf', 'long-line'):
            check(label + ' English/Ukrainian/Polish/Unicode readable', "['Hello reader','Привіт, світе','Zażółć gęślą jaźń','café','👩🏽‍💻'].every(t=>els.pages.textContent.includes(t))")
        if variant == 'mixed':
            check(label + ' headings, lists and tables preserved', "!!els.pages.querySelector('h1')&&!!els.pages.querySelector('ul li')&&!!els.pages.querySelector('ol li')&&!!els.pages.querySelector('table td')")
        if variant == 'long':
            check(label + ' long corpus has multiple navigation units', 'state.totalPages>1 || state.totalPagesInChapter>1')
            c.js('goNext()')
            check(label + ' next navigation advances', 'state.currentIndex>0 || state.pageInChapter>0')

    # Deterministic regression guards: all failed against the pre-audit parser.
    for ext in ('html', 'htm', 'md', 'markdown'):
        for label, data in [('empty-elements', '<p></p><div> </div>'), ('sanitized-empty', '<script>window.__unsafeAudit=1</script>')]:
            upload('regression-' + label + '.' + ext, data)
            check(ext + '/' + label + ' clear empty error', "state.format===null&&els.pages.textContent.trim().length>10&&!window.__unsafeAudit")
        upload('blank-preamble.' + ext, '\n<div> </div><p><br></p><h1>Real chapter</h1><p>Visible body.</p>')
        check(ext + '/blank-preamble opens visible chapter', "els.pages.textContent.includes('Visible body.')&&state.totalPages===1")
        upload('unsafe.' + ext, '<h1>Safe content</h1><p onclick="window.__unsafeAudit=1" style="position:fixed;color:#134567">Visible safe text</p><script>window.__unsafeAudit=1</script><img src="data:image/png;base64,' + PNG + '" onload="window.__unsafeAudit=1"><a href="javascript:alert(1)">Unsafe URL</a>')
        check(ext + ' sanitizer preserves visible content and removes active markup', "els.pages.textContent.includes('Visible safe text')&&!els.pages.querySelector('script,[onclick],[onload],a[href^=\"javascript:\"]')&&!window.__unsafeAudit&&els.pages.querySelector('p').style.color==='rgb(19, 69, 103)'&&els.pages.querySelector('p').style.position===''")
        upload('broken-image.' + ext, '<img src="data:image/png;base64,AAAA">')
        check(ext + '/image decode error is understandable', "els.pages.textContent.trim().length>0 || [...els.pages.querySelectorAll('img')].some(i=>i.alt.trim().length>0)")

    rtf_cases = [
        ('escaped symbols', r'{\rtf1\ansi Text \{literal\} and \\ slash.}', 'Text {literal} and \\ slash.'),
        ('CP1250 Polish', r"{\rtf1\ansi\ansicpg1250 Za\'bf\'f3\'b3\'e6 g\'ea\'9cl\'b9 ja\'9f\'f1.}", 'Zażółć gęślą jaźń.'),
        ('CP1251 Ukrainian', '{\\rtf1\\ansi\\ansicpg1251 ' + ''.join("\\'%02x" % b for b in 'Привіт'.encode('cp1251')) + '}', 'Привіт'),
        ('Unicode fallback two', r'{\rtf1\ansi\uc2 \u1040??B}', 'АB'),
        ('Unicode fallback zero', r'{\rtf1\ansi\uc0 \u1040B}', 'АB'),
        ('nested skipped destinations', r'{\rtf1\ansi Before {\*\unknown abc {\b secret}} after.}', 'Before  after.'),
        ('picture bytes do not become prose', r'{\rtf1\ansi Before {\pict\pngblip 89504e470d0a1a0a} after.}', 'Before  after.'),
        ('paragraph defaults preserve sentence', r'{\rtf1\ansi Before\pard  after.\par Next.}', 'Before after.Next.'),
    ]
    for label, data, expected in rtf_cases:
        upload('regression.rtf', data)
        check('rtf/' + label, 'els.pages.textContent===' + json.dumps(expected))

    for ext in ('txt', 'rtf', 'html', 'htm', 'md', 'markdown', 'docx'):
        upload('zero.' + ext, b'')
        check(ext + '/zero bytes clear error', 'state.format===null&&els.pages.textContent.trim().length>10&&!document.body.inert')
        upload('mime-mismatch.' + ext, (FIXTURES / 'text.docx').read_bytes() if ext == 'docx' else ('{\\rtf1 Hello reader.}' if ext == 'rtf' else 'Hello reader.'), 'application/pdf')
        check(ext + '/MIME mismatch extension policy', "state.format==='txt'&&els.pages.textContent.includes('Hello reader')")
    upload('wrong.rtf', 'This is not an RTF document.')
    check('rtf/wrong signature clear error', 'state.format===null&&els.pages.textContent.trim().length>10')
    upload('picture-only.rtf', r'{\rtf1\ansi {\pict\pngblip 89504e470d0a1a0a}}')
    check('rtf/unsupported picture-only clear error', 'state.format===null&&els.pages.textContent.trim().length>10')
    upload('empty.docx', (FIXTURES / 'empty.docx').read_bytes())
    check('docx/real empty Word document clear error', 'state.format===null&&els.pages.textContent.trim().length>10')
    upload('corrupt.docx', (FIXTURES / 'mixed.docx').read_bytes()[:120])
    check('docx/truncated ZIP clear error', 'state.format===null&&els.pages.textContent.trim().length>10')
    upload('recover.txt', TEXT)
    check('reader remains usable after failures', "state.format==='txt'&&els.pages.textContent.includes('Hello reader')&&!document.body.inert")
    check('no uncaught errors or unhandled rejections', 'window.__auditErrors.length===0')
    print(json.dumps({'checks': count, 'failures': failures}, ensure_ascii=False), flush=True)
    assert not failures, f'{len(failures)} text format audit failures'


if __name__ == '__main__':
    main()
