"""Verb endings in conjugation tables: the ENDING of every form has its own colour (.verb-ending), for regular AND irregular verbs.

Owner (2026-10-19, twice): "endings must necessarily have a different colour". Before, only verbs whose forms start with the lemma's stem
were coloured (28% of the forms of 33 common verbs; faire, voir, prendre, venir... got nothing). Now verbEndingRanges() (js/grammar-svo.js)
marks the longest personal ending a form really ends with, per tense and person (data: GRAMMAR_LANG_CONFIG.fr.verb.endingRules), and the
past participle's ending in a compound tense.

Proves: gold segmentations (regular, spelling-change, irregular, compound; with a tense label and without one); coverage over 33 verbs x 6
tenses; every verb column of every conjugation table in the Rules catalogue has coloured endings; the Grammar grid and its stem | ending
line; and in light / dark / sepia the ending colour differs from the stem's colour and from the frame colours (accent, borders) and reads
on the row background (WCAG AA 4.5:1). No AI.
"""
import json, os
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1100, height=900, deviceScaleFactor=1, mobile=False)


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


IMP = ['ais', 'ais', 'ait', 'ions', 'iez', 'aient']
FUT = ['ai', 'as', 'a', 'ons', 'ez', 'ont']
AUX_AV = ['ai', 'as', 'a', 'avons', 'avez', 'ont']
AUX_ET = ['suis', 'es', 'est', 'sommes', 'êtes', 'sont']


def verb(inf, pres, imp, fut, subj1, subj2, pp, aux='av', subj_full=None, imp_full=None):
    return dict(inf=inf, pres=pres.split(), imp=imp_full or [imp + e for e in IMP], fut=[fut + e for e in FUT], cond=[fut + e for e in IMP],
                subj=subj_full.split() if subj_full else [subj1 + e for e in ['e', 'es', 'e']] + [subj2 + 'ions', subj2 + 'iez', subj1 + 'ent'],
                pc=[(AUX_AV if aux == 'av' else AUX_ET)[i] + ' ' + pp for i in range(6)])


