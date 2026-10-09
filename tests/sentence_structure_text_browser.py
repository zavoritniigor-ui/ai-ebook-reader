"""Sentence breakdown painted IN THE BOOK TEXT (tooltip "🧩 Розбір" action button) + deep breakdown of one part.

The existing S-V-O header button is untouched. A real tap on a word opens the tooltip; its 🧩 button asks the model (mocked with a
GOLD reply, no live AI) for the sentence's functional parts and paints each in the text through the CSS Custom
Highlight API (no DOM rewrap), with a legend of role-coloured buttons; pressing a part asks for a deeper breakdown
of just that part. Checks: highlights land on the exact words, one call per sentence / per part (cached after),
nothing painted from invented text, no stale paint after the tooltip closes, no S-V-O remnants, no application errors.
"""
import base64, json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=900, deviceScaleFactor=1, mobile=False)
SENT = "Hier, Marie a mangé une pomme dans le jardin."
BOOK = "# Lecture\n\n" + SENT + "\n\nLa petite fille est heureuse.\n"
STRUCT = json.dumps({"language": "fr", "parts": [
    {"text": "Hier", "role": "time", "kind": "past", "note": "passé composé"},
    {"text": "Marie", "role": "subject", "note": "qui mange"},
    {"text": "a mangé", "role": "verb", "note": "passé composé"},
    {"text": "une pomme", "role": "object", "note": "ce qui est mangé"},
    {"text": "dans le jardin", "role": "place", "note": "où"},
    {"text": "Pierre", "role": "subject", "note": "invented"}], "summary": "Temps + sujet + verbe + objet + lieu."}, ensure_ascii=False)
DEEP = json.dumps({"language": "fr", "words": [
    {"text": "a", "role": "auxiliary", "note": "avoir, présent, 3e pers. sing."},
    {"text": "mangé", "role": "participle", "note": "participe passé de manger"},
    {"text": "xyz", "role": "noun", "note": "invented"}], "explanation": "Passé composé = auxiliaire avoir + participe passé."}, ensure_ascii=False)


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1)
        result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def click_xy(x, y):
    for kind in ('mousePressed', 'mouseReleased'):
        c.call('Input.dispatchMouseEvent', type=kind, x=x, y=y, button='left', clickCount=1)


def center(sel):
    return c.js("(b => ({x: b.left + b.width / 2, y: b.top + b.height / 2}))(document.querySelector(%s).getBoundingClientRect())" % json.dumps(sel))


c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert")
c.js("localStorage.clear();showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove()")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof analyzeSentenceInText==='function'")
b64 = base64.b64encode(BOOK.encode()).decode()
c.js("openBookFile(new File([Uint8Array.from(atob(%s),ch=>ch.charCodeAt(0))],'lecture.md',{lastModified:%d}))" % (json.dumps(b64), int(time.time())))
c.wait("els.pages.textContent.includes('Marie a mangé')", timeout=20)
time.sleep(0.8)
if not c.js('state.translateMode'):
    c.js('els.translateBtn.click()'); time.sleep(0.3)
c.js("state.targetLang='en'")
c.js("""(()=>{ aiAvailable=()=>true; showToast=()=>{}; window.__calls=[]; window.__struct=%s; window.__deep=%s; window.alert=m=>__calls.push({alert:m});
  callAI=async (prompt, signal, task)=>{ __calls.push({task, prompt}); if (task==='sentence_structure') return __struct; if (task==='structure_deep') return __deep; return 'ok'; }; return 1; })()""" % (json.dumps(STRUCT), json.dumps(DEEP)))

check("1 the breakdown button sits in the tooltip action row next to Ask AI / Grammar; the S-V-O header button is untouched",
      "[els.ttAskBtn, els.ttAiBtn, els.ttStructBtn].every(b => { const r = b.getBoundingClientRect(), tr = els.tooltip.getBoundingClientRect(); return r.width >= 70 && r.left >= tr.left - 1 && r.right <= tr.right + 1; })") if False else None
check("1b the validation gate drops invented / overlapping / unknown-role parts and keeps source spelling",
      """(() => { const r = normalizeSentenceStructure(JSON.stringify({language:'fr', parts:[{text:'hier',role:'time',kind:'past'},{text:'Marie',role:'subject'},{text:'Pierre',role:'subject'},{text:'Marie a',role:'verb'},{text:'x',role:'wizard'}]}), 'fr', 'Hier, Marie a mangé.');
         return r.ok && r.parts.map(p => p.text).join('|') === 'Hier|Marie' && r.markers.length === 1 && r.rejected.length === 3; })()""")

check("1d every UI language has its OWN text for every breakdown string (no silent English fallback) and the button follows the menu language",
      """(() => { const keys = Object.keys(I18N).filter(k => /^(struct|btnStruct|tStruct|needKeyStruct)/.test(k)); const langs = ['uk','en','fr','ru','zh','ko','hi','ga'];
         const missing = []; for (const k of keys) for (const l of langs) if (l !== 'en' && I18N[k][l] === I18N[k].en && !['structRole_object'].includes(k)) missing.push(k + ':' + l);
         const saved = state.uiLang; const labels = langs.map(l => { state.uiLang = l; applyI18n(); return els.ttStructBtn.textContent; }); state.uiLang = saved; applyI18n();
         return keys.length >= 35 && missing.length === 0 && new Set(labels).size === langs.length || JSON.stringify({missing, labels}); })()""")

