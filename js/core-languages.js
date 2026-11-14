/* core-languages.js — LANGUAGE_CONFIG and flags, grammar language config, tolerant JSON parsing of AI replies,
 * stored/system language choice. Split out of core.js on 2026-11-14 without changes. */
// One registry drives selectors, translation/AI language names and TTS locales.
// Browser-provided translation and speech engines may still report a pair/voice
// unavailable; callers keep their existing graceful fallback behavior.
const LANGUAGE_CONFIG = {
    uk: { locale: 'uk-UA', aiName: 'українською', promptName: 'Ukrainian' },
    en: { locale: 'en-US', aiName: 'англійською', promptName: 'English' },
    fr: { locale: 'fr-FR', aiName: 'французькою', promptName: 'French' },
    ru: { locale: 'ru-RU', aiName: 'російською', promptName: 'Russian' },
    zh: { locale: 'zh-CN', aiName: 'китайською (спрощеною)', promptName: 'Simplified Chinese' },
    ko: { locale: 'ko-KR', aiName: 'корейською', promptName: 'Korean' },
    hi: { locale: 'hi-IN', aiName: 'гінді', promptName: 'Hindi' },
    ga: { locale: 'ga-IE', aiName: 'ірландською', promptName: 'Irish' },
    // Німецька — лише МОВА ПЕРЕКЛАДУ та озвучення (targetOnly): не стає мовою меню, граматичного розбору чи правил.
    de: { locale: 'de-DE', aiName: 'німецькою', promptName: 'German', targetOnly: true },
    // Іспанська — і мова перекладу, і мова меню (рядки меню — js/i18n-es.js).
    es: { locale: 'es-ES', aiName: 'іспанською', promptName: 'Spanish' },
    // Перська (фарсі) — лише МОВА ПЕРЕКЛАДУ та озвучення (targetOnly), письмо справа наліво (owner, 2026-10-26).
    fa: { locale: 'fa-IR', aiName: 'перською (фарсі)', promptName: 'Persian (Farsi)', targetOnly: true }
};
// Прапорець країни мови: його бачить кожен список мов у меню (owner, 2026-10-26). Без прапорця — порожньо.
const LANG_FLAGS = { uk: '🇺🇦', en: '🇬🇧', fr: '🇫🇷', ru: '🇷🇺', zh: '🇨🇳', ko: '🇰🇷', hi: '🇮🇳', ga: '🇮🇪', de: '🇩🇪', es: '🇪🇸', fa: '🇮🇷',
    it: '🇮🇹', pt: '🇵🇹', nl: '🇳🇱', pl: '🇵🇱', ja: '🇯🇵', ar: '🇸🇦', tr: '🇹🇷', cs: '🇨🇿', sv: '🇸🇪', fi: '🇫🇮', da: '🇩🇰', no: '🇳🇴', nb: '🇳🇴',
    el: '🇬🇷', hu: '🇭🇺', ro: '🇷🇴', bg: '🇧🇬', sk: '🇸🇰', sl: '🇸🇮', hr: '🇭🇷', et: '🇪🇪', lv: '🇱🇻', lt: '🇱🇹', he: '🇮🇱', id: '🇮🇩', vi: '🇻🇳',
    th: '🇹🇭', ms: '🇲🇾', ca: '🇪🇸', sq: '🇦🇱', is: '🇮🇸', mt: '🇲🇹', sr: '🇷🇸', bs: '🇧🇦', mk: '🇲🇰', be: '🇧🇾', kk: '🇰🇿' };
function langFlag(code) { return LANG_FLAGS[String(code || '').slice(0, 2).toLowerCase()] || ''; }
// Мови меню / вивчення (мають повний набір рядків і граматичні налаштування).
const SUPPORTED_LANGUAGE_CODES = Object.keys(LANGUAGE_CONFIG).filter(code => !LANGUAGE_CONFIG[code].targetOnly);
// Мови, якими можна перекладати й озвучувати переклад (+ німецька та іспанська); голоси для них теж підбираються й запам'ятовуються.
const TARGET_LANGUAGE_CODES = Object.keys(LANGUAGE_CONFIG);