V = [
    verb('parler', 'parle parles parle parlons parlez parlent', 'parl', 'parler', 'parl', 'parl', 'parlé'),
    verb('manger', 'mange manges mange mangeons mangez mangent', '', 'manger', 'mang', 'mang', 'mangé', imp_full='mangeais mangeais mangeait mangions mangiez mangeaient'.split()),
    verb('commencer', 'commence commences commence commençons commencez commencent', '', 'commencer', 'commenc', 'commenc', 'commencé', imp_full='commençais commençais commençait commencions commenciez commençaient'.split()),
    verb('appeler', 'appelle appelles appelle appelons appelez appellent', 'appel', 'appeller', 'appell', 'appel', 'appelé'),
    verb('acheter', 'achète achètes achète achetons achetez achètent', 'achet', 'achèter', 'achèt', 'achet', 'acheté'),
    verb('préférer', 'préfère préfères préfère préférons préférez préfèrent', 'préfér', 'préférer', 'préfèr', 'préfér', 'préféré'),
    verb('payer', 'paie paies paie payons payez paient', 'pay', 'paier', 'pai', 'pay', 'payé'),
    verb('envoyer', 'envoie envoies envoie envoyons envoyez envoient', 'envoy', 'enverr', 'envoi', 'envoy', 'envoyé'),
    verb('finir', 'finis finis finit finissons finissez finissent', 'finiss', 'finir', 'finiss', 'finiss', 'fini'),
    verb('choisir', 'choisis choisis choisit choisissons choisissez choisissent', 'choisiss', 'choisir', 'choisiss', 'choisiss', 'choisi'),
    verb('vendre', 'vends vends vend vendons vendez vendent', 'vend', 'vendr', 'vend', 'vend', 'vendu'),
    verb('attendre', 'attends attends attend attendons attendez attendent', 'attend', 'attendr', 'attend', 'attend', 'attendu'),
    verb('être', 'suis es est sommes êtes sont', 'ét', 'ser', '', '', 'été', subj_full='sois sois soit soyons soyez soient'),
    verb('avoir', 'ai as a avons avez ont', 'av', 'aur', '', '', 'eu', subj_full='aie aies ait ayons ayez aient'),
    verb('aller', 'vais vas va allons allez vont', 'all', 'ir', '', '', 'allé', aux='et', subj_full='aille ailles aille allions alliez aillent'),
    verb('faire', 'fais fais fait faisons faites font', 'fais', 'fer', 'fass', 'fass', 'fait'),
    verb('dire', 'dis dis dit disons dites disent', 'dis', 'dir', 'dis', 'dis', 'dit'),
    verb('voir', 'vois vois voit voyons voyez voient', 'voy', 'verr', 'voi', 'voy', 'vu'),
    verb('savoir', 'sais sais sait savons savez savent', 'sav', 'saur', 'sach', 'sach', 'su'),
    verb('pouvoir', 'peux peux peut pouvons pouvez peuvent', 'pouv', 'pourr', 'puiss', 'puiss', 'pu'),
    verb('vouloir', 'veux veux veut voulons voulez veulent', 'voul', 'voudr', 'veuill', 'voul', 'voulu'),
    verb('devoir', 'dois dois doit devons devez doivent', 'dev', 'devr', 'doiv', 'dev', 'dû'),
    verb('venir', 'viens viens vient venons venez viennent', 'ven', 'viendr', 'vienn', 'ven', 'venu', aux='et'),
    verb('prendre', 'prends prends prend prenons prenez prennent', 'pren', 'prendr', 'prenn', 'pren', 'pris'),
    verb('mettre', 'mets mets met mettons mettez mettent', 'mett', 'mettr', 'mett', 'mett', 'mis'),
    verb('partir', 'pars pars part partons partez partent', 'part', 'partir', 'part', 'part', 'parti', aux='et'),
    verb('dormir', 'dors dors dort dormons dormez dorment', 'dorm', 'dormir', 'dorm', 'dorm', 'dormi'),
    verb('lire', 'lis lis lit lisons lisez lisent', 'lis', 'lir', 'lis', 'lis', 'lu'),
    verb('écrire', 'écris écris écrit écrivons écrivez écrivent', 'écriv', 'écrir', 'écriv', 'écriv', 'écrit'),
    verb('connaître', 'connais connais connaît connaissons connaissez connaissent', 'connaiss', 'connaîtr', 'connaiss', 'connaiss', 'connu'),
    verb('vivre', 'vis vis vit vivons vivez vivent', 'viv', 'vivr', 'viv', 'viv', 'vécu'),
    verb('ouvrir', 'ouvre ouvres ouvre ouvrons ouvrez ouvrent', 'ouvr', 'ouvrir', 'ouvr', 'ouvr', 'ouvert'),
    verb('recevoir', 'reçois reçois reçoit recevons recevez reçoivent', 'recev', 'recevr', 'reçoiv', 'recev', 'reçu'),
]
TENSES = ['pres', 'imp', 'fut', 'cond', 'subj', 'pc']
LABELS = dict(pres='Présent', imp='Imparfait', fut='Futur simple', cond='Conditionnel', subj='Subjonctif', pc='Passé composé')

