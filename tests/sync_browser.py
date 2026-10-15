"""Sync between devices by a code (js/sync.js + functions/api/sync.js). Two «devices» are two localStorage snapshots of the same
page; /api/sync is a fake in-page server with the same rules as the Pages Function (auth per id, version check → 409).
Device A creates a code: its reading place, highlights and theme are uploaded ENCRYPTED; device B enters the code: the theme is
applied, the place waits for the book and is restored when the same book (other lastModified) is opened; a newer place on B
wins on A; a wrong code / no storage on the site / a write race are handled. No network."""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=800, deviceScaleFactor=1, mobile=False)
READY = "document.readyState==='complete' && !document.body.inert && typeof runSync==='function'"


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.2); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


c.call('Page.navigate', url=URL); c.wait(READY, timeout=30)
c.js("localStorage.clear(); localStorage.setItem('reader_onboarding_done','1'); 1"); c.call('Page.reload'); c.wait(READY, timeout=30); time.sleep(0.4)
c.js("""(() => { window.__kv = new Map(); window.__syncReqs = []; window.__mode = 'ok'; window.__raceOnce = false; const real = window.fetch.bind(window);
  window.fetch = async (url, opts = {}) => { url = String(url); if (!url.startsWith('/api/sync')) return real(url, opts);
    const method = opts.method || 'GET', id = new URL(url, location.href).searchParams.get('id'), auth = opts.headers['x-sync-auth'];
    __syncReqs.push(method); const res = (b, s = 200) => new Response(JSON.stringify(b), {status: s});
    if (__mode === 'off') return res({error: 'not_configured'}, 501);
    const cur = __kv.get(id); if (cur && cur.auth !== auth) return res({error: 'forbidden'}, 403);
    if (method === 'GET') return cur ? res({blob: cur.blob, at: cur.at}) : res({error: 'not_found'}, 404);
    const body = JSON.parse(opts.body);
    if (__raceOnce) { __raceOnce = false; __kv.set(id, {auth, blob: cur ? cur.blob : body.blob, at: (cur ? cur.at : 0) + 7}); }
    const now = __kv.get(id); if ((now ? now.at : null) !== body.base) return res({error: 'conflict'}, 409);
    const at = Math.max(Date.now(), (now ? now.at : 0) + 1); __kv.set(id, {auth, blob: body.blob, at}); return res({at}); };
  window.__snap = () => JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
  window.__restore = (s) => { localStorage.clear(); for (const [k, v] of Object.entries(JSON.parse(s))) localStorage.setItem(k, v); };
  return 1; })()""")
BOOK = "# Livre\n\n" + "\n\n".join(f"Paragraphe {i}. " + "mot " * 120 for i in range(40))
OPEN = "(async (lm) => { await openBookFile(new File([%s], 'sync.md', {lastModified: lm})); await new Promise(r => setTimeout(r, 900)); return 1; })" % json.dumps(BOOK)

check('1 the settings window has a sync section: create a code, or enter one', "!!document.getElementById('sync-box') && !document.getElementById('sync-create').closest('[hidden]') && document.getElementById('sync-code-input').placeholder === t('syncEnterPlaceholder')")
# ---- device A ----
c.js("%s(111)" % OPEN); time.sleep(1.2)
c.js("goToPageInChapter(3, false); saveBookmark(); localStorage.setItem('reader_marks_v1:' + state.bookKey, JSON.stringify([{id: 'm1', chapter: 0, start: 5, end: 20, text: 'x', note: 'нотатка A', at: 1}])); localStorage.setItem('reader_theme', 'dark'); 1")
c.js("window.__keyA = state.bookKey; document.getElementById('sync-create').click(); 1")
check('2 «Create a code» makes a 32-character code and uploads', "/^([A-HJ-NP-Z2-9]{4}-){7}[A-HJ-NP-Z2-9]{4}$/.test(document.getElementById('sync-code').textContent) && __kv.size === 1 && document.getElementById('sync-status').textContent.startsWith(t('syncDone').split('{')[0])", timeout=8)
check('3 the server gets only ciphertext: no book name, note or setting readable', "(b => !/sync\\.md|нотатка|dark/.test(atob(b)) && b.length > 100)([...__kv.values()][0].blob)")
c.js("window.__code = document.getElementById('sync-code').textContent; window.__devA = __snap(); 1")

