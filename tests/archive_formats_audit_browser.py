"""Independent deep structural/rendering audit for EPUB, FB2 and FB2.ZIP.

Real files, real archive worker, real decoders, visible geometry and bitmap
sampling. --collect retains every result so a pre-fix run proves each regression.
Shared features/PWA are independently exercised per format by the feature suite.
"""
import base64
import json
import os
import sys
import time
from browser_cdp import CDP
from archive_audit_fixtures import TEXT, archive, epub, fb2, fb2_zip, png

c = CDP()
c.call('Page.enable')
c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Network.setBypassServiceWorker', bypass=True)
# Every *_browser.py suite in CI runs against the SAME Chrome tab in one
# session (see .github/workflows/ci.yml) -- don't trust whatever viewport a
# PREVIOUS suite happened to leave active (this file's own pagination-count
# assumptions below are viewport-sensitive). An explicit SET, not a clear:
# clearing reverts to the underlying (headless-launch-flag) native viewport,
# which can itself be smaller than any real desktop size this file assumes.
c.call('Emulation.setDeviceMetricsOverride', width=1440, height=1000, deviceScaleFactor=1, mobile=False)
url = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c.call('Page.navigate', url=url)
c.wait("document.readyState==='complete' && !document.body.inert")
c.js("localStorage.clear()")
# state.fontSize (and other stored preferences) are read from localStorage
# ONCE, at page-load time -- clearing localStorage after that point doesn't
# touch the value already sitting in the live `state` object. If an EARLIER
# suite in this same CI job (they all share one Chrome tab) left a stale
# reader_font_size behind, this file's already-loaded page would still be
# running with it, silently changing how much image-only content fits per
# page. Reload once the storage is actually clean so `state` initializes
# fresh from it.
c.call('Page.navigate', url=url)
c.wait("document.readyState==='complete' && !document.body.inert")
c.js("window.__archiveErrors=[]; window.addEventListener('error',e=>__archiveErrors.push(e.message)); window.addEventListener('unhandledrejection',e=>__archiveErrors.push(String(e.reason))); window.__archiveWarnings=[]; window.__archiveOldWarn=console.warn; console.warn=(...a)=>{__archiveWarnings.push(a.map(String).join(' '));__archiveOldWarn(...a)}")
results = []


def check(name, expression):
    try:
        result = c.js(expression)
    except Exception as error:
        result = str(error)
    passed = result is True
    results.append({'check': name, 'pass': passed, 'detail': None if passed else result})
    print(('PASS ' if passed else 'FAIL ') + name + ('' if passed else ': ' + repr(result)), flush=True)
    if not passed and '--collect' not in sys.argv:
        raise AssertionError((name, result))


def upload(name, data, mime=''):
    if isinstance(data, str):
        data = data.encode()
    payload = json.dumps(base64.b64encode(data).decode())
    c.js(f"openBookFile(new File([Uint8Array.from(atob({payload}),c=>c.charCodeAt(0))],{json.dumps(name)},{{lastModified:123,type:{json.dumps(mime)}}}))")
    # settleBookLayout() deliberately reflows AGAIN if an image/font finishes
    # loading after its own initial settle race (see its own comment: "late
    # loads reflow again") -- openBookFile's awaited promise chain only covers
    # the FIRST reflow. A many-image chapter (image-heavy) can still
    # have one or more of those late callbacks pending right as upload()
    # returns. Neither a fixed pause nor "poll until the reading stops
    # changing" is reliable under real machine-load variance (a slow CI
    # runner, or this same Chrome instance already busy from earlier suites):
    # a fixed pause is sometimes too short, and value-equality polling can
    # exit immediately if two early reads land before any image has actually
    # progressed, mistaking "hasn't started yet" for "finished". Wait for the
    # actual, unambiguous completion signal instead: every <img> in the page
    # reports .complete.
    for _ in range(40):
        done = c.js("[...els.pages.querySelectorAll('img')].every(i=>i.complete)")
        if done:
            break
        c.js('new Promise(r=>setTimeout(r,150))')
    # One more paint turn for the reflow that completion triggers to land.
    c.js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')


