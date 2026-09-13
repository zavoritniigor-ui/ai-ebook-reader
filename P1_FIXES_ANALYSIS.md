# P1 Fixes - Implementation Analysis & Guide

## Status: Phase 1/5 Complete (PR #104 in CI)
- ✅ Issue 1: Learning statistics semantics - DONE
- ⏳ Issue 2-5: Queued for implementation

## Issue 2: Voice Loading Infinite "Loading..." State

### Root Cause Analysis
**File:** `js/core.js`, lines 345-385

**Problem Code:**
```javascript
function loadVoices() {
    if (!ttsSynth) return;
    voices = ttsSynth.getVoices(); 
    if (voices.length === 0) return;  // ← Returns early, selector stuck in "Loading..."
```

**Why it happens:**
- Speech Synthesis API returns empty list initially on many devices
- Browser loads voices asynchronously (may take 100-2000ms)
- Current code gives up immediately instead of retrying or listening for `voiceschanged`
- User sees infinite "Loading..." state in voice selector with no fallback

### Implementation Plan

**Step 1: Add voice loading state tracking**
```javascript
let voicesLoaded = false;
let voicesLoadAttempts = 0;
const MAX_VOICE_LOAD_ATTEMPTS = 10;
let voicesChangeListener = null;
```

**Step 2: Rewrite loadVoices to handle empty list**
- Check if voices.length === 0
- If empty AND not yet attempted enough times:
  - Schedule retry in 200ms intervals up to 10 attempts
  - Set selector text to "Loading..." or similar
- If empty AND all attempts exhausted:
  - Show "System voice (auto-select)" as fallback option
  - Add note that system will auto-select best available voice
- Always add `voiceschanged` listener to update when voices appear

**Step 3: Add voiceschanged event handler**
```javascript
if (!voicesChangeListener) {
    voicesChangeListener = () => loadVoices();
    ttsSynth.addEventListener('voiceschanged', voicesChangeListener);
}
```

**Step 4: Handle Speech Synthesis API unavailable**
- If ttsSynth is null or undefined:
  - Show "Speech Synthesis unavailable" message
  - Disable voice selector and related TTS buttons
  - Show clear explanation

### Files to Modify
- `js/core.js`: loadVoices(), voiceSelect initialization

### Tests to Add/Update
- `tests/tts_lang_voice_mismatch_browser.py`: add voice loading tests
- Test empty list → retry → success
- Test empty list → all retries fail → fallback UI
- Test late voice arrival via voiceschanged
- Test Speech Synthesis API unavailable

### Risk Level
- **Normal** - isolated to voice module
- **No data loss** - existing voice choices preserved
- **Backward compatible** - fallback only triggers on empty list

---

## Issue 3: AI Request Text Loss on Missing Config

### Root Cause Analysis
**File:** `js/main.js`, line 108

**Problem Code:**
```javascript
els.askSendBtn.onclick = () => { 
    const q = els.askInput.value.trim(); 
    if(q) { 
        stopDictation(); 
        els.askInput.value = "";  // ← Clears BEFORE validating AI config!
        startAiTask(state.lastAskContext || q, 'ask', q); 
    } 
};
```

**Why it happens:**
- Input is cleared unconditionally before `startAiTask()` validation
- If AI key/provider missing, `startAiTask()` shows toast and returns
- User's text already cleared → user loses their input

### Implementation Plan

**Step 1: Check AI availability before clearing**
- Move AI config check BEFORE clearing input
- Call `aiAvailable()` function from `ai-client.js` to verify:
  - AI provider is set (state.activeAiProvider)
  - API key present for that provider
  - Provider is actually available

**Step 2: Handle missing config**
```javascript
els.askSendBtn.onclick = () => {
    const q = els.askInput.value.trim();
    if(!q) return;
    
    // CHECK FIRST - before modifying input
    if (!aiAvailable()) {
        showToast(t('needKey'));
        els.askInput.focus();  // Return focus to field
        return;
    }
    
    // THEN clear and process
    stopDictation();
    els.askInput.value = "";
    startAiTask(state.lastAskContext || q, 'ask', q);
};
```

