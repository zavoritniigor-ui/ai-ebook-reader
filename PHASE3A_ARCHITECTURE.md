# Phase 3A: Practice Studio Foundation — Architecture

## Overview

Practice Studio generates structured AI-driven worksheets for grammar learning contexts. User selects text, opens Practice, AI generates validated worksheet data, app renders it safely.

## Data Models

### Worksheet Schema

```typescript
interface Worksheet {
  metadata: {
    id: string;           // UUID or unique ID
    title: string;        // "Past Tense Verbs in Ukrainian"
    topic: string;        // learning objective
    sourceLanguage: string;  // "en"
    targetLanguage: string;  // "uk"
    level: string;        // CEFR: A1, A2, B1, B2, C1, C2
    generatedAt: number;  // timestamp
  };
  context: {
    sourceText?: string;  // original sentence/context
    sourceBook?: string;  // book title if available
  };
  exercises: Exercise[];
  statistics: {
    totalExercises: number;
    exerciseTypes: Record<ExerciseType, number>;
  };
}

type ExerciseType = 
  | "fill_form"          // fill blank: "I ___ (go) to school"
  | "auxiliary"          // select auxiliary: "She ___ been here"
  | "conjugation"        // conjugate verb
  | "transform"          // transform sentence structure
  | "correct_error"      // find and fix error
  | "translate"          // translate sentence
  | "short_production"   // write short answer
  | "contextual_usage";  // use word in context

interface Exercise {
  id: string;            // "ex1", "ex2", etc. (nonempty)
  type: ExerciseType;
  instruction: string;   // "Fill in the correct verb form"
  prompt: string;        // "I ___ (to go) yesterday"
  expectedConcept: string; // "past tense, first person"
  difficulty: number;    // 1–5
  hints?: string[];      // optional hints (Phase 3B+)
}

interface PracticeSession {
  id: string;                    // unique session ID
  status: "generating" | "ready" | "error";
  createdAt: number;
  updatedAt: number;
  
  // Learning context
  sourceLanguage: string;
  targetLanguage: string;
  bookId?: string;
  sourceText?: string;           // selected text or grammar sentence
  sourceContext?: string;        // surrounding context (bounded)
  level?: string;                // detected or user's CEFR level
  
  // Worksheet
  worksheet?: Worksheet;
  currentPage: number;           // 0-based, for multi-page worksheets
  
  // Error handling
  lastError?: {
    message: string;
    code: string;
    timestamp: number;
  };
  
  // Reserved for future phases
  // ink?: [];               // Phase 3B - handwriting capture
  // answers?: [];           // Phase 3C - user responses
  // grading?: {};           // Phase 3C - AI grading
  // corrections?: [];       // Phase 3D - corrections
  // mistakes?: [];          // Phase 3E - spaced repetition
}
```

## AI Integration

### Prompt Structure

```javascript
// Build bounded prompt for current context
const practicePrompt = `
You are a language learning expert creating a structured worksheet.

Target language: Ukrainian
Context: "${sourceText}"
Level: A1 (complete beginner)
Topic: Past tense verbs

Generate exactly 15 practice exercises.
Return ONLY valid JSON (no markdown, no explanation).

Schema:
{
  "title": "string",
  "topic": "string",
  "exercises": [
    {
      "id": "ex1",
      "type": "fill_form|auxiliary|conjugation|...",
      "instruction": "string",
      "prompt": "string",
      "expectedConcept": "string",
      "difficulty": 1–5
    }
  ]
}

Ensure:
- All exercise IDs are unique and nonempty
- All types are from allowed list
- Max 20 exercises
- Exercise count matches stated number
- Difficulty progresses 1→5
`;
```

### Response Parsing

1. Receive response from active AI provider
2. Remove markdown fences if present (`\`\`\`json` ... `\`\`\``)
3. JSON.parse()
4. Validate against schema:
   - Check metadata fields exist
   - Check exercises array
   - Validate each exercise:
     - id: nonempty string, unique
     - type: must be in allowed list
     - instruction, prompt, expectedConcept: nonempty strings
     - difficulty: 1–5
   - Reject if >20 exercises
   - Reject if title/topic missing
5. If valid: return parsed Worksheet
6. If invalid: throw ValidationError with specific reason

## UI Architecture

### Practice Studio Panel

Location: Dedicated panel (similar to Grammar/Ask panels)

Entry points:
- "Practice" button in Grammar panel (after grammar sentence)
- "Practice" button in Ask panel (after learning context)
- Potentially "Practice" from selected text in reader

Layout:
```
┌─────────────────────────────────────┐
│ ← Back  | Practice: Past Tense     │
├─────────────────────────────────────┤
│ Source: I went to school yesterday  │
│ Level: A1 | Exercises: 15           │
├─────────────────────────────────────┤
│  [Worksheet Page 1]                 │
│  ┌───────────────────────────────┐  │
│  │ 1. I ___ (go) yesterday       │  │
│  │    _____________________      │  │
│  │                               │  │
│  │ 2. She ___ been here          │  │
│  │    _____________________      │  │
│  │ ... (more exercises)          │  │
│  └───────────────────────────────┘  │
├─────────────────────────────────────┤
│ Page 1/1  [Retry] [Regenerate]     │
│ [Check with AI] (disabled/planned)  │
└─────────────────────────────────────┘
```