# stem[ending] per cell: the ending is what the learner should see in colour
GOLD = {
    ('parler', 'pres'): 'parl[e] | parl[es] | parl[e] | parl[ons] | parl[ez] | parl[ent]',
    ('manger', 'imp'): 'mange[ais] | mange[ais] | mange[ait] | mang[ions] | mang[iez] | mange[aient]',
    ('appeler', 'pres'): 'appell[e] | appell[es] | appell[e] | appel[ons] | appel[ez] | appell[ent]',
    ('payer', 'pres'): 'pai[e] | pai[es] | pai[e] | pay[ons] | pay[ez] | pai[ent]',
    ('finir', 'pres'): 'fin[is] | fin[is] | fin[it] | fin[issons] | fin[issez] | fin[issent]',
    ('finir', 'subj'): 'finiss[e] | finiss[es] | finiss[e] | finiss[ions] | finiss[iez] | finiss[ent]',
    ('vendre', 'pres'): 'vend[s] | vend[s] | vend | vend[ons] | vend[ez] | vend[ent]',
    ('prendre', 'pres'): 'prend[s] | prend[s] | prend | pren[ons] | pren[ez] | prenn[ent]',
    ('faire', 'pres'): 'fai[s] | fai[s] | fai[t] | fais[ons] | fai[tes] | f[ont]',
    ('venir', 'pres'): 'vien[s] | vien[s] | vien[t] | ven[ons] | ven[ez] | vienn[ent]',
    ('pouvoir', 'pres'): 'peu[x] | peu[x] | peu[t] | pouv[ons] | pouv[ez] | peuv[ent]',
    ('ouvrir', 'pres'): 'ouvr[e] | ouvr[es] | ouvr[e] | ouvr[ons] | ouvr[ez] | ouvr[ent]',
    ('être', 'pres'): 'suis | es | est | sommes | ê[tes] | s[ont]',
    ('avoir', 'pres'): 'ai | as | a | av[ons] | av[ez] | ont',
    ('aller', 'pres'): 'vais | vas | va | all[ons] | all[ez] | v[ont]',
    ('être', 'imp'): 'ét[ais] | ét[ais] | ét[ait] | ét[ions] | ét[iez] | ét[aient]',
    ('aller', 'fut'): 'ir[ai] | ir[as] | ir[a] | ir[ons] | ir[ez] | ir[ont]',
    ('vouloir', 'cond'): 'voudr[ais] | voudr[ais] | voudr[ait] | voudr[ions] | voudr[iez] | voudr[aient]',
    ('prendre', 'pc'): 'ai pr[is] | as pr[is] | a pr[is] | avons pr[is] | avez pr[is] | ont pr[is]',
    ('aller', 'pc'): 'suis all[é] | es all[é] | est all[é] | sommes all[é] | êtes all[é] | sont all[é]',
    ('avoir', 'pc'): 'ai e[u] | as e[u] | a e[u] | avons e[u] | avez e[u] | ont e[u]',
}
# the same without naming the tense: it is recognised from the forms themselves
GOLD_AUTO = {
    ('finir', 'imp'): 'finiss[ais] | finiss[ais] | finiss[ait] | finiss[ions] | finiss[iez] | finiss[aient]',
    ('faire', 'pres'): GOLD[('faire', 'pres')],
    ('parler', 'pres'): GOLD[('parler', 'pres')],
    ('aller', 'fut'): GOLD[('aller', 'fut')],
}

c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof verbEndingRanges==='function'", timeout=30)
c.js("localStorage.clear(); showUpdateBanner=()=>{}; document.getElementById('sw-update-banner')?.remove(); 1")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof verbEndingRanges==='function'", timeout=30)
c.js("state.uiLang = 'uk'; applyI18n(); window.__errs = []; addEventListener('error', e => __errs.push(e.message)); addEventListener('unhandledrejection', e => __errs.push(String(e.reason))); 1")

RENDER = """((data, labels, auto) => { const out = {}; for (const v of data) { out[v.inf] = {}; for (const t of %s) {
   const ranges = verbEndingRanges(v[t], v.inf, 'fr', auto ? null : labels[t]);
   out[v.inf][t] = v[t].map((form, i) => { const el = document.createElement('span'); appendMarkedForm(el, form, ranges[i]);
     return [...el.childNodes].map(n => n.nodeType === 3 ? n.nodeValue : '[' + n.textContent + ']').join(''); }); } } return out; })(%s, %s, %s)"""
named = c.js(RENDER % (json.dumps(TENSES), json.dumps(V), json.dumps(LABELS), 'false'))
auto = c.js(RENDER % (json.dumps(TENSES), json.dumps(V), json.dumps(LABELS), 'true'))

for (inf, t), want in GOLD.items():
    got = ' | '.join(named[inf][t])
    assert got == want, (inf, t, got, want)
print('PASS 1 %d gold segmentations (regular, spelling-change, irregular, compound) come out exactly as written' % len(GOLD), flush=True)
for (inf, t), want in GOLD_AUTO.items():
    got = ' | '.join(auto[inf][t])
    assert got == want, ('no tense label', inf, t, got, want)
