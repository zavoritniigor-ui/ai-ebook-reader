"""The REAL-model contract: provider envelope -> JSON extraction -> validation -> Grammar / Practice UI.

A live-AI acceptance run failed with "The AI response was invalid or incomplete" while every mocked test passed, because the mocks
were ideal replies. This suite exercises the real provider code (callAI -> fetch -> envelope classification -> parseAiJson ->
normalizeGrammarAnalysis -> panel) with only `fetch` stubbed, using model-shaped replies that deviate the way real models do, and
proves for each failure class: it is IDENTIFIED (an exact reason), harmless formatting differences are recovered, and genuinely invalid
grammar data is still rejected. See tests/ai_contract_fixtures.py for what the corpus is (and is not).

Sections: 1 provider envelopes (OpenAI / Gemini / Groq)   2 JSON extraction   3 schema tolerance vs genuine rejection
          4 cut-off replies at every position (property test)   5 selection sizes A-E through the real pipeline
          6 diagnostics + developer panel (no prompt, no key)   7 Practice   8 replay of captured live responses
"""
import base64, glob, json, os, re, time
from browser_cdp import CDP
import ai_contract_fixtures as F
import practice_fixtures as PF

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(120)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
KEY = 'test-key-SECRET-9f3a71c2d8'


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1)
        result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


BOOK = "# Travaux\n\n" + F.text_for(range(0, 6)) + "\n"
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=1100, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert")
c.js("localStorage.clear();showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove()")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof normalizeGrammarAnalysis==='function' && typeof parseAiJson==='function'")
c.js("openBookFile(new File([Uint8Array.from(atob(%s),ch=>ch.charCodeAt(0))],'travaux.md',{lastModified:%d}))" % (json.dumps(base64.b64encode(BOOK.encode()).decode()), int(time.time())))
c.wait("els.pages.textContent.includes('PRÉPARER')", timeout=20)
time.sleep(0.6)
c.js("state.targetLang='uk'; showToast=()=>{}")     # the reported run had Ukrainian explanations and the Ukrainian error message

# ------------------------------------------------------------------------------------------------------------------------------
# The fetch stub. It answers as the real providers do (documented envelope shapes) and generates a reply consistent with the text
# the app actually sent, so the request the app builds is what drives the scenario.
# ------------------------------------------------------------------------------------------------------------------------------
c.js(r"""(()=>{
window.__realFetch = window.__realFetch || window.fetch;
window.__stub = { plan: [], practicePlan: [], requests: [], raw: [], known: %s, practiceReading: %s };
const env = (provider, text, o={}) => {
    if (provider==='openai') {
        const out = [{type:'reasoning', summary:[]}];
        if (!o.noMessage) out.push({type:'message', role:'assistant', content:[{type:'output_text', text}]});
        const body = {status: o.truncated ? 'incomplete' : 'completed', model:'gpt-5.6-luna', output: out, usage:{input_tokens:900, output_tokens:o.truncated?1400:800, output_tokens_details:{reasoning_tokens:o.truncated?1350:300}}};
        if (o.truncated) body.incomplete_details = {reason:'max_output_tokens'};
        return body;
    }
    if (provider==='gemini') return {modelVersion:'gemini-3.6-flash', candidates:[{content:{parts: o.noMessage ? [] : [{text}]}, finishReason:o.truncated?'MAX_TOKENS':'STOP'}], usageMetadata:{promptTokenCount:900, candidatesTokenCount:800}};
    return {model:'openai/gpt-oss-120b', choices:[{message:{content:text}, finish_reason:o.truncated?'length':'stop'}], usage:{prompt_tokens:900, completion_tokens:800}};
};
window.__env = env;
const promptOf = (provider, body) => provider==='openai' ? body.input : provider==='gemini' ? body.contents[0].parts[0].text : body.messages[0].content;
const kindOf = p => /language-learning grammar assistant/.test(p) ? 'grammar' : /Conjugate the/.test(p) ? 'paradigm' : /READING MATERIAL/.test(p) ? 'practice' : 'other';
const textOf = p => { const m = /Text \(a JSON string[^:]*: (".*")\n/.exec(p); return m ? JSON.parse(m[1]) : ''; };
const cut = (full, keepItems) => {          // a reply cut off after `keepItems` complete items plus the start of the next one
    const marker = '"items":[';
    const i = full.indexOf(marker) + marker.length; let depth = 0, inStr = false, esc = false, count = 0;
    for (let k = i; k < full.length; k++) {
        const ch = full[k];
        if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
        if (ch === '"') inStr = true; else if (ch === '{') depth++; else if (ch === '}') { depth--; if (!depth && ++count === keepItems) return full.slice(0, k + 1) + ',{"pos":"verb","lemma":"ef'; }
    }
    return full;
};
window.__cut = cut;
window.fetch = async (url, opts) => {
    const u = String(url);
    const provider = /api\.openai\.com/.test(u) ? 'openai' : /generativelanguage/.test(u) ? 'gemini' : /api\.groq\.com/.test(u) ? 'groq' : null;
    if (!provider) return __realFetch(url, opts);
    const body = opts && opts.body ? JSON.parse(opts.body) : {};
    const prompt = promptOf(provider, body), kind = kindOf(prompt);
    const rec = {provider, kind, url:u, maxTokens: body.max_output_tokens || null, text: textOf(prompt), chars: textOf(prompt).length, lite: /always null/.test(prompt), promptHasTapped: /The learner tapped/.test(prompt)};
    __stub.requests.push(rec);
    const spec = __stub.raw.shift();
    let step;
    if (spec) step = spec;
    else if (kind==='grammar') step = __stub.plan.shift() || {mode:'ok'};
    else if (kind==='practice') step = __stub.practicePlan.shift() || {mode:'reading'};
    else if (kind==='paradigm') step = {mode:'text', text: JSON.stringify({forms:{}})};
    else step = {mode:'text', text:'ok'};
    if (step.hang) return new Promise((_, rej) => opts.signal.addEventListener('abort', () => rej(new DOMException('aborted','AbortError'))));
    if (step.netfail) throw new TypeError('Failed to fetch');
    if (step.http) return new Response(step.body !== undefined ? step.body : '', {status: step.http});
    if (step.envelope !== undefined) return new Response(typeof step.envelope === 'string' ? step.envelope : JSON.stringify(step.envelope), {status:200});
    let text, o = {};
    if (kind==='grammar') {
        const t = textOf(prompt);
        const present = __stub.known.filter(k => t.includes(k.sentence));
        const lite = rec.lite;
        const items = present.flatMap(k => k.items.map(x => lite ? Object.assign({}, x, {forms:null, stemBreakdown:null}) : x));
        const reply = {language:'fr', items};
        let full = JSON.stringify(reply);
        rec.itemsInReply = items.length;
        if (step.mode==='ok') text = full;
        else if (step.mode==='fenced') text = 'Voici l\'analyse demandée :\n```json\n' + JSON.stringify(reply, null, 2) + '\n```\nN\'hésitez pas si besoin.';
        else if (step.mode==='inner_quotes') text = full.replace(/"explanation":"([^"]*)"/g, (m, e) => '"explanation":"Форма "' + (e.split(' ')[0] || 'x') + '" — це, "приклад", тут."');
        else if (step.mode==='extras') { const r = Object.assign({}, reply, {meta:{note:'x'}, items: items.map(x => Object.assign({}, x, {confidence:0.9, translation:'t'}))}); text = JSON.stringify(r); }
        else if (step.mode==='truncate') { text = cut(full, step.keep); o.truncated = true; }
        else if (step.mode==='reasoning_only') { text = ''; o.truncated = true; o.noMessage = true; }
        else if (step.mode==='raw') text = step.text;
        else if (step.mode==='raw_truncated') { text = step.text; o.truncated = true; }
        else if (step.mode==='object') text = JSON.stringify(step.object);
    } else if (kind==='practice') {
        if (step.mode==='reading') text = JSON.stringify(__stub.practiceReading);
        else if (step.mode==='raw') text = step.text;
        else if (step.mode==='truncate') { text = step.text; o.truncated = true; }
    } else text = step.text;
    rec.step = step.mode;
    return new Response(JSON.stringify(env(provider, text, o)), {status:200});
};
return true; })()""" % (json.dumps(F.KNOWN, ensure_ascii=False), json.dumps(PF.VERBS_FR, ensure_ascii=False)))


def use(provider):
    c.js("state.activeAiProvider=%s; state.apiKey=''; state.groqKey=''; state.openaiKey=''; state.%s=%s; grammarAnalysisCache.clear(); __stub.plan.length=0; __stub.requests.length=0; __stub.raw.length=0"
         % (json.dumps(provider), {'openai': 'openaiKey', 'gemini': 'apiKey', 'groq': 'groqKey'}[provider], json.dumps(KEY)))


