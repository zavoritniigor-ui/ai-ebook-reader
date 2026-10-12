"""Online, sentences/phrases are translated by AI only (never by the context-blind machine translator); with no AI (offline / no key / AI
failed) the on-device Chrome translator answers (⌂), and only without it does the popup say why; a single word still falls back to the
machine/dictionary path. With two keys Groq answers first (⚡) and OpenAI replaces it (🧠). No network."""
import base64, json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof handleWordOrSelection==='function'", timeout=30)
c.js("localStorage.clear(); 1"); c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof handleWordOrSelection==='function'", timeout=30)
c.js("window.__machine = []; aiAvailable = () => false; machineTranslate = async (text) => { __machine.push(text); return {html: 'MACHINE', plain: 'MACHINE', extras: ''}; }; state.targetLang = 'uk'; translateLocally = async () => null; 1")


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


c.js("handleWordOrSelection('Le chat dort sur la table.', 200, 200)"); time.sleep(1)
check('1 a sentence without AI: no machine call, the popup explains that AI is needed',
      "__machine.length === 0 && els.ttTranslation.textContent === t('sentenceNeedsAi')")
c.js("state.translationCache = {}; handleWordOrSelection('chat', 200, 200)"); time.sleep(1)
check('2 a single word without AI still falls back to the machine/dictionary path', "__machine.join('|') === 'chat' && els.ttTranslation.textContent.includes('MACHINE')")
c.js("state.translationCache = {}; translateLocally = async () => 'ЛОКАЛЬНИЙ переклад'; handleWordOrSelection('Le chat dort sur la table.', 200, 200)"); time.sleep(1)
check('3 a sentence without AI is translated by the on-device translator (⌂), no machine call',
      "__machine.length === 1 && els.ttTranslation.textContent.includes('ЛОКАЛЬНИЙ переклад') && els.ttTranslation.textContent.includes('⌂')")

# Groq first, OpenAI replaces it
c.js("""(() => { aiAvailable = () => true; translationProviders = () => ['groq', 'openai']; window.__mode = 'both';
  aiTranslateText = async (text, src, sig, tl, ctx, wa, p) => { if (p === 'groq') { if (__mode === 'groqfail') return null; return 'Відповідь Groq'; }
    await new Promise(r => setTimeout(r, 700)); return __mode === 'openaifail' ? null : 'Відповідь OpenAI'; };
  state.translationCache = {}; handleWordOrSelection('Le chat dort sur la table.', 200, 200); return 1; })()"""); time.sleep(0.3)
check('4a the fast answer (Groq ⚡) is on screen while OpenAI is still thinking', "els.ttTranslation.textContent.includes('Відповідь Groq') && els.ttTranslation.textContent.includes('⚡')")
time.sleep(1.2)
check('4b OpenAI then replaces it (🧠)', "els.ttTranslation.textContent.includes('Відповідь OpenAI') && els.ttTranslation.textContent.includes('🧠') && !els.ttTranslation.textContent.includes('Відповідь Groq')")
c.js("__mode = 'openaifail'; state.translationCache = {}; handleWordOrSelection('Le chat dort sur la table.', 210, 200); 1"); time.sleep(1.5)
check('4c OpenAI failing leaves the Groq answer in place', "els.ttTranslation.textContent.includes('Відповідь Groq') && els.ttTranslation.textContent.includes('⚡')")
c.js("__mode = 'groqfail'; state.translationCache = {}; handleWordOrSelection('Le chat dort sur la table.', 220, 200); 1"); time.sleep(1.5)
check('4d Groq failing: OpenAI is waited for and used', "els.ttTranslation.textContent.includes('Відповідь OpenAI')")
print('ALL PASS')
