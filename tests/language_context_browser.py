"""Context-aware EN/FR mixed-language segmentation WITHOUT parentheses
(js/lang-detect.js). Language-learning sentences routinely embed a local
French word/phrase inside an English sentence (or vice versa) with no
parentheses at all — "The French word maison means house.", "Il est très
important to pronounce it correctly." — and the whole-sentence base language
must not swallow the local foreign phrase. Also exercises the test-only
debug inspection (token scores/tiers, cluster/segment boundaries, chosen TTS
locale) and a mixed EN/FR TTS voice-selection smoke test. Must not regress
the parenthetical-translation-pair feature (tests/language_paren_browser.py)
or flat single-language detection. READER_TTS_URL can target production.
"""
import json, os
from browser_cdp import CDP
c = CDP(); c.sock.settimeout(40); c.call('Page.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.navigate', url=os.environ.get('READER_TTS_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert")

# ---- 1. Mandatory regression cases from the task -------------------------
cases = [
    [('en', 'The French word'), ('fr', 'maison'), ('en', 'means house.')],
    [('en', 'Today we learn'), ('fr', 'bonjour'), ('en', 'and'), ('fr', 'merci beaucoup.')],
    [('fr', 'Comment allez-vous?'), ('en', 'means How are you?')],
    [('fr', 'Il est très important'), ('en', 'to pronounce it correctly.')],
    [('en', 'This restaurant is closed.')],
    [('fr', 'Le restaurant est fermé.')],
    [('en', 'I would like to say'), ('fr', 'merci beaucoup.')],
    [('en', 'French:'), ('fr', 'Où est la gare?')],
    # Generalization: different vocabulary, not covered by any word list —
    # relies purely on diacritics/function words/bridging, same as "château"
    # in the module's own original design comment.
    [('fr', 'Nous allons au marché demain.')],
    [('en', 'We will visit the'), ('fr', 'château'), ('en', 'next week.')],
    # Regression: ambiguous cognates with a SINGLE stray weak signal and no
    # real anchor nearby must stay in the base language (no false-positive
    # foreign island from "-tion"/"-ance"-shaped English words).
    [('en', 'This important information is on the restaurant menu.')],
    [('en', 'The question is possible to answer at this table.')],
    [('fr', "J'aime l'école et qu'il parle.")],
]
# Case 8's label may stay EN or FR; only the phrase itself must be FR.
LABEL_FLEX_TEXT = 'French: Où est la gare?'

failures = []
for expected in cases:
    text = ' '.join(part for _, part in expected)
    result = c.js('''(()=>{const text=''' + json.dumps(text) + ''',expected=''' + json.dumps(expected) + ''';
    const words=s=>tokenizeForLang(s).filter(t=>t.isWord).map(t=>t.text);
    const dbg=debugLanguageSegments(text,'en');
    const segments=dbg.segments;
    const actual=segments.flatMap(s=>words(s.text).map(w=>[s.lang,w]));
    const wanted=expected.flatMap(([lang,s])=>words(s).map(w=>[lang,w]));
    const reconstructed=segments.map(s=>s.text).join('');
    return {text, actual, wanted, reconstructed, matches: reconstructed===text,
            wordMatch: JSON.stringify(actual)===JSON.stringify(wanted), dbg};})()''')
    ok = result['matches'] and result['wordMatch']
    if text == LABEL_FLEX_TEXT and not ok:
        phrase_tail = result['actual'][-4:]  # Où/est/la/gare
        ok = result['matches'] and all(lang == 'fr' for lang, _ in phrase_tail)
    if not ok:
        failures.append(result)
        print('FAIL', text, flush=True)
        print('  actual:', result['actual'], flush=True)
        print('  wanted:', result['wanted'], flush=True)
        print('  reconstructed:', repr(result['reconstructed']), flush=True)
    else:
        print('PASS', text, flush=True)
assert not failures, json.dumps(failures, ensure_ascii=False, indent=2)

# ---- 2. Debug inspection: token-level scores/tiers and segment boundaries -
# "maison" must score real FR evidence and land in its own FR segment with an
# exact character span; "restaurant" (ambiguous cognate) must carry NO own
# signal (0/0) yet still end up inside the surrounding base-language segment.
dbg = c.js('''JSON.stringify(debugLanguageSegments("The French word maison means house.","en"))''')
dbg = json.loads(dbg)
maison_tok = next(t for t in dbg['tokens'] if t['token'] == 'maison')
assert maison_tok['fr'] > 0 and maison_tok['tier'] in ('strong-fr', 'weak-fr'), maison_tok
maison_seg = next(s for s in dbg['segments'] if s['text'].strip() == 'maison')
assert maison_seg['lang'] == 'fr' and maison_seg['ttsLocale'] == 'fr-FR', maison_seg
assert maison_seg['from'] < maison_seg['to'], maison_seg
print('PASS debug inspection: maison token/segment/locale', flush=True)

dbg2 = c.js('''JSON.stringify(debugLanguageSegments("This restaurant is closed.","en"))''')
dbg2 = json.loads(dbg2)
restaurant_tok = next(t for t in dbg2['tokens'] if t['token'] == 'restaurant')
assert restaurant_tok['fr'] == 0 and restaurant_tok['en'] == 0 and restaurant_tok['tier'] == 'neutral', restaurant_tok
assert len(dbg2['segments']) == 1 and dbg2['segments'][0]['lang'] == 'en' and dbg2['segments'][0]['ttsLocale'] == 'en-US', dbg2
print('PASS debug inspection: ambiguous cognate has no own signal', flush=True)

# ---- 3. Parenthesis segmentation must be untouched ------------------------
paren = c.js('''JSON.stringify(buildLanguageSegments("bonjour (hello)","en"))''')
paren = json.loads(paren)
assert [s['lang'] for s in paren] == ['fr', 'en'], paren
print('PASS parenthesis segmentation unaffected', flush=True)

# ---- 4. Mixed EN/FR TTS voice-selection smoke test ------------------------
# Exercises exactly what tts.js's speakCurrentSentence does per segment
# (voiceForLangCode(seg.lang)) with deterministic fake voices, and checks:
# no dropped/duplicated words across segment boundaries, every segment
# resolves to a real (non-null) voice, and language actually alternates
# (fr -> en -> fr) with the correct locale each time — the "does TTS switch
# back to EN after an FR segment" requirement.
tts_setup = c.js('''(()=>{
    window.__ttsMockVoices=[
        {voiceURI:'en-us',name:'English',lang:'en-US',localService:true},
        {voiceURI:'fr-fr',name:'French',lang:'fr-FR',localService:true}];
    voices.length=0; voices.push(...window.__ttsMockVoices);
    state.selectedVoiceURIByLang.en='en-us'; state.selectedVoiceURIByLang.fr='fr-fr';
    return true;})()''')
assert tts_setup is True

tts_result = c.js('''(()=>{
    const text="Today we learn bonjour and merci beaucoup.";
    const segments=buildLanguageSegments(text,'en');
    const words=s=>tokenizeForLang(s).filter(t=>t.isWord).map(t=>t.text.toLowerCase());
    const originalWords=words(text);
    const spokenWords=segments.flatMap(s=>words(s.text));
    const voiceTrace=segments.map(s=>{
        const {lang,voice}=voiceForLangCode(s.lang);
        return {segLang:s.lang, ttsLang:lang, voiceURI: voice ? voice.voiceURI : null};
    });
    return {originalWords, spokenWords, voiceTrace,
            noDrop: JSON.stringify(originalWords)===JSON.stringify(spokenWords),
            allVoiced: voiceTrace.every(v=>v.voiceURI!==null)};
})()''')
assert tts_result['noDrop'], tts_result  # no dropped or duplicated words across segments
assert tts_result['allVoiced'], tts_result  # every segment resolves to a real voice
langs_in_order = [v['segLang'] for v in tts_result['voiceTrace']]
# Trailing "." after "beaucoup." reverts to the base-language segment (matches
# the pre-existing, unchanged assembly behavior for any run's closing
# punctuation) — it carries no words, so it doesn't affect spoken content.
assert langs_in_order == ['en', 'fr', 'en', 'fr', 'en'], langs_in_order  # correct alternation, incl. return to EN
assert tts_result['voiceTrace'][1]['ttsLang'] == 'fr-FR' and tts_result['voiceTrace'][1]['voiceURI'] == 'fr-fr'
assert tts_result['voiceTrace'][2]['ttsLang'] == 'en-US' and tts_result['voiceTrace'][2]['voiceURI'] == 'en-us'
print('PASS mixed EN/FR TTS voice-selection smoke (no drops, correct alternation)', flush=True)

print('ALL CONTEXT-AWARE LANGUAGE/TTS CHECKS PASSED')
