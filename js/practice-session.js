/* practice-session.js — Practice Studio session management.
 * Manages practice worksheet generation, validation, persistence, and state.
 * Follows async task cancellation pattern to prevent stale responses.
 */

const PRACTICE_SESSION_PREFIX = 'practice_session:';
const PRACTICE_SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours
const ALLOWED_EXERCISE_TYPES = new Set([
    'fill_form', 'auxiliary', 'conjugation', 'transform',
    'correct_error', 'translate', 'short_production', 'contextual_usage'
]);
const MAX_EXERCISES = 20;
const MIN_EXERCISES = 1;

// Current practice session (in memory)
let currentPracticeSession = null;

// Generate unique session ID
function generateSessionId() {
    return 'ps_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Create new practice session from context
function createPracticeSession(context) {
    return {
        id: generateSessionId(),
        status: 'generating', // 'generating' | 'ready' | 'error'
        createdAt: Date.now(),
        updatedAt: Date.now(),

        // Learning context
        sourceLanguage: context.sourceLanguage || 'en',
        targetLanguage: context.targetLanguage || state.targetLang || 'uk',
        bookId: context.bookId,
        sourceText: context.sourceText || '',
        sourceContext: context.sourceContext || '',
        level: context.level || 'unknown',

        // Worksheet
        worksheet: null,
        currentPage: 0,

        // Error handling
        lastError: null
    };
}

// Validate worksheet structure before rendering
function validateWorksheet(data) {
    // Check top-level structure
    if (!data || typeof data !== 'object') throw new Error('Invalid worksheet: not an object');

    // Check metadata
    const metadata = data.metadata || {};
    if (!metadata.title || typeof metadata.title !== 'string' || metadata.title.length === 0) {
        throw new Error('Invalid worksheet: missing or empty title');
    }
    if (!metadata.topic || typeof metadata.topic !== 'string') {
        throw new Error('Invalid worksheet: missing or empty topic');
    }
    if (!metadata.sourceLanguage || !metadata.targetLanguage) {
        throw new Error('Invalid worksheet: missing source/target language');
    }

    // Check exercises array
    if (!Array.isArray(data.exercises) || data.exercises.length === 0) {
        throw new Error('Invalid worksheet: exercises must be nonempty array');
    }

    if (data.exercises.length > MAX_EXERCISES) {
        throw new Error(`Invalid worksheet: too many exercises (${data.exercises.length} > ${MAX_EXERCISES})`);
    }

    // Validate each exercise
    const seenIds = new Set();
    data.exercises.forEach((ex, idx) => {
        if (!ex.id || typeof ex.id !== 'string' || ex.id.length === 0) {
            throw new Error(`Invalid worksheet: exercise ${idx} has missing/empty ID`);
        }
        if (seenIds.has(ex.id)) {
            throw new Error(`Invalid worksheet: duplicate exercise ID "${ex.id}"`);
        }
        seenIds.add(ex.id);

        if (!ALLOWED_EXERCISE_TYPES.has(ex.type)) {
            throw new Error(`Invalid worksheet: exercise ${idx} has unsupported type "${ex.type}"`);
        }

        if (!ex.instruction || typeof ex.instruction !== 'string' || ex.instruction.length === 0) {
            throw new Error(`Invalid worksheet: exercise ${ex.id} has missing instruction`);
        }

        if (!ex.prompt || typeof ex.prompt !== 'string') {
            throw new Error(`Invalid worksheet: exercise ${ex.id} has missing prompt`);
        }

        if (!ex.expectedConcept || typeof ex.expectedConcept !== 'string') {
            throw new Error(`Invalid worksheet: exercise ${ex.id} has missing expectedConcept`);
        }

        if (typeof ex.difficulty !== 'number' || ex.difficulty < 1 || ex.difficulty > 5) {
            throw new Error(`Invalid worksheet: exercise ${ex.id} has invalid difficulty`);
        }

        // Content safety: no HTML/script tags
        const contentFields = [ex.instruction, ex.prompt, ex.expectedConcept];
        contentFields.forEach(field => {
            if (/<script|<iframe|on\w+\s*=/i.test(field)) {
                throw new Error(`Invalid worksheet: exercise ${ex.id} contains suspicious content`);
            }
        });
    });

    return data;
}

// Parse AI response and validate
function parseAndValidateWorksheet(rawResponse) {
    let text = String(rawResponse || '').trim();

    // Remove markdown fences if present
    text = text.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
    text = text.trim();

    // Parse JSON
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        throw new Error(`Failed to parse AI response as JSON: ${e.message}`);
    }

    // Validate against schema
    return validateWorksheet(data);
}

// Save session to localStorage
function persistPracticeSession(session) {
    try {
        localStorage.setItem(
            PRACTICE_SESSION_PREFIX + session.id,
            JSON.stringify(session)
        );
    } catch (e) {
        console.warn('Failed to persist practice session:', e.message);
    }
}

// Load session from localStorage
function loadPracticeSession(sessionId) {
    try {
        const key = PRACTICE_SESSION_PREFIX + sessionId;
        const json = localStorage.getItem(key);
        if (!json) return null;

        const session = JSON.parse(json);

        // Check TTL
        if (Date.now() - session.createdAt > PRACTICE_SESSION_TTL) {
            localStorage.removeItem(key);
            return null;
        }

        return session;
    } catch (e) {
        console.warn('Failed to load practice session:', e.message);
        return null;
    }
}

// Delete session from localStorage
function deletePracticeSession(sessionId) {
    try {
        localStorage.removeItem(PRACTICE_SESSION_PREFIX + sessionId);
    } catch (e) {
        console.warn('Failed to delete practice session:', e.message);
    }
}

