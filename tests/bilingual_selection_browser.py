"""Multi-verb selections from a bilingual French/English PDF (real report: physical page 349 of "Complete French All-in-One").

The learner drags across a side-by-side table -- French forms on the left, their English translation on the right --
and Grammar used to show ONLY the first verb ("voir"). Root cause, measured on the real page: a PDF text layer's
range text has NO separator between text items at all, so the table fused ("having seenayant compris having
understood..."); the whole-word validator then rightly rejected every French form that had a letter glued to its
left, and only the very first item ("ayant vu", nothing precedes it) survived. The same fused string was what the
translation popup received.

The fix has two independent parts:
  1  js/selection.js's pdfRangeText: a real separator between PDF text items (a drag range had none at all,
     unlike the sentence/tap paths, which already got this in a previous fix).
  2  js/selection.js's pdfPartitionColumns + the pointerup handler: when a drag spans MULTIPLE geometric columns
     (a bilingual page), the STUDY-language column's own text (state.lastGrammarSourceText, one-shot, consumed by
     handleWordOrSelection) is what Grammar actually analyses -- geometry-based, not lexical, because many of the
     real participle forms here ("ayant vu", "étant parti"...) carry no individual FR/EN dictionary signal of
     their own, which a purely lexical split would misjudge.

Every interaction is a real mouse event on a real (synthetic) PDF; only the provider call is stubbed, with a
"competent model" that reports every KNOWN form it can find (as a whole word) in the text it was actually given --
so a failure here is never the model's fault.

Sections:
  1  raw selection: no fused words (both PDF content-stream orders)
  2  Grammar's request is the STUDY language only; 8 distinct French verbs survive request -> validation ->
     rendering, in text order, unfocused, with the learner told the translation column was skipped
  3  the English column alone, and the French column alone, are each still analysed as themselves
  4  single-word tap -> ONE focused occurrence (unaffected by all of the above)
  5  a sentence / a paragraph with several verbs -> several items each (not collapsed to one)
  6  a selection larger than the item budget -> deterministic, bounded, the learner is told
  7  focusing an already-analysed occurrence (incl. from Practice) makes zero AI calls
  8  the translation request for the SAME bilingual drag: documented limitation + regression (task 6)
"""
import base64, json, os, re, sys, time
from browser_cdp import CDP, verb_table_pdf_bytes, VERB_TABLE_ROWS
import practice_fixtures as PF

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(120)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable'); c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1100, height=1200, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert")
c.js("localStorage.clear();showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove()")
c.call('Page.reload', ignoreCache=True)
c.wait("document.readyState==='complete' && !document.body.inert && typeof runGrammarAnalysis==='function' && typeof resolveCanonicalPdfSelection==='function'")

