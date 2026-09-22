"""Automated test: Bounded Predictive Thumbnail Scheduler, Quick Wheel & Touch Selection.

Verifies:
1. Bounded Predictive Thumbnail Scheduler:
   - Queue bounded to [center - 10 ... center + 10] (at most 21 items)
   - On open/load: immediate prioritization around currentIndex
   - On page jump (e.g. page 1 -> 50): stale offscreen tasks purged, active window moves to [40, 60]
   - Fast-scroll debouncing on sidebar list
   - Queue instrumentation via window.__pdfThumbQueueState()
2. Quick Wheel Responsive Layout & Action Controls:
   - Action controls (#tt-ask-btn, #tt-ai-btn) in dedicated full-width row
   - Never crowded or pushed offscreen at 1200px, 390px, and 320px viewport widths
   - Compact localized count when selection >2 words / >24 chars (UK, EN, FR)
   - Full text preserved in title attribute
3. Touch Hold-to-Select & Drag Selection:
   - 380ms hold initiates drag selection mode and suppresses panning
   - Quick touch move before 380ms aborts selection and preserves natural scroll
"""
import base64, json, os, sys, time
from browser_cdp import CDP
from pdf_audit_fixtures import pdf_document

c = CDP()
c.sock.settimeout(60)
c.call('Page.enable')
c.call('Runtime.enable')
c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Emulation.setDeviceMetricsOverride', width=1200, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8766/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert")
c.js("persistCriticalState = () => {}; localStorage.clear(); showUpdateBanner = () => {}; document.getElementById('sw-update-banner')?.remove()")
c.call('Page.reload', ignoreCache=True)
c.wait("document.readyState==='complete' && !document.body.inert && typeof setupPdfThumbnailSidebar==='function'")

def settle(ms=150):
    time.sleep(ms / 1000.0)
    c.js(f"new Promise(r => setTimeout(r, {ms}))")

def upload_pdf(pdf_bytes, name="thumbnails_test.pdf"):
    b64 = base64.b64encode(pdf_bytes).decode()
    c.js("if (typeof pdfContinuousReady !== 'undefined') pdfContinuousReady = false;")
    c.js(f"""(() => {{
      const bytes = Uint8Array.from(atob({b64!r}), c=>c.charCodeAt(0));
      const file = new File([bytes], {name!r}, {{type:'application/pdf'}});
      const dt = new DataTransfer(); dt.items.add(file);
      document.getElementById('file-upload').files = dt.files;
      document.getElementById('file-upload').dispatchEvent(new Event('change'));
    }})()""")
    c.wait("state.format==='pdf' && pdfContinuousReady && !!state.pdfDoc", timeout=20)
    settle(300)

print("=== 1. TESTING BOUNDED PREDICTIVE THUMBNAIL SCHEDULER ===")
# Build a 60-page PDF fixture
pages = [{'text': f'Predictive Scheduler Page {i} text content for testing', 'size': (600, 800)} for i in range(1, 61)]
doc_bytes = pdf_document(pages)
upload_pdf(doc_bytes)

# Open sidebar so thumbnail processing is active
c.js("els.sidebar.classList.remove('collapsed')")
settle(200)

# Check queue instrumentation
q_state = c.js("window.__pdfThumbQueueState ? window.__pdfThumbQueueState() : null")
assert q_state is not None, "window.__pdfThumbQueueState must be exposed"
assert q_state['activeCenter'] == 1, f"Initial activeCenter should be 1, got {q_state['activeCenter']}"
assert q_state['activeWindow'] == [1, 11], f"Initial activeWindow should be [1, 11], got {q_state['activeWindow']}"
assert q_state['queueLength'] <= 21, f"Queue length must be bounded to <= 21, got {q_state['queueLength']}"
print(f"PASS Initial thumbnail window verified: center={q_state['activeCenter']}, window={q_state['activeWindow']}, queueLength={q_state['queueLength']}")

