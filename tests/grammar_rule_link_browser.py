# Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
# Copying, modification, distribution or commercial use without written permission is prohibited.
"""Grammar card -> Rules topic: a form is explained by the construction that asks for it, not only by its tense.

«Si elle avait téléphoné…» is a plus-que-parfait BECAUSE of the condition with «si». The analysis now lets the model
name ONE topic of the Rules catalogue per item; the id is checked against the catalogue, and the card links to it.
  1 the prompt lists the catalogue's topic ids and asks for the construction (languages with a catalogue only)
  2 a valid id is kept; an id outside the catalogue is dropped and noted, never shown
  3 with no id from the model the card links to the topic of the form's own tense; an adjective to agreement
  4 the card shows the link with the topic's own title; a real click opens Rules on that topic, no word popup
  5 a form met in Practice (no model id) still gets its tense's topic; a looked-up word gets no link
  6 the text exists in all nine UI languages
"""
import json, os, time
from browser_cdp import CDP

c = CDP(); c.sock.settimeout(60); c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setBypassServiceWorker', bypass=True); c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Emulation.setDeviceMetricsOverride', width=1100, height=1000, deviceScaleFactor=1, mobile=False)
URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert")
c.js("localStorage.clear();showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove()")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof grammarItemRule==='function' && typeof openRuleTopic==='function'")


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1)
        result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


SENT = "Si elle avait téléphoné avant, elle aurait su que le propriétaire était parti en vacances."
c.js("window.__S=%s; window.__aiCalls=[]; callAI=function(p,a,task){ window.__aiCalls.push(task); return new Promise(()=>{}); }; true" % json.dumps(SENT))

check("1 the French prompt lists the catalogue ids, has the rule slot and asks for the construction",
      """(()=>{const p=buildGrammarAnalysisPrompt(__S,'fr','Ukrainian'); return p.includes('"rule":null') && p.includes('hypothese-si') && p.includes('subjonctif-present')
        && /Prefer the CONSTRUCTION/.test(p) && /name that construction/.test(p)})()""")
check("1 a language without a Rules catalogue gets no rule slot",
      "(()=>{const p=buildGrammarAnalysisPrompt('Sie hat gestern gearbeitet.','de','Ukrainian'); return !p.includes('\"rule\"') && !p.includes('Ids:')})()")

reply = dict(language='fr', items=[
    dict(pos='verb', lemma='téléphoner', surface='avait téléphoné', sentence=SENT, occurrence=1, agreesWith='elle',
         features=dict(tense='plus-que-parfait', mood='indicatif'), explanation='Нереальна умова в минулому після «si».', rule='hypothese-si', stemBreakdown=None, forms=None),
    dict(pos='verb', lemma='savoir', surface='aurait su', sentence=SENT, occurrence=1, agreesWith='elle',
         features=dict(tense='conditionnel passé', mood='conditionnel'), explanation='Наслідок нереальної умови.', rule='made-up-topic', stemBreakdown=None, forms=None),
    dict(pos='verb', lemma='partir', surface='était parti', sentence=SENT, occurrence=1, agreesWith='propriétaire',
         features=dict(tense='plus-que-parfait', mood='indicatif'), explanation='Дія раніше за іншу минулу.', stemBreakdown=None, forms=None)])
c.js("window.__A=normalizeGrammarAnalysis(%s,'fr',__S,''); true" % json.dumps(json.dumps(reply, ensure_ascii=False)))
check("2 a valid id is kept; an id outside the catalogue is dropped and noted",
      """(()=>{const [a,b,d]=__A.items; return __A.ok && __A.items.length===3 && a.rule==='hypothese-si' && b.rule===null && d.rule===null
        && __A.adjusted.some(x=>x.reason==='unknown_rule' && x.detail==='made-up-topic') || JSON.stringify(__A.items.map(i=>i.rule))})()""")
