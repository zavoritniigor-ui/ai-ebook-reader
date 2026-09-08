"""'Запитай AI' -> 'Мовний розбір' (js/grammar-svo.js buildLanguageLevelPrompt) must
simplify the TAPPED/SELECTED fragment in ITS OWN language, not the language of a
nearby inline translation. Bug: for a bilingual sentence with an inline translation
in parentheses ("The house is big (La maison est grande).") the translation is
often LONGER than the original, so detecting the language of the WHOLE context
sentence "by majority characters" picks the translation's language instead of the
tapped fragment's — a French original could get simplified in English and vice
versa. Fix: js/lang-detect.js's fragmentLangInContext finds the fragment's own
position in the context and reads the segment there, rather than voting over the
whole context. Exercises both the pure prompt builder and the real tap ->
"Запитай AI" -> AI-call wiring. READER_TTS_URL can target production.
"""
import json, os
from browser_cdp import CDP
c = CDP(); c.sock.settimeout(40); c.call('Page.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.navigate', url=os.environ.get('READER_TTS_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert")

# ---- 1. Prompt builder: fragment language must not follow the translation's ----
cases = [
    # (context sentence, tapped fragment, expected word naming the fragment's language)
    ('The house is big (La maison est grande).', 'The house is big', 'англійською'),
    ('The house is big (La maison est grande).', 'La maison est grande', 'французькою'),
    ('Il est fatigué (He is tired).', 'Il est fatigué', 'французькою'),
    ('Il est fatigué (He is tired).', 'He is tired', 'англійською'),
    ('bonjour (hello)', 'bonjour', 'французькою'),
    ('bonjour (hello)', 'hello', 'англійською'),
    # Regression: plain monolingual fragment/context (no inline translation) unaffected.
    ("Je suis très content de vous voir aujourd'hui.", "Je suis très content de vous voir aujourd'hui.", 'французькою'),
    ('I am very happy to see you today.', 'I am very happy to see you today.', 'англійською'),
]
failures = []
for context, fragment, expected_word in cases:
    prompt = c.js('buildLanguageLevelPrompt(' + json.dumps(fragment) + ',' + json.dumps(context) + ',"українською")')
    first_line = prompt.splitlines()[0]
    if expected_word not in first_line:
        failures.append({'context': context, 'fragment': fragment, 'expected': expected_word, 'got': first_line})
        print('FAIL', repr(fragment), 'in', repr(context), '->', first_line, flush=True)
    else:
        print('PASS', repr(fragment), 'in', repr(context), '->', first_line, flush=True)
assert not failures, json.dumps(failures, ensure_ascii=False, indent=2)

# ---- 2. End-to-end: real tap -> "Запитай AI" -> AI-call wiring ------------------
# Reproduces the exact user report: select a bilingual sentence with an inline
# translation, tap "Запитай AI" (els.ttAskBtn), and check the ACTUAL prompt sent
# to the AI names the TAPPED fragment's own language, via the real event handlers
# (handleWordOrSelection + ttAskBtn.onclick), not just the pure prompt function.
setup = c.js('''(()=>{
    state.translateMode=true; state.format='txt';
    els.pages.classList.add('no-anim'); els.pages.style.transform='none';
    document.body.classList.add('immersive-mode');
    window.__prompts=[]; aiAvailable=()=>true;
    speakText=()=>{}; speakInLang=()=>{};
    callAI=async prompt=>{__prompts.push(prompt); return '<b>ok</b>'};
    state.targetLang='uk';
    return true;
})()''')
assert setup is True

sentence = 'The house is big (La maison est grande).'
fragment = 'The house is big'
result = c.js('''(async()=>{
    els.pages.replaceChildren(Object.assign(document.createElement('p'),{textContent:''' + json.dumps(sentence) + '''}));
    els.pages.firstChild.style.marginTop='180px';
    state.lastSelectedRange=document.createRange();
    state.lastSelectedRange.selectNodeContents(els.pages.firstChild);
    window.__prompts=[];
    // handleWordOrSelection also fires its own tooltip-translation AI call; the
    // "Запитай AI" prompt is whatever gets added AFTER that settles and the button
    // is clicked, not necessarily the first one captured overall.
    await handleWordOrSelection(''' + json.dumps(fragment) + ''', 150, 200);
    const before=window.__prompts.length;
    els.ttAskBtn.onclick({stopPropagation(){}});
    await new Promise(r=>setTimeout(r,50));
    return {addedCount: window.__prompts.length-before, lastLine: (window.__prompts[window.__prompts.length-1]||'').split("\\n")[0]};
})()''')
assert result['addedCount'] == 1, result
assert 'англійською' in result['lastLine'], result
print('PASS end-to-end tap -> Запитай AI names the tapped fragment\'s own language', flush=True)

print('ALL ASK-AI LANGUAGE CHECKS PASSED')
