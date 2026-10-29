"""The REAL offline French -> Ukrainian dictionary (dict/fr-uk.json, dict/uk-forms.json, read by js/offline-dict.js) on 100 unusual
sentences written for this project (dict/test_sentences_hard.tsv): rare tenses and moods, homographs, elision and hyphens, inversion,
set expressions in other tenses, with negation and other possessives, traps (the words of an expression meant literally), invented
words, capitals, numbers, symbols, the spoken language, long sentences. No model is needed: for each sentence it checks what the
dictionary itself decides — the lemma the tapped word is read as in its context (an invented word: none), and the set expression the
word is found in (or that it is found in none). The real engine on the same sentences: tests/offline_dict_real_browser.py."""
import http.server, json, socketserver, threading
from pathlib import Path
from browser_cdp import CDP

ROOT = Path(__file__).resolve().parents[1]
ROWS = [l.split('\t') for l in (ROOT / 'dict/test_sentences_hard.tsv').read_text(encoding='utf-8').splitlines() if l.strip() and not l.startswith('#')]
CSP = next(l.split(':', 1)[1].strip() for l in (ROOT / '_headers').read_text().splitlines() if l.strip().startswith('Content-Security-Policy:'))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def end_headers(self):
        self.send_header('Content-Security-Policy', CSP)
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *args):
        pass


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True


server = Server(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{server.server_address[1]}'
c = CDP(); c.sock.settimeout(120)
c.call('Page.enable'); c.call('Runtime.enable')
c.call('Page.addScriptToEvaluateOnNewDocument', source='''
window.__errors = []; addEventListener('error', e => __errors.push(String(e.message)));
window.__csp = []; document.addEventListener('securitypolicyviolation', e => __csp.push(e.violatedDirective + ' ' + e.blockedURI));
''')
js = c.js
READY = "document.readyState==='complete' && typeof offlineDictParse==='function'"

# What the dictionary decides for one row: the lemmas the word can be here, and the expression around it.
READ = '''(([sentence, word, nth]) => {
    const d = window.__dict, tokens = offlineDictTokens(sentence, d), key = offlineDictNorm(word);
    const at = tokens.map((t, i) => t.norm === key ? i : -1).filter(i => i >= 0)[nth - 1];
    if (at === undefined) return { error: 'the word is not a token: ' + tokens.map(t => t.norm).join('|') };
    const here = offlineDictEntriesHere(d, tokens, at).entries, all = offlineDictLookup(d, tokens[at].text);
    const hit = offlineDictFindExpressions(d, tokens).find(h => at >= h.from && at <= h.to);
    return { here: here.map(e => e.lemma + ':' + e.pos), all: all.map(e => e.lemma + ':' + e.pos), expr: hit ? hit.expr.fr : '-' };
})'''

try:
    c.call('Page.navigate', url=BASE + '/index.html')
    c.wait(READY, timeout=60)
    js("""Promise.all(['dict/fr-uk.json', 'dict/uk-forms.json'].map(p => fetch(p).then(r => r.json())))
          .then(([data, forms]) => { window.__dict = offlineDictParse(data, forms); return !!window.__dict; })""")
    assert len(ROWS) == 100, len(ROWS)
    failed = []
    for sentence, word, lemma, expr in ROWS:
        name, _, nth = word.partition('#')
        r = js(READ + '(' + json.dumps([sentence, name, int(nth or 1)], ensure_ascii=False) + ')')
        problems = []
        if r.get('error'): problems.append(r['error'])
        elif lemma == '-':
            if r['all']: problems.append(f"an invented word, read as {r['all']}")
        elif lemma not in (r['here'] or r['all']): problems.append(f"read as {r['here'] or r['all']}, not {lemma}")
        elif r['here'] and len(set(e.split(':')[1] for e in r['here'])) == 1 and r['here'][0] != lemma and lemma.split(':')[1] != r['here'][0].split(':')[1]:
            problems.append(f"the context gives {r['here']}")
        if not r.get('error') and r['expr'] != expr: problems.append(f"expression {r['expr']!r}, not {expr!r}")
        print(('PASS ' if not problems else 'FAIL ') + f'{word} in «{sentence}»' + (': ' + '; '.join(problems) if problems else ''), flush=True)
        if problems: failed.append((sentence, word, problems))
    assert not failed, f'{len(failed)} of {len(ROWS)} sentences: {failed}'
    print(f'PASS all {len(ROWS)} unusual sentences: the lemma in context and the set expression (or none)', flush=True)
    assert js("__errors.length === 0 && __csp.length === 0") is True, js("JSON.stringify({csp: __csp, errors: __errors})")
    print('PASS no CSP violation, nothing threw', flush=True)
    print('ALL PASS offline_dict_hard_browser', flush=True)
finally:
    server.shutdown()
