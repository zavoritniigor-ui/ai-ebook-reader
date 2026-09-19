/* grammar-adjectives-analyzer.js — French adjective analysis → GrammarAnalysis.
 *
 * Pipeline: tokenize → tag → find dependency (which noun, before/after/predicate)
 * → resolve morphology (lemma, forms, rule) → assign INDEPENDENT confidence per
 * field → merge into a FrenchAdjectiveAnalysis unit → optional AI fallback for
 * fields that remain ambiguous → render dense textbook-style Learning UI.
 *
 * KEY RULE (explicit product requirement): a confirmed morphological
 * transformation must NEVER make an uncertain noun dependency look
 * confirmed. Each unit carries independent sub-confidences; unit.confidence
 * is the WEAKEST of them, never the strongest.
 */

const CONFIDENCE_RANK = { confirmed: 4, high_confidence: 3, ai_assisted: 2.5, heuristic: 2, ambiguous: 1 };
function weakestConfidence(...levels) {
    return levels.reduce((worst, level) => CONFIDENCE_RANK[level] < CONFIDENCE_RANK[worst] ? level : worst, 'confirmed');
}

// Copula verbs that introduce a predicate adjective (subject NOUN ... COPULA ADJ)
const FRENCH_COPULAS = new Set(['est', 'sont', 'était', 'étaient', 'être', 'paraît', 'paraissent', 'semble', 'semblent', 'devient', 'deviennent']);

// Subject pronouns can carry a predicate adjective just like a noun (spec:
// "noun OR PRONOUN it modifies"). Gender/number is a grammatical fact of the
// pronoun itself, not a guess — "confirmed" confidence — though "il/elle"
// still leave the REFERENT's real-world gender out of scope (a textbook
// exercise, not the referent's identity).
const FRENCH_SUBJECT_PRONOUNS = {
    'je': { gender: 'unknown', number: 'singular' }, 'tu': { gender: 'unknown', number: 'singular' },
    'il': { gender: 'masculine', number: 'singular' }, 'elle': { gender: 'feminine', number: 'singular' },
    'on': { gender: 'unknown', number: 'singular' },
    'nous': { gender: 'unknown', number: 'plural' }, 'vous': { gender: 'unknown', number: 'plural' },
    'ils': { gender: 'masculine', number: 'plural' }, 'elles': { gender: 'feminine', number: 'plural' }
};

// Coordinating conjunctions that chain a second predicate adjective back to
// the SAME subject ("il est grand ET intelligent") rather than breaking the
// backward scan for a copula/subject.
const FRENCH_COORDINATORS = new Set(['et', 'ou', 'mais']);

// Small curated noun-gender dictionary (high_confidence hits). Anything not
// here falls back to a suffix heuristic (heuristic confidence) or, failing
// that, is left unknown (ambiguous) rather than guessed.
const FRENCH_NOUN_GENDER_DICTIONARY = {
    'fille': 'feminine', 'mère': 'feminine', 'voiture': 'feminine', 'école': 'feminine',
    'maison': 'feminine', 'page': 'feminine', 'lettre': 'feminine', 'histoire': 'feminine',
    'idée': 'feminine', 'main': 'feminine', 'eau': 'feminine', 'vie': 'feminine',
    'femme': 'feminine', 'ville': 'feminine', 'porte': 'feminine', 'table': 'feminine',
    'garçon': 'masculine', 'père': 'masculine', 'livre': 'masculine', 'jour': 'masculine',
    'ami': 'masculine', 'temps': 'masculine', 'nom': 'masculine', 'chat': 'masculine',
    'chien': 'masculine', 'arbre': 'masculine', 'ciel': 'masculine', 'soleil': 'masculine',
    'homme': 'masculine', 'appartement': 'masculine', 'jardin': 'masculine', 'village': 'masculine'
};