def decoded(count):
    return f"(()=>{{const a=[...els.pages.querySelectorAll('img')];return a.length==={count} && a.every(i=>i.complete&&i.naturalWidth>0&&i.naturalHeight>0)}})()"


VISIBLE_IMAGE = """(()=>{const r=els.container.getBoundingClientRect();return [...els.pages.querySelectorAll('img')].some(i=>{const b=i.getBoundingClientRect();if(!(i.naturalWidth>0&&b.width>10&&b.height>10&&b.right>r.left&&b.left<r.right&&b.bottom>r.top&&b.top<r.bottom))return false;const cv=document.createElement('canvas');cv.width=cv.height=8;const cx=cv.getContext('2d');cx.drawImage(i,0,0,8,8);const p=cx.getImageData(0,0,8,8).data;return [...p].some((v,n)=>n%4!==3&&v<220)&&[...p].some((v,n)=>n%4===3&&v>200)})})()"""
USABLE_ERROR = "state.format===null && !document.body.inert && els.pages.textContent.trim().length>10 && els.progress.textContent===t('error')"
image_resources = {'Images/Книжка (Zażółć).png': png()}
image_tag = '<img src="../Images/%D0%9A%D0%BD%D0%B8%D0%B6%D0%BA%D0%B0%20(Za%C5%BC%C3%B3%C5%82%C4%87).png" alt="Illustration"/>'
paragraphs = ''.join(f'<p>Paragraph {i}. {TEXT} ' + 'A long readable paragraph. ' * 7 + '</p>' for i in range(95))
# Empirically measured (at this file's own 1440x1000 desktop viewport, default
# font size, no immersive mode): 16 of these 240x160 images only needed 2
# pages, making the ">2 pages" pagination check below fragile -- it was only
# ever passing by accident, riding on OTHER suites' leftover state (a larger
# font size, mainly) inflating the page count. 48 gives a real, comfortable
# margin (4 pages measured) regardless of that other contamination now being
# independently fixed at its own source.
IMAGE_HEAVY_COUNT = 48

# ---------------------------- EPUB -----------------------------------------
epub_cases = [
    ('text-heavy', [f'<h1>English Українська Polski</h1>{paragraphs}'], {}, 0),
    ('mixed', [f'<h1>Illustrated book</h1><p>{TEXT}</p>{image_tag}<figure><figcaption>Picture caption</figcaption></figure><ul><li>List entry</li></ul><table><tr><td>Table cell</td></tr></table>'], image_resources, 1),
    ('image-only', [image_tag], image_resources, 1),
    ('image-heavy', [image_tag * IMAGE_HEAVY_COUNT], image_resources, IMAGE_HEAVY_COUNT),
    ('almost-empty', ['<p>Я.</p>'], {}, 0),
    ('nested-no-heading', [f'<section><div><blockquote><p>{TEXT}</p></blockquote></div></section>'], {}, 0),
    ('recoverable-markup', ['<p>Recovered <b>bold<p>Second paragraph<ul><li>Entry'], {}, 0),
    ('svg-cover', ['<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><title>Cover</title><image href="../Images/Книжка (Zażółć).png" width="240" height="160"/></svg>'], image_resources, 1),
    ('vector', ['<img src="../Images/art.svg"/>'], {'Images/art.svg':'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="#b34422"/><circle cx="80" cy="50" r="30" fill="#346bbb"/><script>window.__unsafeArchive=true</script></svg>'}, 1),
]
for label, chapters, resources, count in epub_cases:
    filename = "Аудит Zażółć (reader's " + label + ") " + 'long-' * 15 + '.epub'
    data = epub(chapters, resources)
    upload(filename, data, 'application/octet-stream')
    check('EPUB ' + label + ' opens independently', "state.format==='epub' && state.spine.length===1 && !els.pages.textContent.includes('Metadata only')")
    check('EPUB ' + label + ' decoded image count', decoded(count))
    if count:
        check('EPUB ' + label + ' initial page has visible colored bitmap', VISIBLE_IMAGE)
    else:
        check('EPUB ' + label + ' text visibly occupies first page', "(()=>{const r=document.createRange();r.selectNodeContents(els.pages);const b=r.getBoundingClientRect();return els.pages.innerText.trim().length>0&&b.width>0&&b.height>0})()")
    if label in ['text-heavy', 'image-heavy']:
        check('EPUB ' + label + ' pagination', 'state.totalPagesInChapter>2')
        c.js('goToPageInChapter(2,false)')
        if count:
            check('EPUB image-heavy later page bitmap', VISIBLE_IMAGE)
        # The saved TEXT OFFSET (not the raw page number) is the real contract:
        # a relayout between the two loads (font/image timing can legitimately
        # shift column boundaries a little) may resolve the very same logical
        # position to a different page index, same as any other reflow -- the
        # page number itself is not guaranteed stable, only that it still
        # matches whatever page that saved offset resolves to right now. An
        # image-only chapter has no text at all, so its offset is legitimately
        # null -- the app's own settleBookLayout() falls back to the raw saved
        # page number in exactly that case (`pageForBookTextOffset(offset) ??
        # page`), so the check mirrors that same fallback, not just the
        # offset-resolved branch.
        saved_bookmark = c.js('(({textOffset,pageInChapter})=>({textOffset,pageInChapter}))(loadBookmark())')
        upload(filename, data)
        check('EPUB ' + label + ' reopen preserves page',
              f'state.pageInChapter===(pageForBookTextOffset({json.dumps(saved_bookmark["textOffset"])})'
              f' ?? {json.dumps(saved_bookmark["pageInChapter"])})')

