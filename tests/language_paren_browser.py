"""Parenthetical translation pairs in EN/FR mixed text (js/lang-detect.js).
Language-learning books put a word/phrase immediately followed by its translation
in parentheses — bonjour (hello), house (maison) — and the text inside parens must
be detected as an INDEPENDENT language segment, not inherit the language outside
it. Also guards existing flat (non-parenthetical) mixed-language detection so the
paren-aware split doesn't regress it. READER_TTS_URL can target production.
"""
import json, os
from browser_cdp import CDP
c = CDP(); c.sock.settimeout(40); c.call('Page.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.navigate', url=os.environ.get('READER_TTS_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert")

cases = [
    # Основна вимога: переклад у дужках — ОКРЕМИЙ відрізок, у будь-який бік.
    [('fr', 'bonjour'), ('en', '(hello)')],
    [('fr', 'maison'), ('en', '(house)')],
    [('fr', 'Je suis fatigué.'), ('en', '(I am tired.)')],
    [('en', 'hello'), ('fr', '(bonjour)')],
    [('en', 'house'), ('fr', '(maison)')],
    [('en', 'I am tired.'), ('fr', '(Je suis fatigué.)')],
    # Вкладені дужки: кожен рівень аналізується окремо від свого безпосереднього
    # "сусіда", а не від мови всього речення.
    [('en', 'house'), ('fr', '(maison'), ('en', '(house))')],
    # Дужка без жодного надійного власного сигналу все одно не повинна
    # успадкувати мову ЗОВНІ — вона трактується як переклад (протилежна мова).
    [('fr', 'bonjour'), ('en', '(an unknown example)')],
    # Регрес: суцільний (без дужок) одномовний і мішаний текст — незмінна
    # поведінка "плаского" аналізу.
    [('fr', 'Le restaurant est fermé.')],
    [('en', 'This restaurant is closed.')],
    [('fr', "J'aime l'école et qu'il parle.")],
    [('fr', 'Exemple:'), ('fr', 'une bonne question.')],
    [('fr', 'Il est très important'), ('en', 'to pronounce it correctly.')],
]
failures = []
for expected in cases:
    text = ' '.join(part for _, part in expected)
    result = c.js('''(()=>{const text=''' + json.dumps(text) + ''',expected=''' + json.dumps(expected) + ''';
    const words=s=>tokenizeForLang(s).filter(t=>t.isWord).map(t=>t.text);
    const segments=buildLanguageSegments(text,'en');
    const actual=segments.flatMap(s=>words(s.text).map(w=>[s.lang,w]));
    const wanted=expected.flatMap(([lang,s])=>words(s).map(w=>[lang,w]));
    return segments.map(s=>s.text).join('')===text&&JSON.stringify(actual)===JSON.stringify(wanted)?true:{text,actual,wanted,joined:segments.map(s=>s.text).join('')};})()''')
    if result is not True: failures.append(result)
    else: print('PASS', text, flush=True)
assert not failures, json.dumps(failures, ensure_ascii=False, indent=2)
print('ALL PARENTHESES/LANGUAGE CHECKS PASSED')
