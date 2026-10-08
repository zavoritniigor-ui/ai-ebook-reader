#!/usr/bin/env python3
"""Live-provider acceptance probe for the Grammar and Practice AI contract.

Why this exists: every automated test stubs the network, so none of them can say whether a REAL model's reply is accepted. This
runs the real reader (the real callAI -> provider -> parse -> validate -> panel pipeline) in a throw-away headless Chrome profile
against the real provider, on the French HVAC page that failed in acceptance, at five selection sizes:

    A one tapped word (sentence context = the merged, unpunctuated run a PDF really produces)
    B one clean sentence      C several sentences (the reported page)
    D a paragraph (14 sentences)      E a large page selection (70 sentences)     P the same tap through a real PDF (--pdf)

and then one Practice generation per mode (Verbes / Adjectifs) built from what Grammar found.

    READER_LIVE_AI_PROVIDER=openai|gemini|groq   READER_LIVE_AI_KEY=...   python3 tools/live_ai_probe.py [--pdf] [--url URL]

The key is read from the environment only (never a flag, never echoed, scrubbed from every line printed or written). Without --url the
probe serves this checkout on a free local port; with --url it drives a deployed build (e.g. a Cloudflare preview) instead.
It uses a fresh temporary Chrome profile: nothing from your own browser profile is read.

Output: a report to stdout, plus JSON in --out (default ./live_ai_probe_out/): report.json and, for every scenario that did NOT come
back fully OK, a replay-ready <scenario>.json (see tests/live_responses/README.md -- move it there to make it a regression test).

--stub replaces the network with a canned provider (harness self-test only; the report then says LIVE AI TESTED: NO).
Exit code: 0 all scenarios accepted, 1 at least one scenario failed, 2 the probe could not run.
"""
import argparse, base64, functools, http.server, json, os, shutil, socket, subprocess, sys, tempfile, threading, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, 'tests'))
from browser_cdp import CDP                     # noqa: E402
import ai_contract_fixtures as F                # noqa: E402
import practice_fixtures as PF                  # noqa: E402

PROVIDERS = {'openai': 'openaiKey', 'gemini': 'apiKey', 'groq': 'groqKey'}
RUN = 'PRÉPARER LES TRAVAUX Établi un diagnostic du travail à effectuer Observation visuelle et olfactive...'
KEY = ''


def scrub(value):
    s = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
    if KEY:
        s = s.replace(KEY, '[key]')
    return s


def die(message, code=2):
    print('PROBE ERROR: ' + scrub(message), file=sys.stderr)
    sys.exit(code)


def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def start_server():
    port = free_port()

    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass

    server = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, 'http://127.0.0.1:%d/index.html' % port


