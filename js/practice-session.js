/* practice-session.js — Practice Studio session management.
 * Manages practice worksheet generation, validation, persistence, and state.
 * Follows async task cancellation pattern to prevent stale responses.
 */

const PRACTICE_SESSION_PREFIX = 'practice_session:';
const PRACTICE_SESSION_LATEST_KEY = 'practice_session_latest_id';
const PRACTICE_SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours
const PRACTICE_SESSION_SCHEMA_VERSION = 2; // Version 2: A4 worksheet with source analysis
const ALLOWED_EXERCISE_TYPES = new Set([
    'fill_form', 'auxiliary', 'conjugation', 'transform',
    'correct_error', 'translate', 'short_production', 'contextual_usage'
]);
const MAX_EXERCISES = 30; // Increased for A4 density
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
        // Schema version for migration
        schemaVersion: PRACTICE_SESSION_SCHEMA_VERSION,

        id: generateSessionId(),
        status: 'generating', // 'generating' | 'ready' | 'error'
        createdAt: Date.now(),
        updatedAt: Date.now(),

        // Learning context
        sourceLanguage: context.sourceLanguage || null,
        targetLanguage: context.targetLanguage || null,
        bookId: context.bookId || null,
        sourceText: context.sourceText || null,
        sourceContext: context.sourceContext || null,
        level: context.level || null,

        // Source analysis: grammatical relationships and structures
        sourceAnalysis: {
            language: context.targetLanguage || null,
            detectedStructures: [],  // [{structure: "past tense", count: 2, relevance: "high"}, ...]
            relationships: []  // [{entity: "filles", type: "noun", role: "subject", controls: ["agreement", "tense"]}, ...]
        },

        // Worksheet (A4 layout)
        worksheet: null,
        currentPage: 0,
        answerMode: 'handwriting', // 'handwriting' | 'keyboard' (Phase C)

        // Handwriting persistence (Phase C)
        handwritingStrokes: {},  // { "ex1": [stroke, stroke, ...], "ex2": [...] }

        // Keyboard answers (Phase C)
        keyboardAnswers: {},  // { "ex1": "user answer", ... }

        // Phase 3B: Track revealed hints per exercise (ex: { "ex1": 2, "ex2": 0 })
        revealedHints: {},

        // Phase 3C: Answer storage and feedback (ex: { "ex1": { answer: "went", feedback: "correct" } })
        answers: {},

        // Review/grading workflow (Phase C)
        reviewStatus: 'pending',  // 'pending' | 'submitted' | 'in_review' | 'graded'
        gradeResponse: null,  // { results: [...] } after AI review

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

        // Validate optional hints (Phase 3B)
        if (ex.hints !== undefined) {
            if (!Array.isArray(ex.hints)) {
                throw new Error(`Invalid worksheet: exercise ${ex.id} hints must be an array`);
            }
            if (ex.hints.length > 0) {
                // Hints are optional, but if provided must be strings with no HTML
                ex.hints.forEach((hint, hintIdx) => {
                    if (typeof hint !== 'string' || hint.length === 0) {
                        throw new Error(`Invalid worksheet: exercise ${ex.id} hint ${hintIdx} must be nonempty string`);
                    }
                    if (/<script|<iframe|on\w+\s*=/i.test(hint)) {
                        throw new Error(`Invalid worksheet: exercise ${ex.id} hint ${hintIdx} contains suspicious content`);
                    }
                });
                // Limit hints per exercise (3 progressive hints max)
                if (ex.hints.length > 3) {
                    throw new Error(`Invalid worksheet: exercise ${ex.id} has too many hints (max 3)`);
                }
            }
        }

        // Validate optional answer fields (Phase 3C)
        if (ex.expectedAnswer !== undefined) {
            if (typeof ex.expectedAnswer !== 'string' || ex.expectedAnswer.length === 0) {
                throw new Error(`Invalid worksheet: exercise ${ex.id} expectedAnswer must be nonempty string if provided`);
            }
        }
        if (ex.acceptedAnswers !== undefined) {
            if (!Array.isArray(ex.acceptedAnswers)) {
                throw new Error(`Invalid worksheet: exercise ${ex.id} acceptedAnswers must be an array`);
            }
            if (ex.acceptedAnswers.length > 0) {
                ex.acceptedAnswers.forEach((ans, idx) => {
                    if (typeof ans !== 'string' || ans.length === 0) {
                        throw new Error(`Invalid worksheet: exercise ${ex.id} acceptedAnswer ${idx} must be nonempty string`);
                    }
                });
                // Limit accepted answers (reasonable limit to prevent bloat)
                if (ex.acceptedAnswers.length > 10) {
                    throw new Error(`Invalid worksheet: exercise ${ex.id} has too many acceptedAnswers (max 10)`);
                }
            }
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

// Grade an answer locally for deterministic exercise types
// Returns { isCorrect: boolean, feedback: string, needsReview: boolean }
function gradeExerciseAnswer(exercise, userAnswer) {
    // Only grade exercises with deterministic answers
    if (!exercise.expectedAnswer) {
        return {
            isCorrect: null,
            feedback: 'This exercise requires review by a language expert.',
            needsReview: true
        };
    }

    // Normalize user answer: trim whitespace
    const normalized = (userAnswer || '').trim();

    // Empty answer
    if (normalized.length === 0) {
        return {
            isCorrect: false,
            feedback: 'Please provide an answer before checking.',
            needsReview: false
        };
    }

    // Build list of acceptable answers (lowercase for comparison, preserve diacritics)
    const acceptableAnswers = [exercise.expectedAnswer];
    if (exercise.acceptedAnswers && Array.isArray(exercise.acceptedAnswers)) {
        acceptableAnswers.push(...exercise.acceptedAnswers);
    }

    // Case-insensitive comparison (preserves diacritics/accents)
    const normalizedLower = normalized.toLowerCase();
    const isCorrect = acceptableAnswers.some(ans => ans.toLowerCase() === normalizedLower);

    if (isCorrect) {
        return {
            isCorrect: true,
            feedback: 'Correct! Well done.',
            needsReview: false
        };
    } else {
        // For fill_form and similar, show that it was incorrect but not the answer yet
        return {
            isCorrect: false,
            feedback: `Not quite. Try again or reveal a hint for guidance.`,
            needsReview: false
        };
    }
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
        // Track latest session ID for restoration on reload
        if (session.status === 'ready') {
            localStorage.setItem(PRACTICE_SESSION_LATEST_KEY, session.id);
        }
    } catch (e) {
        console.warn('Failed to persist practice session:', e.message);
    }
}

