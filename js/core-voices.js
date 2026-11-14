/* core-voices.js — speech synthesis voices: quality scoring, gender, best voice per language, loadVoices().
 * Split out of core.js on 2026-11-14 without changes; loadVoices() is first called after lang-detect.js (inline line). */
// TTS
let ttsSynth = window.speechSynthesis;
let voices = [];
// Евристика якості голосу — імена рушіїв відрізняються за платформою (Android/iOS/десктоп),
// тому перевіряємо кілька поширених маркерів "преміальних"/нейромереж голосів одразу.
const VOICE_QUALITY_RE = /neural|natural|enhanced|premium|wavenet|studio/i;
// Оцінка якості голосу: нейромережеві/серверні голоси звучать помітно краще за
// локальні синтетичні, тому localService === false дає найбільший бал.
// Явні ознаки НИЗЬКОЇ якості: старі формантні синтезатори, які звучать
// «по-роботизованому». Такий голос не має обиратись автоматично, навіть якщо
// він єдиний із правильною локаллю.
const VOICE_POOR_RE = /compact|eloquence|espeak|pico|festival|sapi\s?4|robot|classic|legacy/i;
// Найвища якість — нейромережеві голоси конкретних платформ.
// «network» — серверні голоси Google TTS на Android (ru-ru-x-dfc-network): помітно кращі за -local того ж рушія.
const VOICE_TOP_RE  = /neural|natural|wavenet|studio|journey|siri|premium|enhanced|network/i;
// Улюблена локаль для кожної мови: fr-FR звучить звичніше за fr-CA, en-US за en-IN.
const PREFERRED_LOCALE = { fr: ['fr-fr', 'fr-ca'], en: ['en-us', 'en-gb'], uk: ['uk-ua'], ru: ['ru-ru'], zh: ['zh-cn', 'zh-tw'], ko: ['ko-kr'], hi: ['hi-in'], ga: ['ga-ie'], fa: ['fa-ir'],
    de: ['de-de', 'de-at', 'de-ch'], es: ['es-es', 'es-mx', 'es-us'], it: ['it-it'], pt: ['pt-br', 'pt-pt'], nl: ['nl-nl', 'nl-be'], pl: ['pl-pl'] };
// Голос формально тієї ж мови, але читає НЕ ТАК: переклад китайською — спрощений путунхуа, а кантонський
// голос (zh-HK / yue) вимовляє ці ієрогліфи зовсім інакше. Такий голос — лише якщо іншого немає.
const VOICE_WRONG_VARIANT_RE = /^(zh-hk|zh-mo|yue)|cantonese|粤|粵/i;

function voiceQualityScore(v) {
    let s = 0;
    const name = v.name || '';
    // Android WebView інколи дає «zh_CN» — приводимо до «zh-cn».
    const lang = (v.lang || '').toLowerCase().replace(/_/g, '-');

    if (VOICE_TOP_RE.test(name)) s += 8;          // нейромережевий
    else if (VOICE_QUALITY_RE.test(name)) s += 4; // просто «покращений»
    if (v.localService === false) s += 6;         // серверний — майже завжди найкращий
    if (/google/i.test(name)) s += 3;
    if (/microsoft/i.test(name)) s += 2;

    // Локаль: точний збіг з улюбленою — плюс, інший регіон тієї ж мови — менше.
    const base = lang.slice(0, 2);
    const pref = PREFERRED_LOCALE[base];
    if (pref) {
        const idx = pref.indexOf(lang);
        if (idx === 0) s += 4;
        else if (idx > 0) s += 2;
    }
    if (v.default) s += 1;                        // системний типовий — легкий плюс

    if (VOICE_POOR_RE.test(name)) s -= 10;        // старий синтезатор — у самий кінець
    if (VOICE_WRONG_VARIANT_RE.test(lang) || VOICE_WRONG_VARIANT_RE.test(name)) s -= 20;
    return s;
}

// Стать голосу Web Speech API не повідомляє — визначаємо за відомими іменами
// французьких голосів Android / iOS / Windows / macOS, з запасним варіантом по
// службових позначках у назві.
const FR_MALE_RE   = /\b(henri|thomas|paul|claude|nicolas|mathieu|jean|yves|guillaume|rémy|remy|alain|male|homme)\b/i;
const FR_FEMALE_RE = /\b(denise|amélie|amelie|aurélie|aurelie|audrey|marie|virginie|julie|céline|celine|hortense|chantal|charlotte|female|femme)\b/i;
function voiceGender(v) {
    if (FR_MALE_RE.test(v.name)) return 'male';
    if (FR_FEMALE_RE.test(v.name)) return 'female';
    return null;
}
// Дві найкращі АЛЬТЕРНАТИВНІ доріжки для читання: за можливості чоловічий + жіночий,
// інакше просто два різні найкращі голоси, щоб чергування все одно було чутним.
function pickVoicePair(langPrefix) {
    const pool = voices.filter(v => v.lang.toLowerCase().startsWith(langPrefix))
                       .sort((a, b) => voiceQualityScore(b) - voiceQualityScore(a));
    if (!pool.length) return null;
    const male = pool.find(v => voiceGender(v) === 'male');
    const female = pool.find(v => voiceGender(v) === 'female');
    if (male && female) return [male, female];
    // Стать визначити не вдалось — беремо два найкращі різні голоси.
    const distinct = pool.filter((v, i, a) => a.findIndex(x => x.name === v.name) === i);
    return distinct.length >= 2 ? [distinct[0], distinct[1]] : [distinct[0], distinct[0]];
}

function pickBestVoice(langPrefix, pool) {
    const candidates = pool.filter(v => v.lang.toLowerCase().startsWith(langPrefix));
    if (!candidates.length) return null;
    candidates.sort((a, b) => voiceQualityScore(b) - voiceQualityScore(a));
    return candidates[0];
}
function loadVoices() {
    if (!ttsSynth) return;
    voices = ttsSynth.getVoices();
    if (voices.length === 0) {
        if (!window.voicesRetryCount) window.voicesRetryCount = 0;
        if (window.voicesRetryCount < 10) {
            window.voicesRetryCount++;
            setTimeout(loadVoices, 200 * window.voicesRetryCount);
            return;
        }
        // Fallback: the system picks the voice by the utterance's language
        if (!window.voicesChangedListenerAdded) {
            window.voicesChangedListenerAdded = true;
            ttsSynth.addEventListener('voiceschanged', () => { window.voicesRetryCount = 0; loadVoices(); });
        }
        return;
    }
    window.voicesRetryCount = 0;
    // Автовибір найкращого голосу для кожної мови. Система часто підвантажує
    // якісні (серверні) голоси із запізненням, тому автовибір ПЕРЕГЛЯДАЄТЬСЯ, поки
    // користувач не зробив власний вибір: якщо з'явився кращий — беремо його.
    TARGET_LANGUAGE_CODES.forEach(code => {
        if (state.voiceChosenByUser[code]) return;      // ручний вибір не чіпаємо
        const best = pickBestVoice(code, voices);
        if (!best) return;
        const cur = voices.find(v => v.voiceURI === state.selectedVoiceURIByLang[code]);
        if (!cur || voiceQualityScore(best) > voiceQualityScore(cur)) {
            state.selectedVoiceURIByLang[code] = best.voiceURI;
        }
    });
}
// Виклик loadVoices() — у кінці lang-detect.js (див. коментар там).