FR = [fr for fr, _ in VERB_TABLE_ROWS]
EN = [en for _, en in VERB_TABLE_ROWS]
FR_LEMMAS = ['voir', 'comprendre', 'jouer', 'traverser', 'aller', 'partir', 'se promener', 'se retrouver']
EN_LEMMAS = ['see', 'understand', 'play', 'cross', 'go', 'leave', 'walk', 'meet']
# TEST DATA for the stubbed model (never used by the application itself): surface (as it appears in the
# text) -> lemma, per source language.
KNOWN = {
    'fr': [('ayant vu', 'voir'), ('ayant compris', 'comprendre'), ('ayant joué', 'jouer'), ('ayant traversé', 'traverser'), ('étant allé', 'aller'), ('étant parti', 'partir'),
           ('nous étant promené', 'se promener'), ('nous étant retrouvé', 'se retrouver'), ('Ayant accepté', 'accepter'), ('sont rentrés', 'rentrer'), ('Étant partis', 'partir'),
           ('sommes arrivés', 'arriver'), ('parle', 'parler'), ('parlait', 'parler'), ('parlerons', 'parler'), ('En parlant', 'parler'), ('mangeaient', 'manger'), ('a mangé', 'manger'),
           ('lisait', 'lire'), ('écrivions', 'écrire'), ('finissait', 'finir'), ('dormaient', 'dormir'), ('sortions', 'sortir'), ('venait', 'venir'), ('prenions', 'prendre'), ('disait', 'dire')],
    'en': [('having seen', 'see'), ('having understood', 'understand'), ('having played', 'play'), ('having crossed', 'cross'), ('having gone', 'go'), ('having left', 'leave'),
           ('having walked', 'walk'), ('having met', 'meet'), ('Having accepted', 'accept'), ('went', 'go'), ('were', 'be')],
}
# 16 GENUINELY DISTINCT verbs (each its own lemma) for the over-budget test: word count must stay in the
# <=120-word budget tier (14) while lemma count exceeds it.
BIG_KNOWN_FR = [('parlait', 'parler'), ('mangeait', 'manger'), ('lisait', 'lire'), ('écrivait', 'écrire'), ('finissait', 'finir'), ('dormait', 'dormir'), ('sortait', 'sortir'),
                ('venait', 'venir'), ('prenait', 'prendre'), ('disait', 'dire'), ('buvait', 'boire'), ('courait', 'courir'), ('vendait', 'vendre'), ('choisissait', 'choisir'),
                ('attendait', 'attendre'), ('répondait', 'répondre')]


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1)
        result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def mouse(kind, x, y, buttons=0):
    c.call('Input.dispatchMouseEvent', type=kind, x=x, y=y, button='left' if (kind != 'mouseMoved' or buttons) else 'none', buttons=buttons, clickCount=1)


def load_pdf(pdf_bytes, name='table.pdf'):
    c.js("if (typeof pdfContinuousReady !== 'undefined') pdfContinuousReady = false;")
    c.js("""(() => { const bytes = Uint8Array.from(atob(%s), ch=>ch.charCodeAt(0)); const file = new File([bytes], %s, {type:'application/pdf'});
      const dt = new DataTransfer(); dt.items.add(file); const i=document.getElementById('file-upload'); i.files = dt.files; i.dispatchEvent(new Event('change')); })()"""
         % (json.dumps(base64.b64encode(pdf_bytes).decode()), json.dumps(name)))
    c.wait("state.format==='pdf' && pdfContinuousReady && !!state.pdfDoc", timeout=60)
    c.wait("!!document.querySelector('.pdf-page-wrapper[data-page=\"1\"] .pdf-text-layer span')", timeout=30); time.sleep(2.0)
    if not c.js('state.translateMode'):
        c.js('els.translateBtn.click()'); time.sleep(0.4)
    c.js("state.sourceLang='fr-FR'")   # the book's own persisted study language (updateSourceLang's normal job)


def install_model():
    """Stub ONLY the provider call. A competent model: it reports every KNOWN form present in the text it was
    given (as a whole word) in the language the request names -- so it never invents a wrong-language item on
    its own; the isolation/validation pipeline is what this suite actually exercises."""
    c.js("""(()=>{ aiAvailable=()=>true; showToast=()=>{}; window.__calls=[]; window.__known=%s;
      callAI=async (prompt, signal, task, onDelta, options)=>{ const rec={task, prompt, maxTokens:options&&options.maxOutputTokens}; __calls.push(rec);
        if (task==='grammar_analysis'){
          const m=prompt.match(/Text \\(a JSON string[^:]*: (".*")\\n/); const text=JSON.parse(m[1]); rec.text=text;
          rec.lang=(prompt.match(/language code "(\\w+)"/)||[])[1]; rec.itemBudget=+(prompt.match(/Detect at most (\\d+) distinct lemmas/)||[])[1]; rec.tapped=(prompt.match(/The learner tapped ("[^"]*")/)||[])[1]||null;
          rec.lite=/always null\\. \\(The selection is long/.test(prompt);
          const items=(__known[rec.lang]||[]).filter(([s])=>text.includes(s)).map(([surface,lemma])=>({pos:'verb', lemma, surface, sentence:text, occurrence:1, agreesWith:null, features:{}, explanation:'x', stemBreakdown:null, forms:null}));
          return JSON.stringify({language:rec.lang, items}); }
        if (task==='translation'){ const m=prompt.match(/фрагмент: "([\\s\\S]*?)"\\n/); const src=m?m[1]:''; return JSON.stringify({translation:'UK[' + src.replace(/\\s+/g,' ') + ']', alignment:[]}); }
        if (task==='practice_reading') {
          // A competent model here too: cover EXACTLY the targets the prompt itself asked for (its own
          // per-target allocation), whatever the actual detected lemma set turned out to be -- this
          // section only exercises the CLICK -> zero-AI-calls path, not reading quality.
          const lang=(prompt.match(/language code "(\\w+)"/)||[])[1]||'fr';
          const alloc=[...prompt.matchAll(/- "([^"]+)": (\\d+) example/g)];
          const sections=alloc.map(([,lemma,n])=>({heading:lemma, kind:'examples', items:Array.from({length:+n},(_,i)=>({
            text:`Exemple ${i+1} avec ${lemma} dans une phrase complete et naturelle vraiment.`,
            targets:[{surface:lemma, lemma, occurrence:1, features:{}, explanation:'x', forms:null}]}))}));
          sections.push({heading:'', kind:'story', items:[{text:'Une histoire connectee qui mentionne plusieurs mots dans un contexte naturel et interessant vraiment.', targets:[]}]});
          return JSON.stringify({title:'T', language:lang, mode:'verbs', sections});
        }
        return 'ok'; };
      return true; })()""" % json.dumps(KNOWN, ensure_ascii=False))


