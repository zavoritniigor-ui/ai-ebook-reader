"""User-reported bug: tap the FIRST word of a PDF sentence, then press the
translation popup's "select" button (word -> end of sentence -> whole sentence
-> whole paragraph, cycling through js/main.js/translation.js's ttExpandBtn) —
the SECOND press selects the wrong text. Also covers the two-column layout the
user described (a sentence with its translation printed in an adjacent column):
the fix must not let selection bleed from one column into the other either.

Root cause: js/selection.js's anchorCaret() used to trust state.lastWordNode
only when its OWN firstChild was already a text node. The first "select" press
(showSelectionHighlight -> wrapRangeInSpans, PDF path) wraps the just-selected
text in a NEW span.sel-word — and when the tapped word IS the sentence's first
word, that new span lands INSIDE the pre-existing span.word-visited wrapping
the tapped word, replacing its firstChild with an ELEMENT instead of a text
node. anchorCaret's direct firstChild check then silently fell back from the
reliable word anchor to raw-coordinate hit-testing on the SECOND press.

Real PDF.js rendering is used (this is exactly the DOM-mutation interaction
the bug depends on) via the synthetic two-column PDF fixture.
"""
import base64, time
from browser_cdp import CDP, pdf_bytes

c = CDP(); c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
def pause(seconds): c.js(f'new Promise(resolve=>setTimeout(resolve,{seconds * 1000}))')
c.call('Emulation.setDeviceMetricsOverride', width=900, height=1200, deviceScaleFactor=2, mobile=True)
c.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
c.call('Page.navigate', url='http://127.0.0.1:8765/index.html')
c.wait("document.readyState==='complete' && !document.body.inert")
pause(1)


def check(name, expr):
    value = c.js(expr)
    assert value is True, (name, value, c.js('({selection:state.lastSelectionText,tap:state.lastTapPoint,render:readerEpoch.render,pending:window.__pendingPdfRenders})'))
    print('PASS', name, flush=True)


def touch(kind, points):
    c.call('Input.dispatchTouchEvent', type=kind, touchPoints=[dict(x=x, y=y, id=i, radiusX=5, radiusY=5, force=1) for i, x, y in points])


data = base64.b64encode(pdf_bytes(two_columns=True)).decode()
loaded = c.js(f'''(async()=>{{
    localStorage.clear(); state.pdfScale=1; state.pdfFit='width'; state.format='pdf'; state.bookKey='pdf-reselect-test';
    document.body.classList.add('pdf-mode','immersive-mode');
    state.translateMode=true; els.pages.classList.add('mode-translate');
    window.__errors=[]; window.addEventListener('error',e=>__errors.push(e.message));
    window.__lookups=[]; handleWordOrSelection=(word,x,y)=>{{__lookups.push(word)}};
    window.__pendingPdfRenders=0; window.__lastPdfRender=performance.now();
    const originalRender=renderPdfPage;
    renderPdfPage=async(...args)=>{{
        __pendingPdfRenders++; __lastPdfRender=performance.now();
        try {{ return await originalRender(...args); }}
        finally {{ __pendingPdfRenders--; __lastPdfRender=performance.now(); }}
    }};
    const file=new File([Uint8Array.from(atob('{data}'),c=>c.charCodeAt(0))],'fixture.pdf');
    await initPdf(file); return {{pages:state.totalPages, text:els.pages.textContent}};
}})()''')
assert 'Left sentence 0' in loaded['text'] and 'Right sentence 0' in loaded['text'], loaded
# Mobile viewport/fullscreen setup can queue navigation.js's 250ms resize
# debounce AFTER initPdf resolves. A resulting render invalidates selection;
# wait for a quiet render interval before starting the selection-only scenario.
c.wait('__pendingPdfRenders===0 && performance.now()-__lastPdfRender>400')

# Tap the FIRST word ("Left") of the LEFT column's first sentence — exactly the
# scenario the user described.
pos = c.js('''(()=>{
    const spans = pdfTextSpans(document.querySelector('.pdf-text-layer'));
    const target = spans.find(s => s.textContent.includes('Left sentence 0'));
    const r = target.getBoundingClientRect();
    return { x: r.left + 8, y: r.top + r.height / 2 };
})()''')
touch('touchStart', [(1, pos['x'], pos['y'])]); touch('touchEnd', []); pause(.3)
check('tap resolves to the first word of the left column', "window.__lookups.at(-1)==='Left'")
check('the real tap set lastTapPoint (used by the expand button, not our own)', 'state.lastTapPoint && state.expandLevel===0')
check('the real tap records only that PDF word occurrence', 'calculateCurrentPageStats().helped===1')

# The three presses of the translation popup's "select" button, exactly as
# wired in js/translation.js's els.ttExpandBtn.onclick (which is only actually
# attached once a real handleWordOrSelection tooltip render runs — stubbed out
# above to avoid AI/network calls — so the underlying calls it makes are
# exercised directly here instead of via a DOM .click()).
c.js('''
    state.expandLevel = 1;
    selectRangeAndTranslate(wordToSentenceEndRangeAt(state.lastTapPoint.x, state.lastTapPoint.y), state.lastTapPoint.x, state.lastTapPoint.y, 'phrase_translation');
''')
check('1st press selects exactly the tapped sentence', '''
    state.lastSelectionText === 'Left sentence 0.'
''')
check('1st press does not bleed into the right column', "!state.lastSelectionText.includes('Right')")
check('1st press does not overrun into the next sentence', "!state.lastSelectionText.includes('Second sentence')")
check('1st press maps the selected phrase to its two word occurrences', 'calculateCurrentPageStats().helped===2')

# 2nd press: this is the exact repro — same tap point, same word, but the DOM
# now has an extra span.sel-word nested inside span.word-visited from the 1st
# press's highlight.
c.js('''
    state.expandLevel = 2;
    selectRangeAndTranslate(sentenceRangeAt(state.lastTapPoint.x, state.lastTapPoint.y), state.lastTapPoint.x, state.lastTapPoint.y, 'sentence_translation');
''')
check('2nd press still selects exactly the same sentence (the actual bug)', '''
    state.lastSelectionText === 'Left sentence 0.'
''')
check('2nd press does not bleed into the right column', "!state.lastSelectionText.includes('Right')")
check('2nd press reuses the same two occurrence IDs', 'calculateCurrentPageStats().helped===2')

# 3rd press: paragraph fallback — must not crash, and must still not be empty.
c.js('''
    state.expandLevel = 3;
    selectRangeAndTranslate(paragraphRangeAt(state.lastTapPoint.x, state.lastTapPoint.y), state.lastTapPoint.x, state.lastTapPoint.y, 'paragraph_translation');
''')
check('3rd press (paragraph) still produces non-empty text', 'state.lastSelectionText.length > 0')
check('3rd press records paragraph coverage without exceeding page total', '(()=>{const s=calculateCurrentPageStats();return s.helped>=2&&s.helped<=s.total})()')

check('no application errors', 'window.__errors.length===0 || JSON.stringify(window.__errors)')
print('ALL PDF SENTENCE RESELECT CHECKS PASSED', flush=True)
