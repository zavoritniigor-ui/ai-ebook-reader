# Copyright (c) 2026 Ihor. All rights reserved. Proprietary software, see LICENSE.
# Copying, modification, distribution or commercial use without written permission is prohibited.
"""Practice proofreading: the generated sentences are checked by a second request before the learner sees them.

A model that writes thirty sentences to order sometimes writes a wrong one, and a wrong example teaches the mistake.
The proofreader's own corrections are NOT used (on live replies it also spoilt right sentences): a sentence it reports
is removed, while the reading stays complete.
  1 the prompt carries every sentence as numbered data and asks for errors only; no per-language checklist
  2 a reported sentence is removed; the proofreader's «corrected» text never reaches the reading
  3 sections and marks are renumbered; every mark still sits on its form
  4 an unknown number, an unchanged text, a repeated number or junk is not a report
  5 nothing is removed when the reading would become too thin, a section would lose its only sentence, or too many
    sentences are reported at once
  6 the result is a valid reading; the input reading is not changed
  7 generation: the checked reading is what is shown and stored; exactly one review request
  8 a failed or malformed review leaves the reading exactly as generated, and Practice still opens
"""
import json, os, time
from browser_cdp import CDP
import practice_fixtures as PF

c = CDP(); c.sock.settimeout(60); c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setBypassServiceWorker', bypass=True); c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=1100, deviceScaleFactor=1, mobile=False)
URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert")
c.js("localStorage.clear();showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove()")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof applyPracticeReview==='function' && typeof generatePracticeReading==='function'")


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1)
        result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


# A reading with two planted errors: one beside the marked form, one in the marked form itself.
raw = json.loads(PF.to_json(PF.VERBS_FR))
items = raw['sections'][0]['items']
assert items[1]['text'] == 'Hier, nous avons parlé avec notre professeur.'
items[1]['text'] = 'Hier, nous avons parlé avec notre professeurs.'            # error outside the form «avons parlé»
assert items[3]['text'].startswith('Demain, je parlerai')
items[3]['text'] = items[3]['text'].replace('je parlerai', 'je parleras'); items[3]['targets'][0]['surface'] = 'parleras'   # the form itself is wrong
c.js("window.__R=validatePracticeReading(%s,{language:'fr',mode:'verbs'}); window.__before=JSON.stringify(__R); true" % json.dumps(raw, ensure_ascii=False))
N = c.js("__R.paragraphs.length")

check("1 the prompt: numbered data, errors only, no per-language checklist, reported speech is not an error",
      """(()=>{const p=buildPracticeReviewPrompt(__R.paragraphs,'fr'), d=buildPracticeReviewPrompt(['Er hat gearbeitet.'],'de');
        return p.includes('{"n":2,"text":"Hier, nous avons parlé avec notre professeurs."}') && p.includes('"n":%d') && /proofreader of French/.test(p) && !/after "si"/.test(p)
          && /do not improve style/.test(p) && /Reported speech/.test(p) && /When in doubt, leave/.test(p) && p.includes('{"fixes":[]}') && /German/.test(d)})()""" % N)

c.js("""window.__X=applyPracticeReview(__R,[
  {n:2,text:'Hier, nous avons parlé avec notre professeur CORRIGÉ.',why:'number'},
  {n:4,text:__R.paragraphs[3].replace('parleras','parlerai'),why:'person'}]); true""")
check("2 both reported sentences are removed; the proofreader's own text is nowhere in the reading",
      """(()=>{const r=__X.reading; return __X.done.dropped===2 && r.paragraphs.length===%d-2 && !r.paragraphs.some(p=>/professeur|parleras|parlerai avec le directeur|CORRIGÉ/.test(p))
        || JSON.stringify(__X.done)})()""" % N)
check("3 sections and marks are renumbered; every mark still sits on its form",
      """(()=>{const r=__X.reading; return r.sections[0].start===0 && r.sections[0].end===__R.sections[0].end-2 && r.sections[1].start===__R.sections[1].start-2
        && r.sections[r.sections.length-1].end===r.paragraphs.length && r.targets.length===__R.targets.length-2
        && r.targets.every(t=>r.paragraphs[t.paragraphIndex].slice(t.start,t.end)===t.surface)})()""")
check("6 the result is a valid reading; the input reading is untouched",
      "isValidPracticeReading(__X.reading) && JSON.stringify(__R)===__before")