def cell_pos(text, nth=0, scroll=False):
    """the rect of the nth text item whose OWN text equals `text` in the page's text layer"""
    return c.js(r"""(()=>{ const layer=document.querySelector('.pdf-page-wrapper[data-page="1"] .pdf-text-layer'); const w=%s; let hits=%d; let found=null;
      for (const s of layer.querySelectorAll('span')) { if (s.classList.contains('markedContent') || s.textContent.trim()!==w) continue; if (hits--===0) { found=s; break; } }
      if (!found) return null; if (%s) found.scrollIntoView({block:'center'}); const b=found.getBoundingClientRect(); return {l:b.left,r:b.right,t:b.top,b:b.bottom,x:b.left+b.width/2,y:b.top+b.height/2}; })()"""
                % (json.dumps(text, ensure_ascii=False), nth, 'true' if scroll else 'false'))


def drag(a, b, steps=14):
    mouse('mousePressed', a['x'], a['y'], 1)
    for i in range(1, steps + 1):
        mouse('mouseMoved', a['x'] + (b['x'] - a['x']) * i / steps, a['y'] + (b['y'] - a['y']) * i / steps, 1)
    mouse('mouseReleased', b['x'], b['y'], 0)


def close_ui():
    c.js("els.tooltip.style.display='none'; els.grammarPanel.classList.remove('expanded'); if (typeof closePractice==='function') closePractice(); grammarAnalysisCache.clear(); __calls.length=0")
    time.sleep(0.3)


def select_between(first_text, last_text, first_nth=0, last_nth=0):
    """A real mouse drag from the LEFT edge of the item `first_text` to the RIGHT edge of `last_text` (both
    measured after one scroll, so a wrapper's own scrollIntoView settles first)."""
    close_ui()
    cell_pos(first_text, first_nth, scroll=True); time.sleep(0.5)
    a, b = cell_pos(first_text, first_nth), cell_pos(last_text, last_nth)
    drag({'x': a['l'] + 2, 'y': a['y']}, {'x': b['r'] - 2, 'y': b['y']})
    c.wait("els.tooltip.style.display==='flex'", timeout=10); time.sleep(0.8)
    return c.js("state.lastSelectionText")


def press_grammar():
    """Click the tooltip's Grammar button, then -- like a real learner -- open the drawer if the analysis
    didn't already do so (a MULTI-word selection never auto-opens it, so the cards can be READ from the DOM
    right away, but a real mouse click on one needs the drawer actually visible on screen first)."""
    p = c.js("(()=>{const b=els.ttAiBtn.getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2}})()")
    mouse('mousePressed', p['x'], p['y'], 1); mouse('mouseReleased', p['x'], p['y'])
    c.wait("(els.grammarPanel.classList.contains('ready') || !!els.grammarContent.querySelector('span[style*=red]')) && !els.grammarContent.querySelector('.spinner-large')", timeout=20)
    time.sleep(0.4)
    if not c.js("els.grammarPanel.classList.contains('expanded')"):
        t = c.js("(()=>{const b=document.getElementById('grammar-tab'); const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}})()")
        mouse('mousePressed', t['x'], t['y'], 1); mouse('mouseReleased', t['x'], t['y'])
        time.sleep(0.4)