// Language-aware grammar configuration for the redesigned Grammar panel
// (Verbs/Adjectives contextual-learning modes). One entry per SUPPORTED_LANGUAGE_CODES
// member. Each entry declares:
//   - labels: the Verbs/Adjectives tab text IN THAT LANGUAGE ITSELF (not the interface
//     language — the panel names its own subject matter, e.g. "Verbes" for French text
//     no matter what the reader's UI language is set to);
//   - verb/adjective.features: the ONLY grammatical dimensions the AI is allowed to
//     report for that part of speech in that language. This is the actual mechanism
//     behind "don't show meaningless categories" (task section 5/7): normalizeGrammar-
//     Features() strips anything not in this list before it ever reaches the UI, so a
//     language with no grammatical gender can never get a fabricated gender badge;
//   - verb.tenses: the enumerated tense/mood list driving the Verbs-mode control bar
//     (replaces the old hardcoded EN/FR-only TENSE_SYSTEMS — every other language used
//     to silently reuse the English tense bar, which was simply wrong for its grammar);
//   - verb.persons / adjective.forms: the paradigm slots requested when a learner clicks
//     a specific lemma (conjugation table / agreement grid).
// A language with no explicit entry falls back to DEFAULT_GRAMMAR_LANG rather than
// crashing; callers that must NOT silently analyse a language with another language's
// categories check hasGrammarConfig() first.
const GRAMMAR_LANG_CONFIG = {
    en: {
        labels: { verbs: 'Verbs', adjectives: 'Adjectives' },
        verb: {
            features: ['tense', 'aspect', 'person', 'number', 'auxiliary'],
            // Features whose bare value is not self-explanatory on a chip ("has" alone could be anything):
            // shown as "label: value", in the source language's own term.
            featureLabels: { auxiliary: 'auxiliary' },
            tenses: [
                { id: 'present_simple', label: 'Present Simple' },
                { id: 'present_continuous', label: 'Present Continuous' },
                { id: 'past_simple', label: 'Past Simple' },
                { id: 'past_continuous', label: 'Past Continuous' },
                { id: 'present_perfect', label: 'Present Perfect' },
                { id: 'past_perfect', label: 'Past Perfect' },
                { id: 'future_simple', label: 'Future Simple' },
                { id: 'conditional', label: 'Conditional' }
            ],
            persons: ['I', 'you', 'he / she / it', 'we', 'you (plural)', 'they'],
            // Regular English inflection only ever adds one of these to a stem (walk+ed,
            // stud+ies, runn+ing); a "stem/ending" split ending in anything else is bogus.
            endings: ['s', 'es', 'ed', 'd', 'ing', 'ies', 'ied'],
            // When true, a conjugation table the model returns with an analysis must contain
            // the analysed surface form in one of its rows, or the table is discarded.
            verifyForms: true,
            // Irregular verbs have no teachable stem+ending split (went, taken, been).
            irregularRe: /^(?:be|have|do|go|say|get|make|know|think|take|see|come|give|find|tell|become|leave|feel|put|bring|begin|keep|hold|write|stand|hear|let|mean|set|meet|run|pay|sit|speak|lie|lead|read|grow|lose|fall|send|build|understand|draw|break|spend|cut|rise|drive|buy|wear|choose|eat|drink|sing|swim|fly|forget|sleep|wake|win|throw|catch|teach|sell|fight|hit|hide|shake|steal|tear|bear|ring|sink|swing|shoot|shut|split|spread|strike|swear|sweep|feed|flee|forgive|freeze|hang|lay|lend|ride|seek|show|shrink|slide|stick|sting|bite|blow|bind|bleed|breed|burst|cast|cling|creep|deal|dig|dive|fit|kneel|leap|overcome|undo|weave|withdraw|can|could|may|might|must|shall|should|will|would|ought)$/i,
            auxiliaries: ['am', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must'],
            promptNote: 'English: the lemma is the bare base form without "to" (walk, be, give up). When an auxiliary and its main verb are ADJACENT in the text (has been eating, did not know, will go) use the whole contiguous group as "surface", otherwise the main verb alone with features.auxiliary. A phrasal verb whose particle is adjacent (give up) uses both words as surface. Never tag a gerund or participle that is only a noun or a plain adjective as a verb. Explain WHY this tense/aspect is used here (e.g. present perfect for a past action with present relevance).'
        },
        adjective: {
            features: ['degree'], forms: [],
            promptNote: 'English adjectives do not agree with the noun. Give the plain positive form as lemma (big for bigger/biggest) and report features.degree only for a comparative or superlative form. A participle counts as an adjective only when it modifies a noun or follows a linking verb (a tired man, I am tired). Set "agreesWith" to the noun or pronoun the adjective describes.'
        }
    },
    fr: {
        // Dictionary forms are lower case, but headings in books are ALL CAPS ("PRÉPARER LES TRAVAUX"): a model echoing
        // the capitals as the lemma must not create a second card next to "préparer".
        lemmaCase: 'lower',
        labels: { verbs: 'Verbes', adjectives: 'Adjectifs' },
        verb: {
            features: ['tense', 'mood', 'person', 'number', 'auxiliary', 'participle'],
            // "être" / "allé" alone beside "3e personne" do not say WHICH role they play in a compound tense.
            featureLabels: { auxiliary: 'auxiliaire', participle: 'participe' },
            // Display order only: retain tenses[0] as the dictionary lookup default.
            timeline: {
                label: 'Passé ← Présent → Futur',
                past: ['plus_que_parfait', 'indicatif_imparfait', 'indicatif_passe_compose'],
                present: ['indicatif_present'], future: ['indicatif_futur']
            },
            tenses: [
                { id: 'indicatif_present', label: 'Présent' },
                { id: 'indicatif_imparfait', label: 'Imparfait' },
                { id: 'indicatif_passe_compose', label: 'Passé composé' },
                { id: 'indicatif_futur', label: 'Futur simple' },
                { id: 'conditionnel_present', label: 'Conditionnel' },
                { id: 'subjonctif_present', label: 'Subjonctif' },
                { id: 'imperatif', label: 'Impératif' },
                { id: 'plus_que_parfait', label: 'Plus-que-parfait' }
            ],
            persons: ['je', 'tu', 'il / elle / on', 'nous', 'vous', 'ils / elles'],
            // A French dictionary form is an infinitive: -er, -ir, -re or -oir, optionally
            // reflexive (se lever, s'asseoir, s'en aller). A finite form given as the lemma
            // (parlait, mange) is a model error and the item is rejected.
            verifyForms: true,
            lemmaRe: /^(?:s['’]|se\s+)?(?:en\s+)?\p{L}+(?:er|ir|re|oir)$/u,
            // What an infinitive ends with: parl|er, fin|ir, vend|re. The rest is the stem whose endings a
            // conjugation table colours (conjugationStem); a language without this list uses the lemma itself.
            infinitiveEndings: ['oir', 'er', 'ir', 're'],
            // Which letters of a conjugated form are its ENDING (coloured .verb-ending in the conjugation tables; verbEndingRanges in grammar-svo.js).
            // Personal endings are listed in the order je tu il nous vous ils; the LONGEST one a form really ends with is marked, so an irregular verb
            // gets its ending wherever it follows the pattern (fer|ai, ét|ais, f|ont) and nothing where it does not (sommes). Présent and passé simple
            // depend on the verb's group (1 = -er, 2 = finir, 3 = the rest), which is read from the forms themselves. tenseKeys name a tense from its
            // label or id (accent-stripped); 'compound' tenses mark the past participle after the auxiliary instead.
            endingRules: {
                tenseKeys: [['passe_simple', /passe[- ]simple/], ['compound', /compose|plus[- ]?que[- ]?parfait|anterieur|(?:conditionnel|subjonctif)[- ]passe/],
                    ['imparfait', /imparfait/], ['futur', /futur/], ['conditionnel', /conditionnel/], ['subjonctif', /subjonctif/], ['imperatif', /imperatif/], ['present', /present/]],
                tenses: {
                    present: { 1: [['e'], ['es'], ['e'], ['ons'], ['ez'], ['ent']], 2: [['is'], ['is'], ['it'], ['issons'], ['issez'], ['issent']],
                               3: [['s', 'x'], ['s', 'x'], ['t'], ['ons'], ['ez', 'tes'], ['ent', 'ont']] },
                    passe_simple: { 1: [['ai'], ['as'], ['a'], ['âmes'], ['âtes'], ['èrent']], 2: [['is'], ['is'], ['it'], ['îmes'], ['îtes'], ['irent']],
                                    3: [['us'], ['us'], ['ut'], ['ûmes'], ['ûtes'], ['urent']] },
                    imparfait: [['ais'], ['ais'], ['ait'], ['ions'], ['iez'], ['aient']],
                    futur: [['ai'], ['as'], ['a'], ['ons'], ['ez'], ['ont']],
                    conditionnel: [['ais'], ['ais'], ['ait'], ['ions'], ['iez'], ['aient']],
                    subjonctif: [['e'], ['es'], ['e'], ['ions'], ['iez'], ['ent']],
                    imperatif: { 1: [null, ['e'], null, ['ons'], ['ez'], null], 2: [null, ['is'], null, ['issons'], ['issez'], null],
                                 3: [null, ['s', 'x'], null, ['ons'], ['ez', 'tes'], null] }
                },
                irregularPresentRe: /^(?:être|avoir|aller)$/u,   // the present of these follows the pattern only from two-letter endings on (avons, allez, vont); suis, vais, ai have none
                // A past participle's ending, the longest that fits: parl|é, fin|i, vend|u, pr|is, ouv|ert, fa|it, e|u, d|û.
                participleEndings: ['ertes', 'erte', 'erts', 'ert', 'ites', 'ite', 'its', 'it', 'ées', 'ée', 'és', 'é', 'ies', 'ie', 'is', 'i', 'ues', 'ue', 'us', 'u', 'û']
            },
            // Irregular verbs (and their prefixed derivatives) have no honest "stem + ending"
            // split — nous sommes, ils vont, il fait — so any split is discarded.
            irregularRe: /(?:^|[\s'’])(?:être|avoir|aller)$|(?:aire|dire|voir|loir|seoir|venir|tenir|mettre|prendre|duire|struire|cevoir|courir|mourir|vivre|suivre|rire|crire|lire|croire|boire|aître|aitre|aindre|eindre|oindre|vaincre|battre|partir|sortir|dormir|servir|sentir|mentir|cueillir|frir|vrir|clure|luire|nuire|coudre|moudre|soudre|fuir|vêtir|quérir|bouillir|saillir|haïr)$/u,
            // Every legitimate French verb ending (present, imparfait, futur, conditionnel,
            // subjonctif, impératif, passé simple, participles). A stem/ending split whose
            // ending is not one of these is not a real, teachable pattern.
            endings: ['e', 'es', 'ent', 'ons', 'ez', 'ai', 'as', 'a', 'ont', 'ais', 'ait', 'aient', 'ions', 'iez', 'âmes', 'âtes', 'èrent',
                'is', 'it', 'issons', 'issez', 'issent', 'issais', 'issait', 'issions', 'issiez', 'issaient', 'isse', 'isses', 'issant', 'ant',
                's', 't', 'd', 'x', 'é', 'ée', 'és', 'ées', 'i', 'ie', 'is', 'ies', 'u', 'ue', 'us', 'ues', 'îmes', 'îtes', 'irent', 'ut', 'ûmes', 'ûtes', 'urent',
                'rai', 'ras', 'ra', 'rons', 'rez', 'ront', 'rais', 'rait', 'rions', 'riez', 'raient',
                'erai', 'eras', 'era', 'erons', 'erez', 'eront', 'erais', 'erait', 'erions', 'eriez', 'eraient',
                'irai', 'iras', 'ira', 'irons', 'irez', 'iront', 'irais', 'irait', 'irions', 'iriez', 'iraient',
                'ent', 'er', 'ir', 're', 'îs', 'ît', 'ât'],
            // First token of a compound-tense group (a mangé, est allée, avait fini, aurait pu).
            auxiliaries: ['ai', 'as', 'a', 'avons', 'avez', 'ont', 'avais', 'avait', 'avions', 'aviez', 'avaient', 'aurai', 'auras', 'aura', 'aurons', 'aurez', 'auront',
                'aurais', 'aurait', 'aurions', 'auriez', 'auraient', 'aie', 'aies', 'ait', 'ayons', 'ayez', 'aient', 'eus', 'eut', 'eûmes', 'eûtes', 'eurent',
                'suis', 'es', 'est', 'sommes', 'êtes', 'sont', 'étais', 'était', 'étions', 'étiez', 'étaient', 'serai', 'seras', 'sera', 'serons', 'serez', 'seront',
                'serais', 'serait', 'serions', 'seriez', 'seraient', 'sois', 'soit', 'soyons', 'soyez', 'soient', 'fus', 'fut', 'fûmes', 'fûtes', 'furent'],
            promptNote: 'French verbs: the lemma is the INFINITIVE (parler, être, se lever). For a compound tense (passé composé, plus-que-parfait, futur antérieur, conditionnel passé, subjonctif passé…) whose auxiliary and participle are ADJACENT in the text use the whole group as "surface" (e.g. "a mangé", "est allée") and set features.auxiliary to the auxiliary\'s infinitive (avoir / être) and features.participle to the participle; if a pronoun or adverb separates them, use the past participle alone as surface. Report features.mood in standard French terms (indicatif, subjonctif, conditionnel, impératif) and person as "1re / 2e / 3e personne". Explain WHY this tense or mood is used here (imparfait for a habitual or background past action, passé composé for a completed event, subjonctif after "il faut que" / "bien que", agreement of a participle with a preceding direct object or with the subject after être). For irregular verbs (être, avoir, aller, faire, pouvoir, vouloir, savoir, venir, prendre, mettre, dire, voir…) set stemBreakdown to null.'
        },
        adjective: {
            features: ['gender', 'number'],
            forms: [
                { id: 'ms', label: 'masculin singulier' }, { id: 'fs', label: 'féminin singulier' },
                { id: 'mp', label: 'masculin pluriel' }, { id: 'fp', label: 'féminin pluriel' },
                { id: 'ms_vowel', label: 'masculin sing. devant voyelle' }
            ],
            // Slot ids the regular-transformation display is derived from: each derived
            // form is described relative to the base (petit → petite: +e; heureux → heureuse:
            // −x +se), computed from the grid itself rather than asserted by the model.
            paradigm: { base: 'ms', derived: ['fs', 'mp', 'fp'] },
            // The agreement grid the model returns must contain the analysed surface form,
            // and its masculine-singular cell must be the lemma, or the grid is discarded.
            verifyForms: true,
            // The only five adjectives with a distinct masculine form before a vowel or
            // mute h (un bel homme, un nouvel ami, un vieil arbre, un fol espoir, un mol effort).
            specialForms: { ms_vowel: { beau: 'bel', nouveau: 'nouvel', vieux: 'vieil', fou: 'fol', mou: 'mol' } },
            promptNote: 'French adjectives: the lemma is the MASCULINE SINGULAR (petit, heureux, beau, nouveau). features.gender and features.number describe THIS exact form. Set "agreesWith" to the noun or pronoun in the sentence the adjective modifies, copied exactly. The "forms" grid MUST contain this exact surface and follow French orthography: regular +e / +s / +es; and the irregular patterns heureux→heureuse, blanc→blanche, beau→belle/beaux, vieux→vieille, nouveau→nouvelle/nouveaux, cher→chère, doux→douce, long→longue, favori→favorite, actif→active, bon→bonne, gentil→gentille; an invariable adjective (marron, orange, rouge in the masculine/feminine singular) repeats the same string. Add "ms_vowel" ONLY for beau→bel, nouveau→nouvel, vieux→vieil, fou→fol, mou→mol — never for any other adjective. Explain WHY this form: which noun it agrees with, that noun\'s gender and number, and (when it matters) why the adjective precedes or follows the noun.'
        }
    },
    uk: {
        labels: { verbs: 'Дієслова', adjectives: 'Прикметники' },
        verb: {
            features: ['aspect', 'tense', 'mood', 'person', 'number', 'gender'],
            tenses: [
                { id: 'present', label: 'Теперішній час' },
                { id: 'past', label: 'Минулий час' },
                { id: 'future', label: 'Майбутній час' },
                { id: 'imperative', label: 'Наказовий спосіб' },
                { id: 'conditional', label: 'Умовний спосіб' }
            ],
            persons: ['я', 'ти', 'він / вона / воно', 'ми', 'ви', 'вони']
        },
        adjective: {
            features: ['gender', 'number', 'case'],
            forms: [
                { id: 'nom_ms', label: 'чол. рід, називний' }, { id: 'nom_fs', label: 'жін. рід, називний' },
                { id: 'nom_ns', label: 'сер. рід, називний' }, { id: 'nom_pl', label: 'множина, називний' }
            ]
        }
    },
    ru: {
        labels: { verbs: 'Глаголы', adjectives: 'Прилагательные' },
        verb: {
            features: ['aspect', 'tense', 'mood', 'person', 'number', 'gender'],
            tenses: [
                { id: 'present', label: 'Настоящее время' },
                { id: 'past', label: 'Прошедшее время' },
                { id: 'future', label: 'Будущее время' },
                { id: 'imperative', label: 'Повелительное наклонение' },
                { id: 'conditional', label: 'Условное наклонение' }
            ],
            persons: ['я', 'ты', 'он / она / оно', 'мы', 'вы', 'они']
        },
        adjective: {
            features: ['gender', 'number', 'case'],
            forms: [
                { id: 'nom_ms', label: 'муж. род, именительный' }, { id: 'nom_fs', label: 'жен. род, именительный' },
                { id: 'nom_ns', label: 'ср. род, именительный' }, { id: 'nom_pl', label: 'мн. число, именительный' }
            ]
        }
    },
    zh: {
        labels: { verbs: '动词', adjectives: '形容词' },
        verb: {
            features: ['aspect'],
            tenses: [
                { id: 'default', label: '一般' }, { id: 'le', label: '了（完成）' },
                { id: 'zhe', label: '着（进行/持续）' }, { id: 'guo', label: '过（经历）' }
            ],
            persons: []
        },
        adjective: { features: ['degree'], forms: [] }
    },
    ko: {
        labels: { verbs: '동사', adjectives: '형용사' },
        verb: {
            features: ['tense', 'honorific'],
            tenses: [
                { id: 'present', label: '현재' }, { id: 'past', label: '과거' }, { id: 'future', label: '미래' }
            ],
            persons: []
        },
        adjective: { features: ['tense', 'honorific'], forms: [] }
    },
    hi: {
        labels: { verbs: 'क्रिया', adjectives: 'विशेषण' },
        verb: {
            features: ['tense', 'aspect', 'gender', 'number', 'person'],
            tenses: [
                { id: 'present', label: 'वर्तमान काल' }, { id: 'past', label: 'भूत काल' }, { id: 'future', label: 'भविष्य काल' }
            ],
            persons: ['मैं', 'तुम', 'वह', 'हम', 'आप', 'वे']
        },
        adjective: {
            features: ['gender', 'number'],
            forms: [
                { id: 'ms', label: 'पुल्लिंग एकवचन' }, { id: 'fs', label: 'स्त्रीलिंग एकवचन' },
                { id: 'mp', label: 'पुल्लिंग बहुवचन' }, { id: 'fp', label: 'स्त्रीलिंग बहुवचन' }
            ]
        }
    },
    es: {
        lemmaCase: 'lower',
        labels: { verbs: 'Verbos', adjectives: 'Adjetivos' },
        verb: {
            features: ['tense', 'mood', 'person', 'number'],
            tenses: [
                { id: 'presente', label: 'Presente' }, { id: 'preterito_indefinido', label: 'Pretérito indefinido' },
                { id: 'preterito_imperfecto', label: 'Pretérito imperfecto' }, { id: 'preterito_perfecto', label: 'Pretérito perfecto' },
                { id: 'futuro', label: 'Futuro' }, { id: 'condicional', label: 'Condicional' },
                { id: 'subjuntivo_presente', label: 'Presente de subjuntivo' }, { id: 'imperativo', label: 'Imperativo' }
            ],
            persons: ['yo', 'tú', 'él / ella / usted', 'nosotros', 'vosotros', 'ellos / ellas / ustedes'],
            promptNote: 'Spanish: the lemma is the infinitive (-ar, -er, -ir, optionally reflexive: levantarse). A compound tense (he comido, había dicho) or a periphrasis written together (voy a ir, estoy leyendo) uses the whole contiguous group as "surface".'
        },
        adjective: {
            features: ['gender', 'number', 'degree'],
            forms: [
                { id: 'ms', label: 'masculino singular' }, { id: 'fs', label: 'femenino singular' },
                { id: 'mp', label: 'masculino plural' }, { id: 'fp', label: 'femenino plural' }
            ]
        }
    },
    ga: {
        labels: { verbs: 'Briathra', adjectives: 'Aidiachtaí' },
        verb: {
            features: ['tense', 'mood', 'person', 'number'],
            tenses: [
                { id: 'present', label: 'Aimsir Láithreach' }, { id: 'past', label: 'Aimsir Chaite' },
                { id: 'future', label: 'Aimsir Fháistineach' }, { id: 'conditional', label: 'Modh Coinníollach' }
            ],
            persons: ['mé', 'tú', 'sé / sí', 'muid', 'sibh', 'siad']
        },
        adjective: {
            features: ['gender', 'number'],
            forms: [
                { id: 'ms', label: 'firinscneach uatha' }, { id: 'fs', label: 'baininscneach uatha' },
                { id: 'pl', label: 'iolra' }
            ]
        }
    }
};
const DEFAULT_GRAMMAR_LANG = 'en';
function grammarConfigFor(langCode) {
    return GRAMMAR_LANG_CONFIG[langCode] || GRAMMAR_LANG_CONFIG[DEFAULT_GRAMMAR_LANG];
}
// The actual fix for fabricated/meaningless grammar categories (task section 7): the
// model may propose any key, but only dimensions this language's config lists for this
// part of speech ever survive to the UI. Also drops null/empty values outright.
function normalizeGrammarFeatures(pos, langCode, rawFeatures) {
    const cfg = grammarConfigFor(langCode)[pos === 'adjective' ? 'adjective' : 'verb'];
    const out = {};
    if (rawFeatures && typeof rawFeatures === 'object') {
        for (const key of cfg.features) {
            const v = rawFeatures[key];
            if (v === undefined || v === null || v === '') continue;
            if (typeof v === 'string' || typeof v === 'number') out[key] = v;
        }
    }
    return out;
}

// The model is asked to echo the language of the text it analysed. Accepts the bare code, a
// regional tag ("fr-FR"), or the language's English name ("French", "Simplified Chinese").
function languageEchoMatches(echoed, langCode) {
    const value = String(echoed == null ? '' : echoed).trim().toLowerCase();
    const name = (LANGUAGE_CONFIG[langCode]?.promptName || '').toLowerCase();
    return value.slice(0, 2) === langCode || (value.length >= 4 && (value === name || name.includes(value)));
}

function hasGrammarConfig(langCode) {
    return Object.prototype.hasOwnProperty.call(GRAMMAR_LANG_CONFIG, langCode);
}

// NFC + collapsed whitespace: PDF text layers deliver decomposed diacritics (e + U+0301
// instead of é) and line-break whitespace, and either makes an otherwise exact surface
// form fail a literal match. Grammar and Practice normalise BOTH sides the same way.
function normalizeGrammarText(text) {
    return String(text == null ? '' : text).normalize('NFC').replace(/\s+/g, ' ').trim();
}

// Word-boundary-aware occurrence search. A plain includes()/indexOf() treats "is" as
// present inside "this" and French "est" as present inside "reste", which both fabricates
// a match and highlights the wrong span. Boundaries are enforced only for
// scripts that separate words with spaces; Han/Hangul run words together, so there a
// plain substring match is the only meaningful one. A surface whose own edge is not a
// letter (e.g. "qu'") skips the check on that edge.
const GRAMMAR_SPACED_SCRIPT_RE = /[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Devanagari}]/u;
const GRAMMAR_WORD_CHAR_RE = /[\p{L}\p{M}\p{N}]/u;
function findSurfaceOccurrences(text, surface) {
    const found = [];
    if (!text || !surface) return found;
    const strict = GRAMMAR_SPACED_SCRIPT_RE.test(surface);
    const firstChar = Array.from(surface)[0], lastChar = Array.from(surface).pop();
    const checkBefore = strict && GRAMMAR_WORD_CHAR_RE.test(firstChar);
    const checkAfter = strict && GRAMMAR_WORD_CHAR_RE.test(lastChar);
    let from = 0;
    for (;;) {
        const idx = text.indexOf(surface, from);
        if (idx === -1) break;
        from = idx + 1;
        if (checkBefore && idx > 0 && GRAMMAR_WORD_CHAR_RE.test(Array.from(text.slice(Math.max(0, idx - 2), idx)).pop())) continue;
        const end = idx + surface.length;
        if (checkAfter && end < text.length && GRAMMAR_WORD_CHAR_RE.test(String.fromCodePoint(text.codePointAt(end)))) continue;
        found.push(idx);
    }
    return found;
}

// ---- Tolerant JSON extraction for structured AI replies ----------------------------------------------
// The AI is asked for bare JSON but real models routinely: wrap it in a code fence or a sentence of
// preamble/epilogue, leave a trailing comma, put a raw newline inside a string, and — most damaging —
// write an unescaped double quote INSIDE a string value (an `explanation` quoting the French word it
// explains). Strict JSON.parse then rejects the WHOLE reply for one cosmetic slip. Only FORMATTING is
// repaired here; every repaired value still goes through the same semantic validation as any other
// (a fabricated surface/lemma/sentence is still rejected). A reply that is cut off mid-way (token cap) is
// closed at the last COMPLETE element so the complete items before the cut survive.
//
// scanAiJson(text, start) walks the text once, string-aware, and returns
//   { text: repaired JSON of the root value (only if complete), complete, salvage: repaired JSON closed at the
//     last complete element (when incomplete), notes: [repairs applied] }.
function scanAiJson(src, start) {
    const out = [], notes = new Set(), stack = [];   // stack entries: { type:'{'|'[', expectKey:boolean }
    let inStr = false, isKey = false, i = start, safe = null, lastSig = -1;
    const n = src.length;
    const top = () => stack[stack.length - 1];
    // A safe point is where the reply may be closed if it is cut off. ONLY at element boundaries: after a complete
    // member of a root-level object, or a complete element of an array. A half-built array element (an item cut
    // mid-way) is not an item and is never kept.
    const markSafe = () => {
        if (!stack.length) return;
        if (top().type === '[' || stack.every(e => e.type === '{')) safe = { len: out.length, stack: stack.map(e => e.type) };
    };
    const emit = ch => { out.push(ch); if (!inStr && !/\s/.test(ch)) lastSig = out.length - 1; };
    const valueDone = () => { const t = top(); if (t && t.type === '{') t.expectKey = false; };
    // What may legitimately follow a string's closing quote: , } ] : (and end of text). After a comma the next
    // significant char must start another member/value, otherwise the quote was an inner one.
    const closesString = j => {
        while (j < n && /\s/.test(src[j])) j++;
        if (j >= n) return true;
        const c = src[j];
        if (c === '}' || c === ']' || c === ':') return true;
        if (c !== ',') return false;
        j++;
        while (j < n && /\s/.test(src[j])) j++;
        if (j >= n) return true;
        const d = src[j];
        if (d === '"' || d === '{' || d === '[' || d === '}' || d === ']' || d === '-' || (d >= '0' && d <= '9')) return true;
        if (d === '/' && (src[j + 1] === '/' || src[j + 1] === '*')) return true;   // a comment follows
        return /^(?:true|false|null)\b/.test(src.slice(j, j + 6));
    };
    while (i < n) {
        const ch = src[i];
        if (inStr) {
            if (ch === '\\') {
                const nx = src[i + 1];
                if (nx === undefined) { i++; break; }
                if ('"\\/bfnrtu'.includes(nx)) { out.push(ch, nx); } else { out.push(nx); notes.add('bad_escape'); }
                i += 2; continue;
            }
            if (ch === '"') {
                if (closesString(i + 1)) {
                    inStr = false; out.push('"');
                    if (isKey) { top().expectKey = false; top().awaitColon = true; } else { valueDone(); markSafe(); }
                } else { out.push('\\', '"'); notes.add('inner_quotes'); }
                i++; continue;
            }
            const code = ch.charCodeAt(0);
            if (code < 0x20) { out.push(ch === '\n' ? '\\n' : ch === '\t' ? '\\t' : ch === '\r' ? '\\r' : '\\u' + code.toString(16).padStart(4, '0')); notes.add('control_chars'); i++; continue; }
            out.push(ch); i++; continue;
        }
        if (/\s/.test(ch)) { out.push(ch); i++; continue; }
        if (ch === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; notes.add('comments'); continue; }
        if (ch === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e === -1 ? n : e + 2; notes.add('comments'); continue; }
        if (ch === '"') { inStr = true; isKey = !!(top() && top().type === '{' && top().expectKey); emit(ch); i++; continue; }
        if (ch === '{' || ch === '[') { stack.push({ type: ch, expectKey: ch === '{' }); emit(ch); i++; continue; }
        if (ch === '}' || ch === ']') {
            const t = top();
            if (!t || t.type !== (ch === '}' ? '{' : '[')) return { text: null, complete: false, salvage: null, notes: [...notes], error: 'mismatched_bracket' };
            if (out[lastSig] === ',') { out.splice(lastSig, 1); lastSig = -1; notes.add('trailing_comma'); }
            stack.pop(); emit(ch);
            if (!stack.length) return { text: out.join(''), complete: true, salvage: null, notes: [...notes] };
            valueDone(); markSafe(); i++; continue;
        }
        if (ch === ',') { const t = top(); if (t && t.type === '{') t.expectKey = true; emit(ch); i++; continue; }
        if (ch === ':') { emit(ch); i++; continue; }
        // number / true / false / null (also tolerate the Python spellings)
        let j = i; while (j < n && /[^\s,\]}:"]/.test(src[j])) j++;
        let tok = src.slice(i, j);
        if (tok === 'None') { tok = 'null'; notes.add('python_literals'); } else if (tok === 'True') { tok = 'true'; notes.add('python_literals'); } else if (tok === 'False') { tok = 'false'; notes.add('python_literals'); }
        if (!/^(?:-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)$/.test(tok)) {
            if (j >= n) break;                                    // cut off inside a token: incomplete
            return { text: null, complete: false, salvage: null, notes: [...notes], error: 'bad_token' };
        }
        for (const c of tok) emit(c);
        i = j;
        if (i < n) { valueDone(); markSafe(); }                   // only complete when a delimiter follows it
    }
    // Ran out of text: incomplete. Close at the last complete element.
    let salvage = null;
    if (safe) salvage = out.slice(0, safe.len).join('') + safe.stack.slice().reverse().map(t => t === '{' ? '}' : ']').join('');
    return { text: null, complete: false, salvage, notes: [...notes] };
}

// Strips fences / zero-width characters and locates the root value. `array:true` also accepts a bare
// top-level array. Returns { ok, value, notes, truncated, error }.
function parseAiJson(raw, options = {}) {
    let text = String(raw == null ? '' : raw).replace(/^﻿/, '').replace(/[​-‍⁠]/g, '').trim();
    const notes = [];
    if (!text) return { ok: false, value: null, notes, truncated: false, error: 'empty' };
    if (!options.array && /^\[/.test(text.replace(/^```[a-zA-Z0-9_-]*[ \t]*\r?\n?/, ''))) return { ok: false, value: null, notes, truncated: false, error: 'array_root' };
    if (/```/.test(text)) { text = text.replace(/```[a-zA-Z0-9_-]*[ \t]*\r?\n?/g, '').trim(); notes.push('fence'); }
    const accept = v => v && typeof v === 'object' && (options.array || !Array.isArray(v));
    const firstObj = text.indexOf('{'), firstArr = options.array ? text.indexOf('[') : -1;
    const start = firstArr !== -1 && (firstObj === -1 || firstArr < firstObj) ? firstArr : firstObj;
    if (start === -1) return { ok: false, value: null, notes, truncated: false, error: 'no_json' };
    if (start > 0) notes.push('preamble');
    // 1) plain JSON — the overwhelmingly common case — first from `start` to the last matching closer
    const lastClose = text.lastIndexOf(text[start] === '{' ? '}' : ']');
    if (lastClose > start) {
        try { const v = JSON.parse(text.slice(start, lastClose + 1)); if (accept(v)) return { ok: true, value: v, notes: lastClose < text.length - 1 ? notes.concat('epilogue') : notes, truncated: false }; } catch (e) { /* repair below */ }
    }
    // 2) formatting repair, string-aware
    const scanned = scanAiJson(text, start);
    for (const n of scanned.notes) notes.push(n);
    if (scanned.complete) {
        try { const v = JSON.parse(scanned.text); if (accept(v)) return { ok: true, value: v, notes, truncated: false }; } catch (e) { return { ok: false, value: null, notes, truncated: false, error: 'unparsable' }; }
    }
    // 3) cut off mid-reply: keep everything up to the last complete element
    if (!scanned.complete && scanned.salvage) {
        try { const v = JSON.parse(scanned.salvage); if (accept(v)) return { ok: true, value: v, notes: notes.concat('truncated_salvaged'), truncated: true }; } catch (e) { /* fall through */ }
    }
    return { ok: false, value: null, notes, truncated: !scanned.complete && !scanned.error, error: scanned.error || (scanned.complete ? 'unparsable' : 'truncated') };
}

// The parsed OBJECT, or null when nothing parseable (or not an object) can be recovered. Used by every
// caller that predates parseAiJson (Practice, conjugation lookup, tests).
function parseAiJsonObject(raw) {
    const r = parseAiJson(raw);
    return r.ok ? r.value : null;
}

// A lemma that is written in a different script from its own surface form is a
// translation or transliteration, not a lemma (Latin surface -> Cyrillic lemma, etc.).
// Only checked for space-delimited scripts, where romanisation is not a convention.
function lemmaScriptMatchesSurface(lemma, surface) {
    if (!GRAMMAR_SPACED_SCRIPT_RE.test(surface)) return true;
    const scriptOf = ch => /\p{Script=Latin}/u.test(ch) ? 'L' : /\p{Script=Cyrillic}/u.test(ch) ? 'C' : /\p{Script=Devanagari}/u.test(ch) ? 'D' : /\p{L}/u.test(ch) ? 'X' : '';
    const surfaceScripts = new Set(Array.from(surface).map(scriptOf).filter(Boolean));
    return Array.from(lemma).map(scriptOf).filter(Boolean).every(sc => surfaceScripts.has(sc));
}

function storedLanguage(key, fallback, codes = SUPPORTED_LANGUAGE_CODES) {
    const value = readStored(key);
    return codes.includes(value) ? value : fallback;
}
// Перший запуск (мови ще не збережено): мова меню — перша з мов системи (navigator.languages,
// за пріоритетом), що є серед підтримуваних; якщо жодної немає — англійська.
function systemUiLanguage() {
    try {
        const prefs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language];
        for (const tag of prefs) {
            const code = String(tag || '').toLowerCase().split(/[-_]/)[0];
            if (SUPPORTED_LANGUAGE_CODES.includes(code)) return code;
        }
    } catch (e) { /* navigator недоступний — типова мова */ }
    return 'en';
}
// Мова перекладу при першому запуску — мова системи, якщо це не мова, яку тут вивчають (англійська, французька): на
// російському телефоні переклад одразу російською, а не завжди українською. Інакше — українська, як і раніше.
function systemTargetLanguage() {
    try {
        const prefs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language];
        for (const tag of prefs) {
            const code = String(tag || '').toLowerCase().split(/[-_]/)[0];
            if (code === 'en' || code === 'fr') return 'uk';
            if (TARGET_LANGUAGE_CODES.includes(code)) return code;
        }
    } catch (e) {}
    return 'uk';
}
