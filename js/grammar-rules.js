/* grammar-rules.js — Formation rules for French adjectives.
 *
 * Defines morphological transformations for:
 * - Feminine singular → plural
 * - Masculine singular → feminine singular → feminine plural
 * - Plural forms (masculine, feminine)
 *
 * Used by grammar-adjectives.js to explain observed forms pedagogically.
 * Preserves uncertainty when patterns are ambiguous.
 */

// Feminine formation rules: masculine singular → feminine singular
const FRENCH_FEMININE_RULES = [
    {
        name: 'regular_e',
        pattern: /^(.+)$/,
        condition: (masc) => !masc.endsWith('e') && !masc.endsWith('f') && !masc.endsWith('x') &&
                            !masc.endsWith('er') && !masc.endsWith('eux') && !masc.endsWith('ien') &&
                            !masc.endsWith('on'),
        transform: (masc) => masc + 'e',
        description: 'add -e (regular)',
        example: 'bleu → bleue'
    },
    {
        name: 'already_e',
        pattern: /^(.+)e$/,
        condition: (masc) => masc.endsWith('e'),
        transform: (masc) => masc,
        description: 'unchanged (already -e)',
        example: 'rouge → rouge'
    },
    {
        name: 'f_to_ve',
        pattern: /^(.+)f$/,
        condition: (masc) => masc.endsWith('f'),
        transform: (masc) => masc.slice(0, -1) + 've',
        description: '-f → -ve',
        example: 'sportif → sportive'
    },
    {
        // Checked BEFORE the more general "x_to_se" below: "-eux" is a
        // specific, far more common case (heureux, merveilleux...) and must
        // win over the generic "any -x" rule, or the reported rule text is
        // technically-not-wrong-but-misleadingly-generic for the learner.
        name: 'eux_to_euse',
        pattern: /^(.+)eux$/,
        condition: (masc) => masc.endsWith('eux'),
        transform: (masc) => masc.slice(0, -3) + 'euse',
        description: '-eux → -euse',
        example: 'merveilleux → merveilleuse'
    },
    {
        name: 'x_to_se',
        pattern: /^(.+)x$/,
        condition: (masc) => masc.endsWith('x') && !masc.endsWith('eux'),
        transform: (masc) => masc.slice(0, -1) + 'se',
        description: '-x → -se',
        example: 'doux → douce, faux → fausse'
    },
    {
        name: 'er_to_ere',
        pattern: /^(.+)er$/,
        condition: (masc) => masc.endsWith('er'),
        transform: (masc) => masc.slice(0, -2) + 'ère',
        description: '-er → -ère',
        example: 'premier → première'
    },
    {
        name: 'ier_to_iere',
        pattern: /^(.+)ier$/,
        condition: (masc) => masc.endsWith('ier'),
        transform: (masc) => masc.slice(0, -3) + 'ière',
        description: '-ier → -ière',
        example: 'dernier → dernière'
    },
    {
        name: 'ien_to_ienne',
        pattern: /^(.+)ien$/,
        condition: (masc) => masc.endsWith('ien'),
        transform: (masc) => masc.slice(0, -3) + 'ienne',
        description: '-ien → -ienne',
        example: 'ancien → ancienne'
    },
    {
        name: 'on_to_onne',
        pattern: /^(.+)on$/,
        condition: (masc) => masc.endsWith('on'),
        transform: (masc) => masc.slice(0, -2) + 'onne',
        description: '-on → -onne (with consonant doubling)',
        example: 'bon → bonne'
    },
    {
        name: 'et_to_ette',
        pattern: /^(.+)et$/,
        condition: (masc) => masc.endsWith('et'),
        transform: (masc) => masc.slice(0, -2) + 'ette',
        description: '-et → -ette (with consonant doubling)',
        example: 'discret → discrète'
    },
    {
        name: 'el_to_elle',
        pattern: /^(.+)el$/,
        condition: (masc) => masc.endsWith('el'),
        transform: (masc) => masc.slice(0, -2) + 'elle',
        description: '-el → -elle (with consonant doubling)',
        example: 'naturel → naturelle'
    },
    {
        name: 'al_to_ale',
        pattern: /^(.+)al$/,
        condition: (masc) => masc.endsWith('al'),
        transform: (masc) => masc.slice(0, -2) + 'ale',
        description: '-al → -ale',
        example: 'royal → royale'
    },
    {
        name: 'eau_to_elle',
        pattern: /^(.+)eau$/,
        condition: (masc) => masc.endsWith('eau'),
        transform: (masc) => masc.slice(0, -3) + 'elle',
        description: '-eau → -elle (with consonant doubling)',
        example: 'beau → belle'
    },
    {
        name: 'irregular',
        pattern: null,
        condition: null,
        transform: null,
        description: 'irregular (must be known)',
        example: 'blanc → blanche, fou → folle'
    }
];