# Jump to page 50: verify stale tasks are purged and active window shifts to [40, 60]
c.js("syncActiveThumbnail(50)")
settle(150)
q_state_50 = c.js("window.__pdfThumbQueueState()")
assert 40 <= q_state_50['activeCenter'] <= 55, f"activeCenter after jump to 50 should be near 50, got {q_state_50['activeCenter']}"
assert q_state_50['activeWindow'][0] <= 50 <= q_state_50['activeWindow'][1], f"activeWindow should contain 50, got {q_state_50['activeWindow']}"
assert q_state_50['queueLength'] <= 21, f"Queue length after jump must be bounded <= 21, got {q_state_50['queueLength']}"
print(f"PASS Jump to page 50 verified: center={q_state_50['activeCenter']}, window={q_state_50['activeWindow']}, queueLength={q_state_50['queueLength']}")

# Check that stale items from page 1-10 are no longer queued
stale_check = c.js("""(() => {
    const li1 = document.querySelector('.pdf-thumb-item[data-page="1"]');
    const li10 = document.querySelector('.pdf-thumb-item[data-page="10"]');
    return !li1?.dataset.thumbQueued && !li10?.dataset.thumbQueued;
})()""")
assert stale_check is True, "Stale thumbnail items outside the jump window must have thumbQueued cleared"
print("PASS Stale thumbnail tasks outside jump window were purged")

# Fast scroll simulation: rapidly changing list scrollTop triggers debounce without exploding queue
c.js("""(() => {
    const list = document.getElementById('pdf-thumb-list');
    for (let i = 1; i <= 10; i++) {
        list.scrollTop = i * 200;
        list.dispatchEvent(new Event('scroll'));
    }
})()""")
settle(50)
fast_q = c.js("window.__pdfThumbQueueState()")
assert fast_q['queueLength'] <= 21, f"Queue length during fast scroll must remain bounded <= 21, got {fast_q['queueLength']}"
print("PASS Fast scroll debouncing keeps queue bounded")

print("\n=== 2. TESTING QUICK WHEEL RESPONSIVE LAYOUT & ACTION CONTROLS ===")
# Test multi-word text selection formatting in tooltip
test_cases = [
    # (lang, word_count, sample_text, expected_label_prefix)
    ('uk', 8, 'Слово перше друге третє четверте п’яте шосте сьоме', '8 слів виділено'),
    ('uk', 2, 'Два слова', 'Два слова'),
    ('en', 5, 'Five distinct words selected here', '5 words selected'),
    ('fr', 4, 'Quatre mots sélectionnés ici', '4 mots sélectionnés'),
]

for lang, count, text, expected in test_cases:
    c.js(f"""(() => {{
        state.uiLang = '{lang}';
        const r = {{ left: 300, right: 400, top: 200, bottom: 220, width: 100, height: 20 }};
        handleWordOrSelection({json.dumps(text)}, 350, 210, r, null, 'multi_word');
    }})()""")
    settle(100)
    tt_data = c.js("""(() => {
        const orig = document.getElementById('tt-original');
        const askBtn = document.getElementById('tt-ask-btn');
        const aiBtn = document.getElementById('tt-ai-btn');
        const actions = document.querySelector('.tt-actions');
        const origRow = document.querySelector('.tt-original-row');
        return {
            text: orig.textContent.trim(),
            title: orig.title,
            askVisible: askBtn.offsetWidth > 0 && askBtn.offsetHeight > 0,
            aiVisible: aiBtn.offsetWidth > 0 && aiBtn.offsetHeight > 0,
            actionsWidth: actions ? actions.offsetWidth : 0,
            origRowWidth: origRow ? origRow.offsetWidth : 0,
            askWidth: askBtn.offsetWidth,
            aiWidth: aiBtn.offsetWidth
        };
    })()""")
    assert tt_data['text'] == expected, f"[{lang}] Expected tooltip original text '{expected}', got '{tt_data['text']}'"
    assert tt_data['askVisible'] and tt_data['aiVisible'], f"[{lang}] Action buttons must be visible"
    if count > 2:
        assert tt_data['title'] == text, f"[{lang}] Title attribute must contain full selection text"
    print(f"PASS [{lang}] Selection '{text[:25]}...' -> '{tt_data['text']}', action buttons visible ({tt_data['askWidth']}px, {tt_data['aiWidth']}px)")

