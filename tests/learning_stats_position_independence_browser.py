"""Audit requested: page reading statistics must be PAGE-GLOBAL, never dependent
on the current scroll/selection/viewport position, tap order, or traversal
direction. Reported symptom: tapping words near the end of a page, then
returning to the beginning, made the statistics "reset" or jump back toward
100% independent, as if help given near the bottom stopped counting.

Audit finding: js/learning-stats.js's tokenIsOnCurrentPage() DID use
position-dependent logic for reflowable formats (EPUB/DOCX/TXT/MD — anything
that isn't PDF, where it already returned true unconditionally): for each
candidate word it created a Range and tested whether ANY of its
getClientRects() intersected els.container's CURRENT getBoundingClientRect() —
i.e. "is this word inside the live, on-screen viewport right now". Both the
denominator (currentPageVocabulary()'s word set) AND which specific
occurrences get recorded (recordHelpForSpan() calls currentPageVocabulary()
too) went through this same filter, so BOTH what counts as "the page" and
which taps get attributed to it depended on live viewport geometry at the
exact moment each call happened — not on the stable, already-tracked
state.pageInChapter the reader itself uses to decide what page is showing.

This is confirmed reproducible with a completely realistic trigger: toggling
immersive-mode (a normal, frequent UI interaction — collapsing the header/
footer) changes #reader-container's actual height, and with the OLD
viewport-based check this alone changed the page's total word count (153 ->
142 in one measured run) with zero navigation and zero change to
state.pageInChapter. (A SEPARATE, deeper, pre-existing issue was found in the
same investigation: '#reader-pages { height: 100% }' means the browser's own
CSS column layout silently re-flows ALL content across columns whenever the
container resizes, independent of state.pageInChapter/totalPagesInChapter --
this is a pagination/resize-sync issue outside "page statistics logic" and
is intentionally NOT touched here; it is reported separately.)

Fix: tokenIsOnCurrentPage() now calls pageIndexForRange() (js/tts.js) --
the SAME stable, computed (not observed) column-index function TTS
auto-page-turn already trusts for "which page is this range on" -- and
compares it against state.pageInChapter. This has nothing to do with the
live viewport, so it cannot be affected by scroll position, container
geometry, or which point in time the check happens to run at.

Checks here use a REAL multi-page markdown document (formats_browser.py's
own "long book paginates" recipe) with genuine CSS-column pagination via
goToPageInChapter() -- not the synthetic PDF-shaped stub the existing
tests/learning_stats_languages_grammar_browser.py suite uses for its math
checks, since that stub's `state.format==='pdf'` path already always
returned true from tokenIsOnCurrentPage() and could never have exercised
the buggy branch. Run the relevant tests, then the full suite, as
requested.
"""
import base64, os
from browser_cdp import CDP

