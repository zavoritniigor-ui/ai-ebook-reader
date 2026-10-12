"""Sentences/phrases are translated by AI only: with no AI available, machine translation is NOT used (no context =
imprecise) and the popup says why; a single word still falls back to the machine/dictionary path. No network."""
import base64, json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof handleWordOrSelection==='function'", timeout=30)
c.js("localStorage.clear(); 1"); c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof handleWordOrSelection==='function'", timeout=30)
c.js("window.__machine = []; aiAvailable = () => false; machineTranslate = async (text) => { __machine.push(text); return {html: 'MACHINE', plain: 'MACHINE', extras: ''}; }; state.targetLang = 'uk'; 1")


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


c.js("handleWordOrSelection('Le chat dort sur la table.', 200, 200)"); time.sleep(1)
check('1 a sentence without AI: no machine call, the popup explains that AI is needed',
      "__machine.length === 0 && els.ttTranslation.textContent === t('sentenceNeedsAi')")
c.js("state.translationCache = {}; handleWordOrSelection('chat', 200, 200)"); time.sleep(1)
check('2 a single word without AI still falls back to the machine/dictionary path', "__machine.join('|') === 'chat' && els.ttTranslation.textContent.includes('MACHINE')")
print('ALL PASS')
