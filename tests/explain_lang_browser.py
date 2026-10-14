"""AI explanations follow the MENU language; translations keep the TRANSLATION language. Bug (user, Russian phone): «Запитай AI»
answered in Ukrainian because explanations were asked in the translation language, which defaulted to Ukrainian for everyone.
Now: a Russian system gets the Russian menu AND Russian translations on first start; with a Russian menu and Ukrainian
translations, Ask AI / language analysis / grammar / rules / sentence breakdown are asked in Russian while a word translation is
still asked in Ukrainian; switching the menu language does not serve a cached explanation in the old language. No network."""
import os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.addScriptToEvaluateOnNewDocument', source="Object.defineProperty(navigator,'languages',{get:()=>['ru-RU','ru'],configurable:true});")
READY = "document.readyState==='complete' && !document.body.inert && typeof explainLangName==='function'"
c.call('Page.navigate', url=URL); c.wait(READY, timeout=30)
c.js("localStorage.clear(); 1"); c.call('Page.reload'); c.wait(READY, timeout=30); time.sleep(0.5)


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


check('1 a Russian system starts with the Russian menu and Russian translations', "state.uiLang === 'ru' && state.targetLang === 'ru' && document.getElementById('target-lang').value === 'ru'")
c.js("""(() => { state.targetLang = 'uk'; window.__prompts = []; aiAvailable = () => true; speakText = () => {}; speakInLang = () => {};
  callAI = async (prompt) => { __prompts.push(String(prompt)); return '<b>ok</b>'; }; return 1; })()""")
check('2 the explanation language is the menu language (Russian), not the translation language (Ukrainian)', "explainLangName() === LANG_NAMES.ru && LANG_NAMES.ru !== LANG_NAMES.uk")
c.js("__prompts.length = 0; startAiTask('The house is big.', 'level'); 1"); time.sleep(0.5)
check('3 language analysis asks for the answer in Russian', "__prompts.length === 1 && __prompts[0].includes('ВИКЛЮЧНО ' + LANG_NAMES.ru) && !__prompts[0].includes('ВИКЛЮЧНО ' + LANG_NAMES.uk)")
c.js("__prompts.length = 0; startAiTask('The house is big.', 'ask', 'What does big mean?'); 1"); time.sleep(0.5)
check('4 an Ask AI question is answered in Russian', "__prompts.length === 1 && __prompts[0].includes(LANG_NAMES.ru) && !__prompts[0].includes(LANG_NAMES.uk)")
check('5 a word translation is still asked in the translation language (Ukrainian)',
      "(async () => { __prompts.length = 0; const real = callAI; callAI = async (p) => { __prompts.push(String(p)); return 'будинок'; }; try { await aiTranslateText('house', 'en', undefined, state.targetLang, 'The house is big.'); } catch (e) {} callAI = real; return __prompts.some(p => p.includes(LANG_NAMES.uk)) && !__prompts.some(p => p.includes(LANG_NAMES.ru)); })()")
check('6 cached explanations are keyed by the menu language (switching it does not reuse the old language)',
      "(() => { const a = structureCacheKey('The house is big.', 'en'); state.uiLang = 'uk'; const b = structureCacheKey('The house is big.', 'en'); state.uiLang = 'ru'; return a !== b; })()")
print('ALL PASS')
