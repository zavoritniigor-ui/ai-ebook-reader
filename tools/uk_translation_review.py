#!/usr/bin/env python3
"""Measures what the real AI answers in Ukrainian, using the app's OWN prompts.

Mocked tests cannot show what a model writes, so a changed translation prompt has to be tried
against live AI. This drives the PRODUCTION app in headless Chrome over CDP and calls the app's own
aiTranslateText() in the page, so the prompt measured is the prompt that shipped.

NO API KEY is used, read, printed or stored. Production's /api/ai Cloudflare Function adds the
site's secret server-side (js/ai-client.js, SHARED_AI_KEY), so this measures exactly what a visitor
without a key gets. Any own key in the page profile is cleared before the first request.

Modes:
  --mode set      the full set: every word of dict/review_sentences.tsv in its sentence, whole
                  sentences from that file and dict/test_sentences_hard.tsv, foreign quotes
  --mode repeat   a few cases several times over, to tell a stable error from one unlucky sample
  --mode ab       the same prompt with and without languageNormNote(), to see if the note does
                  anything at all

The shared Groq key allows 8000 tokens/minute, so requests are paced (--delay). Results are written
after every case, so a rate-limit stop keeps whatever ran. Findings: docs/translation_quality_review.md

Examples:
  python3 tools/uk_translation_review.py --provider groq
  python3 tools/uk_translation_review.py --provider openai --delay 2.5
  python3 tools/uk_translation_review.py --mode repeat --provider groq --repeats 4
  python3 tools/uk_translation_review.py --mode ab --provider groq
"""
import argparse
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, 'tests'))

PROD = 'https://ai-ebook-reader.pages.dev/index.html'

# ---- the measured set -------------------------------------------------------------------------
# Whole sentences / fragments, chosen for what actually breaks: set expressions whose literal
# reading is wrong, tenses Ukrainian has no form for, a correlative construction that invites a
# calque, colloquial register, and a homograph pair.
SENTENCES = [
    'Cette robe coûte les yeux de la tête !',
    'Tu peux me donner un coup de main avec ces valises ?',
    'Nos voisins pendent la crémaillère samedi soir.',
    "Je me suis rendu compte que j'avais oublié mon cahier.",
    'Il nous a posé un lapin pour la troisième fois.',
    'Il pleuvait des cordes quand nous sommes sortis.',
    "Ils ont fait la grasse matinée jusqu'à midi.",
    'Nous avons du pain sur la planche cette semaine.',
    "Elle s'est levée du pied gauche ce matin.",
    'Mon grand-père a vendu la mèche au dîner.',
    'Nous allons prendre le taureau par les cornes.',
    "Petit à petit, l'oiseau fait son nid.",
    "Il fallut que nous partissions avant l'aube.",
    "Qu'il fût roi ou mendiant, il riait de la même façon.",
    "S'ils avaient su, ils seraient restés chez eux.",
    'Plus il parlait, moins on le comprenait.',
    "C'est ouf, j'ai kiffé ce concert !",
    'Les poules du couvent couvent leurs œufs.',
    'Tu me casses les pieds avec tes questions !',
    'Rarement ai-je vu une mer aussi calme.',
]
# Short foreign quotes inside an English sentence. srcCode is NOT hard-coded: it comes from the
# app's own langForText(), i.e. whatever the reader's page would really pass -- including a wrong
# guess, which is the point, because the prompt only calls the language «likely».
QUOTES = [
    ('Was ist das?', 'The German boy pointed at the machine and asked: "Was ist das?"'),
    ('Muchas gracias', 'She smiled, said "Muchas gracias", and closed the door.'),
    ('Che sarà, sarà', 'His grandmother only shrugged and said "Che sarà, sarà".'),
    ("Wie geht's dir?", 'He leaned over the fence and called out "Wie geht\'s dir?"'),
    ('Dziękuję bardzo', 'The old man took the bread and whispered "Dziękuję bardzo".'),
]
# The cases --mode repeat re-asks: everything the 2026-11-26 run got wrong on Groq.
REPEAT_CASES = [
    ('sentence', 'Cette robe coûte les yeux de la tête !', None),
    ('sentence', "Elle s'est levée du pied gauche ce matin.", None),
    ('sentence', 'Tu me casses les pieds avec tes questions !', None),
    ('sentence', 'Nous allons prendre le taureau par les cornes.', None),
    ('sentence', "Qu'il fût roi ou mendiant, il riait de la même façon.", None),
    ('word', 'pose', 'Le professeur pose une question et les élèves lèvent la main.'),
    ('word', 'pris', 'Elle a pris le train de huit heures pour aller au travail.'),
    ('word', 'crémaillère', 'Nos voisins pendent la crémaillère samedi soir.'),
]
# --mode ab: each sentence pulls towards one of the forms languageNormNote() forbids.
AB_CASES = [
    ('Nous avons pris part à la réunion de lundi.', 'брати участь / приймати участь'),
    ('Pendant toute la semaine, il a plu sans arrêt.', 'протягом / на протязі'),
    ('Le mois suivant, nous partirons pour Lyon.', 'наступний / слідуючий'),
    ('Il me semble que tu as raison sur ce point.', 'мені здається / мені кажеться'),
    ('Excusez-moi, je suis arrivé en retard.', 'вибачте / вибачаюсь'),
    ('Elle a dit : « bonjour » et elle est partie.', 'лапки «» / ""'),
    ('Plus il parlait, moins on le comprenait.', 'що більше…то / чим більше…тим'),
]

