"""Grammar, third tab «other words»: nouns (gender), determiners, pronouns and prepositions of the sentence.

Verbs and adjectives were all the Grammar panel explained; a learner's other half of mistakes -- the gender of a noun, the
choice of an article, what a pronoun stands for, which preposition a verb takes -- had no place.
  1 the tab exists, is named in the language of the text, and asks nothing until it is shown in an OPEN panel
  2 the prompt: the four kinds of word, labels in the language of the text, the tapped word first, the Rules topic ids
  3 the reply is checked against the text: a form that is not in it, another part of speech, a second card for the
    same word and a «related word» that is not in the sentence do not get through
  4 opening the tab makes ONE request and lists the words under their headings; coming back makes none
  5 a card opens the same detail as a verb: badges, «goes with», the sentence, why, the Rules link
  6 a tapped pronoun opens this tab by itself, with that word's card open
  7 a failed request shows a message with Retry, and Retry works
  8 Verbs and Adjectives are unchanged, and Practice is not offered in this tab
  9 the texts exist in all nine UI languages
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
c.wait("document.readyState==='complete' && !document.body.inert && typeof renderGrammarWords==='function' && typeof runGrammarAnalysis==='function'")


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1)
        result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


S = "Elle pense souvent à son frère et lui écrit du café."
VERBS = dict(language='fr', items=[
    dict(pos='verb', lemma='penser', surface='pense', sentence=S, occurrence=1, agreesWith='Elle', features=dict(tense='présent'), explanation='x', stemBreakdown=None, forms=None),
    dict(pos='verb', lemma='écrire', surface='écrit', sentence=S, occurrence=1, agreesWith='Elle', features=dict(tense='présent'), explanation='x', stemBreakdown=None, forms=None)])
WORDS = dict(language='fr', items=[
    dict(pos='pronoun', surface='lui', lemma='lui', sentence=S, occurrence=1, kind='pronom COI', gender='masculin', number='singular', relatesTo='frère', explanation='Замінює «à son frère».', rule='pronoms-coi'),
    dict(pos='preposition', surface='à', lemma='à', sentence=S, occurrence=1, kind='préposition', gender=None, number=None, relatesTo='pense', explanation='«Penser» вимагає «à».', rule='a-de-en'),
    dict(pos='determiner', surface='son', lemma='son', sentence=S, occurrence=1, kind='adjectif possessif', gender='masculin', number='singulier', relatesTo='frère', explanation='Перед іменником чоловічого роду.', rule='possessifs'),
    dict(pos='determiner', surface='du', lemma='du', sentence=S, occurrence=1, kind='article contracté (de + le)', gender='m', number='s', relatesTo='café', explanation='de + le = du.', rule='contractions'),
    dict(pos='noun', surface='frère', lemma='frère', sentence=S, occurrence=1, kind='nom', gender='masculin', number='singulier', relatesTo=None, explanation='Чоловічий рід.', rule='nope'),
    dict(pos='noun', surface='café', lemma='café', sentence=S, occurrence=1, kind='', gender='masculin', number=None, relatesTo='thé', explanation='Чоловічий рід.'),
    # must not get through:
    dict(pos='verb', surface='pense', lemma='penser', sentence=S, occurrence=1, kind='verbe', explanation='x'),
    dict(pos='noun', surface='sœur', lemma='sœur', sentence=S, occurrence=1, kind='nom', explanation='not in the text'),
    dict(pos='pronoun', surface='lui', lemma='lui', sentence=S, occurrence=1, kind='pronom tonique', explanation='a second card for the same word'),
    dict(pos='pronoun', surface='Elle', lemma='elle', sentence=S, occurrence=3, kind='pronom sujet', explanation='no third occurrence'),
    None, 'junk'])
c.js("""window.__calls=[]; window.__wordsMode='ok'; aiAvailable=()=>true; showToast=()=>{};
callAI=async (prompt, signal, task)=>{ __calls.push({task, prompt});
  if (task==='grammar_analysis') return prompt.includes('la ville') ? JSON.stringify({language:'fr',items:[{pos:'verb',lemma:'parler',surface:'parle',sentence:'Il lui parle de la ville.',occurrence:1,agreesWith:'Il',features:{tense:'présent'},explanation:'x',stemBreakdown:null,forms:null}]}) : %s;
  if (task==='grammar_words') { if (__wordsMode==='fail') throw new Error('boom'); return %s; }
  return new Promise(()=>{}); }; true""" % (json.dumps(json.dumps(VERBS, ensure_ascii=False)), json.dumps(json.dumps(WORDS, ensure_ascii=False))))
c.js("openBookFile(new File([%s],'t.txt',{type:'text/plain'})); true" % json.dumps(S))
c.wait("state.format && els.pages.textContent.includes('frère')")
words_calls = "__calls.filter(x=>x.task==='grammar_words').length"

c.js("runGrammarAnalysis(%s,%s); true" % (json.dumps(S), json.dumps(S)))
check("1 the third tab is named in French and nothing was asked for it yet",
      "(()=>{const b=document.getElementById('grammar-mode-words'); return !!grammarContext.analysis && b.textContent==='Autres mots' && !b.classList.contains('active') && document.getElementById('grammar-mode-verbs').classList.contains('active') && %s===0})()" % words_calls, timeout=5)

check("2 the prompt: four kinds, French labels, the Rules ids; a tapped word goes first",
      """(()=>{const p=buildGrammarWordsPrompt(%s,'fr','Ukrainian',''), f=buildGrammarWordsPrompt(%s,'fr','Ukrainian','lui'), d=buildGrammarWordsPrompt('Er denkt an sie.','de','Ukrainian','');
        return /NOUNS, DETERMINERS/.test(p) && p.includes('"pronom COI"') && p.includes('pronoms-coi') && p.includes('"rule":null') && !/The learner tapped/.test(p)
          && /The learner tapped "lui"/.test(f) && !d.includes('"rule"') && /in German itself/.test(d)})()""" % (json.dumps(S), json.dumps(S)))

check("3 the reply is checked against the text",
      """(()=>{const r=normalizeGrammarWords(%s,'fr',%s,'');
        const s=r.items.map(i=>i.pos+':'+i.surface).join(), by=x=>r.items.find(i=>i.surface===x);
        return r.ok && s==='pronoun:lui,preposition:à,determiner:son,determiner:du,noun:frère,noun:café'
          && by('lui').agreesWith==='frère' && by('lui').rule==='pronoms-coi' && by('lui').features.type==='pronom COI'
          && by('frère').rule===null && by('café').agreesWith===null && by('café').features.type==='nom'
          && r.items.every(i=>i.sentence.slice(i.start,i.end)===i.surface) || s})()""" % (json.dumps(json.dumps(WORDS, ensure_ascii=False)), json.dumps(S)))
check("3 a reply whose every item fails is an error, an empty list is not; another language's reply is refused",
      """(()=>{const bad=normalizeGrammarWords(JSON.stringify({language:'fr',items:[{pos:'noun',surface:'zzz',sentence:'zzz'}]}),'fr',%s,'');
        const none=normalizeGrammarWords(JSON.stringify({language:'fr',items:[]}),'fr',%s,''), en=normalizeGrammarWords(JSON.stringify({language:'en',items:[]}),'fr',%s,'');
        return !bad.ok && bad.error==='no_valid_items' && none.ok && none.items.length===0 && !en.ok && en.error==='language_mismatch' && !normalizeGrammarWords('nope','fr',%s,'').ok})()""" % ((json.dumps(S),) * 4))

check("3 why a French noun has its gender is written by the app: a reliable ending when the noun follows it, else «learn with the article»",
      """(()=>{state.uiLang='en'; const n=frenchNounGenderNote;
        const got=[n('nation','féminin'), n('plage','féminin'), n('frère','masculin'), n('fromage','masculin'), n('liberté','f'), n('chat',''), n('pomme de terre','féminin')];
        const ok=/nouns ending in -tion usually are/.test(got[0]) && /une plage/.test(got[1]) && !/ending/.test(got[1]) && /un frère/.test(got[2]) && /-age/.test(got[3]) && /-té/.test(got[4]) && got[5]==='' && got[6]==='';
        const r=normalizeGrammarWords(JSON.stringify({language:'fr',items:[{pos:'noun',surface:'frère',lemma:'frère',sentence:%s,occurrence:1,kind:'nom',gender:'masculin',explanation:'frère ends in -e, therefore masculine'},
          {pos:'determiner',surface:'son',lemma:'son',sentence:%s,occurrence:1,kind:'adjectif possessif',gender:'masculin',number:'pluriel',explanation:'x'}]}),'fr',%s,'');
        return ok && /un frère/.test(r.items[0].explanation) && !/therefore/.test(r.items[0].explanation) && r.items[1].features.gender===undefined || JSON.stringify(got)})()""" % ((json.dumps(S),) * 3))
c.js("state.uiLang='uk'; true")
OPEN = "els.grammarPanel.classList.add('expanded'); true"     # what the ✨ button does
c.js("document.getElementById('grammar-mode-words').click(); true")
check("4 with the panel closed the tab asks nothing", "%s===0" % words_calls)
c.js(OPEN)
check("4 opening the tab makes ONE request and lists the words under French headings",
      """(()=>{const h=[...document.querySelectorAll('#grammar-content .grammar-words-heading')].map(x=>x.textContent), k=[...document.querySelectorAll('#grammar-content .grammar-word-card .grammar-card-lemma')].map(x=>x.textContent);
        return %s===1 && h.join()==='Noms,Déterminants,Pronoms,Prépositions' && k.join()==='frère,café,son,du,lui,à' && document.getElementById('grammar-mode-words').classList.contains('active')
          && !document.querySelector('#grammar-content .grammar-practice-btn') && !document.querySelector('#grammar-controls-bar button') || JSON.stringify([h,k])})()""" % words_calls, timeout=5)
check("4 the card says what kind of word it is and what it goes with",
      "(()=>{const m=[...document.querySelectorAll('#grammar-content .grammar-word-card')].find(x=>x.querySelector('.grammar-card-lemma').textContent==='lui').querySelector('.grammar-card-meta').textContent; return m==='pronom COI · masculin · → frère' || m})()")
c.js("document.getElementById('grammar-mode-verbs').click(); document.getElementById('grammar-mode-words').click(); true")
check("4 going to Verbs and back makes no new request",
      "%s===1 && document.querySelectorAll('#grammar-content .grammar-word-card').length===6" % words_calls)

c.js("[...document.querySelectorAll('#grammar-content .grammar-word-card .grammar-card-lemma')].find(x=>x.textContent==='lui').click(); true")
check("5 a card opens the usual detail: French badges, «goes with», the sentence, why, the Rules link",
      """(()=>{const d=document.querySelector('#grammar-content .grammar-focus'); if(!d) return 'no detail';
        const badges=[...d.querySelectorAll('.grammar-badge')].map(x=>x.textContent).join('|'), ag=d.querySelector('.grammar-focus-agrees').textContent, link=d.querySelector('.grammar-rule-link');
        return badges==='pronom COI|masculin|singulier' && ag===t('grammarRelatesTo')+': frère' && /lui écrit/.test(d.querySelector('.grammar-focus-context').textContent)
          && /Замінює/.test(d.querySelector('.grammar-focus-why').textContent) && !!link && link.dataset.rule==='pronoms-coi'
          && document.querySelectorAll('#grammar-content .grammar-word-card').length===6 && !d.querySelector('.grammar-focus-grid') || JSON.stringify([badges,ag])})()""", timeout=3)
c.js("[...document.querySelectorAll('#grammar-content .grammar-word-card .grammar-card-lemma')].find(x=>x.textContent==='frère').click(); true")
check("5 a noun without a topic from the model links to the gender of nouns",
      "(()=>{const l=document.querySelector('#grammar-content .grammar-focus .grammar-rule-link'); return !!l && l.dataset.rule==='genre-noms'})()", timeout=3)

c.js("window.__calls.length=0; runGrammarAnalysis('lui',%s); true" % json.dumps(S))
check("6 a tapped pronoun selects this tab by itself; nothing is asked while the panel is closed",
      "grammarContext.mode==='words' && !!grammarContext.analysis && %s===0 && !els.grammarPanel.classList.contains('expanded')" % words_calls, timeout=5)
c.js(OPEN)
check("6 opening the panel asks once and shows that word's card open",
      """(()=>{const d=document.querySelector('#grammar-content .grammar-focus b'); return grammarContext.mode==='words' && %s===1 && !!d && d.textContent==='lui'
        && document.getElementById('grammar-mode-words').classList.contains('active') && /The learner tapped "lui"/.test(__calls.find(x=>x.task==='grammar_words').prompt)})()""" % words_calls, timeout=5)
c.js("window.__calls.length=0; runGrammarAnalysis('pense',%s); true" % json.dumps(S))
check("6 a tapped verb still opens Verbs, and asks nothing of the third tab",
      "grammarContext.mode==='verbs' && !!grammarContext.focused && grammarContext.focused.lemma==='penser' && %s===0" % words_calls, timeout=5)

S2 = "Il lui parle de la ville."
c.js("window.__wordsMode='fail'; window.__calls.length=0; runGrammarAnalysis(%s,%s); true" % (json.dumps(S2), json.dumps(S2)))
c.wait("!!grammarContext.analysis && grammarContext.sentence.includes('la ville')", timeout=5)
c.js(OPEN); c.js("document.getElementById('grammar-mode-words').click(); true")
check("7 a failed request shows a message and a Retry button",
      "(()=>{const b=document.querySelector('#grammar-content .grammar-forms-retry'); return !!b && /boom/.test(document.querySelector('#grammar-content .grammar-forms-error').textContent) && %s===1})()" % words_calls, timeout=5)
c.js("""window.__wordsMode='ok'; const real=callAI; callAI=async (p,s,task)=>{ if (task==='grammar_words') { __calls.push({task,prompt:p}); return JSON.stringify({language:'fr',items:[{pos:'pronoun',surface:'lui',lemma:'lui',sentence:%s,occurrence:1,kind:'pronom COI',relatesTo:null,explanation:'ok'}]}); } return real(p,s,task); };
document.querySelector('#grammar-content .grammar-forms-retry').click(); true""" % json.dumps(S2))
check("7 Retry asks again and shows the words", "%s===2 && document.querySelectorAll('#grammar-content .grammar-word-card').length===1" % words_calls, timeout=5)

c.js("runGrammarAnalysis(%s,%s); true" % (json.dumps(S), json.dumps(S)))
c.wait("!!grammarContext.analysis && grammarContext.sentence.includes('frère')", timeout=5)
c.js(OPEN); c.js("document.getElementById('grammar-mode-verbs').click(); true")
check("8 Verbs is unchanged: its cards, its tense bar and the Practice button",
      "document.querySelectorAll('#grammar-content .grammar-card').length===2 && !document.querySelector('#grammar-content .grammar-word-card') && !!document.querySelector('#grammar-content .grammar-practice-btn') && !!document.querySelector('#grammar-controls-bar button')", timeout=5)
check("9 the texts exist in all nine UI languages and the tab has a name in every grammar language",
      "['grammarEmptyWords','grammarRelatesTo','grammarWordsHint','grammarNounLearn','grammarNounEnding'].every(k=>['uk','en','fr','ru','zh','ko','hi','ga','es'].every(l=>I18N[k][l])) && Object.values(GRAMMAR_LANG_CONFIG).every(c=>c.labels.words)")
print("\nALL GRAMMAR WORDS CHECKS PASSED")
