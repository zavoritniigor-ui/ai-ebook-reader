"""The offline French -> Ukrainian dictionary (js/offline-dict.js) with the offline translator, on a SMALL INVENTED dictionary built
by this test with the encoders of tools/build_dict_fr_uk.py (the same front-coded index and Ukrainian paradigms as dict/fr-uk.json and
dict/uk-forms.json). The Bergamot engine is replaced by a table of answers (what it says for each text, marked or not), so every case
is exact; the real engine and models are covered by tests/offline_translation_browser.py. The app is served by this test's own server
with the production Content-Security-Policy; the pinned catalogs are pointed at small stand-in files whose sizes and SHA-256 it serves.

Cases: the dictionary is installed with the fr -> uk pack (Settings counts its bytes, the files are checked and land in the pack's
cache and state record); form -> lemma («fasses» -> faire, «belles» -> beau, «yeux» -> œil, «aujourd'hui» one word); a tapped word gets
the meaning the engine chose in its sentence, a known pivot mistake replaced by the main meaning of the part of speech the context
gives, the other meanings below; a set expression in a sentence replaces its word-by-word translation, in the engine's tense, and an
expression the engine got right stays; a homonym the engine got wrong is corrected and put in the case of the word it replaces
(«лінію» -> «чергу»); an ambiguous reading, an unknown word and a direction without dictionary change nothing; the popup offline;
removal with the pack; a lost dictionary file is forgotten and offered again; an older state record without dictionaries; strings in
every language; no CSP violation."""
import hashlib, http.server, importlib.util, json, os, socketserver, sys, threading
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from browser_cdp import CDP

ROOT = Path(__file__).resolve().parents[1]
CSP = next(l.split(':', 1)[1].strip() for l in (ROOT / '_headers').read_text().splitlines() if l.strip().startswith('Content-Security-Policy:'))
spec = importlib.util.spec_from_file_location('build_dict_fr_uk', ROOT / 'tools' / 'build_dict_fr_uk.py')
build = importlib.util.module_from_spec(spec); spec.loader.exec_module(build)