print('PASS 2 without a tense label the tense is recognised from the forms (%d cases)' % len(GOLD_AUTO), flush=True)

for label, res in (('named', named), ('auto', auto)):
    total = sum(1 for by in res.values() for t in TENSES for _ in by[t])
    coloured = sum(1 for by in res.values() for t in TENSES for cell in by[t] if '[' in cell)
    assert coloured / total >= 0.95, (label, coloured, total)
    plain = {inf: [t for t in TENSES if not any('[' in x for x in by[t])] for inf, by in res.items()}
    plain = {k: v for k, v in plain.items() if v}
    # No tense is left entirely plain (named); without the tense label only the present and subjunctive of être / avoir / aller may be (too few endings to be sure).
    assert (not plain) if label == 'named' else (set(plain) <= {'être', 'avoir', 'aller'} and all(set(v) <= {'pres', 'subj'} for v in plain.values())), (label, plain)
    print('PASS 3 [%s] %d of %d forms of 33 common verbs have a coloured ending (%.1f%%); a tense with none: %s' % (label, coloured, total, 100.0 * coloured / total, plain or 'no'), flush=True)

check("4 English stays stem-based: work|s, work|ed, go|es, do|es, be|ing; went / was / has are left alone",
      """(() => { const seg = (lemma, form) => { const el = document.createElement('span'); appendMarkedForm(el, form, verbEndingRanges([form], lemma, 'en', null)[0]); return [...el.childNodes].map(n => n.nodeType === 3 ? n.nodeValue : '[' + n.textContent + ']').join(''); };
         const got = [['work', 'works'], ['work', 'worked'], ['go', 'goes'], ['do', 'does'], ['be', 'being'], ['go', 'went'], ['be', 'was'], ['have', 'has']].map(p => seg(p[0], p[1])).join(',');
         return got === 'work[s],work[ed],go[es],do[es],be[ing],went,was,has' || got; })()""")

# ---- the Rules catalogue: every verb column of every conjugation table -------------------------------------------------------
check("5 every verb column of every French conjugation table in the Rules catalogue has coloured endings (simple AND compound tenses)",
      """(() => { const ids = ['present', 'imparfait', 'passe-simple', 'futur-simple', 'conditionnel-present', 'subjonctif-present', 'imperatif', 'passe-compose', 'plus-que-parfait', 'futur-anterieur', 'conditionnel-passe', 'subjonctif-passe', 'verbes-pronominaux'];
         const bad = []; for (const id of ids) { const box = document.createElement('div'); renderRuleDetailsText(box, GRAMMAR_RULE_DETAILS.fr[id].en, 'fr', id); const rows = [...box.querySelectorAll('tr')];
           const cols = rows[0].children.length; for (let j = 1; j < cols; j++) if (!rows.slice(1).some(r => r.children[j] && r.children[j].querySelector('.verb-ending'))) bad.push(id + ':' + rows[0].children[j].textContent); }
         return bad.length === 0 || JSON.stringify(bad); })()""")
check("5b the présent table: parler / finir / vendre fully, être / avoir / aller from the endings that follow the pattern (êtes, sont, avons, allez, vont), faire including fai|s, fai|t",
      """(() => { const box = document.createElement('div'); renderRuleDetailsText(box, GRAMMAR_RULE_DETAILS.fr.present.en, 'fr', 'present'); const rows = [...box.querySelectorAll('tr')]; const head = [...rows[0].children].map(x => x.textContent);
         const ends = name => rows.slice(1).map(r => [...r.children[head.indexOf(name)].querySelectorAll('.verb-ending')].map(s => s.textContent).join('')).join(',');
         const got = { parler: ends('parler'), finir: ends('finir'), vendre: ends('vendre'), 'être': ends('être'), avoir: ends('avoir'), aller: ends('aller'), faire: ends('faire') };
         const want = { parler: 'e,es,e,ons,ez,ent', finir: 'is,is,it,issons,issez,issent', vendre: 's,s,,ons,ez,ent', 'être': ',,,,tes,ont', avoir: ',,,ons,ez,', aller: ',,,ons,ez,ont', faire: 's,s,t,ons,tes,ont' };
         return JSON.stringify(got) === JSON.stringify(want) || JSON.stringify(got); })()""")
