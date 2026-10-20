"""Rules button with a selected sentence/paragraph: the FIRST tap only starts the search in the background (the window does not open, an
open translation popup is not interrupted); when the search is done the button/bookmark is green; the SECOND tap opens the window.
Without a selection the button simply opens the window. Gold model replies; no network."""
import base64, json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof openRulesPanel==='function'", timeout=30)
c.js("localStorage.clear(); 1"); c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof openRulesPanel==='function'", timeout=30)
c.js("state.uiLang = 'uk'; applyI18n(); 1")


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


BOOK = "# Lecture\n\nHier, Marie a mangé une pomme dans le jardin. Elle est partie avant nous.\n\nLe chat dort sur la table.\n"
b64 = base64.b64encode(BOOK.encode()).decode()
c.js("openBookFile(new File([Uint8Array.from(atob(%s),ch=>ch.charCodeAt(0))],'lecture.md',{lastModified:%d}))" % (json.dumps(b64), int(time.time())))
c.wait("els.pages.textContent.includes('Marie a mangé')", timeout=20); time.sleep(0.8)
SCAN = json.dumps({"language": "fr", "topics": [{"id": "passe-compose", "matches": [{"text": "a mangé", "note": "avoir"}, {"text": "est partie", "note": "être"}]}]}, ensure_ascii=False)
c.js("""(() => { aiAvailable = () => true; showToast = () => {}; window.__scans = 0; window.__release = null;
  callAI = (prompt, signal, task) => { if (task === 'rules_search') { __scans++; return new Promise(r => { window.__release = () => r(%s); }); } return Promise.resolve('{}'); };
  const w = document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (n.nodeValue.includes('Marie a mangé')) break;
  const r = document.createRange(); r.selectNodeContents(n); state.lastSelectedRange = r;
  // a translation popup is open
  els.tooltip.style.display = 'flex'; return 1; })()""" % json.dumps(SCAN))
c.js("document.getElementById('btn-rules').click(); 1"); time.sleep(0.5)
check('1 first tap with a selection starts ONE background search and does NOT open the window', "__scans === 1 && !document.getElementById('rules-panel').classList.contains('expanded')")
check('2 the open translation popup is not interrupted', "els.tooltip.style.display === 'flex'")
check('3 while searching, the button and bookmark show the running state', "document.getElementById('btn-rules').dataset.state === 'running' && document.getElementById('rules-tab').dataset.state === 'running'")
c.js("document.getElementById('btn-rules').click(); 1"); time.sleep(0.3)
check('4 tapping again while still searching neither opens the window nor starts a second search', "__scans === 1 && !document.getElementById('rules-panel').classList.contains('expanded')")
c.js("__release(); 1")
check('5 when the search is done the button and bookmark turn green', "document.getElementById('btn-rules').dataset.state === 'ready' && document.getElementById('rules-tab').dataset.state === 'ready'", timeout=5)
check('6 the window is still closed and the popup still open', "!document.getElementById('rules-panel').classList.contains('expanded') && els.tooltip.style.display === 'flex'")
c.js("document.getElementById('btn-rules').click(); 1"); time.sleep(0.5)
check('7 the SECOND tap opens the window, with the found topic marked, and no new search', "document.getElementById('rules-panel').classList.contains('expanded') && __scans === 1 && !!document.querySelector('#rules-content .rules-topic .rules-dot')")
c.js("document.getElementById('rules-min').click(); state.lastSelectedRange = null; rulesScan = null; 1"); time.sleep(0.3)
c.js("document.getElementById('btn-rules').click(); 1"); time.sleep(0.5)
check('8 without a selection the button simply opens the window', "document.getElementById('rules-panel').classList.contains('expanded') && __scans === 1")

# 9. Dismissing the translation popup (✕ or outside click) clears lastSelectedRange so a later Rules press opens the window
c.js("""(() => { document.getElementById('rules-close').click();
  const w = document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (n.nodeValue.includes('Marie a mangé')) break;
  const r = document.createRange(); r.selectNodeContents(n); state.lastSelectedRange = r; els.tooltip.style.display = 'flex';
  dismissReaderPopup(); return 1; })()""")
c.js("document.getElementById('btn-rules').click(); 1"); time.sleep(0.3)
check('9 after dismissing the translation popup, pressing Rules opens the window immediately instead of scanning the dismissed selection',
      "state.lastSelectedRange === null && document.getElementById('rules-panel').classList.contains('expanded') && __scans === 1")