// Plural rules: singular → plural (applies to both masculine and feminine)
const FRENCH_PLURAL_RULES = [
    {
        name: 'regular_s',
        pattern: /^(.+)$/,
        condition: (sing) => !sing.endsWith('s') && !sing.endsWith('x') && !sing.endsWith('z') &&
                            !sing.endsWith('al') && !sing.endsWith('eau'),
        transform: (sing) => sing + 's',
        description: 'add -s (regular)',
        example: 'bleu → bleus, bleue → bleues'
    },
    {
        name: 'already_s',
        pattern: /^(.+)s$/,
        condition: (sing) => sing.endsWith('s'),
        transform: (sing) => sing,
        description: 'unchanged (already -s)',
        example: 'heureux → heureux'
    },
    {
        name: 'already_x',
        pattern: /^(.+)x$/,
        condition: (sing) => sing.endsWith('x'),
        transform: (sing) => sing,
        description: 'unchanged (already -x)',
        example: 'roux → roux'
    },
    {
        name: 'already_z',
        pattern: /^(.+)z$/,
        condition: (sing) => sing.endsWith('z'),
        transform: (sing) => sing,
        description: 'unchanged (already -z)',
        example: 'gaz → gaz'
    },
    {
        name: 'al_to_aux',
        pattern: /^(.+)al$/,
        condition: (sing) => sing.endsWith('al') && !sing.endsWith('pal'),
        transform: (sing) => sing.slice(0, -2) + 'aux',
        description: '-al → -aux (masculine plural only)',
        example: 'royal → royaux'
    },
    {
        name: 'eau_to_eaux',
        pattern: /^(.+)eau$/,
        condition: (sing) => sing.endsWith('eau'),
        transform: (sing) => sing.slice(0, -3) + 'eaux',
        description: '-eau → -eaux',
        example: 'beau → beaux, belle → belles'
    }
];

// Irregular adjectives and invariant colors: single source of truth lives in
// js/grammar-adjectives.js (loaded before this file). Kept as local aliases
// so the rest of this file reads unchanged, but there is no duplicate data.
const FRENCH_IRREGULAR_ADJECTIVES = FRENCH_IRREGULAR_ADJECTIVE_LEXICON;
const FRENCH_INVARIANT_COLORS = FRENCH_INVARIANT_COLOR_WORDS;

/**
 * Determine which formation rule applies to a masculine singular adjective
 * @param {string} masc - masculine singular form
 * @returns {object} - rule object or null if ambiguous
 */
function getFeminineRule(masc) {
    // Check irregular first
    if (FRENCH_IRREGULAR_ADJECTIVES[masc]) {
        return { name: 'irregular', ...FRENCH_IRREGULAR_ADJECTIVES[masc] };
    }

    // Check regular rules in order (more specific first)
    for (const rule of FRENCH_FEMININE_RULES) {
        if (rule.condition && rule.condition(masc)) {
            return rule;
        }
    }

    // Ambiguous
    return { name: 'uncertain', description: 'pattern unclear' };
}

/**
 * Determine which plural rule applies
 * @param {string} sing - singular form
 * @returns {object} - rule object
 */
function getPluralRule(sing) {
    // Check irregular first
    const base = sing.endsWith('e') ? sing.slice(0, -1) : sing;
    if (FRENCH_IRREGULAR_ADJECTIVES[base]) {
        return { name: 'irregular', ...FRENCH_IRREGULAR_ADJECTIVES[base] };
    }

    // Check if it's an invariant color
    if (FRENCH_INVARIANT_COLORS.has(base)) {
        return { name: 'invariant_color', description: 'color adjective (invariant)', transform: (s) => s };
    }

    // Check regular rules
    for (const rule of FRENCH_PLURAL_RULES) {
        if (rule.condition && rule.condition(sing)) {
            return rule;
        }
    }

    return { name: 'uncertain', description: 'pattern unclear' };
}

/**
 * Generate all four forms (masc.sing, fem.sing, masc.pl, fem.pl) from any observed form
 * @param {string} observed - the form found in text
 * @param {string} gender - 'masculine' or 'feminine'
 * @param {string} number - 'singular' or 'plural'
 * @returns {object} - { masc_sing, fem_sing, masc_pl, fem_pl, rules, uncertain }
 */
