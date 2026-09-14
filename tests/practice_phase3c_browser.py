"""Practice Workspace Phase 3C: Answer input and local grading."""
import os
from browser_cdp import CDP

c = CDP()
c.call('Page.enable')
c.call('Runtime.enable')
c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1600, height=1000, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState === 'complete' && !document.body.inert")

def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name)

def settle():
    c.js("""(async () => {
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await Promise.all(document.getAnimations().filter(a =>
            a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})));
        await new Promise(resolve => requestAnimationFrame(resolve));
    })()""")

# Setup practice worksheet
c.js('''
showUpdateBanner=()=>{};
document.getElementById('sw-update-banner')?.remove();
document.querySelector('nav').classList.add('collapsed');
initTxt('Original text. '.repeat(50));
callAI = async () => { throw new Error('Unexpected generation'); };

// Create Phase 3C practice session
currentPracticeSession = createPracticeSession({sourceLanguage:'en', targetLanguage:'uk'});
currentPracticeSession.status = 'ready';
currentPracticeSession.worksheet = {
  metadata:{title:'Phase 3C Tests'},
  exercises: [
    {
      id:'ex1', type:'fill_form', difficulty:1,
      instruction:'Fill in the blank',
      prompt:'The cat ___ on the sofa.',
      expectedConcept:'present simple',
      expectedAnswer:'is',
      acceptedAnswers:['is', 'is sitting'],
      hints:['Think about present tense', 'Answer is short', 'is']
    },
    {
      id:'ex2', type:'conjugation', difficulty:2,
      instruction:'Conjugate the verb',
      prompt:'I ___ (go) yesterday.',
      expectedConcept:'past tense',
      expectedAnswer:'went',
      acceptedAnswers:['went'],
      hints:['Irregular verb', 'Past tense', 'went']
    },
    {
      id:'ex3', type:'short_production', difficulty:3,
      instruction:'Write a sentence',
      prompt:'Use because to explain.',
      expectedConcept:'free production',
      // No expectedAnswer for free production
      hints:['Start with I', 'Use because', 'Complete thought']
    }
  ]
};
window.practiceSession = currentPracticeSession;
document.getElementById('grammar-content').innerHTML = '';
displayPracticeSession(currentPracticeSession);
''')
settle()

# Test 1: Answer inputs exist
check('Answer input elements exist',
    'document.querySelectorAll(".answer-input").length === 3')

# Test 2: Check buttons exist
check('Check buttons exist for all exercises',
    'document.querySelectorAll(".answer-check-btn").length === 3')

# Test 3: Answer input has correct type
check('Fill_form exercise has text input',
    '''document.querySelector('[data-id="ex1"] .answer-input')?.tagName === 'INPUT' ''')

# Test 4: Textarea for production exercise
check('Production exercise has textarea',
    '''document.querySelector('[data-id="ex3"] .answer-input')?.tagName === 'TEXTAREA' ''')

# Test 5: Answer persistence on input
c.js('document.querySelector("[data-id=\'ex1\'] .answer-input").value = "is"; document.querySelector("[data-id=\'ex1\'] .answer-input").dispatchEvent(new Event("input", {bubbles: true}));')
check('Answer persisted to session',
    'currentPracticeSession.answers?.ex1?.answer === "is"')

# Test 6: Local grading - correct answer
c.js('document.querySelector("[data-id=\'ex1\'] .answer-check-btn").click();')
settle()
check('Correct answer shows success feedback',
    '''document.querySelector('[data-id="ex1"] .exercise-feedback')?.classList.contains('feedback-correct') === true''')

# Test 7: Grading marks response in session
check('Feedback stored in session',
    'currentPracticeSession.answers?.ex1?.feedback?.isCorrect === true')

# Test 8: Incorrect answer feedback
c.js('document.querySelector("[data-id=\'ex2\'] .answer-input").value = "go"; document.querySelector("[data-id=\'ex2\'] .answer-input").dispatchEvent(new Event("input", {bubbles: true})); document.querySelector("[data-id=\'ex2\'] .answer-check-btn").click();')
settle()
check('Incorrect answer shows error feedback',
    '''document.querySelector('[data-id="ex2"] .exercise-feedback')?.classList.contains('feedback-incorrect') === true''')

# Test 9: Case-insensitive grading
c.js('document.querySelector("[data-id=\'ex2\'] .answer-input").value = "WENT"; document.querySelector("[data-id=\'ex2\'] .answer-input").dispatchEvent(new Event("input", {bubbles: true})); document.querySelector("[data-id=\'ex2\'] .answer-check-btn").click();')
settle()
check('Case-insensitive grading works',
    '''currentPracticeSession.answers?.ex2?.feedback?.isCorrect === true''')

# Test 10: Free production exercise gets review marker
c.js('document.querySelector("[data-id=\'ex3\'] .answer-input").value = "I like it because it is good."; document.querySelector("[data-id=\'ex3\'] .answer-input").dispatchEvent(new Event("input", {bubbles: true})); document.querySelector("[data-id=\'ex3\'] .answer-check-btn").click();')
settle()
check('Free-production exercise marked for review',
    'currentPracticeSession.answers?.ex3?.feedback?.needsReview === true')

# Test 11: Grading function handles empty input
check('Empty answer shows message',
    '''(() => {
    const feedback = gradeExerciseAnswer({expectedAnswer: 'test'}, '');
    return feedback.isCorrect === false && feedback.feedback.includes('Please provide');
    })()''')

# Test 12: Grading function handles alternate answers
check('Alternate acceptable answers work',
    '''(() => {
    const feedback = gradeExerciseAnswer({expectedAnswer: 'is', acceptedAnswers: ['is', 'is sitting']}, 'IS SITTING');
    return feedback.isCorrect === true;
    })()''')

# Test 13: Answers persist across navigation
c.js('currentPracticeSession.currentPage = 1; displayPracticeSession(currentPracticeSession);')
settle()
check('Answer persists after page navigation',
    'document.querySelector("[data-id=\'ex1\'] .answer-input")?.value === "is"')

# Test 14: Feedback persists after page navigation
check('Feedback persists after page navigation',
    '''document.querySelector('[data-id="ex1"] .exercise-feedback')?.classList.contains('feedback-correct') === true''')

# Test 15: Collapse and restore preserve answers
c.js("setPracticeWorkspaceMode('collapsed-bottom')")
settle()
c.js("setPracticeWorkspaceMode('expanded')")
settle()
check('Answers survive collapse/restore cycle',
    '''document.querySelector("[data-id=\'ex1\'] .answer-input")?.value === "is" &&
       document.querySelector('[data-id="ex1"] .exercise-feedback')?.classList.contains('feedback-correct') === true''')

print('Practice Phase 3C tests passed')