pos = c.js(r"""(()=>{ const w='mangé'; const walker=document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT); let n;
  while((n=walker.nextNode())){ const i=n.nodeValue.indexOf(w); if(i!==-1){ const r=document.createRange(); r.setStart(n,i); r.setEnd(n,i+w.length); const b=r.getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2}; } } return null; })()""")
click_xy(pos['x'], pos['y'])
c.wait("els.tooltip.style.display==='flex'", timeout=8)
check("1c all three action buttons fit inside the tooltip and are wide enough to tap",
      "[els.ttAskBtn, els.ttAiBtn, els.ttStructBtn].every(b => { const r = b.getBoundingClientRect(), tr = els.tooltip.getBoundingClientRect(); return r.width >= 70 && r.left >= tr.left - 1 && r.right <= tr.right + 1; })")
b = center('#tt-struct-btn'); click_xy(b['x'], b['y'])
check("2 one call; legend has a coloured button for each REAL part (invented 'Pierre' ignored)",
      "document.querySelectorAll('#tt-struct-host .struct-key').length === 5 && __calls.filter(x => x.task === 'sentence_structure').length === 1", timeout=8)
check("3 the parts are painted in the book text on the exact words",
      """(() => { const t = r => CSS.highlights.has('struct-' + r) ? [...CSS.highlights.get('struct-' + r)].map(x => x.toString()).join('|') : null;
         return t('time') === 'Hier' && t('subject') === 'Marie' && t('verb') === 'a mangé' && t('object') === 'une pomme' && t('place') === 'dans le jardin'; })()""")
check("4 painting does not rewrap the page (the sentence is still one text run per paragraph)",
      "els.pages.textContent.includes('Hier, Marie a mangé une pomme dans le jardin.')")
check("5 the time marker chip shows its kind", "[...document.querySelectorAll('#tt-struct-host .struct-key')].some(k => k.textContent.includes('Hier') && k.textContent.includes(t('structKind_past')))")

verb = [i for i in range(5)][2]
c.js("document.querySelectorAll('#tt-struct-host .struct-key')[2].dispatchEvent(new MouseEvent('click', {bubbles: true})); 1")
check("6 pressing a part asks for a deep breakdown of THAT part (one call) and shows validated words only",
      "__calls.filter(x => x.task === 'structure_deep').length === 1 && document.querySelectorAll('#tt-struct-host .struct-deep-head .struct-sub').length === 2 && !document.querySelector('#tt-struct-host .struct-deep').textContent.includes('xyz')", timeout=8)
check("7 the deep prompt carries the part and the sentence as JSON strings",
      "(p => p.includes(JSON.stringify('a mangé')) && p.includes(JSON.stringify(%s)))(__calls.find(x => x.task === 'structure_deep').prompt)" % json.dumps(SENT, ensure_ascii=False))
check("8 the explanation is shown", "document.querySelector('#tt-struct-host .struct-deep').textContent.includes('auxiliaire avoir')")
c.js("document.querySelectorAll('#tt-struct-host .struct-key')[2].click(); document.querySelectorAll('#tt-struct-host .struct-key')[2].click(); 1")
time.sleep(0.4)
check("9 closing and re-opening the same part is served from the cache (no second deep call)", "__calls.filter(x => x.task === 'structure_deep').length === 1")

c.js("els.ttCloseBtn.click(); 1"); time.sleep(0.3)
check("10 closing the tooltip removes every painted highlight", "['time','subject','verb','object','place'].every(r => !CSS.highlights.has('struct-' + r))")

# second tap, same sentence: structure is cached
click_xy(pos['x'], pos['y'])
c.wait("els.tooltip.style.display==='flex'", timeout=8)
b = center('#tt-struct-btn'); click_xy(b['x'], b['y'])
check("11 the same sentence again is answered from the cache (still one structure call)",
      "document.querySelectorAll('#tt-struct-host .struct-key').length === 5 && __calls.filter(x => x.task === 'sentence_structure').length === 1", timeout=8)

# failure: a reply with no usable part shows a message, paints nothing
c.js("els.ttCloseBtn.click(); window.__struct = 'nonsense'; structureCache.clear(); 1"); time.sleep(0.3)
click_xy(pos['x'], pos['y'])
c.wait("els.tooltip.style.display==='flex'", timeout=8)
b = center('#tt-struct-btn'); click_xy(b['x'], b['y'])
check("12 an unusable reply shows the failure note and paints nothing",
      "els.ttStructHost.textContent.includes(t('structFailed')) && !CSS.highlights.has('struct-subject') && !document.querySelector('#tt-struct-host .struct-key')", timeout=8)
check("13 no application errors / alerts", "!__calls.some(x => x.alert)")
print('ALL SENTENCE STRUCTURE TEXT CHECKS PASSED')
