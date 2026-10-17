"""Grammar: an adjective's agreement table is asked for when its card is opened.

A long selection is analysed under the LITE contract (no conjugation table, no stem split, so the reply is not cut off): an
adjective then reaches the panel with `forms: null`. A verb gets its table from the tense buttons, an adjective has no such
button -- its card looked empty. The card now requests the table itself (task grammar_paradigm, one small request per lemma,
cached for the analysis), shows a loading line, and on failure an error with a Retry button. The table must still contain the
occurrence's own form, like one that arrives with the analysis. A language without adjective agreement (English) asks nothing.
AI answers are mocked; READER_TEST_URL can target another build."""
import json, os, time
from browser_cdp import CDP

c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Network.enable'); c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=1200, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert && typeof runGrammarAnalysis==='function'", timeout=30)
c.js("localStorage.clear();showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove(); window.__errors=[]; addEventListener('error', e => __errors.push(e.message))")


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1)
        result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


FR_TEXT = "Sa robe était bleue. Un petit chat dort. Le grand chien mange. Une belle fleur blanche."
FR_ITEMS = [
    dict(pos='adjective', lemma='bleu', surface='bleue', sentence='Sa robe était bleue.', features=dict(gender='féminin', number='singulier'), explanation='accord', forms=None),
    dict(pos='adjective', lemma='petit', surface='petit', sentence='Un petit chat dort.', features={}, explanation='', forms=None),
    dict(pos='adjective', lemma='grand', surface='grand', sentence='Le grand chien mange.', features={}, explanation='', forms=None),
    dict(pos='adjective', lemma='beau', surface='belle', sentence='Une belle fleur blanche.', features={}, explanation='', forms=None),
    dict(pos='verb', lemma='dormir', surface='dort', sentence='Un petit chat dort.', features={}, explanation='', forms=None),
]
EN_TEXT = "Her dress was blue. A small cat sleeps."
EN_ITEMS = [
    dict(pos='adjective', lemma='blue', surface='blue', sentence='Her dress was blue.', features={}, explanation='', forms=None),
    dict(pos='adjective', lemma='small', surface='small', sentence='A small cat sleeps.', features={}, explanation='', forms=None),
]

# The mock: every AI task is answered from window.__replies; a grammar_paradigm reply may be held back (window.__hold) and released.
c.js("""(() => {
  window.__calls = []; window.__held = []; window.__hold = false; window.__paradigm = {}; window.__analysis = null; window.__fail = null;
  aiAvailable = () => true;
  callAI = (prompt, signal, task) => {
    __calls.push({task, prompt});
    if (task === 'grammar_analysis') return Promise.resolve(JSON.stringify(window.__analysis));
    if (task === 'grammar_paradigm') {
      const lemma = (/adjective "([^"]+)"/.exec(prompt) || [])[1];
      const answer = () => { if (__fail) throw new Error(__fail); return JSON.stringify({forms: __paradigm[lemma] || {}}); };
      if (__hold) return new Promise((resolve, reject) => __held.push({lemma, release: () => { try { resolve(answer()); } catch (e) { reject(e); } }}));
      try { return Promise.resolve(answer()); } catch (e) { return Promise.reject(e); }
    }
    return Promise.resolve('{}');
  };
  return 1; })()""")
c.js("window.__paradigm = %s; 1" % json.dumps({
    'bleu': {'ms': 'bleu', 'fs': 'bleue', 'mp': 'bleus', 'fp': 'bleues'},
    'petit': {'ms': 'petit', 'fs': 'petite', 'mp': 'petits', 'fp': 'petites'},
    'grand': {'ms': 'grand', 'fs': 'grande', 'mp': 'grands', 'fp': 'grandes'},
    'beau': {'ms': 'beau', 'fs': 'belle', 'mp': 'beaux', 'fp': 'belles', 'ms_vowel': 'bel'},
}))


def analyse(text, items, lang):
    c.js("resetGrammarState(); els.grammarPanel.classList.remove('ready'); window.__analysis = %s; state.lastGrammarSentence = %s; __calls.length = 0; __held.length = 0; 1" % (json.dumps(dict(language=lang, items=items)), json.dumps(text)))
    c.js("startAiTask(%s, 'grammar'); 1" % json.dumps(text))
    c.wait("els.grammarPanel.classList.contains('ready')", timeout=8)


def calls(task='grammar_paradigm'):
    return c.js("__calls.filter(x => x.task === %s).length" % json.dumps(task))


def open_card(lemma):
    c.js("[...document.querySelectorAll('#grammar-content .grammar-card-lemma')].find(b => b.textContent === %s).click(); 1" % json.dumps(lemma))


DETAIL = "document.querySelector('#grammar-content .grammar-focus')"

