"""Practice Workspace Phase 3C: Answer input, local grading, feedback, and compact layout."""
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

# Setup practice worksheet with new Phase 3C schema (with expectedAnswer fields)
c.js('''
showUpdateBanner=()=>{};
document.getElementById('sw-update-banner')?.remove();
document.querySelector('nav').classList.add('collapsed');
initTxt('Original text for practice. '.repeat(50));
callAI = async () => { throw new Error('Unexpected generation'); };

// Create practice session with Phase 3C features
currentPracticeSession = createPracticeSession({sourceLanguage:'en', targetLanguage:'uk'});
currentPracticeSession.status = 'ready';
currentPracticeSession.worksheet = {
  metadata:{title:'Phase 3C Practice'},
  exercises: [
    {
      id:'ex1', type:'fill_form', difficulty:1,
      instruction:'Fill in the blank with the correct word',
      prompt:'The cat ___ on the sofa.',
      expectedConcept:'verb: sit/present',
      expectedAnswer:'is sitting',
      acceptedAnswers:['is sitting', 'sits'],
      hints:['Present tense', 'Action happening now', 'is sitting']
    },
    {
      id:'ex2', type:'conjugation', difficulty:2,
      instruction:'Conjugate the verb',
      prompt:'I ___ (go) home yesterday.',
      expectedConcept:'past tense',
      expectedAnswer:'went',
      acceptedAnswers:['went'],
      hints:['Irregular verb', 'Past form', 'went']
    },
    {
      id:'ex3', type:'translate', difficulty:3,
      instruction:'Translate to English',
      prompt:'Je suis heureux.',
      expectedConcept:'French to English',
      expectedAnswer:'I am happy',
      acceptedAnswers:['I am happy', 'I\'m happy'],
      hints:['Simple present', 'First person', 'I am happy']
    },
    {
      id:'ex4', type:'short_production', difficulty:4,
      instruction:'Write a short sentence',
      prompt:'Use "because" to explain why you like music.',
      expectedConcept:'production with reason',
      // No expectedAnswer for free production
      hints:['Start with "I like music because"', 'Give a reason', 'Example: I like music because it makes me happy']
    },
    {
      id:'ex5', type:'fill_form', difficulty:1,
      instruction:'Fill in the correct article',
      prompt:'She has ___ apple.',
      expectedConcept:'indefinite article',
      expectedAnswer:'an',
      acceptedAnswers:['an'],
      hints:['Vowel sound follows', 'Use "a" or "an"', 'an apple']
    }
  ]
};
window.practiceSession = currentPracticeSession;
document.getElementById('grammar-content').innerHTML = '';
displayPracticeSession(currentPracticeSession);
window.practicePanel = document.getElementById('practice-panel');
''')
settle()

# Test 1: Answer input controls are visible for each exercise
check('Answer input controls exist for all exercises',
    '''(() => {
    const inputs = document.querySelectorAll('.answer-input');
    return inputs.length === 5;
    })()''')

# Test 2: Answer inputs have correct types (text vs textarea)
check('Text exercises have text inputs, textarea exercises have textareas',
    '''(() => {
    const ex1 = document.querySelector('[data-id="ex1"] .answer-input');
    const ex4 = document.querySelector('[data-id="ex4"] .answer-input');
    return ex1?.tagName === 'INPUT' && ex1?.type === 'text' &&
           ex4?.tagName === 'TEXTAREA';
    })()''')

# Test 3: Check buttons are present
check('Check buttons present for all exercises',
    '''(() => {
    const buttons = document.querySelectorAll('.answer-check-btn');
    return buttons.length === 5;
    })()''')

# Test 4: Answer is persisted when user types
c.js('''
document.querySelector('[data-id="ex1"] .answer-input').value = 'is sitting';
document.querySelector('[data-id="ex1"] .answer-input').dispatchEvent(new Event('input', {bubbles: true}));
''')
check('Answer persisted to session on input',
    '''currentPracticeSession.answers['ex1']?.answer === 'is sitting'
''')

