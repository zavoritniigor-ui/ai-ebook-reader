"""Practice proofreading: the generated sentences are checked by a second request before the learner sees them.

A model that writes thirty sentences to order sometimes writes a wrong one, and a wrong example teaches the mistake.
  1 the prompt carries every sentence as numbered data, asks for errors only, and adds the language's own checklist
  2 a correction outside the marked form is applied; the form keeps its place and stays clickable
  3 a correction OF the marked form moves the mark onto the corrected form («est parti» -> «est partie»)
  4 a rewrite, an exercise line, markup, an unknown number or an unchanged text is ignored
  5 a correction that loses the marked form removes the sentence -- only while the reading stays complete
  6 the result is a valid reading; the input reading is not changed
  7 generation: the proofread reading is what is shown and stored; exactly one review request
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

check("1 the prompt: numbered data, errors only, the French checklist; another language has no French checklist",
      """(()=>{const p=buildPracticeReviewPrompt(__R.paragraphs,'fr'), d=buildPracticeReviewPrompt(['Er hat gearbeitet.'],'de');
        return p.includes('{"n":2,"text":"Hier, nous avons parlé avec notre professeurs."}') && p.includes('"n":%d') && /proofreader of French/.test(p) && /after "si"/.test(p)
          && /do not improve style/.test(p) && p.includes('{"fixes":[]}') && !/after "si"/.test(d) && /German/.test(d)})()""" % N)

c.js("""window.__X=applyPracticeReview(__R,[
  {n:2,text:'Hier, nous avons parlé avec notre professeur.',why:'number'},
  {n:4,text:__R.paragraphs[3].replace('parleras','parlerai'),why:'person'}]); true""")
check("2 a correction beside the form is applied and the form keeps its exact place",
      """(()=>{const r=__X.reading, t=r.targets.find(x=>x.paragraphIndex===1); return r.paragraphs[1]==='Hier, nous avons parlé avec notre professeur.'
        && t.surface==='avons parlé' && r.paragraphs[1].slice(t.start,t.end)==='avons parlé'})()""")
check("3 a correction of the form itself moves the mark onto the corrected form",
      """(()=>{const r=__X.reading, t=r.targets.find(x=>x.paragraphIndex===3); return /je parlerai avec/.test(r.paragraphs[3]) && t.surface==='parlerai'
        && r.paragraphs[3].slice(t.start,t.end)==='parlerai' && t.lemma==='parler' && __X.done.fixed===2 && __X.done.dropped===0 || JSON.stringify([t,__X.done])})()""")
check("6 the result is a valid reading of the same size; the input reading is untouched",
      "isValidPracticeReading(__X.reading) && __X.reading.paragraphs.length===%d && __X.reading.targets.length===__R.targets.length && JSON.stringify(__R)===__before" % N)

check("4 a rewrite, an exercise line, markup, an unknown number, an unchanged text and a repeated number are all ignored",
      """(()=>{const x=applyPracticeReview(__R,[
          {n:1,text:'Les enfants jouent dans le grand jardin de leur oncle depuis ce matin.'},
          {n:3,text:"Quand j'étais enfant, je (parler) souvent avec ma grand-mère."},
          {n:5,text:'Ils ne parlent <script>x</script> jamais de leurs problèmes au travail.'},
          {n:99,text:'Rien.'}, {n:0,text:'Rien.'}, {n:'2',text:'Rien du tout ici.'}, null,
          {n:6,text:__R.paragraphs[5]},
          {n:7,text:__R.paragraphs[6].replace('parliez','parlez')}, {n:7,text:'Une autre phrase complètement différente ici.'}]);
        return x.done.fixed===1 && x.done.dropped===0 && x.reading.paragraphs[0]===__R.paragraphs[0] && x.reading.paragraphs[2]===__R.paragraphs[2]
          && x.reading.paragraphs[4]===__R.paragraphs[4] && /parlez/.test(x.reading.paragraphs[6]) || JSON.stringify(x.done)})()""")

check("5 a correction that loses the marked form removes that sentence; sections and marks are renumbered",
      """(()=>{const lost=__R.paragraphs[4].replace('ne parlent jamais de leurs','ne discutent pas souvent de leurs');
        const x=applyPracticeReview(__R,[{n:5,text:lost}]), r=x.reading;
        return x.done.dropped===1 && r.paragraphs.length===%d-1 && !r.paragraphs.some(p=>/problèmes au travail/.test(p)) && isValidPracticeReading(r)
          && r.sections[0].end===__R.sections[0].end-1 && r.sections[1].start===__R.sections[1].start-1 && r.sections[r.sections.length-1].end===r.paragraphs.length
          && r.targets.every(t=>r.paragraphs[t.paragraphIndex].slice(t.start,t.end)===t.surface) || JSON.stringify(x.done)})()""" % N)
check("5 ...but not when the reading would become too thin: the sentence then stays as it was",
      """(()=>{const r=JSON.parse(__before), n=MIN_ITEMS;   // cut down to exactly the floor
        const thin=Object.assign({},r,{paragraphs:r.paragraphs.slice(0,n), targets:r.targets.filter(t=>t.paragraphIndex<n),
          sections:r.sections.filter(s=>s.start<n).map(s=>Object.assign({},s,{end:Math.min(s.end,n)}))});
        const lost=thin.paragraphs[4].replace('ne parlent jamais de leurs','ne discutent pas souvent de leurs');
        const x=applyPracticeReview(thin,[{n:5,text:lost}]);
        return isValidPracticeReading(thin) && x.done.dropped===0 && x.done.fixed===0 && x.reading.paragraphs.length===n && x.reading.paragraphs[4]===thin.paragraphs[4] || JSON.stringify(x.done)})()""")
check("5 a section's only sentence is never removed",
      """(()=>{const r=JSON.parse(__before); const story=r.sections[r.sections.length-1]; const one=Object.assign({},r,{sections:r.sections.slice(0,-1).concat([Object.assign({},story,{end:story.start+1}),{heading:'',kind:'story',start:story.start+1,end:story.end}])});
        const idx=story.start, t=one.targets.find(x=>x.paragraphIndex===idx); const lost=one.paragraphs[idx].replace(t.surface,'discuté');
        const x=applyPracticeReview(one,[{n:idx+1,text:lost}]); return x.done.dropped===0 && x.reading.paragraphs.length===one.paragraphs.length})()""")

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
check("7 the proofread sentence is in the session and exactly one review request was made",
      "!!__s && __s.status==='ready' && __s.reading.paragraphs[1]==='Hier, nous avons parlé avec notre professeur.' && __calls.join()==='practice_reading,practice_review'", timeout=5)
check("7 the stored session holds the proofread sentence too",
      "(()=>{const k=Object.keys(localStorage).find(k=>k.startsWith('practice_session:')); return !!k && localStorage.getItem(k).includes('avec notre professeur.') && !localStorage.getItem(k).includes('notre professeurs.')})()", timeout=3)
for mode in ('fail', 'junk'):
    c.js("window.__review=%s; window.__calls=[]; window.__s=null; generatePracticeReading(%s).then(s=>window.__s=s); true" % (json.dumps(mode), ctx))
    check("8 review %s: the reading is exactly as generated and Practice is ready" % mode,
          "!!__s && __s.status==='ready' && __s.reading.paragraphs[1]==='Hier, nous avons parlé avec notre professeurs.' && __s.reading.paragraphs.length===%d && __calls.join()==='practice_reading,practice_review'" % N, timeout=5)
print("\nALL PRACTICE REVIEW CHECKS PASSED")
