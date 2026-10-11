"""Audit fixes (2026-10-11). Streaming Ask/Level (OpenAI Responses SSE): a stream that stalls AFTER its headers ends with a
retryable timeout instead of a spinner forever; an "incomplete" (token cap) or "failed" stream is an error, not a complete
answer; a normal stream resolves on response.completed even if the connection stays open; several content parts are all kept.
Also: the five Ask/crop strings exist in every UI language, and the dead S-V-O code is gone. Streams are synthetic
(ReadableStream), no network."""
import os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && typeof parseOpenAIStream==='function'", timeout=30)


def check(name, expression, timeout=0):
    result = c.js(expression); end = time.time() + timeout
    while result is not True and time.time() < end:
        time.sleep(0.1); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


# helper: a stream of SSE events; close=False keeps the connection open after the last event
c.js("""window.__sse = (events, close) => { const enc = new TextEncoder(); return new ReadableStream({ start(ctrl) {
  for (const e of events) ctrl.enqueue(enc.encode('data: ' + JSON.stringify(e) + '\\n\\n')); if (close) ctrl.close(); } }).getReader(); };
window.__run = (events, close, idle) => { window.__out = null; const deltas = [];
  parseOpenAIStream(__sse(events, close), null, d => deltas.push(d), idle).then(r => { __out = {ok: true, text: r.result, deltas}; }, e => { __out = {ok: false, reason: e.reason, partial: e.partial, msg: e.message, deltas}; }); return 1; };""")

c.js("__run([{type: 'response.output_text.delta', delta: 'Bonjour'}], false, 400)")
check("1 a stream that stalls mid-answer ends with a retryable TIMEOUT (not a spinner forever); what arrived was shown",
      "!!__out && __out.ok === false && __out.reason === 'timeout' && __out.deltas.join('') === 'Bonjour' || JSON.stringify(__out)", timeout=3)

c.js("__run([{type: 'response.output_text.delta', delta: 'Le passé '}, {type: 'response.incomplete', response: {incomplete_details: {reason: 'max_output_tokens'}}}], true, 2000)")
check("2 an 'incomplete' stream (token cap) is a TRUNCATED error that keeps the partial text, not a complete answer",
      "!!__out && __out.ok === false && __out.reason === 'truncated' && __out.partial === 'Le passé ' || JSON.stringify(__out)", timeout=3)

c.js("__run([{type: 'response.output_text.delta', delta: 'x'}, {type: 'response.failed', response: {error: {message: 'server overloaded'}}}], true, 2000)")
check("3 a 'failed' stream is a provider error", "!!__out && __out.ok === false && __out.reason === 'provider_error' || JSON.stringify(__out)", timeout=3)

c.js("__run([{type: 'response.output_text.delta', delta: 'Un '}, {type: 'response.output_text.delta', delta: 'deux'}, {type: 'response.completed', response: {}}], false, 5000)")
check("4 a normal stream resolves on response.completed even if the connection stays open (no wait for the idle limit)",
      "!!__out && __out.ok === true && __out.text === 'Un deux' || JSON.stringify(__out)", timeout=2)

c.js("__run([{type: 'response.output_text.delta', delta: 'A'}, {type: 'response.output_text.done'}, {type: 'response.output_text.delta', delta: 'B'}, {type: 'response.completed', response: {}}], true, 2000)")
check("5 several content parts: text after one part's output_text.done is kept", "!!__out && __out.ok === true && __out.text === 'AB' || JSON.stringify(__out)", timeout=3)

check("6 the Ask/crop strings exist in all 8 UI languages",
      """(() => { const bad = []; for (const k of ['aiRequestCancelled', 'cropAttached', 'cropRemove', 'cropAskPlaceholder', 'shareFailed']) for (const l of ['uk','en','fr','ru','zh','ko','hi','ga']) if (!I18N[k] || !I18N[k][l]) bad.push(k + ':' + l); return bad.length === 0 || JSON.stringify(bad); })()""")
check("7 the retired S-V-O code is gone", "['analyzeSVO', 'applySVOParts', 'localSVO', 'buildSvoPrompt', 'svoToken'].every(n => typeof window[n] === 'undefined') && !document.getElementById('tt-svo-btn')")
print('ALL AI STREAM / AUDIT CHECKS PASSED')
