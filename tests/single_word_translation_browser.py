"""Single-word AI translation: the popup's primary translation is the translation of THE SELECTED WORD (the sentence
only picks its sense); a contextual meaning is a secondary note shown only when it adds something. Deliberate
multi-word selections keep the natural phrase translation. Only the provider call (callAI) is mocked -- prompt
building, parsing and rendering are the app's own. No real AI provider is called.
"""
import json, os
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP()
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof handleWordOrSelection==='function'", timeout=30)


def pause(s): c.js(f'new Promise(r => setTimeout(r, {int(s * 1000)}))')


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


TEXT = ("She sat on the bank of the river. The weather is beautiful today. "
        "He will run the company next year. Yesterday he ran to the station.")
c.js(r"""(() => {
  localStorage.clear(); showUpdateBanner = () => {};
  state.translateMode = true; state.format = 'txt'; state.bookKey = 'single-word'; state.targetLang = 'uk'; state.uiLang = 'en';
  document.body.classList.add('immersive-mode'); speakText = () => {}; speakInLang = () => {}; aiAvailable = () => true;
  const p = document.createElement('p'); p.textContent = %s; p.style.cssText = 'margin:200px 40px;font-size:20px;line-height:1.7;max-width:760px';
  els.pages.replaceChildren(p); window.__p = p;
  window.__prompts = []; window.__reply = () => '';
  callAI = async (prompt, signal, task) => { __prompts.push({task, prompt}); return __reply(prompt); };
  machineTranslate = async () => ({html: '', extras: ''});
  return true; })()""" % json.dumps(TEXT))

WORD = r"""((w, nth) => { const walker = document.createTreeWalker(__p, NodeFilter.SHOW_TEXT); let n, hits = nth || 0;
  while ((n = walker.nextNode())) { let i = -1; while ((i = n.nodeValue.indexOf(w, i + 1)) !== -1) { if (hits-- === 0) {
    const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + w.length); const b = r.getBoundingClientRect(); return {x: b.left + b.width / 2, y: b.top + b.height / 2, l: b.left + 2, r: b.right - 2}; } } }
  return null; })"""


def reset():
    c.js("els.ttCloseBtn?.click(); els.tooltip.style.display = 'none'; state.translationCache = {}; __prompts = []; state.tooltipJustClosed = false; state.touchJustCommitted = 0; 1")
    pause(.3)


def tap(word, reply):
    reset()
    c.js("window.__reply = () => %s; 1" % json.dumps(reply, ensure_ascii=False))
    p = c.js(WORD + "(%s, 0)" % json.dumps(word))
    for kind in ('mousePressed', 'mouseReleased'):
        c.call('Input.dispatchMouseEvent', type=kind, x=p['x'], y=p['y'], button='left', clickCount=1)
    c.wait("__prompts.some(p => p.task === 'translation') && !els.ttTranslation.textContent.includes(t('translating'))", timeout=6)
    pause(.2)


PRIMARY = "(() => { const tr = els.ttTranslation; const clone = tr.cloneNode(true); clone.querySelectorAll('.tt-context, .tt-note').forEach(e => e.remove()); return clone.textContent.trim(); })()"
NOTE = "(document.querySelector('#tt-translation .tt-context')?.textContent || null)"
LAST_PROMPT = "__prompts.filter(p => p.task === 'translation').at(-1).prompt"

# 1. context does not change the translation -> direct translation only
tap('beautiful', '{"direct":"красивий","context":null}')
check('1 plain word: the direct translation only, no contextual note', "(%s === 'красивий' && %s === null) || [%s, %s]" % (PRIMARY, NOTE, PRIMARY, NOTE))
check('1 the single-word request still carries the sentence (context kept) and asks for the WORD, as JSON',
      "(p => p.includes('The weather is beautiful today') && p.includes('\"direct\"') && p.includes('САМЕ ЦЬОГО СЛОВА'))(%s)" % LAST_PROMPT)

# 2. polysemous word: context selects the lexical sense
tap('bank', '{"direct":"берег","context":null}')
check('2 polysemous word: the sentence goes with the request so the sense can be chosen; the word sense is shown',
      "((p => p.includes('bank of the river'))(%s) && %s === 'берег') || %s" % (LAST_PROMPT, PRIMARY, PRIMARY))