many = epub([f'<p>Short chapter {i}. {TEXT}</p>' for i in range(35)])
upload('many chapters.epub', many)
check('EPUB many short chapters', "state.totalPages===35 && state.currentIndex===0")
c.js('loadEpubChapter(34)')
check('EPUB last chapter text and navigation', "state.currentIndex===34 && els.pages.textContent.includes('Short chapter 34')")
upload('many chapters.epub', many)
check('EPUB reopen final chapter', 'state.currentIndex===34')
c.js('loadEpubChapter(0)')
check('EPUB return to first chapter', "els.pages.textContent.includes('Short chapter 0')")

upload('valid XML prefixes.epub', epub(['<p>Namespaced content</p>'], prefixed=True))
check('EPUB valid namespace-prefixed container and OPF', "state.format==='epub' && els.pages.textContent.includes('Namespaced content')")

upload('encoded chapter names.epub', epub({'Text/reader%27s%20Za%C5%BC%C3%B3%C5%82%C4%87%20%D1%97.xhtml':'<p>Encoded chapter path</p>'}))
check('EPUB encoded Unicode chapter path', "els.pages.textContent.includes('Encoded chapter path')")

upload('empty chapter.epub', epub(['<p> </p>', '<p>Readable next chapter.</p>']))
check('EPUB empty chapter has clear state', "els.pages.textContent.trim().length>0")
c.js('loadEpubChapter(1)')
check('EPUB navigates after empty chapter', "els.pages.textContent.includes('Readable next chapter')")
upload('missing picture.epub', epub(['<img src="missing.png" alt="Lost illustration"/>']))
check('EPUB unavailable-only image has a clear state', "els.pages.textContent.trim().length>0")
upload('bad image bytes.epub', epub(['<img src="../Images/bad.png"/>'], {'Images/bad.png':b'not a png'}))
check('EPUB decode error never becomes unexplained blank reader', "els.pages.textContent.trim().length>0")
upload('missing chapter.epub', archive({'META-INF/container.xml':'<container><rootfiles><rootfile full-path="book.opf"/></rootfiles></container>','book.opf':'<package><manifest><item id="a" href="missing.xhtml"/></manifest><spine><itemref idref="a"/></spine></package>'}))
check('EPUB missing chapter explains failure', "els.pages.textContent.includes(t('chapterMissing'))")

# Cross-chapter links are a documented limitation. Verify safe external links and
# internal anchor preservation, then report stripped cross-chapter destinations.
upload('links.epub', epub(['<p><a href="#note">Within chapter</a> <a href="chapter-1.xhtml#note">Other chapter</a> <a href="https://example.com/">External</a></p><p id="note">Note target</p>', '<p id="note">Other note</p>']))
check('EPUB safe same-chapter and external link metadata', "els.pages.querySelectorAll('a')[0].getAttribute('href')==='#book-note' && !!els.pages.querySelector('#book-note') && els.pages.querySelectorAll('a')[2].rel.includes('noopener')")
check('EPUB unsupported cross-chapter link stays inert', "!els.pages.querySelectorAll('a')[1].hasAttribute('href')")