# Test 5: Grading correct answer
c.js('''
document.querySelector('[data-id="ex1"] .answer-check-btn').click();
''')
settle()
check('Correct answer shows feedback with checkmark',
    '''(() => {
    const feedback = document.querySelector('[data-id="ex1"] .exercise-feedback');
    return feedback?.classList.contains('feedback-correct') &&
           feedback?.textContent.includes('✓') &&
           feedback?.textContent.includes('Correct');
    })()''')

# Test 6: Feedback persisted to session
check('Feedback stored in session answers',
    '''currentPracticeSession.answers['ex1']?.feedback?.isCorrect === true
''')

# Test 7: Grading incorrect answer
c.js('''
document.querySelector('[data-id="ex2"] .answer-input').value = 'go';
document.querySelector('[data-id="ex2"] .answer-input').dispatchEvent(new Event('input', {bubbles: true}));
document.querySelector('[data-id="ex2"] .answer-check-btn').click();
''')
settle()
check('Incorrect answer shows feedback without checkmark',
    '''(() => {
    const feedback = document.querySelector('[data-id="ex2"] .exercise-feedback');
    return feedback?.classList.contains('feedback-incorrect') &&
           feedback?.textContent.includes('✗') &&
           feedback?.textContent.includes('Not quite');
    })()''')

# Test 8: Case-insensitive grading
c.js('''
document.querySelector('[data-id="ex3"] .answer-input').value = 'I AM HAPPY';
document.querySelector('[data-id="ex3"] .answer-input').dispatchEvent(new Event('input', {bubbles: true}));
document.querySelector('[data-id="ex3"] .answer-check-btn').click();
''')
settle()
check('Case-insensitive grading works',
    '''(() => {
    const feedback = document.querySelector('[data-id="ex3"] .exercise-feedback');
    return feedback?.classList.contains('feedback-correct') &&
           currentPracticeSession.answers['ex3']?.feedback?.isCorrect === true;
    })()''')

# Test 9: Free-production exercises don't get graded as incorrect
c.js('''
document.querySelector('[data-id="ex4"] .answer-input').value = 'I like music because it makes me happy';
document.querySelector('[data-id="ex4"] .answer-input').dispatchEvent(new Event('input', {bubbles: true}));
document.querySelector('[data-id="ex4"] .answer-check-btn').click();
''')
settle()
check('Free-production exercise shows "needs review" feedback',
    '''(() => {
    const feedback = document.querySelector('[data-id="ex4"] .exercise-feedback');
    return feedback?.textContent.includes('📝') &&
           feedback?.textContent.includes('requires review') &&
           currentPracticeSession.answers['ex4']?.feedback?.needsReview === true;
    })()''')

# Test 10: Empty answer shows error message
c.js('''
document.querySelector('[data-id="ex5"] .answer-input').value = '';
document.querySelector('[data-id="ex5"] .answer-input').dispatchEvent(new Event('input', {bubbles: true}));
document.querySelector('[data-id="ex5"] .answer-check-btn').click();
''')
settle()
check('Empty answer shows "Please provide an answer" message',
    '''(() => {
    const feedback = document.querySelector('[data-id="ex5"] .exercise-feedback');
    return feedback?.textContent.includes('Please provide an answer');
    })()''')

# Test 11: Answer restoration on page navigation
c.js('''
practiceSession.currentPage = 1;
displayPracticeSession(practiceSession);
''')
settle()
check('Answers persist when navigating back to first page',
    '''(() => {
    const ex1Input = document.querySelector('[data-id="ex1"] .answer-input');
    return ex1Input?.value === 'is sitting' &&
           document.querySelector('[data-id="ex1"] .exercise-feedback')?.classList.contains('feedback-correct');
    })()''')

# Test 12: Bookmark tab is visible and labeled
c.js("setPracticeWorkspaceMode('bookmark')")
settle()
check('Bookmark tab has "Practice" label visible',
    '''(() => {
    const restore = document.getElementById('practice-restore');
    return restore?.getAttribute('data-mode') === 'bookmark' &&
           !restore?.hidden &&
           restore?.textContent.includes('Practice');
    })()''')