def call_ai(provider, spec, task='grammar_analysis', timeout_ms=None):
    """One call through the REAL provider code; returns the outcome + the diagnostics entry it produced."""
    use(provider)
    c.js("__stub.raw.push(%s)" % json.dumps(spec))
    opts = "{timeoutMs:%d}" % timeout_ms if timeout_ms else "{}"
    return c.js("""(async()=>{ const n=readerAiDiagnostics().length; const meta={};
        const o=%s; o.meta=meta;
        try { const text=await callAI('PROMPT-ONLY-MARKER-77 You are a language-learning grammar assistant. detect its VERBS', new AbortController().signal, %s, undefined, o); return {ok:true, text, meta}; }
        catch(e){ return {ok:false, reason:e.reason||null, name:e.name, message:e.message, partial:e.partial===undefined?null:e.partial, status:e.status||null, providerMessage:e.providerMessage||null, meta, diag:readerAiDiagnostics().slice(n)}; } })()""" % (opts, json.dumps(task)))


def msg(key):
    return c.js("t(%s)" % json.dumps(key))


PARTIAL = '{"language":"fr","items":[{"pos":"verb","lemma":"établir","surface":"Établi","sentence":"Établi un diagnostic du travail à effectuer.","occurrence":1,"features":{},"explanation":"x","forms":null},{"pos":"verb","lem'

# ==============================================================================================================================
print("\n=== SECTION 1: provider envelopes -- every class of failure gets its own reason ===")
ENV_OK = 'complete reply: the text is returned'
for provider in ('openai', 'gemini', 'groq'):
    r = call_ai(provider, dict(envelope=c.js("__env(%s, '{\"language\":\"fr\",\"items\":[]}')" % json.dumps(provider))))
    assert r['ok'] and r['text'] == '{"language":"fr","items":[]}', (provider, r)
    assert r['meta']['provider'] == provider and r['meta']['model'], r['meta']
print('PASS 1: a complete reply on OpenAI / Gemini / Groq returns the text and reports provider + model in meta', flush=True)

for provider in ('openai', 'gemini', 'groq'):
    r = call_ai(provider, dict(envelope=c.js("__env(%s, %s, {truncated:true})" % (json.dumps(provider), json.dumps(PARTIAL, ensure_ascii=False)))))
    assert not r['ok'] and r['reason'] == 'truncated' and r['partial'] == PARTIAL, (provider, r)
    assert r['message'] == msg('aiInvalidResponse'), 'learner message stays the existing simple one for callers that do not recover'
    assert r['diag'] and r['diag'][-1]['reason'] == 'truncated' and r['diag'][-1]['provider'] == provider, r['diag']
print("PASS 1: a reply cut off by the token cap is 'truncated' on all three providers (OpenAI status:incomplete/max_output_tokens, Gemini MAX_TOKENS, Groq finish_reason:length) and KEEPS the partial text", flush=True)
r = call_ai('openai', dict(envelope=c.js("__env('openai', '', {truncated:true, noMessage:true})")))
assert not r['ok'] and r['reason'] == 'truncated' and r['partial'] == '', r
print('PASS 1: OpenAI incomplete where the reasoning consumed the whole budget (no message at all) is truncated with an empty partial', flush=True)
r = call_ai('openai', dict(envelope=dict(status='incomplete', incomplete_details=dict(reason='content_filter'), output=[])))
assert r['reason'] == 'blocked', r
r = call_ai('gemini', dict(envelope=dict(candidates=[dict(finishReason='SAFETY')])))
assert r['reason'] == 'blocked' and r['providerMessage'] == 'SAFETY', r
r = call_ai('gemini', dict(envelope=dict(promptFeedback=dict(blockReason='OTHER'), candidates=[])))
assert r['reason'] == 'blocked', r
print('PASS 1: content-filter / safety / block reasons are "blocked" (not "invalid")', flush=True)
r = call_ai('openai', dict(envelope=dict(status='failed', error=dict(message='The server had an error', code='server_error'), output=[])))
assert r['reason'] == 'provider_error' and 'server had an error' in (r['providerMessage'] or ''), r
r = call_ai('openai', dict(envelope=dict(status='completed', error=None, output=[dict(type='message', role='assistant', content=[dict(type='output_text', text='fine')])])))
assert r['ok'] and r['text'] == 'fine', 'error:null is the NORMAL success shape and must not be read as an error'
print("PASS 1: OpenAI status:failed carries the provider message; the ordinary `error: null` of a success is not mistaken for an error", flush=True)
r = call_ai('gemini', dict(envelope=dict(candidates=[dict(content=dict(parts=[dict(text='pensée interne', thought=True), dict(text='{"a":1}')]), finishReason='STOP')])))
assert r['ok'] and r['text'] == '{"a":1}', r
print("PASS 1: Gemini 'thought' parts are not part of the answer (they would corrupt the JSON)", flush=True)
for provider, spec, reason in [('openai', dict(envelope=[1, 2]), 'envelope_invalid'), ('gemini', dict(envelope='not json at all'), 'envelope_invalid'),
                               ('groq', dict(envelope=dict(choices=[dict(message=dict(content=None), finish_reason='stop')])), 'empty_reply'),
                               ('gemini', dict(envelope=dict(candidates=[dict(content=dict(parts=[dict(text='')]), finishReason='STOP')])), 'empty_reply')]:
    r = call_ai(provider, spec)
    assert not r['ok'] and r['reason'] == reason, (provider, reason, r)
print("PASS 1: a non-object / non-JSON envelope is 'envelope_invalid'; an empty reply is 'empty_reply'", flush=True)
for provider in ('openai', 'gemini', 'groq'):
    r = call_ai(provider, dict(http=400, body=json.dumps(dict(error=dict(message='max_output_tokens too small for this model')))))
    assert r['reason'] == 'http' and r['status'] == 400 and 'max_output_tokens' in r['providerMessage'], (provider, r)
    assert KEY not in json.dumps(r['diag'])
for status, key in [(401, 'aiAuthError'), (429, 'aiRateError'), (500, 'aiRequestError')]:
    r = call_ai('openai', dict(http=status, body='{}'))
    assert r['reason'] == 'http' and r['status'] == status and r['message'].startswith(msg(key).split('{provider}')[0]), r
print("PASS 1: HTTP failures carry the status and the provider's own message (developer diagnostics only); the learner text is unchanged", flush=True)
r = call_ai('groq', dict(netfail=True))
assert r['reason'] == 'network', r
r = call_ai('openai', dict(hang=True), timeout_ms=120)
assert r['reason'] == 'timeout', r
print("PASS 1: an unreachable provider is 'network', a hung one 'timeout'", flush=True)

# ==============================================================================================================================
print("\n=== SECTION 2: JSON extraction -- harmless formatting is recovered, structure is not invented ===")
GOOD = json.dumps(F.reply_for([1]), ensure_ascii=False)
ITEMS_N = len(F.reply_for([1])['items'])


def extract(raw, array=False):
    return c.js("(()=>{const r=parseAiJson(%s,{array:%s}); const v=r.value; return {ok:r.ok, items:r.ok&&v&&v.items?v.items.length:null, notes:r.notes, truncated:r.truncated, error:r.error}})()" % (json.dumps(raw, ensure_ascii=False), 'true' if array else 'false'))


CASES = [
    ('a fenced block with prose before and after', "Voici l'analyse :\n```json\n" + GOOD + "\n```\nBonne lecture !", 'fence'),
    ('preamble + epilogue containing braces', "Résultat : " + GOOD + "\nNote {à ignorer}.", 'preamble'),
    ('trailing commas', GOOD.replace('"forms": null}', '"forms": null,}').replace(']}', ',]}'), 'trailing_comma'),
    ('an UNESCAPED double quote inside a Ukrainian explanation', GOOD.replace('"Infinitif après « à » : le travail qu\'il reste à faire."', '"Форма "effectuer" — інфінітив після "à"."'), 'inner_quotes'),
    ('a raw newline inside a string', GOOD.replace('Participe passé', 'Participe\npassé'), 'control_chars'),
    ('// comments', GOOD.replace('"language": "fr",', '"language": "fr", // langue\n'), 'comments'),
    ('a UTF-8 BOM and zero-width spaces', '﻿​' + GOOD, None),
]
for name, raw, note in CASES:
    assert raw != GOOD, ('this case does not actually deviate from the plain reply', name)
    r = extract(raw)
    assert r['ok'] and r['items'] == ITEMS_N and not r['truncated'], (name, r)
    if note:
        assert note in r['notes'], (name, r['notes'])
    print('PASS 2: recovered %s%s' % (name, ' [' + ','.join(r['notes']) + ']' if r['notes'] else ''), flush=True)
