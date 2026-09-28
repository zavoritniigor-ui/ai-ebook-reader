"""Astra audit P1-3: with no AI configured, Explain and Level must not destroy or change the reader's work.

Before the fix both handlers (js/grammar-svo.js) recorded "help requested" for the span and cleared the typed Ask
question, and only then called startAiTask(), which is where the missing key was noticed. Now they show the usual
"need key" message first and change nothing: the draft stays, no help is recorded, no AI request is made -- and
once a key is configured the same actions (and Send with the preserved draft) work through their normal paths.

A real TXT book is opened and a word is tapped in learning mode, so the reading-help statistics are live.
recordHelpForSpan is spied on (the real one still runs); callAI is mocked (no real AI provider is called).
"""
import base64, json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1400, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof startAiTask==='function'", timeout=30)
c.js("localStorage.clear(); 1"); c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof startAiTask==='function'", timeout=30)


def pause(s): c.js(f'new Promise(r => setTimeout(r, {int(s * 1000)}))')


def check(name, expression, timeout=0):
    deadline = time.monotonic() + timeout
    result = c.js(expression)
    while result is not True and time.monotonic() < deadline:
        time.sleep(.1); result = c.js(expression)
    assert result is True, (name, result, c.js("JSON.stringify({input: els.askInput.value, help: __help, ai: __ai.length, toasts: __toasts, ctx: state.lastAskContext, content: els.askContent.textContent.slice(0, 80)})"))
    print('PASS', name, flush=True)


def click(sel):
    # The Ask panel slides in: wait until the button stops moving, then click it like a user.
    c.wait("""(() => { const x = document.querySelector(%s).getBoundingClientRect().left; const same = window.__lastX === x;
      window.__lastX = x; return same && els.askPanel.classList.contains('expanded'); })()""" % json.dumps(sel), timeout=5)
    p = c.js("(r => ({x: r.left + r.width / 2, y: r.top + r.height / 2}))(document.querySelector(%s).getBoundingClientRect())" % json.dumps(sel))
    for kind in ('mousePressed', 'mouseReleased'):
        c.call('Input.dispatchMouseEvent', type=kind, x=p['x'], y=p['y'], button='left', clickCount=1)
    pause(.25)


TEXT = ('Le chat dort sur le canapé. Il fait beau aujourd\'hui dans la ville. ' * 12 + '\n') * 6
b64 = base64.b64encode(TEXT.encode()).decode()
c.js(f"""(() => {{ showUpdateBanner = () => {{}}; document.getElementById('sw-update-banner')?.remove();
  window.__errors = []; addEventListener('error', e => __errors.push(e.message));
  const bytes = Uint8Array.from(atob({b64!r}), c => c.charCodeAt(0)); const dt = new DataTransfer();
  dt.items.add(new File([bytes], 'preserve.txt', {{type: 'text/plain'}}));
  const i = document.getElementById('file-upload'); i.files = dt.files; i.dispatchEvent(new Event('change')); return 1; }})()""")
c.wait("state.format === 'txt' && !!state.bookKey", timeout=20); pause(.6)
c.js(r"""(() => {
  // No AI configured on any provider.
  state.activeAiProvider = 'gemini'; state.apiKey = ''; state.groqKey = ''; state.openaiKey = '';
  window.__ai = []; callAI = async (prompt, signal, task) => { __ai.push({prompt, task}); return '<p>Model answer</p>'; };
  window.__help = []; const realHelp = recordHelpForSpan; recordHelpForSpan = (span, source) => { __help.push(source); return realHelp(span, source); };
  window.__toasts = []; const realToast = showToast; showToast = m => { __toasts.push(m); realToast(m); };
  aiTranslateText = async () => null; machineTranslate = async () => ({html: 'cat', extras: ''}); speakText = () => {};
  state.translateMode = true; return 1; })()""")

# A reader help context: tap a word in learning mode (records its own 'word_tap' help, as usual).
p = c.js("""(() => { const w = document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) {
  const i = n.nodeValue.indexOf('canapé'); if (i < 0) continue; const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 6);
  const b = r.getBoundingClientRect(); if (b.width) return {x: b.left + b.width / 2, y: b.top + b.height / 2}; } })()""")