# Forms the norm note names, plus the usual Russianisms of translated Ukrainian prose. A screen,
# not a verdict: it flags candidates for a linguistic read and cannot see a wrong sense at all.
RUSSIANISMS = [
    (r'приймати\s+участь|приймає\s+участь|прийняв\s+участь', 'приймати участь → брати участь'),
    (r'на\s+протязі', 'на протязі → протягом'),
    (r'слідуюч', 'слідуючий → наступний'),
    (r'мені\s+кажеться', 'мені кажеться → мені здається'),
    (r'вибачаюсь', 'вибачаюсь → вибачте'),
    (r'\bбудь\s+то\b', 'будь то → хай (би)…, чи то… чи то'),
    (r'чим\s+(?:більше|менше).{0,40}?тим\s+(?:більше|менше)', 'чим…тим → що…то'),
    (r'\bнаходиться\b', 'находиться → перебуває / розташований'),
    (r'\bявляється\b', 'являється → є'),
    (r'відноситься\s+до', 'відноситься до → стосується'),
    (r'в\s+залежності', 'в залежності → залежно'),
    (r'по\s+крайній\s+мірі', 'по крайній мірі → принаймні'),
    (r'в\s+кінці\s+кінців', 'в кінці кінців → кінець кінцем'),
    (r'тим\s+не\s+менш', 'тим не менш → проте / а втім'),
    (r'\bіз-за\b', 'із-за → через'),
    (r'\bхватає\b|\bхватить\b', 'хватає → вистачає'),
]
RU_ONLY_LETTERS = re.compile(r'[ыъэё]')
STRAIGHT_QUOTES = re.compile(r'["“”„]')


def screen(text):
    """Candidate problems in one Ukrainian reply. Returns a list of notes (possibly empty)."""
    if not text:
        return ['порожня відповідь']
    out = [note for pattern, note in RUSSIANISMS if re.search(pattern, text.lower())]
    if RU_ONLY_LETTERS.search(text.lower()):
        out.append('російські літери (ы/ъ/э/ё)')
    if STRAIGHT_QUOTES.search(text):
        out.append('лапки не «»')
    return out


# ---- the browser ------------------------------------------------------------------------------
def free_port(preferred):
    with socket.socket() as s:
        try:
            s.bind(('127.0.0.1', preferred))
            return preferred
        except OSError:
            s.bind(('127.0.0.1', 0))
            return s.getsockname()[1]


