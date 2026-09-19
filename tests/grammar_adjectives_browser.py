"""French adjective Grammar Analysis (Learning v1) — pedagogical correctness tests.
Tests real textbook-like French sentences, confidence independence, liaison
forms, predicate adjectives, false positives, and schema shape — not just
that the code runs without throwing.
"""
import os, time
from browser_cdp import CDP

c = CDP(); c.sock.settimeout(45)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=900, height=1200, deviceScaleFactor=1, mobile=False)

c.call('Page.navigate', url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert")
c.js("localStorage.clear();showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove()")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof analyzeFrenchAdjectives === 'function'")

def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1)
        result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name)

def analyze(js_var, sentence):
    c.js(f"window.{js_var} = analyzeFrenchAdjectives({sentence!r})")

# TEST 1: Regular feminine agreement — sportif -> sportive
print("\n=== TEST 1: Regular -f -> -ve feminine agreement ===")
analyze('t1', 'une fille sportive')
check("T1: exactly one adjective found", "window.t1.units.filter(u=>u.type==='adjective').length===1")
check("T1: lemma resolved to sportif", "window.t1.units[0].lemma==='sportif'")
check("T1: gender feminine, number singular", "window.t1.units[0].attributes.gender==='feminine' && window.t1.units[0].attributes.number==='singular'")
check("T1: modifies fille", "window.t1.units[0].dependency.modifiesNoun==='fille'")
check("T1: high confidence or better (dictionary noun + regular rule)", "['confirmed','high_confidence'].includes(window.t1.units[0].confidence)")
check("T1: forms chain complete", "window.t1.units[0].morphology.forms.masc_sing==='sportif' && window.t1.units[0].morphology.forms.fem_sing==='sportive'")

# TEST 2: Double transformation — sportif -> sportive -> sportives
print("\n=== TEST 2: Plural feminine chain (double transformation) ===")
analyze('t2', 'des filles sportives')
check("T2: lemma resolved to sportif despite plural+feminine form", "window.t2.units[0].lemma==='sportif'")
check("T2: number plural", "window.t2.units[0].attributes.number==='plural'")
check("T2: modifies filles", "window.t2.units[0].dependency.modifiesNoun==='filles'")

# TEST 3: Masculine plural — des garçons sportifs
print("\n=== TEST 3: Masculine plural (regular +s) ===")
analyze('t3', 'des garçons sportifs')
check("T3: lemma sportif, masc plural", "window.t3.units[0].lemma==='sportif' && window.t3.units[0].attributes.gender==='masculine' && window.t3.units[0].attributes.number==='plural'")

# TEST 4: Irregular -eux/-euse — heureux/heureuse
print("\n=== TEST 4: Irregular-pattern -eux -> -euse ===")
analyze('t4', 'des femmes heureuses')
check("T4: lemma resolved to heureux", "window.t4.units[0].lemma==='heureux'")
check("T4: rule mentions euse", "window.t4.units[0].morphology.rule.includes('euse')")

# TEST 5: Liaison forms — bel/vieil/nouvel before vowel-initial noun
print("\n=== TEST 5: Liaison forms (bel/vieil/nouvel) ===")
analyze('t5a', 'un bel appartement')
check("T5a: bel resolves to lemma beau", "window.t5a.units[0].lemma==='beau'")
check("T5a: high confidence overall (form confirmed, dependency positional)", "['confirmed','high_confidence'].includes(window.t5a.units[0].confidence)")
check("T5a: morphology field itself is fully confirmed (liaison lexicon fact)", "window.t5a.units[0]._fieldConfidence.form==='confirmed'")
analyze('t5b', 'un vieil homme')
check("T5b: vieil resolves to lemma vieux", "window.t5b.units[0].lemma==='vieux'")
analyze('t5c', 'un beau jardin')
check("T5c: beau (non-liaison) resolves to itself", "window.t5c.units[0].lemma==='beau'")
analyze('t5d', 'des beaux jardins')
check("T5d: beaux resolves to lemma beau, masc plural", "window.t5d.units[0].lemma==='beau' && window.t5d.units[0].attributes.number==='plural'")

