"""Sentence structure + time markers (js/sentence-structure.js), in Grammar and in Practice.

No live AI: every model reply is a hand-authored GOLD (or deliberately bad) response. Proves
(1) the validation gate keeps a correct breakdown and rejects each way a model goes wrong
(paraphrased text, overlap, unknown role/kind, wrong language, malformed JSON), (2) the engine
caches a good reply, shares an in-flight request, and never caches a failure, (3) the Grammar
focus card offers the breakdown (one call, then none), (4) Practice validates optional
`timeMarkers`, renders them (targets win overlaps), and its sentence row opens the same
breakdown from the 🧩 button or from a marker, and (5) every piece of model text is inserted
as text, never as markup.
"""
import json, os
from browser_cdp import CDP

c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=1200, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert && typeof getSentenceStructure==='function' && typeof renderPracticeReading==='function'")
c.js("localStorage.clear();showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove()")


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


FR = "Hier, Marie a mangé une pomme parce qu'elle avait faim."
GOLD_FR = json.dumps({"language": "fr", "parts": [
    {"text": "Hier", "occurrence": 1, "role": "time", "kind": "past", "note": "passé composé"},
    {"text": "Marie", "occurrence": 1, "role": "subject", "kind": None, "note": "qui mange"},
    {"text": "a mangé", "occurrence": 1, "role": "verb", "kind": None, "note": "passé composé"},
    {"text": "une pomme", "occurrence": 1, "role": "object", "kind": None, "note": "ce qui est mangé"},
    {"text": "parce qu'", "occurrence": 1, "role": "connector", "kind": None, "note": "cause"},
    {"text": "elle", "occurrence": 1, "role": "subject", "kind": None, "note": ""},
    {"text": "avait", "occurrence": 1, "role": "verb", "kind": None, "note": "imparfait"}],
    "summary": "Marqueur de temps + sujet + verbe + objet + proposition causale."}, ensure_ascii=False)

c.js(r"""(() => {
  aiAvailable = () => true; window.__calls = []; window.__reply = null;
  callAI = async (prompt, signal, task) => { __calls.push({task, prompt}); const r = __reply; if (r instanceof Error) throw r; return typeof r === 'function' ? r(prompt) : r; };
  return 1; })()""")

# ---- 1. validation gate ----
def norm(reply, sentence=FR, lang='fr'):
    return c.js("(r => JSON.stringify({ok:r.ok,error:r.error,parts:r.parts.map(p=>[p.role,p.kind,p.text,p.start,p.end]),markers:r.markers.length,rejected:r.rejected}))(normalizeSentenceStructure(%s, %s, %s))"
                % (json.dumps(reply), json.dumps(lang), json.dumps(sentence)))

r = json.loads(norm(GOLD_FR))
assert r['ok'] and len(r['parts']) == 7 and r['markers'] == 1, r
assert ['time', 'past', 'Hier', 0, 4] in r['parts'], r
assert ['connector', None, "parce qu'", FR.index("parce qu'"), FR.index("parce qu'") + 9] in r['parts'], r
print('PASS 1 gold reply: 7 ordered parts, the time marker found with its kind')

bad = json.loads(GOLD_FR)
bad['parts'][1]['text'] = 'Pierre'                      # not in the sentence
bad['parts'][2]['role'] = 'wizard'                      # unknown role
bad['parts'][3]['text'] = 'pomme'                       # overlaps nothing yet ("une pomme" claimed first -> overlap)
bad['parts'].insert(3, {"text": "une pomme", "occurrence": 1, "role": "object", "note": ""})
bad['parts'][0]['kind'] = 'someday'                      # unknown kind -> kept as role time, kind null
r = json.loads(norm(json.dumps(bad)))
texts = [p[2] for p in r['parts']]
assert r['ok'] and 'Pierre' not in texts and 'a mangé' not in texts, r
assert texts.count('une pomme') == 1 and 'pomme' not in texts, r        # overlap dropped
assert ['time', None, 'Hier', 0, 4] in r['parts'], r                     # unknown kind -> null, still a time marker
assert {'text_not_in_sentence', 'bad_role_or_text', 'overlap'} <= set(r['rejected']), r
print('PASS 2 invented text / unknown role / overlap rejected; unknown kind degrades to null')