function tokenizeFrench(text) {
    const matches = [];
    const pattern = /[a-zàâäéèêëïîôùûüÿœæç]+(?:['’][a-zàâäéèêëïîôùûüÿœæç]+)?/gi;
    let m;
    while ((m = pattern.exec(text)) !== null) {
        matches.push({ text: m[0], index: m.index, endIndex: m.index + m[0].length });
    }
    return matches;
}

// Small stoplist of common function words that would otherwise false-match
// suffix heuristics below (e.g. "de", "le", "que" end in vowels used by
// several adjective suffixes at very short length).
// Note: "et"/"ou"/"mais" are deliberately NOT here — they are tagged as
// COORDINATOR (see FRENCH_COORDINATORS) so the predicate-search backward
// scan can see through them, rather than being opaque NOT_ADJ tokens.
const FRENCH_FUNCTION_WORDS = new Set(['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'que', 'qui', 'ce', 'cette', 'ces', 'son', 'sa', 'ses', 'notre', 'votre', 'leur']);

/**
 * Check whether `lower` is (a form of) a curated common regular adjective
 * lemma. Tries the form as-is, then after stripping one plural "-s", one
 * feminine "-e", or both — covering all four regular forms of any lemma in
 * FRENCH_COMMON_REGULAR_ADJECTIVE_LEMMAS without storing those forms.
 */
function isKnownRegularAdjectiveForm(lower) {
    const candidates = [lower];
    if (lower.endsWith('s') && !lower.endsWith('ss')) candidates.push(lower.slice(0, -1));
    if (lower.endsWith('e')) candidates.push(lower.slice(0, -1));
    if (lower.endsWith('es') && lower.length > 2) candidates.push(lower.slice(0, -2));
    return candidates.some(c => FRENCH_COMMON_REGULAR_ADJECTIVE_LEMMAS.has(c));
}

function tagTokens(tokens) {
    return tokens.map(tok => {
        const lower = tok.text.toLowerCase();

        if (FRENCH_FUNCTION_WORDS.has(lower) || FRENCH_ADJECTIVE_FALSE_FRIENDS.has(lower)) {
            return { ...tok, pos: 'NOT_ADJ' };
        }
        if (FRENCH_COPULAS.has(lower)) {
            return { ...tok, pos: 'COPULA' };
        }
        // Known noun (dictionary) is checked BEFORE any adjective-suspect
        // heuristic — a bare "-e" or "-f" ending is common on nouns too, so
        // an explicit noun match must win over a weak suffix guess. Also try
        // the regular-plural singular (strip "-s") since the dictionary only
        // lists singular forms and French pluralizes regularly with "-s".
        if (FRENCH_NOUN_GENDER_DICTIONARY[lower]) {
            return { ...tok, pos: 'NOUN', gender: FRENCH_NOUN_GENDER_DICTIONARY[lower], genderSource: 'dictionary' };
        }
        if (lower.endsWith('s') && !lower.endsWith('ss') && FRENCH_NOUN_GENDER_DICTIONARY[lower.slice(0, -1)]) {
            return { ...tok, pos: 'NOUN', gender: FRENCH_NOUN_GENDER_DICTIONARY[lower.slice(0, -1)], genderSource: 'dictionary' };
        }
        if (FRENCH_SUBJECT_PRONOUNS[lower]) {
            return { ...tok, pos: 'PRONOUN', gender: FRENCH_SUBJECT_PRONOUNS[lower].gender, number: FRENCH_SUBJECT_PRONOUNS[lower].number, genderSource: FRENCH_SUBJECT_PRONOUNS[lower].gender === 'unknown' ? 'unknown' : 'dictionary' };
        }
        if (FRENCH_COORDINATORS.has(lower)) {
            return { ...tok, pos: 'COORDINATOR' };
        }
        // Liaison masculine-singular forms: bel/vieil/nouvel before vowel-initial noun
        if (lower === 'bel' || lower === 'vieil' || lower === 'nouvel') {
            return { ...tok, pos: 'ADJ', liaisonOf: { bel: 'beau', vieil: 'vieux', nouvel: 'nouveau' }[lower] };
        }
        if (FRENCH_IRREGULAR_ADJECTIVE_LEXICON[lower] ||
            Object.values(FRENCH_IRREGULAR_ADJECTIVE_LEXICON).some(e => e.fem === lower || e.masc_pl === lower || e.fem_pl === lower)) {
            return { ...tok, pos: 'ADJ' };
        }
        // Common regular adjective (POS-confirmation lemma list): check the
        // observed form directly, or after stripping one regular plural/
        // feminine step, against the curated lemma set.
        if (isKnownRegularAdjectiveForm(lower)) {
            return { ...tok, pos: 'ADJ' };
        }
        // Tier A: suffixes that are near-certain adjective markers in French
        // (very few common nouns end this way) — treated as a confirmed POS
        // guess, so morphological rule confidence is NOT artificially capped.
        // Whether the AGREEMENT/dependency is confirmed is a separate matter,
        // decided independently in findDependency().
        if (/(ive|ives|if|ifs|eux|euse|euses|ienne|iennes|ien|iens|onne|onnes|ette|ettes|elle|elles|ère|ères|ible|ibles|able|ables|ique|iques)$/i.test(lower) && lower.length > 4) {
            return { ...tok, pos: 'ADJ' };
        }
        // Tier B: genuinely ambiguous suffixes (many nouns share these
        // endings too: "cheval"/"animal" vs. "royal"; present participles
        // used as nouns) — kept as a weaker, heuristic-capped guess.
        // EXCLUDES "-ment": French adverbs are productively formed with this
        // suffix (rapidement, lentement, facilement, vraiment, seulement...)
        // and hugely outnumber any adjective coincidentally ending the same
        // way — without this exclusion, adverbs are wrongly flagged as
        // participial adjectives on every "-ent" match.
        if (!lower.endsWith('ment') && /(ale|ales|aux|ant|ante|antes|ants|ent|ente|entes|ents)$/i.test(lower) && lower.length > 4) {
            return { ...tok, pos: 'ADJ_SUSPECT' };
        }
        if (/(ion|ure|ence|esse|ade)$/.test(lower) && lower.length > 4) {
            return { ...tok, pos: 'NOUN_SUSPECT', gender: 'feminine', genderSource: 'heuristic' };
        }
        return { ...tok, pos: 'UNKNOWN' };
    });
}

/**
 * Find which noun an adjective depends on, and HOW confidently.
 * Returns { noun, position: 'before'|'after'|'predicate', dependencyConfidence, candidates }
 */
function findDependency(tagged, adjIndex) {
    const isNounish = t => t.pos === 'NOUN' || t.pos === 'NOUN_SUSPECT';

    // 1. Immediately adjacent: NOUN ADJ (post-nominal) — most common French order
    if (adjIndex > 0 && isNounish(tagged[adjIndex - 1])) {
        return {
            noun: tagged[adjIndex - 1], position: 'after',
            dependencyConfidence: tagged[adjIndex - 1].pos === 'NOUN' ? 'high_confidence' : 'heuristic',
            candidates: 1
        };
    }
    // 2. Immediately adjacent: ADJ NOUN (pre-nominal — beau/bon/petit/grand class)
    if (adjIndex < tagged.length - 1 && isNounish(tagged[adjIndex + 1])) {
        return {
            noun: tagged[adjIndex + 1], position: 'before',
            dependencyConfidence: tagged[adjIndex + 1].pos === 'NOUN' ? 'high_confidence' : 'heuristic',
            candidates: 1
        };
    }
    // 3. Predicate: scan backward for COPULA, then further back for a subject
    //    noun OR pronoun, counting how many candidates sit between subject
    //    and verb (agreement is only safe to assume when there is exactly
    //    one). A COORDINATOR ("et"/"ou"/"mais") between this adjective and
    //    an earlier one is transparent to the scan — "il est grand ET
    //    intelligent" must chain "intelligent" back to the same "il".
    const isSubjectish = t => isNounish(t) || t.pos === 'PRONOUN';
    for (let i = adjIndex - 1; i >= 0; i--) {
        if (tagged[i].pos === 'COPULA') {
            const subjectsBeforeCopula = [];
            for (let j = i - 1; j >= 0 && j >= i - 6; j--) {
                if (isSubjectish(tagged[j])) subjectsBeforeCopula.push(tagged[j]);
            }
            if (subjectsBeforeCopula.length === 1) {
                const subj = subjectsBeforeCopula[0];
                return {
                    noun: subj, position: 'predicate',
                    // A pronoun's gender/number is a grammatical fact, not a
                    // position guess — but the DEPENDENCY link itself (which
                    // subject this adjective's copula refers to) is still a
                    // backward-scan heuristic, so it is capped the same way.
                    dependencyConfidence: (subj.pos === 'NOUN' || subj.pos === 'PRONOUN') ? 'heuristic' : 'ambiguous',
                    candidates: 1
                };
            }
            return { noun: subjectsBeforeCopula[0] || null, position: 'predicate', dependencyConfidence: 'ambiguous', candidates: subjectsBeforeCopula.length };
        }
        if (isSubjectish(tagged[i]) || tagged[i].pos === 'ADJ' || tagged[i].pos === 'ADJ_SUSPECT' || tagged[i].pos === 'COORDINATOR') continue; // keep scanning past other modifiers/coordinators
        break; // hit an unrelated word before finding a copula — stop
    }

    // 4. Wider scan (e.g. "petites voitures françaises" — françaises is 2 away from voitures
    //    because petites sits between them): look both directions up to 3 tokens.
    for (let d = 2; d <= 3; d++) {
        if (adjIndex - d >= 0 && isNounish(tagged[adjIndex - d])) {
            const between = tagged.slice(adjIndex - d + 1, adjIndex);
            if (between.every(t => t.pos === 'ADJ' || t.pos === 'ADJ_SUSPECT')) {
                return { noun: tagged[adjIndex - d], position: 'after', dependencyConfidence: 'heuristic', candidates: 1 };
            }
        }
    }

    return { noun: null, position: 'unknown', dependencyConfidence: 'ambiguous', candidates: 0 };
}

/**
 * Resolve an observed adjective form to lemma + all four forms + rule.
 * This is PURELY morphological — no noun/dependency involved — so its
 * confidence is independent of dependency confidence.
 */
function resolveMorphology(observed, liaisonOf) {
    const lower = observed.toLowerCase();

    if (liaisonOf && FRENCH_IRREGULAR_ADJECTIVE_LEXICON[liaisonOf]) {
        const entry = FRENCH_IRREGULAR_ADJECTIVE_LEXICON[liaisonOf];
        return {
            lemma: liaisonOf, gender: 'masculine', number: 'singular',
            forms: { masc_sing: liaisonOf, fem_sing: entry.fem, masc_pl: entry.masc_pl, fem_pl: entry.fem_pl },
            rule: `liaison form of ${liaisonOf} (used before a vowel-initial masculine noun)`,
            formConfidence: 'confirmed'
        };
    }

    // Direct irregular lemma match
    if (FRENCH_IRREGULAR_ADJECTIVE_LEXICON[lower]) {
        const entry = FRENCH_IRREGULAR_ADJECTIVE_LEXICON[lower];
        return {
            lemma: lower, gender: 'masculine', number: 'singular',
            forms: { masc_sing: lower, fem_sing: entry.fem, masc_pl: entry.masc_pl, fem_pl: entry.fem_pl },
            rule: 'irregular (lexicon)', formConfidence: 'confirmed'
        };
    }
    // Direct irregular non-lemma form match (fem/masc_pl/fem_pl)
    for (const [lemma, entry] of Object.entries(FRENCH_IRREGULAR_ADJECTIVE_LEXICON)) {
        if (entry.fem === lower) return { lemma, gender: 'feminine', number: 'singular', forms: { masc_sing: lemma, fem_sing: entry.fem, masc_pl: entry.masc_pl, fem_pl: entry.fem_pl }, rule: 'irregular feminine (lexicon)', formConfidence: 'confirmed' };
        if (entry.masc_pl === lower) return { lemma, gender: 'masculine', number: 'plural', forms: { masc_sing: lemma, fem_sing: entry.fem, masc_pl: entry.masc_pl, fem_pl: entry.fem_pl }, rule: 'irregular masc. plural (lexicon)', formConfidence: 'confirmed' };
        if (entry.fem_pl === lower) return { lemma, gender: 'feminine', number: 'plural', forms: { masc_sing: lemma, fem_sing: entry.fem, masc_pl: entry.masc_pl, fem_pl: entry.fem_pl }, rule: 'irregular fem. plural (lexicon)', formConfidence: 'confirmed' };
    }

    // Deterministic morphological reversal via grammar-rules.js.
    // IMPORTANT: compound feminine-PLURAL endings (e.g. "sportives" = fem
    // singular "sportive" + plural "-s") must be checked BEFORE their
    // singular counterparts, otherwise only the plural "-s" gets stripped
    // and the feminine "-ve→-f" step never runs — a two-step transformation
    // collapsed into one is a real correctness bug, not a style choice.
    let candidateLemma = null, gender = 'unknown', number = 'unknown';
    if (lower.endsWith('euses')) { candidateLemma = lower.slice(0, -5) + 'eux'; gender = 'feminine'; number = 'plural'; }
    else if (lower.endsWith('iennes')) { candidateLemma = lower.slice(0, -6) + 'ien'; gender = 'feminine'; number = 'plural'; }
    else if (lower.endsWith('ières')) { candidateLemma = lower.slice(0, -5) + 'ier'; gender = 'feminine'; number = 'plural'; }
    else if (lower.endsWith('ères')) { candidateLemma = lower.slice(0, -4) + 'er'; gender = 'feminine'; number = 'plural'; }
    else if (lower.endsWith('onnes')) { candidateLemma = lower.slice(0, -5) + 'on'; gender = 'feminine'; number = 'plural'; }
    else if (lower.endsWith('ettes')) { candidateLemma = lower.slice(0, -5) + 'et'; gender = 'feminine'; number = 'plural'; }
    else if (lower.endsWith('elles')) { candidateLemma = lower.slice(0, -5) + 'el'; gender = 'feminine'; number = 'plural'; }
    else if (lower.endsWith('ales')) { candidateLemma = lower.slice(0, -4) + 'al'; gender = 'feminine'; number = 'plural'; }
    else if (lower.endsWith('ves')) { candidateLemma = lower.slice(0, -3) + 'f'; gender = 'feminine'; number = 'plural'; }
    else if (lower.endsWith('euse')) { candidateLemma = lower.slice(0, -4) + 'eux'; gender = 'feminine'; number = 'singular'; }
    else if (lower.endsWith('ienne')) { candidateLemma = lower.slice(0, -5) + 'ien'; gender = 'feminine'; number = 'singular'; }
    else if (lower.endsWith('ière')) { candidateLemma = lower.slice(0, -4) + 'ier'; gender = 'feminine'; number = 'singular'; }
    else if (lower.endsWith('ère')) { candidateLemma = lower.slice(0, -3) + 'er'; gender = 'feminine'; number = 'singular'; }
    else if (lower.endsWith('onne')) { candidateLemma = lower.slice(0, -4) + 'on'; gender = 'feminine'; number = 'singular'; }
    else if (lower.endsWith('ette')) { candidateLemma = lower.slice(0, -4) + 'et'; gender = 'feminine'; number = 'singular'; }
    else if (lower.endsWith('elle')) { candidateLemma = lower.slice(0, -4) + 'el'; gender = 'feminine'; number = 'singular'; }
    else if (lower.endsWith('ale')) { candidateLemma = lower.slice(0, -3) + 'al'; gender = 'feminine'; number = 'singular'; }
    else if (lower.endsWith('ve')) { candidateLemma = lower.slice(0, -2) + 'f'; gender = 'feminine'; number = 'singular'; }
    else if (lower.endsWith('aux')) { candidateLemma = lower.slice(0, -3) + 'al'; gender = 'masculine'; number = 'plural'; }
    else if (lower.endsWith('se') && lower.length > 2) { candidateLemma = lower.slice(0, -2) + 'x'; gender = 'feminine'; number = 'singular'; }
    else if (lower.endsWith('es') && lower.length > 2) {
        // Genuinely ambiguous without a lemma to check against: "petites"
        // needs -e AND -s stripped (petit), but "rouges" needs only -s
        // stripped (rouge is already -e in the masculine, invariant). Prefer
        // whichever candidate is a KNOWN lemma; if neither is known, do not
        // silently guess — surface as uncertain instead.
        const stripBoth = lower.slice(0, -2);
        const stripS = lower.slice(0, -1);
        if (FRENCH_COMMON_REGULAR_ADJECTIVE_LEMMAS.has(stripBoth)) { candidateLemma = stripBoth; gender = 'feminine'; number = 'plural'; }
        else if (FRENCH_COMMON_REGULAR_ADJECTIVE_LEMMAS.has(stripS)) { candidateLemma = stripS; gender = 'feminine'; number = 'plural'; }
        else { candidateLemma = null; }
    }
    else if (lower.endsWith('s') && !lower.endsWith('ss')) { candidateLemma = lower.slice(0, -1); gender = 'masculine'; number = 'plural'; }
    else if (lower.endsWith('e')) {
        // Same ambiguity, singular case: "petite" -> "petit" (strip -e) vs.
        // "rouge" -> "rouge" (invariant, keep as-is).
        const stripE = lower.slice(0, -1);
        if (FRENCH_COMMON_REGULAR_ADJECTIVE_LEMMAS.has(stripE)) { candidateLemma = stripE; gender = 'feminine'; number = 'singular'; }
        else if (FRENCH_COMMON_REGULAR_ADJECTIVE_LEMMAS.has(lower)) { candidateLemma = lower; gender = 'feminine'; number = 'singular'; }
        else { candidateLemma = null; }
    }
    else { candidateLemma = lower; gender = 'masculine'; number = 'singular'; }

    if (candidateLemma) {
        // Build all four forms FORWARD from the already-disambiguated
        // candidateLemma (masc. singular) — deliberately NOT re-deriving via
        // generateAdjektiveForms' own reversal, which does not know about
        // the lemma-set disambiguation above and would re-introduce the
        // same "which -e/-es case is this" ambiguity from the wrong end.
        const rule = getFeminineRule(candidateLemma);
        if (rule && rule.name !== 'uncertain') {
            const femSing = rule.transform ? rule.transform(candidateLemma) : candidateLemma;
            const mascPlRule = getPluralRule(candidateLemma);
            const femPlRule = getPluralRule(femSing);
            const mascPl = mascPlRule.transform ? mascPlRule.transform(candidateLemma) : candidateLemma;
            const femPl = femPlRule.transform ? femPlRule.transform(femSing) : femSing;
            return {
                lemma: candidateLemma, gender, number,
                forms: { masc_sing: candidateLemma, fem_sing: femSing, masc_pl: mascPl, fem_pl: femPl },
                rule: rule.description, formConfidence: 'high_confidence'
            };
        }
    }

    // Could not confidently resolve — surface as ambiguous rather than guess
    return { lemma: lower, gender: 'unknown', number: 'unknown', forms: { masc_sing: lower, fem_sing: '?', masc_pl: '?', fem_pl: '?' }, rule: 'pattern unclear', formConfidence: 'ambiguous' };
}

/**
 * Main entry point: analyze French text for adjectives, producing a
 * FrenchAdjectiveAnalysis with independent per-field confidence.
 * @param {string} text
 * @returns {FrenchAdjectiveAnalysis}
 */
function analyzeFrenchAdjectives(text) {
    const analysis = new FrenchAdjectiveAnalysis(text || '');
    if (!text) return analysis;

    const tokens = tokenizeFrench(text);
    const tagged = tagTokens(tokens);
    analysis.metadata.tokenCount = tokens.length;

    tagged.forEach((tok, i) => {
        if (tok.pos !== 'ADJ' && tok.pos !== 'ADJ_SUSPECT') return;

        const morph = resolveMorphology(tok.text, tok.liaisonOf);
        const dep = findDependency(tagged, i);

        // Independent field confidences — NEVER let one raise another.
        const formConfidence = tok.pos === 'ADJ_SUSPECT' ? weakestConfidence(morph.formConfidence, 'heuristic') : morph.formConfidence;
        const dependencyConfidence = dep.dependencyConfidence;
        const genderConfidence = dep.noun ? (dep.noun.genderSource === 'dictionary' ? 'confirmed' : 'heuristic') : 'ambiguous';

        // Overall = weakest link, per product requirement.
        const overall = weakestConfidence(formConfidence, dependencyConfidence, genderConfidence);

        const uncertainties = [];
        if (formConfidence === 'ambiguous') uncertainties.push({ field: 'morphology', issue: 'Could not determine lemma/rule with confidence' });
        if (dependencyConfidence === 'ambiguous') uncertainties.push({ field: 'dependency', issue: dep.candidates > 1 ? `${dep.candidates} possible nouns nearby` : 'No noun found nearby' });
        if (genderConfidence === 'ambiguous') uncertainties.push({ field: 'gender', issue: 'Noun gender unknown' });

        analysis.addAdjective({
            observed: tok.text,
            lemma: morph.lemma,
            position: tok.index,
            endPosition: tok.endIndex,
            attributes: { gender: morph.gender, number: morph.number },
            dependency: dep.noun ? { modifiesNoun: dep.noun.text, position: dep.position, nounGender: dep.noun.gender } : { modifiesNoun: null, position: dep.position },
            morphology: { lemma: morph.lemma, forms: morph.forms, rule: morph.rule },
            confidence: overall,
            confidenceReason: `form=${formConfidence}, dependency=${dependencyConfidence}, gender=${genderConfidence}`,
            uncertainties,
            explanation: buildExplanation(morph, dep, overall),
            source: 'deterministic',
            _fieldConfidence: { form: formConfidence, dependency: dependencyConfidence, gender: genderConfidence }
        });
    });

    return analysis;
}

function buildExplanation(morph, dep, overall) {
    if (!dep.noun) {
        return `Форма ${morph.lemma} — іменник для узгодження не знайдено; правило: ${morph.rule}.`;
    }
    const genderLabel = dep.noun.gender === 'feminine' ? 'жіночого роду' : (dep.noun.gender === 'masculine' ? 'чоловічого роду' : 'невідомого роду');
    const numberLabel = morph.number === 'plural' ? 'множини' : 'однини';
    const posLabel = dep.position === 'predicate' ? 'у складі присудка (після дієслова-зв’язки)' : (dep.position === 'before' ? 'перед іменником' : 'після іменника');
    let text = `${dep.noun.text} — ${genderLabel} ${numberLabel} (${posLabel}), тому прикметник ${morph.lemma} узгоджується: ${morph.rule}.`;
    if (overall === 'ambiguous' || overall === 'heuristic') {
        text += ' ⚠ Не є остаточно підтвердженим — можливі інші тлумачення.';
    }
    return text;
}

// ---------------------------------------------------------------------------
// AI fallback: only for fields that remain uncertain after deterministic pass
// ---------------------------------------------------------------------------

/**
 * Build a prompt asking AI to resolve ONLY the uncertain fields of one unit,
 * given the full sentence and the facts already confirmed deterministically.
 * @param {GrammarUnit} unit
 * @param {string} fullSentence
 * @returns {string}
 */
function buildAdjectiveAIFallbackPrompt(unit, fullSentence) {
    const known = [];
    if (unit._fieldConfidence.form !== 'ambiguous') known.push(`lemme="${unit.lemma}"`);
    if (unit._fieldConfidence.dependency !== 'ambiguous' && unit.dependency?.modifiesNoun) known.push(`nom_modifié="${unit.dependency.modifiesNoun}"`);

    return `Dans la phrase française suivante : "${fullSentence}"
L'adjectif observé est : "${unit.observed}"
${known.length ? `Déjà établi (NE PAS redemander) : ${known.join(', ')}.` : ''}
Résous UNIQUEMENT les champs incertains et retourne un JSON strict, sans markdown :
{"nom_modifie":"...","genre":"masculine|feminine","nombre":"singular|plural","position":"before|after|predicate","confiance":"high_confidence|heuristic"}
Règles :
- "nom_modifie" doit être une sous-chaîne EXACTE copiée de la phrase.
- Si tu n'es pas sûr, mets "confiance":"heuristic" plutôt que d'inventer.
- Ne remplis pas les champs déjà établis ci-dessus.`;
}

/**
 * Validate and merge an AI fallback response into a unit. Never trusts the
 * AI response blindly — every field is checked against the schema and
 * against the actual source sentence before being applied.
 * @param {GrammarUnit} unit
 * @param {string} aiRawResponse
 * @param {string} fullSentence
 * @returns {boolean} - true if merge succeeded
 */
function applyAdjectiveAIFallback(unit, aiRawResponse, fullSentence) {
    let parsed;
    try {
        parsed = JSON.parse((aiRawResponse || '').replace(/```json|```/g, '').trim());
    } catch (e) {
        return false;
    }
    if (!parsed || typeof parsed !== 'object') return false;

    // Validate nom_modifie is an exact substring of the sentence (never trust free text)
    if (parsed.nom_modifie && typeof parsed.nom_modifie === 'string' && fullSentence.includes(parsed.nom_modifie)) {
        unit.dependency = unit.dependency || {};
        unit.dependency.modifiesNoun = parsed.nom_modifie;
    } else if (parsed.nom_modifie) {
        return false; // AI hallucinated a noun not present in the sentence — reject entirely
    }

    if (['masculine', 'feminine'].includes(parsed.genre)) {
        unit.dependency = unit.dependency || {};
        unit.dependency.nounGender = parsed.genre;
    }
    if (['singular', 'plural'].includes(parsed.nombre)) {
        unit.attributes = unit.attributes || {};
        unit.attributes.number = parsed.nombre;
    }
    if (['before', 'after', 'predicate'].includes(parsed.position)) {
        unit.dependency = unit.dependency || {};
        unit.dependency.position = parsed.position;
    }

    const aiConfidence = parsed.confiance === 'high_confidence' ? 'high_confidence' : 'heuristic';
    unit.confidence = weakestConfidence(unit._fieldConfidence?.form || 'confirmed', 'ai_assisted', aiConfidence);
    unit.source = 'ai_fallback';
    unit.aiAssisted = true;
    unit.uncertainties = [];
    unit.explanation = buildExplanation(
        { lemma: unit.lemma, number: unit.attributes.number, rule: unit.morphology.rule },
        { noun: unit.dependency.modifiesNoun ? { text: unit.dependency.modifiesNoun, gender: unit.dependency.nounGender } : null, position: unit.dependency.position },
        unit.confidence
    );
    return true;
}

// ---------------------------------------------------------------------------
// Learning UI: dense, textbook-style rows (not cards)
// ---------------------------------------------------------------------------

const CONFIDENCE_MARK = { confirmed: '✓', high_confidence: '✓', ai_assisted: '✓·AI', heuristic: '?', ambiguous: '⚠' };

function renderAdjectiveAnalysisUI(analysis, container) {
    if (!container) return;

    if (!analysis.units || analysis.units.length === 0) {
        container.innerHTML = `<div class="adj-empty">${escapeHtml('Прикметників не знайдено у цьому фрагменті.')}</div>`;
        return;
    }

    const sentenceHtml = `<div class="adj-source-sentence">${escapeHtml(analysis.sourceText)}</div>`;

    const rowsHtml = analysis.units.filter(u => u.type === 'adjective').map(u => {
        const forms = u.morphology.forms || {};
        const chain = [forms.masc_sing, forms.fem_sing, forms.masc_pl, forms.fem_pl].filter(Boolean).join(' → ');
        const genderSym = u.dependency?.nounGender === 'feminine' ? '♀' : (u.dependency?.nounGender === 'masculine' ? '♂' : '?');
        const posLabel = { before: 'перед іменником', after: 'після іменника', predicate: 'присудок', unknown: '?' }[u.dependency?.position] || '?';
        const mark = CONFIDENCE_MARK[u.confidence] || '?';
        const markClass = (u.confidence === 'confirmed' || u.confidence === 'high_confidence') ? 'conf-ok' : (u.confidence === 'ai_assisted' ? 'conf-ai' : 'conf-low');

        return `
            <div class="adj-row conf-${escapeHtml(u.confidence)}" data-id="${escapeHtml(u.id)}">
                <div class="adj-row-head">
                    <strong>${escapeHtml(u.observed)}</strong>
                    <span class="adj-chain">${escapeHtml(chain)}</span>
                    <span class="adj-mark ${markClass}" title="${escapeHtml(u.confidence)}">${mark}</span>
                </div>
                <div class="adj-row-meta">
                    ${u.dependency?.modifiesNoun ? escapeHtml(u.dependency.modifiesNoun) : '?'} ·
                    ${genderSym} · ${escapeHtml(u.attributes.number || '?')} · ${escapeHtml(posLabel)}
                </div>
                <div class="adj-row-rule">${escapeHtml(u.morphology.rule || '')}</div>
                <div class="adj-row-explain">${escapeHtml(u.explanation)}</div>
            </div>
        `;
    }).join('');

    container.innerHTML = sentenceHtml + `<div class="adj-rows">${rowsHtml}</div>`;
}