r = extract('{"language":"fr","items":[{"explanation":"Le verbe "effectuer", est ici en infinitif.","pos":"verb"}]}')
assert r['ok'] and r['items'] == 1 and 'inner_quotes' in r['notes'], r
print('PASS 2: an inner quote directly followed by a comma ("Le verbe "effectuer", est ...") is still read correctly', flush=True)
for name, raw in [('prose with no JSON', 'Je ne peux pas répondre à cela.'), ('an empty reply', ''), ('a bare top-level array (no language echo)', '[' + json.dumps(F.reply_for([1])['items'][0], ensure_ascii=False) + ']'),
                  ('mismatched brackets', '{"items":[}]}'), ('an unquoted token', '{"items": [nonsense]}')]:
    r = extract(raw)
    assert not r['ok'], (name, r)
print("PASS 2: prose, empty replies, a bare array root, mismatched brackets and unquoted tokens are NOT accepted", flush=True)
assert c.js("normalizeGrammarAnalysis('[]','fr','x',null).error") == 'malformed_json'
assert c.js("normalizeGrammarAnalysis('','fr','x',null).error") == 'empty_reply'
print("PASS 2: reasons at the Grammar level: bare array -> malformed_json, empty -> empty_reply", flush=True)

# ==============================================================================================================================
print("\n=== SECTION 3: schema tolerance vs genuine rejection (the reported French page) ===")
T = F.text_for(range(0, 6))


def norm(obj_or_raw, text=T, focus=None):
    raw = obj_or_raw if isinstance(obj_or_raw, str) else json.dumps(obj_or_raw, ensure_ascii=False)
    return c.js("""(()=>{const r=normalizeGrammarAnalysis(%s,'fr',%s,%s);
        return {ok:r.ok,error:r.error,partial:r.partial,suspect:r.suspect,notes:r.notes,
                kept:r.items.map(i=>({pos:i.pos,lemma:i.lemma,surface:i.surface,start:i.start,sentence:i.sentence,tapped:i.tapped,forms:i.forms})),
                rejected:r.rejected.map(x=>x.reason+':'+x.surface), adjusted:r.adjusted.map(a=>a.reason+(a.detail?'('+a.detail+')':''))}})()""" % (
        json.dumps(raw, ensure_ascii=False), json.dumps(text, ensure_ascii=False), json.dumps(focus)))


def it(pos, lemma, surface, sentence, **kw):
    return dict(dict(pos=pos, lemma=lemma, surface=surface, sentence=sentence, occurrence=1, agreesWith=None, features={}, explanation='x', stemBreakdown=None, forms=None), **kw)


DEV = {'language': 'fr', 'items': [
    it('VERB', 'PRÉPARER', 'PRÉPARER', 'PRÉPARER LES TRAVAUX'),
    it('Verbe', 'établir', 'établi', 'Établi un diagnostic du travail à effectuer'),
    it('verb', 'effectuer', 'effectuer', F.SENTENCES[1], occurrence='1'),
    it('verb', 'mettre en place', 'Mettre', F.SENTENCES[4]),
    it('verb', 'effectuer', 'effectuer', F.SENTENCES[4]),
    it('verb', 'appliquer', 'Appliquer', F.SENTENCES[5]),
    it('adjective', 'visuel', 'visuelle', F.SENTENCES[2], agreesWith='Observation', forms={'ms': 'visuel', 'fs': 'visuelle', 'mp': 'visuels', 'fp': 'visuelles'}),
    it('adjective', 'sécuritaire', 'sécuritaires', F.SENTENCES[5], agreesWith=['mesures']),
    it('verb', 'inventer', 'inventer', 'Inventer les travaux.'),
    it('noun', 'travail', 'travail', F.SENTENCES[1]),
    it('verb', 'effectue', 'effectue', 'x'),
    it('verb', 'effectuer', 'effectuer', 'Une phrase inventée qui contient effectuer.'),
]}
r = norm(DEV)
kept = {(k['pos'], k['lemma'], k['surface']) for k in r['kept']}
for want in [('verb', 'préparer', 'PRÉPARER'), ('verb', 'établir', 'Établi'), ('verb', 'effectuer', 'effectuer'), ('verb', 'mettre', 'Mettre'), ('verb', 'appliquer', 'Appliquer'),
             ('adjective', 'visuel', 'visuelle'), ('adjective', 'sécuritaire', 'sécuritaires')]:
    assert want in kept, (want, sorted(kept), r['rejected'])
assert r['ok'] and not r['suspect'], r
print("PASS 3: harmless differences are recovered on the real page: pos 'VERB'/'Verbe', occurrence \"1\", a caps heading lemma, a lower-cased capitalised surface ('établi' -> 'Établi'), a phrase lemma ('mettre en place' -> 'mettre'), a sentence without its final period, agreesWith as an array", flush=True)
assert {'lemma_lowercased', 'surface_recased(établi)', 'lemma_trimmed(mettre)'} <= set(r['adjusted']), r['adjusted']
print("PASS 3: every recovery is RECORDED (never silent): %s" % r['adjusted'], flush=True)
by = {(k['pos'], k['surface']): k for k in r['kept']}
assert by[('verb', 'Établi')]['sentence'] == F.SENTENCES[1] and F.SENTENCES[1][by[('verb', 'Établi')]['start']:].startswith('Établi'), by[('verb', 'Établi')]
assert by[('verb', 'PRÉPARER')]['sentence'] == 'PRÉPARER LES TRAVAUX.' or by[('verb', 'PRÉPARER')]['sentence'].startswith('PRÉPARER LES TRAVAUX')
print("PASS 3: the displayed sentence and offset come from the SOURCE text, not from the model's paraphrase", flush=True)
assert {'duplicate:effectuer', 'surface_not_in_text:inventer', 'unsupported_pos:travail', 'surface_not_in_text:effectue', 'sentence_not_in_text:effectuer'} <= set(r['rejected']), r['rejected']
print("PASS 3: genuinely invalid items are STILL rejected: a fabricated surface, a noun, a form not in the text, an invented sentence whose surface is ambiguous, a duplicate", flush=True)
fin = norm({'language': 'fr', 'items': [it('verb', 'effectue', 'effectuer', F.SENTENCES[1])]})
assert fin['kept'] == [] and 'lemma_not_infinitive:effectuer' in fin['rejected'], fin
print("PASS 3: a finite form given as the lemma ('effectue') is still rejected", flush=True)
wl = norm({'language': 'en', 'items': [it('verb', 'effectuer', 'effectuer', F.SENTENCES[1])]})
assert not wl['ok'] and wl['error'] == 'language_mismatch', wl
allbad = norm({'language': 'fr', 'items': [it('verb', 'inventer', 'inventer', 'Inventer.'), it('verb', 'forger', 'forger', 'Forger.')]})
assert allbad['ok'] and allbad['kept'] == [] and allbad['suspect'] is True, allbad
print("PASS 3: a wrong-language echo is rejected; a reply whose EVERY item is invalid is flagged 'suspect' (not silently 'no verbs')", flush=True)
split = norm({'language': 'fr', 'verbs': [{k: v for k, v in it('x', 'effectuer', 'effectuer', F.SENTENCES[1]).items() if k != 'pos'}],
              'adjectives': [{k: v for k, v in it('x', 'visuel', 'visuelle', F.SENTENCES[2]).items() if k != 'pos'}]})
assert {(k['pos'], k['surface']) for k in split['kept']} == {('verb', 'effectuer'), ('adjective', 'visuelle')} and 'split_arrays' in split['notes'], split
noecho = norm({'items': [it('verb', 'effectuer', 'effectuer', F.SENTENCES[1])]})
assert noecho['ok'] and len(noecho['kept']) == 1
print("PASS 3: {verbs:[...], adjectives:[...]} is understood (part of speech implied by the key); a missing language echo inside an object is accepted, as before", flush=True)
gr = norm({'language': 'fr', 'items': [it('verb', 'vérifier', 'vérifie', F.SENTENCES[6], forms={'je': 'vérifie', 'tu': 'vérifies', 'il': 'vérifie', 'nous': 'vérifions', 'vous': 'vérifiez', 'ils': 'vérifient'})]}, text=F.SENTENCES[6])
assert gr['kept'] and gr['kept'][0]['forms'] and set(gr['kept'][0]['forms']) == {'je', 'tu', 'il / elle / on', 'nous', 'vous', 'ils / elles'}, gr
print("PASS 3: abbreviated person keys ('il', 'ils') in a conjugation table are mapped onto the declared slots and the table is kept", flush=True)
ex = norm({'language': 'fr', 'items': [dict(it('verb', 'effectuer', 'effectuer', F.SENTENCES[1]), confidence=0.9, translation='to carry out', features={'mood': 'infinitif', 'voice': 'active'})], 'meta': {'note': 'x'}})
assert ex['ok'] and len(ex['kept']) == 1 and 'unsupported_feature(voice)' in ex['adjusted']
print("PASS 3: fields intended for a larger analysis (extra top-level keys, per-item confidence/translation, an unsupported feature) are ignored, not fatal", flush=True)

