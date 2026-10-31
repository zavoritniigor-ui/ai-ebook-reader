"""Groq streams Ask AI and Language level (2026-10-31: «як щодо швидкості відповіді від AI»).

Every request starts on Groq (routing 'auto'), but only OpenAI streamed, so for Ask AI the reader stared at a spinner until
the whole answer (up to 1200 tokens) was ready. js/ai-client.js now streams Groq for the tasks whose OpenAI profile streams.

Checked with mocked providers (no network, no real keys): the answer appears in the Ask panel while Groq is still writing;
the final text is the whole answer; the request asks for stream:true and Groq alone answers; the diagnostics record the time
to the first words; a word translation still goes WITHOUT streaming; a Groq stream cut by the connection, or cut by the
token cap, falls back to OpenAI and only OpenAI's answer remains on screen; a Groq reply that is plain JSON despite
stream:true (a proxy that ignores it) is still shown.
"""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1280, height=900, deviceScaleFactor=1, mobile=False)
boot = c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
try { localStorage.setItem('reader_groq_key', 'gsk_test_only_not_real'); localStorage.setItem('reader_openai_key', 'sk-test-only-not-real');
      localStorage.setItem('reader_ai_routing', 'auto'); } catch (e) {}
window.__calls = []; window.__errors = []; window.__groqMode = 'stream';
addEventListener('error', e => __errors.push(e.message));
addEventListener('unhandledrejection', e => __errors.push(String(e.reason)));
const real = window.fetch;
const sse = (events, delay, finish) => {
  const enc = new TextEncoder(); let i = 0;
  return new Response(new ReadableStream({ async pull(ctrl) {
    if (i >= events.length) { if (finish) ctrl.enqueue(enc.encode(finish)); ctrl.close(); return; }
    await new Promise(r => setTimeout(r, delay)); ctrl.enqueue(enc.encode('data: ' + JSON.stringify(events[i++]) + '\n\n'));
  } }), { headers: { 'content-type': 'text/event-stream' } });
};
window.fetch = async (url, options = {}) => {
  const address = String(url);
  const provider = address.includes('api.groq.com') ? 'groq' : address.includes('api.openai.com') ? 'openai' : null;
  if (!provider) return real(url, options);
  const body = JSON.parse(options.body);
  __calls.push({ provider, stream: !!body.stream, task: body.messages ? 'chat' : 'responses' });
  if (provider === 'openai') {
    const text = '<p>OpenAI answer</p>';
    if (body.stream) return sse([{ type: 'response.output_text.delta', delta: text }, { type: 'response.completed', response: {} }], 10);
    return new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text }] }] }));
  }
  if (!body.stream) return new Response(JSON.stringify({ choices: [{ message: { content: 'Слово' }, finish_reason: 'stop' }] }));
  const parts = ['<p>Groq ', 'streams ', 'its ', 'answer ', 'piece by piece.</p>'];
  const deltas = parts.map(p => ({ choices: [{ delta: { content: p }, finish_reason: null }] }));
  if (__groqMode === 'stream') return sse(deltas.concat([{ choices: [{ delta: {}, finish_reason: 'stop' }], x_groq: { usage: { prompt_tokens: 10, completion_tokens: 5 } } }]), 350, 'data: [DONE]\n\n');
  if (__groqMode === 'cut') return sse(deltas.slice(0, 2), 50, null);   // the connection drops: no finish, no [DONE]
  if (__groqMode === 'length') return sse(deltas.slice(0, 2).concat([{ choices: [{ delta: {}, finish_reason: 'length' }] }]), 50, 'data: [DONE]\n\n');
  if (__groqMode === 'json') return new Response(JSON.stringify({ choices: [{ message: { content: '<p>Groq JSON answer</p>' }, finish_reason: 'stop' }] }));
};
''')['identifier']
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof startAiTask==='function'", timeout=30)
c.call('Page.removeScriptToEvaluateOnNewDocument', identifier=boot)
c.js("showUpdateBanner = () => {}; 1")


def check(name, expression, timeout=0):
    deadline = time.monotonic() + timeout
    result = c.js(expression)
    while result is not True and time.monotonic() < deadline:
        time.sleep(.05); result = c.js(expression)
    assert result is True, (name, result, c.js("JSON.stringify({calls: __calls, text: els.askContent.textContent.slice(0, 200), log: readerAiRequests().slice(-3)})"))
    print('PASS', name, flush=True)


ASK = "(() => { __calls.length = 0; startAiTask('The wise man obtains the confidence of the people.', 'ask', 'What does this mean?'); return 1; })()"
TEXT = "els.askContent.textContent"

check('0 the routing starts Ask on Groq (own Groq and OpenAI keys)', "aiProviderForTask('ask') === 'groq'")

c.js(ASK)
check('1 the first words appear in the Ask panel while Groq is still writing',
      "/Groq streams/.test(%s) && !/piece by piece/.test(%s)" % (TEXT, TEXT), timeout=4)
check('1b ... then the whole answer stands there', "/Groq streams its answer piece by piece\\./.test(%s) && els.askPanel.classList.contains('ready')" % TEXT, timeout=6)
check('2 the request asked Groq for a stream, and Groq alone answered',
      "__calls.length === 1 && __calls[0].provider === 'groq' && __calls[0].stream === true")
check('3 the diagnostics record the time to the first words',
      "(e => e.provider === 'groq' && e.ok === true && Number.isFinite(e.firstMs) && e.firstMs < e.ms)(readerAiRequests().at(-1))")

check('4 a word translation still goes to Groq WITHOUT streaming (it shows nothing until complete)',
      """(async () => { __calls.length = 0; const out = await callAI('Translate one word', new AbortController().signal, 'translation');
         return out === 'Слово' && __calls.length === 1 && __calls[0].provider === 'groq' && __calls[0].stream === false; })()""")

c.js("window.__groqMode = 'cut'; 1"); c.js(ASK)
check('5 a Groq stream cut by the connection falls back to OpenAI, and only OpenAI\'s answer remains',
      "/OpenAI answer/.test(%s) && !/Groq/.test(%s) && __calls.map(x => x.provider).join() === 'groq,openai'" % (TEXT, TEXT), timeout=8)

c.js("window.__groqMode = 'length'; 1"); c.js(ASK)
check('6 a Groq stream cut by the token cap falls back to OpenAI too', "/OpenAI answer/.test(%s) && !/Groq/.test(%s)" % (TEXT, TEXT), timeout=8)

c.js("window.__groqMode = 'json'; 1"); c.js(ASK)
check('7 a plain JSON reply to a stream request (a proxy that ignores stream:true) is still shown, with no fallback',
      "/Groq JSON answer/.test(%s) && __calls.map(x => x.provider).join() === 'groq'" % TEXT, timeout=6)

check('8 nothing threw', "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL GROQ STREAM CHECKS PASSED')
