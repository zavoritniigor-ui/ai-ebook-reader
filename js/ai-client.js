/* Shared AI client: one explicitly selected BYOK provider for text and images.
 * Existing features keep callAI/callAIVision and their task/epoch protections.
 * No retries through another provider. No credentials or raw errors are logged.
 * Task-specific OpenAI profiles optimize latency per workload.
 * Real streaming for Ask AI and Language Level via Server-Sent Events with incremental rendering.
 */
// OpenAI's FREE daily token pools (project «Ebok rider», the project of the site's key; reset 00:00 UTC): up to 250K tokens a day across the big models
// (gpt-5.4 …) and, counted SEPARATELY, 2.5M across the mini/nano ones; beyond that, and for any other model, OpenAI bills -- it does NOT refuse, so
// the app has to count itself (openaiModel). Measured 2026-10-18 on production, French → Ukrainian, the app's own prompts: gpt-5.4 translates words and
// sentences as well as gpt-5.6-luna (used before; billed, in neither pool) in the same ~0.9 s and keeps grammar notes in the menu language (luna wrote some
// in French and Russian); gpt-5.4-mini is faster (~0.7 s) but weaker (souvenir → «сувенір», car → «тому», wrong lemmas in grammar); gpt-5.4-nano worse
// still (pêche «рибальство» → «персик»). So: gpt-5.4 first, gpt-5.4-mini once the big pool is used up.
const OPENAI_MODEL = 'gpt-5.4';
const OPENAI_MINI_MODEL = 'gpt-5.4-mini';
// Centralized default: "low" for ordinary reader workloads.
const OPENAI_REASONING_EFFORT = 'low';
const GROQ_MODEL = 'openai/gpt-oss-120b';
const GEMINI_MODEL = 'gemini-3.6-flash';
const GROQ_VISION_MODEL = 'qwen/qwen3.8-27b';   // qwen3.6 was withdrawn by Groq (404): every photo check silently went to OpenAI

// ---- OpenAI pool accounting ------------------------------------------------------------------------------------------------
// Tokens this device spent today (UTC) on each pool model, from the usage OpenAI reports with every reply (also a cut-off or refused-as-invalid one: it
// was paid for). Only THIS device's requests are seen (a tablet and a PC each count their own); the owner chose to switch at 100% of a pool.
const OPENAI_POOL_TOKENS = { [OPENAI_MODEL]: 250000, [OPENAI_MINI_MODEL]: 2500000 };
const OPENAI_POOL_SHARE = 1;   // owner's choice 2026-10-18: switch only when the whole pool is spent
const OPENAI_POOL_STORAGE = 'reader_openai_pool_usage';
function openaiPoolUsage() {
    const day = new Date().toISOString().slice(0, 10);
    let u = null;
    try { u = JSON.parse(readStored(OPENAI_POOL_STORAGE) || 'null'); } catch (e) { u = null; }
    if (!u || u.day !== day || typeof u.used !== 'object' || !u.used) u = { day, used: {} };
    return u;
}
function openaiNoteUsage(model, usage) {
    const tokens = usage ? Number(usage.total_tokens) || (Number(usage.input_tokens) || 0) + (Number(usage.output_tokens) || 0) : 0;
    if (!Object.hasOwn(OPENAI_POOL_TOKENS, model) || !(tokens > 0)) return;
    const u = openaiPoolUsage();
    u.used[model] = (Number(u.used[model]) || 0) + tokens;
    // Not writeStored: a full storage must not raise its alert on every AI reply; the count is a best effort.
    try { localStorage.setItem(OPENAI_POOL_STORAGE, JSON.stringify(u)); } catch (e) { /* not counted */ }
}
// The model an OpenAI request uses now: the big pool's gpt-5.4 while it has room, then the mini pool's gpt-5.4-mini (also once both are used up: it
// is then billed, and the cheaper of the two).
function openaiModel() {
    const used = openaiPoolUsage().used;
    return (Number(used[OPENAI_MODEL]) || 0) < OPENAI_POOL_TOKENS[OPENAI_MODEL] * OPENAI_POOL_SHARE ? OPENAI_MODEL : OPENAI_MINI_MODEL;
}
function openaiPoolReport() {
    const u = openaiPoolUsage();
    return { day: u.day, model: openaiModel(), used: Object.assign({}, u.used), pools: Object.assign({}, OPENAI_POOL_TOKENS) };
}
window.readerOpenaiPools = openaiPoolReport;

// Task-specific OpenAI profiles: optimize reasoning effort, max_output_tokens, and streaming per workload
const OPENAI_TASK_PROFILES = {
    translation: { reasoning: 'none', max_output_tokens: 128, stream: false },
    grammar: { reasoning: 'none', max_output_tokens: 700, stream: false },
    ask: { reasoning: 'low', max_output_tokens: 1200, stream: true },
    // Redesigned Grammar panel (Verbs/Adjectives): one structured multi-item JSON
    // analysis, plus a small targeted per-lemma conjugation/agreement lookup.
    // The per-request budget is set by grammarProfile() (grammar-svo.js) from the size of the text; this is only the fallback.
    grammar_analysis: { reasoning: 'low', max_output_tokens: 3000, stream: false },
    grammar_paradigm: { reasoning: 'none', max_output_tokens: 250, stream: false },
    // Grammar lookup: a verb/adjective typed by the learner (usually in their own language) -> its lemma + one paradigm.
    grammar_lookup: { reasoning: 'none', max_output_tokens: 500, stream: false },
    // Grammar rules panel (js/grammar-rules.js): find a rule's occurrences in the visible page text; explain one by theory.
    rules_search: { reasoning: 'low', max_output_tokens: 3000, stream: false },
    rules_explain: { reasoning: 'low', max_output_tokens: 900, stream: false },
    // Sentence breakdown painted in the text (js/sentence-structure.js): parts of ONE sentence, then one part in depth.
    sentence_structure: { reasoning: 'none', max_output_tokens: 2800, stream: false },
    structure_deep: { reasoning: 'none', max_output_tokens: 900, stream: false },
    // Practice reading: per-word example sentences + connected paragraphs, each with its own
    // annotated targets — several minutes of material, so by far the largest structured reply.
    practice_reading: { reasoning: 'low', max_output_tokens: 8000, stream: false },
    language_level: { reasoning: 'low', max_output_tokens: 800, stream: true },
    vision: { reasoning: 'low', max_output_tokens: 1200, stream: false },
    default: { reasoning: 'low', max_output_tokens: 4096, stream: false }
};

// A long structured reply cannot fit the 45s default of fetchWithTimeout; per-task overrides (ms).
const AI_TASK_TIMEOUT_MS = { practice_reading: 150000, rules_search: 90000 };
function aiTaskTimeout(task) { return AI_TASK_TIMEOUT_MS[task] || 45000; }