def press_ask():
    p = c.js("(()=>{const b=els.ttAskBtn.getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2}})()")
    mouse('mousePressed', p['x'], p['y'], 1); mouse('mouseReleased', p['x'], p['y'])


def grammar_state():
    return c.js("""(()=>{ const an=grammarContext.analysis; const req=__calls.filter(x=>x.task==='grammar_analysis');
       return { requests:req.map(r=>({lang:r.lang,text:r.text,itemBudget:r.itemBudget,tapped:r.tapped,lite:r.lite,maxTokens:r.maxTokens})),
                items: an?an.items.map(i=>i.lemma+'/'+i.surface):null, lemmas: an?[...new Set(an.items.map(i=>i.lemma))]:null,
                rejected: an?an.rejected.map(r=>r.reason+':'+r.surface):null, cards:[...els.grammarContent.querySelectorAll('.grammar-card-lemma')].map(b=>b.textContent),
                focused: grammarContext.focused?grammarContext.focused.surface:null, focusCard: !!els.grammarContent.querySelector('.grammar-focus'), mode: grammarContext.mode, lang: grammarContext.sourceLanguage,
                notes:[...els.grammarContent.querySelectorAll('.grammar-note')].map(n=>n.textContent), error:(els.grammarContent.querySelector('span[style*=red]')||{}).textContent||null,
                chips:[...document.querySelectorAll('#grammar-controls-bar button')].length }; })()""")


NO_FUSION_RE = re.compile(r'seenayant|understoodayant|playedayant|crossedétant|goneétant|leftnous|walkednous|voir?ayant|comprisayant|jouéayant|traverséétant|alléétant|partinous')