# 10. Real pointerdown + click on #rules-tab with an open popup does not close the popup on pointerdown
c.js("""(() => { document.getElementById('rules-close').click(); rulesSearchCache.clear();
  const w = document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (n.nodeValue.includes('Marie a mangé')) break;
  const r = document.createRange(); r.selectNodeContents(n); state.lastSelectedRange = r; els.tooltip.style.display = 'flex'; return 1; })()""")
tab_pt = c.js("(() => { const b = document.getElementById('rules-tab').getBoundingClientRect(); return {x: b.left + b.width / 2, y: b.top + b.height / 2}; })()")
for kind in ('mousePressed', 'mouseReleased'):
    c.call('Input.dispatchMouseEvent', type=kind, x=tab_pt['x'], y=tab_pt['y'], button='left', clickCount=1)
time.sleep(0.4)
check('10 a real mouse click (pointerdown + click) on #rules-tab keeps the popup open and starts the background scan',
      "els.tooltip.style.display === 'flex' && __scans === 2 && !document.getElementById('rules-panel').classList.contains('expanded')")
c.js("__release(); 1")
check('10b background scan finishes and turns #rules-tab green', "document.getElementById('rules-tab').dataset.state === 'ready'", timeout=5)

# 11. On a phone viewport (390x844, where #rules-tab is hidden) or from the Full Menu drawer, pressing Rules with a selection opens the panel immediately
c.call('Emulation.setDeviceMetricsOverride', width=390, height=844, deviceScaleFactor=2, mobile=True)
c.js("""(() => { document.getElementById('rules-close').click(); rulesSearchCache.clear();
  callAI = async (prompt, signal, task) => task === 'rules_search' ? (++__scans, %s) : '{}';
  const w = document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (n.nodeValue.includes('Marie a mangé')) break;
  const r = document.createRange(); r.selectNodeContents(n); state.lastSelectedRange = r; els.tooltip.style.display = 'flex'; return 1; })()""" % json.dumps(SCAN))
c.js("document.getElementById('btn-rules').click(); 1")
check('11 on a phone (390x844) pressing Rules with a selection opens #rules-panel immediately and scans the selection inside the open panel',
      "document.getElementById('rules-panel').classList.contains('expanded') && __scans === 3 && !!document.querySelector('#rules-content .rules-topic .rules-dot')", timeout=5)
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=900, deviceScaleFactor=1, mobile=False)

# 12. PDF selection highlighting (.sel-word) keeps state.lastSelectedRange non-collapsed & connected in forward order for Rules scan + topic highlight
c.js("""(() => { document.getElementById('rules-close').click(); rulesSearchCache.clear();
  state.format = 'pdf';
  els.pages.innerHTML = '<div class="pdf-page-wrapper" data-page="1"><div class="pdf-text-layer"><span style="position:absolute;left:40px;top:40px">Hier, Marie a mangé</span><span style="position:absolute;left:180px;top:40px">une pomme. Elle est partie.</span></div></div>';
  const spans = [...els.pages.querySelectorAll('.pdf-text-layer span')];
  const r = document.createRange();
  r._pdfPieces = spans.map(s => ({ node: s.firstChild, start: 0, end: s.firstChild.nodeValue.length, span: s }));
  r.setStart(spans[0].firstChild, 0); r.setEnd(spans[1].firstChild, spans[1].firstChild.nodeValue.length);
  r.toString = () => 'Hier, Marie a mangé une pomme. Elle est partie.';
  state.lastSelectedRange = r.cloneRange(); state.lastSelectedRange._pdfPieces = r._pdfPieces; state.lastSelectedRange.toString = r.toString;
  showSelectionHighlight(r);
  return 1; })()""")
check('12a after showSelectionHighlight on a PDF, state.lastSelectedRange stays non-collapsed and rulesSelectionSource reads the exact PDF selection in forward order',
      "(() => { const f = rulesSelectionSource({ selectionOnly: true }); return !!f && !state.lastSelectedRange.collapsed && f.text === 'Hier, Marie a mangé une pomme. Elle est partie.'; })()")
c.js("openRulesPanel({ keep: false }); 1")
check('12b opening Rules on the highlighted PDF selection scans it and marks passe-compose',
      "__scans === 4 && !!document.querySelector('#rules-content .rules-topic[data-topic=\"passe-compose\"] .rules-dot')", timeout=5)
c.js("unwrapSpans(state.selSpans); state.selSpans = []; document.querySelector('#rules-content .rules-topic[data-topic=\"passe-compose\"]').click(); 1")
check('12c clicking the found topic still highlights all matches on the PDF page even after .sel-word spans were unwrapped',
      "__scans === 4 && CSS.highlights.has('rule-match') && [...CSS.highlights.get('rule-match')].map(r => r.toString()).join('|') === 'a mangé|est partie'", timeout=5)
print('ALL PASS')