// ===== Typed provider errors and the development diagnostics =====================================================
// Every failure carries a machine-readable `reason` so the cause is knowable — the learner still sees ONE simple,
// localised, retryable message. reason: network | timeout | http | provider_error | envelope_invalid | empty_reply |
// truncated | blocked. A truncated reply keeps whatever text arrived in `partial` so a structured caller (Grammar,
// Practice) can recover the complete items before the cut instead of losing everything.
class AiRequestError extends Error {
    constructor(message, reason, details = {}) {
        super(message);
        this.name = 'AiRequestError';
        this.reason = reason;
        Object.assign(this, details);
    }
}
// Diagnostics never contain a prompt or a key. They are kept in memory only (a bounded ring), are always readable
// through readerAiDiagnostics(), and are shown next to an error only when the developer switch is on:
//   localStorage.reader_ai_debug = '1'   or   ?aiDebug=1 in the URL.
const AI_DIAG_MAX = 40;
const aiDiagnostics = [];
function aiDebugEnabled() {
    try { return readStored('reader_ai_debug') === '1' || /(?:^|[?&])aiDebug=1(?:&|$)/.test(location.search); } catch (e) { return false; }
}
function redactAiText(value, max = 300) {
    let s = String(value == null ? '' : value);
    for (const k of [state.apiKey, state.groqKey, state.openaiKey]) if (k && String(k).length >= 8) s = s.split(String(k)).join('[key]');
    s = s.replace(/\b(?:sk-[A-Za-z0-9_-]{16,}|AIza[0-9A-Za-z_-]{20,}|gsk_[A-Za-z0-9]{16,})\b/g, '[key]');
    return s.length > max ? s.slice(0, max) + '…' : s;
}
function recordAiDiagnostic(entry) {
    const e = Object.assign({ at: new Date().toISOString() }, entry);
    delete e.prompt; delete e.key; delete e.apiKey;
    // Developer switch only: the FULL raw reply and the analysed text, so a failing response can be copied out and replayed as a
    // regression test (tests/live_responses/). Never the prompt, never a key.
    if (e.capture) {
        if (!aiDebugEnabled()) delete e.capture;
        else e.capture = { sourceLanguage: e.capture.sourceLanguage, mode: e.capture.mode, text: redactAiText(e.capture.text, 20000), raw: redactAiText(e.capture.raw, 60000) };
    }
    for (const k of ['rawHead', 'rawTail', 'providerMessage', 'message']) if (typeof e[k] === 'string') e[k] = redactAiText(e[k], 300);
    aiDiagnostics.push(e);
    if (aiDiagnostics.length > AI_DIAG_MAX) aiDiagnostics.shift();
    if (aiDebugEnabled()) { try { console.warn('[reader-ai]', e.task, e.outcome, e.reason || '', e.provider || '', e.model || ''); } catch (err) { /* console unavailable */ } }
    return e;
}
function readerAiDiagnostics() { return aiDiagnostics.map(e => Object.assign({}, e)); }
window.readerAiDiagnostics = readerAiDiagnostics;
// Which provider answered each request and how fast (success AND failure) -- the diagnostics report shows it, so «everything goes through
// OpenAI and is slow» can be checked on the learner's own device. Never a prompt, never a key.
const aiRequestLog = [];
function recordAiRequest(entry) {
    aiRequestLog.push(Object.assign({ at: new Date().toISOString() }, entry));
    if (aiRequestLog.length > AI_DIAG_MAX) aiRequestLog.shift();
}
function readerAiRequests() { return aiRequestLog.map(e => Object.assign({}, e)); }
window.readerAiRequests = readerAiRequests;
// Head/tail excerpts of a raw model reply for the diagnostics (bounded; redacted on record).
function aiRawExcerpts(raw) {
    const text = String(raw == null ? '' : raw);
    return { rawChars: text.length, rawHead: text.slice(0, 240), rawTail: text.length > 240 ? text.slice(-240) : '' };
}
function providerErrorText(body) {
    try { const j = JSON.parse(body); const m = j?.error?.message || j?.error?.status || j?.message; if (m) return String(m); } catch (e) { /* not JSON */ }
    return String(body || '').slice(0, 200);
}

// Development-only latency tracking (no keys or user text logged)
const latencyStats = new Map();
function trackLatency(task, firstTokenMs, totalMs) {
    if (!latencyStats.has(task)) latencyStats.set(task, []);
    latencyStats.get(task).push({ firstToken: firstTokenMs, total: totalMs, timestamp: Date.now() });
}
function getLatencyStats(task) {
    const samples = latencyStats.get(task) || [];
    if (!samples.length) return null;
    const firstTokens = samples.map(s => s.firstToken);
    const totals = samples.map(s => s.total);
    const avg = (arr) => arr.reduce((a,b) => a+b, 0) / arr.length;
    return {
        task, samples: samples.length,
        firstTokenMs: { avg: Math.round(avg(firstTokens)), min: Math.min(...firstTokens), max: Math.max(...firstTokens) },
        totalMs: { avg: Math.round(avg(totals)), min: Math.min(...totals), max: Math.max(...totals) }
    };
}
function getAllLatencyStats() {
    return Array.from(latencyStats.keys()).map(task => getLatencyStats(task)).filter(Boolean);
}

const AI_PROVIDERS = {
    openai: { name: 'OpenAI', key: 'openaiKey', storage: 'reader_openai_key', input: 'openai-key-input' },
    groq: { name: 'Groq', key: 'groqKey', storage: 'reader_groq_key', input: 'groq-key-input' },
    gemini: { name: 'Gemini', key: 'apiKey', storage: 'reader_gemini_key', input: 'api-key-input' }
};
const aiRequests = new Set();
function aiProviderKey(provider = state.activeAiProvider) {
    return Object.hasOwn(AI_PROVIDERS, provider) ? state[AI_PROVIDERS[provider].key] : '';
}
// ---- Shared key (functions/api/ai.js) --------------------------------------------------------------------------------
// For people without their own key: when the site has a shared key configured (Cloudflare Pages secret GROQ_API_KEY /
// OPENAI_API_KEY), the request goes to /api/ai and the SERVER adds the key -- it never reaches the browser. SHARED_AI_KEY is
// only a marker "via the server", not a key. An own key always wins; the key dialog shows only own keys (aiProviderKey).
const SHARED_AI_KEY = '\u0000shared';
const sharedAiProviders = { groq: false, openai: false };
function aiEffectiveKey(provider) {
    return aiProviderKey(provider) || (sharedAiProviders[provider] === true ? SHARED_AI_KEY : '');
}
function aiEndpoint(provider, key, url) { return key === SHARED_AI_KEY ? `/api/ai?provider=${provider}` : url; }
function aiAuthHeaders(provider, key) {
    if (key === SHARED_AI_KEY) return {};
    return provider === 'gemini' ? { 'x-goog-api-key': key } : { Authorization: `Bearer ${key}` };
}
let sharedAiProbeAnswered = false, sharedAiProbeAt = 0, sharedAiProbePromise = null, sharedAiProbeWaited = false;
async function loadSharedAiProviders() {
    sharedAiProbeAt = Date.now();
    try {
        const res = await fetch('/api/ai', { cache: 'no-store' });
        sharedAiProbeAnswered = true;      // the site ANSWERED (even «no such function here»): asking again would not change it
        if (!res.ok) return;
        const data = await res.json();
        // format === false: the site's secret does not even look like that provider's key (e.g. an OpenAI key stored as
        // GROQ_API_KEY) -- every request would fail, so that shared provider is not used at all.
        const usable = p => !!data && data[p] === true && !(data.format && data.format[p] === false);
        sharedAiProviders.groq = usable('groq');
        sharedAiProviders.openai = usable('openai');
    } catch (e) { /* offline / no server function (local test server): own keys only */ }
}
// The site's shared keys are learned once at start. When that probe could not reach the site (the app was opened offline, a flaky
// connection) the shared Groq stayed «unknown» for the whole session and every request went to the slower own OpenAI key. So it is
// repeated when the connection comes back and before a request -- at most every 20 s, never holding a request longer than 2.5 s.
// Returns a promise to wait for, or null when there is nothing to wait for (the usual case: callers must not yield for nothing).
function ensureSharedAiProviders(force = false) {
    if (sharedAiProbeAnswered || navigator.onLine === false) return null;
    if (!sharedAiProbePromise) {
        if (!force && sharedAiProbeAt && Date.now() - sharedAiProbeAt < 20000) return null;
        sharedAiProbeWaited = false;
        sharedAiProbePromise = loadSharedAiProviders().finally(() => { sharedAiProbePromise = null; });
    } else if (sharedAiProbeWaited) return null;   // one request was already held for this probe: a hung one must not hold more
    return Promise.race([sharedAiProbePromise, new Promise(resolve => setTimeout(() => { sharedAiProbeWaited = true; resolve(); }, 2500))]);
}
window.addEventListener('online', () => { ensureSharedAiProviders(true); });
function sharedAiProvider(preferred) {
    return [preferred, 'openai', 'groq'].find(p => p && sharedAiProviders[p] === true) || null;
}
function aiAvailable() { return !!aiEffectiveKey(aiProviderForTask('default')); }
// A text request can be answered: by the cloud AI, or by the model installed on the device (js/device-llm.js) when there is none.
function aiCanAnswer() { return aiAvailable() || (typeof deviceLlmReady === 'function' && deviceLlmReady()); }
// ---- Task routing --------------------------------------------------------------------------------------------------
// With routing 'auto' (default) EVERY request goes to Groq first (answers in a second or two), IF a Groq key is stored or the
// site has a shared one -- whatever other keys the learner saved; OpenAI is only the backup: when Groq does not answer (network
// error, timeout, refusal, empty / cut-off reply) the same request is repeated once on OpenAI (requestAI). Waiting for OpenAI on
// every request was too slow.
// No usable Groq key at all: the request goes where it went before -- OpenAI for the deeper tasks below, else the ACTIVE provider.
// Routing 'off': the single active provider, no fallback.
const AI_ROUTE_OPENAI_TASKS = new Set(['grammar', 'grammar_analysis', 'grammar_paradigm', 'grammar_lookup', 'practice_reading', 'sentence_structure', 'structure_deep',
    'rules_search', 'rules_explain', 'language_level', 'ask']);
