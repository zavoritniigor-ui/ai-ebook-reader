/* grammar-analysis-schema.js — Normalized grammar analysis data structure.
 *
 * All analyses (adjectives, verbs, nouns) produce this schema to ensure:
 * - Confidence levels (deterministic analysis can be marked certain)
 * - AI fallback results are clearly marked as such
 * - Learning UI has normalized data to display
 * - Practice generation can query analyses reliably
 *
 * The schema is language-agnostic and can extend to any grammar structure.
 */

/**
 * Confidence levels for linguistic analysis
 * @typedef {enum} AnalysisConfidence
 * confirmed - deterministic rule match, no ambiguity
 * high_confidence - pattern matching with >90% certainty
 * heuristic - rule-of-thumb or positional inference
 * ambiguous - multiple valid interpretations exist
 * ai_assisted - AI model resolved the ambiguity
 */

/**
 * Core grammar analysis unit
 * @typedef {object} GrammarUnit
 * @property {string} id - unique id within the analysis session
 * @property {string} type - 'adjective' | 'verb' | 'noun' | 'pronoun'
 * @property {string} language - 'fr' | 'en' | 'uk'
 * @property {string} observed - the form found in text (e.g., "sportive")
 * @property {string} lemma - base form (e.g., "sportif")
 * @property {number} position - character offset in source text
 * @property {number} endPosition - end offset for highlighting
 * @property {object} context - {before: string, after: string, inSentence: string}
 * @property {object} attributes - type-specific attrs (gender, number, tense, etc.)
 * @property {object} dependency - what this unit relates to
 *   - for adjectives: {modifiesNoun: string, position: 'before'|'after'|'predicate'}
 *   - for verbs: {subject: string, negation: boolean}
 * @property {object} morphology - {lemma, rule, transformation, forms}
 * @property {string} confidence - confirmed | high_confidence | heuristic | ambiguous | ai_assisted
 * @property {string} confidenceReason - why this confidence level
 * @property {string} explanation - pedagogical explanation in target language (Ukrainian)
 * @property {array} uncertainties - [{field, issue, suggestion}] if confidence < confirmed
 */

class GrammarAnalysis {
    constructor(sourceText, language = 'fr') {
        this.sourceText = sourceText;
        this.language = language;
        this.units = [];
        this.metadata = {
            analyzedAt: Date.now(),
            deterministic: 0,
            aiAssisted: 0,
            ambiguous: 0,
            tokenCount: 0
        };
    }

    /**
     * Add a grammar unit to this analysis
     * @param {object} unit - partial unit (id/type/language assigned automatically)
     * @returns {GrammarUnit} - the added unit with complete schema
     */
    addUnit(unit) {
        const normalized = {
            // Identity
            id: unit.id || `${unit.type}_${this.units.length}`,
            type: unit.type, // required
            language: this.language,

            // Raw observation
            observed: unit.observed || unit.text, // required
            lemma: unit.lemma || unit.observed,
            position: unit.position !== undefined ? unit.position : 0,
            endPosition: unit.endPosition || (unit.position + unit.observed.length),

            // Context in source
            context: unit.context || {
                before: this.getContextBefore(unit.position),
                after: this.getContextAfter(unit.endPosition),
                inSentence: this.getSentenceContext(unit.position)
            },

            // Linguistic attributes
            attributes: unit.attributes || {},
            dependency: unit.dependency || null,
            morphology: unit.morphology || {},

            // Confidence and quality
            confidence: unit.confidence || 'ambiguous',
            confidenceReason: unit.confidenceReason || '',
            explanation: unit.explanation || '',
            uncertainties: unit.uncertainties || [],

            // Metadata
            aiAssisted: unit.aiAssisted || false,
            source: unit.source || 'deterministic', // 'deterministic' | 'ai_fallback' | 'manual'

            // Independent per-field confidence breakdown (product requirement: a
            // confirmed morphological transformation must never make an uncertain
            // noun dependency look confirmed). Preserved verbatim if supplied.
            _fieldConfidence: unit._fieldConfidence || null
        };

        // Update metadata
        if (normalized.confidence === 'confirmed' || normalized.confidence === 'high_confidence') {
            this.metadata.deterministic++;
        } else if (normalized.confidence === 'ai_assisted') {
            this.metadata.aiAssisted++;
        } else {
            this.metadata.ambiguous++;
        }

        this.units.push(normalized);
        return normalized;
    }

    /**
     * Get text context before a position
     * @param {number} position
     * @returns {string}
     */
    getContextBefore(position) {
        const start = Math.max(0, position - 30);
        return this.sourceText.substring(start, position);
    }

    /**
     * Get text context after a position
     * @param {number} position
     * @returns {string}
     */
    getContextAfter(position) {
        const end = Math.min(this.sourceText.length, position + 30);
        return this.sourceText.substring(position, end);
    }

    /**
     * Get the complete sentence containing a position
     * @param {number} position
     * @returns {string}
     */
    getSentenceContext(position) {
        const sentenceStart = Math.max(0, this.sourceText.lastIndexOf('.', position) + 1);
        const sentenceEnd = Math.min(this.sourceText.length, this.sourceText.indexOf('.', position) + 1);
        return this.sourceText.substring(sentenceStart, sentenceEnd).trim();
    }

    /**
     * Filter units by confidence level
     * @param {string|array} confidence - confidence level(s) to include
     * @returns {array} - matching units
     */
    filterByConfidence(confidence) {
        const levels = Array.isArray(confidence) ? confidence : [confidence];
        return this.units.filter(u => levels.includes(u.confidence));
    }

    /**
     * Filter units by type
     * @param {string} type - 'adjective' | 'verb' | 'noun'
     * @returns {array} - matching units
     */
    filterByType(type) {
        return this.units.filter(u => u.type === type);
    }