c = CDP()
c.call('Network.enable'); c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
# Explicit, deterministic viewport: pagination (words-per-page) depends on the
# actual window size, and this Chrome instance is reused across test scripts
# that set their own (different) sizes -- without pinning one here, the exact
# word counts below would be flaky depending on run order.
c.call('Emulation.setDeviceMetricsOverride', width=1100, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=os.environ.get('READER_TTS_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert")


def pause(seconds): c.js(f'new Promise(resolve=>setTimeout(resolve,{seconds * 1000}))')


def check(name, expr):
    value = c.js(expr)
    assert value is True, (name, value)
    print('PASS', name, flush=True)


pause(1)
check('tokenIsOnCurrentPage is computed via pageIndexForRange, not viewport geometry',
      "tokenIsOnCurrentPage.toString().includes('pageIndexForRange') && !tokenIsOnCurrentPage.toString().includes('getClientRects')")

md = '# Long chapter\n\n' + '\n\n'.join(f'Paragraph {i}. ' + 'A readable sentence with words. ' * 12 for i in range(80))
data = base64.b64encode(md.encode()).decode()
loaded = c.js(f'''(async()=>{{
    localStorage.clear();
    const file=new File([Uint8Array.from(atob('{data}'),c=>c.charCodeAt(0))],'position-independence.md',{{lastModified:1}});
    await openBookFile(file);
    return {{format: state.format, totalPagesInChapter: state.totalPagesInChapter}};
}})()''')
assert loaded['format'] == 'txt' and loaded['totalPagesInChapter'] > 5, loaded
pause(0.3)

c.js("goToPageInChapter(2,false)")
pause(0.3)

setup = c.js('''(()=>{
    window.__clearStats = () => { learningStatsBook = { version: LEARNING_STATS_VERSION, scopes: {} }; saveLearningStatsForBook(); };
    window.__tapWord = (i) => {
        const words = currentPageVocabulary().words;
        const p = words[i].pieces[0];
        const range = document.createRange(); range.setStart(p.node, p.start); range.setEnd(p.node, p.end);
        return recordHelpForSpan(range, 'word_tap');
    };
    window.__n = currentPageVocabulary().words.length;
    return { n: window.__n, pageInChapter: state.pageInChapter };
})()''')
assert setup['n'] > 20, setup
n = setup['n']
print('page 2 word count:', n, 'pageInChapter:', setup['pageInChapter'], flush=True)

# ---- The definitive, isolated proof ----------------------------------------
# With the ACTUAL rendered layout held completely fixed (els.pages keeps its
# real measured height instead of inheriting els.container's, so no genuine
# reflow/repagination happens -- state.pageInChapter and every word's real
# on-screen position are untouched) and ONLY els.container's OWN reported
# bounding rect shrunk (simulating a transient/stale geometry read -- exactly
# the class of thing a live viewport check is vulnerable to and a computed,
# state-based check structurally cannot be), the total word count for the
# SAME settled page must not change at all.
c.js('''
window.__frozenPagesHeight = els.pages.getBoundingClientRect().height;
els.pages.style.height = window.__frozenPagesHeight + 'px';
els.container.style.height = '300px';
''')
pause(0.1)
check('shrinking the container rect alone (layout frozen, no reflow) does not change the total', f'calculateCurrentPageStats().total==={n}')
c.js("els.pages.style.height=''; els.container.style.height='';")
pause(0.2)

# ---- Required reproduction: A. bottom, B. middle, C. top -------------------
c.js('__clearStats()')
c.js(f"__tapWord({n - 2})")   # near the bottom
c.js(f"__tapWord({n // 2})")  # middle
c.js(f"__tapWord(1)")         # near the top
check('helpedCount = 3 after tapping bottom, middle, top (in that order)', 'calculateCurrentPageStats().helped===3')
check('totalCount is the full page vocabulary, not a sub-range', f'calculateCurrentPageStats().total==={n}')

# ---- Scroll to bottom / scroll to top: helpedCount must still be 3 ---------
# This app's "page" is a CSS-column slice, not a vertically-scrollable region
# (#reader-container is overflow:hidden) -- the closest real equivalent to
# "scroll within the page" is simply recomputing stats while positioned
# anywhere in that same settled page; also try an explicit (inert, since
# overflow is hidden) scrollTop poke to prove it has no effect either way.
c.js("els.container.scrollTop = 999999")
check('after scrolling to bottom, helpedCount is still 3', 'calculateCurrentPageStats().helped===3')
c.js("els.container.scrollTop = 0")
check('after scrolling to top, helpedCount is still 3', 'calculateCurrentPageStats().helped===3')

# ---- Navigate away and back to the SAME page: stats must be unaffected -----
c.js("goToPageInChapter(1,false)")
pause(0.2)
c.js("goToPageInChapter(2,false)")
pause(0.2)
check('returning to the same page after navigating away restores helpedCount=3', 'calculateCurrentPageStats().helped===3')
check('returning to the same page after navigating away restores total', f'calculateCurrentPageStats().total==={n}')

# ---- Random order: bottom -> top -> middle -> bottom ------------------------
c.js('__clearStats()')
order = [n - 3, 2, n // 2, n - 3]  # bottom, top, middle, bottom again (dedup)
for i in order:
    c.js(f"__tapWord({i})")
check('random-order taps (bottom, top, middle, bottom again) give helpedCount=3', 'calculateCurrentPageStats().helped===3')

# ---- Explicit random-order vs sequential-order equivalence (required) ------
c.js('''
window.__idxs = [__n - 2, Math.floor(__n / 2), 1, __n - 10, 5];
__clearStats();
for (const i of __idxs) __tapWord(i);
window.__randomOrderStats = calculateCurrentPageStats();
__clearStats();
for (const i of __idxs.slice().sort((a, b) => a - b)) __tapWord(i);
window.__sequentialStats = calculateCurrentPageStats();
''')
check('random-order taps produce the exact same total as sequential taps', 'window.__randomOrderStats.total===window.__sequentialStats.total')
check('random-order taps produce the exact same helped count as sequential taps', 'window.__randomOrderStats.helped===window.__sequentialStats.helped')
check('random-order taps produce the exact same helpPercent as sequential taps', 'window.__randomOrderStats.helpPercent===window.__sequentialStats.helpPercent')

# ---- 10 words at random locations, repeated scroll, popup close/reopen -----
c.js('__clearStats()')
random_positions = [n - 1, 0, n // 3, n - 5, 3, n // 2 + 4, n - 20, 7, n // 4, n - 30]
for i in [p for p in random_positions if 0 <= p < n]:
    c.js(f"__tapWord({i})")
expected_unique = len({p for p in random_positions if 0 <= p < n})
c.js("els.container.scrollTop = 999999")
c.js("els.container.scrollTop = 0")
c.js("els.container.scrollTop = 999999")
c.js("els.container.scrollTop = 0")
# Popup close/reopen: the real close path (js/ui-tooltip.js's document pointerdown
# listener) never touches .word-visited or learningStatsBook -- simulate the same
# effect directly, since it must have zero bearing on stats either way.
c.js("els.tooltip.style.display='flex'; cancelTooltipHide && cancelTooltipHide(); els.tooltip.style.display='none';")
check(f'10 taps at random positions -> helpedCount={expected_unique} regardless of repeated scrolling/popup close', f'calculateCurrentPageStats().helped==={expected_unique}')

# ---- Combine word taps and a paragraph (multi-word span) translation -------
c.js('__clearStats()')
c.js(f"__tapWord({n - 1})")
c.js(f"__tapWord(0)")
combo = c.js(f'''(()=>{{
    const words = currentPageVocabulary().words;
    const first = words[10].pieces[0], last = words[19].pieces.at(-1);
    const range = document.createRange(); range.setStart(first.node, first.start); range.setEnd(last.node, last.end);
    return recordHelpForSpan(range, 'paragraph_translation');
}})()''')
assert combo['addedOccurrenceIds'], combo
check('word taps + a paragraph translation share one deduplicated page-global set', 'calculateCurrentPageStats().helped===12')

# ---- Revisit the same page after visiting another page ---------------------
c.js("goToPageInChapter(5,false)")
pause(0.2)
other_page_total = c.js("calculateCurrentPageStats().total")
assert other_page_total != n or True  # different page's own word count, informational
c.js("goToPageInChapter(2,false)")
pause(0.2)
check('revisiting page 2 after visiting page 5 still shows helpedCount=12', 'calculateCurrentPageStats().helped===12')
check('revisiting page 2 after visiting page 5 still shows the full page total', f'calculateCurrentPageStats().total==={n}')

# ---- Select paragraphs in random (non-monotonic) order ----------------------
c.js('__clearStats()')
spans = [(30, 34), (5, 8), (40, 45), (10, 12)]  # deliberately non-monotonic
for a, b in spans:
    c.js(f'''(()=>{{
        const words = currentPageVocabulary().words;
        const first = words[{a}].pieces[0], last = words[{b}].pieces.at(-1);
        const range = document.createRange(); range.setStart(first.node, first.start); range.setEnd(last.node, last.end);
        return recordHelpForSpan(range, 'paragraph_translation');
    }})()''')
expected_para = len(set().union(*[range(a, b + 1) for a, b in spans]))
check(f'paragraphs selected out of order still cover exactly {expected_para} unique occurrences', f'calculateCurrentPageStats().helped==={expected_para}')

check('no application errors', 'window.__errors ? (window.__errors.length===0 || JSON.stringify(window.__errors)) : true')
print('ALL LEARNING STATS POSITION-INDEPENDENCE CHECKS PASSED', flush=True)