# ---------------------------------------------------------------- French: the lite analysis sent no table at all
analyse(FR_TEXT, FR_ITEMS, 'fr')
c.js("switchGrammarMode('adjectives'); 1")
check('1 the lite analysis lists four adjective cards and has asked for NO table yet (nothing is opened)',
      "document.querySelectorAll('#grammar-content .grammar-card-lemma').length === 4 && __calls.filter(x => x.task === 'grammar_paradigm').length === 0")

# ---------------------------------------------------------------- opening a card: loading state, then the table
c.js("__hold = true; 1")
open_card('bleu')
check('2 opening an adjective card asks for its table once, with the lemma and the language\'s own form ids',
      "(() => { const p = __calls.filter(x => x.task === 'grammar_paradigm'); return p.length === 1 && p[0].prompt.includes('French adjective \"bleu\"') && ['ms', 'fs', 'mp', 'fp', 'ms_vowel'].every(id => p[0].prompt.includes('\"' + id + '\"')) && !p[0].prompt.includes('\"je\"'); })()", timeout=3)
check('3 while it is on its way the card says so (a status line, no empty grid)',
      DETAIL + " && !!" + DETAIL + ".querySelector('.grammar-forms-loading[role=\"status\"]') && " + DETAIL + ".querySelectorAll('.grammar-grid-row').length === 0")
c.js("__held.shift().release(); 1")
check('4 the table lands: four rows, the occurrence\'s own form (bleue = fs) marked, the loading line gone',
      "(() => { const d = " + DETAIL + "; if (!d) return 'no detail'; const rows = [...d.querySelectorAll('.grammar-grid-row')];"
      " return rows.length === 4 && rows.map(r => r.querySelector('.grammar-grid-value').textContent).join('|') === 'bleu|bleue|bleus|bleues' && rows[1].classList.contains('current') && !d.querySelector('.grammar-forms-loading') && !d.querySelector('.grammar-forms-error') || rows.length; })()", timeout=3)
check('5 the regular change of each derived form is shown, like for a table that came with the analysis',
      "[...(" + DETAIL + ").querySelectorAll('.grammar-grid-change')].map(x => x.textContent).length >= 1")

# ---------------------------------------------------------------- one request per lemma
c.js("__hold = false; 1")
open_card('petit'); check('6 another adjective card asks for its own table', "__calls.filter(x => x.task === 'grammar_paradigm').length === 2 && " + DETAIL + ".querySelectorAll('.grammar-grid-row').length === 4", timeout=3)
open_card('bleu')
check('7 coming back to the first card shows its table at once and asks for nothing again',
      "__calls.filter(x => x.task === 'grammar_paradigm').length === 2 && " + DETAIL + ".querySelectorAll('.grammar-grid-row').length === 4 && " + DETAIL + ".querySelector('.grammar-focus-head b').textContent === 'bleue'")

# ---------------------------------------------------------------- the special masculine form before a vowel is validated like in an analysis
open_card('beau')
check('8 a French adjective with the "before a vowel" form (beau -> bel) gets that row too; the occurrence belle is marked',
      "(() => { const d = " + DETAIL + "; const rows = [...d.querySelectorAll('.grammar-grid-row')]; return rows.length === 5 && rows.some(r => r.querySelector('.grammar-grid-value').textContent === 'bel') && rows.find(r => r.classList.contains('current'))?.querySelector('.grammar-grid-value').textContent === 'belle'; })()", timeout=3)

# ---------------------------------------------------------------- failure: a visible error and a working Retry
analyse(FR_TEXT, FR_ITEMS, 'fr'); c.js("switchGrammarMode('adjectives'); __fail = 'network down'; 1")
open_card('grand')
check('9 a failing request shows the error and a Retry button (a real tap target), not an endless loading line',
      "(() => { const d = " + DETAIL + "; const e = d && d.querySelector('.grammar-forms-error'); const b = e && e.querySelector('.grammar-forms-retry'); return !!e && e.textContent.includes('network down') && !!b && b.getBoundingClientRect().height >= 44 && !d.querySelector('.grammar-forms-loading') && d.querySelectorAll('.grammar-grid-row').length === 0 || (e ? e.textContent : 'no error box'); })()", timeout=3)
n = calls()
c.js("document.querySelector('#grammar-content .grammar-forms-retry').click(); 1")
check('10 Retry asks again (while the failure persists: the error stays, one more request)',
      "__calls.filter(x => x.task === 'grammar_paradigm').length === %d && !!document.querySelector('#grammar-content .grammar-forms-error')" % (n + 1), timeout=3)
c.js("__fail = null; document.querySelector('#grammar-content .grammar-forms-retry').click(); 1")
check('11 Retry after the connection is back fills the table and removes the error',
      "(() => { const d = " + DETAIL + "; return !!d && d.querySelectorAll('.grammar-grid-row').length === 4 && !d.querySelector('.grammar-forms-error'); })()", timeout=3)

