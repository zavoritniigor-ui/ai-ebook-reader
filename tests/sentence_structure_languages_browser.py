"""Sentence breakdown across ALL 8 supported languages (uk, en, fr, ru, zh, ko, hi, ga), with hand-authored GOLD replies.

For each language a real sentence is placed in the book, its tapped-sentence range is saved exactly as selection.js
does, the model is mocked with a gold reply, and the real flow `analyzeSentenceInText` runs. Proves the MECHANICS per
language: the sentence's language is detected correctly (the prompt names the right code), every gold part is accepted
by the validation gate (spaced scripts and unspaced CJK alike, case/apostrophes/particles), each part is painted on
exactly the right characters of the page, the legend is built, and nothing leaks between languages. It cannot judge
the model's linguistic quality -- that needs a live model.
"""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof analyzeSentenceInText==='function'", timeout=30)
c.js("localStorage.clear(); showUpdateBanner=()=>{}; document.getElementById('sw-update-banner')?.remove(); 1")

# Irish is detected only from strong function words (js/lang-detect.js GA_STRONG_WORDS), so its sentence carries two (agus, bhí).
# lang code -> (sentence, [(part text, role, kind)])
CASES = {
    'fr': ("Hier, Marie a mangé une pomme dans le jardin.", [("Hier", "time", "past"), ("Marie", "subject", None), ("a mangé", "verb", None), ("une pomme", "object", None), ("dans le jardin", "place", None)]),
    'en': ("Yesterday, Mary ate an apple in the garden.", [("Yesterday", "time", "past"), ("Mary", "subject", None), ("ate", "verb", None), ("an apple", "object", None), ("in the garden", "place", None)]),
    'uk': ("Вчора Марія з'їла яблуко в саду.", [("Вчора", "time", "past"), ("Марія", "subject", None), ("з'їла", "verb", None), ("яблуко", "object", None), ("в саду", "place", None)]),
    'ru': ("Вчера Мария съела яблоко в саду.", [("Вчера", "time", "past"), ("Мария", "subject", None), ("съела", "verb", None), ("яблоко", "object", None), ("в саду", "place", None)]),
    'zh': ("昨天，玛丽在花园里吃了一个苹果。", [("昨天", "time", "past"), ("玛丽", "subject", None), ("在花园里", "place", None), ("吃了", "verb", None), ("一个苹果", "object", None)]),
    'ko': ("어제 마리아는 정원에서 사과를 먹었습니다.", [("어제", "time", "past"), ("마리아는", "subject", None), ("정원에서", "place", None), ("사과를", "object", None), ("먹었습니다", "verb", None)]),
    'hi': ("कल मारिया ने बगीचे में एक सेब खाया।", [("कल", "time", "past"), ("मारिया ने", "subject", None), ("बगीचे में", "place", None), ("एक सेब", "object", None), ("खाया", "verb", None)]),
    'ga': ("Inné, d'ith Máire úll sa ghairdín agus bhí sí sásta.", [("Inné", "time", "past"), ("d'ith", "verb", None), ("Máire", "subject", None), ("úll", "object", None), ("sa ghairdín", "place", None), ("agus", "connector", None), ("bhí", "verb", None)]),
}


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


c.js("""(() => { aiAvailable = () => true; showToast = () => {}; window.__calls = []; window.__reply = null;
  callAI = async (prompt, signal, task) => { __calls.push({task, prompt}); return __reply; }; return 1; })()""")