**Step 3: Verify other AI entry points**
- Quick Wheel "Ask AI" button: js/quick-wheel.js
- Grammar/Language Level: js/grammar-svo.js
- Any other places that call startAiTask()
- Ensure consistent validation across ALL paths

### Files to Modify
- `js/main.js`: askSendBtn onclick handler
- `js/grammar-svo.js`: verify Ask AI/Grammar handlers
- `js/quick-wheel.js`: verify Ask AI button handler

### Tests to Add/Update
- Test: No config → message shown, input preserved, focus returned
- Test: Config present → input cleared, task started
- Test: Multiple AI entry points all validated consistently

### Risk Level
- **Normal** - isolated one-line fix in three places
- **No data loss** - only prevents loss
- **UX improvement** - better error handling

---

## Issue 4: Print Text Duplication from Nested Elements

### Root Cause Analysis
**File:** `js/quick-wheel.js`, lines 394-399

**Problem Code:**
```javascript
let content = '';
for (const node of els.pages.querySelectorAll('*')) {
    const rect = node.getBoundingClientRect();
    const relLeft = rect.left + window.scrollX - els.pages.getBoundingClientRect().left;
    if (relLeft >= columnStart && relLeft < columnStart + columnWidth) {
        if (node.textContent) content += node.textContent + '\n';  // ← Adds EVERY element!
    }
}
```

**Why it happens:**
- For HTML: `<div><p><span>Text</span></p></div>`
- Iterates all 3 elements and adds:
  - div.textContent = "Text\n"
  - p.textContent = "Text\n"  
  - span.textContent = "Text\n"
- Result: "Text" printed 3 times

### Implementation Plan

**Step 1: Use only leaf nodes (elements with no children)**
```javascript
function getPrintableText() {
    const content = [];
    const columnStart = state.pageInChapter * columnStep?.() ?? state.pageInChapter * 400;
    const columnWidth = els.pages.clientWidth || 400;
    
    // Get all text nodes (not element nodes)
    const walker = document.createTreeWalker(
        els.pages,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    let textNode;
    while (textNode = walker.nextNode()) {
        if (textNode.data.trim().length === 0) continue;  // Skip whitespace
        
        const rect = textNode.parentElement.getBoundingClientRect();
        const relLeft = rect.left + window.scrollX - els.pages.getBoundingClientRect().left;
        
        if (relLeft >= columnStart && relLeft < columnStart + columnWidth) {
            content.push(textNode.data);
        }
    }
    
    return content.join('\n');
}
```

**Step 2: Update print function**
```javascript
let content = getPrintableText() || els.pages.textContent;
container.textContent = content;
```

### Files to Modify
- `js/quick-wheel.js`: printCurrentReaderPage() function

### Tests to Add
- Test nested HTML: `<div><p><span>Text</span></p></div>` → "Text" appears once
- Test multiple paragraphs: each should appear once
- Test with formatting elements: hidden UI elements should be excluded
- Test PDF printing still works (separate code path - should not be affected)

### Risk Level
- **Small** - isolated to print feature
- **No API changes** - internal function only
- **Backward compatible** - only fixes duplication

---

## Issue 5: Quick Wheel Keyboard Navigation & Focus Alignment

### Root Cause Analysis
**File:** `js/quick-wheel.js` (lines unclear - need to read wheel logic)

**Problem:** When wheel opens:
- Visual center action shows as "active"
- BUT keyboard focus goes to first available button "Open"
- Pressing Enter triggers "Open", not visual active action
- Arrow keys navigate among visible buttons
- No guaranteed sync between visual active and keyboard active

### Implementation Plan

**Phase 1: Understand Current Code**
- Find `allActions` array - how many actions? (user mentions removing hardcoded 11/12)
- Find where visual "active" is set (class 'active'? attribute?)
- Find where keyboard focus is handled (tabindex? manual focus?)
- Find arrow key/Enter/Escape handlers