// Generate practice worksheet via AI
async function generatePracticeWorksheet(context) {
    // Create new session
    const session = createPracticeSession(context);
    currentPracticeSession = session;

    // Begin async task with cancellation support
    const task = beginAsyncTask('practice');

    // Persist initial state
    persistPracticeSession(session);

    try {
        // Build prompt with bounded context
        const langName = LANG_NAMES[session.targetLanguage] || 'Ukrainian';
        const prompt = buildPracticePrompt(session, langName);

        // Call active AI provider
        const response = await callAI(prompt, task.signal, 'practice');

        // Check if task is still current (stale response guard)
        if (!task.current()) {
            console.info('Practice generation cancelled (stale response)');
            return null;
        }

        // Parse and validate AI response
        const worksheet = parseAndValidateWorksheet(response);

        // Update session with validated worksheet
        session.worksheet = worksheet;
        session.status = 'ready';
        session.updatedAt = Date.now();

        // Persist ready state
        persistPracticeSession(session);

        // Update current session
        currentPracticeSession = session;

        return session;

    } catch (err) {
        // Check if task is still current
        if (!task.current()) {
            console.info('Practice generation error on stale task (ignoring)');
            return null;
        }

        // Real error - update session with error state
        session.status = 'error';
        session.lastError = {
            message: err.message,
            code: err.name || 'GenerationError',
            timestamp: Date.now()
        };
        session.updatedAt = Date.now();

        // Persist error state
        persistPracticeSession(session);

        // Update current session
        currentPracticeSession = session;

        throw err; // Caller handles error display
    }
}

// Build practice generation prompt
function buildPracticePrompt(session, langName) {
    const basePrompt = `You are a language learning expert creating a structured practice worksheet.

Target language: ${langName}
Level: ${session.level}
Context: "${session.sourceText}"

Generate 15 practice exercises for teaching the key concepts from the context above.
Exercises should progress from recognition (easier) to production (harder).

Return ONLY valid JSON (no markdown, no explanation).

Worksheet schema:
{
  "metadata": {
    "title": "Worksheet title based on topic",
    "topic": "The specific learning goal",
    "sourceLanguage": "${session.sourceLanguage}",
    "targetLanguage": "${session.targetLanguage}",
    "level": "${session.level}",
    "generatedAt": ${Date.now()}
  },
  "context": {
    "sourceText": "${session.sourceText.substring(0, 100)}"
  },
  "exercises": [
    {
      "id": "ex1",
      "type": "fill_form",
      "instruction": "Fill in the blank with the correct form",
      "prompt": "I ___ (go) to school yesterday",
      "expectedConcept": "past tense, first person singular",
      "difficulty": 1
    }
  ]
}

Exercise types allowed: fill_form, auxiliary, conjugation, transform, correct_error, translate, short_production, contextual_usage

Requirements:
- Exactly 15 exercises
- All IDs must be unique (ex1, ex2, ..., ex15)
- All types must be from the allowed list above
- Difficulty should progress 1 (easy) → 5 (hard)
- Each exercise should teach/reinforce concepts from the context
- All string fields must be nonempty
- No HTML, scripts, or code in any field
- Return valid JSON only`;

    return basePrompt;
}

// Retry generation for current session
async function retryPracticeGeneration() {
    if (!currentPracticeSession) {
        throw new Error('No practice session to retry');
    }

    // Create fresh session with same context
    const context = {
        sourceLanguage: currentPracticeSession.sourceLanguage,
        targetLanguage: currentPracticeSession.targetLanguage,
        bookId: currentPracticeSession.bookId,
        sourceText: currentPracticeSession.sourceText,
        sourceContext: currentPracticeSession.sourceContext,
        level: currentPracticeSession.level
    };

    // Delete old session if generation succeeds
    const oldSessionId = currentPracticeSession.id;

    try {
        const newSession = await generatePracticeWorksheet(context);
        if (newSession) {
            deletePracticeSession(oldSessionId);
        }
        return newSession;
    } catch (err) {
        // Keep old session on error, throw to caller
        throw err;
    }
}

// Regenerate worksheet (create entirely new session)
async function regeneratePracticeWorksheet(context) {
    // Keep old session ID for cleanup after new generation
    const oldSessionId = currentPracticeSession?.id;

    try {
        const newSession = await generatePracticeWorksheet(context);
        if (newSession && oldSessionId) {
            deletePracticeSession(oldSessionId);
        }
        return newSession;
    } catch (err) {
        // Keep old session on error
        throw err;
    }
}

// Close practice session
function closePracticeSession() {
    if (currentPracticeSession) {
        deletePracticeSession(currentPracticeSession.id);
        currentPracticeSession = null;
    }
}

// Get current practice session
function getCurrentPracticeSession() {
    return currentPracticeSession;
}

// Restore practice session from localStorage by ID
function restorePracticeSession(sessionId) {
    const session = loadPracticeSession(sessionId);
    if (session) {
        currentPracticeSession = session;
    }
    return session;
}

// Clean up expired sessions from localStorage
function cleanupExpiredPracticeSessions() {
    try {
        const now = Date.now();
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(PRACTICE_SESSION_PREFIX)) {
                try {
                    const json = localStorage.getItem(key);
                    const session = JSON.parse(json);
                    if (now - session.createdAt > PRACTICE_SESSION_TTL) {
                        localStorage.removeItem(key);
                    }
                } catch (e) {
                    // Corrupted entry, remove it
                    localStorage.removeItem(key);
                }
            }
        });
    } catch (e) {
        console.warn('Cleanup of expired practice sessions failed:', e.message);
    }
}

// On app startup, clean up old sessions
document.addEventListener('DOMContentLoaded', () => {
    cleanupExpiredPracticeSessions();
});