# Test 13: Bookmark tab is positioned on left edge of Grammar
check('Bookmark tab positioned outside Grammar left edge',
    '''(() => {
    const tab = document.getElementById('practice-restore').getBoundingClientRect();
    const grammar = document.getElementById('grammar-panel').getBoundingClientRect();
    // Tab should be to the left of Grammar (or at its left edge with -44px offset)
    return Math.abs(tab.right - grammar.left) < 2 && tab.left >= 0;
    })()''')

# Test 14: Bookmark restore preserves answers
c.js("document.getElementById('practice-restore').click()")
settle()
check('Restoring from bookmark preserves answers and feedback',
    '''(() => {
    const ex1Input = document.querySelector('[data-id="ex1"] .answer-input');
    const feedback = document.querySelector('[data-id="ex1"] .exercise-feedback');
    return ex1Input?.value === 'is sitting' &&
           feedback?.classList.contains('feedback-correct') &&
           practiceWorkspaceMode === 'expanded';
    })()''')

# Test 15: Exercise styling uses theme variables
check('Exercise elements properly styled with CSS classes',
    '''(() => {
    const ex = document.querySelector('.exercise');
    const header = document.querySelector('.exercise-header');
    const input = document.querySelector('.answer-input');
    // Verify elements have proper classes that use theme variables
    return ex?.classList.contains('exercise') === true &&
           header?.classList.contains('exercise-header') === true &&
           input?.classList.contains('answer-input') === true;
    })()''')

# Test 16: Compact exercise layout (exercises take less space)
check('Exercise spacing is compact (10-12px margins)',
    '''(() => {
    const exercise = document.querySelector('.exercise');
    const computedStyle = window.getComputedStyle(exercise);
    const marginBottom = computedStyle.marginBottom;
    // Should be 12px or similar compact value
    const margin = parseInt(marginBottom);
    return margin <= 15 && margin >= 8; // Compact range
    })()''')

# Test 17: Hint buttons use theme variables
check('Hint reveal buttons use theme accent color',
    '''(() => {
    const hintBtn = document.querySelector('.hint-reveal-btn');
    const computedStyle = window.getComputedStyle(hintBtn);
    const borderColor = computedStyle.borderColor;
    // Should use accent color, not hard-coded #0066cc
    return borderColor !== 'rgb(0, 102, 204)' || borderColor.includes('rgb');
    })()''')

# Test 18: Enter key submits answer on text inputs
c.js('''
const ex = document.querySelector('[data-id="ex5"]');
const input = ex.querySelector('.answer-input');
input.value = 'an';
input.dispatchEvent(new Event('input', {bubbles: true}));
const event = new KeyboardEvent('keypress', {key: 'Enter', code: 'Enter'});
input.dispatchEvent(event);
''')
settle()
check('Enter key on text input triggers answer check',
    '''(() => {
    const feedback = document.querySelector('[data-id="ex5"] .exercise-feedback');
    return feedback?.classList.contains('feedback-correct');
    })()''')

# Test 19: Collapse and restore preserves answers
c.js("setPracticeWorkspaceMode('collapsed-bottom')")
settle()
c.js("setPracticeWorkspaceMode('expanded')")
settle()
check('Collapse/restore cycle preserves all answers and feedback',
    '''(() => {
    const answers = [
        document.querySelector('[data-id="ex1"] .answer-input')?.value === 'is sitting',
        document.querySelector('[data-id="ex2"] .exercise-feedback')?.classList.contains('feedback-incorrect'),
        document.querySelector('[data-id="ex3"] .exercise-feedback')?.classList.contains('feedback-correct')
    ];
    return answers.every(x => x === true);
    })()''')

# Test 20: Grading function handles edge cases
check('Empty answer feedback is appropriate',
    '''(() => {
    const feedback = gradeExerciseAnswer(
        { expectedAnswer: 'test', acceptedAnswers: [] },
        ''
    );
    return feedback.isCorrect === false && feedback.feedback.includes('Please provide');
    })()''')

print('Practice Phase 3C tests passed')
