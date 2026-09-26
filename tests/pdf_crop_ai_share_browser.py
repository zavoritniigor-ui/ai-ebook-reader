"""PDF crop dialog: Save PNG / Share / Copy image / Send to AI.

Send to AI used to fire a fixed "check the exercise" vision request while the modal crop dialog stayed open (it
closed only on success): the spinner and every error were written into the Ask panel BEHIND the modal, so the
reader saw nothing; the answer was also dropped if the page changed meanwhile. Now the crop is attached to Ask AI
(visible chip, focused input), the reader's question and the image are sent together on Send, and loading/answer/
errors appear in the visible panel. Share uses the Web Share API from the tap itself and says WHY it is unavailable.

Only the network (provider endpoints), navigator.share/canShare and the clipboard are mocked; no real AI calls.
"""
import base64, json, os, time
from browser_cdp import CDP, pdf_bytes

c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Network.enable'); c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Emulation.setDeviceMetricsOverride', width=1280, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__errors = []; window.__ai = []; window.__aiMode = 'ok'; window.__shares = []; window.__shareMode = 'ok'; window.__copies = []; window.__downloads = [];
addEventListener('error', e => __errors.push(e.message));
addEventListener('unhandledrejection', e => __errors.push(String(e.reason)));
const realFetch = window.fetch;
window.fetch = (url, opts = {}) => {
  const u = String(url);
  const provider = u.includes('generativelanguage') ? 'gemini' : u.includes('api.groq.com') ? 'groq' : u.includes('api.openai.com') ? 'openai' : null;
  if (!provider) return realFetch(url, opts);
  const body = JSON.parse(opts.body); __ai.push({provider, body, at: performance.now(), page: state.currentIndex});
  const answer = 'Answer about the crop: <b>ok</b>';
  const ok = provider === 'gemini' ? {candidates: [{content: {parts: [{text: answer}]}, finishReason: 'STOP'}]}
    : provider === 'groq' ? {model: 'vision', choices: [{message: {content: answer}, finish_reason: 'stop'}]}
    : {model: 'gpt', status: 'completed', output: [{type: 'message', role: 'assistant', content: [{type: 'output_text', text: answer}]}]};
  const res = __aiMode === 'error' ? new Response(JSON.stringify({error: {code: 429, message: 'Resource exhausted', status: 'RESOURCE_EXHAUSTED'}}), {status: 429, headers: {'content-type': 'application/json'}})
    : new Response(JSON.stringify(ok), {status: 200, headers: {'content-type': 'application/json'}});
  return new Promise(r => setTimeout(() => r(res), 400));
};
// Web Share (Android share sheet) and the clipboard: record what the page hands over.
Object.defineProperty(navigator, 'canShare', {configurable: true, value: d => __shareMode !== 'nofiles' && !!(d && d.files && d.files.length)});
Object.defineProperty(navigator, 'share', {configurable: true, value: async d => {
  const f = d.files[0];
  __shares.push({name: f.name, type: f.type, size: f.size, active: navigator.userActivation.isActive});
  if (__shareMode === 'cancel') throw new DOMException('Share canceled', 'AbortError');
  if (__shareMode === 'denied') throw new DOMException('Permission denied', 'NotAllowedError');
}});
Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {write: async items => { __copies.push(items.map(i => i.types.join())); }}});
const click = HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click = function () { if (this.download) { __downloads.push({name: this.download, href: this.href}); return; } return click.call(this); };
''')
c.call('Page.navigate', url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert && typeof openCropPreview==='function'", timeout=30)
c.js("localStorage.clear(); showUpdateBanner = () => {}; document.getElementById('sw-update-banner')?.remove(); window.__toasts = []; const st = showToast; showToast = m => { __toasts.push(m); st(m); }; 1")


def pause(s): c.js(f'new Promise(r => setTimeout(r, {int(s * 1000)}))')


def check(name, expression, timeout=0):
    deadline = time.monotonic() + timeout
    result = c.js(expression)
    while result is not True and time.monotonic() < deadline:
        time.sleep(.1); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def click(sel):
    p = c.js("(b => ({x: b.left + b.width / 2, y: b.top + b.height / 2}))(document.querySelector(%s).getBoundingClientRect())" % json.dumps(sel))
    for kind in ('mousePressed', 'mouseReleased'):
        c.call('Input.dispatchMouseEvent', type=kind, x=p['x'], y=p['y'], button='left', clickCount=1)
    pause(.15)


def crop(page, dx=60, dy=60, w=260, h=160):
    """Real region selection: Region mode, then a mouse drag over the page."""
    c.js(f"goToPhysicalPage({page}, {{instant: true}}); 1"); c.wait(f"state.currentIndex === {page}", timeout=10); pause(.8)
    c.js("document.getElementById('btn-region').click(); 1"); pause(.2)
    b = c.js(f"(b => ({{x: b.left, y: b.top}}))(pdfPageWrappers[{page}].getBoundingClientRect())")
    x0, y0 = b['x'] + dx, max(b['y'], 0) + dy
    c.call('Input.dispatchMouseEvent', type='mousePressed', x=x0, y=y0, button='left', clickCount=1)
    for i in range(1, 9):
        c.call('Input.dispatchMouseEvent', type='mouseMoved', x=x0 + w * i / 8, y=y0 + h * i / 8, button='left', buttons=1)
    c.call('Input.dispatchMouseEvent', type='mouseReleased', x=x0 + w, y=y0 + h, button='left', clickCount=1)
    c.wait("document.getElementById('crop-dialog').open && document.getElementById('crop-preview').naturalWidth > 0", timeout=10)


def ask(question):
    # The Ask panel slides in (0.4 s transform): tap Send only once it has stopped moving.
    c.wait("""(() => { const x = document.getElementById('ask-send-btn').getBoundingClientRect().left;
      const same = window.__sendX === x; window.__sendX = x; return same && els.askPanel.classList.contains('expanded'); })()""", timeout=5)
    c.js("els.askInput.focus(); 1")
    if question:
        c.call('Input.insertText', text=question)
    click('#ask-send-btn')


b64 = base64.b64encode(pdf_bytes()).decode()
c.js(f"""(() => {{ const bytes = Uint8Array.from(atob({b64!r}), c => c.charCodeAt(0));
  const dt = new DataTransfer(); dt.items.add(new File([bytes], 'crop-book.pdf', {{type: 'application/pdf'}}));
  const i = document.getElementById('file-upload'); i.files = dt.files; i.dispatchEvent(new Event('change')); }})()""")
c.wait("state.format === 'pdf' && pdfContinuousReady && !!state.pdfDoc", timeout=60)
c.js("state.activeAiProvider = 'gemini'; state.apiKey = 'test-key-not-real'; 1")

# 1 crop, 2 Save PNG, 3 Copy image
crop(7)
check('1 crop dialog shows the cropped image', "document.getElementById('crop-preview').naturalWidth > 100")
click('#crop-save')
check('2 Save PNG downloads a .png of the crop', "__downloads.length === 1 && /^pdf-page-7\\.png$/.test(__downloads[0].name) && __downloads[0].href.startsWith('blob:')")
click('#crop-copy')
check('3 Copy image puts an image/png on the clipboard', "JSON.stringify(__copies) === JSON.stringify([['image/png']]) && document.getElementById('crop-status').textContent.includes('Copied')")

# 10 native share (supported), from the tap itself
click('#crop-share')
check('10 Share hands one non-empty image/png File to the OS share sheet, inside the tap (user activation active)',
      "__shares.length === 1 && __shares[0].type === 'image/png' && __shares[0].size > 1000 && /\\.png$/.test(__shares[0].name) && __shares[0].active === true")
# 13 user cancels the share sheet; share refused
c.js("__shareMode = 'cancel'; 1"); click('#crop-share')
check('13 cancelling the share sheet is silent (no error message)', "__shares.length === 2 && document.getElementById('crop-status').textContent === ''")
c.js("__shareMode = 'denied'; 1"); click('#crop-share')
check('13 a refused share says so, with the reason', "document.getElementById('crop-status').textContent.startsWith(t('shareFailed')) && document.getElementById('crop-status').textContent.includes('NotAllowedError')")
# 12 files not shareable; 11 no Web Share at all
c.js("__shareMode = 'nofiles'; 1"); click('#crop-share')
check('12 browser cannot share files: clear message, no share attempted', "__shares.length === 3 && document.getElementById('crop-status').textContent === t('shareFilesUnsupported')")
c.js("window.__savedShare = navigator.share; Object.defineProperty(navigator, 'share', {configurable: true, value: undefined}); 1"); click('#crop-share')
check('11 no Web Share API: clear message naming the fallbacks', "document.getElementById('crop-status').textContent === t('shareUnsupported') && /Save PNG/.test(t('shareUnsupported'))")
c.js("Object.defineProperty(navigator, 'share', {configurable: true, value: __savedShare}); __shareMode = 'ok'; 1")
check('Save PNG and Copy image remain available as fallbacks', "!!document.getElementById('crop-save') && !!document.getElementById('crop-copy')")

# 4 / 5: Send to AI attaches, does not ask yet
click('#crop-ai')
check('4 Send to AI closes the crop dialog and opens Ask AI', "!document.getElementById('crop-dialog').open && els.askPanel.classList.contains('expanded')")
check('5 the crop is visibly attached (thumbnail + label), input focused, placeholder invites a question', timeout=2, expression=
      "!document.getElementById('ask-attachment').hidden && document.getElementById('ask-attachment-img').naturalWidth > 0 && document.activeElement === els.askInput && els.askInput.placeholder === t('cropAskPlaceholder')")
pause(.6)
check('5 no AI request is spent before the reader asks', "__ai.length === 0")

# 6 / 7: question + image -> answer
ask('Translate this paragraph.')
pause(.8)
check('6 one request carries the question AND the image (Gemini inline_data, image/jpeg)',
      "__ai.length === 1 && (b => { const parts = b.contents[0].parts; return parts.some(p => p.text && p.text.startsWith('Translate this paragraph.')) && parts.some(p => p.inline_data && p.inline_data.mime_type === 'image/jpeg' && p.inline_data.data.length > 1000); })(__ai[0].body)", timeout=3)
check('7 the answer appears in the visible Ask panel', "els.askContent.textContent.includes('Answer about the crop') && els.askPanel.classList.contains('expanded')", timeout=5)
check('17 an answered crop is consumed (chip gone)', "document.getElementById('ask-attachment').hidden && els.askInput.placeholder === t('ask')")

# Enter on the keyboard (tablet "send" key) sends exactly once too
pause(.8); crop(8); click('#crop-ai'); n = c.js('__ai.length')
c.js("els.askInput.focus(); 1"); c.call('Input.insertText', text='What is this?')
for kind in ('keyDown', 'char', 'keyUp'):
    c.call('Input.dispatchKeyEvent', type=kind, key='Enter', code='Enter', windowsVirtualKeyCode=13, text='\r' if kind == 'char' else None) if kind == 'char' else c.call('Input.dispatchKeyEvent', type=kind, key='Enter', code='Enter', windowsVirtualKeyCode=13)
check('Enter sends the question + image exactly once (no second, empty-question request)',
      f"els.askContent.textContent.includes('Answer about the crop') && __ai.length === {n + 1}", timeout=5)
pause(.8); check('... still exactly one request after settling', f"__ai.length === {n + 1}")

# 17: a later plain question never re-sends the old crop
c.js("state.lastAskContext = 'Hello world.'; 1"); ask('What is a noun?')
check('17 the next ordinary question carries no image', "__ai.length === 3 && !JSON.stringify(__ai[2].body).includes('inline_data')", timeout=5)
pause(.8)

# 8: error is visible, attachment kept, Retry works; answer survives page change
crop(9); click('#crop-ai'); c.js("__aiMode = 'error'; 1")
ask('Explain this exercise.')
check('8 AI error is shown in the visible Ask panel (not behind a dialog) with Retry',
      "!document.getElementById('crop-dialog').open && /ліміт|limit|quota|квот/i.test(els.askContent.textContent) && [...els.askContent.querySelectorAll('button')].some(b => b.textContent === t('retry'))", timeout=5)
check('8 the crop stays attached after an error', "!document.getElementById('ask-attachment').hidden")
c.js("__aiMode = 'ok'; [...els.askContent.querySelectorAll('button')].find(b => b.textContent === t('retry')).click(); 1")
pause(.1); c.js("goToPhysicalPage(12, {instant: true}); 1")   # the reader scrolls on while the answer is coming
check('8 Retry resends the same question + image; the answer is kept although the page changed meanwhile',
      "(a => a.body.contents[0].parts.some(p => p.text && p.text.startsWith('Explain this exercise.')) && a.body.contents[0].parts.some(p => p.inline_data))(__ai.at(-1)) && els.askContent.textContent.includes('Answer about the crop')", timeout=5)

# 15: a new crop replaces the old attachment; 16: closing Ask AI removes it
crop(3, dx=40, dy=40, w=300, h=120); click('#crop-ai'); first = c.js("document.getElementById('ask-attachment-img').src")
crop(5, dx=80, dy=200, w=200, h=220); click('#crop-ai'); second = c.js("document.getElementById('ask-attachment-img').src")
assert first != second, 'the second crop must replace the first'
ask('')   # empty question: the existing exercise check, on explicit Send only
check('15 a new crop replaces the old attachment: exactly the new image is sent',
      "(a => a.body.contents[0].parts.some(p => p.inline_data && %s.endsWith(p.inline_data.data)))(__ai.at(-1))" % json.dumps(second), timeout=5)
check('empty question + Send = the existing exercise check prompt', "__ai.at(-1).body.contents[0].parts.some(p => p.text && p.text.startsWith('Вправа з підручника'))")
pause(.8)
crop(6); click('#crop-ai')
c.js("document.querySelector('#ask-panel .close-panel-btn').click(); 1"); pause(.2)
check('16 closing Ask AI removes the attachment', "document.getElementById('ask-attachment').hidden")
n = c.js('__ai.length'); c.js("els.askPanel.classList.add('expanded'); state.lastAskContext = 'Hello world.'; 1"); ask('Is this stale?')
check('16/17 after closing, the next question is sent without the old crop', f"__ai.length === {n + 1} && !JSON.stringify(__ai.at(-1).body).includes('inline_data')", timeout=5)
pause(.8)
crop(6); click('#crop-ai'); c.js("document.getElementById('ask-attachment-remove').click(); 1")
check('✕ removes the attachment', "document.getElementById('ask-attachment').hidden && document.activeElement === els.askInput")

# 9: every configured provider gets a well-formed multimodal request
for provider, key, expr in (
        ('groq', 'groqKey', "a => a.body.model === GROQ_VISION_MODEL && a.body.messages[0].content.some(p => p.type === 'image_url' && p.image_url.url.startsWith('data:image/jpeg;base64,'))"),
        ('openai', 'openaiKey', "a => JSON.stringify(a.body.input).includes('input_image') && JSON.stringify(a.body.input).includes('data:image/jpeg;base64,')")):
    if not c.js(f"typeof AI_PROVIDERS['{provider}'] === 'object'"):
        continue
    c.js(f"state.activeAiProvider = '{provider}'; state[AI_PROVIDERS['{provider}'].key] = 'test-key-not-real'; 1")
    crop(4); click('#crop-ai'); ask('What does this say?')
    check(f'9 {provider}: image sent in its multimodal format (vision-capable model)', f"__ai.at(-1).provider === '{provider}' && ({expr})(__ai.at(-1))", timeout=5)
    check(f'9 {provider}: answer shown', "els.askContent.textContent.includes('Answer about the crop')", timeout=5)
    pause(.6)

# no key: a clear message, nothing sent
c.js("state.activeAiProvider = 'gemini'; state.apiKey = ''; 1"); n = c.js('__ai.length')
crop(8); click('#crop-ai')
check('no AI key: the dialog stays with the crop and says why; nothing attached or sent',
      f"document.getElementById('crop-dialog').open && document.getElementById('crop-status').textContent === t('needKey') && document.getElementById('ask-attachment').hidden && __ai.length === {n}")
c.js("document.getElementById('crop-cancel').click(); 1")

# 14: repeated crop + share
c.js("__shareMode = 'ok'; __shares.length = 0; 1")
crop(10); click('#crop-share'); c.js("document.getElementById('crop-cancel').click(); 1")
crop(11, w=180, h=90); click('#crop-share')
check('14 repeated crop/share: each share sends its own new crop', "__shares.length === 2 && __shares[0].name === 'pdf-page-10.png' && __shares[1].name === 'pdf-page-11.png' && __shares[0].size !== __shares[1].size")
c.js("document.getElementById('crop-cancel').click(); 1")
check('no application errors', "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL PDF CROP AI/SHARE CHECKS PASSED')