    /**
     * Get summary statistics
     * @returns {object} - {total, byConfidence, byType, coverage}
     */
    getSummary() {
        const byConfidence = {
            confirmed: 0,
            high_confidence: 0,
            heuristic: 0,
            ambiguous: 0,
            ai_assisted: 0
        };

        const byType = {};

        this.units.forEach(unit => {
            byConfidence[unit.confidence]++;
            byType[unit.type] = (byType[unit.type] || 0) + 1;
        });

        return {
            total: this.units.length,
            byConfidence,
            byType,
            deterministic: this.metadata.deterministic,
            aiAssisted: this.metadata.aiAssisted,
            coverage: this.units.length > 0 ? `${this.units.length} structures analyzed` : 'empty'
        };
    }

    /**
     * Validate a unit's schema before adding
     * @param {object} unit
     * @returns {array} - validation errors (empty if valid)
     */
    static validateUnit(unit) {
        const errors = [];

        if (!unit.type) errors.push('type is required');
        if (!['adjective', 'verb', 'noun', 'pronoun'].includes(unit.type)) errors.push('type must be adjective|verb|noun|pronoun');
        if (!unit.observed && !unit.text) errors.push('observed (or text) is required');
        if (unit.confidence && !['confirmed', 'high_confidence', 'heuristic', 'ambiguous', 'ai_assisted'].includes(unit.confidence)) {
            errors.push('confidence must be confirmed|high_confidence|heuristic|ambiguous|ai_assisted');
        }

        return errors;
    }
}

/**
 * Specialized schema for French adjectives
 * Extends GrammarAnalysis with adjective-specific fields
 */
class FrenchAdjectiveAnalysis extends GrammarAnalysis {
    constructor(sourceText) {
        super(sourceText, 'fr');
        this.adjectivePatterns = {};
    }

    /**
     * Add an adjective analysis unit
     * @param {object} unit - { observed, lemma, forms, modifiesNoun, gender, number, ... }
     * @returns {GrammarUnit}
     */
    addAdjective(unit) {
        const adjUnit = this.addUnit({
            type: 'adjective',
            ...unit
        });

        // Track pattern for Practice generation later
        if (unit.morphology?.rule) {
            const pattern = unit.morphology.rule;
            this.adjectivePatterns[pattern] = (this.adjectivePatterns[pattern] || 0) + 1;
        }

        return adjUnit;
    }

    /**
     * Get all adjectives grouped by confidence
     * @returns {object} - {confirmed: [], highConfidence: [], heuristic: [], ambiguous: [], aiAssisted: []}
     */
    getAdjectivesByConfidence() {
        return {
            confirmed: this.filterByConfidence('confirmed').filter(u => u.type === 'adjective'),
            highConfidence: this.filterByConfidence('high_confidence').filter(u => u.type === 'adjective'),
            heuristic: this.filterByConfidence('heuristic').filter(u => u.type === 'adjective'),
            ambiguous: this.filterByConfidence('ambiguous').filter(u => u.type === 'adjective'),
            aiAssisted: this.filterByConfidence('ai_assisted').filter(u => u.type === 'adjective')
        };
    }

    /**
     * Get adjectives that modify a specific noun
     * @param {string} nounText
     * @returns {array}
     */
    getAdjectivesModifying(nounText) {
        return this.units.filter(u =>
            u.type === 'adjective' &&
            u.dependency?.modifiesNoun === nounText
        );
    }

    /**
     * Mark an adjective as requiring AI review (ambiguous)
     * @param {string} unitId
     * @param {object} issue - {field, reason, suggestion}
     */
    markForAIReview(unitId, issue) {
        const unit = this.units.find(u => u.id === unitId);
        if (!unit) return;

        if (unit.confidence !== 'ambiguous') {
            unit.confidence = 'ambiguous';
            unit.uncertainties = [];
        }

        unit.uncertainties.push(issue);
        unit.confidenceReason = `Marked for AI review: ${issue.reason}`;
    }
}

/**
 * Result from a confidence check: is this analysis reliable enough to teach?
 * @typedef {object} ConfidenceCheckResult
 * @property {boolean} isReliable - should be taught as-is
 * @property {boolean} needsAI - should use AI fallback
 * @property {array} issues - [{unit, field, reason}] if not reliable
 */

/**
 * Check whether an analysis is reliable for Learning UI
 * @param {GrammarAnalysis} analysis
 * @param {object} options - {minConfidence: 'confirmed'|'high_confidence'|'heuristic'}
 * @returns {ConfidenceCheckResult}
 */
function checkAnalysisConfidence(analysis, options = {}) {
    const minConfidence = options.minConfidence || 'high_confidence';
    const confidenceHierarchy = {
        confirmed: 4,
        high_confidence: 3,
        heuristic: 2,
        ambiguous: 1,
        ai_assisted: 2.5
    };

    const issues = [];
    let needsAI = false;

    analysis.units.forEach(unit => {
        const unitConfidence = confidenceHierarchy[unit.confidence];
        const minRequired = confidenceHierarchy[minConfidence];

        if (unitConfidence < minRequired) {
            issues.push({
                unit: unit.id,
                field: unit.confidence,
                reason: `Confidence ${unit.confidence} below minimum ${minConfidence}`
            });
        }

        if (unit.confidence === 'ambiguous') {
            needsAI = true;
        }

        if (unit.uncertainties.length > 0) {
            issues.push({
                unit: unit.id,
                field: 'uncertainties',
                reason: unit.uncertainties[0].issue
            });
            needsAI = true;
        }
    });

    return {
        isReliable: issues.length === 0,
        needsAI,
        issues
    };
}