def start_chrome(port, profile):
    chrome = (shutil.which('google-chrome') or shutil.which('chromium')
              or shutil.which('chromium-browser') or 'google-chrome')
    proc = subprocess.Popen([
        chrome, '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
        f'--remote-debugging-port={port}', f'--user-data-dir={profile}', 'about:blank',
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    deadline = time.time() + 30
    while time.time() < deadline:
        try:
            urllib.request.urlopen(f'http://127.0.0.1:{port}/json', timeout=1).read()
            return proc
        except Exception:
            time.sleep(0.3)
    proc.terminate()
    raise SystemExit('Chrome did not open its CDP port')


def open_app(port):
    from browser_cdp import CDP
    c = CDP()
    c.sock.settimeout(90)
    c.call('Page.enable')
    c.call('Runtime.enable')
    c.call('Page.navigate', url=PROD)
    c.wait("document.readyState==='complete'", timeout=60)
    c.wait("typeof aiTranslateText==='function' && typeof langForText==='function'", timeout=60)
    # An own key must not interfere: this measures what a keyless visitor gets.
    c.js("try{for(const k of ['reader_openai_key','reader_groq_key','reader_gemini_key'])"
         "localStorage.removeItem(k)}catch(e){}")
    c.js("state.openaiKey='';state.groqKey='';state.apiKey='';state.targetLang='uk'")
    c.js('(async()=>{await ensureSharedAiProviders(true);return 1})()')
    return c


# The call the reader really makes for a tapped word or fragment. `info` reports which provider and
# model ACTUALLY answered, so a silent switch to the backup cannot pass as the asked-for provider.
CALL = r'''
(async () => {
  const info = {}; const started = performance.now();
  let out = null, error = null;
  try { out = await aiTranslateText(%(text)s, %(src)s, undefined, 'uk', %(ctx)s, false, %(provider)s, info); }
  catch (e) { error = String(e && e.message || e); }
  return JSON.stringify({
    out: out == null ? null : (typeof out === 'string' ? { translation: out } : out),
    provider: info.provider || null, model: info.model || null,
    ms: Math.round(performance.now() - started), error });
})()
'''


def ask(c, text, src, ctx, provider):
    return json.loads(c.js(CALL % {
        'text': json.dumps(text), 'src': json.dumps(src),
        'ctx': json.dumps(ctx) if ctx is not None else 'undefined',
        'provider': json.dumps(provider)}))


def translation_of(got):
    out = got.get('out') or {}
    return out.get('translation'), (out.get('contextNote') or out.get('context'))


def review_words():
    """[(sentence, word)] -- every line of dict/review_sentences.tsv."""
    out = []
    with open(os.path.join(REPO, 'dict/review_sentences.tsv'), encoding='utf-8') as fh:
        for line in fh:
            line = line.rstrip('\n')
            if line and not line.startswith('#'):
                parts = line.split('\t')
                if len(parts) >= 2 and parts[0].strip() and parts[1].strip():
                    out.append((parts[0].strip(), parts[1].strip()))
    return out


# ---- the app's own sentence prompt, built in the page, with and without the norm note ----------
AB_BUILD = r'''
(() => {
  const text = %(text)s, targetLang = 'uk', srcCode = 'fr';
  const langName = LANG_NAMES[targetLang] || 'українською';
  const srcName = translationSourceLangName(srcCode);
  const note = languageNormNote(targetLang) ? '\n' + languageNormNote(targetLang).trim() : '';
  const srcLine = srcName ? `\nЙмовірна мова оригіналу — ${srcName} (визначено автоматично; якщо текст явно іншою мовою, перекладай з неї).` : '';
  const body = after => `Переклади ${langName} цей фрагмент: "${text}"${srcLine}${after}
Зроби природний, зв'язний переклад із правильним порядком слів, а не дослівний підрядник. Нічого не додавай і нічого не пропускай. У відповіді — лише переклад, без лапок і пояснень.`;
  return JSON.stringify({ withNote: body(note), without: body(''), noteText: note });
})()
'''
AB_SEND = r'''
(async () => {
  let out = null, error = null;
  const options = { maxOutputTokens: 400, provider: %(provider)s, meta: {} };
  try { out = await callAI(%(prompt)s, undefined, 'translation', undefined, options); }
  catch (e) { error = String(e && e.message || e); }
  return JSON.stringify({ clean: out ? normalizeTranslation(out, 'uk', false) : null, error });
})()
'''


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--mode', default='set', choices=['set', 'repeat', 'ab'])
    ap.add_argument('--provider', default='groq', choices=['groq', 'openai'])
    ap.add_argument('--delay', type=float, default=6.0,
                    help='seconds between requests (shared Groq key: 8000 tokens/min); 2.5 is enough for OpenAI')
    ap.add_argument('--repeats', type=int, default=3, help='--mode repeat: how many times each case')
    ap.add_argument('--out', default=None,
                    help='JSON output (default: a temp file; never inside the repository)')
    ap.add_argument('--port', type=int, default=9333)
    args = ap.parse_args()
    # Deliberately NOT inside the repository: a run must not leave a scratch file to be committed.
    out_path = args.out or os.path.join(tempfile.gettempdir(),
                                        f'uk_review_{args.mode}_{args.provider}.json')

    port = free_port(args.port)
    profile = tempfile.mkdtemp(prefix='uk_review_chrome_')
    chrome = start_chrome(port, profile)
    os.environ['READER_CDP_PORT'] = str(port)
    records = []

    def save():
        with open(out_path, 'w', encoding='utf-8') as fh:
            json.dump(records, fh, ensure_ascii=False, indent=1)

    try:
        c = open_app(port)
        shared = c.js('JSON.stringify(sharedAiProviders)')
        print('shared keys on the site:', shared, flush=True)
        if f'"{args.provider}":true' not in shared.replace(' ', ''):
            raise SystemExit(f'the site has no shared {args.provider} key: nothing to measure')

        if args.mode == 'ab':
            first = True
            for text, pull in AB_CASES:
                built = json.loads(c.js(AB_BUILD % {'text': json.dumps(text)}))
                if not built['noteText'].strip():
                    raise SystemExit('languageNormNote() is empty: nothing to compare')
                got = {}
                for variant in ('withNote', 'without'):
                    if not first:
                        time.sleep(args.delay)
                    first = False
                    got[variant] = json.loads(c.js(AB_SEND % {
                        'prompt': json.dumps(built[variant]),
                        'provider': json.dumps(args.provider)})).get('clean')
                records.append({'text': text, 'pulls_towards': pull,
                                'with_note': got['withNote'], 'without_note': got['without'],
                                'same': got['withNote'] == got['without']})
                print(f'\n{text}\n   тягне до: {pull}\n   З НОТОЮ : {got["withNote"]}'
                      f'\n   БЕЗ НОТИ: {got["without"]}', flush=True)
                save()
            same = sum(1 for r in records if r['same'])
            print(f'\nідентичних відповідей: {same}/{len(records)}')

        elif args.mode == 'repeat':
            first = True
            for rep in range(args.repeats):
                for kind, text, ctx in REPEAT_CASES:
                    if not first:
                        time.sleep(args.delay)
                    first = False
                    c.js('state.translationCache={}')   # a repeat must not be served from the app's cache
                    got = ask(c, text, 'fr', ctx, args.provider)
                    tr, note = translation_of(got)
                    records.append({'rep': rep + 1, 'kind': kind, 'text': text, 'ctx': ctx,
                                    'translation': tr, 'contextNote': note,
                                    'flags': screen(tr), 'provider': got.get('provider')})
                    print(f'rep{rep + 1} [{kind}] {text[:42]!r} -> {tr!r}'
                          + (f"  !{'; '.join(screen(tr))}" if screen(tr) else ''), flush=True)
                    save()
            for kind, text, _ in REPEAT_CASES:
                seen = [r['translation'] for r in records if r['text'] == text]
                print(f"\n{text[:50]!r}\n   {' · '.join(str(x) for x in seen)}"
                      f"\n   {'СТАБІЛЬНО' if len(set(seen)) == 1 else f'НЕСТАБІЛЬНО ({len(set(seen))} різних)'}")

        else:
            plan = [{'kind': 'word', 'text': w, 'ctx': s, 'src': 'fr'} for s, w in review_words()]
            plan += [{'kind': 'sentence', 'text': s, 'ctx': None, 'src': 'fr'} for s in SENTENCES]
            for quote, english in QUOTES:
                src = c.js("(()=>{state.ctxSentence=%s;return String(langForText(%s)||'').slice(0,2)})()"
                           % (json.dumps(english), json.dumps(quote)))
                plan.append({'kind': 'quote', 'text': quote, 'ctx': english, 'src': src})
            for i, case in enumerate(plan, 1):
                if i > 1:
                    time.sleep(args.delay)
                try:
                    got = ask(c, case['text'], case['src'], case['ctx'], args.provider)
                except Exception as e:                      # one bad case must not lose the run
                    got = {'out': None, 'error': f'harness: {e}'}
                tr, note = translation_of(got)
                records.append(dict(case, asked=args.provider, translation=tr, contextNote=note,
                                    flags=screen(tr), provider=got.get('provider'),
                                    model=got.get('model'), ms=got.get('ms'), error=got.get('error')))
                print(f"{i:3}/{len(plan)} [{case['kind']}] {case['text'][:45]!r} -> {tr!r}"
                      + (f'  ctx={note!r}' if note else '')
                      + (f"  ERR={got.get('error')}" if got.get('error') else '')
                      + (f"  !{'; '.join(screen(tr))}" if screen(tr) else ''), flush=True)
                save()
            flagged = [r for r in records if r['flags']]
            ms = [r['ms'] for r in records if r.get('ms')]
            print(f"\n{len(records)} випадків, порожніх: {sum(1 for r in records if not r['translation'])},"
                  f" позначено скрином: {len(flagged)}")
            if ms:
                print(f'мс: min={min(ms)} median={sorted(ms)[len(ms) // 2]} max={max(ms)}')
            for r in flagged:
                print(f"  [{r['kind']}] {r['text']!r} -> {r['translation']!r}: {'; '.join(r['flags'])}")
    finally:
        try:
            chrome.terminate()
            chrome.wait(timeout=5)
        except Exception:
            pass
        shutil.rmtree(profile, ignore_errors=True)
    print('wrote', out_path, f'({len(records)} records)')


if __name__ == '__main__':
    main()