# =====================================================================================================================
for order in ('rows', 'columns'):
    print("\n=== SECTION 1-3 [%s stream order]: a real drag across BOTH columns of a bilingual verb table ===" % order)
    load_pdf(verb_table_pdf_bytes(order))
    install_model()
    raw = select_between(FR[0], EN[-1])
    # 1. the raw selection: every known form present as a WHOLE, unfused word (regardless of exact spacing/layout)
    assert not NO_FUSION_RE.search(raw), ('fused words in the raw selection', raw)
    for form in FR + EN:
        assert re.search(r'(?<!\S)' + re.escape(form) + r'(?!\S)', raw), (form, 'not present as a whole token', raw)
    print('PASS 1 [%s]: every French and English form is present as a whole, unfused word in the raw selection: %r...' % (order, raw[:60]), flush=True)

    press_grammar()
    g = grammar_state()
    # 2. the request: the STUDY language only, every French form, no English
    assert len(g['requests']) == 1, g['requests']
    rq = g['requests'][0]
    assert rq['lang'] == 'fr' and g['lang'] == 'fr', rq
    for fr in FR:
        assert fr in rq['text'], (fr, 'missing from the Grammar request', rq['text'])
    assert not re.search(r'\bhaving\b|\bseen\b|\bunderstood\b|\bplayed\b|\bcrossed\b|\bgone\b|\bleft\b|\bwalked\b|\bmet\b', rq['text']), ('the English column must not reach Grammar', rq['text'])
    assert rq['itemBudget'] >= len(FR_LEMMAS), ('the budget must hold every verb of the selection', rq['itemBudget'])
    print("PASS 2 [%s]: the Grammar request is FRENCH ONLY (%d chars, budget %d, %d tokens) -- the English translation column never reached it" % (order, len(rq['text']), rq['itemBudget'], rq['maxTokens']), flush=True)
    # validation + rendering: all eight verbs, in text order, nothing focused, no English cards
    assert g['lemmas'] == FR_LEMMAS, ('every French verb must survive the whole pipeline, in text order', g)
    assert g['cards'] == FR_LEMMAS, ('and every one must be RENDERED', g['cards'])
    assert not set(g['cards']) & set(EN_LEMMAS)
    assert g['focused'] is None and not g['focusCard'] and g['mode'] == 'verbs' and g['chips'] == c.js("GRAMMAR_LANG_CONFIG.fr.verb.tenses.length"), g
    assert g['rejected'] == [], g['rejected']
    print("PASS 2 [%s]: all 8 verbs validated and rendered (%s) -- unfocused (no single lemma collapse), French tense controls, no English cards" % (order, ', '.join(g['cards'])), flush=True)

    # 3. a selection confined to ONE SIDE of a single row (no other-language text anywhere nearby) still
    # resolves as ITSELF: an all-English selection stays English, an all-French one stays French. (Dragging
    # the ENTIRE right column across every row is a separate case, checked below only where a plain linear
    # DOM drag can actually stay confined to it -- in the 'columns' stream order; in 'rows' order the two
    # columns are DOM-interleaved per row, so such a drag would -- for ANY app built on native Range
    # selection, not just this one -- necessarily traverse the other column's nodes too, same as this
    # exact bilingual page's own translation column is already known to interleave, see FIX 1 above.)
    # (the tooltip's own EXISTING "give a bare phrase its sentence context" logic (sentenceRangeAt at the
    # release point, pre-dating this fix) may legitimately widen "having seen" alone to its own whole
    # visual column here, since none of these forms end in a period -- that is correct, unrelated
    # behaviour; what matters is that it stays the SAME language throughout, never the other column's.)
    close_ui()
    raw_en1 = select_between(EN[0], EN[0])
    assert not NO_FUSION_RE.search(raw_en1) and raw_en1 == EN[0]
    press_grammar()
    ge1 = grammar_state()
    assert ge1['lang'] == 'en' and ge1['requests'][-1]['lang'] == 'en' and 'see' in ge1['lemmas'], ge1
    assert not (set(ge1['lemmas']) & set(FR_LEMMAS)), ('an all-English selection must never pick up a French lemma', ge1)
    print("PASS 3 [%s]: a single English phrase alone ('%s') still resolves to English, never French" % (order, EN[0]), flush=True)
    close_ui()
    raw_fr1 = select_between(FR[0], FR[0])
    assert not NO_FUSION_RE.search(raw_fr1) and raw_fr1 == FR[0]
    press_grammar()
    gf1 = grammar_state()
    assert gf1['lang'] == 'fr' and 'voir' in gf1['lemmas'], gf1
    assert not (set(gf1['lemmas']) & set(EN_LEMMAS)), ('an all-French selection must never pick up an English lemma', gf1)
    print("PASS 3 [%s]: a single French phrase alone ('%s') still resolves to French, never English" % (order, FR[0]), flush=True)
    # Single column multi-row drags: with resolveCanonicalPdfSelection, even when the DOM
    # is interleaved in 'rows' order, dragging within the French column stays French only,
    # and dragging within the English column stays English only.
    close_ui()
    raw_fr_all = select_between(FR[0], FR[-1])
    assert not NO_FUSION_RE.search(raw_fr_all), raw_fr_all
    for fr in FR:
        assert fr in raw_fr_all, (fr, 'missing from all-French selection', raw_fr_all)
    for en in EN:
        assert en not in raw_fr_all, (en, 'English leaked into all-French selection', raw_fr_all)
    press_grammar()
    gf_all = grammar_state()
    assert gf_all['lang'] == 'fr' and gf_all['requests'][-1]['lang'] == 'fr', gf_all
    assert gf_all['lemmas'] == FR_LEMMAS, gf_all
    print("PASS 3 [%s]: the WHOLE French column alone (all 8 rows) resolves to French only and renders all 8 French verbs" % order, flush=True)

    close_ui()
    raw_en_all = select_between(EN[0], EN[-1])
    assert not NO_FUSION_RE.search(raw_en_all), raw_en_all
    for en in EN:
        assert en in raw_en_all, (en, 'missing from all-English selection', raw_en_all)
    for fr in FR:
        assert fr not in raw_en_all, (fr, 'French leaked into all-English selection', raw_en_all)
    press_grammar()
    ge_all = grammar_state()
    assert ge_all['lang'] == 'en' and ge_all['requests'][-1]['lang'] == 'en', ge_all
    assert ge_all['lemmas'] == EN_LEMMAS, ge_all
    assert ge_all['cards'] == EN_LEMMAS and not (set(ge_all['cards']) & set(FR_LEMMAS)), ge_all['cards']
    print("PASS 3 [%s]: the WHOLE English column alone (all 8 rows) resolves to English only and renders all 8 English verbs" % order, flush=True)