# ---- the invented dictionary ---------------------------------------------------------------------------------------------------
LEMMAS = [   # lemma, pos, gender, meanings, sources, confusions, forms
    ('file', 'N', 'f', 'черга;ряд', 'wx', 'лінія;файл', ['files']),
    ('filer', 'V', '', 'мчати;прясти', 'xx', '', ['file', 'files', 'filent', 'filé']),
    ('faire', 'V', '', 'робити|зробити', 'w', '', ['fais', 'fait', 'faisait', 'fasses', 'font']),
    ('beau', 'A', '', 'гарний;красивий', 'wx', '', ['bel', 'belle', 'belles', 'beaux']),
    ('temps', 'N', 'm', 'час;погода', 'ww', '', []),
    ('carte', 'N', 'f', 'картка;мапа', 'xx', '', ['cartes']),
    ('rendre', 'V', '', 'повертати|повернути;віддавати|віддати', 'xx', '', ['rends', 'rend', 'rendu', 'rendait']),
    ('compte', 'N', 'm', 'рахунок', 'w', '', ['comptes']),
    ('ménage', 'N', 'm', 'прибирання;господарство', 'xx', 'домогосподарство', ['ménages']),
    ('oeil', 'N', 'm', 'око', 'w', '', ['yeux']),
    ("aujourd'hui", 'ADV', '', 'сьогодні', 'w', '', []),
    ('voir', 'V', '', 'бачити|побачити', 'w', '', ['vois', 'voit']),
    ('être', 'V', '', 'бути', 'w', '', ['suis', 'est', 'es']),
    ('avoir', 'V', '', 'мати', 'w', '', ['ai', 'as', 'a']),
    ('pour', 'PRE', '', 'для', 'x', '', []),
    ('la', 'DET', '', '', '', '', []), ('le', 'DET', '', '', '', '', ['l\'']), ('je', 'PRO', '', 'я', 'x', '', ["j'"]),
    ('il', 'PRO', '', 'він', 'x', '', []), ('se', 'PRO', '', 'себе', 'x', '', ["s'", 'me', "m'"]), ('elle', 'PRO', '', 'вона', 'x', '', []),
    ('vite', 'ADV', '', 'швидко', 'x', '', []),
]
EXPR = ['se rendre compte\tусвідомлювати|усвідомити\twritten', 'il fait beau\tгарна погода\twritten', 'faire le ménage\tприбирати|прибрати\twritten']
NOUN = ['ns', 'gs', 'ds', 'as', 'is', 'ls', 'vs', 'np', 'gp', 'dp', 'ap', 'ip', 'lp', 'vp']
UK = {   # lemma: (kind, {slot: form})
    'черга': ('N:f', dict(zip(NOUN, 'черга черги черзі чергу чергою черзі черго черги черг чергам черги чергами чергах черги'.split()))),
    'ряд': ('N:m', dict(zip(NOUN, 'ряд ряду ряду ряд рядом ряду ряде ряди рядів рядам ряди рядами рядах ряди'.split()))),
    'лінія': ('N:f', dict(zip(NOUN, 'лінія лінії лінії лінію лінією лінії лініє лінії ліній лініям лінії лініями лініях лінії'.split()))),
    'файл': ('N:m', dict(zip(NOUN, 'файл файлу файлу файл файлом файлі файле файли файлів файлам файли файлами файлах файли'.split()))),
    'погода': ('N:f', dict(zip(NOUN, 'погода погоди погоді погоду погодою погоді погодо погоди погод погодам погоди погодами погодах погоди'.split()))),
    'гарний': ('A', {'mn': 'гарний', 'fn': 'гарна', 'nn': 'гарне', 'pn': 'гарні', 'fa': 'гарну', 'ma': 'гарний'}),
    'робити': ('V:imperf', {'inf': 'робити', 'r3s': 'робить', 'r1s': 'роблю', 'pm': 'робив', 'pf': 'робила'}),
    'зробити': ('V:perf', {'inf': 'зробити', 'f3s': 'зробить', 'pm': 'зробив', 'pf': 'зробила'}),
    'повертати': ('V:imperf', {'inf': 'повертати', 'r3s': 'повертає', 'pm': 'повертав'}),
    'повернути': ('V:perf', {'inf': 'повернути', 'f3s': 'поверне', 'pm': 'повернув', 'pf': 'повернула'}),
    'рахунок': ('N:m', dict(zip(NOUN, 'рахунок рахунку рахунку рахунок рахунком рахунку рахунку рахунки рахунків рахункам рахунки рахунками рахунках рахунки'.split()))),
    'усвідомлювати': ('V:imperf', {'inf': 'усвідомлювати', 'r1s': 'усвідомлюю', 'r3s': 'усвідомлює', 'pm': 'усвідомлював', 'pf': 'усвідомлювала'}),
    'усвідомити': ('V:perf', {'inf': 'усвідомити', 'f1s': 'усвідомлю', 'pm': 'усвідомив', 'pf': 'усвідомила'}),
    'прибирати': ('V:imperf', {'inf': 'прибирати', 'r3s': 'прибирає', 'r1s': 'прибираю', 'pm': 'прибирав'}),
    'прибрати': ('V:perf', {'inf': 'прибрати', 'pm': 'прибрав', 'pf': 'прибрала'}),
}
GUESS = {'ла': 'pf', 'ив': 'pm', 'ав': 'pm', 'ює': 'r3s', 'ає': 'r3s'}


def fixture():
    keys = sorted(LEMMAS, key=lambda e: (build.norm(e[0]), build.POS.index(e[1])))
    lines, forms = [], {}
    for i, (lemma, pos, g, meanings, srcs, conf, more) in enumerate(keys):
        cols = [lemma.replace('oe', 'œ') if lemma == 'oeil' else lemma, pos, g, '10']
        if meanings: cols += [meanings, srcs] + ([conf] if conf else [])
        lines.append('\t'.join(cols))
        for f in [lemma, *more]: forms.setdefault(build.norm(f), set()).add(i)
    index = [f + '\t' + ','.join(format(i, 'x') for i in sorted(forms[f])) for f in sorted(forms)]
    blocks = build.front_code(index)
    paradigms, uk = {}, []
    for lemma, (kind, slots) in sorted(UK.items()):
        cut, para = build.uk_paradigm(lemma, slots)
        uk.append(f'{lemma}\t{kind}\t{paradigms.setdefault(para, len(paradigms))}\t{cut}')
    data = {'format': 1, 'pos': build.POS, 'lemmas': lines, 'block': build.INDEX_BLOCK, 'index': blocks, 'heads': [b.split('\t', 1)[0] for b in blocks], 'expr': EXPR, 'version': 'test1'}
    uk_forms = {'format': 1, 'uk': uk, 'paradigms': list(paradigms), 'alias': {'гарна': 'гарний'}, 'guess': GUESS, 'version': 'test1'}
    return {name: json.dumps(v, ensure_ascii=False).encode() for name, v in (('data', data), ('forms', uk_forms))}