# ---------------------------------------------------------------- an unusable reply
analyse(FR_TEXT, FR_ITEMS, 'fr'); c.js("switchGrammarMode('adjectives'); window.__paradigm['petit'] = {ms: 'tout', fs: 'autre', mp: 'rien', fp: 'zero'}; 1")
open_card('petit')
check('12 a table that does not contain the occurrence\'s own form is refused: the "no table" note plus Retry, no wrong grid',
      "(() => { const d = " + DETAIL + "; const e = d && d.querySelector('.grammar-forms-error'); return !!e && e.textContent.includes(t('grammarNoParadigm')) && !!e.querySelector('.grammar-forms-retry') && d.querySelectorAll('.grammar-grid-row').length === 0 || (e ? e.textContent : 'no error'); })()", timeout=3)
c.js("window.__paradigm['petit'] = {ms: 'petit', fs: 'petite', mp: 'petits', fp: 'petites'}; 1")

# ---------------------------------------------------------------- a late reply never lands on another card
analyse(FR_TEXT, FR_ITEMS, 'fr'); c.js("switchGrammarMode('adjectives'); __hold = true; 1")
open_card('bleu')
check('13 (setup) the first request is held back', "__held.length === 1")
c.js("__hold = false; 1")
open_card('grand')
check('14 (setup) the second card asked for its own table and shows it', DETAIL + " && " + DETAIL + ".querySelector('.grammar-focus-head b').textContent === 'grand' && " + DETAIL + ".querySelectorAll('.grammar-grid-row').length === 4", timeout=3)
c.js("__held.shift().release(); 1"); time.sleep(0.4)
check('15 the late reply for the FIRST card changes nothing on the card now open',
      DETAIL + ".querySelector('.grammar-focus-head b').textContent === 'grand' && [...document.querySelectorAll('#grammar-content .grammar-grid-value')].map(x => x.textContent).join('|') === 'grand|grande|grands|grandes'")
open_card('bleu')
check('16 and that card, opened again, asks afresh instead of staying on a stale loading line',
      "!!(" + DETAIL + ") && " + DETAIL + ".querySelectorAll('.grammar-grid-row').length === 4", timeout=3)

# ---------------------------------------------------------------- no key
analyse(FR_TEXT, FR_ITEMS, 'fr'); c.js("switchGrammarMode('adjectives'); aiAvailable = () => false; 1")
n = calls()
open_card('petit')
check('17 without an AI key the card says so (with Retry) and sends nothing',
      "(() => { const e = document.querySelector('#grammar-content .grammar-forms-error'); return !!e && e.textContent.includes(t('needKey')) && __calls.filter(x => x.task === 'grammar_paradigm').length === %d; })()" % n)
c.js("aiAvailable = () => true; 1")

# ---------------------------------------------------------------- a tapped word waits for the panel to be opened
analyse(FR_TEXT, FR_ITEMS, 'fr')
c.js("""(() => { els.grammarPanel.classList.remove('expanded'); const item = grammarContext.analysis.items.find(i => i.lemma === 'grand'); item.tapped = true; __calls.length = 0;
  presentGrammarAnalysis(grammarContext.analysis, 'fr'); return 1; })()""")
check('18 a tapped adjective is shown in the (still closed) panel without a request', "__calls.filter(x => x.task === 'grammar_paradigm').length === 0 && !els.grammarPanel.classList.contains('expanded')")
c.js("els.grammarTab.click(); 1")
check('19 opening the Grammar panel is what asks for its table', "__calls.filter(x => x.task === 'grammar_paradigm').length === 1 && " + DETAIL + ".querySelectorAll('.grammar-grid-row').length === 4", timeout=3)

# ---------------------------------------------------------------- a verb card is not an adjective
analyse(FR_TEXT, FR_ITEMS, 'fr'); c.js("switchGrammarMode('verbs'); __calls.length = 0; 1")
open_card('dormir')
check('20 opening a VERB card asks for no adjective table', "__calls.filter(x => x.task === 'grammar_paradigm').length === 0 && !document.querySelector('#grammar-content .grammar-forms-loading, #grammar-content .grammar-forms-error')")

# ---------------------------------------------------------------- English adjectives do not agree: nothing to ask
analyse(EN_TEXT, EN_ITEMS, 'en'); c.js("switchGrammarMode('adjectives'); __calls.length = 0; 1")
open_card('blue')
check('21 a language without adjective agreement (English) asks nothing and shows no loading or error',
      "__calls.filter(x => x.task === 'grammar_paradigm').length === 0 && !document.querySelector('#grammar-content .grammar-forms-loading, #grammar-content .grammar-forms-error') && !!document.querySelector('#grammar-content .grammar-focus')")

check('no application errors', "(window.__errors || []).length === 0")
print('ALL GRAMMAR ADJECTIVE FORMS CHECKS PASSED')