function aiProviderForTask(task) {
    const active = state.activeAiProvider;
    if (state.aiRouting === 'off') return aiProviderKey(active) ? active : sharedAiProvider(active) || active;
    // EVERY task starts on Groq whenever a Groq key can be used -- the learner's own OR the site's shared one. Own OpenAI / Gemini
    // keys do not take requests away from it: they are only the backup (aiBackupProvider). (A saved OpenAI key used to win here:
    // with no own Groq key every grammar / breakdown / Ask request went to OpenAI and was slow, although the site has a Groq key.)
    if (aiEffectiveKey('groq')) return 'groq';
    const wanted = AI_ROUTE_OPENAI_TASKS.has(task) ? 'openai' : null;
    const own = wanted && aiProviderKey(wanted) ? wanted : active;
    // No own key for it: the shared server key, Groq first; none -> the active one (asks for a key).
    return aiProviderKey(own) ? own : sharedAiProvider('groq') || own;
}
// Where a request goes when Groq did not answer: OpenAI (own or shared key), else the active provider; null = nowhere.
function aiBackupProvider(provider) {
    if (state.aiRouting === 'off' || provider !== 'groq') return null;
    if (aiEffectiveKey('openai')) return 'openai';
    const active = state.activeAiProvider;
    return active !== 'groq' && aiEffectiveKey(active) ? active : null;
}
// Which providers translate a tapped fragment, in order: the first is asked, the second ONLY if the first gave no usable answer.
function translationProviders() {
    if (state.aiRouting === 'off') { const p = aiProviderForTask('translation'); return aiEffectiveKey(p) ? [p] : []; }
    const first = aiProviderForTask('translation');
    if (!aiEffectiveKey(first)) return [];
    const backup = aiBackupProvider(first);
    return backup ? [first, backup] : [first];
}
function missingAiKey(provider = state.activeAiProvider) {
    return t('aiAddKey').replace('{provider}', AI_PROVIDERS[provider]?.name || 'AI');
}
function cancelAIRequests() {
    for (const controller of aiRequests) controller.abort();
    cancelAsyncTasks();
    state.lookupToken++;
    state.translationCache = {};
}
function aiHttpError(provider, status, providerMessage = '', rate = null) {
    const key = status === 401 || status === 403 ? 'aiAuthError' : status === 429 ? 'aiRateError' : 'aiRequestError';
    return new AiRequestError(t(key).replace('{provider}', AI_PROVIDERS[provider].name), 'http', { status, providerMessage, rate });
}
// What a 429 says: WHICH limit was hit (RPM/RPD requests, TPM/TPD tokens per minute/day), its numbers and when to come back. Through the site's
// /api/ai it arrives ready as {rate:{...}}; with an own key it is the provider's own text ("... on tokens per minute (TPM): Limit 8000, Used 6905,
// Requested 1500. Please try again in 5.25s"). The `retry-after` header (seconds) wins when the browser may read it. Numbers only -- never the text.
function aiRateDetails(bodyText, retryAfterHeader) {
    let rate = {}, message = String(bodyText || '');
    try {
        const j = JSON.parse(message);
        if (j && typeof j.rate === 'object' && j.rate) {
            for (const k of ['limit', 'used', 'requested', 'retryAfterSec']) if (Number.isFinite(j.rate[k])) rate[k] = j.rate[k];
            if (/^(RPM|RPD|TPM|TPD)$/.test(j.rate.kind)) rate.kind = j.rate.kind;
            message = '';
        } else if (j && j.error && typeof j.error.message === 'string') message = j.error.message;
    } catch (e) { /* not JSON: the text itself */ }
    const limit = /\b(RPM|RPD|TPM|TPD)\)?:\s*Limit (\d+),\s*Used (\d+),\s*Requested (\d+)/.exec(message);
    if (limit) Object.assign(rate, { kind: limit[1], limit: Number(limit[2]), used: Number(limit[3]), requested: Number(limit[4]) });
    const wait = /try again in ((?:\d+h)?(?:\d+m(?!s))?(?:\d+(?:\.\d+)?s)?(?:\d+(?:\.\d+)?ms)?)/i.exec(message);
    if (wait && wait[1]) rate.retryAfterSec = Math.round([...wait[1].matchAll(/(\d+(?:\.\d+)?)(ms|h|m|s)/g)].reduce((sum, [, n, unit]) => sum + Number(n) * { h: 3600, m: 60, s: 1, ms: 0.001 }[unit], 0) * 100) / 100;
    const header = retryAfterHeader == null ? NaN : Number(retryAfterHeader);
    if (header >= 0 && header < 86400) rate.retryAfterSec = header;
    return Object.keys(rate).length ? rate : null;
}
async function aiJsonRequest(provider, key, url, body, signal, timeoutMs) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, aiAuthHeaders(provider, key));
    url = aiEndpoint(provider, key, url);
    let res;
    try { res = await fetchWithTimeout(url, { method: 'POST', headers, body: JSON.stringify(body), signal }, timeoutMs); }
    catch (err) {
        if (signal.aborted || err.name === 'AbortError') throw new DOMException('Cancelled', 'AbortError');
        // Never relay error.message to the learner: a provider/browser may echo credentials.
        throw new AiRequestError(t('aiNetworkError'), err && err.reason === 'timeout' ? 'timeout' : 'network');
    }
    if (!res.ok) {
        // The provider's own explanation (e.g. "max_output_tokens too small") is kept for the developer diagnostics only.
        let providerMessage = '', rate = null;
        try {
            const text = await res.text();
            providerMessage = providerErrorText(text);
            if (res.status === 429) rate = aiRateDetails(text, res.headers.get('retry-after'));
        } catch (e) { /* body unreadable */ }
        throw aiHttpError(provider, res.status, providerMessage, rate);
    }
    try {
        const data = await res.json();
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
        return data;
    }
    catch (_) { throw new AiRequestError(t('aiInvalidResponse'), 'envelope_invalid'); }
}

// Streaming fetch with proper timeout and signal handling (for SSE responses).
// Does NOT buffer the body; returns raw Response for stream reading.
async function fetchStreamingWithTimeout(url, options = {}, timeoutMs = 30000) {
    const { method = 'POST', headers = {}, body, signal } = options;
    const controller = new AbortController();
    let timeoutId = null;

    const onAbort = () => { controller.abort(); if (timeoutId) clearTimeout(timeoutId); };
    if (signal) signal.addEventListener('abort', onAbort, { once: true });

    timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, { method, headers, body, signal: controller.signal });
        clearTimeout(timeoutId);
        return res;
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
}

