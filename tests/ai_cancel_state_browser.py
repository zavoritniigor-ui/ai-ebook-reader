"""A3 / audit §12-2: a cancelled Ask AI request must not leave the panel "generating" forever -- and a cancelled
(old) request must never overwrite a newer loading state, answer, error or crop request.

Ownership rule under test: a cancelled request may leave the loading state only while no newer 'ask' request
holds the task slot, and may show "Request cancelled" + Retry only while the panel still shows its own view.
Cancellation goes through the app's real paths (stopBackgroundActivity -> cancelAsyncTasks, a newer request's
beginAsyncTask, the book epoch). Only callAI / callAIVision are mocked: controllable promises that reject with an
AbortError when aborted -- immediately or late -- like requestAI. No real AI provider is called.
"""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1280, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof settleCancelledAskRequest==='function'", timeout=30)
c.js(r"""(() => {
  localStorage.clear(); showUpdateBanner = () => {}; document.getElementById('sw-update-banner')?.remove();
  window.__errors = []; addEventListener('error', e => __errors.push(e.message)); addEventListener('unhandledrejection', e => __errors.push(String(e.reason)));
  state.apiKey = 'test-key-not-real'; state.activeAiProvider = 'gemini'; aiAvailable = () => true;
  // Every AI call is a pending promise the test settles. lateAbortMs: how late the AbortError arrives after abort.
  window.__calls = []; window.__lateAbortMs = 0;
  const pending = (kind, prompt, signal, onDelta) => new Promise((resolve, reject) => {
    const call = {kind, prompt, resolve, reject, onDelta, aborted: false};
    __calls.push(call);
    signal?.addEventListener('abort', () => { call.aborted = true;
      const fail = () => reject(new DOMException('Cancelled', 'AbortError'));
      __lateAbortMs ? setTimeout(fail, __lateAbortMs) : fail(); });
  });
  callAI = (prompt, signal, task, onDelta) => pending('text', prompt, signal, onDelta);
  callAIVision = (prompt, dataUrl, signal) => pending('vision', prompt, signal);
  // A tiny real JPEG for the crop attachment.
  const cv = document.createElement('canvas'); cv.width = 40; cv.height = 30; const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 40, 30); x.fillStyle = '#000'; x.fillRect(5, 5, 20, 10);
  window.__jpeg = cv.toDataURL('image/jpeg', .9);
  els.askPanel.classList.add('expanded');
  return 1; })()""")


def pause(s): c.js(f'new Promise(r => setTimeout(r, {int(s * 1000)}))')


def check(name, expression, timeout=0):
    deadline = time.monotonic() + timeout
    result = c.js(expression)
    while result is not True and time.monotonic() < deadline:
        time.sleep(.1); result = c.js(expression)
    assert result is True, (name, result, c.js("JSON.stringify({html: els.askContent.innerHTML.slice(0, 200), loading: els.askPanel.classList.contains('loading'), calls: __calls.length})"))
    print('PASS', name, flush=True)


SPINNER = "!!els.askContent.querySelector('.spinner-large')"
LOADING = "els.askPanel.classList.contains('loading')"
CANCELLED = "(els.askContent.querySelector('.ask-cancelled')?.textContent === t('aiRequestCancelled') && [...els.askContent.querySelectorAll('button')].some(b => b.textContent === t('retry')))"
RETRY = "[...els.askContent.querySelectorAll('button')].find(b => b.textContent === t('retry')).click()"


def reset():
    c.js("cancelAsyncTasks(); __calls.length = 0; __lateAbortMs = 0; els.askContent.textContent = ''; els.askPanel.classList.remove('loading', 'ready'); els.askPanel.classList.add('expanded'); if (askAttachment) clearAskAttachment(); state.activeAiProvider = 'gemini'; 1")
    pause(.1)


def ask(text='What does it mean?'):
    c.js("state.lastAskContext = 'Bonjour.'; startAiTask('Bonjour.', 'ask', %s); 1" % json.dumps(text)); pause(.1)


# A. Ask request -> cancelled by the app going to the background -> no newer request
reset(); ask()
check('A setup: the request is generating (spinner + loading)', f"{SPINNER} && {LOADING} && __calls.length === 1")
c.js("stopBackgroundActivity(); 1")
check('A cancelled Ask request: spinner gone, loading state removed', f"!{SPINNER} && !{LOADING}", timeout=2)
check('A ... shows the localized "Request cancelled" state with Retry', CANCELLED)

# A'. The page changes under the request (requestAI rejects with AbortError while the task is still current)
reset(); ask()
c.js("__calls[0].reject(new DOMException('Cancelled', 'AbortError')); 1")
check("A' page-change abort is shown as cancelled (not as a red server error)", f"!{SPINNER} && !{LOADING} && {CANCELLED} && !els.askContent.querySelector('span[style*=red]')", timeout=2)

# A''. Streaming (OpenAI): partial text is on screen when the request is cancelled
reset(); c.js("state.activeAiProvider = 'openai'; 1"); ask()
c.js("__calls[0].onDelta('x', 'Partial streamed answer'); 1"); pause(.1)
check("A'' streaming partial answer is shown while running", "els.askContent.textContent.includes('Partial streamed answer')")
c.js("stopBackgroundActivity(); 1")
check("A'' cancelled mid-stream: loading removed, cancelled state + Retry", f"!{LOADING} && {CANCELLED}", timeout=2)

