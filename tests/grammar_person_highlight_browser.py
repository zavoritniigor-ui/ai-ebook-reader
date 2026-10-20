"""Grammar grid: the row of the form the SENTENCE used is highlighted -- also in another tense, and for the gender an adjective had.

Owner, 2026-10-19: "return the highlight of that form of the verb or adjective for the person that was indicated in the sentence".
Before, only a grid that contained the exact spelling of the tapped form got a row mark (.current), so a tense button (Imparfait for a
sentence in the présent) showed an unmarked table, and an adjective whose masculine and feminine are spelled alike (rouge) marked both.

Now: .current = the occurrence's own form (strong: tint + ring + 4px bar + bold label); .person = the person the sentence names (the
subject it agrees with, else the person + number features) in a grid of another tense, softer. Rows that share a spelling (rouge: ms,
fs) are both the strong mark, as before. Checked in light / dark / sepia: the strong mark is clearly visible (alpha, ring, bar), not a faint tint. No AI.
"""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1100, height=900, deviceScaleFactor=1, mobile=False)


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof focusGrammarItem==='function'", timeout=30)
c.js("localStorage.clear(); showUpdateBanner=()=>{}; document.getElementById('sw-update-banner')?.remove(); 1")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof focusGrammarItem==='function'", timeout=30)
c.js("""state.uiLang = 'uk'; applyI18n(); aiAvailable = () => true; window.__errs = []; addEventListener('error', e => __errs.push(e.message)); addEventListener('unhandledrejection', e => __errs.push(String(e.reason)));
  window.__paradigm = {}; callAI = async (prompt, signal, task) => task === 'grammar_paradigm' ? JSON.stringify({ forms: __paradigm }) : 'ok'; 1""")

S1 = "Nous parlions doucement, mais ils finissent toujours par rire."
S2 = "Elle a mangé une pomme rouge."
ITEMS = {
    'parlions': dict(pos='verb', lemma='parler', surface='parlions', sentence=S1, occurrence=1, agreesWith='Nous', features=dict(tense='imparfait', mood='indicatif', person='1re personne', number='pluriel'),
                     explanation='x', stemBreakdown=None, forms=None),
    'finissent': dict(pos='verb', lemma='finir', surface='finissent', sentence=S1, occurrence=1, agreesWith='les enfants', features=dict(tense='présent', mood='indicatif', person='3e personne', number='pluriel'),
                      explanation='x', stemBreakdown=None, forms=None),
    'rouge': dict(pos='adjective', lemma='rouge', surface='rouge', sentence=S2, occurrence=1, agreesWith='pomme', features=dict(gender='féminin', number='singulier'),
                  explanation='x', stemBreakdown=None, forms={'ms': 'rouge', 'fs': 'rouge', 'mp': 'rouges', 'fp': 'rouges'}),
}
c.js("""(items => { window.__items = {}; for (const [k, raw] of Object.entries(items)) { const res = normalizeGrammarAnalysis(JSON.stringify({ language: 'fr', items: [raw] }), 'fr', raw.sentence, ''); __items[k] = res.items[0]; } return Object.keys(__items).length; })(%s)""" % json.dumps(ITEMS))
check("0 the three occurrences passed the real validation gate", "Object.keys(__items).length === 3 && Object.values(__items).every(Boolean)")

ROWS = """(() => { const d = document.querySelector('#grammar-content .grammar-focus'); return d ? [...d.querySelectorAll('.grammar-grid-row')].map(r => r.querySelector('.grammar-grid-label').textContent + ':' + (r.classList.contains('current') ? 'CURRENT' : r.classList.contains('person') ? 'person' : '-')).join(' ') : 'no card'; })()"""

# ---- 1. a verb whose own tense has no grid yet: the tense buttons ------------------------------------------------------------------
c.js("focusGrammarItem(__items.parlions, 'fr', { reveal: false }); 1")
c.js("""__paradigm = { 'je': 'parle', 'tu': 'parles', 'il / elle / on': 'parle', 'nous': 'parlons', 'vous': 'parlez', 'ils / elles': 'parlent' }; selectGrammarTense('present', 'Présent', 'fr'); 1""")
check("1 the Présent table of a sentence in the imparfait marks the person the sentence names (nous, from «Nous»), softly -- there is no exact form to mark",
      "(r => r === 'je:- tu:- il / elle / on:- nous:person vous:- ils / elles:- ' || r)(%s + ' ')" % ROWS, timeout=4)
