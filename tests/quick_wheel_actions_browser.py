"""Every action of the ✦ wheel does something visible when tapped (owner, 2026-11-01: «перевірити в меню прокрутки
(сонечко), чи усі кнопки при кліку виводять інформацію або виклик функції»).

tests/quick_wheel_browser.py checks that a tap reaches the control behind each action (it stops the event there); this suite
lets the action run on a real open book and checks its RESULT, each on a freshly loaded page:
open a file → the file picker; read aloud → speech starts; study mode → toggles; page understanding → the menu opens with the
statistics popover; theme → the menu opens on the theme selector; contents → the sidebar opens; print → the browser's print
dialog; pen → ink mode with its tools; region → region mode; language level → with a fragment it asks the AI (the Ask panel
opens), without one it says to select text first; library → the library opens; scanner → the scanner opens; rules → the
rules panel opens; full menu → the menu opens. Nothing throws.
"""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=412, height=915, deviceScaleFactor=2, mobile=True)
c.call('Page.addScriptToEvaluateOnNewDocument', source="""
window.__errs = []; addEventListener('error', e => __errs.push(e.message)); addEventListener('unhandledrejection', e => __errs.push(String(e.reason)));
window.__spy = {}; const hit = k => { __spy[k] = (__spy[k] || 0) + 1; };
const realClick = HTMLInputElement.prototype.click;
HTMLInputElement.prototype.click = function () { if (this.type === 'file') { hit('picker:' + this.id); return; } return realClick.call(this); };
try { speechSynthesis.speak = () => hit('speak'); } catch (e) {}
// print dialogs: the reader prints through an iframe; count the call instead of opening the system dialog
const realAppend = Element.prototype.append;
Element.prototype.append = function (...nodes) { const r = realAppend.apply(this, nodes); for (const n of nodes) if (n && n.tagName === 'IFRAME') try { n.contentWindow.print = () => hit('print'); } catch (e) {} return r; };
window.print = () => hit('print');
""")
READY = "document.readyState==='complete' && !document.body.inert && typeof quickMenu==='object' && typeof openBookFile==='function'"
TEXT = "Chapitre 1\n\n" + "\n\n".join("Le petit prince regardait les étoiles chaque soir, et il pensait à sa rose. Phrase numéro %d." % i for i in range(60))


def check(name, expression, timeout=4):
    deadline = time.time() + timeout
    result = c.js(expression)
    while result is not True and time.time() < deadline:
        time.sleep(0.15); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def fresh(setup=''):
    c.call('Page.navigate', url=URL); c.wait(READY, timeout=30)
    c.js("localStorage.setItem('reader_onboarding_done', '1'); showUpdateBanner = () => {}; 1")
    c.js("window.__ok = 0; openBookFile(new File([%s], 'livre.txt', {type: 'text/plain', lastModified: 3})).then(() => __ok = 1, e => __ok = String(e)); 1" % json.dumps(TEXT))
    c.wait("window.__ok !== 0", timeout=30)
    assert c.js("window.__ok") == 1, c.js("window.__ok")
    time.sleep(0.6)
    if setup: c.js(setup + "; 1")


def tap(action):
    c.js("document.getElementById('qm-launcher').click(); 1"); time.sleep(0.8)
    assert c.js("!document.getElementById('quick-menu').hidden && !document.querySelector('.qm-item[data-action=\"%s\"]').disabled" % action) is True, ('wheel open, action enabled', action)
    c.js("document.querySelector('.qm-item[data-action=\"%s\"]').click(); 1" % action)


TOAST = "(document.getElementById('reader-toast')?.textContent || '')"
CASES = [
    ('file-upload', "📂 Open a file → the file picker opens", "__spy['picker:file-upload'] === 1", ''),
    ('btn-tts', "🔊 Read aloud → speech starts", "__spy.speak >= 1 && isSpeakingGlobal === true", ''),
    ('btn-translate-mode', "🎓 Study mode → toggles", "state.translateMode !== __tm0", "window.__tm0 = state.translateMode"),
    ('reading-stats-button', "📈 Page understanding → the menu opens with the statistics", "isFullMenuOpen() && !document.getElementById('reading-stats-popover').hidden && getComputedStyle(document.getElementById('reading-stats-popover')).display !== 'none'", ''),
    ('theme-select', "🎨 Theme → the menu opens on the theme selector", "isFullMenuOpen() && document.activeElement.id === 'theme-select'", ''),
    ('toggle-toc-desktop', "📑 Contents → the sidebar opens", "!els.sidebar.classList.contains('collapsed')", "els.sidebar.classList.add('collapsed')"),
    ('btn-print', "🖨️ Print → the print dialog", "__spy.print >= 1", ''),
    ('btn-ink', "✏️ Pen → ink mode with its tools", "document.body.classList.contains('ink-mode')", ''),
    ('btn-region', "✂️ Region → region mode", "document.body.classList.contains('region-mode')", ''),
    ('btn-lang-level', "📊 Language level without a fragment → says to select text first", TOAST + " === t('selectFirst')", "state.lastAskContext = ''; state.lastGrammarSentence = ''"),
    ('btn-lang-level', "📊 Language level with a fragment → asks the AI and opens the Ask panel",
     "__spy.level === 1 && els.askPanel.classList.contains('expanded')",
     "state.lastAskContext = 'Le petit prince regardait les étoiles.'; window.aiCanAnswer = () => true; const real = startAiTask; window.startAiTask = (f, m) => { if (m === 'level') __spy.level = (__spy.level || 0) + 1; }"),
    ('btn-library', "🏛️ Library → the library opens", "document.getElementById('library-modal')?.classList.contains('open')", ''),
    ('btn-scanner', "📷 Scanner → the scanner opens", "scanIsOpen()", ''),
    ('btn-rules', "📚 Rules → the rules panel opens", "rulesOpen()", ''),
    ('wheelFull', "⚙️ Full menu → the menu opens", "isFullMenuOpen()", ''),
]
seen = set()
for action, label, expect, setup in CASES:
    fresh(setup)
    tap(action)
    check(label, expect)
    check('   ... and nothing threw', "__errs.length === 0 || JSON.stringify(__errs)")
    seen.add(action)
check('every action of the wheel was tapped', "JSON.stringify([...document.querySelectorAll('.qm-item')].map(b => b.dataset.action).filter(a => !%s.includes(a)))" % json.dumps(sorted(seen)) + " === '[]'")
print('ALL QUICK WHEEL ACTION CHECKS PASSED')