# ---- device B ----
c.js("localStorage.clear(); localStorage.setItem('reader_onboarding_done','1'); document.body.setAttribute('data-theme', 'light'); renderSyncBox(); 1")
c.js("document.getElementById('sync-code-input').value = __code.toLowerCase(); document.getElementById('sync-join').click(); 1")
check('4 entering the code on another device (any case, with dashes) downloads: the theme applies at once', "document.body.getAttribute('data-theme') === 'dark' && localStorage.getItem('reader_sync_code') !== null", timeout=8)
check('5 the book was never opened here: its place and highlights wait for it', "(p => Object.keys(p).some(k => k.startsWith('bm|sync.md|')) && Object.keys(p).some(k => k.startsWith('mk|sync.md|')))(JSON.parse(localStorage.getItem('reader_sync_pending') || '{}'))")
c.js("%s(222)" % OPEN); time.sleep(1.2)
check('6 opening the same book here (different file date) restores the place from device A', "state.bookKey !== __keyA && state.pageInChapter === 3", timeout=5)
check('7 …and its highlights/notes', "JSON.parse(localStorage.getItem('reader_marks_v1:' + state.bookKey))[0].note === 'нотатка A' && !Object.keys(JSON.parse(localStorage.getItem('reader_sync_pending'))).length")
c.js("goToPageInChapter(1, false); saveBookmark(); 1"); time.sleep(0.05)
c.js("window.__syncReqs.length = 0; runSync(); 1")
check('8 a newer place on B is uploaded', "__syncReqs.includes('PUT')", timeout=6)
c.js("window.__devB = __snap(); __restore(__devA); 1")
c.js("runSync(); 1"); time.sleep(1.5)
check('9 back on A the newer place from B wins (the older one is replaced)', "JSON.parse(localStorage.getItem(__keyA)).pageInChapter === 1")
check('10 nothing changed → a sync only reads (no write)', "(async () => { __syncReqs.length = 0; await runSync(); return __syncReqs.join() === 'GET'; })()")

c.js("localStorage.setItem('reader_theme', 'sepia'); window.__raceOnce = true; 1")
check('11 another device writing at the same moment (409) → merged again and written, nothing lost', "(async () => { __syncReqs.length = 0; await runSync(); return __syncReqs.filter(m => m === 'PUT').length === 2; })()")

c.js("document.getElementById('sync-stop').click(); 1")
check('12 «Turn off on this device» forgets the code; the create/enter view is back', "localStorage.getItem('reader_sync_code') === null && !document.querySelector('#sync-box .sync-off').hidden")
c.js("document.getElementById('sync-code-input').value = 'ABCD-EFGH-JKLM-NPQR-STUV-WXYZ-2345-6789'; document.getElementById('sync-join').click(); 1")
check('13 a code nobody saved yet: the reader is told, the code is not kept', "document.getElementById('sync-status').textContent === t('syncNotFound') && localStorage.getItem('reader_sync_code') === null", timeout=6)
c.js("document.getElementById('sync-code-input').value = 'abc'; document.getElementById('sync-join').click(); 1")
check('14 a malformed code is refused before any request', "document.getElementById('sync-status').textContent === t('syncBadCode')")
c.js("window.__mode = 'off'; document.getElementById('sync-create').click(); 1")
check('15 no storage on the site (501): a clear message, and the new code is not kept', "document.getElementById('sync-status').textContent === t('syncNotConfigured') && localStorage.getItem('reader_sync_code') === null", timeout=6)
print('ALL PASS')