# 3. word inside a construction: direct first, contextual meaning second
tap('run', '{"direct":"керувати","context":"у цьому контексті: керувати компанією"}')
check('3 word in a construction: the FIRST visible translation is the word itself ("керувати")', "%s === 'керувати' || %s" % (PRIMARY, PRIMARY))
check('3 ... and the contextual meaning follows as a secondary note', "%s === '(у цьому контексті: керувати компанією)' || %s" % (NOTE, NOTE))
check('3 the note is visually secondary (smaller, grey) and after the direct translation',
      "(() => { const n = document.querySelector('#tt-translation .tt-context'); const cs = getComputedStyle(n); return parseFloat(cs.fontSize) < parseFloat(getComputedStyle(els.ttTranslation).fontSize) && cs.fontWeight !== '700' && els.ttTranslation.textContent.trim().startsWith('керувати'); })()")

# 5. a note that only repeats the direct translation is omitted
tap('beautiful', '{"direct":"красивий","context":"у контексті: красивий"}')
check('5 redundant contextual note is omitted', "(%s === 'красивий' && %s === null) || [%s, %s]" % (PRIMARY, NOTE, PRIMARY, NOTE))

# 6. inflected / conjugated form
tap('ran', '{"direct":"побіг","context":null}')
check('6 conjugated form: the selected form is sent with its sentence and its translation is shown',
      "((p => p.includes('Слово \"ran\"') && p.includes('Yesterday he ran to the station'))(%s) && %s === 'побіг') || %s" % (LAST_PROMPT, PRIMARY, PRIMARY))

# robustness: a reply that ignores the JSON contract is still shown as the translation
tap('river', 'річка')
check('robust: a plain-text reply (no JSON) is still shown as the translation', "%s === 'річка' || %s" % (PRIMARY, PRIMARY))

# 4. deliberate multi-word selection: natural phrase translation, not the single-word contract
reset()
c.js("""window.__reply = () => JSON.stringify({translation: 'Він керуватиме компанією', alignment: []}); 1""")
a = c.js(WORD + "('He', 0)"); b = c.js(WORD + "('company', 0)")
c.call('Input.dispatchMouseEvent', type='mouseMoved', x=a['l'], y=a['y'])
c.call('Input.dispatchMouseEvent', type='mousePressed', x=a['l'], y=a['y'], button='left', clickCount=1)
for i in range(1, 11):
    c.call('Input.dispatchMouseEvent', type='mouseMoved', x=a['l'] + (b['r'] - a['l']) * i / 10, y=a['y'] + (b['y'] - a['y']) * i / 10, button='left', buttons=1)
    pause(.02)
c.call('Input.dispatchMouseEvent', type='mouseReleased', x=b['r'], y=b['y'], button='left', clickCount=1)
c.wait("__prompts.some(p => p.task === 'translation') && !els.ttTranslation.textContent.includes(t('translating'))", timeout=8); pause(.3)
check('4 multi-word selection uses the natural phrase prompt (not the single-word contract)',
      "(p => p.includes('цей фрагмент') && p.includes('He will run the company') && !p.includes('\"direct\"'))(%s)" % LAST_PROMPT)
check('4 ... and shows the natural phrase translation, with no word-level note', "(%s.startsWith('Він керуватиме компанією') && %s === null) || %s" % (PRIMARY, NOTE, PRIMARY))

# 7. non-AI path (no key / offline) is unchanged
reset()
c.js("aiAvailable = () => false; machineTranslate = async () => ({html: 'красивий (словник)', extras: ''}); window.__reply = () => { throw new Error('AI must not be called'); }; 1")
p = c.js(WORD + "('beautiful', 0)")
for kind in ('mousePressed', 'mouseReleased'):
    c.call('Input.dispatchMouseEvent', type=kind, x=p['x'], y=p['y'], button='left', clickCount=1)
c.wait("els.ttTranslation.textContent.includes('словник')", timeout=6)
check('7 non-AI (dictionary) path unchanged: no AI call, dictionary result shown', "__prompts.length === 0 && %s === null" % NOTE)
print('ALL SINGLE-WORD TRANSLATION CHECKS PASSED')