**Phase 2: Refactor Navigation Logic**
```javascript
// Get dynamic action count (not hardcoded)
const totalActions = allActions.length;  // Instead of 11 or 12

// Track both visual and keyboard state together
let activeActionIndex = /* center action */;

function setActiveAction(index) {
    if (index < 0 || index >= totalActions) return;
    if (allActions[index].hidden || allActions[index].disabled) {
        return setActiveAction(index + (index > activeActionIndex ? 1 : -1));
    }
    activeActionIndex = index;
    updateVisualActiveClass(index);
    focusActionAtIndex(index);
}

function focusActionAtIndex(index) {
    const action = allActions[index];
    action.button.focus();
    action.button.classList.add('focused');  // Visual indicator
}
```

**Phase 3: Handle All Navigation**
- **Arrow Left/Right**: Move to next/prev non-disabled action
- **Home**: Jump to first non-disabled action  
- **End**: Jump to last non-disabled action
- **Tab/Shift+Tab**: Move next/prev, wrapping
- **Enter/Space**: Trigger action at activeActionIndex
- **Escape**: Close wheel, focus original opener button
- **Wheel open**: Focus center action, not first button

**Phase 4: Handle Edge Cases**
- All actions disabled → don't center on any
- Some actions hidden → skip when navigating
- Orientation change → recalculate positions
- Mouse navigation → sync with keyboard state

### Files to Modify
- `js/quick-wheel.js`: All navigation and focus logic

### Tests to Add
- Test: Wheel opens → focus = visual active action
- Test: Arrow Left/Right → navigate between non-disabled actions
- Test: Home/End → jump to first/last non-disabled
- Test: Tab/Shift+Tab → wrap around
- Test: Skip disabled actions in all navigation
- Test: Enter → trigger visual active action
- Test: Escape → close, return focus to opener
- Test: Don't allow centering on disabled action

### Risk Level
- **High** - complex state management, cross-module interactions
- **Requires full regression**: pdf_ux_browser.py + learning_ux_browser.py
- **Multiple refactorings**: touch/drag/wheel interactions unchanged

---

## Testing Strategy for All 5 Issues

### Local Testing (before push)
```bash
# Syntax check all modified files
node --check js/core.js js/main.js js/quick-wheel.js

# Run targeted tests
python3 tests/migration_audit_browser.py  # For issue 1
python3 tests/tts_lang_voice_mismatch_browser.py  # For issue 2
python3 tests/learning_ux_browser.py  # For issues 3, 5
python3 tests/pdf_ux_browser.py  # For issues 4, 5

# Full suite if high-risk changes made
```

### CI Testing
- GitHub Actions will run full test suite
- Watch for failures in:
  - app_shell_versions.py (if JS hashes change)
  - pdf_ux_browser.py (print changes)
  - learning_ux_browser.py (stats, Quick Wheel changes)
  - migration_audit_browser.py (AI availability check)

### Production Verification
- Visit https://ai-ebook-reader.pages.dev
- Test each fix manually:
  1. Stats page should show "Reading help" not "Reading comprehension"
  2. Voice selector should load voices or show fallback
  3. Enter AI query without key → message, focus returned, input preserved
  4. Print HTML page → no duplicate text
  5. Quick Wheel → keyboard navigation matches visual active action

---

## Next Steps

1. ✅ PR #104 CI running - wait for completion
2. If CI green: merge PR #104
3. Start Issue #2 (voice loading) - Medium effort
4. Test issue #2 thoroughly - voice loading is flaky in real world
5. Continue issues 3-5 in priority order
6. Full regression test after all 5 complete
7. Merge to main, verify production

## Commit Message Template

For each issue fix:
```
fix: P1 issue [N/5] - [brief title]

[Description of root cause]

Files changed:
- js/[file].js: [specific changes]

Tests:
- [test file]: [test names added]

Fixes: [user's description]

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

---

**Document Version**: 1.0  
**Created**: 2026-09-13  
**Status**: Initial analysis complete, implementation ready