// Parse OpenAI Responses API SSE stream. Returns accumulated text and first-token time.
// Handles chunk boundaries correctly: keeps incomplete lines in buffer.
// Calls onDelta(delta, accumulated) for each text delta, allowing incremental UI updates.
// A stream can stall AFTER its headers arrived (a mobile connection that freezes mid-answer): the request-level
// timeout is already over by then, so every read gets its own idle limit -- otherwise the spinner never ends.
const AI_STREAM_IDLE_MS = 30000;
function readWithIdleTimeout(reader, idleMs) {
    let timer;
    const idle = new Promise((_, reject) => { timer = setTimeout(() => {
        // Reject BEFORE cancelling: cancel() settles the pending read as {done:true}, which would otherwise win the race
        // and turn a stalled answer into a "complete" one.
        reject(new AiRequestError(t('aiNetworkError'), 'timeout'));
        try { reader.cancel().catch(() => {}); } catch (e) {}
    }, idleMs); });
    return Promise.race([reader.read(), idle]).finally(() => clearTimeout(timer));
}
async function parseOpenAIStream(reader, signal, onDelta, idleMs = AI_STREAM_IDLE_MS) {
    const decoder = new TextDecoder();
    let buffer = '';
    let firstTokenTime = null;
    let result = '';
    let sawValidEvent = false;
    const startTime = performance.now();
    let finished = false, usage = null;
    // The stream's own end state: a cut-off ("incomplete", usually the token cap) or a failure is NOT a complete answer.
    const terminal = data => {
        if (data.response && data.response.usage && typeof data.response.usage === 'object') usage = data.response.usage;   // a cut-off reply was paid for too
        if (data.type === 'response.incomplete') {
            const why = data.response && data.response.incomplete_details && data.response.incomplete_details.reason;
            throw new AiRequestError(t('aiInvalidResponse'), why === 'content_filter' ? 'blocked' : 'truncated', { partial: result, providerMessage: why || 'incomplete', usage });
        }
        if (data.type === 'response.failed' || data.type === 'error') {
            const err = data.response && data.response.error || data.error || data;
            throw new AiRequestError(t('aiInvalidResponse'), 'provider_error', { providerMessage: providerErrorText(JSON.stringify({ error: err })) });
        }
        if (data.type === 'response.completed') finished = true;   // output_text.done ends one content part, not the reply
    };

    while (!finished) {
        if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');

        const { done, value } = await readWithIdleTimeout(reader, idleMs);
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // keep incomplete line for next iteration

        for (const line of lines) {
            if (!line.trim()) continue;
            if (!line.startsWith('data: ')) continue;

            let data;
            try { data = JSON.parse(line.slice(6)); } catch (_) { continue; }   // skip malformed JSON lines
            {
                sawValidEvent = true;  // Successfully parsed a valid SSE event

                // Handle text deltas (OpenAI Responses API format)
                if (data.type === 'response.output_text.delta') {
                    if (!firstTokenTime) firstTokenTime = performance.now() - startTime;
                    const text = data.delta;
                    if (typeof text === 'string') {
                        result += text;
                        if (onDelta) onDelta(text, result);
                    }
                }

                terminal(data);
                if (finished) break;
            }
        }
    }
    if (finished) { try { reader.cancel().catch(() => {}); } catch (e) {} }

    // Process any remaining buffer
    if (buffer.trim() && buffer.trim().startsWith('data: ')) {
        try {
            const data = JSON.parse(buffer.slice(6));
            sawValidEvent = true;
            if (data.type === 'response.output_text.delta' && typeof data.delta === 'string') {
                if (!firstTokenTime) firstTokenTime = performance.now() - startTime;
                result += data.delta;
                if (onDelta) onDelta(data.delta, result);
            }
            terminal(data);
        } catch (err) { if (err instanceof AiRequestError) throw err; }
    }

    // Validate that we received at least one valid SSE event
    if (!sawValidEvent) throw new Error('No valid SSE events received');

    // Return accumulated result (may be empty, which triggers aiEmptyResponse in requestAI)
    return { result, firstTokenTime, usage };
}

