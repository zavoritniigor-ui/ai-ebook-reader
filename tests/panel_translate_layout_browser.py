"""Panels + breakdown tooltip UX (tablet portrait): the Grammar / Ask AI panels start BELOW the main menu (never over its
buttons); in the breakdown popup the legend sits above the translation, which keeps the popup's full width and scrolls with it;
selecting a word, sentence or paragraph INSIDE the Grammar, Ask AI and Practice panels opens the same translation popup as in the
book (touch-native selection fires no click, so it is driven by selectionchange); a tap on a word of a Practice sentence does too,
while a Practice target still goes to Grammar. Only the translation call is spied. No network."""
import os, time, json
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Network.enable'); c.call('Network.setCacheDisabled', cacheDisabled=True)


def check(name, expression, timeout=0):
    result = c.js(expression); end = time.time() + timeout
    while result is not True and time.time() < end:
        time.sleep(0.1); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


c.call('Emulation.setDeviceMetricsOverride', width=820, height=1180, deviceScaleFactor=1, mobile=True)
c.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof translatePanelPoint==='function'", timeout=30)
c.js("localStorage.clear(); document.getElementById('sw-update-banner')?.remove(); 1"); time.sleep(0.6)
c.js("""(() => { window.__lookups = []; const orig = handleWordOrSelection; handleWordOrSelection = (text, ...rest) => { __lookups.push(text); return orig(text, ...rest); };
  state.targetLang = 'uk'; return 1; })()""")

# ---- 1. panels start below the main menu --------------------------------------------------------------------------------
check("1 Grammar panel starts below the main menu (does not cover its buttons)",
      """(() => { els.grammarPanel.classList.add('expanded'); const hb = document.getElementById('app-header').getBoundingClientRect().bottom; const r = els.grammarPanel.getBoundingClientRect();
         return r.top >= hb - 1 && r.bottom <= innerHeight + 1 || JSON.stringify({top: r.top, hb, bottom: r.bottom, ih: innerHeight}); })()""", timeout=3)
c.js("els.grammarPanel.classList.remove('expanded'); els.askPanel.classList.add('expanded'); 1"); time.sleep(0.6)
check("1b Ask AI panel too",
      "(() => { const hb = document.getElementById('app-header').getBoundingClientRect().bottom; const r = els.askPanel.getBoundingClientRect(); return r.top >= hb - 1 && r.bottom <= innerHeight + 1 || JSON.stringify({top: r.top, hb}); })()", timeout=3)
c.js("els.askPanel.classList.remove('expanded'); 1")

# ---- 2. breakdown popup: legend above the translation, translation keeps the full width, body scrolls ---------------------
c.js("""(() => { els.tooltip.style.display = 'flex'; els.tooltip.style.left = '410px'; els.tooltip.style.top = '300px';
  els.ttTranslation.textContent = 'Вся родина готується до приходу циклону. Вчора тато зробив запаси води, заправив повну машину їжею та ліками.';
  const host = els.ttStructHost; host.replaceChildren();
  const box = document.createElement('div'); box.className = 'tt-struct-line';
  for (let i = 0; i < 140; i++) { const b = document.createElement('button'); b.className = 'struct-key structure-role-subject'; b.textContent = 'Підмет: частина ' + i + ' довгого речення'; box.appendChild(b); }
  host.appendChild(box); positionTooltip(410, 300, null); return 1; })()""")
time.sleep(0.4)
check("2 the legend is ABOVE the translation and the translation is not squeezed into a narrow column",
      """(() => { const h = els.ttStructHost.getBoundingClientRect(), t = els.ttTranslation.getBoundingClientRect(), tt = els.tooltip.getBoundingClientRect();
         return h.bottom <= t.top + 1 && t.width >= tt.width * 0.6 || JSON.stringify({hb: h.bottom, tt: t.top, tw: t.width, ttw: tt.width}); })()""")
check("2b the popup body scrolls (legend + translation together) and stays inside the viewport",
      """(() => { const body = document.querySelector('#word-tooltip .tt-body'); const r = els.tooltip.getBoundingClientRect();
         return getComputedStyle(body).overflowY === 'auto' && body.scrollHeight > body.clientHeight && r.top >= 0 && r.bottom <= innerHeight + 1 || JSON.stringify({sh: body.scrollHeight, ch: body.clientHeight, top: r.top, bottom: r.bottom}); })()""")
c.js("els.ttStructHost.replaceChildren(); els.tooltip.style.display = 'none'; 1")

# ---- 3. selection inside the panels opens the translation popup -----------------------------------------------------------
SENT = 'Le sentier longe un long chemin entre les arbres.'