recased = json.dumps({"language": "fr", "parts": [{"text": "hier", "role": "time", "kind": "past"}]})
r = json.loads(norm(recased))
assert r['ok'] and r['parts'][0][2] == 'Hier', r
print('PASS 3 model spelling never shown: the SOURCE slice is used (hier -> Hier)')

assert json.loads(norm(GOLD_FR.replace('"fr"', '"en"', 1)))['error'] == 'language_mismatch'
assert json.loads(norm('not json'))['error'] == 'malformed_json'
assert json.loads(norm(json.dumps({"language": "fr", "parts": [{"text": "zzz", "role": "verb"}]})))['error'] == 'no_valid_parts'
assert json.loads(norm(json.dumps({"language": "fr"})))['error'] == 'missing_parts'
print('PASS 4 wrong language / malformed / nothing valid / no parts -> unusable replies')

# ---- 2. engine: cache, de-dup, failures ----
c.js("__calls.length = 0; __reply = %s; 1" % json.dumps(GOLD_FR))
check("5 two simultaneous requests share ONE AI call",
      """(async () => { const [a, b] = await Promise.all([getSentenceStructure(%s, 'fr'), getSentenceStructure(%s, 'fr')]);
         return a.ok && b.ok && a === b && __calls.length === 1 && __calls[0].task === 'sentence_structure'; })()""" % (json.dumps(FR), json.dumps(FR)))
check("6 a repeat is answered from the cache (no new call)",
      "(async () => { const r = await getSentenceStructure(%s, 'fr'); return r.ok && __calls.length === 1; })()" % json.dumps(FR))
check("7 the prompt names the language and carries the sentence as a JSON string",
      "__calls[0].prompt.includes('code \"fr\"') && __calls[0].prompt.includes(%s)" % json.dumps(json.dumps(FR, ensure_ascii=False)))
c.js("__reply = 'garbage'; 1")
check("8 an unusable reply is NOT cached: the retry asks again and can succeed",
      """(async () => { const s = 'Demain, nous partirons tôt.'; const n = __calls.length;
         const bad = await getSentenceStructure(s, 'fr'); __reply = JSON.stringify({language:'fr', parts:[{text:'Demain',role:'time',kind:'future'},{text:'nous partirons',role:'verb'}]});
         const good = await getSentenceStructure(s, 'fr');
         return !bad.ok && good.ok && __calls.length === n + 2 && good.markers[0].kind === 'future'; })()""")
c.js("__reply = new Error('offline'); 1")
check("9 a failing request resolves to ok:false (never rejects)",
      "(async () => { const r = await getSentenceStructure('Aujourd’hui il pleut beaucoup.', 'fr'); return r.ok === false && r.error === 'request_failed'; })()")
check("10 an over-long text is refused without an AI call",
      "(async () => { const n = __calls.length; const r = await getSentenceStructure('mot '.repeat(150), 'fr'); return !r.ok && r.error === 'too_long' && __calls.length === n; })()")

# ---- 3. Grammar focus card ----
c.js("structureCache.clear(); __calls.length = 0; __reply = %s; 1" % json.dumps(GOLD_FR))
c.js("""(() => { const item = { pos:'verb', lemma:'manger', surface:'a mangé', sentence:%s, start:%d, end:%d, features:{}, explanation:'', stemBreakdown:null, forms:null };
  window.__item = item; focusGrammarItem(item, 'fr'); return 1; })()""" % (json.dumps(FR), FR.index('a mangé'), FR.index('a mangé') + 7))
check("11 the focus card offers the sentence breakdown, closed, with no AI call yet",
      "!!document.querySelector('#grammar-content .structure-btn') && document.querySelector('#grammar-content .structure-result').hidden && __calls.length === 0")