# ==============================================================================================================================
print("\n=== SECTION 4: a reply cut off at EVERY position keeps exactly the complete items before the cut ===")
FULL_ITEMS = F.reply_for(range(0, 14), lite=True)['items']
c.js("window.__fullItems=%s; window.__T14=%s" % (json.dumps(FULL_ITEMS, ensure_ascii=False), json.dumps(F.text_for(range(0, 14)), ensure_ascii=False)))
res = c.js(r"""(()=>{
  const head='{"language":"fr","items":['; const parts=__fullItems.map(x=>JSON.stringify(x)); const full=head+parts.join(',')+']}';
  const ends=[]; let pos=head.length; parts.forEach(p=>{ pos+=p.length; ends.push(pos); pos+=1; });
  const out={cuts:0, ok:0, truncatedErr:0, badItem:[], notMonotonic:[], threw:[], lostComplete:[]}; let prevKept=0;
  for (let L=8; L<=full.length; L+=3) {
    out.cuts++;
    let r; try { r=normalizeGrammarAnalysis(full.slice(0,L),'fr',__T14,null); } catch(e){ out.threw.push(L); continue; }
    const complete=ends.filter(e=>e<=L).length;
    if (r.ok && !r.error) {
      out.ok++;
      r.items.forEach(k=>{ if(!__fullItems.some(f=>f.lemma===k.lemma&&f.surface===k.surface)) out.badItem.push([L,k.lemma]); });
      if (L<full.length && !r.partial && complete<__fullItems.length) out.badItem.push([L,'not flagged partial']);
      if (r.items.length < prevKept) out.notMonotonic.push(L); prevKept=r.items.length;
      // every one of the first `complete` items that is valid must have been kept (none may be lost to the cut)
      const expected=normalizeGrammarAnalysis(head+parts.slice(0,complete).join(',')+']}','fr',__T14,null).items.length;
      if (r.items.length!==expected) out.lostComplete.push([L, r.items.length, expected]);
    } else if (r.error==='truncated') out.truncatedErr++; else out.badItem.push([L,'error '+r.error]);
  }
  return out; })()""")
assert not res['threw'] and not res['badItem'] and not res['notMonotonic'] and not res['lostComplete'], res
print("PASS 4: %d cut positions across a 14-sentence reply: never an exception, never a half-built item, never an item that is not in the full reply, the kept count is monotonic, and EXACTLY the complete items before the cut are kept (%d partial, %d cut inside the first item)" % (res['cuts'], res['ok'], res['truncatedErr']), flush=True)
pr = c.js(r"""(()=>{ const full=JSON.stringify(%s); const out={bad:[], accepted:0, rejected:0, prev:0, mono:true};
  for (let L=20; L<=full.length; L+=17) {
    try { const info={}; const r=parseAndValidatePracticeReading(full.slice(0,L),{language:'fr',mode:'verbs'},info);
      out.accepted++; if (r.paragraphs.length<out.prev) out.mono=false; out.prev=r.paragraphs.length;
      if (L<full.length-5 && !info.truncated) out.bad.push(['not flagged',L]); if (r.targets.some(t=>t.paragraphIndex>=r.paragraphs.length)) out.bad.push(['dangling target',L]); }
    catch(e){ out.rejected++; if(!/Invalid reading|Failed to parse/.test(e.message)) out.bad.push([L,e.message]); } }
  return out; })()""" % json.dumps(PF.VERBS_FR, ensure_ascii=False))
assert not pr['bad'] and pr['mono'], pr
print("PASS 4: the same for Practice: %d cuts accepted once the floors (10 items / 900 chars / 3 targets) are met, %d rejected with a validation reason; never a dangling target or an unflagged cut" % (pr['accepted'], pr['rejected']), flush=True)


# ==============================================================================================================================
print("\n=== SECTION 5: selection sizes A-E through the real request/response pipeline ===")


def run_grammar(text, focus_sentence=None, plan=None, provider='openai', mode='verbs'):
    use(provider)
    c.js("__stub.plan.push(...%s); state.lastGrammarSentence=%s; grammarContext.mode=%s" % (json.dumps(plan or [], ensure_ascii=False), json.dumps(focus_sentence or ''), json.dumps(mode)))
    c.js("window.__done=false; startAiTask(%s,'grammar').then(()=>{__done=true})" % json.dumps(text, ensure_ascii=False))
    c.wait("__done===true && !els.grammarContent.querySelector('.spinner-large')", timeout=40)
    time.sleep(0.15)
    return c.js("""(()=>{const err=els.grammarContent.querySelector('span[style*="red"]'); const an=grammarContext.analysis;
        return {error: err?err.textContent:null, retry: !!els.grammarContent.querySelector('button'), notes:[...els.grammarContent.querySelectorAll('.grammar-note')].map(n=>n.textContent),
                items: an?an.items.length:null, partial: an?!!an.partial:null, suspect: an?!!an.suspect:null, cards:[...els.grammarContent.querySelectorAll('.grammar-card-lemma')].map(b=>b.textContent),
                requests: __stub.requests.filter(r=>r.kind==='grammar').map(r=>({maxTokens:r.maxTokens, chars:r.chars, lite:r.lite, tapped:r.promptHasTapped, n:r.itemsInReply, step:r.step})),
                diag: readerAiDiagnostics().filter(d=>d.task==='grammar_analysis').slice(-3)}})()""")


# A. one tapped word (sentence context); the model answers with extras
a_ = run_grammar('effectuer', F.SENTENCES[1], plan=[dict(mode='extras')])
assert a_['error'] is None and a_['items'] == 2 and a_['requests'][0]['tapped'] and not a_['requests'][0]['lite'], a_
assert a_['diag'][-1]['reason'] in ('ok', 'ok_recovered') and a_['diag'][-1]['selection']['words'] == 7
tokA = a_['requests'][0]['maxTokens']
print("PASS A: ONE TAPPED WORD in its sentence: accepted (%d items) although the model added fields for a larger analysis; full contract; %d output tokens" % (a_['items'], tokA), flush=True)
# switching modes reuses the analysis: zero further requests
before = c.js("__stub.requests.length")
c.js("switchGrammarMode('adjectives'); switchGrammarMode('verbs')")
assert c.js("__stub.requests.length") == before
assert c.js("(()=>{switchGrammarMode('adjectives'); const n=document.querySelectorAll('#grammar-controls-bar button').length; switchGrammarMode('verbs'); return n})()") == 0
print("PASS A: Verbes <-> Adjectifs reuses the cached analysis (0 requests) and Adjectifs shows no tense controls", flush=True)
# B. one sentence selected
b_ = run_grammar(F.SENTENCES[1])
assert b_['error'] is None and b_['items'] == 2 and b_['requests'][0]['maxTokens'] == tokA and not b_['requests'][0]['lite'], b_
print("PASS B: ONE SENTENCE: accepted (%d items), same small budget (%d tokens), full contract" % (b_['items'], b_['requests'][0]['maxTokens']), flush=True)
# C. several sentences (the reported page)
c_ = run_grammar(F.SEVERAL_C)
assert c_['error'] is None and c_['items'] == 10 and c_['requests'][0]['lite'] and c_['requests'][0]['maxTokens'] > tokA, c_
print("PASS C: SEVERAL SENTENCES (the reported page): %d items accepted; the budget grows to %d tokens and the lite contract is used" % (c_['items'], c_['requests'][0]['maxTokens']), flush=True)
# D. a paragraph, delivered fenced with unescaped quotes in the explanations
d_ = run_grammar(F.PARAGRAPH_D, plan=[dict(mode='fenced')])
assert d_['error'] is None and d_['items'] == 14 and d_['requests'][0]['lite'], d_   # 27 distinct lemmas exist; a paragraph of ~110 words has a budget of 14, enforced by the validator
d2 = run_grammar(F.PARAGRAPH_D, plan=[dict(mode='inner_quotes')])
assert d2['error'] is None and d2['items'] == 14, d2
assert d2['diag'][-1]['reason'] == 'ok_recovered' and 'inner_quotes' in d2['diag'][-1]['parseNotes'], d2['diag'][-1]
print("PASS D: A PARAGRAPH: %d items; a fenced reply and one with unescaped quotes in the (Ukrainian) explanations are both accepted and reported as 'ok_recovered'" % d_['items'], flush=True)
# E. a large page selection: bounded, honest note, never silently cut
e_ = run_grammar(F.PAGE_E)
rq = e_['requests'][0]
assert e_['error'] is None and e_['items'] == 20 and rq['chars'] <= 1400 and rq['lite'] and rq['maxTokens'] <= 9000, e_
assert e_['notes'] and re.search(r'\b\d+\b.*\b\d+\b', e_['notes'][0]), e_['notes']
assert e_['diag'][-1]['selection']['trimmed'] is True
print("PASS E: A LARGE PAGE SELECTION (%d chars): only whole sentences up to %d chars are analysed, the output budget is bounded (%d tokens), and the learner is told: %r" % (len(F.PAGE_E), rq['chars'], rq['maxTokens'], e_['notes'][0]), flush=True)
assert tokA < c_['requests'][0]['maxTokens'] <= e_['requests'][0]['maxTokens'] <= 9000
print("PASS A-E: the output budget scales with the selection (%d < %d <= %d <= 9000 tokens); the OLD fixed cap was 1400 for all of them" % (tokA, c_['requests'][0]['maxTokens'], e_['requests'][0]['maxTokens']), flush=True)

