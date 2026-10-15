"""Finished translations survive a restart (IndexedDB «reader-translations», js/translation.js): the same word in the same
sentence after a reload is answered from the device without a new request; another sentence is a new request; a machine
translation is reused only while AI is unavailable (one AI failure must not pin the weaker answer); resetting the in-memory
cache (a key change) stops using the stored ones for the session; the store is capped (oldest go first). Mocked; no network."""
import os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=800, deviceScaleFactor=1, mobile=False)
READY = "document.readyState==='complete' && !document.body.inert && typeof handleWordOrSelection==='function'"


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.2); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def start(ai=True, answer='кіт'):
    """Fresh page with mocked translators; AI answers `answer`, the machine translator 'MT-' + text."""
    c.call('Page.reload'); c.wait(READY, timeout=30); time.sleep(0.3)
    c.js("""(() => { Object.defineProperty(navigator, 'onLine', {configurable: true, get: () => true}); window.__ai = []; window.__mt = []; aiAvailable = () => %s; translationProviders = () => ['groq']; translateLocally = async () => null;
      aiTranslateText = async (text, src, sig, tl, ctx) => { if (!aiAvailable()) return null; __ai.push(text); return {translation: %r, alignment: []}; };
      machineTranslate = async (text) => { __mt.push(text); return {html: 'MT-' + text, plain: 'MT-' + text, extras: ''}; };
      state.targetLang = 'uk'; return 1; })()""" % ('true' if ai else 'false', answer))


def tap(word, sentence):
    c.js("state.ctxSentence = %r; handleWordOrSelection(%r, 200, 200); 1" % (sentence, word))


c.call('Page.navigate', url=URL); c.wait(READY, timeout=30)
c.js("localStorage.clear(); localStorage.setItem('reader_onboarding_done','1'); 1")
start()
tap('chat', 'Le chat dort.')
check('1 first tap asks the AI once and shows its answer', "els.ttTranslation.textContent.includes('кіт') && __ai.length === 1", timeout=5)
time.sleep(0.6)
start(answer='ІНШЕ')
tap('chat', 'Le chat dort.')
check('2 after a restart the same word in the same sentence comes from the device: no request, the earlier answer', "els.ttTranslation.textContent.includes('кіт') && __ai.length === 0", timeout=5)
tap('chat', 'Mon chat mange.')
check('3 the same word in ANOTHER sentence is a new request', "els.ttTranslation.textContent.includes('ІНШЕ') && __ai.length === 1", timeout=5)

start(ai=False)
tap('chien', 'Le chien court.')
check('4 without AI the machine translation is shown (and kept)', "els.ttTranslation.textContent.includes('MT-chien') && __mt.length === 1", timeout=5)
time.sleep(0.6)
start(ai=False)
tap('chien', 'Le chien court.')
check('5 still without AI: the kept machine translation answers, no request', "els.ttTranslation.textContent.includes('MT-chien') && __mt.length === 0", timeout=5)
start(ai=True, answer='пес')
tap('chien', 'Le chien court.')
check('6 with AI available the kept machine translation is NOT reused: the AI is asked', "els.ttTranslation.textContent.includes('пес') && __ai.length === 1", timeout=5)
time.sleep(0.6)

start(answer='ЗНОВУ')
c.js("state.translationCache = {}; 1")   # what a key change does (cancelAIRequests)
tap('chat', 'Le chat dort.')
check('7 after the in-memory cache is reset (key change) the stored answers are not used this session', "els.ttTranslation.textContent.includes('ЗНОВУ') && __ai.length === 1", timeout=5)

start()
check('8 the store is capped: over the limit the OLDEST entries are removed', """(async () => {
  const db = await trDb();
  await new Promise(res => { const tx = db.transaction(TR_STORE, 'readwrite'); const st = tx.objectStore(TR_STORE);
    for (let i = 0; i < TR_STORE_MAX + 20; i++) st.put({k: 'fill' + i, v: 'x', q: 'ai', at: i}); tx.oncomplete = res; });
  pruneStoredTranslations(db); await new Promise(r => setTimeout(r, 1500));
  const left = await new Promise(res => { const r = db.transaction(TR_STORE).objectStore(TR_STORE).count(); r.onsuccess = () => res(r.result); });
  const oldest = await new Promise(res => { const r = db.transaction(TR_STORE).objectStore(TR_STORE).get('fill0'); r.onsuccess = () => res(r.result); });
  const newest = await new Promise(res => { const r = db.transaction(TR_STORE).objectStore(TR_STORE).get('fill' + (TR_STORE_MAX + 19)); r.onsuccess = () => res(r.result); });
  return left === TR_STORE_MAX && !oldest && !!newest || JSON.stringify({left, oldest: !!oldest, newest: !!newest}); })()""")
print('ALL PASS')