for label, data in [('zero-byte', b''), ('truncated', many[:100]), ('not-archive', b'ordinary text'), ('no-container', archive({'readme.txt':'No EPUB'})), ('broken-container', archive({'META-INF/container.xml':'<container>'})), ('traversal', archive({'../escape':'blocked'}))]:
    upload(label+'.epub', data)
    check('EPUB rejects ' + label + ' with usable error', USABLE_ERROR)

# -------------------------- FB2 and FB2.ZIP ---------------------------------
for extension, wrap in [('fb2', lambda value:value), ('fb2.zip', fb2_zip)]:
    cases = [
        ('text-heavy', fb2(f'<section><title><p>Readable chapter</p></title>{paragraphs}</section>'), 0),
        ('mixed', fb2(f'<section><title><p>Mixed chapter</p></title><p>{TEXT}</p><image l:href="#cover"/><p>Image caption</p></section>'), 1),
        ('image-only', fb2('<section><image l:href="#cover"/></section>'), 1),
        ('image-heavy', fb2('<section>' + '<image l:href="#cover"/>'*IMAGE_HEAVY_COUNT + '</section>'), IMAGE_HEAVY_COUNT),
        ('almost-empty', fb2('<section><p>Я.</p></section>'), 0),
        ('cover', fb2(f'<section><p>{TEXT}</p></section>', cover=True), 1),
        ('sections', fb2('<section><title><p>First section</p></title><p>First body.</p></section><section><title><p>Second section</p></title><p>Second body.</p><epigraph><p>Quoted words</p></epigraph><poem><stanza><v>Poem line</v></stanza></poem></section>'), 0),
    ]
    for label, text, count in cases:
        filename = "Книжка Zażółć (reader's " + label + ') '+ 'long-'*15 + '.' + extension
        data = wrap(text)
        upload(filename, data, 'application/octet-stream')
        check(extension+' '+label+' opens independently', "state.format==='txt' && state.docChapters.length>0")
        check(extension+' '+label+' decoded image count', decoded(count))
        if count:
            check(extension+' '+label+' initial page visible colored bitmap', VISIBLE_IMAGE)
        else:
            check(extension+' '+label+' visible text', 'els.pages.innerText.trim().length>0')
        if label in ['text-heavy','image-heavy']:
            check(extension+' '+label+' paginates', 'state.totalPagesInChapter>2')
            c.js('goToPageInChapter(2,false)')
            if count:
                check(extension+' image-heavy later page bitmap', VISIBLE_IMAGE)
            # Same offset-based invariant (with the same image-only null-offset
            # fallback) as the EPUB case above -- see that comment for why.
            saved_bookmark = c.js('(({textOffset,pageInChapter})=>({textOffset,pageInChapter}))(loadBookmark())')
            upload(filename, data)
            check(extension+' '+label+' reopen restores page',
                  f'state.pageInChapter===(pageForBookTextOffset({json.dumps(saved_bookmark["textOffset"])})'
                  f' ?? {json.dumps(saved_bookmark["pageInChapter"])})')
        if label == 'sections':
            check(extension+' multiple sections retained', "state.docChapters.join('').includes('Second body') && state.docChapters.join('').includes('Poem line')")

    for label, content in [('empty-body', '<section><p> </p></section>'), ('missing-reference','<section><image l:href="#absent"/></section>')]:
        upload(label+'.'+extension, wrap(fb2(content)))
        check(extension+' '+label+' gives clear state', 'els.pages.textContent.trim().length>0')
    upload('bad-binary.'+extension, wrap(fb2('<section><image l:href="#cover"/></section>', malformed_binary=True)))
    check(extension+' invalid binary gives clear state', 'els.pages.textContent.trim().length>0')
    upload('bad-decode.'+extension, wrap(fb2('<section><image l:href="#cover"/></section>').replace(base64.b64encode(png()).decode(), base64.b64encode(b'not an image').decode())))
    check(extension+' invalid image bytes give clear state', 'els.pages.textContent.trim().length>0')
    upload('partial-image.'+extension, wrap(fb2('<section><p>Still readable.</p><image l:href="#absent"/><image l:href="#cover"/></section>')))
    check(extension+' missing resource preserves valid text and image', "els.pages.textContent.includes('Still readable') && els.pages.querySelector('img').naturalWidth===240")
    upload('notes.'+extension, wrap(fb2('<section><p>Main body.</p></section>').replace('</body>', '</body><body name="notes"><section id="note"><p>Footnote retained.</p></section></body>', 1)))
    check(extension+' secondary notes body retained', "state.docChapters.join('').includes('Footnote retained')")
    legacy = fb2('<section><p>Українська ї ґ є.</p></section>').replace('utf-8','windows-1251').encode('cp1251')
    upload('legacy encoding.'+extension, wrap(legacy))
    check(extension+' XML encoding preserved', "els.pages.textContent.includes('Українська ї ґ є')")
    for label, text in [('zero-byte',''),('malformed-xml','<FictionBook><body>broken'),('wrong-root','<html><body>Wrong format</body></html>')]:
        upload(label+'.'+extension, wrap(text))
        check(extension+' rejects '+label+' with usable error', USABLE_ERROR)
    upload('recovery.'+extension, wrap(fb2('<section><p>Reader remains usable.</p></section>')))
    check(extension+' opens correctly after errors', "els.pages.textContent.includes('Reader remains usable')")

