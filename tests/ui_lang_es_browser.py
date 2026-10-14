"""Spanish is a menu (UI) language: the menu-language select offers it, a stored choice is kept, a Spanish system gets it on
first start, EVERY interface string has its own Spanish text (also those defined after core.js), the menu really switches, and
Spanish text gets a grammar configuration of its own. No network."""
import os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.addScriptToEvaluateOnNewDocument', source="Object.defineProperty(navigator,'languages',{get:()=>['es-ES','en'],configurable:true});")
READY = "document.readyState==='complete' && !document.body.inert && typeof I18N_ES==='object'"
c.call('Page.navigate', url=URL); c.wait(READY, timeout=30)
c.js("localStorage.clear(); 1"); c.call('Page.reload'); c.wait(READY, timeout=30); time.sleep(0.5)


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


check('1 a Spanish system starts with the Spanish menu', "state.uiLang === 'es' && document.getElementById('ui-lang').value === 'es'")
# Same as the English text on purpose: brand names, icons and words spelled the same in both languages.
SAME = "['close', 'tocIcon', 'page', 'error', 'themeSepia', 'voicesHi', 'libSourceGutenberg', 'libSourceWikisource', 'libSourceArchive', 'genHumor']"
check('2 every interface string has its own Spanish text', "Object.keys(I18N).every(k => I18N[k].es && (I18N[k].es !== I18N[k].en || %s.includes(k)))" % SAME)
check('3 the menu is shown in Spanish', "t('open') === '📂 Abrir libro' && [...document.querySelectorAll('[data-i18n=\"wheelOpen\"]')].every(e => e.textContent.includes('Abrir libro'))")
c.js("els.uiLang.value = 'fr'; els.uiLang.dispatchEvent(new Event('change')); 1"); time.sleep(0.3)
check('4 switching to another menu language and back works', "state.uiLang === 'fr' && t('open') !== '📂 Abrir libro'")
c.js("els.uiLang.value = 'es'; els.uiLang.dispatchEvent(new Event('change')); 1"); time.sleep(0.3)
c.call('Page.reload'); c.wait(READY, timeout=30); time.sleep(0.5)
check('5 the Spanish choice survives a restart', "state.uiLang === 'es' && t('tClose') === 'Cerrar'")
check('6 Spanish text has its own grammar configuration', "hasGrammarConfig('es') && GRAMMAR_LANG_CONFIG.es.labels.verbs === 'Verbos' && GRAMMAR_LANG_CONFIG.es.verb.persons.length === 6")
print('ALL PASS')