# =====================================================================================================================
print("\n=== SECTION 4: single-word tap is completely unaffected (ONE focused occurrence) ===")
# A word inside the fixture's own PERIOD-terminated example sentence (not the verb table itself, whose
# rows deliberately repeat "ayant"/"étant" across many forms and would make "one occurrence" ambiguous by
# construction): "Ayant accepté la défaite, les joueurs sont rentrés chez eux." Tapping "accepté" -- a
# single WORD inside a larger multi-word PDF text item -- must resolve to exactly that one sentence and
# focus exactly that one occurrence, unaffected by anything above.
close_ui()
word_js = r"""(()=>{ const layer=document.querySelector('.pdf-page-wrapper[data-page="1"] .pdf-text-layer'); const w='accepté'; const walker=document.createTreeWalker(layer, NodeFilter.SHOW_TEXT); let n;
  while((n=walker.nextNode())){ const i=n.nodeValue.indexOf(w); if(i!==-1){ n.parentElement.scrollIntoView({block:'center'}); const r=document.createRange(); r.setStart(n,i); r.setEnd(n,i+w.length); const b=r.getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2}; } } return null; })()"""
c.js(word_js); time.sleep(0.4)
p = c.js(word_js)
assert p, 'the word "accepté" was not found in the fixture'
mouse('mousePressed', p['x'], p['y'], 0); mouse('mouseReleased', p['x'], p['y'])
c.wait("els.tooltip.style.display==='flex'", timeout=8)
press_grammar()
g = grammar_state()
assert g['requests'][0]['tapped'] is not None, ('a plain word tap must still carry the tapped-word prompt hint', g)
assert g['focused'] == 'Ayant accepté' and g['focusCard'] and g['mode'] == 'verbs', ('a single tapped word focuses its own occurrence', g)
print("PASS 4: a single-word tap still focuses ONE occurrence (%r), the tapped-word prompt hint is unchanged" % g['focused'], flush=True)

# =====================================================================================================================
print("\n=== SECTION 5: a sentence and a paragraph with several verbs -> several items each ===")
SENT = "Ayant accepté la défaite, les joueurs sont rentrés chez eux."
close_ui()
c.js("state.translateMode=true; els.pages.classList.add('mode-translate')")
c.js(r"""(()=>{const p=document.createElement('div'); p.id='sentence-test'; p.style.cssText='position:fixed;top:10px;left:10px;background:#fff;z-index:99999;font-size:16px;'; p.textContent=%s; document.body.appendChild(p); return true;})()""" % json.dumps(SENT, ensure_ascii=False))
c.js("""(()=>{ window.__realSelectRangeAndTranslate=window.__realSelectRangeAndTranslate||selectRangeAndTranslate; return true; })()""")
c.js("""(()=>{ const p=document.getElementById('sentence-test'); const r=document.createRange(); r.selectNodeContents(p); state.lastSelectedRange=r; state.ctxSentence=%s; state.lastSelectionText=%s; state.lastTapPoint={x:20,y:20}; state.lastGrammarSourceText=null; handleWordOrSelection(%s, 20, 20, r.getBoundingClientRect(), null, 'sentence_translation'); return true; })()""" % (json.dumps(SENT, ensure_ascii=False), json.dumps(SENT, ensure_ascii=False), json.dumps(SENT, ensure_ascii=False)))
c.wait("els.tooltip.style.display==='flex'", timeout=8)
press_grammar()
g = grammar_state()
assert g['lemmas'] == ['accepter', 'rentrer'], g
assert g['focused'] is None and not g['focusCard'], ('a sentence selection must not collapse to one focused lemma', g)
print("PASS 5: a sentence with two verbs yields 2 items (%s), unfocused" % ', '.join(g['lemmas']), flush=True)
c.js("document.getElementById('sentence-test')?.remove()")