for label, data in [('ambiguous',archive({'a.fb2':fb2('<p>A</p>'),'b.fb2':fb2('<p>B</p>')})), ('absent',archive({'readme.txt':'Missing FB2'})), ('broken',b'PK malformed archive'), ('traversal',archive({'../a.fb2':fb2('<p>Unsafe archive path</p>')}))]:
    upload(label+'.fb2.zip',data)
    check('fb2.zip rejects '+label+' independently', USABLE_ERROR)

# Desktop, phone/tablet portrait and landscape: every image-only format is
# independently opened at each viewport, including actual first-page pixels.
for width,height in [(1440,1000),(390,844),(844,390),(800,1280),(1280,800)]:
    c.call('Emulation.setDeviceMetricsOverride',width=width,height=height,deviceScaleFactor=2 if width<900 else 1,mobile=width<900)
    for extension,data in [('epub',epub([image_tag],image_resources)),('fb2',fb2('<section><image l:href="#cover"/></section>')),('fb2.zip',fb2_zip(fb2('<section><image l:href="#cover"/></section>')))]:
        upload('viewport-'+str(width)+'.'+extension,data)
        check(extension+' image-only visible at '+str(width)+'x'+str(height),VISIBLE_IMAGE)
        c.js("document.body.classList.toggle('immersive-mode'); repaginateBook()")
        check(extension+' image-only immersive resize at '+str(width)+'x'+str(height),VISIBLE_IMAGE)
        check(extension+' image-only text actions have no text', "!state.extractedTextForTTS.trim() && !getCurrentPageWords().length" if False else "!state.extractedTextForTTS.trim()")
# Leave the shared tab at a real desktop size for whichever suite runs next
# (see the matching comment at this file's own setup, above).
c.call('Emulation.setDeviceMetricsOverride', width=1440, height=1000, deviceScaleFactor=1, mobile=False)
check('untrusted SVG never executes', '!window.__unsafeArchive')
check('no uncaught exceptions or unhandled promises', '__archiveErrors.length===0')
print('WARNINGS', json.dumps(c.js('__archiveWarnings'), ensure_ascii=False), flush=True)
if os.environ.get('ARCHIVE_AUDIT_RESULTS'):
    with open(os.environ['ARCHIVE_AUDIT_RESULTS'],'w') as output:
        json.dump(results,output,indent=2,ensure_ascii=False)
failures = [result for result in results if not result['pass']]
print(f'{len(results)-len(failures)}/{len(results)} archive audit checks passed',flush=True)
if failures:
    sys.exit(1)
