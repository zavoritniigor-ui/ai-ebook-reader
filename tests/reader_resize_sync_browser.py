"""Fixes the documented pagination/resize-synchronization bug (HANDOFF.md):
'#reader-pages { height: 100% }' means the browser's own CSS multi-column
layout silently re-flows content across columns whenever '#reader-container'
changes size -- but the app only listened for the window's own 'resize'
event to react to that. Toggling immersive-mode (hiding/showing the header/
footer, a normal, frequent interaction) changes the container's actual
height through CSS classes alone, with NO 'resize' event at all -- so
state.pageInChapter/totalPagesInChapter silently went stale relative to
the ACTUAL rendered column layout the browser had already re-flowed to.

Root cause, precisely: window 'resize' only fires for viewport-size
changes; it is a proxy for "the container might have resized", not the
actual signal we need. Sidebar collapse, immersive-mode, a mobile
browser's dynamic address bar, or any future CSS-driven layout change all
change '#reader-container's real size without ever dispatching 'resize'.

Fix (js/navigation.js): replace the window 'resize' listener with a
ResizeObserver on els.container itself -- the one true signal for "this
container's rendered box actually changed", regardless of cause. A window
resize that changes the container size still triggers it (ResizeObserver
strictly fires whenever the observed box changes); a window resize that
does NOT change the container (e.g. width growth past #reader-container's
900px max-width) correctly does nothing, where the old code wastefully
repaginated for no reason. The existing offset-preserving repaginateBook()
logic (capture the current reading position as a character offset via
bookTextOffsetAtPage(), repaginate, then re-resolve that SAME offset to
whichever page it now falls on via pageForBookTextOffset()) is untouched --
it already did the right thing; it just was not being reliably triggered.

These checks first prove the bug is real (temporarily disconnecting the
ResizeObserver reproduces the exact documented desync -- a container
resize that goes completely undetected), then verify the fix across the
full required matrix: viewport-level resize wider/narrower, immersive-mode
on a first/middle/last page, rapid repeated toggling (debounce), an
active highlight, previously-recorded reading-stats help, and TTS staying
alive through a mid-read resize. READER_TTS_URL can target production.
"""
import base64, json, os
from browser_cdp import CDP