check("3 the link: the model's topic, else the topic of the form's own tense",
      """(()=>{const ids=__A.items.map(i=>grammarItemRule(i,'fr').id); return ids.join()==='hypothese-si,conditionnel-passe,plus-que-parfait' || ids.join()})()""")
check("3 tense names map onto topics; a French adjective goes to agreement; no topic -> no link",
      """(()=>{const r=(pos,lang,f)=>grammarRuleFromFeatures(pos,lang,f);
        return r('verb','fr',{tense:'Passé composé'})==='passe-compose' && r('verb','fr',{tense:'présent',mood:'subjonctif'})==='subjonctif-present'
          && r('verb','fr',{tense:'futur'})==='futur-simple' && r('verb','fr',{mood:'impératif'})==='imperatif' && r('adjective','fr',{gender:'féminin'})==='accord-adjectif'
          && r('verb','en',{tense:'Past Simple'})==='past-simple' && r('adjective','en',{degree:'comparative'})==='comparatives' && r('adjective','en',{})===null
          && r('verb','de',{tense:'Perfekt'})===null})()""")

c.js("openBookFile(new File([__S+'\\n\\nElle a donc cherché un café ouvert.'],'t.txt',{type:'text/plain'})); true")
c.wait("state.format && els.pages.textContent.includes('téléphoné')")
c.js("presentGrammarAnalysis(__A,'fr'); focusGrammarItem(__A.items[0],'fr'); true")
check("4 the card shows the link with the topic's own French title",
      """(()=>{const b=document.querySelector('#grammar-content .grammar-rule-link'); return !!b && b.dataset.rule==='hypothese-si' && b.textContent.includes('La condition avec « si »')
        && document.getElementById('grammar-panel').classList.contains('expanded') || (b&&b.textContent)})()""", timeout=3)
pos = c.js("(()=>{const e=document.querySelector('#grammar-content .grammar-rule-link'); e.scrollIntoView({block:'center'}); const b=e.getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2}})()")
time.sleep(0.4)
pos = c.js("(()=>{const b=document.querySelector('#grammar-content .grammar-rule-link').getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2}})()")
for kind in ('mousePressed', 'mouseReleased'):
    c.call('Input.dispatchMouseEvent', type=kind, x=pos['x'], y=pos['y'], button='left', clickCount=1)
check("4 a real click opens Rules on that topic (French catalogue), Grammar steps aside, no word popup",
      """(()=>{const p=document.getElementById('rules-panel'); return p.classList.contains('expanded') && rulesState.topic && rulesState.topic.id==='hypothese-si' && rulesState.lang==='fr'
        && /La condition avec « si »/.test(document.getElementById('rules-content').textContent) && !document.getElementById('grammar-panel').classList.contains('expanded')
        && getComputedStyle(els.tooltip).display==='none'})()""", timeout=3)

c.js("closeRulesPanel(); focusGrammarItem({pos:'verb', lemma:'parler', surface:'parlais', sentence:'Je parlais souvent.', start:3, end:10, features:{tense:'imparfait'}, explanation:'Звичка в минулому.', stemBreakdown:null, forms:null}, 'fr'); true")
check("5 a form met in Practice (no model id) links to its tense's topic",
      "(()=>{const b=document.querySelector('#grammar-content .grammar-rule-link'); return !!b && b.dataset.rule==='imparfait'})()", timeout=3)
c.js("focusGrammarItem({pos:'verb', lemma:'parler', surface:'parler', sentence:'', start:0, end:6, features:{tense:'présent'}, explanation:'Говорити.', lookup:true, stemBreakdown:null, forms:null}, 'fr'); true")
check("5 a looked-up word (no sentence of the book behind it) gets no link", "!document.querySelector('#grammar-content .grammar-rule-link')", timeout=3)
check("6 the text exists in all nine UI languages", "['uk','en','fr','ru','zh','ko','hi','ga','es'].every(l=>I18N.grammarRuleOpen[l]) || 'missing'")
print("\nALL GRAMMAR RULE LINK CHECKS PASSED")