# =====================================================================================================================
print("\n=== SECTION 6: a selection larger than the item budget -> deterministic, bounded, and the learner is told ===")
c.js("""(()=>{ callAI=async (prompt, signal, task, onDelta, options)=>{ const rec={task, prompt, maxTokens:options&&options.maxOutputTokens}; __calls.push(rec);
  if (task==='grammar_analysis'){ const m=prompt.match(/Text \\(a JSON string[^:]*: (".*")\\n/); const text=JSON.parse(m[1]); rec.text=text;
    rec.lang=(prompt.match(/language code "(\\w+)"/)||[])[1]; rec.itemBudget=+(prompt.match(/Detect at most (\\d+) distinct lemmas/)||[])[1];
    const known=%s; const items=known.filter(([s])=>text.includes(s)).map(([surface,lemma])=>({pos:'verb', lemma, surface, sentence:text, occurrence:1, agreesWith:null, features:{}, explanation:'x', stemBreakdown:null, forms:null}));
    return JSON.stringify({language:rec.lang, items}); } return 'ok'; }; return true; })()""" % json.dumps(BIG_KNOWN_FR, ensure_ascii=False))
BIG_VERBS = [surface for surface, lemma in BIG_KNOWN_FR]
BIG_TEXT = ' '.join('Nous %s hier.' % v for v in BIG_VERBS)  # 16 DISTINCT verbs, well over the small-selection budget
c.js(r"""(()=>{const p=document.createElement('div'); p.id='big-test'; p.style.cssText='position:fixed;top:10px;left:10px;background:#fff;z-index:99999;font-size:16px;max-width:900px;'; p.textContent=%s; document.body.appendChild(p); return true;})()""" % json.dumps(BIG_TEXT, ensure_ascii=False))
close_ui()
c.js("""(()=>{ const p=document.getElementById('big-test'); const r=document.createRange(); r.selectNodeContents(p); state.lastSelectedRange=r; state.ctxSentence=%s; state.lastSelectionText=%s; state.lastTapPoint={x:20,y:20}; state.lastGrammarSourceText=null; handleWordOrSelection(%s, 20, 20, r.getBoundingClientRect(), null, 'paragraph_translation'); return true; })()""" % (json.dumps(BIG_TEXT, ensure_ascii=False), json.dumps(BIG_TEXT, ensure_ascii=False), json.dumps(BIG_TEXT, ensure_ascii=False)))
c.wait("els.tooltip.style.display==='flex'", timeout=8)
press_grammar()
g1 = grammar_state()
assert g1['requests'][0]['itemBudget'] < len(BIG_VERBS), ('the fixture must genuinely exceed the budget for this to test anything', g1)
budget = g1['requests'][0]['itemBudget']
assert len(g1['lemmas']) == budget, ('exactly the budget many lemmas are kept, the rest rejected as over_budget', g1)
assert all(r.startswith('over_budget:') for r in g1['rejected']) and len(g1['rejected']) == len(BIG_VERBS) - budget, g1['rejected']
assert g1['notes'], ('the learner must be told the selection was too large for a full analysis', g1)
close_ui()
c.js("""(()=>{ const p=document.getElementById('big-test'); const r=document.createRange(); r.selectNodeContents(p); state.lastSelectedRange=r; state.ctxSentence=%s; state.lastSelectionText=%s; state.lastTapPoint={x:20,y:20}; state.lastGrammarSourceText=null; handleWordOrSelection(%s, 20, 20, r.getBoundingClientRect(), null, 'paragraph_translation'); return true; })()""" % (json.dumps(BIG_TEXT, ensure_ascii=False), json.dumps(BIG_TEXT, ensure_ascii=False), json.dumps(BIG_TEXT, ensure_ascii=False)))
c.wait("els.tooltip.style.display==='flex'", timeout=8)
press_grammar()
g2 = grammar_state()
assert g2['lemmas'] == g1['lemmas'], ('the SAME oversized selection keeps the SAME lemmas every run (deterministic, not random)', g1['lemmas'], g2['lemmas'])
print("PASS 6: %d distinct verbs in the selection, budget %d -> exactly %d kept (deterministic across repeated runs), the rest reported 'over_budget', a visible note shown" % (len(BIG_VERBS), budget, budget), flush=True)
c.js("document.getElementById('big-test')?.remove()")