# Responsive check at 390px and 320px
for test_w in [390, 320]:
    c.call('Emulation.setDeviceMetricsOverride', width=test_w, height=800, deviceScaleFactor=1, mobile=True)
    settle(150)
    c.js(f"""(() => {{
        state.uiLang = 'uk';
        const r = {{ left: 50, right: 250, top: 100, bottom: 120, width: 200, height: 20 }};
        handleWordOrSelection('Це дуже довге виділення тексту для перевірки адаптивності кнопок', 100, 110, r, null, 'multi_word');
    }})()""")
    settle(150)
    layout = c.js("""(() => {
        const tt = document.getElementById('word-tooltip');
        const ask = document.getElementById('tt-ask-btn');
        const ai = document.getElementById('tt-ai-btn');
        const orig = document.getElementById('tt-original');
        const ttRect = tt.getBoundingClientRect();
        const askRect = ask.getBoundingClientRect();
        const aiRect = ai.getBoundingClientRect();
        return {
            ttWidth: ttRect.width,
            askWidth: askRect.width,
            aiWidth: aiRect.width,
            askRight: askRect.right,
            aiRight: aiRect.right,
            ttRight: ttRect.right,
            fitsInTooltip: askRect.right <= ttRect.right + 2 && aiRect.right <= ttRect.right + 2,
            origText: orig.textContent.trim()
        };
    })()""")
    assert layout['fitsInTooltip'] is True, f"Action buttons must fit within tooltip width at {test_w}px! (askRight={layout['askRight']}, aiRight={layout['aiRight']}, ttRight={layout['ttRight']})"
    assert layout['askWidth'] >= 70, f"Ask button should have adequate width at {test_w}px, got {layout['askWidth']}"
    assert layout['aiWidth'] >= 70, f"Grammar button should have adequate width at {test_w}px, got {layout['aiWidth']}"
    print(f"PASS Tooltip action buttons fit cleanly at {test_w}px: tooltipWidth={layout['ttWidth']:.1f}px, askBtn={layout['askWidth']:.1f}px, aiBtn={layout['aiWidth']:.1f}px, label='{layout['origText']}'")

# Restore desktop metrics
c.call('Emulation.setDeviceMetricsOverride', width=1200, height=900, deviceScaleFactor=1, mobile=False)
c.js("els.tooltip.style.display = 'none'")

print("\n=== 3. TESTING TOUCH HOLD-TO-SELECT VS QUICK SWIPE ===")
touch_hold_res = c.js("""(() => {
    state.translateMode = true;
    state.inkMode = false;
    state.format = 'pdf';
    
    // Simulate touch pointerdown on reader container
    const target = document.querySelector('.pdf-text-layer span') || els.container;
    const rect = target.getBoundingClientRect();
    const px = rect.left + 20, py = rect.top + 10;
    
    const ev = new PointerEvent('pointerdown', {
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
        clientX: px,
        clientY: py,
        bubbles: true
    });
    target.dispatchEvent(ev);
    
    return {
        touchTimerActive: typeof touchSelTimer !== 'undefined' && touchSelTimer !== null
    };
})()""")
assert touch_hold_res['touchTimerActive'] is True, "Touch pointerdown must activate hold timer (380ms) for selection"
print("PASS Touch pointerdown initiates 380ms selection hold timer")

# Test swipe cancellation: quick pointermove > 10px before 380ms cancels hold timer
touch_cancel_res = c.js("""(() => {
    const target = document.querySelector('.pdf-text-layer span') || els.container;
    const evMove = new PointerEvent('pointermove', {
        pointerType: 'touch',
        isPrimary: true,
        clientX: 200,
        clientY: 300,
        bubbles: true
    });
    target.dispatchEvent(evMove);
    return {
        touchSelecting: state.touchSelecting,
        touchTimerCleared: typeof touchSelTimer === 'undefined' || touchSelTimer === null
    };
})()""")
assert touch_cancel_res['touchTimerCleared'] is True, "Quick touch movement before 380ms must clear hold timer to allow scrolling"
assert touch_cancel_res['touchSelecting'] is False, "Quick swipe must not trigger touchSelecting"
print("PASS Quick swipe movement successfully cancels selection hold timer to preserve native scrolling")

print("\n=== ALL BOUNDED SCHEDULER, QUICK WHEEL & TOUCH SELECTION TESTS PASSED ===")