# A2. a TAP deep inside a very long UNPUNCTUATED run (a dense PDF bullet list; the real page's run is 320-400 chars, denser pages are longer).
# The analysed text is capped, and the cap used to keep only the START of the run: the tapped word was then not in the text the model saw.
BULLETS = ['Observation visuelle et olfactive de l’équipement', 'Utilisation appropriée des instruments de mesure', 'Diagnostic précis de la situation', 'Vérification des bons de travail antérieurs',
           'Consultation des intervenants impliqués', 'Cadenassage et mesures de sécurité appropriées', 'Bonnes méthodes de travail', 'Interprétation correcte des pictogrammes']
LONG_RUN = ' ¡ '.join(BULLETS * 5) + ' ¡ Décision de faire effectuer la réparation par un électricien'
assert len(LONG_RUN) > 1600 and not re.search(r'[.!?]', LONG_RUN)
GRAMMAR_TEXTS = "__stub.requests.filter(r=>r.kind==='grammar').map(r=>r.text)"
a2 = run_grammar('effectuer', LONG_RUN, plan=[dict(mode='ok')])
sent = c.js(GRAMMAR_TEXTS)[-1]
assert a2['error'] is None and len(sent) <= 1400 and 'effectuer' in sent and sent.endswith('par un électricien'), (a2['error'], len(sent), sent[-60:])
assert a2['requests'][-1]['tapped'] is True
print("PASS A2: a tap at the END of a %d-char unpunctuated run keeps the tapped word in the %d chars actually analysed (the cap used to keep the start and drop it)" % (len(LONG_RUN), len(sent)), flush=True)
first = LONG_RUN.replace('Décision de faire effectuer la réparation par un électricien', 'x').replace('Observation visuelle et olfactive de l’équipement ¡', 'Observation visuelle et olfactive de l’effectuer ¡', 1)
a3 = run_grammar('effectuer', first, plan=[dict(mode='ok')])
sent3 = c.js(GRAMMAR_TEXTS)[-1]
assert 'effectuer' in sent3 and sent3.startswith('Observation visuelle') and len(sent3) <= 1400, sent3[:80]
print("PASS A2: a tap near the START of the run is analysed from the start (the window follows the tapped word, it is not always centred on the end)", flush=True)
# the bounded retry after a cut-off reply keeps the half that contains the tapped word (it used to keep the first half)
c.js("__stub.requests.length=0")
a4 = run_grammar('effectuer', LONG_RUN, plan=[dict(mode='reasoning_only')])
texts = c.js(GRAMMAR_TEXTS)
assert len(texts) == 2 and len(texts[1]) < len(texts[0]) and all('effectuer' in t for t in texts), [(len(t), 'effectuer' in t) for t in texts]
print("PASS A2: after a cut-off reply the ONE bounded retry (%d -> %d chars) still contains the tapped word (it used to retry on the first half, without it)" % (len(texts[0]), len(texts[1])), flush=True)
# a tap in the middle of a long MULTI-sentence text: that whole sentence plus neighbours, not a raw character cut; the tapped sentence is placed
# BEYOND the first 1400 characters so that a bound taken from the start would miss it
mid = c.js("""(()=>{ const ss=[]; for (let i=0;i<60;i++) ss.push('Phrase numéro '+i+' avec des mots pour remplir la ligne assez longue.'); ss[45]='Il faut effectuer ce travail avec soin.';
    const text=ss.join(' '); const b=boundGrammarText(text, 1400, 'effectuer'), plain=boundGrammarText(text, 1400);
    return {n:b.text.length, has:b.text.includes('Il faut effectuer ce travail avec soin.'), wholeSentences: /^(Phrase|Il )/.test(b.text) && /\\.$/.test(b.text), kept:b.sentencesKept, total:b.sentencesTotal, plainHasIt: plain.text.includes('effectuer'), plainStart: plain.text.slice(0,14)}; })()""")
assert mid['n'] <= 1400 and mid['has'] and mid['wholeSentences'] and 1 < mid['kept'] < mid['total'] == 60, mid
assert mid['plainHasIt'] is False and mid['plainStart'] == 'Phrase numéro ', mid            # a SELECTION (no tapped word) is still bounded from its start
print("PASS A2: a tap in the middle sentence of a long text keeps that whole sentence and its neighbours (%d of %d sentences, %d chars); a selection without a tapped word is still cut from its start" % (mid['kept'], mid['total'], mid['n']), flush=True)

# cut-off replies through the real pipeline
p1 = run_grammar(F.SEVERAL_C, plan=[dict(mode='truncate', keep=4)])
assert p1['error'] is None and p1['items'] == 4 and p1['partial'] is True and len(p1['requests']) == 1, p1
assert any('cut off' in n or 'обірвалась' in n for n in p1['notes']), p1['notes']
assert p1['diag'][-1]['reason'] == 'partial' and p1['diag'][-1]['truncatedByProvider'] is True
print("PASS truncation: a reply cut off after 4 complete items is SHOWN (4 items) with a 'partial analysis' note -- not reported as 'invalid'", flush=True)
assert c.js("grammarAnalysisCache.size") == 0 or not c.js("[...grammarAnalysisCache.values()].some(a=>a.partial)")
print("PASS truncation: a partial analysis is not cached (a retry gets a fresh chance)", flush=True)
p2 = run_grammar(F.PARAGRAPH_D, plan=[dict(mode='reasoning_only')])
assert p2['error'] is None and p2['items'] >= 8 and len(p2['requests']) == 2, p2
assert p2['requests'][1]['chars'] < p2['requests'][0]['chars'] and p2['requests'][1]['lite'], p2['requests']
print("PASS truncation: cut off with NOTHING usable (the reasoning used the whole budget): ONE bounded retry on the first half of the text (%d -> %d chars, lite) succeeded with %d items" % (p2['requests'][0]['chars'], p2['requests'][1]['chars'], p2['items']), flush=True)
p3 = run_grammar(F.PARAGRAPH_D, plan=[dict(mode='reasoning_only'), dict(mode='reasoning_only')])
assert p3['error'] == msg('aiTruncated') and p3['retry'] and len(p3['requests']) == 2, p3
assert p3['diag'][-1]['reason'] == 'truncated'
print("PASS truncation: still nothing after the bounded retry -> a specific, retryable message (%r), exactly 2 requests, reason 'truncated'" % p3['error'], flush=True)
# every other rejection class shows the one simple message and an exact internal reason
for label, plan, reason, message_key in [
        ('prose instead of JSON', [dict(mode='raw', text='Je ne peux pas répondre à cette demande.')], 'json_extraction_failed', 'aiInvalidResponse'),
        ('wrong language echo', [dict(mode='object', object=dict(language='en', items=[]))], 'language_mismatch', 'aiInvalidResponse'),
        ('no items key', [dict(mode='object', object=dict(language='fr'))], 'schema_failure', 'aiInvalidResponse'),
        ('every item invalid', [dict(mode='object', object=dict(language='fr', items=[it('verb', 'inventer', 'inventer', 'Inventer.')]))], 'no_valid_items', 'grammarNoUsableForms'),
        ('an empty reply', [dict(envelope=dict(status='completed', output=[]))], 'empty_reply', 'aiEmptyResponse')]:
    r = run_grammar(F.SENTENCES[1], plan=plan)
    assert r['error'] == msg(message_key) and r['retry'], (label, r)
    got = r['diag'][-1]['reason'] if r['diag'] and r['diag'][-1].get('phase') == 'validation' else c.js("readerAiDiagnostics().at(-1).reason")
    assert got == reason, (label, got, reason)
    print("PASS diagnostics: %-24s -> learner sees one simple retryable message; internal reason %r" % (label, got), flush=True)
