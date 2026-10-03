"""Ask AI question/selection semantics (js/grammar-svo.js buildAskPrompt, js/main.js sendAskFromField).

Bug this guards against: buildAskPrompt always framed the request as "Поясни вираз "<term>" читачеві
книги" (explain this expression), no matter what the reader actually typed/dictated -- a question like
"Переклади це французькою" (translate this into French) got folded into the explain-genre template
instead of being answered, and the typed question was appended only as a footnote. Separately,
sendAskFromField read state.lastAskContext unconditionally, so a selection from an EARLIER, finished
interaction kept leaking into every later typed question until a new selection replaced it.

Fix: buildAskPrompt now branches three ways -- question+selection (question is the primary request,
the fragment is supporting material), question alone (an ordinary free-form question, no forced
template), and selection alone (the original explain-the-expression template, unchanged). The three
selection-driven entry points (tooltip's "Запитай AI", panel's "Пояснення"/"Мовний розбір" buttons)
set state.lastAskContext themselves; sendAskFromField consumes it ONCE and clears it, so an unrelated
later question never inherits a stale passage.

AI calls are stubbed (callAI records the exact prompt/taskType); no network, no real provider.
"""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(45)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1280, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__errors = [];
addEventListener('error', e => __errors.push(e.message));
addEventListener('unhandledrejection', e => __errors.push(String(e.reason)));
window.SpeechRecognition = class {
  constructor() { this.results = []; this.state = 'new'; }
  start() { this.state = 'live'; }
  stop() { this.state = 'ended'; setTimeout(() => this.onend && this.onend(), 5); }
  abort() { this.state = 'ended'; setTimeout(() => { this.onerror && this.onerror({error: 'aborted'}); this.onend && this.onend(); }, 0); }
  _emit(i) { const res = this.results.map(r => { const a = [{transcript: r.text}]; a.isFinal = r.final; return a; }); this.onresult && this.onresult({resultIndex: i, results: res}); }
  interim(text) { const last = this.results.at(-1); if (last && !last.final) last.text = text; else this.results.push({text, final: false}); this._emit(this.results.length - 1); }
  final(text) { const last = this.results.at(-1); if (last && !last.final) { last.text = text; last.final = true; } else this.results.push({text, final: true}); this._emit(this.results.length - 1); }
};
''')
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof sendAskFromField==='function'", timeout=30)
c.js(r"""(() => { localStorage.clear(); showUpdateBanner = () => {}; document.getElementById('sw-update-banner')?.remove();
  window.__calls = [];
  aiAvailable = () => true;
  callAI = async (prompt, signal, taskType) => { __calls.push({prompt, taskType}); return '<p>ok</p>'; };
  els.askPanel.classList.add('expanded');
  return 1; })()""")


def pause(s): c.js(f'new Promise(r => setTimeout(r, {int(s * 1000)}))')


def check(name, expression, timeout=0):
    deadline = time.monotonic() + timeout
    result = c.js(expression)
    while result is not True and time.monotonic() < deadline:
        time.sleep(.1); result = c.js(expression)
    assert result is True, (name, result, c.js(
        "JSON.stringify({calls: __calls.map(x => ({taskType: x.taskType, prompt: x.prompt.slice(0, 200)})), lastAskContext: state.lastAskContext, input: els.askInput.value})"))
    print('PASS', name, flush=True)


def reset():
    c.js("""(() => { if (dictation.wanted || dictation.finishing) stopDictation();
      els.askInput.value = ''; __calls.length = 0; state.lastAskContext = ''; state.lastGrammarSentence = '';
      els.tooltip.style.display = 'none'; state.lastSelectionText = '';
      els.askPanel.classList.add('expanded'); return 1; })()""")
    pause(.1)


def send():
    c.js("els.askSendBtn.click(); 1")


# Markers unique to the OLD/explain-only template -- used to prove the other two shapes never emit it.
EXPLAIN_MARKER = 'Поясни вираз'
GENRE_MARKER = 'ЯКОГО РОДУ'

# ===================== 1. Question without selection: an ordinary free-form question =====================
reset()
c.js("els.askInput.value = 'Яка столиця Франції?'; 1")
send()
check('1 question without selection reaches the AI call', "__calls.length === 1", timeout=2)
check('1 ... as taskType ask', "__calls.at(-1).taskType === 'ask'")
check('1 prompt contains the question verbatim', "(__calls.at(-1).prompt).includes('Яка столиця Франції?')")
check('1 prompt is NOT forced into the explain-expression template', "!(__calls.at(-1).prompt).includes(%s)" % json.dumps(EXPLAIN_MARKER))
check('1 prompt does NOT carry the genre-classification instructions', "!(__calls.at(-1).prompt).includes(%s)" % json.dumps(GENRE_MARKER))
check('1 field is cleared and context stays empty (nothing to leak forward)', "els.askInput.value === '' && state.lastAskContext === ''")

# ===================== 2. Question + selection: the question is primary, selection is material =====================
reset()
c.js("state.lastAskContext = 'Le chat noir dort sur le canapé.'; els.askInput.value = 'Переклади це французькою.'; 1")
send()
check('2 question+selection reaches the AI call once', "__calls.length === 1", timeout=2)
check('2 prompt contains the actual question verbatim', "(__calls.at(-1).prompt).includes('Переклади це французькою.')")
check('2 prompt contains the selected fragment as material', "(__calls.at(-1).prompt).includes('Le chat noir dort sur le canapé.')")
check('2 the translation request is NOT folded into the explain-expression template',
      "!(__calls.at(-1).prompt).includes(%s) && !(__calls.at(-1).prompt).includes(%s)" % (json.dumps(EXPLAIN_MARKER), json.dumps(GENRE_MARKER)))

# ===================== 3. Stale context must not survive into an unrelated later question =====================
reset()
c.js("state.lastAskContext = 'OLD UNRELATED PASSAGE'; els.askInput.value = 'Перше питання'; 1")
send()
check('3 setup send consumes the pending context once', "(__calls.at(-1).prompt).includes('OLD UNRELATED PASSAGE') && state.lastAskContext === ''", timeout=2)
c.js("els.askInput.value = 'Зовсім інше друге питання'; 1")
send()
check('3 a second, unrelated question does NOT inherit the old passage', "__calls.length === 2", timeout=2)
check('3 ... its prompt has no trace of the old passage', "!(__calls.at(-1).prompt).includes('OLD UNRELATED PASSAGE')")
check('3 ... and reads as an ordinary question, not the explain template',
      "!(__calls.at(-1).prompt).includes(%s) && (__calls.at(-1).prompt).includes('Зовсім інше друге питання')" % json.dumps(EXPLAIN_MARKER))
c.js("els.askInput.value = 'Третє питання'; 1")
send()
check('3 ... a third send still carries nothing stale (one-shot, not delayed by one cycle)',
      "__calls.length === 3 && !(__calls.at(-1).prompt).includes('OLD UNRELATED PASSAGE')")

# ===================== 4. Selection without a typed question: normal explanation is unchanged =====================
reset()
c.js("els.tooltip.style.display = 'flex'; state.lastSelectionText = 'une pomme rouge'; 1")
c.js("document.getElementById('btn-explain').click(); 1")
check('4 explain-only still uses the original template', "(__calls.at(-1).prompt).includes(%s) && (__calls.at(-1).prompt).includes(%s)" % (json.dumps(EXPLAIN_MARKER), json.dumps(GENRE_MARKER)), timeout=2)
check('4 ... names the selected fragment', "(__calls.at(-1).prompt).includes('une pomme rouge')")
check('4 ... and remembers it as context for a follow-up (does not clear itself)', "state.lastAskContext === 'une pomme rouge'")
# A follow-up typed question right after SHOULD see that just-made selection (not stale -- it is the
# most recent explicit action), proving one-shot consumption does not break genuine immediate follow-ups.
c.js("els.askInput.value = 'Дай ще один приклад.'; 1")
send()
check('4 ... an immediate follow-up question still sees that fresh selection as context',
      "(__calls.at(-1).prompt).includes('une pomme rouge') && (__calls.at(-1).prompt).includes('Дай ще один приклад.')", timeout=2)
check('4 ... and that context is consumed, not left to leak further', "state.lastAskContext === ''")

# ===================== 5. Full send path: long/restarted dictation -> question takes priority =====================
reset()
c.js("state.lastAskContext = 'Il pleut beaucoup aujourd\\'hui.'; 1")
c.js("toggleDictation(); 1")
c.wait("dictation.wanted && recognition && recognition.state === 'live'", timeout=5)
c.js("recognition.final('Explique'); 1"); pause(.05)
c.js("recognition.final('la grammaire'); 1"); pause(.05)
# Recognition restarts mid-question (engine hiccup / continuous-mode rotation): already-heard text must survive.
c.js("recognition.onend && recognition.onend(); 1"); pause(.1)
c.wait("dictation.wanted && recognition && recognition.state === 'live'", timeout=5)
c.js("recognition.final('de cette phrase.'); 1"); pause(.05)
check('5 the full dictated question survived the restart with no loss or duplication',
      "els.askInput.value === 'Explique la grammaire de cette phrase.'")
send()
check('5 the complete dictated question reaches the AI call', "__calls.length === 1", timeout=3)
check('5 ... as the PRIMARY request, with the preserved selection as material, not an explain target',
      "(__calls.at(-1).prompt).includes('Explique la grammaire de cette phrase.') "
      "&& (__calls.at(-1).prompt).includes(\"Il pleut beaucoup aujourd'hui.\") "
      "&& !(__calls.at(-1).prompt).includes(%s)" % json.dumps(EXPLAIN_MARKER))
check('5 ... dictation is fully stopped and the field cleared', "!dictation.wanted && els.askInput.value === ''")

check('no application errors', "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL ASK PROMPT CHECKS PASSED')