async function callOpenAI(prompt, dataUrl, key, signal, task = 'default', onDelta, options = {}) {
    const profile = OPENAI_TASK_PROFILES[task] || OPENAI_TASK_PROFILES.default;
    const input = dataUrl ? [{ role: 'user', content: [
        { type: 'input_text', text: prompt },
        { type: 'input_image', image_url: dataUrl }
    ] }] : prompt;

    const startTime = performance.now();
    let firstTokenTime = null;
    let result = '';
    const model = openaiModel();
    if (options.meta) options.meta.model = model;

    if (profile.stream) {
        // Real streaming for Ask AI and Language Level
        const body = {
            model, input, store: false, max_output_tokens: profile.max_output_tokens,
            reasoning: { effort: profile.reasoning }, stream: true
        };
        const headers = Object.assign({ 'Content-Type': 'application/json' }, aiAuthHeaders('openai', key));
        try {
            const res = await fetchStreamingWithTimeout(aiEndpoint('openai', key, 'https://api.openai.com/v1/responses'),
                { method: 'POST', headers, body: JSON.stringify(body), signal }, 30000);
            if (!res.ok) throw aiHttpError('openai', res.status);

            const reader = res.body?.getReader();
            if (!reader) throw new Error(t('aiInvalidResponse'));

            let streamed;
            try { streamed = await parseOpenAIStream(reader, signal, onDelta); }
            catch (err) { if (err && err.usage) openaiNoteUsage(model, err.usage); throw err; }
            const { result: parsed, firstTokenTime: ftt, usage } = streamed;
            openaiNoteUsage(model, usage);
            result = parsed;
            firstTokenTime = ftt;
        } catch (err) {
            if (signal?.aborted || err.name === 'AbortError') throw new DOMException('Cancelled', 'AbortError');
            // Malformed SSE response (no valid events) or other parsing errors
            if (err.message && err.message.includes('No valid SSE')) throw new Error(t('aiInvalidResponse'));
            // Re-throw HTTP errors (401/429/etc) from aiHttpError. Convert network errors (TypeError) to generic message.
            if (err instanceof TypeError) throw new Error(t('aiNetworkError'));
            throw err; // Re-throw other errors as-is
        }
    } else {
        // Non-streaming response (translations, grammar, conjugation)
        const data = await aiJsonRequest('openai', key, 'https://api.openai.com/v1/responses', {
            model, input, store: false, max_output_tokens: options.maxOutputTokens || profile.max_output_tokens,
            reasoning: { effort: profile.reasoning }
        }, signal, options.timeoutMs || aiTaskTimeout(task));
        openaiNoteUsage(model, data.usage);   // before any check below: a cut-off or an error reply was paid for too
        const meta = options.meta || {};
        meta.model = typeof data.model === 'string' ? data.model : model;
        meta.finish = data.status || null;
        if (data.usage && typeof data.usage === 'object') meta.usage = { in: data.usage.input_tokens, out: data.usage.output_tokens, reasoning: data.usage.output_tokens_details?.reasoning_tokens };
        // REST output may contain reasoning/tool items before assistant messages.
        result = (Array.isArray(data.output) ? data.output : [])
            .filter(item => item?.type === 'message' && item.role === 'assistant')
            .flatMap(item => Array.isArray(item.content) ? item.content : [])
            .filter(part => part?.type === 'output_text' && typeof part.text === 'string')
            .map(part => part.text).join('\n');
        const hasError = data.error && (typeof data.error !== 'object' || Object.keys(data.error).length);
        if (hasError) throw new AiRequestError(t('aiInvalidResponse'), 'provider_error', { providerMessage: providerErrorText(JSON.stringify({ error: data.error })), meta });
        if (data.status && data.status !== 'completed') {
            // "incomplete" is a TRUNCATED reply (usually max_output_tokens — and the budget also pays for reasoning), not an
            // invalid one. What arrived is kept so a structured caller can recover the complete items before the cut.
            const why = data.incomplete_details && data.incomplete_details.reason;
            meta.finishReason = why || null;
            if (data.status === 'incomplete') throw new AiRequestError(t('aiInvalidResponse'), why === 'content_filter' ? 'blocked' : 'truncated', { partial: result, providerMessage: why || 'incomplete', meta });
            throw new AiRequestError(t('aiInvalidResponse'), 'provider_error', { providerMessage: String(data.status), meta });
        }
        firstTokenTime = performance.now() - startTime;
    }

    const totalTime = performance.now() - startTime;
    trackLatency(task, firstTokenTime, totalTime);
    return result;
}
function dataUrlMime(u) { const m = /^data:([^;]+);/.exec(u); return m ? m[1] : 'image/jpeg'; }
async function callGemini(prompt, dataUrl, key, signal, task, options = {}) {
    const parts = [{ text: prompt }];
    if (dataUrl) parts.push({ inline_data: { mime_type: dataUrlMime(dataUrl), data: dataUrl.split(',')[1] } });
    const data = await aiJsonRequest('gemini', key,
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        { contents: [{ parts }] }, signal, options.timeoutMs || aiTaskTimeout(task));
    const meta = options.meta || {};
    const cand = Array.isArray(data.candidates) ? data.candidates[0] : null;
    const finish = cand && cand.finishReason;
    meta.model = typeof data.modelVersion === 'string' ? data.modelVersion : GEMINI_MODEL;
    meta.finish = finish || null;
    if (data.usageMetadata && typeof data.usageMetadata === 'object') meta.usage = { in: data.usageMetadata.promptTokenCount, out: data.usageMetadata.candidatesTokenCount, reasoning: data.usageMetadata.thoughtsTokenCount };
    // Thought summaries (if the model returns any) are not part of the answer.
    const result = cand && cand.content && cand.content.parts;
    const text = Array.isArray(result) ? result.filter(part => typeof part?.text === 'string' && !part.thought).map(part => part.text).join('\n') : '';
    const blockReason = data.promptFeedback && data.promptFeedback.blockReason;
    if (blockReason) throw new AiRequestError(t('aiEmptyResponse'), 'blocked', { providerMessage: String(blockReason), meta });
    if (finish === 'MAX_TOKENS') throw new AiRequestError(t('aiInvalidResponse'), 'truncated', { partial: text, providerMessage: 'MAX_TOKENS', meta });
    if (!text && finish && finish !== 'STOP') throw new AiRequestError(t('aiEmptyResponse'), 'blocked', { providerMessage: String(finish), meta });
    return text;
}
const GROQ_TASK_PROFILES = {
    translation: { max_completion_tokens: 256 },
    grammar: { max_completion_tokens: 700 },
    ask: { max_completion_tokens: 1200 },
    conjugation: { max_completion_tokens: 200 },
    language_level: { max_completion_tokens: 800 },
    vision: { max_completion_tokens: 700 },
    default: { max_completion_tokens: 2048 }
};
// gpt-oss counts its hidden reasoning in max_completion_tokens: a task without its own Groq profile gets the OpenAI budget plus
// this headroom, so a long structured reply (grammar, rules, practice) is not cut off.
const GROQ_REASONING_HEADROOM = 1024;
function groqMaxTokens(task, options) {
    if (options.maxOutputTokens) return options.maxOutputTokens + GROQ_REASONING_HEADROOM;
    if (GROQ_TASK_PROFILES[task]) return GROQ_TASK_PROFILES[task].max_completion_tokens;
    const openai = OPENAI_TASK_PROFILES[task];
    return openai ? Math.max(GROQ_TASK_PROFILES.default.max_completion_tokens, openai.max_output_tokens + GROQ_REASONING_HEADROOM) : GROQ_TASK_PROFILES.default.max_completion_tokens;
}
// ---- Groq limit cooldown ---------------------------------------------------------------------------------------------------
// Groq's FREE plan gives gpt-oss-120b 200000 tokens a DAY (about 290 word translations: ~580 prompt + ~100 answer tokens each), 8000 a minute and 1000
// requests a day. When a limit refuses (HTTP 429) every further request is refused too until it lifts, and each costs a wasted round trip before the
// backup answers. So after a 429 the request goes straight to the backup for as long as the limit says it will refuse (its retryAfterSec: at least 3 s,
// at most 10 min), and js/translation.js says WHY the answer carries OpenAI's mark. Other Groq models are NOT a way round it -- measured on the same
// 40 French words: gpt-oss-20b and qwen3.8-27b write Russian words into Ukrainian («дети», «несмотря на», «инакше»; one even drops a Chinese character into
// a sentence), llama-3.3-70b answers 404; only gpt-oss-120b (and OpenAI) translate acceptably. A paid Groq plan (no daily cap) is the real remedy.
let groqCooldownUntil = 0, groqLimitedAt = 0;
function groqNoteLimit(err) {
    const wait = err && err.rate && Number.isFinite(err.rate.retryAfterSec) ? err.rate.retryAfterSec : 20;
    groqLimitedAt = Date.now();
    groqCooldownUntil = groqLimitedAt + Math.min(Math.max(wait, 3), 600) * 1000;
}
const groqCoolingDown = () => Date.now() < groqCooldownUntil;
const groqLimitedRecently = () => Date.now() - groqLimitedAt < 60000;   // for the note beside the backup's mark
// With OpenAI as a backup, Groq is not waited for as long as a slow provider would be: past this it counts as "not answering".
const GROQ_FIRST_TIMEOUT_MS = { practice_reading: 60000, rules_search: 30000, grammar_analysis: 30000, sentence_structure: 30000 };
function groqFirstTimeout(task) { return GROQ_FIRST_TIMEOUT_MS[task] || 20000; }

