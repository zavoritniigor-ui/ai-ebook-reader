"""Save to Google Drive (library book and PDF crop) against a LOCAL fake of Google: no account, no network.
Checks: the shipped build (empty client id) shows no Drive button and the page never asks Google for anything; a configured
build uploads exactly the bytes «⬇ Зберегти» would save — a small file in one request, a big one as a resumable session —
into one folder that is created once, with one sign-in; an expired session (401) and a blocked or refused sign-in each say
so and upload nothing. Google Identity Services is stubbed in the page (no account here); the production policy that lets
the real script and the Drive API through is checked statically."""
import base64, functools, http.server, json, os, socketserver, threading, time
from urllib.parse import parse_qs, urlparse
from browser_cdp import CDP

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSP = next(line.split(':', 1)[1].strip() for line in open(os.path.join(ROOT, '_headers')) if line.strip().startswith('Content-Security-Policy'))
DIRECTIVES = {d.split()[0]: d.split()[1:] for d in (part.strip() for part in CSP.split(';')) if d}
assert "'unsafe-inline'" not in DIRECTIVES['script-src'] and 'https://accounts.google.com' in DIRECTIVES['script-src']
assert {'https://accounts.google.com', 'https://www.googleapis.com'} <= set(DIRECTIVES['connect-src'])
assert 'https://accounts.google.com' in DIRECTIVES['frame-src']
print('PASS 0 the production policy lets Google sign-in and the Drive API through, and still no inline script', flush=True)

SMALL = b'PK' + b'a small book, one request ' * 2000          # about 50 KB: multipart
BIG = b'PK' + os.urandom(6 * 1024 * 1024)                      # over 5 MB: resumable
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
DRIVE = {'folders': [], 'folder_gets': 0, 'folder_posts': 0, 'uploads': [], 'sessions': {}, 'auth': [], 'fail_next': 0}


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

    def _body(self):
        return self.rfile.read(int(self.headers.get('Content-Length') or 0))

    def _send(self, data, status=200, ctype='application/json', headers=None):
        self.send_response(status)
        for k, v in (headers or {}).items(): self.send_header(k, v)
        self.send_header('Content-Type', ctype); self.send_header('Content-Length', str(len(data))); self.end_headers()
        self.wfile.write(data)

    def _authorized(self):
        DRIVE['auth'].append(self.headers.get('Authorization'))
        if DRIVE['fail_next'] > 0:
            DRIVE['fail_next'] -= 1
            self._send(b'{"error": {"code": 401}}', 401)
            return False
        return True

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == '/api/library':   # «⬇ Зберегти» and the Drive button fetch the same book file
            query = parse_qs(url.query)
            if query.get('op') != ['file']: return self.send_error(404)
            self._send(BIG if query['id'] == ['999999'] else SMALL, ctype='application/epub+zip')
        elif url.path.startswith('/drive/v3/files'):
            if not self._authorized(): return
            DRIVE['folder_gets'] += 1
            self._send(json.dumps({'files': [{'id': f['id']} for f in DRIVE['folders']]}).encode())
        elif url.path == '/js/google-drive.js' and self.server.configured:
            # The shipped client id is empty and the Drive API is Google's: point this build at the fake.
            src = open(os.path.join(ROOT, 'js', 'google-drive.js'), encoding='utf-8').read()
            for old, new in [("const GOOGLE_DRIVE_CLIENT_ID = '';", "const GOOGLE_DRIVE_CLIENT_ID = 'test-app.apps.googleusercontent.com';"),
                             ("const GDRIVE_API = 'https://www.googleapis.com';", "const GDRIVE_API = 'http://127.0.0.1:%d';" % self.server.server_address[1])]:
                assert src.count(old) == 1, old
                src = src.replace(old, new)
            self._send(src.encode(), ctype='text/javascript; charset=utf-8')
        else:
            super().do_GET()

    def do_POST(self):
        url, body = urlparse(self.path), self._body()
        if url.path == '/upload/drive/v3/files':
            if not self._authorized(): return
            if parse_qs(url.query).get('uploadType') == ['multipart']:
                meta = json.loads(body.split(b'\r\n\r\n', 1)[1].split(b'\r\n--', 1)[0])
                DRIVE['uploads'].append({'kind': 'multipart', 'meta': meta, 'body': body, 'ctype': self.headers.get('Content-Type')})
                return self._send(json.dumps({'id': 'file-%d' % len(DRIVE['uploads']), 'name': meta['name']}).encode())
            meta = json.loads(body)
            sid = 'session-%d' % (len(DRIVE['sessions']) + 1)
            DRIVE['sessions'][sid] = {'meta': meta, 'length': int(self.headers['X-Upload-Content-Length']), 'type': self.headers['X-Upload-Content-Type']}
            location = 'http://127.0.0.1:%d/upload/session/%s' % (self.server.server_address[1], sid)
            return self._send(b'', headers={'Location': location}, ctype='text/plain')
        if url.path == '/drive/v3/files':
            if not self._authorized(): return
            meta = json.loads(body)
            DRIVE['folders'].append({'id': 'folder-%d' % (len(DRIVE['folders']) + 1), 'name': meta['name']})
            DRIVE['folder_posts'] += 1
            return self._send(json.dumps({'id': DRIVE['folders'][-1]['id']}).encode())
        self.send_error(404)

    def do_PUT(self):
        url, body = urlparse(self.path), self._body()
        session = DRIVE['sessions'].get(url.path.rsplit('/', 1)[-1]) if url.path.startswith('/upload/session/') else None
        if session is None: return self.send_error(404)
        DRIVE['uploads'].append({'kind': 'resumable', 'meta': session['meta'], 'body': body, 'length': session['length'], 'type': session['type']})
        self._send(json.dumps({'id': 'file-%d' % len(DRIVE['uploads']), 'name': session['meta']['name']}).encode())


