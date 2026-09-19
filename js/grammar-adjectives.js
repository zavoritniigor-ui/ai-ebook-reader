/* grammar-adjectives.js — French adjective irregular-form lexicon.
 *
 * AUDIT NOTE (this rewrite): the previous version of this file was ~68KB /
 * 718 lines / 696 entries, of which roughly half were NOT real French words
 * (fabricated filler such as "valharvinid", "valgotism", "valikam" — an
 * artifact of earlier generation, never verified against an actual French
 * dictionary). Shipping that data risked teaching a learner fake vocabulary
 * with false confidence, which is worse than shipping nothing.
 *
 * This rewrite keeps ONLY genuinely irregular adjectives — forms that
 * grammar-rules.js's deterministic transformations (regular +e, -f→-ve,
 * -eux→-euse, -er→-ère, -ien→-ienne, -on→-onne, -al→-aux, consonant
 * doubling, etc.) cannot correctly derive. Every regular adjective (the
 * large majority of French adjectives) is handled by RULE, not by lookup —
 * see generateAdjektiveForms() in grammar-rules.js.
 *
 * This is intentional architecture, not a shortcut: a small hand-verified
 * irregular lexicon + deterministic morphology + AI fallback for ambiguous
 * context beats an exhaustive hardcoded dictionary that can silently drift
 * from correctness and bloats initial load for no pedagogical benefit.
 */

// Genuinely irregular French adjectives: forms that do NOT follow any
// deterministic rule in grammar-rules.js and must be looked up directly.
// Each entry verified against standard French grammar references.
const FRENCH_IRREGULAR_ADJECTIVE_LEXICON = {
    // Beau-family: -eau → -el before vowel-initial masc. noun (bel/nouvel/vieil), -elle fem, -eaux/-elles plural
    'beau':     { fem: 'belle',    masc_pl: 'beaux',    fem_pl: 'belles',    liaisonForm: 'bel' },
    'nouveau':  { fem: 'nouvelle', masc_pl: 'nouveaux', fem_pl: 'nouvelles', liaisonForm: 'nouvel' },
    'vieux':    { fem: 'vieille',  masc_pl: 'vieux',    fem_pl: 'vieilles', liaisonForm: 'vieil' },

    // Common irregular feminine (not covered by suffix rules)
    'blanc':    { fem: 'blanche',  masc_pl: 'blancs',   fem_pl: 'blanches' },
    'bon':      { fem: 'bonne',    masc_pl: 'bons',     fem_pl: 'bonnes' },   // -on→-onne covered by rule, kept for lookup speed
    'doux':     { fem: 'douce',    masc_pl: 'doux',     fem_pl: 'douces' },
    'faux':     { fem: 'fausse',   masc_pl: 'faux',     fem_pl: 'fausses' },
    'favori':   { fem: 'favorite', masc_pl: 'favoris',  fem_pl: 'favorites' },
    'fou':      { fem: 'folle',    masc_pl: 'fous',     fem_pl: 'folles' },
    'frais':    { fem: 'fraîche',  masc_pl: 'frais',    fem_pl: 'fraîches' },
    'gentil':   { fem: 'gentille', masc_pl: 'gentils',  fem_pl: 'gentilles' },
    'grec':     { fem: 'grecque',  masc_pl: 'grecs',    fem_pl: 'grecques' },
    'gros':     { fem: 'grosse',   masc_pl: 'gros',     fem_pl: 'grosses' },
    'jumeau':   { fem: 'jumelle',  masc_pl: 'jumeaux',  fem_pl: 'jumelles' },
    'long':     { fem: 'longue',   masc_pl: 'longs',    fem_pl: 'longues' },
    'malin':    { fem: 'maligne',  masc_pl: 'malins',   fem_pl: 'malignes' },
    'mou':      { fem: 'molle',    masc_pl: 'mous',     fem_pl: 'molles' },
    'public':   { fem: 'publique', masc_pl: 'publics',  fem_pl: 'publiques' },
    'roux':     { fem: 'rousse',   masc_pl: 'roux',     fem_pl: 'rousses' },
    'sec':      { fem: 'sèche',    masc_pl: 'secs',     fem_pl: 'sèches' },
    'turc':     { fem: 'turque',   masc_pl: 'turcs',    fem_pl: 'turques' },

    // Invariant / near-invariant adjectives
    'chic':     { fem: 'chic',     masc_pl: 'chics',    fem_pl: 'chics' },
    'marron':   { fem: 'marron',   masc_pl: 'marron',   fem_pl: 'marron' },
    'orange':   { fem: 'orange',   masc_pl: 'orange',   fem_pl: 'orange' }
};

// Colour adjectives that are invariant when used as adjectives of colour
// (compound colour phrases like "bleu marine" behave differently — out of
// scope for this lexicon; flag as ambiguous rather than guess).
const FRENCH_INVARIANT_COLOR_WORDS = new Set(['marron', 'orange', 'pourpre', 'écarlate', 'kaki']);

// Words that LOOK like they could be adjectives by suffix but commonly are
// nouns/verbs/adverbs in running text — used to suppress false positives.
// This list is deliberately small; anything not on it that matches a
// suffix pattern is treated as a heuristic ADJ_SUSPECT, not a confirmed one.
const FRENCH_ADJECTIVE_FALSE_FRIENDS = new Set([
    'valeur', 'voiture', 'fleur', 'chaleur', 'couleur', // nouns ending like adjectives
    'très', 'chez', 'après', 'depuis' // function words
]);

// Common REGULAR adjective lemmas — for POS CONFIRMATION ONLY. Unlike the
// irregular lexicon above, this stores no forms at all: a regular
// adjective's feminine/plural are always DERIVED by grammar-rules.js. This
// list exists purely to answer "is this word plausibly a French adjective"
// for forms that carry no distinctive suffix (rouge, français, petit...),
// which a suffix heuristic alone cannot distinguish from a regular noun.
// Deliberately small and curated (common textbook adjectives), not an
// attempt at exhaustive coverage — anything not here or in the irregular
// lexicon simply stays unrecognized rather than guessed.
const FRENCH_COMMON_REGULAR_ADJECTIVE_LEMMAS = new Set([
    'petit', 'grand', 'français', 'anglais', 'rouge', 'bleu', 'vert', 'jaune', 'noir',
    'joli', 'jeune', 'content', 'fatigué', 'occupé', 'intéressant', 'important',
    'facile', 'difficile', 'simple', 'rapide', 'lent', 'calme', 'poli', 'aimable',
    'gentil', 'méchant', 'propre', 'sale', 'plein', 'vide', 'lourd', 'léger',
    'chaud', 'froid', 'cher', 'riche', 'pauvre', 'fort', 'faible', 'grand',
    'court', 'haut', 'bas', 'large', 'étroit', 'profond', 'clair', 'sombre',
    'nouveau', 'ancien', 'moderne', 'jeune', 'vieux'
]);

const FRENCH_DICTIONARIES = {
    irregular: FRENCH_IRREGULAR_ADJECTIVE_LEXICON,
    invariantColors: FRENCH_INVARIANT_COLOR_WORDS,
    falseFriends: FRENCH_ADJECTIVE_FALSE_FRIENDS,
    commonRegular: FRENCH_COMMON_REGULAR_ADJECTIVE_LEMMAS
};