// Migrate old session schema to new version
function migrateSession(session) {
    // If schemaVersion is missing, it's a v1 session (Phase 3B/3C)
    if (!session.schemaVersion || session.schemaVersion < 2) {
        // Upgrade to schema v2 (A4 worksheet with source analysis)
        session.schemaVersion = 2;

        // Add new fields with safe defaults
        if (!session.sourceAnalysis) {
            session.sourceAnalysis = {
                language: session.targetLanguage || null,
                detectedStructures: [],
                relationships: []
            };
        }

        if (!session.answerMode) {
            session.answerMode = 'handwriting';
        }

        if (!session.handwritingStrokes) {
            session.handwritingStrokes = {};
        }

        if (!session.keyboardAnswers) {
            session.keyboardAnswers = {};
        }

        if (!session.reviewStatus) {
            session.reviewStatus = 'pending';
        }

        if (!session.gradeResponse) {
            session.gradeResponse = null;
        }
    }

    return session;
}

// Load session from localStorage
function loadPracticeSession(sessionId) {
    try {
        const key = PRACTICE_SESSION_PREFIX + sessionId;
        const json = localStorage.getItem(key);
        if (!json) return null;

        let session = JSON.parse(json);

        // Check TTL
        if (Date.now() - session.createdAt > PRACTICE_SESSION_TTL) {
            localStorage.removeItem(key);
            return null;
        }

        // Migrate if needed
        session = migrateSession(session);

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

    // Analyze source text for grammatical structures
    if (session.sourceText && session.targetLanguage) {
        session.sourceAnalysis = analyzeSourceGrammar(session.sourceText, session.targetLanguage);
    }

    // Begin async task with cancellation support
    const task = beginAsyncTask('practice');

    // Persist initial state
    persistPracticeSession(session);

    try {
        // Build prompt with bounded context (now includes source analysis)
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
            // Task became stale - update session to error state but do NOT overwrite current
            // (another newer session may have started; stale A must not replace active B)
            session.status = 'error';
            session.lastError = {
                message: 'Practice generation was cancelled (another request started)',
                code: 'StaleTaskError',
                timestamp: Date.now()
            };
            session.updatedAt = Date.now();

            // Persist stale error state (for the history), but only update currentPracticeSession
            // if this stale session is still the active one
            persistPracticeSession(session);

            // Only update the UI if this session is still current
            // If a newer session (B) started, don't overwrite it with stale A
            if (currentPracticeSession?.id === session.id) {
                currentPracticeSession = session;
            }

            // Return the session with error state (for the promise chain),
            // but UI update is controlled by the currentPracticeSession check above
            return session;
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

        // Update current session (this one is still current since task.current() passed)
        currentPracticeSession = session;

        throw err; // Caller handles error display
    }
}

// Analyze source text for grammatical structures and relationships
// This helps the AI generator create exercises grounded in the actual text
function analyzeSourceGrammar(sourceText, targetLanguage) {
    const analysis = {
        language: targetLanguage,
        detectedStructures: [],
        relationships: []
    };

    if (!sourceText || sourceText.length === 0) {
        return analysis;
    }

    const text = sourceText.toLowerCase();
    const words = sourceText.split(/\s+/);

    // Language-specific analysis patterns
    if (targetLanguage === 'fr') {
        // French: detect verbs, tenses, agreement patterns
        const frenchPastIndicators = /\b(était|ont|a|avez|avais|étaient)\b/gi;
        const frenchPresentContinuous = /\b(suis|es|est|sommes|êtes|sont)\s+\w+ing\b/gi;
        const frenchArticles = /\b(le|la|les|un|une|des|du)\b/gi;

        if (frenchPastIndicators.test(text)) {
            analysis.detectedStructures.push({
                structure: "past tense (passé composé, imparfait)",
                count: (text.match(frenchPastIndicators) || []).length,
                relevance: "high"
            });
        }

        if (frenchArticles.test(text)) {
            analysis.detectedStructures.push({
                structure: "articles and determiners",
                count: (text.match(frenchArticles) || []).length,
                relevance: "high"
            });
        }

        // Detect adjectives (often follow nouns in French)
        const commonAdjectives = /\b(ancien|nouvelle|petit|grand|joli|important|different)\b/gi;
        if (commonAdjectives.test(text)) {
            analysis.detectedStructures.push({
                structure: "adjective agreement (gender/number)",
                count: 1,
                relevance: "high"
            });
        }

        // Subject-verb relationships
        if (/\b(elle|il|ils|elles|je|tu|nous|vous|on)\s+\w+/gi.test(sourceText)) {
            analysis.detectedStructures.push({
                structure: "subject-verb agreement",
                count: 1,
                relevance: "high"
            });
        }

    } else if (targetLanguage === 'en') {
        // English: detect tense, auxiliaries, pronouns
        const englishPast = /\b(was|were|had|did|went|came|got|saw|heard)\b/gi;
        const englishPresent = /\b(is|are|has|have|does|do|go|come|see|hear)\b/gi;
        const englishAuxiliaries = /\b(is|are|was|were|have|has|had|do|does|did|can|could|will|would|shall|should|may|might|must)\b/gi;

        if (englishPast.test(text)) {
            analysis.detectedStructures.push({
                structure: "past tense",
                count: (text.match(englishPast) || []).length,
                relevance: "high"
            });
        }

        if (englishAuxiliaries.test(text)) {
            analysis.detectedStructures.push({
                structure: "auxiliaries (be, have, do, modals)",
                count: (text.match(englishAuxiliaries) || []).length,
                relevance: "high"
            });
        }

        // Pronouns
        const pronouns = /\b(I|you|he|she|it|we|they|me|him|her|us|them)\b/gi;
        if (pronouns.test(sourceText)) {
            analysis.detectedStructures.push({
                structure: "pronouns and subject-verb agreement",
                count: (sourceText.match(pronouns) || []).length / 2,
                relevance: "high"
            });
        }

    } else if (targetLanguage === 'uk') {
        // Ukrainian: detect aspect, tense, case
        const ukrainianPast = /\b(був|була|було|були|прийшов|пішла)\b/gi;
        const ukrainianImperfectiveAspect = /\b(робив|робила|робило|робили|читав|читала)\b/gi;

        if (ukrainianPast.test(text)) {
            analysis.detectedStructures.push({
                structure: "past tense and aspect",
                count: 1,
                relevance: "high"
            });
        }

        if (ukrainianImperfectiveAspect.test(text)) {
            analysis.detectedStructures.push({
                structure: "imperfective aspect",
                count: 1,
                relevance: "high"
            });
        }

        // Case and agreement (simplified)
        analysis.detectedStructures.push({
            structure: "case agreement and inflection",
            count: 1,
            relevance: "high"
        });
    }

    return analysis;
}

// Build practice generation prompt with language-specific guidance
function buildPracticePrompt(session, langName) {
    // Handle null/undefined values safely
    const safeSourceText = session.sourceText || '[no context provided]';
    const safeLangName = langName || '[unknown language]';
    const safeLevel = session.level || '[unknown level]';
    const safeSourceLang = session.sourceLanguage || 'unknown';
    const safeTargetLang = session.targetLanguage || 'unknown';

    // Language-specific grammar priorities
    let languageGuidance = '';
    if (safeTargetLang === 'uk') {
        languageGuidance = `
UKRAINIAN GRAMMAR PRIORITIES (when relevant to context):
- Verb aspect (perfective vs imperfective)
- Tense and mood
- Case agreement (nominative, genitive, dative, accusative, instrumental, locative, vocative)
- Gender and number agreement
- Prepositions with cases
- Aspect-based word choice
Focus on structural patterns unique to Ukrainian morphology and syntax.`;
    } else if (safeTargetLang === 'fr') {
        languageGuidance = `
FRENCH GRAMMAR PRIORITIES (when relevant to context):
- Conjugaison (tenses, moods, aspects)
- Temps verbaux (passé composé, imparfait, conditionnel, subjonctif)
- Accord sujet-verbe
- Accord adjectif-nom
- Articles (défini, indéfini, partitif)
- Pronoms (personnels, relatifs, possessifs)
- Prépositions
- Négation (ne...pas, ne...rien, etc.)
- Ordre des mots
- Auxiliaires (avoir, être)
- Accord du participe passé
Focus on French-specific morphological and syntactic patterns.`;
    } else if (safeTargetLang === 'en') {
        languageGuidance = `
ENGLISH GRAMMAR PRIORITIES (when relevant to context):
- Tense and aspect (simple/continuous/perfect)
- Auxiliaries (do, have, be, modal verbs)
- Subject-verb agreement
- Articles and determiners
- Prepositions
- Pronouns
- Word order (especially in questions and negation)
- Modals and conditionals
- Relative clauses
- Collocations and phrasal verbs
- Comparison structures
Focus only on English patterns that are pedagogically relevant to the selected context.`;
    }

    // Build detected structures summary for the prompt
    const detectedStructuresSummary = session.sourceAnalysis && session.sourceAnalysis.detectedStructures.length > 0
        ? `\nDETECTED GRAMMATICAL STRUCTURES IN SOURCE TEXT:
${session.sourceAnalysis.detectedStructures.map(s => `- ${s.structure} (relevance: ${s.relevance})`).join('\n')}\n`
        : '';

    const basePrompt = `You are a language learning expert creating a structured practice worksheet.

Target language: ${safeLangName}
Level: ${safeLevel}
Context: "${safeSourceText}"
${languageGuidance}
${detectedStructuresSummary}
FOCUS ON CREATING EXERCISES THAT PRACTICE THE DETECTED STRUCTURES ABOVE.
Exercises should remain grounded in the selected passage and grammar patterns.
Generate variations and transformations of similar structures, not unrelated grammar.

ALLOWED EXERCISE TYPES (use ONLY these):
- fill_form: fill in blanks with correct words/forms
- auxiliary: identify or use auxiliary verbs
- conjugation: conjugate verbs in specific tenses/moods
- transform: transform sentences (passive to active, etc.)
- correct_error: identify and correct grammatical errors
- translate: translate words or phrases
- short_production: produce short responses or sentences
- contextual_usage: use words/phrases in appropriate context

PEDAGOGICAL PROGRESSION (organize exercises as a learning sequence):
A. Recognition/Understanding (Exercises 1-3: easier, receptive)
   - Multiple choice or identification tasks
   - Recognize patterns, choose correct forms
   - Build foundational understanding

B. Controlled Form Practice (Exercises 4-9: medium, guided production)
   - Fill in forms, complete conjugations
   - Transform or correct within constraints
   - Apply rules with support

C. Context Practice (Exercises 10-12: harder, contextual)
   - Complete sentences based on context
   - Use target grammar in realistic situations
   - Require understanding of meaning

D. Production (Exercises 13-15: hardest, free production)
   - Write sentences using the target rule
   - Short scenario-based production
   - Demonstrate independent mastery

Generate 8-12 practice exercises (not rigid 15) that form a coherent pedagogical progression.
Exercises should move from recognition/understanding → controlled practice → contextual use → free production.

IMPORTANT for answer grading:
- For deterministic exercises (fill_form, conjugation, translate, correct_error): include "expectedAnswer" and optionally "acceptedAnswers" array for alternate correct forms
- For free-production exercises (short_production, contextual_usage): omit these fields (AI grading or manual review)
- Normalize expected answers: trim whitespace, lowercase is acceptable for most cases

Return ONLY valid JSON (no markdown, no explanation).

Worksheet schema:
{
  "metadata": {
    "title": "Worksheet title based on topic",
    "topic": "The specific learning goal",
    "sourceLanguage": "${safeSourceLang}",
    "targetLanguage": "${safeTargetLang}",
    "level": "${safeLevel}",
    "generatedAt": ${Date.now()}
  },
  "context": {
    "sourceText": "${safeSourceText.substring(0, 100)}"
  },
  "exercises": [
    {
      "id": "ex1",
      "type": "fill_form",
      "instruction": "Fill in the blank with the correct word",
      "prompt": "The cat ___ sleeping on the sofa.",
      "expectedConcept": "present continuous: is",
      "difficulty": 1,
      "expectedAnswer": "is",
      "acceptedAnswers": ["is"],
      "hints": [
        "Think about the action happening now",
        "What auxiliary verb matches 'is/are'?",
        "The answer is 'is'"
      ]
    }
  ]
}

Requirements:
- Generate 8-12 exercises (NOT a rigid 15)
- All IDs must be unique (ex1, ex2, ..., exN)
- CRITICAL: All exercise types MUST be from the allowed list — NO OTHER TYPES
- Organize pedagogically: recognition → controlled practice → context → production
- Difficulty should generally progress 1 (easy) → 5 (hard), but may vary within sections
- Each exercise should teach concepts from the context
- For deterministic exercises: always include "expectedAnswer" (string, exact answer)
- For deterministic exercises: optionally include "acceptedAnswers" array for common alternate forms
- For free-production exercises (short_production, contextual_usage): omit expectedAnswer/acceptedAnswers
- All string fields must be nonempty
- Provide 1–3 progressive hints per exercise (Hint 1: general, Hint 2: specific, Hint 3: direct answer)
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

// Close practice session UI (without destroying ready sessions)
// Ready sessions persist in localStorage and can be restored on reload
// Only clears the in-memory reference; does not delete from storage
function closePracticeSession() {
    // Clear in-memory reference to close UI
    currentPracticeSession = null;
    // Do NOT delete from localStorage - ready sessions should persist for reload restoration
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

// On app startup, restore latest session and clean up old ones
document.addEventListener('DOMContentLoaded', () => {
    // Attempt to restore latest practice session if available
    const latestSessionId = localStorage.getItem(PRACTICE_SESSION_LATEST_KEY);
    if (latestSessionId) {
        const restored = loadPracticeSession(latestSessionId);
        if (restored && restored.status === 'ready') {
            currentPracticeSession = restored;
        } else {
            // Clear stale/invalid latest reference
            localStorage.removeItem(PRACTICE_SESSION_LATEST_KEY);
        }
    }
    
    cleanupExpiredPracticeSessions();
});