### Rendering Strategies

For 1–2 page worksheets:
- Card-based layout on mobile
- A4-like page layout on tablet/desktop
- Clear exercise numbers
- Generous answer space (lines or boxes)
- Responsive typography

Do NOT require PDF generation.

## Persistence

### LocalStorage Strategy

Key: `practice_session:${sessionId}`

```javascript
localStorage.setItem(
  `practice_session:${sessionId}`,
  JSON.stringify(practiceSession)
);
```

On app reload:
1. Check if valid practice session exists in localStorage
2. If valid: restore to Practice panel (status "ready" or "error")
3. If invalid/expired: clear

Session lifecycle:
- Created when Practice opens
- Updated when worksheet generated
- Cleared when user closes Practice or starts new session
- Auto-cleanup: sessions >24h old

## Stale Request Protection

Follow the same pattern as recent AI fixes (Phase 2):

```javascript
async function generatePracticeWorksheet(session, signal) {
  const task = beginAsyncTask('practice');
  
  session.status = 'generating';
  updatePersistence(session);
  
  try {
    const worksheet = await callAI(prompt, signal, 'practice');
    
    // Check if task is still current
    if (!task.current()) {
      // Stale response - silently return without updating UI
      return;
    }
    
    // Validate
    const validated = validateWorksheet(worksheet);
    
    // Update session
    session.worksheet = validated;
    session.status = 'ready';
    updatePersistence(session);
    updateUI(session);
    
  } catch (err) {
    if (!task.current()) {
      // Stale error - don't update UI
      return;
    }
    
    // Real error - update session with error state
    session.status = 'error';
    session.lastError = { message: err.message, code: err.code };
    updatePersistence(session);
    updateUI(session);
  }
}
```

Cancellation points:
- User closes Practice panel
- User changes book
- User selects different context
- User switches AI provider
- New generation starts before old one completes

## Validation Rules

**Metadata:**
- title: nonempty string, <100 chars
- topic: nonempty string, <100 chars
- sourceLanguage: ISO 639-1 code (en, uk, fr, de, etc.)
- targetLanguage: ISO 639-1 code
- level: CEFR level (A1–C2) or unknown
- exercises: array

**Exercises:**
- Max 20 per worksheet
- ID must be unique within worksheet and nonempty
- Type must be in allowed list
- instruction, prompt, expectedConcept: nonempty strings
- difficulty: integer 1–5

**Content Safety:**
- No HTML/script tags in any string field
- No suspicious SQL or code injection patterns
- Reject if any field contains raw HTML elements

## Integration with Existing Systems

### Provider Architecture

Reuse existing `callAI()` with task='practice':

```javascript
const worksheet = await callAI(prompt, signal, 'practice');
```

- Respects active provider (OpenAI, Groq, Gemini)
- Uses existing error handling
- Respects aiAvailable() guard
- No hardcoding of provider
- Follows existing localization for errors

### Task/Cancellation

Reuse existing async task system:
```javascript
const task = beginAsyncTask('practice');
...
if (!task.current()) return; // stale response guard
```

### Error Handling

Show localized errors from existing `t()` function.

New keys needed:
- `practiceGenerating` - "Creating worksheet..."
- `practiceReady` - "Worksheet ready"
- `practiceError` - "Could not generate worksheet"
- `practiceRetry` - "Retry"
- `practiceRegenerate` - "Regenerate"
- `practiceCheckDisabled` - "Check with AI (coming soon)"

## Files to Create/Modify

**New files:**
- `js/practice-studio.js` - Main practice logic
- `js/practice-worksheet.js` - Worksheet rendering
- `js/practice-session.js` - Session management
- `tests/practice_browser.py` - Browser tests

**Modify:**
- `index.html` - Add practice panel
- `js/core.js` - Add practice session state
- `js/grammar-svo.js` - Add Practice button
- `js/learning-context.js` or equivalent - Add Practice entry point
- `ARCHITECTURE.md` - Document practice studio

**No changes to:**
- PDF/EPUB/TXT reader
- Grammar/Ask AI panels
- Translation
- TTS
- Provider architecture (reuse as-is)

## Testing Strategy

14 focused tests covering:

1. Practice entry from valid context ✓
2. AI receives bounded context
3. Valid worksheet renders
4. Model HTML cannot execute
5. Invalid JSON shows error
6. Unsupported type rejected
7. Exercise count bounded
8. Retry works
9. Stale responses don't overwrite
10. Provider switch cancels
11. Session persists
12. Closing doesn't corrupt reader
13. Grammar/Ask still work
14. Reader state unchanged

## Success Criteria

Phase 3A is complete when:

- ✓ Practice launches from learning context
- ✓ Worksheet data is structured/validated
- ✓ 1–2 page UI renders correctly
- ✓ 12–20 exercises representable
- ✓ Supported types work
- ✓ No arbitrary AI HTML injected
- ✓ Provider architecture reused
- ✓ Stale responses protected
- ✓ Session persists locally
- ✓ Retry/Regenerate work
- ✓ "Check with AI" reserved/disabled
- ✓ Tests pass
- ✓ Regressions pass
- ✓ App-shell versioned
- ✓ CI green