function generateAdjektiveForms(observed, gender, number) {
    const result = {
        observed,
        gender,
        number,
        masc_sing: null,
        fem_sing: null,
        masc_pl: null,
        fem_pl: null,
        rules: {},
        uncertain: false
    };

    // Determine the base (masculine singular)
    // This is a heuristic and may need refinement
    let masc_sing = observed;

    // Reverse ONE transformation step (feminine marking) from a feminine
    // singular form to a masculine singular candidate. Shared by both the
    // fem.singular and fem.plural branches below so a plural feminine form
    // (e.g. "sportives") gets BOTH steps reversed, not just the plural "-s".
    function reverseFeminine(femSing) {
        if (femSing.endsWith('euse') && femSing.length > 4) return femSing.slice(0, -4) + 'eux';
        if (femSing.endsWith('ienne') && femSing.length > 5) return femSing.slice(0, -5) + 'ien';
        if (femSing.endsWith('ière') && femSing.length > 4) return femSing.slice(0, -4) + 'ier';
        if (femSing.endsWith('ère') && femSing.length > 3) return femSing.slice(0, -3) + 'er';
        if (femSing.endsWith('onne') && femSing.length > 4) return femSing.slice(0, -4) + 'on';
        if (femSing.endsWith('ette') && femSing.length > 4) return femSing.slice(0, -4) + 'et';
        if (femSing.endsWith('elle') && femSing.length > 4) {
            const elForm = femSing.slice(0, -4) + 'el';
            const eauForm = femSing.slice(0, -4) + 'eau';
            if (FRENCH_IRREGULAR_ADJECTIVES[eauForm]) return eauForm;
            return elForm;
        }
        if (femSing.endsWith('ale') && femSing.length > 3) return femSing.slice(0, -3) + 'al';
        if (femSing.endsWith('ve') && femSing.length > 2) return femSing.slice(0, -2) + 'f';
        if (femSing.endsWith('se') && femSing.length > 2) return femSing.slice(0, -2) + 'x';
        if (femSing.endsWith('e')) return femSing.slice(0, -1);
        return null; // no reversible pattern found
    }

    if (gender === 'feminine' && number === 'plural') {
        // fem.plural → fem.singular (strip "-s") → masc.singular (reverse feminine)
        const femSing = observed.endsWith('s') && !observed.endsWith('ss') ? observed.slice(0, -1) : observed;
        const reversed = reverseFeminine(femSing);
        if (reversed) masc_sing = reversed;
        else result.uncertain = true;
    } else if (gender === 'feminine' && number === 'singular') {
        const reversed = reverseFeminine(observed);
        if (reversed) masc_sing = reversed;
        else result.uncertain = true;
    } else if (number === 'plural') {
        // masculine plural → masculine singular: remove -s, -x, or -aux/-eaux
        if (observed.endsWith('aux') && observed.length > 3) masc_sing = observed.slice(0, -3) + 'al';
        else if (observed.endsWith('eaux') && observed.length > 4) masc_sing = observed.slice(0, -4) + 'eau';
        else if (observed.endsWith('s') && !observed.endsWith('ss')) masc_sing = observed.slice(0, -1);
        else {
            result.uncertain = true;
        }
    }

    // Now generate all four forms from masc_sing
    const fem_rule = getFeminineRule(masc_sing);
    result.rules.feminine = fem_rule;

    result.masc_sing = masc_sing;
    result.fem_sing = fem_rule.transform ? fem_rule.transform(masc_sing) : masc_sing;

    const masc_pl_rule = getPluralRule(result.masc_sing);
    const fem_pl_rule = getPluralRule(result.fem_sing);

    result.rules.masc_plural = masc_pl_rule;
    result.rules.fem_plural = fem_pl_rule;

    result.masc_pl = masc_pl_rule.transform ? masc_pl_rule.transform(result.masc_sing) : result.masc_sing;
    result.fem_pl = fem_pl_rule.transform ? fem_pl_rule.transform(result.fem_sing) : result.fem_sing;

    return result;
}

/**
 * Explain why a specific form is required in context
 * @param {string} observed - the form found in text
 * @param {object} nounInfo - { gender, number, lemma }
 * @returns {string} - Ukrainian explanation
 */
function explainAgreement(observed, nounInfo) {
    if (!nounInfo.gender || !nounInfo.number) {
        return 'прикметник не відповідає жодній іменнику';
    }

    const genderLabel = nounInfo.gender === 'feminine' ? 'жіночого роду' : 'чоловічого роду';
    const numberLabel = nounInfo.number === 'plural' ? 'множини' : 'однини';

    const noun = escapeHtml(nounInfo.lemma || nounInfo.text || 'іменнику');

    return `${noun} — ${genderLabel} ${numberLabel}, тому прикметник також приймає форму ${genderLabel} ${numberLabel}`;
}