# =====================================================================================================================
print("\n=== SECTION 7: focusing an already-analysed occurrence (Grammar card, and Practice) makes ZERO AI calls ===")
close_ui()
load_pdf(verb_table_pdf_bytes('rows'))
install_model()
select_between(FR[0], EN[-1])
press_grammar()
n0 = c.js("__calls.length")
find_js = "[...document.querySelectorAll('#grammar-content .grammar-card-lemma')].find(x=>x.textContent==='comprendre')"
c.js("(%s)?.scrollIntoView({block:'center'})" % find_js); time.sleep(0.3)
p = c.js("(()=>{const b=%s; const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}})()" % find_js)
mouse('mousePressed', p['x'], p['y'], 1); mouse('mouseReleased', p['x'], p['y'])
time.sleep(0.4)
assert c.js("__calls.length") == n0 and c.js("grammarContext.focused?.lemma") == 'comprendre', ('clicking an already-validated card must not call the AI again', c.js("__calls.length"), n0)
print("PASS 7: clicking an already-analysed card (comprendre) focuses it with ZERO new AI calls", flush=True)
c.js("grammarContext.mode='verbs'; grammarContext.focused=null; renderGrammarPanel()")
n1 = c.js("__calls.length")
click_el_js = "document.querySelector('.grammar-practice-btn')"
p2 = c.js("(()=>{const b=%s; if(!b) return null; const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}})()" % click_el_js)
if p2:
    mouse('mousePressed', p2['x'], p2['y'], 1); mouse('mouseReleased', p2['x'], p2['y'])
    c.wait("document.querySelectorAll('#practice-panel .practice-target').length>0", timeout=15)
    n2 = c.js("__calls.length")
    tp = c.js("(()=>{const b=document.querySelector('#practice-panel .practice-target'); const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}})()")
    mouse('mousePressed', tp['x'], tp['y'], 1); mouse('mouseReleased', tp['x'], tp['y'])
    time.sleep(0.4)
    assert c.js("__calls.length") == n2, ('clicking a Practice target must not call the AI again either', c.js("__calls.length"), n2)
    print("PASS 7: clicking a Practice-generated highlighted target also makes ZERO new AI calls", flush=True)

# =====================================================================================================================
print("\n=== SECTION 8: translation of the SAME bilingual drag (task 6 -- documented, isolated from Grammar) ===")
close_ui()
c.js("state.translationCache={}")   # force a FRESH translation request (this exact selection was already cached above)
raw = select_between(FR[0], EN[-1])
# the translation itself fires automatically the moment the tooltip opens (that IS the tooltip's job) --
# no button press needed, just wait for it to complete.
c.wait("__calls.filter(x=>x.task==='translation').length>0", timeout=8)
tr_prompt = c.js("__calls.filter(x=>x.task==='translation').at(-1).prompt")
assert not NO_FUSION_RE.search(tr_prompt), ('the translation request text must not be fused either (fixed by pdfRangeText)', tr_prompt[:200])
for fr in FR:
    assert fr in tr_prompt, (fr, 'missing from the translation request', tr_prompt[:200])
print("PASS 8: the translation request for the same bilingual drag is properly spaced (no fusion) but is still ONE combined French+English fragment -- translation is NOT made column-aware by this fix (documented limitation, HANDOFF.md); Grammar's own isolation above is unaffected by this", flush=True)

print("\nALL BILINGUAL SELECTION CHECKS PASSED")
