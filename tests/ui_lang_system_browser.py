"""Menu language defaults to the system language on first launch: the first of navigator.languages that the app
supports wins, otherwise English; a language the user already chose is never overridden. No network."""
import os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
script_id = None


def load(languages, stored=None):
    global script_id
    if script_id:
        c.call('Page.removeScriptToEvaluateOnNewDocument', identifier=script_id)
    src = "Object.defineProperty(navigator,'languages',{get:()=>%s,configurable:true});" % languages
    if stored:
        src += "localStorage.setItem('reader_ui_lang','%s');" % stored
    else:
        src += "localStorage.removeItem('reader_ui_lang');"
    script_id = c.call('Page.addScriptToEvaluateOnNewDocument', source=src)['identifier']
    c.call('Page.navigate', url=URL)
    c.wait("document.readyState==='complete' && typeof applyI18n==='function'", timeout=30)
    time.sleep(0.3)


def expect(name, languages, want, stored=None):
    load(languages, stored)
    got = c.js("[state.uiLang, document.getElementById('ui-lang').value]")
    assert got == [want, want], (name, got)
    print('PASS', name, flush=True)


expect('1 French system -> fr', '["fr-CA","en-US"]', 'fr')
expect('2 unsupported first, supported second -> second', '["de-DE","ru-RU"]', 'ru')
expect('3 Ukrainian system -> uk', '["uk-UA"]', 'uk')
expect('4 no supported language -> English', '["de-DE","ja-JP"]', 'en')
expect('5 chosen language is not overridden', '["fr-FR"]', 'ko', stored='ko')
c.call('Page.removeScriptToEvaluateOnNewDocument', identifier=script_id)
c.js("localStorage.removeItem('reader_ui_lang'); 1")
print('ALL PASS')