for lang, (sentence, parts) in CASES.items():
    reply = json.dumps({"language": lang, "parts": [dict(text=t, role=r, kind=k, note="n") for t, r, k in parts], "summary": "s"}, ensure_ascii=False)
    c.js("""(() => { els.pages.innerHTML = ''; const p = document.createElement('p'); p.id = 'case'; p.textContent = %s; els.pages.appendChild(p);
      const r = document.createRange(); r.selectNodeContents(p);
      state.lastSelectedRange = null; state.ctxSentenceRange = r; state.ctxSentence = %s; structureCache.clear(); __calls.length = 0; __reply = %s;
      els.ttStructHost.replaceChildren(); clearStructureHighlights(); window.__t0 = Date.now(); analyzeSentenceInText(state.ctxSentence); return 1; })()"""
         % (json.dumps(sentence, ensure_ascii=False), json.dumps(sentence, ensure_ascii=False), json.dumps(reply, ensure_ascii=False)))
    c.wait("document.querySelectorAll('#tt-struct-host .struct-key').length === %d" % len(parts), timeout=8)
    check("%s: the sentence language is detected (prompt carries code \"%s\")" % (lang, lang), "__calls.length === 1 && __calls[0].prompt.includes('code \"%s\"')" % lang)
    expected = {role: [t for t, r, _ in parts if r == role] for role in {r for _, r, _ in parts}}
    check("%s: every part is painted on exactly its own characters in the page" % lang,
          "(() => { const exp = %s; return Object.entries(exp).every(([role, texts]) => CSS.highlights.has('struct-' + role) && [...CSS.highlights.get('struct-' + role)].map(r => r.toString()).join('|') === texts.join('|')); })()" % json.dumps(expected, ensure_ascii=False))
    check("%s: one legend button per part, the time marker shows its kind" % lang,
          "(() => { const keys = [...document.querySelectorAll('#tt-struct-host .struct-key')]; return keys.length === %d && keys.some(k => k.textContent.includes(t('structKind_past'))); })()" % len(parts))
    check("%s: the page text is untouched (no rewrapping)" % lang, "document.getElementById('case').childNodes.length === 1 && document.getElementById('case').textContent === %s" % json.dumps(sentence, ensure_ascii=False))

# deep breakdown mechanics on the two scripts most likely to break matching: unspaced CJK and an agglutinated particle
for lang, part in (('zh', '一个苹果'), ('ko', '마리아는')):
    sentence, parts = CASES[lang]
    words = [("一", "determiner"), ("个", "determiner"), ("苹果", "noun")] if lang == 'zh' else [("마리아", "noun"), ("는", "other")]
    reply = json.dumps({"language": lang, "words": [dict(text=w, role=r, note="n") for w, r in words], "explanation": "e"}, ensure_ascii=False)
    c.js("""(() => { els.pages.innerHTML = ''; const p = document.createElement('p'); p.textContent = %s; els.pages.appendChild(p); const r = document.createRange(); r.selectNodeContents(p);
      state.ctxSentenceRange = r; state.ctxSentence = %s; structureCache.clear(); __calls.length = 0;
      __reply = %s; els.ttStructHost.replaceChildren(); analyzeSentenceInText(state.ctxSentence); return 1; })()""" % (json.dumps(sentence, ensure_ascii=False), json.dumps(sentence, ensure_ascii=False), json.dumps(json.dumps({"language": lang, "parts": [dict(text=t, role=r, kind=k) for t, r, k in parts]}, ensure_ascii=False), ensure_ascii=False)))
    c.wait("document.querySelectorAll('#tt-struct-host .struct-key').length === %d" % len(parts), timeout=8)
    c.js("window.__reply = %s; [...document.querySelectorAll('#tt-struct-host .struct-key')].find(k => k.textContent.includes(%s)).click(); 1" % (json.dumps(reply, ensure_ascii=False), json.dumps(part, ensure_ascii=False)))
    c.js("__reply = %s; 1" % json.dumps(reply, ensure_ascii=False))
    c.wait("document.querySelectorAll('#tt-struct-host .struct-deep-head .struct-sub').length === %d" % len(words), timeout=8)
    check("%s: deep breakdown of \"%s\" splits it into %d validated words" % (lang, part, len(words)), "document.querySelector('#tt-struct-host .struct-deep-head').textContent.includes(%s)" % json.dumps(part, ensure_ascii=False))
print('ALL SENTENCE STRUCTURE LANGUAGE CHECKS PASSED')
