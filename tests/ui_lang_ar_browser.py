# Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
# Copying, modification, distribution or commercial use without written permission is prohibited.
"""Arabic everywhere (owner, 2026-11-24): a menu language with its own text for EVERY interface string (js/i18n-ar.js), a
translation and speech language, the microphone's language, and its own grammar configuration. An Arabic system starts with the
Arabic menu AND Arabic translations (the system's language). The interface's own text reads from the right (body.ui-rtl): the
menu is laid out right to left, the book's text is not touched. No network."""
import os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.addScriptToEvaluateOnNewDocument', source="Object.defineProperty(navigator,'languages',{get:()=>['ar-SA','en'],configurable:true});")
READY = "document.readyState==='complete' && !document.body.inert && typeof I18N_AR==='object'"
c.call('Page.navigate', url=URL); c.wait(READY, timeout=30)
c.js("localStorage.clear(); 1"); c.call('Page.reload'); c.wait(READY, timeout=30); time.sleep(0.5)


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


check('1 an Arabic system starts with the Arabic menu and Arabic translations (the system language)',
      "state.uiLang === 'ar' && els.uiLang.value === 'ar' && state.targetLang === 'ar' && els.targetLang.value === 'ar'")
# Names that stay as written in every language: brands, library names, a book title, symbols.
SAME = "['close', 'tocIcon', 'page', 'openaiKeyTitle', 'libSourceGutenberg', 'libSourceWikisource', 'libChipWikisource', 'libSourceArchive', 'libSourceLoc', 'libChipLoc', 'scanPdfA4', 'demoTitle', 'offUnitMb']"
check('2 every interface string has its own Arabic text (Arabic letters, unless it is a name)',
      "(() => { const bad = Object.keys(I18N).filter(k => !(I18N[k].ar && (/[\\u0600-\\u06FF]/.test(I18N[k].ar) || %s.includes(k) || !/[A-Za-z]{2}/.test(I18N[k].en || '')))); return bad.length === 0 || bad; })()" % SAME)
check('3 every placeholder and line break of a string is kept in its Arabic text',
      "(() => { const ph = s => (String(s || '').match(/\\{[a-zA-Z_]+\\}/g) || []).sort().join() + '|' + (String(s || '').split('\\n').length); const bad = Object.keys(I18N).filter(k => ph(I18N[k].en) !== ph(I18N[k].ar)); return bad.length === 0 || bad; })()")
check('4 the menu is shown in Arabic and laid out right to left; the book area is not',
      "t('open') === '📂 افتح كتابًا' && document.body.classList.contains('ui-rtl') && getComputedStyle(document.getElementById('app-header')).direction === 'rtl' && getComputedStyle(els.pages).direction === 'ltr'")
check('5 a hint names a button by its own Arabic label', "/«القواعد»/.test(t('grammarHint')) && t('btnGrammar').includes('القواعد')")
check('6 Arabic is a translation language with its speech locale, and the microphone offers it',
      "TARGET_LANGUAGE_CODES.includes('ar') && LANG_TAGS.ar === 'ar-SA' && !!els.targetLang.querySelector('option[value=\"ar\"]') && !!els.micLang.querySelector('option[value=\"ar-SA\"]')")
check('7 Arabic text has its own grammar configuration', "hasGrammarConfig('ar') && GRAMMAR_LANG_CONFIG.ar.labels.verbs === 'الأفعال' && GRAMMAR_LANG_CONFIG.ar.verb.persons.length === 12")
check('8 the AI explains in Arabic', "explainLangName() === LANGUAGE_CONFIG.ar.aiName")
c.js("els.uiLang.value = 'fr'; els.uiLang.dispatchEvent(new Event('change')); 1"); time.sleep(0.3)
check('9 another menu language: left to right again', "state.uiLang === 'fr' && !document.body.classList.contains('ui-rtl') && getComputedStyle(document.getElementById('app-header')).direction === 'ltr'")
c.js("els.uiLang.value = 'ar'; els.uiLang.dispatchEvent(new Event('change')); 1"); time.sleep(0.3)
c.call('Page.reload'); c.wait(READY, timeout=30); time.sleep(0.5)
check('10 the Arabic choice survives a restart', "state.uiLang === 'ar' && document.body.classList.contains('ui-rtl') && t('tClose') === I18N_AR.tClose")
# A French system keeps the old rule: translations into Ukrainian (French and English are the languages learnt here).
c.call('Page.addScriptToEvaluateOnNewDocument', source="Object.defineProperty(navigator,'languages',{get:()=>['fr-FR'],configurable:true});")
c.js("localStorage.clear(); 1"); c.call('Page.reload'); c.wait(READY, timeout=30); time.sleep(0.5)
check('11 a French system: French menu, translations into Ukrainian as before', "state.uiLang === 'fr' && state.targetLang === 'uk'")
print('ALL PASS')