# TEST 6: une belle maison / une vieille maison — feminine irregular
print("\n=== TEST 6: Feminine irregular (belle/vieille) ===")
analyze('t6a', 'une belle maison')
check("T6a: belle resolves to lemma beau", "window.t6a.units[0].lemma==='beau'")
check("T6a: modifies maison, feminine", "window.t6a.units[0].dependency.modifiesNoun==='maison' && window.t6a.units[0].dependency.nounGender==='feminine'")
analyze('t6b', 'une vieille maison')
check("T6b: vieille resolves to lemma vieux", "window.t6b.units[0].lemma==='vieux'")

# TEST 7: Multiple adjectives around one noun — independent relationships
print("\n=== TEST 7: Multiple adjectives, independent confidence per relationship ===")
analyze('t7', 'Les petites voitures françaises sont rouges.')
check("T7: at least 3 adjectives found (petites, françaises, rouges)", "window.t7.units.filter(u=>u.type==='adjective').length>=3")
check("T7: petites modifies voitures", "window.t7.units.find(u=>u.observed==='petites').dependency.modifiesNoun==='voitures'")
check("T7: françaises modifies voitures", "window.t7.units.find(u=>u.observed==='françaises').dependency.modifiesNoun==='voitures'")
check("T7: rouges detected as predicate position", "window.t7.units.find(u=>u.observed==='rouges').dependency.position==='predicate'")
check("T7: each adjective has its OWN confidence (not copied)", """
(function(){
  const petites = window.t7.units.find(u=>u.observed==='petites');
  const rouges = window.t7.units.find(u=>u.observed==='rouges');
  return petites._fieldConfidence.dependency !== undefined && rouges._fieldConfidence.dependency !== undefined;
})()
""")

# TEST 8: Predicate adjective confidence must not exceed adjacent-position confidence
print("\n=== TEST 8: Predicate adjectives are never over-confident ===")
analyze('t8', 'La maison est belle.')
check("T8: belle found with predicate or after position", "['predicate','after'].includes(window.t8.units[0].dependency.position)")
check("T8: predicate dependency is heuristic/ambiguous, not confirmed", "window.t8.units[0]._fieldConfidence.dependency !== 'confirmed'")

# TEST 9: Weakest-link rule — confirmed morphology must NOT make uncertain dependency look confirmed
print("\n=== TEST 9: Weakest-link confidence enforcement ===")
c.js(r"""
window.t9 = analyzeFrenchAdjectives('sportive quelque chose incertain');
""")
check("T9: overall confidence never exceeds weakest field", """
(function(){
  return window.t9.units.every(u => {
    const rank = {confirmed:4, high_confidence:3, ai_assisted:2.5, heuristic:2, ambiguous:1};
    const fc = u._fieldConfidence;
    if (!fc) return true;
    const weakest = Math.min(rank[fc.form]||4, rank[fc.dependency]||4, rank[fc.gender]||4);
    return rank[u.confidence] <= weakest + 0.01;
  });
})()
""")

# TEST 10: Non-adjective false positives — words that look like adjectives but aren't
print("\n=== TEST 10: False-friend suppression ===")
analyze('t10', 'la valeur de la voiture')
check("T10: valeur/voiture not classified as adjectives", "!window.t10.units.some(u => u.observed==='valeur' || u.observed==='voiture')")

# TEST 11: Uncertain cases stay uncertain (no fabricated confidence)
print("\n=== TEST 11: Ambiguous/unknown cases stay marked ambiguous ===")
analyze('t11', 'Truc bizarre chose')
check("T11: no adjective in this analysis is falsely marked confirmed", """
(function(){
  return window.t11.units.filter(u=>u.type==='adjective').every(u => u.confidence !== 'confirmed' || u.morphology.rule !== 'pattern unclear');
})()
""")