check("4 an unknown number, an unchanged text, a repeated number and junk are not reports",
      """(()=>{const x=applyPracticeReview(__R,[{n:99,text:'Rien.'}, {n:0,text:'Rien.'}, {n:'2',text:'Rien du tout ici.'}, null, 'x', {n:6}, {n:6,text:''},
          {n:6,text:__R.paragraphs[5]}, {n:7,text:'Autre.'}, {n:7,text:'Encore autre.'}]);
        return x.done.dropped===1 && x.reading.paragraphs.length===%d-1 && x.reading.paragraphs[5]===__R.paragraphs[5] && !x.reading.paragraphs.includes(__R.paragraphs[6]) || JSON.stringify(x.done)})()""" % N)
check("4 a list that is not a list changes nothing", "applyPracticeReview(__R,null).reading===__R && applyPracticeReview(__R,{n:1}).reading===__R")

check("5 a reading at the floor loses nothing",
      """(()=>{const r=JSON.parse(__before), n=MIN_ITEMS;
        const thin=Object.assign({},r,{paragraphs:r.paragraphs.slice(0,n), targets:r.targets.filter(t=>t.paragraphIndex<n),
          sections:r.sections.filter(s=>s.start<n).map(s=>Object.assign({},s,{end:Math.min(s.end,n)}))});
        const x=applyPracticeReview(thin,[{n:5,text:'Autre.'}]);
        return isValidPracticeReading(thin) && x.done.dropped===0 && x.reading===thin})()""")
check("5 a section's only sentence is never removed",
      """(()=>{const r=JSON.parse(__before); const story=r.sections[r.sections.length-1]; const one=Object.assign({},r,{sections:r.sections.slice(0,-1).concat([Object.assign({},story,{end:story.start+1}),{heading:'',kind:'story',start:story.start+1,end:story.end}])});
        const x=applyPracticeReview(one,[{n:story.start+1,text:'Autre.'}]); return isValidPracticeReading(one) && x.done.dropped===0 && x.reading===one})()""")
check("5 too many sentences reported at once: the verdict is not believed, nothing is removed",
      """(()=>{const many=__R.paragraphs.map((p,i)=>({n:i+1,text:'Autre.'})).slice(0,Math.floor(%d*PRACTICE_REVIEW_MAX_SHARE)+1);
        const x=applyPracticeReview(__R,many); return x.done.dropped===0 && x.reading===__R})()""" % N)

# 7 / 8: the whole generation, with a mocked provider
c.js("""window.__calls=[]; window.__review='ok';
callAI=function(prompt, signal, task){ __calls.push(task);
  if (task==='practice_reading') return Promise.resolve(%s);
  if (task==='practice_review') { if (__review==='fail') return Promise.reject(new Error('timeout'));
    if (__review==='junk') return Promise.resolve('Sure! Everything looks fine.');
    return Promise.resolve(JSON.stringify({fixes:[{n:2,text:'Hier, nous avons parlé avec notre professeur.',why:'number'}]})); }
  return Promise.reject(new Error('unexpected task '+task)); }; true""" % json.dumps(json.dumps(raw, ensure_ascii=False)))
ctx = "{sourceLanguage:'fr', targetLanguage:'uk', mode:'verbs', lemmas:%s}" % json.dumps(PF.VERB_LEMMAS)
c.js("window.__s=null; generatePracticeReading(%s).then(s=>window.__s=s); true" % ctx)
check("7 the reported sentence is gone from the session and exactly one review request was made",
      "!!__s && __s.status==='ready' && __s.reading.paragraphs.length===%d-1 && !__s.reading.paragraphs.some(p=>/notre professeur/.test(p)) && __calls.join()==='practice_reading,practice_review'" % N, timeout=5)
check("7 the stored session does not hold it either",
      "(()=>{const k=Object.keys(localStorage).find(k=>k.startsWith('practice_session:')); return !!k && !localStorage.getItem(k).includes('notre professeur')})()", timeout=3)
for mode in ('fail', 'junk'):
    c.js("window.__review=%s; window.__calls=[]; window.__s=null; generatePracticeReading(%s).then(s=>window.__s=s); true" % (json.dumps(mode), ctx))
    check("8 review %s: the reading is exactly as generated and Practice is ready" % mode,
          "!!__s && __s.status==='ready' && __s.reading.paragraphs[1]==='Hier, nous avons parlé avec notre professeurs.' && __s.reading.paragraphs.length===%d && __calls.join()==='practice_reading,practice_review'" % N, timeout=5)
print("\nALL PRACTICE REVIEW CHECKS PASSED")
