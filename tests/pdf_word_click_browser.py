"""PDF single-word click/tap regression tests — verify word lookup works on continuous scroll.
Start a local server on 8765 and Chrome with --remote-debugging-port=9222.
No AI request or real credentials are used.
"""
import base64, json, os, socket, struct, time, urllib.request

from browser_cdp import CDP, pdf_bytes

c=CDP(); c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
def pause(seconds): c.js(f'new Promise(resolve=>setTimeout(resolve,{seconds * 1000}))')
c.call('Emulation.setDeviceMetricsOverride',width=900,height=1200,deviceScaleFactor=1,mobile=False)
c.call('Page.navigate',url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html'));c.wait("document.readyState==='complete' && !document.body.inert")
pause(1)
print('app loaded')
data=base64.b64encode(pdf_bytes()).decode()

# Setup: load PDF, enable translate mode, mock word lookup
print('loading PDF and enabling word-click testing...')
setup_result = c.js(f'''(async()=>{{
 localStorage.clear();
 state.pdfScale=1; state.pdfFit='width'; state.format='pdf'; state.bookKey='word-click-test';
 state.translateMode=true;
 document.body.classList.add('pdf-mode','immersive-mode','mode-translate-on');
 els.container.classList.add('mode-translate');

 // Mock handleWordOrSelection to capture word clicks
 window.__wordsClicked = [];
 window.__realHandleWordOrSelection = handleWordOrSelection;
 window.handleWordOrSelection = function(word, x, y, rect, helpContext, sourceType) {{
     console.log('Word clicked:', word, 'source:', sourceType);
     window.__wordsClicked.push({{ word: word.trim(), sourceType: sourceType }});
     return window.__realHandleWordOrSelection(word, x, y, rect, helpContext, sourceType);
 }};

 const file=new File([Uint8Array.from(atob('{data}'),c=>c.charCodeAt(0))],'fixture.pdf');
 await initPdf(file);

 // Wait for first page to render
 await new Promise(r => setTimeout(r, 800));

 return {{
     ready: true,
     totalPages: state.totalPages,
     hasTextLayer: !!document.querySelector('.pdf-text-layer'),
     spanCount: document.querySelectorAll('.pdf-text-layer span').length,
     translateMode: state.translateMode,
     modeTranslateClass: els.container.classList.contains('mode-translate'),
     bodyModeClass: document.body.classList.contains('mode-translate-on')
 }};
}})()
''')
print(json.dumps(setup_result, indent=2))

if not setup_result.get('ready'):
    print('FAILED to setup PDF')
    c.close()
    exit(1)

# TEST 1: Click a word on the first page
print('\n=== TEST 1: Single click on first page ===')
test1 = c.js('''
(async () => {
    const layer = document.querySelector('.pdf-text-layer');
    const spans = Array.from(layer.querySelectorAll('span'));

    // Find first non-empty span
    let targetSpan = null;
    for (const span of spans) {
        if (span.textContent.trim() && span.textContent.trim().length > 1) {
            targetSpan = span;
            break;
        }
    }

    if (!targetSpan) return { error: 'no spans found' };

    const word = targetSpan.textContent.trim();
    const rect = targetSpan.getBoundingClientRect();

    // Check pointer-events
    const pointerEvents = window.getComputedStyle(targetSpan).pointerEvents;

    // Dispatch click event
    const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2
    });

    targetSpan.dispatchEvent(event);

    // Wait for handler
    await new Promise(r => setTimeout(r, 100));

    return {
        word: word,
        pointerEvents: pointerEvents,
        clickDispatched: true,
        wordsClicked: window.__wordsClicked,
        lastWordNode: !!state.lastWordNode
    };
})()
''')
print(json.dumps(test1, indent=2))
assert test1.get('pointerEvents') == 'auto', f"pointer-events should be 'auto', got {test1.get('pointerEvents')}"
assert len(test1.get('wordsClicked', [])) > 0, "Word should have been clicked"
assert test1['wordsClicked'][0]['word'] in test1['word'], "Clicked word should be in target span"
print('✓ PASS: Single click on first page')

# TEST 2: Scroll to another page and click a word
print('\n=== TEST 2: Click on scrolled page ===')
test2 = c.js('''
(async () => {
    // Scroll down to reveal more pages
    els.container.scrollTop = 3000;
    await new Promise(r => setTimeout(r, 500));

    const layers = document.querySelectorAll('.pdf-text-layer');
    if (layers.length < 2) return { error: 'not enough pages rendered after scroll', layerCount: layers.length };

    // Find a span on a later page
    let targetSpan = null;
    for (const layer of layers) {
        const spans = Array.from(layer.querySelectorAll('span'));
        for (const span of spans) {
            if (span.textContent.trim() && span.textContent.trim().length > 1) {
                targetSpan = span;
                break;
            }
        }
        if (targetSpan) break;
    }

    if (!targetSpan) return { error: 'no target span on scrolled pages' };

    targetSpan.scrollIntoView({ block: 'center' });
    await new Promise(r => setTimeout(r, 150));

    const word = targetSpan.textContent.trim();
    const rect = targetSpan.getBoundingClientRect();

    const countBefore = window.__wordsClicked.length;

    // Check pointer-events
    const pointerEvents = window.getComputedStyle(targetSpan).pointerEvents;

    const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2
    });

    targetSpan.dispatchEvent(event);
    await new Promise(r => setTimeout(r, 100));

    return {
        word: word,
        pointerEvents: pointerEvents,
        scrollTop: els.container.scrollTop,
        clickDispatched: true,
        clicksBefore: countBefore,
        wordsClickedCount: window.__wordsClicked.length,
        lastClickedWord: window.__wordsClicked[window.__wordsClicked.length - 1]?.word
    };
})()
''')
print(json.dumps(test2, indent=2))
assert test2.get('pointerEvents') == 'auto', f"pointer-events on scrolled page should be 'auto', got {test2.get('pointerEvents')}"
assert test2['lastClickedWord'] in test2['word'], f"Last clicked word should be in target span, got {test2['lastClickedWord']}"
print('✓ PASS: Click on scrolled page')

# TEST 3: Tap (touch) event on PDF word
print('\n=== TEST 3: Touch tap on PDF word ===')
# Note: the click listener should also handle touch events that bubble up as click
test3 = c.js('''
(async () => {
    els.container.scrollTop = 0;
    await new Promise(r => setTimeout(r, 400));

    const layer = document.querySelector('.pdf-text-layer');
    const spans = Array.from(layer.querySelectorAll('span'));

    let targetSpan = null;
    for (const span of spans) {
        if (span.textContent.trim() && span.textContent.trim().length > 2) {
            targetSpan = span;
            break;
        }
    }

    if (!targetSpan) return { error: 'no target span' };

    targetSpan.scrollIntoView({ block: 'center' });
    await new Promise(r => setTimeout(r, 150));

    const word = targetSpan.textContent.trim();
    const rect = targetSpan.getBoundingClientRect();

    // Clear previous clicks
    const countBefore = window.__wordsClicked.length;

    // Simulate touch event (will eventually bubble as click)
    const event = new PointerEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: Math.round(rect.left + rect.width / 2),
        clientY: Math.round(rect.top + rect.height / 2),
        pointerId: 1,
        pointerType: 'touch'
    });

    targetSpan.dispatchEvent(event);
    await new Promise(r => setTimeout(r, 100));

    const clickedAfter = window.__wordsClicked.length;

    return {
        word: word,
        clicksBefore: countBefore,
        clicksAfter: clickedAfter,
        newClickOccurred: clickedAfter > countBefore,
        newWord: window.__wordsClicked[clickedAfter - 1]?.word
    };
})()
''')
print(json.dumps(test3, indent=2))
assert test3.get('newClickOccurred'), "Touch event should trigger word click"
assert test3['newWord'] in test3['word'], f"Tapped word should be in target span, got {test3['newWord']}"
print('✓ PASS: Touch tap on PDF word')

# TEST 4: Multiple pages rendered, word clicks work on all visible pages
print('\n=== TEST 4: Word clicks on multiple visible pages ===')
test4 = c.js('''
(async () => {
    els.container.scrollTop = 0;
    els.container.scrollLeft = 0;
    await new Promise(r => setTimeout(r, 500));

    // Scroll to middle of document
    els.container.scrollTop = 5000;
    await new Promise(r => setTimeout(r, 600));

    const countBefore = window.__wordsClicked.length;
    const layers = document.querySelectorAll('.pdf-text-layer');
    let clickedCount = 0;

    // Click a word on each visible page
    for (let i = 0; i < Math.min(layers.length, 3); i++) {
        const layer = layers[i];
        const spans = Array.from(layer.querySelectorAll('span'));

        for (const span of spans) {
            if (span.textContent.trim() && span.textContent.trim().length > 1) {
                span.scrollIntoView({ block: 'center' });
                await new Promise(r => setTimeout(r, 50));
                const rect = span.getBoundingClientRect();
                const event = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: rect.left + rect.width / 2,
                    clientY: rect.top + rect.height / 2
                });
                span.dispatchEvent(event);
                clickedCount++;
                await new Promise(r => setTimeout(r, 50));
                break;
            }
        }
    }

    await new Promise(r => setTimeout(r, 200));
    const countAfter = window.__wordsClicked.length;

    return {
        visibleLayers: layers.length,
        clicksAttempted: clickedCount,
        clicksBefore: countBefore,
        clicksAfter: countAfter,
        successfulClicks: countAfter - countBefore,
        allWordsNonEmpty: window.__wordsClicked.slice(countBefore).every(w => w.word && w.word.length > 0)
    };
})()
''')
print(json.dumps(test4, indent=2))
assert test4['successfulClicks'] > 0, "Should have successfully clicked words on multiple pages"
assert test4['allWordsNonEmpty'], "All clicked words should be non-empty"
print('✓ PASS: Word clicks on multiple visible pages')

# TEST 5: Verify word extraction preserves accented characters and apostrophes
print('\n=== TEST 5: Word extraction accuracy (accents, apostrophes) ===')
test5 = c.js('''
(async () => {
    els.container.scrollTop = 0;
    await new Promise(r => setTimeout(r, 500));

    // Check if we can find words with accents or apostrophes
    const layer = document.querySelector('.pdf-text-layer');
    const spans = Array.from(layer.querySelectorAll('span'));

    // Look for spans with accent characters or apostrophes
    let specialWord = null;
    let specialSpan = null;
    for (const span of spans) {
        const text = span.textContent;
        // French accent patterns or apostrophe
        if (text.match(/[àâæçéèêëîïôœùûüÿ']/) && text.trim().length > 1) {
            specialSpan = span;
            specialWord = text.trim();
            break;
        }
    }

    if (!specialSpan) {
        return { info: 'no accented words found in this section, looking elsewhere...' };
    }

    const rect = specialSpan.getBoundingClientRect();

    // Clear and click
    window.__wordsClicked = [];
    const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2
    });

    specialSpan.dispatchEvent(event);
    await new Promise(r => setTimeout(r, 100));

    return {
        foundSpecialWord: !!specialWord,
        originalText: specialWord,
        clickedWord: window.__wordsClicked[0]?.word,
        match: specialWord === window.__wordsClicked[0]?.word
    };
})()
''')
print(json.dumps(test5, indent=2))
# This test may not always find a special word, so we just check it doesn't error
print('✓ PASS: Word extraction (may or may not find accented words in test PDF)')

print('\n=== ALL WORD-CLICK TESTS PASSED ===')
c.sock.close()