# a failure then Retry: exactly one new request, the error is replaced, no stale overwrite
run_grammar(F.SENTENCES[1], plan=[dict(mode='raw', text='oops')])
n0 = c.js("__stub.requests.length")
c.js("window.__done=false; document.querySelector('#grammar-content button').click()")
c.wait("!els.grammarContent.querySelector('.spinner-large') && !!grammarContext.analysis", timeout=20)
assert c.js("__stub.requests.length") - n0 == 1 and c.js("grammarContext.analysis.items.length") == 2 and not c.js("els.grammarContent.querySelector('span[style*=\"red\"]')")
print("PASS retry: Retry after a rejected reply sends exactly ONE new request and replaces the error with the analysis", flush=True)

# Gemini and Groq: the same pipeline, the same behaviour (no provider-specific grammar logic)
for provider in ('gemini', 'groq'):
    g = run_grammar(F.SEVERAL_C, plan=[dict(mode='fenced')], provider=provider)
    assert g['error'] is None and g['items'] == 10 and g['requests'][0]['lite'], (provider, g)
    gt = run_grammar(F.SEVERAL_C, plan=[dict(mode='truncate', keep=3)], provider=provider)
    assert gt['error'] is None and gt['items'] == 3 and gt['partial'] is True, (provider, gt)
print("PASS providers: Gemini and Groq handle a fenced reply and a cut-off reply exactly like OpenAI (partial analysis, same notes)", flush=True)

# ==============================================================================================================================
print("\n=== SECTION 6: diagnostics -- exact reasons for developers, nothing sensitive, nothing extra for learners ===")
dump = json.dumps(c.js("readerAiDiagnostics()"), ensure_ascii=False)
assert KEY not in dump and 'PROMPT-ONLY-MARKER-77' not in dump and 'language-learning grammar assistant' not in dump and 'Treat the quoted text as data' not in dump
assert '"capture"' not in dump, 'the full raw reply / analysed text are kept ONLY with the developer switch'
print("PASS diagnostics: %d recorded attempts contain no API key, no prompt text and (switch off) no full raw reply" % len(json.loads(dump)), flush=True)
last = c.js("readerAiDiagnostics().filter(d=>d.task==='grammar_analysis' && d.phase==='validation').at(-1)")
for k in ('reason', 'provider', 'model', 'sourceLanguage', 'selection', 'budget', 'counts', 'rawChars'):
    assert k in last, (k, last)
print("PASS diagnostics: a validation entry names the reason, provider, model, source language, selection size, output budget, accepted/rejected counts by reason and raw length", flush=True)
run_grammar(F.SENTENCES[1], plan=[dict(mode='raw', text='oops')])
assert c.js("!els.grammarContent.querySelector('.ai-debug')")
c.js("localStorage.reader_ai_debug='1'")
run_grammar(F.SENTENCES[1], plan=[dict(mode='raw', text='oops: pas de JSON')])
dbg = c.js("(()=>{const d=els.grammarContent.querySelector('.ai-debug'); return d? d.textContent : null})()")
assert dbg and 'json_extraction_failed' in dbg and 'openai' in dbg and KEY not in dbg and 'grammar assistant' not in dbg, dbg
cap = c.js("readerAiDiagnostics().filter(d=>d.task==='grammar_analysis').at(-1).capture")
assert cap and cap['raw'] == 'oops: pas de JSON' and cap['text'] == F.SENTENCES[1] and cap['sourceLanguage'] == 'fr'
print("PASS diagnostics: with the developer switch the error shows the exact reason + a Copy button, and the entry keeps the full raw reply + analysed text so it can be replayed", flush=True)
c.js("delete localStorage.reader_ai_debug")
run_grammar(F.SENTENCES[1], plan=[dict(mode='raw', text='oops')])
assert c.js("!els.grammarContent.querySelector('.ai-debug')") and c.js("!readerAiDiagnostics().at(-1).capture")
print("PASS diagnostics: switched off again, a learner sees only the simple message", flush=True)

# ==============================================================================================================================
print("\n=== SECTION 7: Practice depends on the same live structured output ===")


def run_practice(plan, provider='openai'):
    use(provider)
    c.js("__stub.practicePlan.push(...%s); closePracticeSession()" % json.dumps(plan, ensure_ascii=False))
    return c.js("""(async()=>{ try { const s=await generatePracticeReading({sourceText:'', sourceLanguage:'fr', targetLanguage:'uk', mode:'verbs', bookId:'t', lemmas:['parler','plaindre']});
        return {ok:true, status:s.status, sections:s.reading.sections.length, items:s.reading.paragraphs.length, targets:s.reading.targets.length, diag:readerAiDiagnostics().filter(d=>d.task==='practice_reading').at(-1)}; }
        catch(e){ return {ok:false, reason:e.reason||null, message:e.message, diag:readerAiDiagnostics().filter(d=>d.task==='practice_reading').at(-1)}; } })()""")


FULL = PF.to_json(PF.VERBS_FR)
ok = run_practice([dict(mode='reading')])
assert ok['ok'] and ok['items'] >= 16 and ok['diag']['reason'] == 'ok'
fenced = run_practice([dict(mode='raw', text='Voici :\n```json\n' + FULL.replace('"forms": null}', '"forms": null,}') + '\n```')])
assert fenced['ok'] and fenced['items'] == ok['items'], fenced
inner = run_practice([dict(mode='raw', text=FULL.replace("Présent: a habit ('tous les jours'), 1st person plural after 'nous'.", 'Форма "parlons" — це "présent".'))])
assert inner['ok'] and inner['diag']['reason'] == 'ok_recovered', inner
print("PASS 7: Practice accepts a fenced reply with trailing commas and one with unescaped quotes in an explanation (reason 'ok_recovered')", flush=True)
cut_at = FULL.index('Quand elle était petite') + 60          # inside the SECOND story paragraph
part = run_practice([dict(mode='truncate', text=FULL[:cut_at])])
assert part['ok'] and part['diag']['reason'] == 'partial' and part['items'] == ok['items'] - 1, part
print("PASS 7: a Practice reply cut off inside its last story paragraph is shown up to its last complete item (%d of %d items) and reported 'partial'" % (part['items'], ok['items']), flush=True)
tiny = run_practice([dict(mode='truncate', text=FULL[:700])])
assert not tiny['ok'] and tiny['reason'] == 'truncated' and tiny['message'] == msg('aiTruncated') and tiny['diag']['reason'] == 'truncated', tiny
print("PASS 7: a cut-off Practice reply with too little material is a specific retryable error ('%s'), never a broken reading" % tiny['message'], flush=True)
for label, text, reason in [('not JSON', 'Désolé, je ne peux pas.', 'json_extraction_failed'),
                            ('exercises', json.dumps(dict(title='x', language='fr', mode='verbs', sections=[dict(heading='p', kind='examples', items=[dict(text='Ils ____ la pauvre femme %d.' % i, targets=[]) for i in range(12)])]), ensure_ascii=False), 'made_of_exercises'),
                            ('wrong language', json.dumps(dict(PF.VERBS_FR, language='en'), ensure_ascii=False), 'language_mismatch')]:
    r = run_practice([dict(mode='raw', text=text)])
    assert not r['ok'] and r['diag']['reason'] == reason, (label, r)
print("PASS 7: invalid Practice replies are still rejected, each with its exact reason (not JSON / exercises / wrong language)", flush=True)
assert c.js("document.querySelectorAll('#practice-panel input, #practice-panel textarea').length") == 0
inc = run_practice([dict(mode='truncate', text=FULL[:cut_at])], provider='gemini')
assert inc['ok'] and inc['diag']['reason'] == 'partial'
print("PASS 7: the same recovery on Gemini", flush=True)

# ==============================================================================================================================
print("\n=== SECTION 8: replay of responses captured from a REAL failing session ===")
files = sorted(glob.glob(os.path.join(os.path.dirname(__file__), 'live_responses', '*.json')))
if not files:
    print('NOTE 8: tests/live_responses/ holds no captures yet (see its README): none replayed')
for path in files:
    cap = json.load(open(path))
    if cap.get('task') == 'practice_reading':
        r = c.js("(()=>{try{const info={}; const v=parseAndValidatePracticeReading(%s,{language:%s,mode:%s},info); return {ok:true,items:v.paragraphs.length}}catch(e){return {ok:false,error:e.message}}})()" % (json.dumps(cap['raw'], ensure_ascii=False), json.dumps(cap['sourceLanguage']), json.dumps(cap.get('mode', 'verbs'))))
        assert r['ok'] == cap.get('expect', {}).get('ok', True), (path, r)
    else:
        r = norm(cap['raw'], cap['text'])
        want = cap.get('expect', {})
        assert r['ok'] == want.get('ok', True) and len(r['kept']) >= want.get('minItems', 1 if want.get('ok', True) else 0), (path, r)
    print('PASS 8: replayed %s' % os.path.basename(path), flush=True)

