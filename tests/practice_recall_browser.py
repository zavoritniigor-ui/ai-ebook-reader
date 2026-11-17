# Copyright (c) 2026 Ihor. All rights reserved. Proprietary software, see LICENSE.
# Copying, modification, distribution or commercial use without written permission is prohibited.
"""Practice, second step «З пам'яті» (from memory): the same reading with every verb/adjective form replaced by a field.

Reading shows a form; having to produce it is what keeps it. The step is opt-in (one button over the reading), uses
only the reading already on screen (no AI request, nothing regenerated), and always ends with the right form shown:
  1 plain reading is unchanged: no field, one «from memory» button
  2 the button hides every verb form behind a field whose cue is the dictionary word; the form is not in the text
  3 a right form (any case, either apostrophe) returns as the usual clickable target and the next field takes focus
  4 a form right except for an accent is not accepted, and the note says to look at the accents
  5 two misses show the form, marked as shown, and it does not count as remembered
  6 a returned target still opens its Grammar card with no AI request
  7 the count and the closing line are right; «Read» restores the plain reading
  8 pressing the button with a real mouse click never opens the reader's word popup
  9 a rule reading (whole fragments) has no such step; all nine UI languages have the texts
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
c.wait("document.readyState==='complete' && !document.body.inert && typeof displayPracticeSession==='function' && typeof buildPracticeGap==='function'")


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1)
        result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def type_into(index, text):
    """Types into the index-th remaining field and presses Enter, as a keyboard would."""
    c.js("""(()=>{const g=document.querySelectorAll('#practice-panel .practice-gap')[%d]; g.focus(); g.value=%s;
        g.dispatchEvent(new Event('input',{bubbles:true}));
        g.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));})()""" % (index, json.dumps(text)))


N = sum(len(i['targets']) for sec in PF.VERBS_FR['sections'] for i in sec['items'])
c.js("""window.__aiCalls=0; const realCallAI=callAI; callAI=function(){ window.__aiCalls++; return Promise.reject(new Error('no AI in this test')); };
const s=createPracticeSession({sourceLanguage:'fr', targetLanguage:'uk', mode:'verbs', lemmas:%s});
s.status='ready'; s.reading=validatePracticeReading(%s,{language:'fr',mode:'verbs'}); currentPracticeSession=s; displayPracticeSession(s); true"""
     % (json.dumps(PF.VERB_LEMMAS), PF.to_json(PF.VERBS_FR)))

check("1 plain reading: no field, %d targets, one «from memory» button that is not pressed" % N,
      "document.querySelectorAll('#practice-panel input').length===0 && document.querySelectorAll('#practice-panel .practice-target').length===%d && document.querySelector('#practice-recall').getAttribute('aria-pressed')==='false'" % N)

# 8 (first, while the button is fresh): a real mouse click on it must not be taken for a tap on a word
pos = c.js("(()=>{const b=document.querySelector('#practice-recall').getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2}})()")
for kind in ('mousePressed', 'mouseReleased'):
    c.call('Input.dispatchMouseEvent', type=kind, x=pos['x'], y=pos['y'], button='left', clickCount=1)
check("2 every verb form is now a field (%d), none is left as text, the cue is the dictionary word" % N,
      """(()=>{const p=document.getElementById('practice-panel'), g=[...p.querySelectorAll('.practice-gap')];
        return g.length===%d && p.querySelectorAll('.practice-target').length===0 && g[0].placeholder==='parler' && g[0].value===''
          && !/parlons/.test(p.querySelector('.practice-sentence').textContent) && document.activeElement===g[0]
          && p.querySelector('#practice-recall').getAttribute('aria-pressed')==='true' || {n:g.length, ph:g[0]&&g[0].placeholder}})()""" % N, timeout=3)
check("8 the real click on the button opened no word popup", "els.tooltip.style.display==='none' || getComputedStyle(els.tooltip).display==='none'")

type_into(0, '  PARLONS ')
check("3 a right form in another case comes back as a clickable target; focus moves to the next field",
      """(()=>{const p=document.getElementById('practice-panel'), b=p.querySelector('.practice-recalled');
        return !!b && b.textContent==='parlons' && b.classList.contains('practice-target-verb') && p.querySelectorAll('.practice-gap').length===%d
          && document.activeElement===p.querySelector('.practice-gap') && p.querySelector('.practice-recall-count').textContent==='1 / %d'})()""" % (N - 1, N))

type_into(0, 'avons parle')   # the form is «avons parlé»
check("4 a missing accent is not accepted and the note points at the accents",
      """(()=>{const p=document.getElementById('practice-panel'), g=p.querySelector('.practice-gap');
        return g.classList.contains('practice-gap-off') && p.querySelectorAll('.practice-recalled').length===1 && p.querySelectorAll('.practice-revealed').length===0
          && p.querySelector('.practice-recall-note').textContent===t('practiceRecallAccents')})()""")
type_into(0, 'avons parlé')
check("4 the corrected form is accepted on the second try", "document.querySelectorAll('#practice-panel .practice-recalled').length===2")

type_into(0, 'parlait')       # the form is «parlais»
check("5 a first miss keeps the field and asks to try again",
      "document.querySelectorAll('#practice-panel .practice-revealed').length===0 && document.querySelector('#practice-panel .practice-recall-note').textContent===t('practiceRecallAgain')")
type_into(0, 'parlons')
check("5 a second miss shows the form, marked as shown, and it is not counted as remembered",
      """(()=>{const p=document.getElementById('practice-panel'), b=p.querySelector('.practice-revealed');
        return !!b && b.textContent==='parlais' && p.querySelectorAll('.practice-recalled').length===2 && p.querySelector('.practice-recall-count').textContent==='2 / %d'
          && p.querySelector('.practice-recall-note').textContent.includes('parlais')})()""" % N)

c.js("document.querySelector('#practice-panel .practice-recalled').click()")
check("6 a returned target opens its Grammar card, with no AI request",
      "document.getElementById('grammar-panel').classList.contains('expanded') && /parlons/.test(document.getElementById('grammar-content').textContent) && window.__aiCalls===0", timeout=3)

# 7 finish the rest: every remaining field gets its own form
left = c.js("document.querySelectorAll('#practice-panel .practice-gap').length")
surfaces = [t_['surface'] for sec in PF.VERBS_FR['sections'] for i in sec['items'] for t_ in i['targets']][3:]
assert left == len(surfaces) == N - 3, (left, len(surfaces))
for s_ in surfaces:
    type_into(0, s_.replace("'", "’"))
check("7 all done: no field left, the closing line gives %d of %d" % (N - 1, N),
      """(()=>{const p=document.getElementById('practice-panel'); return p.querySelectorAll('.practice-gap').length===0
        && p.querySelectorAll('.practice-recalled').length===%d && p.querySelector('.practice-recall-note').textContent===t('practiceRecallDone').replace('{n}','%d').replace('{total}','%d')
        || p.querySelector('.practice-recall-note').textContent})()""" % (N - 1, N - 1, N))
c.js("document.querySelector('#practice-recall').click()")
check("7 «Read» restores the plain reading: %d targets, no field, nothing marked" % N,
      "document.querySelectorAll('#practice-panel .practice-target').length===%d && document.querySelectorAll('#practice-panel input, #practice-panel .practice-recalled, #practice-panel .practice-revealed').length===0 && window.__aiCalls===0" % N, timeout=3)

check("9 a reading made only of rule fragments offers no «from memory» step",
      "practiceCanRecall({targets:[{pos:'rule'}]})===false && practiceCanRecall({targets:[{pos:'rule'},{pos:'verb'}]})===true")
check("9 the texts exist in all nine UI languages",
      "['practiceRecallOn','practiceRecallOff','practiceRecallTip','practiceRecallAgain','practiceRecallAccents','practiceRecallShown','practiceRecallDone','practiceRecallGap'].every(k=>['uk','en','fr','ru','zh','ko','hi','ga','es'].every(l=>I18N[k][l])) || 'missing'")
print("\nALL PRACTICE RECALL CHECKS PASSED")