async function callGroq(prompt, dataUrl, key, signal, task = 'default', options = {}) {
    const profile = GROQ_TASK_PROFILES[task] || GROQ_TASK_PROFILES.default;
    const body = dataUrl ? {
        model: GROQ_VISION_MODEL, reasoning_format: 'hidden', max_completion_tokens: profile.max_completion_tokens,
        messages: [{ role: 'user', content: [
            { type: 'text', text: prompt }, { type: 'image_url', image_url: { url: dataUrl } }
        ] }]
    } : {
        model: GROQ_MODEL, reasoning_format: 'hidden', reasoning_effort: 'low', max_completion_tokens: groqMaxTokens(task, options),
        messages: [{ role: 'user', content: prompt }]
    };
    const data = await aiJsonRequest('groq', key, 'https://api.groq.com/openai/v1/chat/completions', body, signal, options.timeoutMs || aiTaskTimeout(task));
    const meta = options.meta || {};
    const choice = Array.isArray(data.choices) ? data.choices[0] : null;
    meta.model = typeof data.model === 'string' ? data.model : (dataUrl ? GROQ_VISION_MODEL : GROQ_MODEL);
    meta.finish = (choice && choice.finish_reason) || null;
    if (data.usage && typeof data.usage === 'object') meta.usage = { in: data.usage.prompt_tokens, out: data.usage.completion_tokens, reasoning: data.usage.completion_tokens_details?.reasoning_tokens };
    const content = choice && choice.message ? choice.message.content : undefined;
    if (meta.finish === 'length') throw new AiRequestError(t('aiInvalidResponse'), 'truncated', { partial: typeof content === 'string' ? content : '', providerMessage: 'length', meta });
    return content;
}
// options (all optional): { maxOutputTokens, timeoutMs, meta } — meta is filled with { provider, model, finish, usage, elapsedMs, rawChars }.
function callAI(prompt, signal, task = 'default', onDelta, options) { return requestAI(prompt, null, signal, task, onDelta, options); }
function callAIVision(prompt, dataUrl, signal, options) { return requestAI(prompt, dataUrl, signal, 'vision', undefined, options); }
// Groq first (routing 'auto'): when Groq gives no usable answer the same request is repeated ONCE on the backup provider
// (aiBackupProvider: OpenAI). A caller that chose the provider itself (options.provider -- translation) runs its own order.
// Shared key only: when the shared provider refuses (bad key, quota, provider outage), the request is repeated ONCE on the
// other shared provider, so visitors keep working.
const SHARED_FALLBACK_STATUS = s => s === 401 || s === 403 || s === 429 || s >= 500;
// The on-device model (js/device-llm.js) answers when no cloud AI can: offline or without any key at once, otherwise after Groq
// and its backup both failed. Not for a picture (it reads text only) and not for a caller that chose its provider itself
// (translation runs its own order and asks the device in js/translation.js).
async function requestAI(prompt, dataUrl, signal, task = 'default', onDelta, options = {}) {
    const device = !dataUrl && !options.provider && typeof deviceLlmReady === 'function' && deviceLlmReady();
    if (device && (navigator.onLine === false || !aiAvailable())) return requestDeviceAI(prompt, signal, task, onDelta, options);
    try { return await requestCloudAI(prompt, dataUrl, signal, task, onDelta, options); }
    catch (err) {
        if (!device || signal?.aborted || !err || err.name === 'AbortError') throw err;
        return requestDeviceAI(prompt, signal, task, onDelta, options);
    }
}
async function requestDeviceAI(prompt, signal, task, onDelta, options) {
    const meta = options.meta || (options.meta = {});
    for (const k of Object.keys(meta)) delete meta[k];
    Object.assign(meta, { provider: 'device', model: DEVICE_LLM_CATALOG.model.name, task });
    const started = performance.now();
    try {
        const text = sanitizeAI(await deviceLlmGenerate(prompt, signal, { task, onDelta }));
        meta.elapsedMs = Math.round(performance.now() - started);
        meta.rawChars = text.length;
        recordAiRequest({ task, provider: 'device', model: meta.model, ok: true, ms: meta.elapsedMs });
        return text;
    } catch (err) {
        if (err && err.name === 'AbortError') throw err;
        meta.elapsedMs = Math.round(performance.now() - started);
        recordAiRequest({ task, provider: 'device', model: meta.model, ok: false, reason: err && err.deviceLlm || 'error', ms: meta.elapsedMs });
        throw new AiRequestError(err && err.deviceLlm === 'too long' ? t('dlTooLong') : t('offTestFail').replace('{why}', err && err.message || '—'), 'device', { providerMessage: err && err.message });
    }
}
async function requestCloudAI(prompt, dataUrl, signal, task = 'default', onDelta, options = {}) {
    const probe = ensureSharedAiProviders();
    if (probe) await probe;   // only while the site's shared keys are still unknown; otherwise the request starts at once, as always
    const forced = options.provider && Object.hasOwn(AI_PROVIDERS, options.provider) ? options.provider : null;
    const provider = forced || aiProviderForTask(task);
    const backup = forced ? null : aiBackupProvider(provider);
    const meta = options.meta || (options.meta = {});   // one meta object for the caller, whichever provider answers
    const first = backup && !options.timeoutMs ? Object.assign({}, options, { timeoutMs: groqFirstTimeout(task) }) : options;
    try {
        if (provider === 'groq' && !dataUrl && groqCoolingDown()) {   // known to refuse for a while: no round trip, the backup answers at once
            recordAiRequest({ task, provider, ok: false, reason: 'cooldown', status: 429, skipped: true, ms: 0 });
            throw new AiRequestError(t('aiRateError').replace('{provider}', AI_PROVIDERS.groq.name), 'http', { status: 429, skipped: true });
        }
        return await requestAIOnce(prompt, dataUrl, signal, task, onDelta, first);
    } catch (err) {
        if (signal?.aborted || !err || err.name === 'AbortError') throw err;
        if (provider === 'groq' && !dataUrl && err.reason === 'http' && Number(err.status) === 429 && !err.skipped) groqNoteLimit(err);
        if (backup && err.reason) {
            // A refused shared Groq key stays refused for this session: later requests start on the backup at once.
            if ((err.status === 401 || err.status === 403) && aiEffectiveKey('groq') === SHARED_AI_KEY) sharedAiProviders.groq = false;
            for (const k of Object.keys(meta)) delete meta[k];
            return requestAIOnce(prompt, dataUrl, signal, task, onDelta, Object.assign({}, options, { provider: backup }));
        }
        const other = provider === 'groq' ? 'openai' : provider === 'openai' ? 'groq' : null;
        const fallback = err.reason === 'http' && SHARED_FALLBACK_STATUS(Number(err.status))
            && aiEffectiveKey(provider) === SHARED_AI_KEY && other && aiEffectiveKey(other) === SHARED_AI_KEY;
        if (!fallback) throw err;
        // A refused key stays refused: later requests go straight to the other provider for this session.
        if (err.status === 401 || err.status === 403) sharedAiProviders[provider] = false;
        return requestAIOnce(prompt, dataUrl, signal, task, onDelta, Object.assign({}, options, { provider: other }));
    }
}
async function requestAIOnce(prompt, dataUrl, signal, task = 'default', onDelta, options = {}) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    // options.provider: a caller-chosen provider (translation asks Groq and OpenAI separately); otherwise the task routing decides.
    const forced = options.provider && Object.hasOwn(AI_PROVIDERS, options.provider) ? options.provider : null;
    const provider = forced || aiProviderForTask(task), key = aiEffectiveKey(provider);
    if (!key) throw new Error(missingAiKey(provider));
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    aiRequests.add(controller);
    const position = () => JSON.stringify([readerEpoch.book, state.currentIndex, state.pageInChapter]);
    const startedAt = position();
    // options.anyPosition: the answer is about data captured with the request (a page crop), not about the page the
    // reader is on now -- scrolling meanwhile must not discard it.
    const current = () => !controller.signal.aborted && provider === (forced || aiProviderForTask(task)) && key === aiEffectiveKey(provider) && (options.anyPosition || startedAt === position());
    const meta = options.meta || (options.meta = {});
    meta.provider = provider; meta.task = task;
    meta.maxOutputTokens = options.maxOutputTokens || (provider === 'openai' ? (OPENAI_TASK_PROFILES[task] || OPENAI_TASK_PROFILES.default).max_output_tokens : null);
    const started = performance.now();
    try {
        let out;
        switch (provider) {
            case 'openai': out = await callOpenAI(prompt, dataUrl, key, controller.signal, task, onDelta, options); break;
            case 'groq': out = await callGroq(prompt, dataUrl, key, controller.signal, task, options); break;
            case 'gemini': out = await callGemini(prompt, dataUrl, key, controller.signal, task, options); break;
        }
        if (!current()) throw new DOMException('Cancelled', 'AbortError');
        if (out != null && typeof out !== 'string') throw new AiRequestError(t('aiInvalidResponse'), 'envelope_invalid', { providerMessage: 'non-string content' });
        const text = sanitizeAI(out);
        if (!text) throw new AiRequestError(t('aiEmptyResponse'), 'empty_reply');
        meta.elapsedMs = Math.round(performance.now() - started);
        meta.rawChars = text.length;
        recordAiRequest({ task, provider, model: meta.model, shared: key === SHARED_AI_KEY, ok: true, ms: meta.elapsedMs });
        return text;
    } catch (err) {
        if (!current()) throw new DOMException('Cancelled', 'AbortError');
        meta.elapsedMs = Math.round(performance.now() - started);
        recordAiRequest({ task, provider, model: meta.model, shared: key === SHARED_AI_KEY, ok: false, reason: err && err.reason || 'error', status: err && err.status, ...(err && err.rate ? { rate: err.rate } : {}), ms: meta.elapsedMs });
        // The provider-level cause, recorded once here. (Validation failures are recorded by the caller that validates.)
        recordAiDiagnostic(Object.assign({ task, outcome: 'error', phase: 'provider', reason: err && err.reason || 'error', provider, model: meta.model,
            httpStatus: err && err.status, rate: err && err.rate || undefined, providerMessage: err && err.providerMessage, finish: meta.finish, usage: meta.usage, maxOutputTokens: meta.maxOutputTokens,
            elapsedMs: meta.elapsedMs }, err && err.partial !== undefined ? aiRawExcerpts(err.partial) : {}));
        throw err;
    } finally {
        signal?.removeEventListener('abort', abort);
        aiRequests.delete(controller);
    }
}