# ==============================================================================================================================
print("\n=== SECTION 9: the reported PDF page -- one tapped word through the real reader and the real provider path ===")
RUN = 'PRÉPARER LES TRAVAUX Établi un diagnostic du travail à effectuer Observation visuelle et olfactive...'
c.js("if (typeof pdfContinuousReady !== 'undefined') pdfContinuousReady = false;")
c.js("""(() => { const bytes = Uint8Array.from(atob(%s), ch=>ch.charCodeAt(0)); const file = new File([bytes], 'hvac.pdf', {type:'application/pdf'});
  const dt = new DataTransfer(); dt.items.add(file); const i=document.getElementById('file-upload'); i.files = dt.files; i.dispatchEvent(new Event('change')); })()""" % json.dumps(base64.b64encode(F.hvac_pdf()).decode()))
c.wait("state.format==='pdf' && pdfContinuousReady && !!state.pdfDoc", timeout=60)
c.wait("!!document.querySelector('.pdf-page-wrapper[data-page=\"1\"] .pdf-text-layer span')", timeout=30); time.sleep(1.5)
if not c.js("state.translateMode"):
    c.js("els.translateBtn.click()"); time.sleep(0.4)
c.js("showToast=()=>{}; state.targetLang='uk'")
use('openai')


def mouse(x, y):
    for kind in ('mousePressed', 'mouseReleased'):
        c.call('Input.dispatchMouseEvent', type=kind, x=x, y=y, button='left', clickCount=1)


CLEAN_UI_JS = """(()=>{ if (typeof closePractice==='function') closePractice(); els.grammarPanel.classList.remove('expanded'); els.askPanel.classList.remove('expanded'); els.tooltip.style.display='none'; return true; })()"""
# (a Practice panel or a drawer left open by an earlier section covers the left of the reader: a tap there lands on it, not on the page)

WORD_POS_JS = """(()=>{ const layer=document.querySelector('.pdf-page-wrapper[data-page="%d"] .pdf-text-layer'); if(!layer) return null; const w=%s; const walker=document.createTreeWalker(layer, NodeFilter.SHOW_TEXT); let n;
      while((n=walker.nextNode())){ const i=n.nodeValue.indexOf(w); if(i!==-1){ n.parentElement.scrollIntoView({block:'center', inline:'nearest'}); const r=document.createRange(); r.setStart(n,i); r.setEnd(n,i+w.length); const b=r.getBoundingClientRect(); return {x:Math.round((b.left+b.width/2)*10)/10,y:Math.round((b.top+b.height/2)*10)/10,layer:layer.dataset.k||(layer.dataset.k=String(Math.random()))}; } } return null; })()"""


def stable_word_pos(word, need=4, timeout=15, page=1):
    """The word's centre once the layout has stopped moving (same text layer, same rect for `need` samples 250 ms apart), after
    scrolling it into view as a user would. A tap measured while the viewer was still re-rendering lands on the OLD position, and
    one aimed at a word outside the viewport lands on nothing -- both depend on the machine, so neither may be left to chance."""
    deadline, last, same = time.time() + timeout, None, 0
    while time.time() < deadline:
        pos = c.js(WORD_POS_JS % (page, json.dumps(word, ensure_ascii=False)))
        same = same + 1 if pos and last and pos == last else (1 if pos else 0)
        if same >= need:
            return pos
        last = pos
        time.sleep(0.25)
    raise AssertionError(('the word never settled in the text layer', word, last))


def tap_pdf_word(word, attempts=4, page=1):
    """A real mouse tap on `word`, then the tooltip's Grammar button. If the tooltip does not open (a late re-render moved
    the word) the position is re-measured and tapped again, as a user would; after the last attempt the failure carries
    everything needed to see why (what is under the pointer, viewport, learning mode, viewer state)."""
    c.js(CLEAN_UI_JS)
    seen = []
    for _ in range(attempts):
        pos = stable_word_pos(word, page=page)
        mouse(pos['x'], pos['y'])
        try:
            c.wait("els.tooltip.style.display==='flex'", timeout=3)
            break
        except TimeoutError:
            seen.append(c.js("""(()=>{ const e=document.elementFromPoint(%f,%f); return {at:[%f,%f], under:e?(e.tagName+'.'+e.className+' '+(e.textContent||'').slice(0,30)):null, viewport:[innerWidth,innerHeight],
                translateMode:state.translateMode, continuousReady:pdfContinuousReady, format:state.format, tooltip:els.tooltip.style.display, layers:document.querySelectorAll('.pdf-text-layer').length,
                lastTap:state.lastTapPoint||null}; })()""" % (pos['x'], pos['y'], pos['x'], pos['y'])))
    else:
        raise AssertionError(('tapping %r never opened the tooltip' % word, seen))
    b = c.js("(()=>{const r=els.ttAiBtn.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}})()")
    mouse(b['x'], b['y'])


def item_on_run(pos, lemma, surface, **kw):
    return dict(dict(pos=pos, lemma=lemma, surface=surface, sentence=RUN, occurrence=1, agreesWith=None, features={}, explanation="Пояснення.", stemBreakdown=None, forms=None), **kw)


REPLY = dict(language='fr', items=[item_on_run('verb', 'effectuer', 'effectuer', features={'mood': 'infinitif'}), item_on_run('verb', 'préparer', 'PRÉPARER', features={'mood': 'infinitif'}),
                                   item_on_run('verb', 'établir', 'Établi'), item_on_run('adjective', 'visuel', 'visuelle', agreesWith='Observation', features={'gender': 'féminin', 'number': 'singulier'}),
                                   item_on_run('adjective', 'olfactif', 'olfactive', agreesWith='Observation', features={'gender': 'féminin', 'number': 'singulier'})])
c.js("grammarAnalysisCache.clear(); __stub.plan.length=0; __stub.requests.length=0; __stub.plan.push(%s)" % json.dumps(dict(mode='object', object=REPLY), ensure_ascii=False))
tap_pdf_word('effectuer')
c.wait("!!grammarContext.analysis", timeout=20)
rq = c.js("__stub.requests.filter(r=>r.kind==='grammar')")
assert len(rq) == 1 and rq[0]['chars'] == len(RUN) and rq[0]['maxTokens'] > 1400 and rq[0]['promptHasTapped'], rq
print("PASS 9: tapping ONE word on the reported page sends the whole unpunctuated run (%d chars) with a %d-token budget (the old code sent 1400)" % (rq[0]['chars'], rq[0]['maxTokens']), flush=True)
check("9: five items are accepted; the tapped word's own occurrence is focused (Verbes) with its sentence and highlight",
      "grammarContext.analysis.items.length===5 && grammarContext.focused?.surface==='effectuer' && grammarContext.mode==='verbs' && !!document.querySelector('#grammar-content .grammar-focus') && document.querySelector('#grammar-content .grammar-context-target')?.textContent==='effectuer'")
assert c.js("readerAiDiagnostics().filter(d=>d.task==='grammar_analysis').at(-1).sourceLanguage") == 'fr'
print("PASS 9: source language French, French 'Verbes' mode, English tense controls absent (French chips only)", flush=True)
check("9: French tense controls only (no English names leaking)", "[...document.querySelectorAll('#grammar-controls-bar button')].map(b=>b.textContent).join()===GRAMMAR_LANG_CONFIG.fr.verb.tenses.map(t=>t.label).join()")
n0 = c.js("__stub.requests.length")
c.js("switchGrammarMode('adjectives')")
check("9: Adjectifs lists the two adjectives with NO tense controls, from the cached analysis (0 requests)",
      "[...document.querySelectorAll('#grammar-content > .grammar-card .grammar-card-lemma')].map(b=>b.textContent).join()==='visuel,olfactif' && document.querySelectorAll('#grammar-controls-bar button').length===0")
assert c.js("__stub.requests.length") == n0
# the same tap when the provider cuts the reply off after two complete items
partial_text = json.dumps(REPLY, ensure_ascii=False, separators=(',', ':'))
cut_idx = [m.start() for m in re.finditer(r'\},\{"pos"', partial_text)][1] + 1
c.js("switchGrammarMode('verbs'); grammarAnalysisCache.clear(); __stub.requests.length=0; __stub.plan.push(%s)" % json.dumps(dict(mode='raw_truncated', text=partial_text[:cut_idx] + ',{"pos":"verb","lemma":"ét'), ensure_ascii=False))
c.js("els.tooltip.style.display='none'")
time.sleep(0.4)
tap_pdf_word('effectuer')
c.wait("!!grammarContext.analysis && grammarContext.analysis.partial===true", timeout=20)
check("9: a cut-off reply on the same tap shows the 2 complete items with a 'partial analysis' note (no error banner)",
      "grammarContext.analysis.items.length===2 && !!document.querySelector('#grammar-content .grammar-note') && !document.querySelector('#grammar-content span[style*=\"red\"]') && grammarContext.focused?.surface==='effectuer'")
