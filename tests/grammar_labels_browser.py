"""Grammar card: one language for the feature badges, one way of writing a table row.

The model answers «3e personne» beside «singular» in one card, and a table where five rows carry their subject
(«j'avais téléphoné») and one does not («avait téléphoné»).
  1 person / number / gender / mood are named in the language being studied, whatever spelling arrived
  2 a tense, an unknown value and a language without a table are shown as they came
  3 the card of a French verb shows French badges only
  4 a table with mixed rows gets the missing subjects (with elision); the ending mark stays on the ending
  5 a table with no subject anywhere, and an imperative, are left as they are
  6 the prompt asks for the labels in the language of the text
"""
import json, os, time
from browser_cdp import CDP

c = CDP(); c.sock.settimeout(60); c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setBypassServiceWorker', bypass=True); c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Emulation.setDeviceMetricsOverride', width=1100, height=1000, deviceScaleFactor=1, mobile=False)
URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof grammarFeatureLabel==='function'")
c.js("showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove(); callAI=()=>new Promise(()=>{}); true")


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1)
        result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


check("1 French: person, number, gender and mood are named in French whatever arrived",
      """(()=>{const L=(k,v,f)=>grammarFeatureLabel(k,v,'fr',f||{number:'x'});
        const got=[L('person','3rd person'),L('person','3e personne'),L('person',1),L('number','singular'),L('number','Plural'),L('number','pluriel'),
          L('gender','feminine'),L('gender','m'),L('gender','féminin'),L('mood','indicative'),L('mood','Subjunctive'),L('mood','impératif')];
        const want=['3e personne','3e personne','1re personne','singulier','pluriel','pluriel','féminin','masculin','féminin','indicatif','subjonctif','impératif'];
        return got.join('|')===want.join('|') || got.join('|')})()""")
check("1 the number inside a person label is kept only when no badge of its own carries it",
      "grammarFeatureLabel('person','3rd person plural','fr',{})==='3e personne du pluriel' && grammarFeatureLabel('person','3rd person plural','fr',{number:'plural'})==='3e personne' && grammarFeatureLabel('person','1st person singular','en',{})==='1st person singular'")
check("1 English text: the same closed sets in English",
      "grammarFeatureLabel('person','3e personne','en',{number:'s'})==='3rd person' && grammarFeatureLabel('number','singulier','en')==='singular' && grammarFeatureLabel('mood','indicatif','en')==='indicative'")
check("2 a tense, an unknown value and a language without a table are shown as they came",
      "grammarFeatureLabel('tense','plus-que-parfait','fr')==='plus-que-parfait' && grammarFeatureLabel('person','première personne','fr')==='première personne' && grammarFeatureLabel('gender','neuter','fr')==='neuter' && grammarFeatureLabel('number','Singular','de')==='Singular' && grammarFeatureLabel('auxiliary','avoir','fr')==='avoir'")

item = dict(pos='verb', lemma='téléphoner', surface='avait téléphoné', sentence='Si elle avait téléphoné avant, elle aurait su.', start=8, end=23,
            agreesWith='elle', features=dict(tense='plus-que-parfait', mood='indicative', person='3e personne', number='singular', auxiliary='avoir'),
            explanation='x', stemBreakdown=None,
            forms={'je': "j'avais téléphoné", 'tu': 'tu avais téléphoné', 'il / elle / on': 'avait téléphoné', 'nous': 'nous avions téléphoné', 'vous': 'vous aviez téléphoné', 'ils / elles': 'avaient téléphoné'})
c.js("focusGrammarItem(%s,'fr'); true" % json.dumps(item, ensure_ascii=False))
check("3 the card shows French badges only",
      """(()=>{const b=[...document.querySelectorAll('#grammar-content .grammar-focus .grammar-badge')].map(x=>x.textContent);
        return b.join('|')==='plus-que-parfait|indicatif|3e personne|singulier|auxiliaire: avoir' || b.join('|')})()""", timeout=3)
check("4 the two rows without a subject get it; the others are untouched",
      """(()=>{const v=[...document.querySelectorAll('#grammar-content .grammar-focus .grammar-grid-value')].map(x=>x.textContent);
        return v.join('|')==="j'avais téléphoné|tu avais téléphoné|il avait téléphoné|nous avions téléphoné|vous aviez téléphoné|ils avaient téléphoné" || v.join('|')})()""")
check("4 the ending mark of a completed row is still on the participle's ending, and its row is the highlighted one",
      """(()=>{const rows=[...document.querySelectorAll('#grammar-content .grammar-focus .grammar-grid-row')], r=rows[2];
        const e=[...r.querySelectorAll('.verb-ending')].map(x=>x.textContent), ref=[...rows[1].querySelectorAll('.verb-ending')].map(x=>x.textContent);
        return r.classList.contains('current') && e.length>0 && e.join()===ref.join() || JSON.stringify([e,ref,r.className])})()""")

item2 = dict(item, surface='aime', sentence='Elle aime lire.', start=5, end=9, features=dict(tense='présent', person='3', number='s'),
             forms={'je': "j'aime", 'tu': 'tu aimes', 'il / elle / on': 'aime', 'nous': 'aimons', 'vous': 'vous aimez', 'ils / elles': 'ils aiment'}, lemma='aimer')
c.js("focusGrammarItem(%s,'fr'); true" % json.dumps(item2, ensure_ascii=False))
check("4 elision is kept and a plain row is completed",
      """(()=>{const v=[...document.querySelectorAll('#grammar-content .grammar-focus .grammar-grid-value')].map(x=>x.textContent);
        return v.join('|')==="j'aime|tu aimes|il aime|nous aimons|vous aimez|ils aiment" || v.join('|')})()""", timeout=3)
bare = dict(item2, forms={'je': 'aime', 'tu': 'aimes', 'il / elle / on': 'aime', 'nous': 'aimons', 'vous': 'aimez', 'ils / elles': 'aiment'})
c.js("focusGrammarItem(%s,'fr'); true" % json.dumps(bare, ensure_ascii=False))
check("5 a table with no subject anywhere is left as it is",
      "(()=>{const v=[...document.querySelectorAll('#grammar-content .grammar-focus .grammar-grid-value')].map(x=>x.textContent); return v.join('|')==='aime|aimes|aime|aimons|aimez|aiment' || v.join('|')})()", timeout=3)
imper = dict(item2, surface='Parle', lemma='parler', sentence='Parle plus fort !', start=0, end=5, agreesWith=None, features=dict(mood='imperative'),
             forms={'tu': 'parle', 'nous': 'parlons', 'vous': 'vous parlez'})
c.js("focusGrammarItem(%s,'fr'); true" % json.dumps(imper, ensure_ascii=False))
check("5 an imperative gets no subject, even when one row carries one",
      "(()=>{const v=[...document.querySelectorAll('#grammar-content .grammar-focus .grammar-grid-value')].map(x=>x.textContent); return v.join('|')==='parle|parlons|vous parlez' || v.join('|')})()", timeout=3)
check("6 the prompt asks for the labels in the language of the text, never a mix",
      "(()=>{const p=buildGrammarAnalysisPrompt('Elle aime lire.','fr','Ukrainian'); return /in French itself/.test(p) && /never a mix of languages/.test(p) && !p.includes('\"1st person\", \"singular\"')})()")
print("\nALL GRAMMAR LABEL CHECKS PASSED")