def start_chrome():
    binary = os.environ.get('CHROME') or next((shutil.which(n) for n in ('google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome') if shutil.which(n)), None)
    if not binary:
        die('no Chrome/Chromium found (set CHROME=/path/to/chrome)')
    port = free_port(); profile = tempfile.mkdtemp(prefix='live-ai-probe-')
    proc = subprocess.Popen([binary, '--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=%d' % port, '--user-data-dir=' + profile,
                             '--window-size=1000,1100', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(100):
        try:
            urllib.request.urlopen('http://127.0.0.1:%d/json/version' % port, timeout=1).read()
            break
        except Exception:
            time.sleep(0.1)
    else:
        proc.kill(); die('Chrome did not start')
    os.environ['READER_CDP_PORT'] = str(port)
    return proc, profile


STUB_JS = r"""(()=>{
const known = %s, RUN = %s, reply = %s, practice = %s;
window.__realFetch = window.__realFetch || window.fetch;
window.fetch = async (url, opts) => {
    const u = String(url);
    const provider = /api\.openai\.com/.test(u) ? 'openai' : /generativelanguage/.test(u) ? 'gemini' : /api\.groq\.com/.test(u) ? 'groq' : null;
    if (!provider) return __realFetch(url, opts);
    const body = JSON.parse(opts.body);
    const prompt = provider==='openai' ? body.input : provider==='gemini' ? body.contents[0].parts[0].text : body.messages[0].content;
    let text;
    if (/READING MATERIAL/.test(prompt)) text = JSON.stringify(/Words to demonstrate \(adjectives\)|set of common [^\n]*? adjectives/.test(prompt) ? practice.adjectives : practice.verbs);
    else if (/Conjugate the/.test(prompt)) text = JSON.stringify({forms:{}});
    else {
        const m = /Text \(a JSON string[^:]*: (".*")\n/.exec(prompt); const t = m ? JSON.parse(m[1]) : '';
        text = JSON.stringify(t.includes(RUN.slice(0, 40)) ? reply : {language:'fr', items: known.filter(k => t.includes(k.sentence)).flatMap(k => k.items)});
    }
    const out = provider==='openai' ? {status:'completed', model:'stub-model', output:[{type:'message', role:'assistant', content:[{type:'output_text', text}]}]}
        : provider==='gemini' ? {modelVersion:'stub-model', candidates:[{content:{parts:[{text}]}, finishReason:'STOP'}]}
        : {model:'stub-model', choices:[{message:{content:text}, finish_reason:'stop'}]};
    return new Response(JSON.stringify(out), {status:200});
};
return true; })()"""


def item_on_run(pos, lemma, surface, **kw):
    return dict(dict(pos=pos, lemma=lemma, surface=surface, sentence=RUN, occurrence=1, agreesWith=None, features={}, explanation='x', stemBreakdown=None, forms=None), **kw)


STUB_REPLY = dict(language='fr', items=[item_on_run('verb', 'effectuer', 'effectuer', features={'mood': 'infinitif'}), item_on_run('verb', 'établir', 'Établi'),
                                        item_on_run('adjective', 'visuel', 'visuelle', agreesWith='Observation', features={'gender': 'féminin', 'number': 'singulier'})])


def main():
    global KEY
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--url', help='drive a deployed build instead of this checkout (e.g. https://<hash>.ai-ebook-reader.pages.dev/)')
    ap.add_argument('--out', default='live_ai_probe_out')
    ap.add_argument('--pdf', action='store_true', help='also run the tap through a real PDF (scenario P)')
    ap.add_argument('--only', default='', help='comma-separated scenarios to run, e.g. A,C,practice')
    ap.add_argument('--stub', action='store_true', help='harness self-test with a canned provider (NOT a live test)')
    ap.add_argument('--timeout', type=int, default=240, help='seconds to wait for each request')
    args = ap.parse_args()
    provider = os.environ.get('READER_LIVE_AI_PROVIDER', 'openai').strip().lower()
    KEY = os.environ.get('READER_LIVE_AI_KEY', '').strip()
    if provider not in PROVIDERS:
        die('READER_LIVE_AI_PROVIDER must be one of %s' % ', '.join(PROVIDERS))
    if not KEY and not args.stub:
        die('set READER_LIVE_AI_KEY (and READER_LIVE_AI_PROVIDER) in the environment; the key is never printed or written')
    if args.stub:
        KEY = KEY or 'stub-key-not-real'
    only = {x.strip().lower() for x in args.only.split(',') if x.strip()}

    server = None
    url = args.url
    if not url:
        server, url = start_server()
    chrome, profile = start_chrome()
    results = []
    try:
        report = run(url, provider, args, only, results)
    finally:
        chrome.terminate()
        try:
            chrome.wait(timeout=10)
        except Exception:
            chrome.kill()
        shutil.rmtree(profile, ignore_errors=True)
        if server:
            server.shutdown()
    write_report(report, args)
    sys.exit(0 if report['allAccepted'] else 1)


def run(url, provider, args, only, results):
    c = CDP(); c.sock.settimeout(60)
    c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
    c.call('Emulation.setDeviceMetricsOverride', width=1000, height=1100, deviceScaleFactor=1, mobile=False)
    # console errors / unhandled rejections, collected inside the page (the CDP helper drops events)
    c.call('Page.addScriptToEvaluateOnNewDocument', source="""window.__errs=[];window.addEventListener('error',e=>__errs.push('error: '+(e.message||'')));
        window.addEventListener('unhandledrejection',e=>__errs.push('unhandledrejection: '+String(e.reason&&e.reason.message||e.reason)));
        const ce=console.error;console.error=function(){try{__errs.push('console.error: '+[...arguments].map(String).join(' ').slice(0,300))}catch(x){}return ce.apply(console,arguments)};""")
    c.call('Page.navigate', url=url)
    c.wait("document.readyState==='complete' && !document.body.inert", timeout=60)
    c.js("localStorage.clear();showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove()")
    c.call('Page.reload')
    c.wait("document.readyState==='complete' && !document.body.inert && typeof startAiTask==='function' && typeof generatePracticeReading==='function' && typeof readerAiDiagnostics==='function'", timeout=60)
    book = "# Travaux\n\n" + F.text_for(range(0, 6)) + "\n"
    c.js("openBookFile(new File([Uint8Array.from(atob(%s),ch=>ch.charCodeAt(0))],'travaux.md',{lastModified:%d}))" % (json.dumps(base64.b64encode(book.encode()).decode()), int(time.time())))
    c.wait("els.pages.textContent.includes('PRÉPARER')", timeout=30)
    time.sleep(0.6)
    c.js("state.targetLang='uk'; showToast=()=>{}")
    if args.stub:
        c.js(STUB_JS % (json.dumps(F.KNOWN, ensure_ascii=False), json.dumps(RUN, ensure_ascii=False), json.dumps(STUB_REPLY, ensure_ascii=False),
                        json.dumps({'verbs': PF.VERBS_FR, 'adjectives': PF.ADJECTIVES_FR}, ensure_ascii=False)))
    try:
        c.js("state.activeAiProvider=%s; state.apiKey=''; state.groqKey=''; state.openaiKey=''; state.%s=%s"
             % (json.dumps(provider), PROVIDERS[provider], json.dumps(KEY)))
    except Exception as e:   # never let the key leak through an exception message
        die('could not configure the provider: ' + scrub(str(e))[:200])
    c.js("localStorage.setItem('reader_ai_debug','1')")      # captures the full raw reply into the diagnostics (developer switch)

    def wanted(name):
        return not only or name.lower() in only

    def read_diag(n0):
        return c.js("readerAiDiagnostics().slice(%d)" % n0) or []

    def grammar(name, kind, text, sentence=None, mode='verbs'):
        if not wanted(name):
            return None
        c.js("grammarAnalysisCache.clear(); state.lastGrammarSentence=%s; grammarContext.mode='verbs'" % json.dumps(sentence or ''))
        n0 = c.js("readerAiDiagnostics().length")
        t0 = time.time()
        c.js("window.__done=false; window.__errs.length=0; startAiTask(%s,'grammar').then(()=>{__done=true},()=>{__done=true})" % json.dumps(text, ensure_ascii=False))
        finished = True
        try:
            c.wait("__done===true && !els.grammarContent.querySelector('.spinner-large')", timeout=args.timeout)
        except TimeoutError:
            finished = False
        time.sleep(0.3)
        snap = c.js("""(()=>{ const an = grammarContext.analysis; const err = els.grammarContent.querySelector('span[style*="red"]');
            const items = an ? an.items : [];
            return {errorBanner: err ? err.textContent : null, notes: [...els.grammarContent.querySelectorAll('.grammar-note')].map(n=>n.textContent),
                    verbs: items.filter(x=>x.pos==='verb').length, adjectives: items.filter(x=>x.pos==='adjective').length, partial: an ? !!an.partial : null,
                    lemmas: items.map(x=>x.pos[0]+':'+x.lemma), cards: els.grammarContent.querySelectorAll('.grammar-card').length,
                    controls: [...document.querySelectorAll('#grammar-controls-bar button')].map(b=>b.textContent), errors: window.__errs.slice() }})()""")
        diag = read_diag(n0)
        g = [d for d in diag if d.get('task') == 'grammar_analysis' and d.get('phase') == 'validation']
        last = g[-1] if g else {}
        entry = dict(scenario=name, kind=kind, chars=len(text), seconds=round(time.time() - t0, 1), finished=finished, provider=last.get('provider'), model=last.get('model'),
                     finish=last.get('finish'), sourceLanguage=last.get('sourceLanguage'), reason=last.get('reason'), attempts=len(g), retried=len(g) > 1,
                     recovered=bool(last.get('parseNotes')) or last.get('reason') in ('ok_recovered', 'partial'), parseNotes=last.get('parseNotes'), counts=last.get('counts'),
                     budget=last.get('budget'), usage=last.get('usage'), lite=(last.get('selection') or {}).get('lite'), **snap)
        entry['accepted'] = bool(finished and not snap['errorBanner'] and (snap['verbs'] + snap['adjectives']) > 0 and last.get('sourceLanguage') == 'fr')
        entry['frenchControlsOnly'] = all(x not in ('Present', 'Past', 'Future', 'Present perfect') for x in snap['controls'])
        entry['_captures'] = [d.get('capture') for d in g if d.get('capture')]
        entry['_rawHead'] = last.get('rawHead')
        results.append(entry)
        return entry

    grammar('A', 'one tapped word (unpunctuated PDF run as context)', 'effectuer', sentence=RUN)
    grammar('B', 'one sentence', F.PAGE_SENTENCES_1)
    grammar('C', 'several sentences (reported page)', F.SEVERAL_C)
    verbs_analysis = None
    grammar('D', 'paragraph (14 sentences)', F.PARAGRAPH_D)
    grammar('E', 'large page selection (70 sentences)', F.PAGE_E)

    if args.pdf and wanted('P'):
        pdf_flow(c, args, results, read_diag)

    # Adjectifs from the cached analysis: no request, no tense controls
    if wanted('adjectives-switch'):
        c.js("switchGrammarMode('adjectives')")
        info = c.js("({cards:[...document.querySelectorAll('#grammar-content .grammar-card-lemma')].map(b=>b.textContent), controls: document.querySelectorAll('#grammar-controls-bar button').length})")
        found_adjectives = any(r.get('adjectives') for r in results)
        results.append(dict(scenario='adjectives-switch', kind='Verbes -> Adjectifs from the cached analysis', cards=info['cards'], controls=info['controls'],
                            accepted=info['controls'] == 0 and (bool(info['cards']) or not found_adjectives)))
        c.js("switchGrammarMode('verbs')")

    # Practice, one live generation per mode, from the lemmas Grammar found
    for mode in ('verbs', 'adjectives'):
        name = 'practice-' + mode
        if not (wanted('practice') or wanted(name)):
            continue
        pos = 'verb' if mode == 'verbs' else 'adjective'
        # lemmas from the most recent analysis that has some; else a fixed French list
        lemmas = c.js("(grammarContext.analysis?.items||[]).filter(x=>x.pos===%s).map(x=>x.lemma)" % json.dumps(pos)) or (['effectuer', 'établir', 'mettre'] if mode == 'verbs' else ['visuel', 'olfactif'])
        lemmas = list(dict.fromkeys(lemmas))[:4]
        n0 = c.js("readerAiDiagnostics().length"); t0 = time.time()
        c.js("closePracticeSession()")
        c.js("window.__prac=null; window.__errs.length=0; generatePracticeReading({sourceText:'', sourceLanguage:'fr', targetLanguage:'uk', mode:%s, bookId:'probe', lemmas:%s}).then(s=>{__prac={ok:true,sections:s.reading.sections.length,items:s.reading.paragraphs.length,targets:s.reading.targets.length}},e=>{__prac={ok:false,reason:e.reason||null,message:String(e.message||e)}})"
             % (json.dumps(mode), json.dumps(lemmas, ensure_ascii=False)))
        finished = True
        try:
            c.wait("__prac!==null", timeout=args.timeout)
        except TimeoutError:
            finished = False
        out = c.js("window.__prac") or {}
        diag = [d for d in read_diag(n0) if d.get('task') == 'practice_reading' and d.get('phase') == 'validation']
        last = diag[-1] if diag else {}
        entry = dict(scenario=name, kind='Practice reading (%s) for lemmas %s' % (mode, lemmas), seconds=round(time.time() - t0, 1), finished=finished, provider=last.get('provider'), model=last.get('model'),
                     finish=last.get('finish'), reason=last.get('reason'), recovered=last.get('reason') in ('ok_recovered', 'partial'), parseNotes=last.get('parseNotes'), counts=last.get('counts'),
                     usage=last.get('usage'), result=out, errors=c.js("window.__errs.slice()"))
        entry['accepted'] = bool(finished and out.get('ok') and (out.get('targets') or 0) >= 3)
        entry['_captures'] = [d.get('capture') for d in diag if d.get('capture')]
        entry['_rawHead'] = last.get('rawHead')
        results.append(entry)

    live = (not args.stub) and any(r.get('provider') and r.get('finished') for r in results)      # a provider actually answered (or failed) for us
    return dict(liveAiTested=bool(live), stub=bool(args.stub), provider=provider, url=scrub(url), results=results,
                allAccepted=bool(results) and all(r.get('accepted') for r in results))


def pdf_flow(c, args, results, read_diag):
    """Scenario P: a real PDF, one word tapped through the real tooltip -> AI button, exactly as the reporter did."""
    n0 = c.js("readerAiDiagnostics().length"); t0 = time.time()
    c.js("grammarAnalysisCache.clear(); window.__errs.length=0")
    c.js("""(() => { const bytes = Uint8Array.from(atob(%s), ch=>ch.charCodeAt(0)); const file = new File([bytes], 'hvac.pdf', {type:'application/pdf'});
      const dt = new DataTransfer(); dt.items.add(file); const i=document.getElementById('file-upload'); i.files = dt.files; i.dispatchEvent(new Event('change')); })()""" % json.dumps(base64.b64encode(F.hvac_pdf()).decode()))
    c.wait("state.format==='pdf' && !!state.pdfDoc", timeout=40)
    c.wait("!!document.querySelector('.pdf-page-wrapper[data-page=\"1\"] .pdf-text-layer span')", timeout=40); time.sleep(1.5)
    if not c.js("state.translateMode"):
        c.js("els.translateBtn.click()"); time.sleep(0.4)
    c.js("showToast=()=>{}; state.targetLang='uk'")

    def mouse(x, y):
        for kind in ('mousePressed', 'mouseReleased'):
            c.call('Input.dispatchMouseEvent', type=kind, x=x, y=y, button='left', clickCount=1)
    pos = c.js("""(()=>{ const layer=document.querySelector('.pdf-page-wrapper[data-page="1"] .pdf-text-layer'); const walker=document.createTreeWalker(layer, NodeFilter.SHOW_TEXT); let n;
      while((n=walker.nextNode())){ const i=n.nodeValue.indexOf('effectuer'); if(i!==-1){ const r=document.createRange(); r.setStart(n,i); r.setEnd(n,i+9); const b=r.getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2}; } } return null })()""")
    if not pos:
        results.append(dict(scenario='P', kind='real PDF tap', accepted=False, error='the word "effectuer" was not found in the PDF text layer'))
        return
    mouse(pos['x'], pos['y'])
    c.wait("els.tooltip.style.display==='flex'", timeout=10)
    b = c.js("(()=>{const r=els.ttAiBtn.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}})()")
    mouse(b['x'], b['y'])
    finished = True
    try:
        c.wait("!!grammarContext.analysis || !!els.grammarContent.querySelector('span[style*=\"red\"]')", timeout=args.timeout)
    except TimeoutError:
        finished = False
    time.sleep(0.4)
    snap = c.js("""(()=>{ const an = grammarContext.analysis; const err = els.grammarContent.querySelector('span[style*="red"]'); const items = an ? an.items : [];
        return {errorBanner: err ? err.textContent : null, verbs: items.filter(x=>x.pos==='verb').length, adjectives: items.filter(x=>x.pos==='adjective').length, partial: an ? !!an.partial : null,
                focused: grammarContext.focused ? grammarContext.focused.surface : null, mode: grammarContext.mode, errors: window.__errs.slice() }})()""")
    g = [d for d in read_diag(n0) if d.get('task') == 'grammar_analysis' and d.get('phase') == 'validation']
    last = g[-1] if g else {}
    entry = dict(scenario='P', kind='one word tapped in a real PDF (tooltip -> AI)', seconds=round(time.time() - t0, 1), finished=finished, provider=last.get('provider'), model=last.get('model'),
                 finish=last.get('finish'), sourceLanguage=last.get('sourceLanguage'), reason=last.get('reason'), attempts=len(g), retried=len(g) > 1,
                 recovered=last.get('reason') in ('ok_recovered', 'partial'), parseNotes=last.get('parseNotes'), counts=last.get('counts'), budget=last.get('budget'),
                 chars=(last.get('selection') or {}).get('chars'), **snap)
    entry['accepted'] = bool(finished and not snap['errorBanner'] and (snap['verbs'] + snap['adjectives']) > 0 and last.get('sourceLanguage') == 'fr')
    entry['_captures'] = [d.get('capture') for d in g if d.get('capture')]
    entry['_rawHead'] = last.get('rawHead')
    results.append(entry)


def write_report(report, args):
    os.makedirs(args.out, exist_ok=True)
    slim = []
    for r in report['results']:
        r = dict(r)
        caps = r.pop('_captures', [])
        r.pop('_rawHead', None)
        slim.append(r)
        if not r.get('accepted') and caps:
            cap = caps[-1]
            replay = dict(task='practice_reading' if r['scenario'].startswith('practice') else 'grammar_analysis', provider=r.get('provider'), model=r.get('model'),
                          sourceLanguage=cap.get('sourceLanguage'), text=cap.get('text', ''), raw=cap.get('raw', ''), expect=dict(ok=True, minItems=1))
            if r['scenario'].startswith('practice'):
                replay['mode'] = cap.get('mode')
            path = os.path.join(args.out, 'fail-%s.json' % r['scenario'])
            with open(path, 'w', encoding='utf-8') as f:
                f.write(scrub(json.dumps(replay, ensure_ascii=False, indent=2)))
            r['replayFile'] = path
    out = dict(report, results=slim)
    with open(os.path.join(args.out, 'report.json'), 'w', encoding='utf-8') as f:
        f.write(scrub(json.dumps(out, ensure_ascii=False, indent=2)))
    print()
    print('=' * 100)
    print('LIVE AI TESTED: %s%s' % ('YES' if report['liveAiTested'] else 'NO', '  (stub provider: harness self-test only)' if report['stub'] else ''))
    print('provider requested: %s     target: %s' % (report['provider'], report['url']))
    print('-' * 100)
    for r in slim:
        print('%-18s %s' % (r['scenario'], 'ACCEPTED' if r.get('accepted') else 'FAILED'))
        print('    ' + scrub(r.get('kind', '')))
        if r.get('chars') is not None:
            print('    selection: %s chars; provider/model: %s / %s; finish: %s; %ss' % (r.get('chars'), r.get('provider'), r.get('model'), r.get('finish'), r.get('seconds')))
        else:
            print('    provider/model: %s / %s; finish: %s; %ss' % (r.get('provider'), r.get('model'), r.get('finish'), r.get('seconds')))
        if r['scenario'].startswith('practice'):
            print('    result: %s; reason: %s; recovered/normalised: %s; counts: %s' % (scrub(r.get('result')), r.get('reason'), r.get('recovered'), r.get('counts')))
        elif r['scenario'] != 'adjectives-switch':
            print('    source language: %s; verbs: %s; adjectives: %s; partial: %s; attempts: %s (retry: %s); recovered/normalised: %s %s' % (
                r.get('sourceLanguage'), r.get('verbs'), r.get('adjectives'), r.get('partial'), r.get('attempts'), r.get('retried'), r.get('recovered'), scrub(r.get('parseNotes') or '')))
            if r.get('errorBanner'):
                print('    ERROR SHOWN TO LEARNER: %s   (reason: %s)' % (scrub(r['errorBanner']), r.get('reason')))
            if r.get('controls') is not None and r['scenario'] in 'ABCDE':
                print('    tense chips: %s' % scrub(r.get('controls')))
        else:
            print('    adjective cards: %s; tense controls: %s' % (scrub(r.get('cards')), r.get('controls')))
        if r.get('errors'):
            print('    console/application errors: %s' % scrub(r['errors']))
        if r.get('replayFile'):
            print('    replay capture written: %s' % r['replayFile'])
    print('-' * 100)
    print('report: %s' % os.path.join(args.out, 'report.json'))
    print('ALL SCENARIOS ACCEPTED: %s' % report['allAccepted'])


if __name__ == '__main__':
    main()