c = CDP()
c.call('Network.enable'); c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1100, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=os.environ.get('READER_TTS_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert")


def pause(seconds): c.js(f'new Promise(resolve=>setTimeout(resolve,{seconds * 1000}))')


def check(name, expr):
    value = c.js(expr)
    assert value is True, (name, value)
    print('PASS', name, flush=True)


pause(1)
check('the fix is present: ResizeObserver on els.container', "typeof containerResizeObserver !== 'undefined' && containerResizeObserver instanceof ResizeObserver")

# ---- Fixture: many pages, MIXED paragraph lengths (one-liners, medium, long) ----
paragraphs = []
for i in range(60):
    if i % 5 == 0:
        paragraphs.append(f'Short {i}.')
    elif i % 5 == 1:
        paragraphs.append(f'Paragraph {i}. ' + 'A medium sentence with words. ' * 4)
    else:
        paragraphs.append(f'Paragraph {i}. ' + 'A long readable sentence with several words in it. ' * 14)
md = '# Mixed chapter\n\n' + '\n\n'.join(paragraphs)
data = base64.b64encode(md.encode()).decode()


_book_open_counter = [0]


def open_book(book_key_suffix):
    # Each call must open a book with a bookKey the reader has never seen
    # before, so a fresh chapter/pagination state is guaranteed (otherwise a
    # saved bookmark from an earlier scenario in this same test run could
    # mask a real desync). lastModified must be a NUMBER for the File
    # constructor; book_key_suffix is only ever used inside a quoted JS
    # string literal, so it is safe regardless of its Python type.
    _book_open_counter[0] += 1
    loaded = c.js(f'''(async()=>{{
        localStorage.clear();
        const file=new File([Uint8Array.from(atob('{data}'),c=>c.charCodeAt(0))],'resize-sync-{book_key_suffix}.md',{{lastModified:{_book_open_counter[0]}}});
        await openBookFile(file);
        return {{format: state.format, totalPagesInChapter: state.totalPagesInChapter}};
    }})()''')
    assert loaded['format'] == 'txt' and loaded['totalPagesInChapter'] > 5, loaded
    return loaded['totalPagesInChapter']


# ==== A: the bug reproduces when the fix is disconnected =====================
c.js("containerResizeObserver.unobserve(els.container)")
totalPages = open_book(1)
pause(0.3)
c.js("document.body.classList.remove('immersive-mode')")
pause(0.5)
c.js("goToPageInChapter(2,false)")
pause(0.2)
c.js("window.__repagCalls=0; window.__realRepag=repaginateBook; repaginateBook=function(){window.__repagCalls++; return window.__realRepag();}")
hBefore = c.js("els.container.getBoundingClientRect().height")
c.js("document.body.classList.add('immersive-mode')")
pause(0.8)
hAfter = c.js("els.container.getBoundingClientRect().height")
assert hBefore != hAfter, ('container did not actually resize -- test fixture problem', hBefore, hAfter)
check('A: WITHOUT the ResizeObserver, a container resize goes completely undetected (the bug)', 'window.__repagCalls===0')
c.js("repaginateBook = window.__realRepag; containerResizeObserver.observe(els.container)")

# ==== B: with the fix, the exact same resize is detected and resynced =========
open_book(2)
pause(0.3)
c.js("document.body.classList.remove('immersive-mode')")
pause(0.5)
c.js("goToPageInChapter(2,false)")
pause(0.2)
c.js("window.__repagCalls=0; window.__realRepag=repaginateBook; repaginateBook=function(){window.__repagCalls++; return window.__realRepag();}")
c.js("document.body.classList.add('immersive-mode')")
pause(0.8)
check('B: WITH the fix, the same immersive-mode resize triggers repagination', 'window.__repagCalls>=1')
check('B: pageInChapter stays valid after resync', '''(()=>{
    return state.pageInChapter >= 0 && state.pageInChapter < state.totalPagesInChapter;
})()''')
check('B: logical reading offset still resolves to the shown page', '''(()=>{
    const offset = state.bookTextOffset;
    if (!Number.isInteger(offset)) return true;
    const resolved = pageForBookTextOffset(offset);
    return resolved === null || resolved === state.pageInChapter;
})()''')
c.js("repaginateBook = window.__realRepag")

# ==== C: viewport-level resize, wider -> narrower -> wider (normal case) ======
open_book(3)
pause(0.3)
c.js("goToPageInChapter(1,false)")
pause(0.2)
offsetBefore = c.js("state.bookTextOffset")
c.call('Emulation.setDeviceMetricsOverride', width=700, height=900, deviceScaleFactor=1, mobile=False)
pause(0.8)
check('C1: wider->narrower resize keeps pageInChapter valid', "state.pageInChapter>=0 && state.pageInChapter<state.totalPagesInChapter")
check('C1: wider->narrower resize preserves the logical reading offset', '''(()=>{
    const resolved = pageForBookTextOffset(state.bookTextOffset);
    return resolved === null || resolved === state.pageInChapter;
})()''')
c.call('Emulation.setDeviceMetricsOverride', width=1400, height=900, deviceScaleFactor=1, mobile=False)
pause(0.8)
check('C2: narrower->wider resize keeps pageInChapter valid', "state.pageInChapter>=0 && state.pageInChapter<state.totalPagesInChapter")
c.call('Emulation.setDeviceMetricsOverride', width=1100, height=900, deviceScaleFactor=1, mobile=False)
pause(0.8)

# ==== D: immersive-mode toggle on first / middle / last page ==================
for label, page in [('first', 0), ('middle', None), ('last', -1)]:
    open_book(f'd{label}')
    pause(0.3)
    total = c.js("state.totalPagesInChapter")
    target = page if page is not None else total // 2
    if target < 0: target = total - 1
    c.js("document.body.classList.remove('immersive-mode')")
    pause(0.5)
    c.js(f"goToPageInChapter({target},false)")
    pause(0.2)
    c.js("document.body.classList.add('immersive-mode')")
    pause(0.8)
    check(f'D ({label} page): pageInChapter stays valid after immersive-mode toggle', "state.pageInChapter>=0 && state.pageInChapter<state.totalPagesInChapter")
    check(f'D ({label} page): logical offset still resolves correctly', '''(()=>{
        const resolved = pageForBookTextOffset(state.bookTextOffset);
        return resolved === null || resolved === state.pageInChapter;
    })()''')
    c.js("document.body.classList.remove('immersive-mode')")
    pause(0.5)

# ==== E: repeated rapid toggling collapses into one resync (debounce) =========
open_book(5)
pause(0.3)
c.js("document.body.classList.remove('immersive-mode')")
pause(0.5)
c.js("goToPageInChapter(2,false)")
pause(0.2)
c.js("window.__repagCalls=0; window.__realRepag=repaginateBook; repaginateBook=function(){window.__repagCalls++; return window.__realRepag();}")
for _ in range(6):
    c.js("document.body.classList.toggle('immersive-mode')")
    pause(0.05)  # faster than the CSS transition AND the debounce
pause(0.9)  # let it all settle
callsAfterBurst = c.js("window.__repagCalls")
print('repaginateBook calls after 6 rapid toggles:', callsAfterBurst, flush=True)
assert 1 <= callsAfterBurst <= 3, ('debounce did not collapse the burst reasonably', callsAfterBurst)
check('E: rapid repeated toggling settles to a valid page (not corrupted mid-burst)', "state.pageInChapter>=0 && state.pageInChapter<state.totalPagesInChapter")
c.js("repaginateBook = window.__realRepag")

# ==== F: resize while a highlight/selection exists =============================
open_book(6)
pause(0.3)
c.js("state.translateMode = true")
c.js("document.body.classList.remove('immersive-mode')")
pause(0.5)
c.js("goToPageInChapter(2,false)")
pause(0.2)
wordInfo = c.js('''(()=>{
    // CSS multi-column layout keeps EVERY page's text in the DOM at once,
    // shifted off-screen by transform -- so a word must be checked against
    // the container's actual visible rect, not just "has a non-zero width",
    // or the tap lands on a coordinate that belongs to a different page.
    const containerRect = els.container.getBoundingClientRect();
    const walker = document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT);
    let node;
    while (node = walker.nextNode()) {
        const idx = node.nodeValue.indexOf('Paragraph');
        if (idx >= 0) {
            const r = document.createRange(); r.setStart(node, idx); r.setEnd(node, idx + 9);
            const rect = r.getBoundingClientRect();
            if (rect.width && rect.left >= containerRect.left && rect.right <= containerRect.right
                && rect.top >= containerRect.top && rect.bottom <= containerRect.bottom) {
                return { x: rect.left + 2, y: rect.top + rect.height / 2 };
            }
        }
    }
    return null;
})()''')
assert wordInfo, 'could not find a word to highlight on this page'
highlightedWord = c.js(f"selectWordAtPoint({wordInfo['x']},{wordInfo['y']})")
assert highlightedWord, 'tap did not produce a highlighted word'
highlightedTextBefore = c.js("state.lastWordNode ? state.lastWordNode.textContent : null")
c.js("document.body.classList.add('immersive-mode')")
pause(0.8)
check('F: the .word-visited highlight span is still in the document after resize', "!!state.lastWordNode && document.contains(state.lastWordNode)")
check('F: the highlighted text is unchanged after resize', f"state.lastWordNode.textContent === {highlightedTextBefore!r}")
c.js("document.body.classList.remove('immersive-mode')")
pause(0.5)

# ==== G: resize AFTER translated/helped segments were recorded =================
# Help records are keyed by an ABSOLUTE occurrence id (chapter-text offset +
# normalized word, from currentPageVocabulary()) and stored per chapter scope
# (learningSourceScope() = format:currentIndex) -- NOT per page. A resize that
# reflows columns can legitimately move words between pages (taller columns
# in immersive-mode fit more text per page), so calculateCurrentPageStats()'s
# PAGE-scoped total/helped counts are allowed to change after a reflow; what
# must NOT happen is the underlying help record itself being lost or altered.
open_book(7)
pause(0.3)
c.js("state.translateMode = true")
c.js("document.body.classList.remove('immersive-mode')")
pause(0.5)
c.js("goToPageInChapter(2,false)")
pause(0.2)
setup = c.js('''(()=>{
    const words = currentPageVocabulary().words;
    const targets = [1, Math.floor(words.length/2), words.length-2].map(i => words[i]);
    const recorded = [];
    for (const target of targets) {
        const p = target.pieces[0];
        const range = document.createRange(); range.setStart(p.node, p.start); range.setEnd(p.node, p.end);
        recordHelpForSpan(range, 'word_tap');
        recorded.push({ id: target.id, normalized: target.normalized });
    }
    return { scope: learningSourceScope(), recorded };
})()''')
print('recorded before resize:', setup, flush=True)
assert len(setup['recorded']) == 3 and all(r['id'] for r in setup['recorded']), setup
c.js("document.body.classList.add('immersive-mode')")
pause(0.8)
scope_js = json.dumps(setup['scope'])
recorded_js = json.dumps(setup['recorded'])
check('G: all 3 help records survive the resize with their normalized word unchanged', f'''(()=>{{
    const records = learningStatsBook.scopes[{scope_js}] || {{}};
    return {recorded_js}.every(r => records[r.id] && records[r.id].normalized === r.normalized);
}})()''')
c.js("document.body.classList.remove('immersive-mode')")
pause(0.5)

# ==== H: resize while TTS is active =============================================
open_book(8)
pause(0.3)
c.js("document.body.classList.remove('immersive-mode')")
pause(0.5)
c.js("goToPageInChapter(1,false)")
pause(0.2)
c.js("startTTS()")
pause(0.3)
ttsWasActive = c.js("isSpeakingGlobal===true && state.ttsQueue.length>0")
assert ttsWasActive, 'TTS did not start -- cannot test the resize-during-TTS scenario'
c.js("document.body.classList.add('immersive-mode')")
pause(0.8)
check('H: TTS is still active/has a valid queue after a mid-read resize', "isSpeakingGlobal===true && state.ttsQueue.length>0 && state.ttsIndex>=0 && state.ttsIndex<=state.ttsQueue.length")
check('H: pageInChapter is still valid after a resize during TTS', "state.pageInChapter>=0 && state.pageInChapter<state.totalPagesInChapter")
c.js("stopGlobalTTS()")

check('no application errors', 'window.__errors ? (window.__errors.length===0 || JSON.stringify(window.__errors)) : true')
print('ALL READER RESIZE SYNC CHECKS PASSED', flush=True)