check("5c a compound topic colours the participle even though its header names the auxiliary's tense: «avoir (imparfait) + parlé» -> parl|é, «être (imparfait) + allé» -> all|é, all|ée",
      """(() => { const box = document.createElement('div'); renderRuleDetailsText(box, GRAMMAR_RULE_DETAILS.fr['plus-que-parfait'].en, 'fr', 'plus-que-parfait'); const cells = [...box.querySelectorAll('td')];
         const ends = cells.map(td => [...td.querySelectorAll('.verb-ending')].map(s => s.textContent).join('+'));
         return ends[0] === 'é' && ends[1].startsWith('é+ée') && !cells.some(td => td.querySelector('.verb-ending') && [...td.querySelectorAll('.verb-ending')].some(s => /^(?:ait|ais|ions|iez|aient)$/.test(s.textContent))) || JSON.stringify(ends.slice(0, 4)); })()""")
check("5d a row for a second person that shares the form (elle after il) is coloured too: je me lav|e, elle se lav|e",
      """(() => { const box = document.createElement('div'); renderRuleDetailsText(box, GRAMMAR_RULE_DETAILS.fr['verbes-pronominaux'].en, 'fr', 'verbes-pronominaux'); const rows = [...box.querySelectorAll('tr')].slice(1);
         const first = r => r.children[1].querySelector('.verb-ending')?.textContent; return rows.map(first).join(',') === 'e,es,e,e,ons,ez,ent,ent' || rows.map(first).join(','); })()""")

# ---- the Grammar grid ---------------------------------------------------------------------------------------------------------
c.js("""(() => { window.__focus = (lemma, surface, forms, tense, stem) => focusGrammarItem({ pos: 'verb', lemma, surface, sentence: 'Nous ' + surface + ' ici.', start: 5, end: 5 + surface.length, features: tense ? { tense } : {},
  explanation: '', stemBreakdown: stem || null, forms }, 'fr'); return 1; })()""")
c.js("""__focus('parler', 'parlons', { je: 'parle', tu: 'parles', 'il / elle / on': 'parle', nous: 'parlons', vous: 'parlez', 'ils / elles': 'parlent' }, 'présent')""")
check("6 the Grammar grid colours the endings of a regular verb: e, es, e, ons, ez, ent; the whole forms stay readable",
      """(() => { const vals = [...document.querySelectorAll('.grammar-focus-grid .grammar-grid-value')];
         return vals.map(v => v.textContent).join(',') === 'parle,parles,parle,parlons,parlez,parlent' && vals.map(v => [...v.querySelectorAll('.verb-ending')].map(s => s.textContent).join('')).join(',') === 'e,es,e,ons,ez,ent' || vals.map(v => v.innerHTML).join('/'); })()""")
c.js("""__focus('faire', 'faisons', { je: 'fais', tu: 'fais', 'il / elle / on': 'fait', nous: 'faisons', vous: 'faites', 'ils / elles': 'font' }, 'présent')""")
check("7 an irregular verb is coloured too (fai|s, fai|t, fais|ons, fai|tes, f|ont) and its tapped form gets the stem | ending line fais|ons although the model sent none",
      """(() => { const vals = [...document.querySelectorAll('.grammar-focus-grid .grammar-grid-value')]; const p = document.querySelector('.grammar-focus-pattern');
         return vals.map(v => [...v.querySelectorAll('.verb-ending')].map(s => s.textContent).join('')).join(',') === 's,s,t,ons,tes,ont' && !!p && p.querySelector('.grammar-stem').textContent === 'fais' && p.querySelector('.grammar-ending').textContent === 'ons'
           || JSON.stringify({ e: vals.map(v => v.innerHTML), p: p && p.textContent }); })()""")