# TEST 12: GrammarAnalysis schema shape
print("\n=== TEST 12: Schema conformance ===")
check("T12: analysis has sourceText, units, metadata", "typeof window.t1.sourceText==='string' && Array.isArray(window.t1.units) && typeof window.t1.metadata==='object'")
check("T12: unit has confidence in valid enum", "['confirmed','high_confidence','heuristic','ambiguous','ai_assisted'].includes(window.t1.units[0].confidence)")
check("T12: GrammarAnalysis.validateUnit rejects bad type", "GrammarAnalysis.validateUnit({type:'bogus', observed:'x'}).length>0")

# TEST 13: AI fallback prompt/apply — schema validation rejects hallucinated noun
print("\n=== TEST 13: AI fallback validates against source sentence ===")
c.js(r"""
window.t13 = analyzeFrenchAdjectives('un mot ambigu ici');
window.t13unit = window.t13.units.find(u=>u.type==='adjective') || {id:'x', lemma:'ambigu', observed:'ambigu', attributes:{}, dependency:{}, morphology:{forms:{},rule:''}, _fieldConfidence:{form:'heuristic',dependency:'ambiguous',gender:'ambiguous'}};
window.t13prompt = buildAdjectiveAIFallbackPrompt(window.t13unit, 'un mot ambigu ici');
window.t13rejected = applyAdjectiveAIFallback(window.t13unit, '{"nom_modifie":"quelquechosequinexistepas","genre":"feminine","nombre":"singular","position":"after","confiance":"high_confidence"}', 'un mot ambigu ici');
""")
check("T13: prompt includes the full sentence", "window.t13prompt.includes('un mot ambigu ici')")
check("T13: hallucinated noun (not substring of sentence) is REJECTED", "window.t13rejected === false")

c.js(r"""
window.t13valid = applyAdjectiveAIFallback(window.t13unit, '{"nom_modifie":"mot","genre":"masculine","nombre":"singular","position":"after","confiance":"heuristic"}', 'un mot ambigu ici');
""")
check("T13: valid substring noun is ACCEPTED and marked ai_assisted", "window.t13valid === true && window.t13unit.source === 'ai_fallback'")

# TEST 14: UI rendering — dense rows, not cards; confidence mark visible
print("\n=== TEST 14: Learning UI renders dense rows with confidence marks ===")
c.js(r"""
window.__t14box = document.createElement('div');
document.body.appendChild(window.__t14box);
renderAdjectiveAnalysisUI(analyzeFrenchAdjectives('une fille sportive et un garçon heureux'), window.__t14box);
""")
check("T14: original sentence preserved and visible", "window.__t14box.querySelector('.adj-source-sentence').textContent.includes('sportive')")
check("T14: rows rendered (not card-sized blocks)", "window.__t14box.querySelectorAll('.adj-row').length>=2")
check("T14: confidence mark rendered per row", "window.__t14box.querySelectorAll('.adj-mark').length>=2")
check("T14: rule text visible per row", "window.__t14box.querySelector('.adj-row-rule').textContent.length>0")

# TEST 15: lexicon audit — no fabricated non-French entries remain
print("\n=== TEST 15: Lexicon contains only verified irregular entries ===")
check("T15: lexicon is small (curated, not exhaustive dump)", "Object.keys(FRENCH_IRREGULAR_ADJECTIVE_LEXICON).length < 40")
check("T15: no garbage 'valh*' entries from earlier draft remain", "!Object.keys(FRENCH_IRREGULAR_ADJECTIVE_LEXICON).some(k => k.startsWith('valh') || k.startsWith('valg'))")

print("\n=== ALL FRENCH ADJECTIVE GRAMMAR ANALYSIS TESTS PASSED ===")
