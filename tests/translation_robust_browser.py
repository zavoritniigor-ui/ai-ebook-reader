"""AI sentence translation must not fail on ordinary replies: the answer budget scales with the text (it was a fixed
128/256 tokens, so a sentence + word-alignment JSON was cut off and the popup said "the AI could not translate"); fenced or
wrapped JSON is accepted; a cut-off reply still yields its translation; a reply without usable JSON falls back to one plain
translation request. Stubbed callAI; no network."""
import os
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof aiTranslateText==='function'", timeout=30)
c.js("aiAvailable = () => true; state.groqKey = 'test'; state.targetLang = 'uk'; 1")


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


SENT = "Hier, Marie a mangé une pomme dans le jardin avant de partir au travail avec son frère."
LONG = SENT * 6
STUB = """window.__calls = []; window.__replies = [];
  callAI = async (prompt, signal, task, onDelta, options) => { __calls.push({task, options: options || {}, alignment: prompt.includes('alignment')});
    const r = __replies.shift(); if (r instanceof Error) throw r; return r; };"""
c.js(STUB + "1")
check('1 the answer budget grows with the sentence (was a fixed 128/256 tokens)', f"""(async () => {{
  __replies = ['{{"translation":"Вчора Марія з\\'їла яблуко.","alignment":[]}}', '{{"translation":"Довгий переклад.","alignment":[]}}'];
  await aiTranslateText({SENT!r}, 'fr', null, 'uk', '', true); await aiTranslateText({LONG!r}, 'fr', null, 'uk', '', true);
  return __calls[0].options.maxOutputTokens >= 600 && __calls[1].options.maxOutputTokens > __calls[0].options.maxOutputTokens || JSON.stringify(__calls); }})()""")
c.js(STUB + "1")
check('2 JSON wrapped in a ```json fence is accepted', f"""(async () => {{ __replies = ['```json\\n{{"translation":"Вчора Марія з\\'їла яблуко.","alignment":[]}}\\n```'];
  const r = await aiTranslateText({SENT!r}, 'fr', null, 'uk', '', true); return !!r && r.translation.startsWith('Вчора') || JSON.stringify(r); }})()""")
c.js(STUB + "1")
check('3 a cut-off reply (truncated) still gives the translation that arrived', f"""(async () => {{
  const e = new AiRequestError('x', 'truncated', {{ partial: '{{"translation":"Вчора Марія з\\'їла яблуко в саду.","alignment":[{{"source":["Hier"],"tar' }});
  __replies = [e]; const r = await aiTranslateText({SENT!r}, 'fr', null, 'uk', '', true);
  return !!r && r.translation === "Вчора Марія з'їла яблуко в саду." && __calls.length === 1 || JSON.stringify({{r, n: __calls.length}}); }})()""")
c.js(STUB + "1")
check('4 a reply without usable JSON falls back to ONE plain translation request', f"""(async () => {{
  __replies = ['Sorry, here it is: (no json)', 'Вчора Марія зʼїла яблуко в саду.'];
  const r = await aiTranslateText({SENT!r}, 'fr', null, 'uk', '', true);
  return typeof r === 'string' && r.startsWith('Вчора') && __calls.length === 2 && __calls[0].alignment && !__calls[1].alignment || JSON.stringify({{r, calls: __calls}}); }})()""")
c.js(STUB + "1")
check('5 Groq honours the per-request budget', """(() => { const src = callGroq.toString(); return src.includes('options.maxOutputTokens || profile.max_completion_tokens'); })()""")
print('ALL PASS')
