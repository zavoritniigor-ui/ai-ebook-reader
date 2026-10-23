# Phase 2 Test Plan — User Work Preservation and Correct Printing

## Overview
Phase 2 implements 5 critical fixes after Phase 1. All changes verified locally, committed to main branch f2883af.

## Issues Fixed

### Issue #1: Real Undo for PDF Ink ✅ IMPLEMENTED
**File**: `js/pdf-ink.js`
**Risk**: HIGH (affects PDF state persistence)

**Root Cause**: Undo button just called `.pop()` without tracking operation type. After erasing, Undo removed wrong stroke.

**Implementation**:
- Added `inkHistory` and `inkRedoStack` per-page operation histories
- Track 3 operation types: `draw` (add stroke), `erase` (remove stroke), `clear` (clear page)
- Each operation stores enough info to reverse it
- Bounded history to 50 operations per page
- Improved eraser to check distance to line segments (not just points)

**Test Cases**:
```
1. Draw A → Draw B → Erase A → Undo
   Expected: A+B visible (A restored)
   
2. Draw → Clear → Undo
   Expected: Original stroke restored
   
3. Draw A (long) → Erase middle with point far from endpoints
   Expected: Segment distance check makes erase work
   
4. Zoom PDF → Draw → Zoom back → Undo
   Expected: Stroke restored at correct relative position
```

---

### Issue #2: Don't Leave AI Panel in Infinite Loading State ✅ IMPLEMENTED
**File**: `js/grammar-svo.js`, `js/pdf-crop.js`
**Risk**: NORMAL (isolated to AI module)

**Root Cause**: 
- `if (!task.current()) return;` on line 81 didn't remove loading class
- Duplicate error checks in catch block
- No error message or retry option shown

**Implementation**:
- Always remove loading class when task cancelled
- Show "Request cancelled" message
- Add Retry button with context preserved
- Properly distinguish cancelled vs error scenarios
- Store context in `window.lastAiRetryContext` for retry

**Test Cases**:
```
1. Request → cancel mid-flight → spinner gone
   Expected: "Request cancelled" shown, no spinner
   
2. Old request completes after new one started
   Expected: Old result doesn't overwrite new
   
3. Navigate to background during request
   Expected: Panel shows clear end state, not spinner
   
4. Click Retry button
   Expected: New request with same context
```

---

### Issue #3: Save PDF Crop After AI Error ✅ IMPLEMENTED
**File**: `js/pdf-crop.js`
**Risk**: NORMAL (isolated to crop module)

**Root Cause**: `closeCropPreview()` called before AI check. No key? Preview lost.

**Implementation**:
- Check `aiAvailable()` before closing preview
- Pass `closePreviewOnSuccess=false` from crop-ai button
- Only close preview AFTER successful AI response
- Add Retry button on error
- Preserve crop data for retry attempts

**Test Cases**:
```
1. Crop → AI without key
   Expected: preview+blob preserved, "needKey" shown, can retry
   
2. Crop → offline → wait for connection → Retry
   Expected: Crop still there, request can proceed
   
3. Crop → Cancel AI request
   Expected: Preview shows "cancelled", can try different action
   
4. Crop → AI succeeds
   Expected: Preview closes, response shown
```

---

### Issue #4: Print PDF with Handwritten Marks ✅ IMPLEMENTED
**File**: `js/quick-wheel.js`
**Risk**: HIGH (affects PDF rendering)

**Root Cause**: PDF print rendered page but didn't include ink canvas overlay.

**Implementation**:
- After rendering PDF page to canvas
- Check if ink exists for this page
- Scale and overlay ink canvas on top of PDF canvas
- Preserves colors and stroke thickness
- Works with zoom (scales ink proportionally)

**Test Cases**:
```
1. PDF without ink → Print
   Expected: Clean PDF output, no extra layer
   
2. PDF + one stroke → Print
   Expected: Stroke visible in print output
   
3. PDF + colored strokes → Print
   Expected: Colors preserved in output
   
4. Zoom PDF, draw, print
   Expected: Ink coordinates correct after zoom
   
5. Verify no duplicate canvas in output
   Expected: Single canvas, not ink+PDF+ink
```

---

### Issue #5: Fix Printing of Current Text Page ✅ IMPLEMENTED
**File**: `js/quick-wheel.js`
**Risk**: NORMAL (print module only)

**Root Cause**: TreeWalker used (Phase 1 fix good), but `|| els.pages.textContent` fallback could print entire book.

**Implementation**:
- Remove dangerous textContent fallback
- Print empty page if column has no content
- Use TreeWalker with column boundary filtering
- No unintended full-document fallback

**Test Cases**:
```
1. Nested p, span, strong, em
   Expected: No duplication, clean text
   
2. Long paragraph crossing 3 columns
   Expected: Only current column printed
   
3. Empty column
   Expected: Blank page (not whole book)
   
4. PDF + text switch
   Expected: PDF print unchanged, text print correct
```

---

## Testing Strategy

### Local Syntax Check
```bash
node --check js/pdf-ink.js
node --check js/grammar-svo.js  
node --check js/pdf-crop.js
node --check js/quick-wheel.js
python3 tests/app_shell_versions.py
```

### Required Test Suites (HIGH-RISK changes)
- `python3 tests/pdf_ux_browser.py` — PDF zoom/ink/crop/print
- `python3 tests/learning_ux_browser.py` — Learning features (cross-check for AI)

### Manual Testing on Production
1. Open PDF in production
2. Draw several strokes, test Undo/Erase
3. Clear page, Undo restore
4. Request AI (missing key) — should show retry
5. Crop exercise, AI unavailable → Retry
6. Print PDF with marks visible
7. Switch to text, verify empty column doesn't print whole book
8. Test at different zoom levels

---

## Verification Checklist

- [ ] All 5 fixes implemented
- [ ] Syntax check passed
- [ ] App shell versioning updated
- [ ] Commit on main (f2883af)
- [ ] CI pipeline passes
- [ ] pdf_ux_browser.py passes (HIGH-RISK)
- [ ] learning_ux_browser.py passes (HIGH-RISK)
- [ ] Production verification: https://ai-ebook-reader.pages.dev
- [ ] Manual test matrix completed
- [ ] No API keys/crop data/text in logs
- [ ] Handoff.md updated with Phase 2 status

---

## Known Limitations

1. **Ink History**: Limited to 50 operations per page (memory bound)
2. **Print Colors**: Depends on browser print settings (user control)
3. **Segment Distance**: Uses simple Euclidean distance (not perfect for curves)
4. **Retry**: Context preserved in session only (not across page reload)
5. **PDF Scale**: Ink scaling assumes linear relationship (works for reasonable zoom levels)

---

## Files Modified

- `js/pdf-ink.js` — Undo system, eraser improvement
- `js/grammar-svo.js` — AI loading state, error handling
- `js/pdf-crop.js` — Crop preview, error recovery
- `js/quick-wheel.js` — PDF print with ink, text print fix
- `index.html`, `sw.js` — Auto-regenerated versioning

---

## Next Phase

Phase 3: Accessibility improvements and mobile gesture fixes.

---

**Status**: Ready for CI/testing
**Commit**: f2883af
**Date**: 2026-09-13