c.js("document.querySelector('#grammar-content .structure-btn').click(); 1")
c.wait("document.querySelectorAll('#grammar-content .structure-part').length === 7", timeout=6)
check("12 one click -> one call; parts coloured by role; time marker called out with its kind",
      """__calls.length === 1 && !!document.querySelector('#grammar-content .structure-part.structure-role-time')
         && document.querySelector('#grammar-content .structure-markers').textContent.includes('Hier')
         && document.querySelector('#grammar-content .structure-markers').textContent.includes(t('structKind_past'))
         && document.querySelector('#grammar-content .structure-summary').textContent.includes('Marqueur')""")
check("13 re-focusing the same sentence opens the cached breakdown at once, with no new call",
      """(async () => { focusGrammarItem(__item, 'fr'); await new Promise(r => setTimeout(r, 150));
         return __calls.length === 1 && document.querySelectorAll('#grammar-content .structure-part').length === 7 && !document.querySelector('#grammar-content .structure-result').hidden; })()""")

# ---- 4. model text is text, not markup ----
xss = json.dumps({"language": "fr", "parts": [{"text": "Hier", "role": "time", "kind": "past", "note": "<img src=x onerror=window.__pwn=1>"},
                                               {"text": "Marie", "role": "subject", "note": "<b>x</b>"}], "summary": "<script>window.__pwn=2</script>"})
c.js("__reply = %s; 1" % json.dumps(xss))
c.js("""(() => { const s = 'Hier, Marie a dormi tard.'; const box = document.createElement('div'); document.body.appendChild(box); window.__box = box;
  getSentenceStructure(s, 'fr').then(r => renderSentenceStructure(box, r)); return 1; })()""")
c.wait("!!__box.querySelector('.structure-part')", timeout=6)
check("14 model-supplied notes/summary never become markup",
      "!window.__pwn && !__box.querySelector('img, script') && __box.textContent.includes('<img src=x')")

# ---- 5. Practice: validation, rendering, row actions ----
c.js(r"""(() => {
  const long = 'Je vais au marché avec ma voisine chaque samedi matin pour acheter des légumes frais, des fruits mûrs et du pain chaud avant de rentrer tranquillement à la maison.';
  const items = [];
  for (let i = 0; i < 10; i++) items.push({ text: i === 0 ? 'Hier, nous avons mangé des fruits au jardin avec toute la famille réunie.' : long + ' ' + i,
    targets: i === 0 ? [{ surface: 'avons mangé', lemma: 'manger', occurrence: 1, pos: 'verb', features: {}, explanation: 'x', forms: null }]
                     : [{ surface: 'vais', lemma: 'aller', occurrence: 1, pos: 'verb', features: {}, explanation: 'x', forms: null }],
    timeMarkers: i === 0 ? [{ surface: 'Hier', occurrence: 1, kind: 'past' }, { surface: 'avons', occurrence: 1, kind: 'past' }, { surface: 'nulle part', kind: 'past' }, { surface: 'toute la famille', kind: 'bogus' }]
                         : [{ surface: 'chaque samedi matin', occurrence: 1, kind: 'frequency' }] });
  window.__reading = validatePracticeReading({ title: 'Test', language: 'fr', mode: 'verbs', sections: [{ heading: 'manger', kind: 'examples', items }] }, { language: 'fr', mode: 'verbs' });
  return 1; })()""")
check("15 timeMarkers validated: real whole-word spans kept, a marker overlapping a target dropped, invented text dropped, bogus kind -> null",
      """(() => { const m = __reading.timeMarkers.filter(x => x.paragraphIndex === 0);
         return m.length === 2 && m[0].surface === 'Hier' && m[0].kind === 'past' && m[1].surface === 'toute la famille' && m[1].kind === null
           && __reading.timeMarkers.length === 11 && __reading.timeMarkers.every(x => __reading.paragraphs[x.paragraphIndex].startsWith(x.surface, x.start)); })()""")