for kind in ('mousePressed', 'mouseReleased'):
    c.call('Input.dispatchMouseEvent', type=kind, x=p['x'], y=p['y'], button='left', clickCount=1)
c.wait("!!lastReaderHelpContext && state.ctxSentence.includes('canapé')", timeout=8)
# The Ask context of an earlier question about this sentence (only an AI request sets it).
c.js("els.ttCloseBtn.click(); state.lastAskContext = state.ctxSentence; __help.length = 0; 1"); pause(.3)

# The reader's own work: an open Ask panel with previous content and a typed, unsent question.
DRAFT = 'Pourquoi « canapé » est masculin ?'
c.js("els.askPanel.classList.add('expanded'); els.askContent.innerHTML = '<p id=\"prev-answer\">Previous answer</p>'; 1"); pause(.5)
c.js("els.askInput.focus(); 1"); c.call('Input.insertText', text=DRAFT)
c.js("window.__ctx = state.lastAskContext; 1")
UNCHANGED = ("els.askInput.value === %s && !!document.getElementById('prev-answer') && state.lastAskContext === __ctx"
             " && __help.length === 0 && __ai.length === 0" % json.dumps(DRAFT))

for label, sel in (('Explain', '#btn-explain'), ('Level', '#btn-lang-level')):
    n = c.js('__toasts.length'); click(sel)
    check(f'{label} without AI: the typed question, previous answer and context are untouched', UNCHANGED)
    check(f'{label} without AI: the usual "need key" message is shown', f"__toasts.length === {n + 1} && __toasts.at(-1) === t('needKey')")
    check(f'{label} without AI: no AI request, no "help requested" recorded', "__ai.length === 0 && !__help.includes('ask_ai')")
    check(f'{label} without AI: the Ask panel stays open', "els.askPanel.classList.contains('expanded')")

for _ in range(3):
    click('#btn-explain'); click('#btn-lang-level')
check('repeated missing-key attempts (3x Explain + Level) still destroy nothing', UNCHANGED + " && __toasts.filter(m => m === t('needKey')).length === 8")

# The same flows through the Quick Wheel's one-shot selection context
c.js("quickWheelContext = {selectionText: 'Il fait beau', lastAskContext: 'Il fait beau', lastGrammarSentence: '', lastReaderHelpContext}; 1")
click('#btn-lang-level')
check('Level via the Quick Wheel context without AI: still nothing destroyed or recorded', UNCHANGED)

# Configure AI: the preserved draft is still there, and everything works through the normal paths.
c.js("state.apiKey = 'test-key-not-real'; 1")
check('after configuring AI the original draft is still available', "els.askInput.value === %s" % json.dumps(DRAFT))
click('#btn-explain')
check('configured Explain: one normal Ask request for the reading context, answer shown, help recorded',
      "__ai.length === 1 && __ai[0].task === 'ask' && __ai[0].prompt.includes('canapé') && __help.filter(s => s === 'ask_ai').length === 1", timeout=3)
check('configured Explain: its answer is shown', "els.askContent.textContent.includes('Model answer')", timeout=3)
check('configured Explain: clears the Ask field as before (existing behavior)', "els.askInput.value === ''")
c.js("els.askPanel.classList.add('expanded'); 1"); pause(.4)
click('#btn-lang-level')
check('configured Level: one normal language-level request, answer shown',
      "__ai.length === 2 && __ai[1].task === 'language_level' && els.askContent.textContent.includes('Model answer')", timeout=3)

# A draft kept through a missing-key Explain can then simply be sent
c.js("state.apiKey = ''; els.askPanel.classList.add('expanded'); 1"); pause(.4)
c.js("els.askInput.focus(); els.askInput.value = ''; 1"); c.call('Input.insertText', text=DRAFT)
click('#btn-explain')
check('missing key again: draft kept', "els.askInput.value === %s && __ai.length === 2" % json.dumps(DRAFT))
c.js("state.apiKey = 'test-key-not-real'; 1"); click('#ask-send-btn')
check('after configuring AI, Send sends exactly the preserved draft', "__ai.length === 3 && __ai[2].prompt.includes(%s)" % json.dumps(DRAFT), timeout=3)
check('no application errors', "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL AI-KEY PRESERVE CHECKS PASSED')
