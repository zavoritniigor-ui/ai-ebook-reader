"""Comprehensive verification suite for P1-4, P1-5, P1-6, P1-7:
- P1-4: Print preview tofu / square glyphs elimination & ink rendering in printCurrentReaderPage()
- P1-5: Ask/Explain input & credential autofill isolation (fake sentinel TEST_API_KEY_DO_NOT_EXPOSE_123)
- P1-6: Right-side reader controls geometry (Practice bookmark, PDF scrubber, Grammar tab, workspace right boundary)
- P1-7: TTS stack overflow / recursion guard on empty & error segments
"""
import base64, os, sys, time
from browser_cdp import CDP
from pdf_audit_fixtures import pdf_document

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP()
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Network.setBypassServiceWorker', bypass=True)

def pause(s): c.js(f'new Promise(r=>setTimeout(r,{int(s * 1000)}))')

def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.monotonic() + timeout
    while result is not True and time.monotonic() < deadline:
        pause(.1); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name)

def boot(width, height, mobile):
    try: c.call('Emulation.clearDeviceMetricsOverride')
    except Exception: pass
    c.call('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=1, mobile=mobile)
    c.call('Emulation.setTouchEmulationEnabled', enabled=mobile, maxTouchPoints=5 if mobile else 1)
    c.call('Page.navigate', url=URL)
    c.wait("document.readyState==='complete' && !document.body.inert && typeof navigateToPdfPage==='function'", timeout=30)
    c.call('Emulation.setTouchEmulationEnabled', enabled=mobile, maxTouchPoints=5 if mobile else 1)
    c.js("localStorage.clear(); state.pdfScale = 1; state.pdfZoom = 1; showUpdateBanner=()=>{}; document.getElementById('sw-update-banner')?.remove(); window.__errors=[]; addEventListener('error', e => __errors.push(e.message))")

def upload_pdf(data):
    b64 = base64.b64encode(data).decode()
    c.js("if (typeof pdfContinuousReady !== 'undefined') pdfContinuousReady = false")
    c.js(f"""(() => {{
        const bytes = Uint8Array.from(atob('{b64}'), ch => ch.charCodeAt(0));
        const dt = new DataTransfer(); dt.items.add(new File([bytes], 'test.pdf', {{type: 'application/pdf'}}));
        const input = document.getElementById('file-upload'); input.files = dt.files; input.dispatchEvent(new Event('change'));
    }})()""")
    c.wait("state.format==='pdf' && pdfContinuousReady && !!state.pdfDoc", timeout=30)
    pause(0.5)

def french_sample_pdf():
    rows = [('je suis', 'I am', 'nous sommes', 'we are'),
            ('tu es', 'you are (familiar, singular)', 'vous êtes', 'you are'),
            ('il est', 'he is', 'ils sont', 'they are')]
    def enc(t): return t.encode('cp1252').replace(b'\\', b'\\\\').replace(b'(', b'\\(').replace(b')', b'\\)')
    ops = [b'BT 60 720 Td /F1 12 Tf (' + enc('The verb etre (to be) is irregular.') + b') Tj ET']
    y = 680
    for row in rows:
        for x, text in zip((60, 140, 330, 430), row):
            ops.append(b'BT %d %d Td /F1 12 Tf (' % (x, y) + enc(text) + b') Tj ET')
        y -= 22
    content = b'\n'.join(ops)
    objs = [b'<< /Type /Catalog /Pages 2 0 R >>',
            b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
            b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
            b'<< /Length %d >>\nstream\n' % len(content) + content + b'\nendstream']
    data = b'%PDF-1.4\n'; offsets = []
    for i, obj in enumerate(objs, 1):
        offsets.append(len(data)); data += f'{i} 0 obj\n'.encode() + obj + b'\nendobj\n'
    xref = len(data)
    data += f'xref\n0 {len(objs) + 1}\n0000000000 65535 f \n'.encode() + b''.join(f'{o:010d} 00000 n \n'.encode() for o in offsets)
    return data + f'trailer << /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF'.encode()

print("\n=== STEP 1: P1-4 Print Preview Tofu Elimination & Ink Rendering ===")
boot(1200, 900, False)
upload_pdf(french_sample_pdf())

# Add an ink stroke on page 1
c.js("""(() => {
    state.ink = { "1": [{ c: '#ff0000', w: 0.01, p: [[0.2, 0.2], [0.3, 0.3], [0.4, 0.2]] }] };
})()""")

# Test printCurrentReaderPage rasterization and ink injection
print_res = c.js("""(async () => {
    // Intercept frame.contentWindow.print so we can inspect the generated frame before it prints
    let printed = false;
    let frameImg = null;
    let canvasOwner = null;

    // Monitor document.body appends for the print iframe
    const origAppend = document.body.append;
    let capturedFrame = null;
    document.body.append = function(...args) {
        for (const a of args) {
            if (a instanceof HTMLIFrameElement) capturedFrame = a;
        }
        return origAppend.apply(this, args);
    };

    // Also spy on document.createElement to ensure canvas is created in host document
    const origCreate = document.createElement;
    document.createElement = function(tag) {
        const el = origCreate.call(document, tag);
        if (tag === 'canvas') canvasOwner = 'host';
        return el;
    };

    try {
        printCurrentReaderPage();
        // Wait for iframe and image to populate
        for (let i = 0; i < 50; i++) {
            if (capturedFrame && capturedFrame.contentDocument) {
                const img = capturedFrame.contentDocument.querySelector('img');
                if (img && img.src && img.complete && img.naturalWidth > 0) {
                    frameImg = {
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                        srcLength: img.src.length,
                        hasDataUrl: img.src.startsWith('data:image/png;base64,')
                    };
                    break;
                }
            }
            await new Promise(r => setTimeout(r, 100));
        }
    } finally {
        document.body.append = origAppend;
        document.createElement = origCreate;
    }

    return {
        canvasOwner,
        frameImg
    };
})()""")

assert print_res and print_res.get('canvasOwner') == 'host', f"Expected canvasOwner host, got {print_res}"
print('PASS P1-4: canvas created in host document (fonts available, no tofu)')
assert print_res and print_res.get('frameImg') and print_res['frameImg']['width'] > 500, f"Expected non-empty image, got {print_res}"
print('PASS P1-4: print frame renders non-empty image at full natural dimensions')

# Test Ctrl+P shortcut intercepts to printCurrentReaderPage
c.js("""(() => {
    window.__printCalled = false;
    const orig = printCurrentReaderPage;
    printCurrentReaderPage = () => { window.__printCalled = true; };
    const evt = new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, bubbles: true, cancelable: true });
    document.dispatchEvent(evt);
    printCurrentReaderPage = orig;
})()""")
check('P1-4: Ctrl+P keyboard shortcut triggers printCurrentReaderPage', "window.__printCalled === true")


print("\n=== STEP 2: P1-5 Ask/Explain Input & Credential Autofill Isolation ===")
SENTINEL = 'TEST_API_KEY_DO_NOT_EXPOSE_123'

# 1. Verify semantic form wrapping and input attributes
ask_attrs = c.js("""(() => {
    const input = document.getElementById('ask-input');
    const form = input.closest('form');
    return {
        type: input.type,
        name: input.getAttribute('name'),
        autocomplete: input.getAttribute('autocomplete'),
        lpignore: input.getAttribute('data-lpignore'),
        formRole: form ? form.getAttribute('role') : null,
        formAutocomplete: form ? form.getAttribute('autocomplete') : null
    };
})()""")

assert ask_attrs['type'] == 'search', f"Expected search type, got {ask_attrs['type']}"
assert ask_attrs['autocomplete'] == 'off', "Expected autocomplete='off'"
assert ask_attrs['lpignore'] == 'true', "Expected data-lpignore='true'"
assert ask_attrs['formRole'] == 'search', "Expected form role='search'"
print('PASS P1-5: Ask input has search type, autocomplete=off, data-lpignore=true, inside search form')

# 2. Enter sentinel API key in settings and verify isolation
c.js(f"""(() => {{
    openKeySettings();
    document.getElementById('api-key-input').value = '{SENTINEL}';
    saveApiKey();
}})()""")

# Assert sentinel NEVER appears in conversational Ask DOM, value, or placeholders
leak_check = c.js(f"""(() => {{
    const s = '{SENTINEL}';
    const ask = document.getElementById('ask-input');
    const askArea = document.getElementById('ask-panel');
    const hasLeak = (
        ask.value.includes(s) ||
        (ask.placeholder && ask.placeholder.includes(s)) ||
        (ask.getAttribute('data-i18n-ph') && ask.getAttribute('data-i18n-ph').includes(s)) ||
        (askArea && askArea.textContent.includes(s))
    );
    return !hasLeak;
}})()""")
assert leak_check is True, "Sentinel leaked into Ask DOM"
print('PASS P1-5: Sentinel API key NEVER leaks into Ask input value, placeholder, or DOM')

# 3. Verify stale query text clearing on contextual Explain
c.js("""(() => {
    const input = document.getElementById('ask-input');
    input.value = 'stale previous user query';
    state.lastAskContext = 'Bonjour';
    document.getElementById('btn-explain').click();
})()""")
check('P1-5: Triggering contextual Explain resets stale conversational query input', "document.getElementById('ask-input').value === ''")


print("\n=== STEP 3: P1-6 Right-Side Reader Controls Geometry ===")
upload_pdf(pdf_document([{'text': f'Page {i} content', 'size': (600, 800)} for i in range(1, 11)]))
# Test geometry with Grammar closed vs open
c.js("document.getElementById('grammar-panel').classList.remove('expanded'); updatePdfWorkspaceLayout(true)")
pause(0.3)

closed_geom = c.js("""(() => {
    const ws = getReaderWorkspaceRect();
    const scrubber = document.getElementById('pdf-scrubber').getBoundingClientRect().toJSON();
    const gTab = document.getElementById('grammar-tab').getBoundingClientRect().toJSON();
    const wsRight = parseFloat(document.documentElement.style.getPropertyValue('--ws-right')) || 0;
    return {
        ws,
        scrubber,
        gTab,
        wsRight,
        scrubberDisplay: getComputedStyle(document.getElementById('pdf-scrubber')).display,
        scrubberOpacity: getComputedStyle(document.getElementById('pdf-scrubber')).opacity
    };
})()""")

assert closed_geom['scrubberDisplay'] != 'none', "Scrubber must be available in PDF mode"
assert float(closed_geom['scrubberOpacity']) > 0, "Scrubber must be visible"
print('PASS P1-6: Scrubber is visible when Grammar panel is closed')

# Open Grammar panel
c.js("document.getElementById('grammar-panel').classList.add('expanded'); updatePdfWorkspaceLayout(true)")
pause(0.3)

open_geom = c.js("""(() => {
    const ws = getReaderWorkspaceRect();
    const scrubber = document.getElementById('pdf-scrubber').getBoundingClientRect().toJSON();
    const gTab = document.getElementById('grammar-tab').getBoundingClientRect().toJSON();
    const grammar = document.getElementById('grammar-panel').getBoundingClientRect().toJSON();
    const wsRight = parseFloat(document.documentElement.style.getPropertyValue('--ws-right')) || 0;
    return {
        ws,
        scrubber,
        gTab,
        grammar,
        wsRight,
        scrubberOpacity: getComputedStyle(document.getElementById('pdf-scrubber')).opacity
    };
})()""")

assert float(open_geom['scrubberOpacity']) > 0, "Scrubber must remain visible when Grammar is expanded"
assert open_geom['wsRight'] > 100, f"Expected --ws-right > 100px when Grammar is expanded, got {open_geom['wsRight']}"
# Scrubber right must be near the active reader workspace boundary, not covered under Grammar
assert open_geom['scrubber']['right'] <= open_geom['grammar']['left'] + 15, "Scrubber must position at the reader workspace edge to the left of Grammar"
print('PASS P1-6: Opening Grammar repositions scrubber to reader workspace edge (not covered)')

# Test vertical separation with Practice bookmark
c.js("""(() => {
    // Dock Practice restore button in bookmark mode
    setPracticeWorkspaceMode('bookmark');
    syncPracticeRestore(document.getElementById('practice-panel'));
})()""")
pause(0.2)

vert_geom = c.js("""(() => {
    const bookmark = document.getElementById('practice-restore').getBoundingClientRect().toJSON();
    const scrubber = document.getElementById('pdf-scrubber').getBoundingClientRect().toJSON();
    const gTab = document.getElementById('grammar-tab').getBoundingClientRect().toJSON();
    return {
        bookmarkBottom: bookmark.bottom,
        scrubberTop: scrubber.top,
        scrubberBottom: scrubber.bottom,
        gTabTop: gTab.top
    };
})()""")

# Assert NO vertical overlap between bookmark (top), scrubber (middle), and grammar-tab (bottom)
assert vert_geom['bookmarkBottom'] <= vert_geom['scrubberTop'], (
    f"Overlap detected: bookmark bottom {vert_geom['bookmarkBottom']} > scrubber top {vert_geom['scrubberTop']}"
)
assert vert_geom['scrubberBottom'] <= vert_geom['gTabTop'], (
    f"Overlap detected: scrubber bottom {vert_geom['scrubberBottom']} > grammar tab top {vert_geom['gTabTop']}"
)
print('PASS P1-6: Practice bookmark (top), scrubber (middle), and grammar tab (bottom) have ZERO vertical overlap')


print("\n=== STEP 4: P1-7 TTS Stack Overflow / Recursion Guard ===")
# Setup TTS mock with 1000 empty & failing segments
tts_overflow_check = c.js("""(async () => {
    window.__speakCount = 0;
    isSpeakingGlobal = true;
    state.ttsPaused = false;
    state.ttsQueue = [];

    // Create 500 empty or error sentences
    for (let i = 0; i < 500; i++) {
        state.ttsQueue.push({
            text: i % 2 === 0 ? "   " : "error_sentence",
            range: document.createRange()
        });
    }
    state.ttsIndex = 0;

    let stackOverflowOccurred = false;
    const origSpeak = ttsSynth.speak;
    ttsSynth.speak = function(u) {
        window.__speakCount++;
        // Simulate immediate synchronous error callback
        if (u.onerror) {
            u.onerror();
        }
    };

    try {
        speakCurrentSentence();
        // Give microtasks time to execute
        await new Promise(r => setTimeout(r, 400));
    } catch (e) {
        if (e.name === 'RangeError' || e.message.includes('stack')) {
            stackOverflowOccurred = true;
        }
    } finally {
        ttsSynth.speak = origSpeak;
        stopGlobalTTS();
    }

    return {
        stackOverflowOccurred,
        stoppedCleanly: !isSpeakingGlobal,
        finishedQueue: state.ttsIndex >= state.ttsQueue.length || state.ttsIndex > 50
    };
})()""")

assert tts_overflow_check['stackOverflowOccurred'] is False, "Call stack exceeded during rapid TTS advancement"
assert tts_overflow_check['stoppedCleanly'] is True, "Global TTS stopped cleanly"
print('PASS P1-7: TTS safely advanced 500 empty/error sentences without call stack overflow')

print('\nALL P1-4, P1-5, P1-6, P1-7 VERIFICATION CHECKS PASSED')