assert c.js("readerAiDiagnostics().filter(d=>d.task==='grammar_analysis').at(-1).reason") == 'partial'
# Practice built from this analysis, then a highlighted form is clicked: exact occurrence, zero AI calls
c.js("__stub.practicePlan.length=0; window.__n9=__stub.requests.length")
c.js("document.querySelector('.grammar-practice-btn').click()")
c.wait("document.querySelectorAll('#practice-panel .practice-target').length>0", timeout=15)
n1 = c.js("__stub.requests.length")
c.js("document.querySelectorAll('#practice-panel .practice-target')[2].click()")
check("9: Practice (generated through the same provider path) still focuses the exact clicked occurrence with zero further requests",
      "!!document.querySelector('#grammar-content .grammar-focus') && document.querySelector('#grammar-content .grammar-context-target')?.textContent===getCurrentPracticeSession().reading.targets[2].surface && __stub.requests.length===%d" % n1)


# ==============================================================================================================================
print("\n=== SECTION 10: the REAL reported page (GUIAPP_systeme_frigorifique_classe_1.pdf, when the file is present) ===")
REAL_PDF = os.environ.get('READER_HVAC_PDF') or os.path.expanduser('~/Books/GUIAPP_systeme_frigorifique_classe_1.pdf')
if not os.path.exists(REAL_PDF):
    print('NOTE 10: %s not present -- real-page checks skipped (CI has no copy of the book)' % REAL_PDF, flush=True)
else:
    c.js("__stub.plan.length=0; __stub.requests.length=0; grammarAnalysisCache.clear(); if (typeof pdfContinuousReady !== 'undefined') pdfContinuousReady = false;")
    c.js("""(() => { const bytes = Uint8Array.from(atob(%s), ch=>ch.charCodeAt(0)); const file = new File([bytes], 'guiapp.pdf', {type:'application/pdf'});
      const dt = new DataTransfer(); dt.items.add(file); const i=document.getElementById('file-upload'); i.files = dt.files; i.dispatchEvent(new Event('change')); })()""" % json.dumps(base64.b64encode(open(REAL_PDF, 'rb').read()).decode()))
    c.wait("state.format==='pdf' && pdfContinuousReady && !!state.pdfDoc", timeout=90)
    PG = c.js("""(async()=>{ for (let p=1;p<=state.totalPages;p++){ const pg=await state.pdfDoc.getPage(p); const tc=await pg.getTextContent(); if (tc.items.some(i=>/Observation visuelle et olfactive/.test(i.str))) return p; } return null; })()""")
    assert PG, 'the reported page was not found in the real PDF'
    c.js("goToPhysicalPage(%d,{instant:true})" % PG); c.wait("state.currentIndex===%d" % PG, timeout=30)
    c.wait("!!document.querySelector('.pdf-page-wrapper[data-page=\"%d\"] .pdf-text-layer span')" % PG, timeout=30); time.sleep(2)
    if not c.js("state.translateMode"):
        c.js("els.translateBtn.click()"); time.sleep(0.4)
    c.js("showToast=()=>{}; state.targetLang='uk'; els.tooltip.style.display='none'")
    use('openai')

    def real_tap(word):
        c.js("els.tooltip.style.display='none'; els.grammarPanel.classList.remove('expanded'); grammarAnalysisCache.clear(); __stub.requests.length=0")
        time.sleep(0.4)
        tap_pdf_word(word, page=PG)
        c.wait("__stub.requests.filter(r=>r.kind==='grammar').length>=1", timeout=20)
        return c.js("__stub.requests.filter(r=>r.kind==='grammar').at(-1)")

    # the body line the user tapped
    r1 = real_tap('effectuer')
    assert r1['text'].startswith('Établir un diagnostic du travail à effectuer') and r1['promptHasTapped'], r1['text'][:120]
    assert 300 < r1['chars'] < 600 and r1['lite'] is True and r1['maxTokens'] >= 3500, r1
    print("PASS 10: tapping 'effectuer' on the real page sends the whole unpunctuated bullet run (%d chars, lite contract, %d-token budget; the old code sent 1400)" % (r1['chars'], r1['maxTokens']), flush=True)
    # words the PDF splits into several text items reach the model WHOLE (they used to arrive as "a ppliquer", "a ssurer")
    r2 = real_tap('ppliquer')
    assert r2['text'].startswith('appliquer les mesures sécuritaires liées au travail à effectuer') and 'a ppliquer' not in r2['text'], r2['text'][:120]
    r3 = real_tap('ssurer')
    assert r3['text'].startswith('assurer l’approvisionnement en divers matériaux') and 'a ssurer' not in r3['text'], r3['text'][:120]
    r4 = real_tap('trava')
    assert 'PrÉParEr LES travaUx' in r4['text'] and 'Pr ÉP ar E r' not in r4['text'], r4['text']
    print("PASS 10: 'appliquer', 'assurer' and the small-caps heading reach the model as whole words (were 'a ppliquer', 'a ssurer', 'Pr ÉP ar E r LES trava U x')", flush=True)

    # a realistic reply for the real request: a model that lower-cases the capitalised heading word, names the language in full and fences its JSON must still be accepted
    RUN = r1['text']
    def on_run(pos, lemma, surface, **kw):
        return dict(dict(pos=pos, lemma=lemma, surface=surface, sentence=RUN, occurrence=1, agreesWith=None, features={}, explanation="Пояснення.", stemBreakdown=None, forms=None), **kw)
    live_like = dict(language='French', items=[on_run('verb', 'effectuer', 'effectuer', features={'mood': 'infinitif'}), on_run('verb', 'établir', 'établir', features={'mood': 'infinitif'}),
                                                on_run('adjective', 'visuel', 'visuelle', agreesWith='Observation', features={'gender': 'féminin', 'number': 'singulier'}),
                                                on_run('adjective', 'justifié', 'justifiée', features={'gender': 'féminin', 'number': 'singulier'})])
    c.js("els.tooltip.style.display='none'; grammarAnalysisCache.clear(); __stub.plan.length=0; __stub.requests.length=0; __stub.plan.push(%s)" % json.dumps(dict(mode='raw', text='Voici l’analyse demandée :\n```json\n' + json.dumps(live_like, ensure_ascii=False, indent=2) + '\n```\nN’hésitez pas si vous avez besoin d’autre chose.'), ensure_ascii=False))
    time.sleep(0.4)
    tap_pdf_word('effectuer', page=PG)
    c.wait("!!grammarContext.analysis", timeout=20)
    st = c.js("""({ok:grammarContext.analysis.ok, n:grammarContext.analysis.items.length, surfaces:grammarContext.analysis.items.map(i=>i.pos+':'+i.surface), rejected:grammarContext.analysis.rejected.map(r=>r.reason+':'+r.surface),
        adjusted:grammarContext.analysis.adjusted.map(a=>a.reason), notes:grammarContext.analysis.notes, lang:grammarContext.sourceLanguage, focused:grammarContext.focused&&grammarContext.focused.surface, mode:grammarContext.mode,
        chips:[...document.querySelectorAll('#grammar-controls-bar button')].map(b=>b.textContent), banner:!!document.querySelector('#grammar-content span[style*="red"]')})""")
    assert st['ok'] is True and st['lang'] == 'fr' and st['mode'] == 'verbs' and not st['banner'], st
    assert st['n'] == 4, ('all four items of the fenced reply must be accepted on the real page', st)
    assert st['focused'] == 'effectuer', ("the tapped word's own occurrence is focused", st)
    assert st['chips'] == c.js("GRAMMAR_LANG_CONFIG.fr.verb.tenses.map(t=>t.label)"), ('French tense controls only', st['chips'])
    print("PASS 10: a fenced reply that names the language 'French' and lower-cases 'Établir' is accepted on the real page (4 items, recovered: %s), the tapped 'effectuer' is focused, Verbes mode, French controls only" % st['notes'], flush=True)
    assert any(i['surface'] == 'Établir' for i in c.js("grammarContext.analysis.items")), "the displayed surface must be the SOURCE text's own spelling"
    print("PASS 10: the surface shown for the lower-cased 'établir' is the page's own 'Établir'", flush=True)

print("\n=== ALL AI CONTRACT CHECKS PASSED ===")