c.js("""__paradigm = { 'je': 'parlais', 'tu': 'parlais', 'il / elle / on': 'parlait', 'nous': 'parlions', 'vous': 'parliez', 'ils / elles': 'parlaient' }; grammarContext.paradigmCache.clear(); selectGrammarTense('imparfait', 'Imparfait', 'fr'); 1""")
check("2 the Imparfait table (the sentence's own tense) marks the exact form strongly: nous -> parlions",
      "(r => r === 'je:- tu:- il / elle / on:- nous:CURRENT vous:- ils / elles:- ' || r)(%s + ' ')" % ROWS, timeout=4)

# ---- 2. the subject is a noun: the person + number features decide ---------------------------------------------------------------
c.js("focusGrammarItem(__items.finissent, 'fr', { reveal: false }); 1")
c.js("""__paradigm = { 'je': 'finissais', 'tu': 'finissais', 'il / elle / on': 'finissait', 'nous': 'finissions', 'vous': 'finissiez', 'ils / elles': 'finissaient' }; grammarContext.paradigmCache.clear(); selectGrammarTense('imparfait', 'Imparfait', 'fr'); 1""")
check("3 «les enfants» is not a pronoun: the 3rd person plural features mark ils / elles in the Imparfait table of a présent sentence",
      "(r => r === 'je:- tu:- il / elle / on:- nous:- vous:- ils / elles:person ' || r)(%s + ' ')" % ROWS, timeout=4)
c.js("""__paradigm = { 'je': 'finis', 'tu': 'finis', 'il / elle / on': 'finit', 'nous': 'finissons', 'vous': 'finissez', 'ils / elles': 'finissent' }; grammarContext.paradigmCache.clear(); selectGrammarTense('present', 'Présent', 'fr'); 1""")
check("4 the Présent table of that présent sentence marks finissent strongly (an exact form wins over the person)",
      "(r => r === 'je:- tu:- il / elle / on:- nous:- vous:- ils / elles:CURRENT ' || r)(%s + ' ')" % ROWS, timeout=4)

# ---- 3. adjective: the gender the sentence gave ---------------------------------------------------------------------------------------
c.js("focusGrammarItem(__items.rouge, 'fr', { reveal: false }); 1")
check("5 rouge («une pomme rouge»): both rows that spell the tapped form are the strong mark, as before (ms and fs), the other two are not",
      """(() => { const rows = [...document.querySelectorAll('#grammar-content .grammar-focus .grammar-grid-row')]; const cls = rows.map(r => r.classList.contains('current') ? 'C' : r.classList.contains('person') ? 'p' : '-').join('');
         return cls === 'CC--' || cls; })()""", timeout=3)

# ---- 4. visibility in the three themes -------------------------------------------------------------------------------------------------
c.js("focusGrammarItem(__items.parlions, 'fr', { reveal: false }); __paradigm = { 'je': 'parlais', 'tu': 'parlais', 'il / elle / on': 'parlait', 'nous': 'parlions', 'vous': 'parliez', 'ils / elles': 'parlaient' }; grammarContext.paradigmCache.clear(); selectGrammarTense('imparfait', 'Imparfait', 'fr'); 1")
c.wait("!!document.querySelector('#grammar-content .grammar-grid-row.current')", timeout=5)
STYLE = """((theme) => { document.body.dataset.theme = theme; const row = document.querySelector('#grammar-content .grammar-grid-row.current'), plain = row.parentElement.querySelector('.grammar-grid-row:not(.current)');
  const alpha = css => { const m = css.match(/rgba?\\(([^)]*)\\)/); if (m) { const p = m[1].split(',').map(Number); return p.length === 4 ? p[3] : 1; } const k = css.match(/\\/\\s*([\\d.]+)\\s*\\)/); return k ? Number(k[1]) : 1; };
  const cs = getComputedStyle(row);
  return { theme, alpha: alpha(cs.backgroundColor), shadows: (cs.boxShadow.match(/inset/g) || []).length, bold: Number(getComputedStyle(row.querySelector('.grammar-grid-label')).fontWeight) >= 600, plainBg: alpha(getComputedStyle(plain).backgroundColor) }; })(%s)"""
for theme in ('light', 'dark', 'sepia'):
    r = c.js(STYLE % json.dumps(theme))
    assert r['alpha'] >= 0.16 and r['shadows'] == 2 and r['bold'] and r['plainBg'] == 0, r
    print('PASS 6 [%s] the strong mark is a %.0f%% fill + a 1px ring + a 4px bar + a bold label; the other rows have no fill' % (theme, 100 * r['alpha']), flush=True)
c.js("document.body.dataset.theme = 'light'; 1")
check("7 no page errors", "__errs.length === 0 || JSON.stringify(__errs)")
print('ALL GRAMMAR PERSON HIGHLIGHT CHECKS PASSED')