def serve(configured):
    server = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Handler, directory=ROOT))
    server.daemon_threads = True
    server.configured = configured
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, 'http://127.0.0.1:%d/index.html' % server.server_address[1]


# Google Identity Services stand-in: records every token request and answers with the mode the test sets.
STUB = """
window.__gis = []; window.__gisPrompts = []; window.__gisMode = 'ok';
window.google = { accounts: { oauth2: { initTokenClient(cfg) {
    window.__gis.push(cfg);
    return { requestAccessToken(o) {
        window.__gisPrompts.push(o && o.prompt);
        setTimeout(() => {
            const m = window.__gisMode;
            if (m === 'ok') cfg.callback({ access_token: 'fake-token', expires_in: 3600 });
            else if (m === 'access_denied') cfg.callback({ error: 'access_denied' });
            else cfg.error_callback({ type: m });
        }, 20);
    } };
} } } };
"""
c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1180, height=820, deviceScaleFactor=1, mobile=False)
c.call('Page.addScriptToEvaluateOnNewDocument', source=STUB)
READY = "document.readyState==='complete' && !document.body.inert && typeof openBookFile==='function'"


def open_app(url):
    c.call('Page.navigate', url=url); c.wait(READY, timeout=30)
    c.js("localStorage.clear(); localStorage.setItem('reader_onboarding_done','1'); 1"); c.call('Page.reload'); c.wait(READY, timeout=30); time.sleep(0.5)


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.2); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def poll(predicate, timeout=30):
    deadline = time.time() + timeout
    while not predicate() and time.time() < deadline:
        time.sleep(0.2)
    return predicate()


# 1-3. the shipped build: no client id, so no Drive button, and the page never asks Google for anything
plain, plain_url = serve(configured=False)
open_app(plain_url)
check('1 the shipped build has no Drive client id, so Google Drive is not offered', "driveConfigured() === false", timeout=10)
c.js("openLibrary(); 1")
c.wait("document.querySelectorAll('.library-card').length > 0", timeout=30)
check('2 library cards show no Drive button, and Google was never asked for a token',
      "document.querySelector('.library-drive') === null && __gis.length === 0 && __gisPrompts.length === 0")
c.js("closeLibrary(); openCropPreview('data:image/png;base64,%s'); 1" % base64.b64encode(PNG).decode())
check('3 the crop dialog hides its Google Drive button', "getComputedStyle(document.getElementById('crop-drive')).display === 'none'")
c.js("closeCropPreview(); 1")
plain.shutdown()

# 4-8. a configured build against the fake Google
drive_srv, drive_url = serve(configured=True)
open_app(drive_url)
check('4 with a client id the page is ready, and nothing has asked Google yet',
      "driveConfigured() === true && __gis.length === 0 && __gisPrompts.length === 0", timeout=10)