check("16 a reading WITHOUT timeMarkers (older / bare reply) still validates and renders",
      """(() => { const old = JSON.parse(JSON.stringify(__reading)); delete old.timeMarkers; return isValidPracticeReading(old) && !!renderPracticeReading(old).querySelector('.practice-target'); })()""")

c.js("__calls.length = 0; __reply = %s; 1" % json.dumps(json.dumps({"language": "fr", "parts": [
    {"text": "Hier", "role": "time", "kind": "past", "note": "passé composé"}, {"text": "nous", "role": "subject"},
    {"text": "avons mangé", "role": "verb"}, {"text": "des fruits", "role": "object"}], "summary": "Temps + sujet + verbe + objet."}, ensure_ascii=False)))
c.js("""(() => { const host = document.createElement('div'); host.id = 'ptest'; document.body.appendChild(host);
  host.appendChild(renderPracticeReading(__reading)); return 1; })()""")
check("17 markers render as a distinct dotted element; the overlapping target keeps its button",
      """(() => { const row = document.querySelector('#ptest [data-paragraph="0"]');
         const marks = [...row.querySelectorAll('.practice-time-marker')].map(x => x.textContent);
         return marks.join('|') === 'Hier|toute la famille' && row.querySelector('.practice-target').textContent === 'avons mangé'; })()""")
check("18 the sentence row has the 🧩 button; a story paragraph does not",
      "!!document.querySelector('#ptest [data-paragraph=\"0\"] .practice-structure-btn') && !buildPracticeSentenceRow(99, 'Une histoire. Elle continue.', [], 'fr', 'story', []).querySelector('.practice-structure-btn')")
c.js("""document.querySelector('#ptest [data-paragraph="0"] .practice-structure-btn').click(); 1""")
c.wait("document.querySelectorAll('#ptest [data-paragraph=\"0\"] .structure-part').length === 4", timeout=6)
check("19 🧩 shows the breakdown under the sentence with ONE call; a second press only hides it",
      """(() => { const row = document.querySelector('#ptest [data-paragraph="0"]'); const calls = __calls.length;
         row.querySelector('.practice-structure-btn').click();
         return calls === 1 && row.querySelector('.practice-sentence-structure').hidden && __calls.length === 1; })()""")
c.js("""document.querySelector('#ptest [data-paragraph="1"] .practice-time-marker').click(); 1""")
c.wait("document.querySelector('#ptest [data-paragraph=\"1\"] .practice-sentence-structure') && !document.querySelector('#ptest [data-paragraph=\"1\"] .practice-sentence-structure').hidden", timeout=6)
check("20 clicking a time marker opens that sentence's breakdown",
      "document.querySelector('#ptest [data-paragraph=\"1\"] .practice-structure-btn').getAttribute('aria-expanded') === 'true'")
check("21 clicking a target still focuses its exact Grammar occurrence with zero AI calls",
      """(() => { const n = __calls.length; document.querySelector('#ptest [data-paragraph="0"] .practice-target').click();
         return __calls.length === n && grammarContext.focused && grammarContext.focused.surface === 'avons mangé'; })()""")

# ---- 6. the practice prompt asks for markers in verbs mode only ----
check("22 the Practice prompt asks for time markers for Verbs, not for Adjectives",
      """(() => { const base = { sourceLanguage: 'fr', level: 'B1', sourceText: '', lemmas: ['manger'], seenForms: [] };
         const v = buildPracticeReadingPrompt(Object.assign({ mode: 'verbs' }, base), ['manger'], 'Ukrainian');
         const a = buildPracticeReadingPrompt(Object.assign({ mode: 'adjectives' }, base), ['grand'], 'Ukrainian');
         return v.includes('"timeMarkers"') && !a.includes('timeMarkers'); })()""")
print('ALL SENTENCE STRUCTURE CHECKS PASSED')