DICT = fixture()
MODEL = {name: bytes((i * k) % 251 for i in range(3000 + k)) for k, name in enumerate(['m1', 'l1', 'v1', 'm2', 'l2', 'v2'], 1)}
LOG = []


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def end_headers(self):
        self.send_header('Content-Security-Policy', CSP)
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *args):
        pass
    def body(self, data):
        self.send_response(200); self.send_header('Content-Type', 'application/octet-stream'); self.send_header('Content-Length', str(len(data))); self.end_headers()
        self.wfile.write(data)
    def do_GET(self):
        url = urlparse(self.path)
        if url.path == '/api/offline-model':
            name = parse_qs(url.query).get('f', [''])[0]
            LOG.append(name)
            return self.body(MODEL[name]) if name in MODEL else self.send_error(404)
        if url.path.startswith('/__test-dict/'):
            name = url.path.rsplit('/', 1)[1]
            LOG.append(name)
            return self.body(DICT[name]) if name in DICT else self.send_error(404)
        return super().do_GET()


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True


server = Server(('127.0.0.1', int(os.environ.get('READER_OFFLINE_DICT_PORT', '0'))), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{server.server_address[1]}'

sha = lambda b: hashlib.sha256(b).hexdigest()
SETUP = '''(() => {
  const file = (name, type) => ({ path: name, sha256: SHA[name], size: SIZE[name], type });
  OFFLINE_CATALOG.models['fr>en'].files = [file('m1', 'model'), file('l1', 'lex'), file('v1', 'vocab')];
  OFFLINE_CATALOG.models['en>uk'].files = [file('m2', 'model'), file('l2', 'lex'), file('v2', 'vocab')];
  OFFLINE_DICTS['fr>uk'] = { files: [
    { type: 'data', path: '__test-dict/data', version: 'test1', size: SIZE.data, sha256: SHA.data },
    { type: 'forms', path: '__test-dict/forms', version: 'test1', size: SIZE.forms, sha256: SHA.forms } ] };
  // The engine: what it answers for each text (plain or marked). Anything else: null, as when it fails.
  window.__answers = ANSWERS; window.__asked = [];
  offlineTranslate = async (text, src, tgt, signal, html) => { __asked.push(text); return Object.prototype.hasOwnProperty.call(__answers, text) ? __answers[text] : null; };
  translateLocally = async () => null; deviceLlmTranslate = async () => null; aiAvailable = () => false;
  return 1; })()'''
ANSWERS = {
    'file': 'Файл',
    'Nous attendons dans la <b>file</b> pour la carte.': 'Ми чекаємо в <b>лінії</b> для картки.',
    'Je vois la <b>file</b> pour la carte.': 'Я бачу <b>лінію</b> для картки.',
    'Je vois la <b>file</b> devant moi.': 'Я бачу <b>чергу</b> переді мною.',
    'temps': 'Час',
    'Le <b>temps</b> passe vite.': '<b>Час</b> минає швидко.',
    '<b>Il fait beau</b> aujourd\'hui.': '<b>Він робить гарно</b> сьогодні.',
    '<b>Il fait beau</b> et chaud.': '<b>Гарна погода</b> і тепло.',
    'Je <b>me suis rendu compte</b> de tout.': 'Я <b>повернув рахунок</b> усього.',
    'Elle <b>se rend compte</b> de tout.': 'Вона <b>повертає рахунок</b> усього.',
    'Elle <b>fait le ménage</b>.': 'Вона <b>робить домогосподарство</b>.',
    'Elle file vite.': 'Вона швидко мчить.',
    'beau': 'Гарний', "Il fait <b>beau</b> aujourd'hui.": 'Сьогодні <b>гарна</b> погода.',
    'fasses': 'Робиш',
    'zorglub': 'Зорглуб',
    'Le zorglub <b>zorglub</b>.': 'Зорглуб <b>зорглуб</b>.',
    'ménage': 'Домогосподарство',
    'Il fait le <b>ménage</b> le soir.': 'Він робить <b>домогосподарство</b> ввечері.',
}

c = CDP(); c.sock.settimeout(120)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.addScriptToEvaluateOnNewDocument', source='''
window.__errors = []; addEventListener('error', e => __errors.push(String(e.message)));
addEventListener('unhandledrejection', e => __errors.push(String(e.reason && e.reason.message || e.reason)));
window.__csp = []; document.addEventListener('securitypolicyviolation', e => __csp.push(e.violatedDirective + ' ' + e.blockedURI));
''')
js = c.js
READY = "document.readyState==='complete' && !document.body.inert && typeof handleWordOrSelection==='function' && typeof offlineTranslateSentence==='function'"


def check(name, expression, timeout=None):
    if timeout: c.wait(expression, timeout=timeout)
    value = js(expression)
    assert value is True, (name, value)
    print('PASS', name, flush=True)


def ok(name, condition, detail=''):
    assert condition, (name, detail)
    print('PASS', name, flush=True)


def setup():
    names = {**MODEL, **DICT}
    js(SETUP.replace('SHA', json.dumps({k: sha(v) for k, v in names.items()})).replace('SIZE', json.dumps({k: len(v) for k, v in names.items()}))
       .replace('ANSWERS', json.dumps(ANSWERS, ensure_ascii=False)))


def word(w, sentence):
    return js(f"offlineTranslateWord({json.dumps(w)}, {json.dumps(sentence)}, 'fr', 'uk').then(r => r && {{ ...r, html: offlineTrWordHtml(r) }})")


def sentence(text):
    return js(f"offlineTranslateSentence({json.dumps(text)}, 'fr', 'uk')")


try:
    c.call('Page.navigate', url=BASE + '/index.html')
    c.wait(READY, timeout=60)
    js("caches.delete(OFFLINE_TR_CACHE).then(() => { offlineTrPack = null; return offlineTrLoad(); }).then(() => 1)")
    setup()
    js("state.targetLang = 'uk'; 1")

    # ---- 1. installed with the pack ---------------------------------------------------------------------------------------------
    check('1a the catalog pins the real dictionary of fr -> uk (two files, size and SHA-256), generated with the data',
          "fetch('js/offline-dict-catalog.js').then(r => r.text()).then(t => /\"fr>uk\": \\{ files: \\[/.test(t) && /type: \"data\", path: \"dict\\/fr-uk.json\"/.test(t) && /type: \"forms\", path: \"dict\\/uk-forms.json\"/.test(t) && /sha256: \"[0-9a-f]{64}\"/.test(t))")
    js("(async () => { openKeySettings(); await offlineTrRefreshBox(); const s = document.getElementById('offline-src'); s.value = 'fr'; s.dispatchEvent(new Event('change')); await offlineTrRefreshBox(); return 1; })()")
    total = sum(len(v) for v in MODEL.values()) + sum(len(v) for v in DICT.values())
    check('1b before the install Settings offers the download (engine + models + dictionary)',
          f"!document.getElementById('offline-install').disabled && offlineTrMissingBytes(offlineTrPack, offlineTrRoute('fr', 'uk'), 'fr>uk') === OFFLINE_CATALOG.engine.wasm.size + {total}")
    js("document.getElementById('offline-install').click(); 1")
    check('1c the install finishes', "document.getElementById('offline-status').textContent.startsWith(t('offDone').split('{pair}')[0])", timeout=60)
    ok('1d the six model files and the two dictionary files were each fetched once', sorted(LOG) == sorted([*MODEL, *DICT]), LOG)
    check('1e the dictionary is in the pack\'s state record and its own cache, the button says installed, the list says "with dictionary"',
          """caches.open(OFFLINE_TR_CACHE).then(async cache => { const keys = (await cache.keys()).map(r => decodeURIComponent(r.url));
              return offlineTrPack.dicts['fr>uk'].versions.data === 'test1' && offlineTrPack.dicts['fr>uk'].versions.forms === 'test1'
                  && keys.some(k => k.endsWith('/dict/fr>uk/data/test1')) && keys.some(k => k.endsWith('/dict/fr>uk/forms/test1'))
                  && document.getElementById('offline-install').textContent === t('offHave')
                  && document.querySelector('#offline-list li[data-direction="fr>uk"] span').textContent.includes(t('offWithDict')); })""")
    js("closeKeySettings(); 1")

    # ---- 2. form -> lemma ----------------------------------------------------------------------------------------------------
    check('2a a form leads to its lemma: «fasses» -> faire, «belles» -> beau, «yeux» -> œil, «œil» itself, «aujourd\'hui» is one word',
          """offlineDictLoad('fr', 'uk').then(d => { const l = (w) => offlineDictLookup(d, w).map(e => e.lemma + ':' + e.pos).join();
              const toks = offlineDictTokens("Aujourd'hui l'œil voit.", d).map(t => t.norm).join('|');
              return l('fasses') === 'faire:V' && l('belles') === 'beau:A' && l('yeux') === 'œil:N' && l('œil') === 'œil:N' && l('OEIL') === 'œil:N'
                  && l('file') === 'file:N,filer:V' && l('zorglub') === '' && toks === "aujourd'hui|l'|oeil|voit" || JSON.stringify([l('fasses'), l('belles'), l('yeux'), toks]); })""")

    # ---- 3. the tapped word -------------------------------------------------------------------------------------------------
    r = word('file', 'Nous attendons dans la file pour la carte.')
    ok('3a «file» after «la»: the engine\'s «лінії» is a known pivot mistake -> the dictionary\'s noun meaning «черга» first',
       r and r['text'] == 'черга' and r['html'].count('ряд') == 1 and 'мчати' in r['html'] and '📖' in r['html'] and '⌂' in r['html'], r)
    r = word('temps', 'Le temps passe vite.')
    ok('3b the meaning the engine chose in the sentence is the one shown first, the others below', r and r['text'] == 'час' and 'погода' in r['html'] and r['html'].index('погода') > r['html'].index('📖'), r)
    r = word('beau', "Il fait beau aujourd'hui.")
    ok('3c a word inside a set expression shows the expression\'s translation, with the expression', r and r['text'] == 'гарна погода' and r['note'] == 'il fait beau', r)
    r = word('zorglub', 'Le zorglub zorglub.')
    ok('3d an unknown word is shown exactly as without the dictionary', r and r['text'] == 'зорглуб' and not r.get('senses') and '📖' not in r['html'], r)
    r = word('fasses', 'fasses')
    ok('3e a form alone: its lemma is named, its meaning comes from the dictionary', r and r['text'] == 'робити / зробити' and r['note'] == 'faire', r)

    # ---- 4. the sentence ----------------------------------------------------------------------------------------------------
    ok('4a a set expression translated word by word gets the dictionary\'s translation', sentence("Il fait beau aujourd'hui.") == 'Гарна погода сьогодні.', sentence("Il fait beau aujourd'hui."))
    ok('4b ... an expression the engine got right stays as it was', sentence('Il fait beau et chaud.') == 'Гарна погода і тепло.')
    ok('4c ... in the engine\'s tense and person: a French compound past -> the perfective past', sentence('Je me suis rendu compte de tout.') == 'Я усвідомив усього.', sentence('Je me suis rendu compte de tout.'))
    ok('4d ... the present -> the imperfective present', sentence('Elle se rend compte de tout.') == 'Вона усвідомлює усього.', sentence('Elle se rend compte de tout.'))
    ok('4e «faire le ménage» -> «прибирати» in the present', sentence('Elle fait le ménage.') == 'Вона прибирає.', sentence('Elle fait le ménage.'))
    ok('4f a homonym the engine got wrong is corrected and put in the case of the word it replaces (лінію -> чергу)', sentence('Je vois la file pour la carte.') == 'Я бачу чергу для картки.', sentence('Je vois la file pour la carte.'))
    ok('4g ... the engine\'s right word stays', sentence('Je vois la file devant moi.') == 'Я бачу чергу переді мною.')
    js("__asked = []; 1")
    ok('4h a reading the context does not settle (a verb «file» has no known mistakes) changes nothing: one plain engine call', sentence('Elle file vite.') == 'Вона швидко мчить.' and js("__asked.length === 1 && __asked[0] === 'Elle file vite.'"), js("__asked"))
    ok('4i a direction without dictionary is the engine as it is', js("offlineTranslateSentence('Le temps passe vite.', 'fr', 'en').then(out => out === null && __asked.at(-1) === 'Le temps passe vite.')") is True)
    check('4j the diagnostics say what the dictionary did, with no text of the book', "(() => { const r = offlineTrReport(); return r.dicts['fr>uk'].versions.data === 'test1' && r.dictLast.kind === 'sentence' && !JSON.stringify(r).includes('file'); })()")

    # ---- 5. the popup offline -----------------------------------------------------------------------------------------------
    c.call('Network.emulateNetworkConditions', offline=True, latency=0, downloadThroughput=-1, uploadThroughput=-1)
    js("state.translationCache = {}; machineTranslate = async () => { throw new Error('offline'); }; state.ctxSentence = 'Il fait le ménage le soir.'; handleWordOrSelection('ménage', 200, 200); 1")
    check('5a offline, a tapped word shows the dictionary\'s meaning first (⌂) and its meanings below',
          "els.ttTranslation.textContent.includes('⌂') && els.ttTranslation.textContent.includes('📖') && /^(прибирати|прибирання)/.test(els.ttTranslation.textContent.trim())", timeout=20)
    c.call('Network.emulateNetworkConditions', offline=False, latency=0, downloadThroughput=-1, uploadThroughput=-1)

    # ---- 6. removed with the pack; a lost file; an older record ------------------------------------------------------------
    check('6a removing the direction removes its dictionary from the record, the cache and memory',
          """offlineTrRemove('fr', 'uk').then(async () => { const keys = (await (await caches.open(OFFLINE_TR_CACHE)).keys()).map(r => decodeURIComponent(r.url));
              return !offlineTrPack.dicts['fr>uk'] && !keys.some(k => k.includes('/dict/')) && (await offlineDictLoad('fr', 'uk')) === null; })""")
    LOG.clear()
    js("offlineTrInstall('fr', 'uk').then(() => 1)")
    check('6b installed again', "!!(offlineTrPack.dicts['fr>uk'] && offlineTrPack.directions.includes('fr>uk'))", timeout=30)
    check('6c a dictionary file the browser lost: the dictionary is forgotten (the pack stays) and Settings offers it again',
          """(async () => { const cache = await caches.open(OFFLINE_TR_CACHE); await cache.delete(offlineTrKey('dict', 'fr>uk', 'forms', 'test1')); offlineDictRelease();
              const d = await offlineDictLoad('fr', 'uk'); return d === null && !offlineTrPack.dicts['fr>uk'] && offlineTrPack.directions.includes('fr>uk')
                  && offlineTrMissingBytes(offlineTrPack, offlineTrRoute('fr', 'uk'), 'fr>uk') === SIZE_DICT; })()""".replace('SIZE_DICT', str(sum(len(v) for v in DICT.values()))))
    check('6d a state record written before the dictionaries is read as a pack without one',
          """(async () => { const saved = { v: 1, engine: offlineTrPack.engine, models: offlineTrPack.models, directions: offlineTrPack.directions };
              await (await caches.open(OFFLINE_TR_CACHE)).put(offlineTrKey('state'), new Response(JSON.stringify(saved)));
              offlineTrPack = null; const pack = await offlineTrLoad(); return JSON.stringify(pack.dicts) === '{}' && pack.directions.includes('fr>uk'); })()""")

    # ---- 7. strings, CSP ------------------------------------------------------------------------------------------------------
    check('7a every new string exists in all 9 menu languages',
          """['offWithDict','offDictTitle','offPosN','offPosV','offPosA','offPosAdv','offPosPre','offPosCon','offPosPro','offPosDet','offPosNum','offPosIntj']
              .every(k => ['uk','en','fr','ru','zh','ko','hi','ga','es'].every(l => I18N[k] && typeof I18N[k][l] === 'string' && I18N[k][l].length > 1))""")
    check('7b nothing threw and nothing was blocked by the Content-Security-Policy', "__errors.length === 0 && __csp.length === 0 ? true : JSON.stringify({csp: __csp, errors: __errors})")
    print('ALL PASS offline_dict_browser', flush=True)
finally:
    server.shutdown()