# E. Retry after cancellation -> exactly one new AI request, which then answers normally
reset(); ask(); c.js("stopBackgroundActivity(); 1"); pause(.2)
n = c.js('__calls.length'); c.js(RETRY + "; 1"); pause(.2)
check('E Retry after cancellation starts exactly one new request (same question)', f"__calls.length === {n + 1} && __calls.at(-1).prompt === __calls[0].prompt && {SPINNER} && {LOADING}")
c.js("__calls.at(-1).resolve('Retried answer'); 1")
check('E ... and its answer is shown normally', f"els.askContent.textContent.includes('Retried answer') && !{LOADING} && els.askPanel.classList.contains('ready')", timeout=2)
pause(.3); check('E ... still exactly one new request', f"__calls.length === {n + 1}")

# C. Request A -> cancel A -> start request B; A's (late) cancellation must not overwrite B
reset(); c.js("__lateAbortMs = 400; 1"); ask('Question A')
c.js("stopBackgroundActivity(); 1"); ask('Question B')
check('C setup: B is generating', f"{SPINNER} && {LOADING} && els.askContent.textContent.includes('Bonjour')")
pause(.7)   # A's AbortError arrives now, after B started
check("C A's late cancellation does not touch B: B's spinner and loading state remain, no 'cancelled'", f"{SPINNER} && {LOADING} && !els.askContent.querySelector('.ask-cancelled')")
c.js("__calls.at(-1).resolve('Answer B'); 1")
check('C ... B then answers normally', f"els.askContent.textContent.includes('Answer B') && !{LOADING}", timeout=2)

# D. Request A -> request B succeeds; a late callback from A (resolve or error) cannot replace B's answer
reset(); ask('Question A'); ask('Question B')
check('D A was superseded (aborted) by B', "__calls[0].aborted === true && __calls.length === 2")
c.js("__calls[1].resolve('Answer B'); 1")
check('D B answered', "els.askContent.textContent.includes('Answer B')", timeout=2)
c.js("__calls[0].resolve('Answer A (late)'); 1"); pause(.3)
check("D a late RESULT from A does not replace B's answer", f"els.askContent.textContent.includes('Answer B') && !els.askContent.textContent.includes('Answer A') && !{LOADING}")
reset(); ask('Question A'); ask('Question B'); c.js("__calls[1].reject(new Error('Provider says no')); 1")
check('D B shows its own error', "els.askContent.textContent.includes('Provider says no')", timeout=2)
c.js("__calls[0].reject(new DOMException('Cancelled', 'AbortError')); 1"); pause(.3)
check("D a late cancellation from A does not replace B's error", "els.askContent.textContent.includes('Provider says no') && !els.askContent.querySelector('.ask-cancelled')")

# Book change: the reader resets the panel to its hint; the old request finishing late must leave that alone
reset(); ask('Question A')
c.js("readerEpoch.book++; els.askPanel.classList.remove('loading', 'ready'); els.askContent.textContent = t('askHint'); 1")
c.js("__calls[0].resolve('Answer about the old book'); 1"); pause(.3)
check('book change: a late answer for the old book neither appears nor replaces the new hint', f"els.askContent.textContent === t('askHint') && !{LOADING}")

# B. Crop request -> cancelled
reset(); c.js("attachToAsk(__jpeg); 1"); pause(.2); c.js("sendAskAttachment('What is this?'); 1"); pause(.1)
check('B setup: crop request generating, attachment marked sending', f"{SPINNER} && {LOADING} && __calls.at(-1).kind === 'vision' && askAttachment.sending === true")
c.js("stopBackgroundActivity(); 1")
check('B cancelled crop request: spinner gone and red/loading state removed', f"!{SPINNER} && !{LOADING}", timeout=2)
check('B ... "Request cancelled" + Retry shown', CANCELLED)
check('B ... the crop stays attached and can be sent again', "!!askAttachment && askAttachment.dataUrl === __jpeg && askAttachment.sending === false && !document.getElementById('ask-attachment').hidden")
n = c.js('__calls.length'); c.js(RETRY + "; 1"); pause(.1)
c.js("els.askSendBtn.click(); els.askSendBtn.click(); 1"); pause(.2)   # Send pressed during the retry: no second request
check('E crop Retry: exactly one new vision request with the same image (Send during it adds none)', f"__calls.length === {n + 1} && __calls.at(-1).kind === 'vision' && askAttachment.sending === true")
c.js("__calls.at(-1).resolve('Crop answer'); 1")
check('E ... answered: crop consumed as before (#133)', "els.askContent.textContent.includes('Crop answer') && !askAttachment", timeout=2)

# C/D for crop: an old crop request cannot overwrite a newer request
reset(); c.js("attachToAsk(__jpeg); 1"); pause(.2); c.js("__lateAbortMs = 400; sendAskAttachment('Old crop question'); 1"); pause(.1)
ask('Newer text question')
pause(.7)
check("C crop request superseded by a newer Ask: its late cancellation neither resets the newer view nor its loading state", f"{SPINNER} && {LOADING} && els.askContent.textContent.includes('Bonjour') && !els.askContent.querySelector('.ask-cancelled')")
c.js("__calls.at(-1).resolve('Newer answer'); 1")
# (Starting a text Ask collapses the panel, which by the existing #133 rule removes the attachment -- unchanged here.)
check('C ... the newer answer shows', "els.askContent.textContent.includes('Newer answer') && !els.askContent.querySelector('.ask-cancelled')", timeout=2)

check('no application errors', "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL AI CANCEL-STATE CHECKS PASSED')