def select_in(selector, start_word, end_word):
    return c.js("""(() => { const root = document.querySelector(%s); const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n, a = null, b = null, ai = 0, bi = 0;
      while ((n = w.nextNode())) { const i = n.nodeValue.indexOf(%s); if (i !== -1 && !a) { a = n; ai = i; } const j = n.nodeValue.indexOf(%s); if (j !== -1) { b = n; bi = j + %s.length; } }
      if (!a || !b) return false; const r = document.createRange(); r.setStart(a, ai); r.setEnd(b, bi); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return true; })()"""
                % (json.dumps(selector), json.dumps(start_word), json.dumps(end_word), json.dumps(end_word)))


c.js("""(() => { els.grammarPanel.classList.add('expanded'); const p = document.createElement('p'); p.id = 'g-sent'; p.textContent = %s; els.grammarContent.appendChild(p); window.__lookups.length = 0; return 1; })()""" % json.dumps(SENT))
time.sleep(0.4)
assert select_in('#g-sent', 'sentier', 'sentier')
check("3 a long-press on a word inside the Grammar panel (native selection, no click) opens its translation", "__lookups.length === 1 && __lookups[0] === 'sentier' && els.tooltip.style.display === 'flex'", timeout=4)
check("3b ... and the NATIVE selection (with its drag handles) is left in place", "!getSelection().isCollapsed && getSelection().toString() === 'sentier'")
c.js("""(() => { const s = getSelection(), r = s.getRangeAt(0).cloneRange(); const root = document.getElementById('g-sent'); const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n, last = null; while ((n = w.nextNode())) last = n;
  r.setStart(root.firstChild, 0); r.setEnd(last, last.nodeValue.length); s.removeAllRanges(); s.addRange(r); return 1; })()""")
check("3c dragging the handles out to the whole sentence updates the popup to the whole sentence",
      "__lookups.length === 2 && __lookups[1].replace(/\\.$/, '') === %s && els.ttOriginal.textContent.startsWith('Le sentier longe')" % json.dumps(SENT.rstrip('.')), timeout=4)
c.js("els.tooltip.style.display = 'none'; els.grammarPanel.classList.remove('expanded'); window.__lookups.length = 0; getSelection().removeAllRanges(); 1")

c.js("""(() => { els.askPanel.classList.add('expanded'); const p = document.createElement('p'); p.id = 'a-sent'; p.textContent = %s; els.askContent.appendChild(p); return 1; })()""" % json.dumps(SENT))
time.sleep(0.4)
assert select_in('#a-sent', 'longe', 'arbres')
check("4 the Ask AI panel too", "__lookups.length === 1 && __lookups[0].startsWith('longe un long chemin')", timeout=4)
c.js("els.tooltip.style.display = 'none'; els.askPanel.classList.remove('expanded'); window.__lookups.length = 0; getSelection().removeAllRanges(); 1")

# ---- 5. Practice ------------------------------------------------------------------------------------------------------
c.js("""(() => { const panel = getPracticePanel(); panel.hidden = false; panel.classList.add('expanded'); panel.dataset.mode = 'expanded';
  const row = document.createElement('div'); row.className = 'practice-sentence'; row.id = 'p-row';
  row.innerHTML = '<span class="practice-sentence-text">Le <span id="p-word">sentier</span> longe un <button type="button" class="practice-target practice-target-adjective" id="p-target">long</button> chemin entre les arbres.</span>';
  panel.appendChild(row); window.__lookups.length = 0; window.__targetClicks = 0; document.getElementById('p-target').addEventListener('click', () => __targetClicks++); return 1; })()""")
time.sleep(0.4)
assert select_in('#p-row', 'Le', 'arbres')
check("5 selecting a whole Practice sentence opens the translation popup", "__lookups.length === 1 && __lookups[0].startsWith('Le sentier longe')", timeout=4)
c.js("els.tooltip.style.display = 'none'; window.__lookups.length = 0; getSelection().removeAllRanges(); 1"); time.sleep(0.3)
pos = c.js("(r => ({x: r.left + r.width / 2, y: r.top + r.height / 2}))(document.getElementById('p-word').getBoundingClientRect())")
for kind in ('mousePressed', 'mouseReleased'):
    c.call('Input.dispatchMouseEvent', type=kind, x=pos['x'], y=pos['y'], button='left', clickCount=1)
check("5b tapping a plain word of a Practice sentence opens its translation", "__lookups.length === 1 && __lookups[0] === 'sentier'", timeout=4)
c.js("els.tooltip.style.display = 'none'; window.__lookups.length = 0; 1")
pos = c.js("(r => ({x: r.left + r.width / 2, y: r.top + r.height / 2}))(document.getElementById('p-target').getBoundingClientRect())")
for kind in ('mousePressed', 'mouseReleased'):
    c.call('Input.dispatchMouseEvent', type=kind, x=pos['x'], y=pos['y'], button='left', clickCount=1)
time.sleep(0.5)
check("5c tapping an exercise TARGET keeps its own behaviour (no translation popup)", "__targetClicks === 1 && __lookups.length === 0")
print('ALL PANEL TRANSLATE / LAYOUT CHECKS PASSED')