c.js("openLibrary(); 1")
c.wait("document.querySelectorAll('.library-drive').length > 0", timeout=30)
expected_name = c.js("libraryFileName({title: document.querySelector('.library-card .library-name').textContent})")
c.js("document.querySelector('.library-drive').click(); 1")
assert poll(lambda: len(DRIVE['uploads']) == 1), 'the small book never reached the fake Drive'
first = DRIVE['uploads'][0]
assert first['kind'] == 'multipart' and first['ctype'].startswith('multipart/related; boundary='), first['ctype']
assert first['meta']['name'] == expected_name, (first['meta']['name'], expected_name)
assert first['meta']['parents'] == [DRIVE['folders'][0]['id']]
assert SMALL in first['body'], 'the uploaded bytes differ from the library file'
print('PASS 5 a small book goes up in ONE request: the library file\'s bytes and name, inside the app folder', flush=True)
assert len(DRIVE['folders']) == 1 and DRIVE['folders'][0]['name'] == 'AI Ebook Reader'
assert DRIVE['folder_gets'] == 1 and DRIVE['folder_posts'] == 1
assert DRIVE['auth'] and set(DRIVE['auth']) == {'Bearer fake-token'}, DRIVE['auth']
check('6 one folder created once, one sign-in, every call sent the token, the status names the file, the button is usable',
      "__gis.length === 1 && __gisPrompts.length === 1 && document.getElementById('library-status').textContent.includes(%s) "
      "&& !document.querySelector('.library-drive').disabled" % json.dumps(expected_name), timeout=10)

# the PDF crop: Save PNG's file goes to the same folder, with the token already at hand
c.js("openCropPreview('data:image/png;base64,%s'); 1" % base64.b64encode(PNG).decode())
check('7a the crop dialog shows Google Drive when a client id is set', "getComputedStyle(document.getElementById('crop-drive')).display !== 'none'")
crop_name = c.js("cropFile().name")
c.js("document.getElementById('crop-drive').click(); 1")
assert poll(lambda: len(DRIVE['uploads']) == 2), 'the crop never reached the fake Drive'
assert DRIVE['uploads'][1]['meta']['name'] == crop_name and DRIVE['uploads'][1]['body'].count(PNG) == 1
assert DRIVE['folder_posts'] == 1 and DRIVE['folder_gets'] == 1
check('7 the crop went to the same folder with no second sign-in or folder lookup',
      "__gisPrompts.length === 1 && document.getElementById('crop-status').textContent.includes(%s)" % json.dumps(crop_name), timeout=10)
c.js("closeCropPreview(); 1")

# 8. a big book (over 5 MB) goes up as a resumable session and arrives byte for byte
c.js("saveLibraryBookToDrive({id: 999999, title: 'Big book'}, document.createElement('button')); 1")
assert poll(lambda: len(DRIVE['uploads']) == 3, timeout=60), 'the big book never reached the fake Drive'
big = DRIVE['uploads'][2]
assert big['kind'] == 'resumable' and big['body'] == BIG, (big['kind'], len(big['body']))
assert big['length'] == len(BIG) and big['type'] == 'application/epub+zip' and big['meta']['name'] == 'Big book.epub'
assert big['meta']['parents'] == [DRIVE['folders'][0]['id']]
print('PASS 8 a book over 5 MB: resumable session, the same bytes, the same folder', flush=True)

# 9-10. an expired Google session says so once, drops the token, and the next press asks for a new one
DRIVE['fail_next'] = 1
c.js("document.querySelector('.library-drive').click(); 1")
check('9 an expired session is reported and the stored token is dropped',
      "document.getElementById('library-status').textContent === t('driveAuth') && gdriveToken === null", timeout=30)
assert len(DRIVE['uploads']) == 3, 'an expired session must not upload anything'
c.js("document.querySelector('.library-drive').click(); 1")
assert poll(lambda: len(DRIVE['uploads']) == 4), 'the second press did not upload'
check('10 the next press signs in again and the book is saved', "__gisPrompts.length === 2 && !document.querySelector('.library-drive').disabled", timeout=10)

# 11-12. a blocked popup and a refused sign-in each say what happened, and upload nothing
c.js("gdriveToken = null; __gisMode = 'popup_failed_to_open'; document.querySelector('.library-drive').click(); 1")
check('11 a blocked sign-in window is reported', "document.getElementById('library-status').textContent === t('driveBlocked')", timeout=30)
c.js("gdriveToken = null; __gisMode = 'access_denied'; document.querySelector('.library-drive').click(); 1")
check('12 a refused sign-in is reported as cancelled', "document.getElementById('library-status').textContent === t('driveCancelled')", timeout=30)
c.js("__gisMode = 'ok'; 1")
assert len(DRIVE['uploads']) == 4, 'a refused or blocked sign-in must not upload anything'
print('ALL PASS')
drive_srv.shutdown()