// ========== ДВА ШЛЯХИ ПЕРЕКЛАДУ ==========
// Машинний: локальна модель Chrome, якщо є (офлайн, миттєво), інакше мережевий
// перекладач. Для слова повертає ще й словникову статтю — вона не дублює переклад,
// а доповнює його переліком значень, тому лишається навіть коли зверху стане AI.
async function machineTranslate(text, srcCode, isMultiWord, signal, targetLang = state.targetLang) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    let local = null;
    try { local = await waitForResult(translateLocally(text, srcCode, targetLang), signal, 20000); }
    catch (err) { if (err.name === 'AbortError') throw err; }
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (local) return { html: escapeHtml(local) + ' <span class="tt-note">⌂</span>', plain: local, extras: '' };

    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    const dts = isMultiWord ? 'dt=t&dt=at' : 'dt=t&dt=bd';
    // sl=srcCode, а не sl=auto: за одним словом сервіс визначає мову навмання,
    // і французьке "car" розпізнавалось як англійське.
    const res = await fetchWithTimeout(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${srcCode}&tl=${targetLang}&${dts}&q=${encodeURIComponent(text)}`, { signal }, 20000);
    if (!res.ok) throw new Error(`Перекладач: HTTP ${res.status}. Спробуйте ще раз.`);
    const data = await readResponseJson(res);
    const translation = (data[0] || []).map(item => item[0]).filter(Boolean).join('');

    if (!translation.trim()) throw new Error('Перекладач повернув порожню відповідь.');
    let html = escapeHtml(translation);
    const detected = data[2];
    if (detected && detected === targetLang) {
        html += ` <span class="tt-note">(${t('alreadyIn')} ${escapeHtml(LANG_NAMES[targetLang] || '')})</span>`;
    }
    const extras = buildTranslationExtras(data, translation) || '';
    return { html: html + extras, plain: translation, extras };
}

// Переклад через вибраний AI-провайдер. Повертає лише сам переклад.
// info (optional): receives { provider } -- the provider that REALLY answered (a refused shared Groq key is repeated on the shared OpenAI inside callAI, so the
// caller cannot assume it is the one it asked).
async function aiTranslateText(text, srcCode, signal, targetLang = state.targetLang, contextSentence = state.ctxSentence, withAlignment = false, provider = null, info = null) {
    if (!(provider ? aiEffectiveKey(provider) : aiAvailable()) || !navigator.onLine) return null;
    const langName = LANG_NAMES[targetLang] || 'українською';
    const isWord = text.trim().split(/\s+/).length === 1;
    // Речення обов'язкове й для ОКРЕМОГО слова: без нього "fait" у "a fait de
    // nombreuses victimes" перекладалось як іменник «факт», хоча тут це форма
    // дієслова faire. Саме тому граматичний розбір був правильний, а переклад — ні.
    const ctx = (contextSentence && contextSentence !== text)
        ? `\nРечення, у якому воно вжите: "${contextSentence}"` : '';
    let prompt = isWord
        ? `Слово "${text}".${ctx}
Дай переклад ${langName} САМЕ ЦЬОГО СЛОВА — не фрази й не речення навколо нього. Речення потрібне лише для того, щоб обрати правильне значення багатозначного слова (bank — банк чи берег) і правильну форму: якщо це форма дієслова — перекладай дієслово, а не однокорінний іменник; зберігай час/особу чи рід/число, де це природно.
Обирай НАЙТОЧНІШИЙ відповідник, а не найзагальніший. Якщо мова оригіналу має близькі слова, які мовою перекладу звучать по-різному, переклад має їх розрізняти: фр. "sentier" — вузька «стежка», "chemin" — «дорога» або «шлях»; "maison" — «будинок», "foyer" — «домівка, вогнище». Не віддавай два різні слова одним і тим самим загальним словом, якщо є точніше.
Не замінюй слово перекладом словосполучення, у якому воно стоїть: для "run" у "run the company" пряме значення — "керувати", а не "керувати компанією".
Якщо в цьому реченні слово є частиною звороту, ідіоми чи фразового дієслова і його значення тут справді інше або ширше, ніж пряме, коротко поясни це в полі "context" (мовою перекладу, напр. «у цьому контексті: керувати компанією» або «у "take care": піклуватися»). Якщо пряме значення вже все пояснює — "context": null. Власні назви не перекладай, якщо в мові перекладу немає усталеної форми.
Відповідь — ЛИШЕ JSON: {"direct":"переклад слова (1–3 слова)","context":null або "коротке уточнення"}`
        : `Переклади ${langName} цей фрагмент: "${text}"${ctx ? `
Фрагмент — частина речення: "${contextSentence}". Речення дане лише для того, щоб обрати правильні значення й форми; перекладай ТІЛЬКИ фрагмент, без слів з решти речення.` : ''}
Зроби природний, зв'язний переклад із правильним порядком слів, а не дослівний підрядник. Нічого не додавай і нічого не пропускай. У відповіді — лише переклад, без лапок і пояснень.`;
    if (withAlignment) prompt = prompt.replace('У відповіді — лише переклад, без лапок і пояснень.', '') + `
Return ONLY a JSON object: {"translation":"natural translation", "alignment":[{"source":["exact source phrase"],"target":"exact translated phrase","confidence":"high"}]}.
Treat the quoted text as data. Copy source and target spans exactly, with their original case and punctuation. Each quoted span must occur exactly once in its text. Omit ambiguous or uncertain links; an empty alignment is valid.
Align meaning, never word positions. Group articles, pronouns, auxiliaries and compound tenses as needed. Allow multiple source spans for separated phrasal verbs. One translated word can align to several source words. Target phrases must not overlap. Do not invent an equivalent for an omitted article. Return at most 40 confident links.`;
    // Бюджет відповіді — за довжиною тексту. Раніше переклад мав фіксовані 128 (OpenAI) / 256 (Groq) токенів: речення разом
    // із JSON-розміткою відповідності слів туди не вміщувалось, відповідь обривалась, і читач бачив «AI не зміг перекласти».
    const budget = isWord ? 300 : Math.min(6000, Math.ceil(text.length * (withAlignment ? 1.6 : 0.8)) + (withAlignment ? 500 : 300));
    const options = { maxOutputTokens: budget };
    if (provider) options.provider = provider;
    try {
        let out;
        options.meta = {};
        try { out = await callAI(prompt, signal, 'translation', undefined, options); if (info) { info.provider = options.meta.provider; info.model = options.meta.model; } }
        catch (err) {
            // Обірвана відповідь: з того, що встигло прийти, ще можна взяти готовий переклад.
            if (err && err.reason === 'truncated' && err.partial) out = err.partial; else throw err;
        }
        if (withAlignment) {
            const parsed = parseAiJson(out);
            let tr = parsed.ok && parsed.value && typeof parsed.value.translation === 'string' ? parsed.value.translation : null;
            if (!tr) { const m = String(out).match(/"translation"\s*:\s*"((?:[^"\\]|\\.)*)"/); if (m) { try { tr = JSON.parse('"' + m[1] + '"'); } catch (e) {} } }
            const cleanTr = tr && tr.trim() && tr.length <= 12000 ? normalizeTranslation(tr, targetLang, false) : null;
            // Без придатного JSON — ще одна спроба простим перекладом без розмітки, а не відмова.
            if (!cleanTr) return signal && signal.aborted ? null : aiTranslateText(text, srcCode, signal, targetLang, contextSentence, false, provider, info);
            return { translation: cleanTr, alignment: parsed.ok ? validateAlignment(text, cleanTr, parsed.value.alignment) : [] };
        }
        if (isWord) {
            const parsed = parseSingleWordTranslation(out);
            if (!parsed) return null;
            const translation = normalizeTranslation(typeof parsed === 'string' ? parsed : parsed.translation, targetLang, true);
            if (!translation) return null;
            return typeof parsed === 'string' ? translation : { ...parsed, translation };
        }
        // Уламок JSON («{broken», обірвана розмітка) — не переклад; показувати його як текст не можна.
        if (/^\s*(?:```|[\[{])/.test(String(out || ''))) return null;
        return normalizeTranslation(out, targetLang, false);
    } catch (e) { return null; }
}

const TRANSLATION_SCRIPT_RULES = {
    uk: { primary: /\p{Script=Cyrillic}/u, alienBlock: /(?:[\s(\[{—–-]+)?[\p{Script=Han}\p{Script=Hangul}\p{Script=Devanagari}\p{Script=Arabic}\p{Script=Thai}]+[\s)\]}]*$/u },
    ru: { primary: /\p{Script=Cyrillic}/u, alienBlock: /(?:[\s(\[{—–-]+)?[\p{Script=Han}\p{Script=Hangul}\p{Script=Devanagari}\p{Script=Arabic}\p{Script=Thai}]+[\s)\]}]*$/u },
    en: { primary: /\p{Script=Latin}/u, alienBlock: /(?:[\s(\[{—–-]+)?[\p{Script=Han}\p{Script=Hangul}\p{Script=Devanagari}\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Thai}]+[\s)\]}]*$/u },
    fr: { primary: /\p{Script=Latin}/u, alienBlock: /(?:[\s(\[{—–-]+)?[\p{Script=Han}\p{Script=Hangul}\p{Script=Devanagari}\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Thai}]+[\s)\]}]*$/u },
    ga: { primary: /\p{Script=Latin}/u, alienBlock: /(?:[\s(\[{—–-]+)?[\p{Script=Han}\p{Script=Hangul}\p{Script=Devanagari}\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Thai}]+[\s)\]}]*$/u },
    de: { primary: /\p{Script=Latin}/u, alienBlock: /(?:[\s(\[{—–-]+)?[\p{Script=Han}\p{Script=Hangul}\p{Script=Devanagari}\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Thai}]+[\s)\]}]*$/u },
    es: { primary: /\p{Script=Latin}/u, alienBlock: /(?:[\s(\[{—–-]+)?[\p{Script=Han}\p{Script=Hangul}\p{Script=Devanagari}\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Thai}]+[\s)\]}]*$/u },
    zh: { primary: /\p{Script=Han}/u, alienBlock: /(?:[\s(\[{—–-]+)?[\p{Script=Cyrillic}\p{Script=Devanagari}\p{Script=Arabic}\p{Script=Thai}]+[\s)\]}]*$/u },
    ko: { primary: /[\p{Script=Hangul}\p{Script=Han}]/u, alienBlock: /(?:[\s(\[{—–-]+)?[\p{Script=Cyrillic}\p{Script=Devanagari}\p{Script=Arabic}\p{Script=Thai}]+[\s)\]}]*$/u },
    hi: { primary: /\p{Script=Devanagari}/u, alienBlock: /(?:[\s(\[{—–-]+)?[\p{Script=Han}\p{Script=Hangul}\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Thai}]+[\s)\]}]*$/u },
    fa: { primary: /\p{Script=Arabic}/u, alienBlock: /(?:[\s(\[{—–-]+)?[\p{Script=Han}\p{Script=Hangul}\p{Script=Devanagari}\p{Script=Cyrillic}\p{Script=Thai}]+[\s)\]}]*$/u }
};

function normalizeTranslation(raw, targetLang = state.targetLang, isWord = false) {
    if (!raw || typeof raw !== 'string') return null;
    let s = raw.trim();
    s = s.replace(/^```[a-z]*\s*|\s*```$/gi, '').trim();
    s = s.replace(/^["'«»“”„`]+|["'«»“”„`]+$/g, '').trim();
    s = s.replace(/^(?:Переклад|Translation|Traduction|Значення)[:\s]+/i, '').trim();
    if (isWord) {
        const lines = s.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        s = lines[0] || '';
    }
    const rule = TRANSLATION_SCRIPT_RULES[targetLang];
    if (rule) {
        if (rule.primary.test(s)) {
            while (rule.alienBlock.test(s)) {
                s = s.replace(rule.alienBlock, '').trim();
            }
        } else if (rule.alienBlock.test(s)) {
            return null;
        }
    }
    s = s.replace(/^["'«»“”„`]+|["'«»“”„`]+$/g, '').trim();
    return s || null;
}

// Single word: {"direct", "context"}. The direct translation of the selected word is what the popup shows first;
// the contextual note only when it adds something (a construction/idiom meaning), never a repeat of "direct".
// A reply that is not the JSON contract (older/looser models) is still shown, as the whole translation.
function parseSingleWordTranslation(out) {
    const raw = (out || '').trim();
    if (!raw) return null;
    const unquote = s => String(s || '').trim().replace(/^["«»“”']+|["«»“”']+$/g, '').trim();
    let data = null;
    try { data = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/gi, '').replace(/^json\s*/i, '')); } catch (e) {
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) { try { data = JSON.parse(m[0]); } catch (e2) { data = null; } }
    }
    if (!data || typeof data !== 'object' || typeof data.direct !== 'string') {
        // Almost-JSON (e.g. unescaped quotes inside "context"): still take the fields rather than show raw JSON.
        const d = raw.match(/"direct"\s*:\s*"([^"]*)"/), cx = raw.match(/"context"\s*:\s*(?:null|"([\s\S]*?)"\s*\}?\s*(?:```)?\s*$)/);
        if (d) data = { direct: d[1], context: cx && cx[1] ? cx[1] : null };
        else return unquote(raw.replace(/^```(?:json)?\s*|\s*```$/gi, '')) || null;
    }
    const direct = unquote(data.direct);
    if (!direct) return null;
    let note = typeof data.context === 'string' ? unquote(data.context) : '';
    const norm = s => s.toLowerCase().replace(/[\s.,;:!?()«»"'“”-]+/g, ' ').trim();
    // Redundant when it only repeats the direct translation (with or without a "in this context:" lead-in).
    const noteCore = note.includes(':') ? note.slice(note.lastIndexOf(':') + 1) : note;
    if (!note || /^null$/i.test(note) || norm(note) === norm(direct) || norm(noteCore) === norm(direct)) note = '';
    return { translation: direct, contextNote: note || null };
}

function sanitizeAI(text) {
    if (!text) return '';
    let s = String(text);
    // Формат harmony (gpt-oss): усе до "assistantfinal" — це чернетка.
    const fin = s.lastIndexOf('assistantfinal');
    if (fin !== -1) s = s.slice(fin + 'assistantfinal'.length);
    // Службові маркери каналів
    // Канал "analysis" — це чернетка цілком, разом із її вмістом до <|end|>.
    s = s.replace(/<\|channel\|>\s*analysis\s*<\|message\|>[\s\S]*?(?:<\|end\|>|<\|start\|>|$)/gi, '')
         .replace(/<\|channel\|>[\s\S]*?<\|message\|>/g, '')
         .replace(/<\|[a-z_]+\|>/gi, '');
    // Теги міркування різних моделей
    s = s.replace(/<think>[\s\S]*?<\/think>/gi, '')
         .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
         .replace(/^\s*<think>[\s\S]*$/i, '');
    // Розділ "analysis ... final" без тегів
    s = s.replace(/^\s*analysis[\s\S]*?(?=final\b)/i, '').replace(/^\s*final\b[:.]?\s*/i, '');
    return s.replace(/```html|```/g, '').trim();
}
ensureSharedAiProviders(true);