c.js("""__focus('être', 'sommes', { je: 'suis', tu: 'es', 'il / elle / on': 'est', nous: 'sommes', vous: 'êtes', 'ils / elles': 'sont' }, 'présent')""")
check("8 être in the présent: only the endings that follow the pattern (êtes, sont) are coloured; suis, es, est, sommes and a pattern line for «sommes» are not invented",
      """(() => { const vals = [...document.querySelectorAll('.grammar-focus-grid .grammar-grid-value')];
         return vals.map(v => [...v.querySelectorAll('.verb-ending')].map(s => s.textContent).join('')).join(',') === ',,,,tes,ont' && !document.querySelector('.grammar-focus-pattern') || vals.map(v => v.innerHTML); })()""")
c.js("""__focus('finir', 'finissons', { je: 'finis', tu: 'finis', 'il / elle / on': 'finit', nous: 'finissons', vous: 'finissez', 'ils / elles': 'finissent' }, 'présent')""")

# ---- colours: the ending differs from the stem, from the frame, and reads on the row (light / dark / sepia) ------------------------
THEME = """((theme) => { document.body.dataset.theme = theme;
  const rgba = css => { const k = document.createElement('canvas').getContext('2d'); k.clearRect(0, 0, 1, 1); k.fillStyle = '#ff00ff'; k.fillStyle = css; k.fillRect(0, 0, 1, 1); const d = k.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const over = (top, bottom) => { const a = top[3] + bottom[3] * (1 - top[3]); return a === 0 ? [0, 0, 0, 0] : [0, 1, 2].map(i => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / a).concat([a]); };
  const bgOf = el => { let acc = [0, 0, 0, 0]; for (let n = el; n && acc[3] < 0.999; n = n.parentElement) acc = over(acc, rgba(getComputedStyle(n).backgroundColor)); return acc[3] < 0.999 ? over(acc, [255, 255, 255, 1]) : acc; };
  const lum = c => { const [r, g, b] = c.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const rows = [...document.querySelectorAll('.grammar-focus-grid .grammar-grid-row')]; const cur = rows.find(r => r.classList.contains('current')), plain = rows.find(r => !r.classList.contains('current'));
  const end = rgba(getComputedStyle(cur.querySelector('.verb-ending')).color), stem = rgba(getComputedStyle(cur.querySelector('.grammar-grid-value')).color);
  const accent = rgba(getComputedStyle(document.body).getPropertyValue('--accent-color').trim() || '#2f6fed'), border = rgba(getComputedStyle(document.body).getPropertyValue('--border-color').trim() || '#e5e5e1');
  const frame = rgba(getComputedStyle(cur).boxShadow.match(/rgba?\\([^)]*\\)|color\\([^)]*\\)/)[0]);
  return { theme, end: end.slice(0, 3).map(Math.round), vsStem: Math.round(dist(end, stem)), vsAccent: Math.round(dist(end, accent)), vsFrame: Math.round(dist(end, frame)), vsBorder: Math.round(dist(end, border)),
           onCurrent: +ratio(end, bgOf(cur)).toFixed(2), onPlain: +ratio(end, bgOf(plain)).toFixed(2) }; })(%s)"""
res = [c.js(THEME % json.dumps(t)) for t in ('light', 'dark', 'sepia')]
for r in res:
    assert r['vsStem'] >= 60 and r['vsAccent'] >= 90 and r['vsFrame'] >= 90 and r['vsBorder'] >= 90, r
    assert r['onCurrent'] >= 4.5 and r['onPlain'] >= 4.5, r
    print('PASS 9 [%s] the ending %s is far from the stem colour (%d), the accent (%d), the highlighted row\'s frame (%d) and the borders (%d); contrast %.1f:1 on the current row, %.1f:1 on the others'
          % (r['theme'], r['end'], r['vsStem'], r['vsAccent'], r['vsFrame'], r['vsBorder'], r['onCurrent'], r['onPlain']), flush=True)
c.js("document.body.dataset.theme = 'light'; 1")
check("10 no page errors", "__errs.length === 0 || JSON.stringify(__errs)")
print('ALL VERB ENDING CHECKS PASSED')
