"""Minimal CDP client and synthetic PDF fixture for isolated browser tests."""
import base64, json, os, socket, struct, time, urllib.request

class CDP:
    def __init__(self, ws_url=None):
        from urllib.parse import urlparse
        if not ws_url:
            tabs = json.load(urllib.request.urlopen('http://127.0.0.1:' + os.environ.get('READER_CDP_PORT', '9222') + '/json'))
            ws_url = next(t['webSocketDebuggerUrl'] for t in tabs if t['type'] == 'page')
        self.ws_url = ws_url
        u = urlparse(ws_url)
        self.sock = socket.create_connection((u.hostname, u.port)); self.seq = 0
        key = base64.b64encode(os.urandom(16)).decode()
        self.sock.sendall(f'GET {u.path} HTTP/1.1\r\nHost: {u.netloc}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n'.encode())
        h = b''
        while not h.endswith(b'\r\n\r\n'): h += self.read(1)
        assert b'101 ' in h, h
        self.call('Inspector.enable')  # delivers Inspector.targetCrashed instead of a silent stall
        if os.environ.get('READER_CDP_DEBUG_STACK') == '1':
            self.call('Debugger.enable'); self.debugger_enabled = True
    def read(self, n):
        data = b''
        while len(data) < n:
            chunk = self.sock.recv(n-len(data))
            if not chunk: raise ConnectionError('CDP socket closed while reading a frame')
            data += chunk
        return data
    def _send_frame(self, payload, opcode=0x1):
        n = len(payload)
        header = bytes([0x80 | opcode, 0x80 | n]) if n < 126 else bytes([0x80 | opcode, 0xfe])+struct.pack('!H',n) if n < 65536 else bytes([0x80 | opcode, 0xff])+struct.pack('!Q',n)
        mask = os.urandom(4)
        self.sock.sendall(header+mask+bytes(c^mask[i%4] for i,c in enumerate(payload)))
    def _read_message(self):
        # A single logical WebSocket message may arrive as several frames (the
        # server fragments large payloads — Network.* events under heavy traffic
        # routinely do this in CI, even when they never do locally), and ping/pong
        # control frames can be interleaved between them. A reader that assumes
        # "one frame == one message" misparses a continuation frame's payload as a
        # brand-new header, desyncing the stream and eventually treating garbage
        # bytes as a frame length (observed in CI as a MemoryError from a huge
        # bogus length). Reassemble by FIN bit instead, and swallow control frames.
        payload = b''
        while True:
            b0, b1 = self.read(2)
            fin, opcode, n = b0 & 0x80, b0 & 0x0f, b1 & 0x7f
            if n == 126: n = struct.unpack('!H', self.read(2))[0]
            elif n == 127: n = struct.unpack('!Q', self.read(8))[0]
            chunk = self.read(n)
            if opcode == 0x8: raise ConnectionError('CDP WebSocket closed: ' + repr(chunk))
            if opcode == 0x9: self._send_frame(chunk, opcode=0xA); continue  # ping -> pong
            if opcode == 0xA: continue                                       # pong, ignore
            payload += chunk
            if fin: return payload
    # A renderer that crashes, opens a blocking JS dialog, or wedges on a GPU/IPC
    # call never answers a pending Runtime.evaluate. Without a bound the suite then
    # sits until GitHub's 6-hour job limit and reports nothing useful; fail fast and
    # say what the page was last doing instead.
    RESPONSE_TIMEOUT = float(os.environ.get('READER_CDP_TIMEOUT', '180'))
    FATAL_EVENTS = ('Inspector.targetCrashed', 'Inspector.detached', 'Page.javascriptDialogOpening')
    def _note_event(self, data):
        if data.get('method', '').startswith('Debugger.script'): return
        recent = self.__dict__.setdefault('recent_events', [])
        method = data.get('method')
        params = data.get('params', {})
        if method == 'Runtime.consoleAPICalled':
            method += ' ' + ' '.join(str(a.get('value', a.get('description', '')))[:160] for a in params.get('args', []))
        elif method == 'Runtime.exceptionThrown':
            method += ' ' + str(params.get('exceptionDetails', {}).get('exception', {}).get('description', ''))[:300]
        recent.append(method); del recent[:-25]
        if data.get('method') in self.FATAL_EVENTS:
            raise ConnectionError(f'CDP {data["method"]}: {json.dumps(params)[:300]}')
    def _stuck_stack(self):
        """Report where an unresponsive page's JS is spinning. Only possible when the Debugger domain was
        enabled BEFORE the stall (READER_CDP_DEBUG_STACK=1): a late Debugger.enable itself needs the stuck
        main thread, whereas Debugger.pause on an already-enabled session interrupts running JS."""
        if not self.__dict__.get('debugger_enabled'): return 'unavailable (set READER_CDP_DEBUG_STACK=1)'
        try:
            self.sock.settimeout(20)
            self.seq += 1; self._send_frame(json.dumps(dict(id=self.seq, method='Debugger.pause', params={})).encode())
            deadline = time.monotonic() + 20
            while time.monotonic() < deadline:
                data = json.loads(self._read_message())
                if data.get('method') == 'Debugger.paused':
                    frames = data['params'].get('callFrames', [])
                    return [f"{f.get('functionName') or '<anon>'}@{f.get('url', '').rsplit('/', 1)[-1]}:{f['location']['lineNumber'] + 1}" for f in frames[:12]]
            return 'no Debugger.paused (main thread stuck outside JS: layout/GPU/IPC)'
        except Exception as e:
            return f'no Debugger.paused within 20s ({e!r}): main thread stuck outside JS (layout/GPU/IPC)'
    def call(self, method, **params):
        self.seq += 1
        msg = json.dumps(dict(id=self.seq, method=method, params=params)).encode()
        self._send_frame(msg)
        sock = self.__dict__.get('sock')
        if hasattr(sock, 'settimeout'): sock.settimeout(self.RESPONSE_TIMEOUT)
        try:
            while True:
                data = json.loads(self._read_message())
                if data.get('id') == self.seq:
                    if 'error' in data: raise RuntimeError(data['error'])
                    return data.get('result',{})
                if 'method' in data: self._note_event(data)
        except socket.timeout:
            detail = json.dumps(params)[:300]
            raise TimeoutError(f'No CDP reply to {method} {detail} within {self.RESPONSE_TIMEOUT:.0f}s; '
                               f'recent events: {self.__dict__.get("recent_events", [])}; '
                               f'stuck JS stack: {self._stuck_stack()}') from None
        finally:
            if hasattr(sock, 'settimeout'): sock.settimeout(None)
    def touch_tap(self, x, y):
        # Queue both ends before waiting for CDP acknowledgements. A descheduled
        # client between two call()s must not turn a tap into a 380ms long press.
        pending = set()
        for kind, points in [('touchStart', [dict(x=x, y=y, id=1)]), ('touchEnd', [])]:
            self.seq += 1; pending.add(self.seq)
            self._send_frame(json.dumps(dict(id=self.seq, method='Input.dispatchTouchEvent',
                params=dict(type=kind, touchPoints=points))).encode())
        while pending:
            data = json.loads(self._read_message())
            if data.get('id') in pending:
                pending.remove(data['id'])
                if 'error' in data: raise RuntimeError(data['error'])
    def wait(self, expression, timeout=20):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if self.js(expression): return
            time.sleep(.1)
        raise TimeoutError(expression)
    def js(self, expression):
        result = self.call('Runtime.evaluate', expression=expression, awaitPromise=True, returnByValue=True)
        if 'exceptionDetails' in result: raise RuntimeError(result['exceptionDetails'])
        return result.get('result',{}).get('value')

def pdf_bytes(two_columns=False):
    objs = [b'<< /Type /Catalog /Pages 2 0 R >>',b'',b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
    kids=[]
    for p in range(1, 2 if two_columns else 121):
        page_id=len(objs)+1; kids.append(f'{page_id} 0 R')
        objs.append(f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents {page_id+1} 0 R >>'.encode())
        text = f'BT /F1 18 Tf 45 740 Td (Hello world. PDF page {p}.) Tj 0 -30 Td (Reading text beside an illustration.) Tj ET\n'
        if p % 2 == 0: text += '0.1 0.5 0.8 rg 50 420 220 230 re f\nBT /F1 14 Tf 300 620 Td (Illustration caption) Tj ET\n'
        text += 'BT /F1 14 Tf 45 200 Td (Lower text for zoom and pan.) Tj ET'
        if two_columns:
            text = '\n'.join(f'BT /F1 12 Tf {45 + col*280} {740-row*28} Td ({label} sentence {row}. Second sentence.) Tj ET' for row in range(5) for col, label in enumerate(['Left', 'Right']))
        stream=text.encode(); objs.append(f'<< /Length {len(stream)} >>\nstream\n'.encode()+stream+b'\nendstream')
    objs[1]=f'<< /Type /Pages /Count {len(kids)} /Kids [{" ".join(kids)}] >>'.encode()
    data=b'%PDF-1.4\n'; offsets=[0]
    for i,obj in enumerate(objs,1): offsets.append(len(data)); data+=f'{i} 0 obj\n'.encode()+obj+b'\nendobj\n'
    xref=len(data); data+=f'xref\n0 {len(objs)+1}\n0000000000 65535 f \n'.encode()
    data+=b''.join(f'{o:010d} 00000 n \n'.encode() for o in offsets[1:])
    return data+f'trailer << /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF'.encode()

def bilingual_pdf_bytes():
    """A single-page, two-column bilingual-textbook-style fixture: French on the
    left, its English translation on the right, row-aligned like a real parallel
    text. Several lines carry an inline bold word (Helvetica-Bold via a font
    change) in the MIDDLE of the sentence, e.g. "..., **Premierement**, ...", the
    same style break real bilingual books use for "Firstly/Secondly/..." markers —
    reproduced with runs shown CONTINUOUSLY (no repositioning Td between them, so
    positions stay genuinely adjacent, exactly like a real PDF generator would lay
    them out) rather than at hand-picked X offsets, which would create artificial
    gaps a column-detection test could pass against for the wrong reason."""
    objs = [
        b'<< /Type /Catalog /Pages 2 0 R >>',
        b'',
        b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    ]
    left_lines = [
        [('F1', "Je n'etais pas satisfait du")],
        [('F1', "service a votre hotel.")],
        [('F2', "Premierement,"), ('F1', " le personnel netait pas")],
        [('F1', "attentif: par exemple, on a")],
        [('F1', "oublie de me reveiller le")],
        [('F1', "premier matin.")],
        [('F2', "Deuxiemement,"), ('F1', " ma chambre na")],
        [('F1', "pas ete nettoyee pendant deux")],
        [('F1', "jours.")],
    ]
    right_lines = [
        [('F1', "I was not at all satisfied")],
        [('F1', "with the service at your hotel.")],
        [('F2', "First,"), ('F1', " the personnel were not")],
        [('F1', "attentive: for example, they")],
        [('F1', "forgot to wake me up on the")],
        [('F1', "first morning.")],
        [('F2', "Secondly,"), ('F1', " my room was not")],
        [('F1', "cleaned for two days.")],
    ]
    def line_ops(x, y, runs):
        parts = [f"BT {x} {y} Td"]
        for font, text in runs:
            esc = text.replace('\\', r'\\').replace('(', r'\(').replace(')', r'\)')
            parts.append(f" /{font} 11 Tf ({esc}) Tj")
        parts.append(" ET")
        return ''.join(parts)
    ops = []
    y = 740
    for row in left_lines:
        ops.append(line_ops(45, y, row)); y -= 20
    y = 740
    for row in right_lines:
        ops.append(line_ops(305, y, row)); y -= 20
    stream = ('\n'.join(ops)).encode()
    page_obj_num, stream_obj_num = 5, 6
    objs.append(f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {stream_obj_num} 0 R >>'.encode())
    objs.append(f'<< /Length {len(stream)} >>\nstream\n'.encode() + stream + b'\nendstream')
    objs[1] = f'<< /Type /Pages /Count 1 /Kids [{page_obj_num} 0 R] >>'.encode()
    data = b'%PDF-1.4\n'; offsets = [0]
    for i, obj in enumerate(objs, 1):
        offsets.append(len(data)); data += f'{i} 0 obj\n'.encode() + obj + b'\nendobj\n'
    xref = len(data)
    data += f'xref\n0 {len(objs)+1}\n0000000000 65535 f \n'.encode()
    data += b''.join(f'{o:010d} 00000 n \n'.encode() for o in offsets[1:])
    return data + f'trailer << /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF'.encode()

VERB_TABLE_ROWS = [
    ('ayant vu', 'having seen'), ('ayant compris', 'having understood'), ('ayant joué', 'having played'), ('ayant traversé', 'having crossed'),
    ('étant allé(e)(s)', 'having gone'), ('étant parti(e)(s)', 'having left'), ('nous étant promené(e)s', 'having walked'), ('nous étant retrouvé(e)s', 'having met'),
]


def verb_table_pdf_bytes(order='rows', rows=None):
    """A bilingual grammar page like the real "Complete French All-in-One" p.338: an English explanation line, then a row-aligned
    two-column table -- French forms on the left, their English translation on the right (a wide gutter between them) -- then
    French example sentences with their English translations, two lines each.

    `order` is the CONTENT-STREAM order, which is what the browser's text layer (and so a drag selection) follows:
      'rows'    French cell, English cell, next row ...   (what the real page does: the two columns interleave row by row)
      'columns' every French cell, then every English cell (the other common layout)
    Text is WinAnsi-encoded so accents survive. Each cell is its own text item, as in a real PDF."""
    rows = rows or VERB_TABLE_ROWS
    objs = [b'<< /Type /Catalog /Pages 2 0 R >>', b'',
            b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>']
    def enc(text):
        return text.encode('cp1252').replace(b'\\', b'\\\\').replace(b'(', b'\\(').replace(b')', b'\\)')
    def cell(x, y, text):
        return b'BT %d %d Td /F1 12 Tf (' % (x, y) + enc(text) + b') Tj ET'
    left_x, right_x = 72, 330
    y = 700
    ops = [cell(left_x, y, 'When an action precedes another one, avoir and être in the participe présent can be combined.')]
    y -= 40
    fr_cells, en_cells = [], []
    for fr, en in rows:
        fr_cells.append(cell(left_x, y, fr)); en_cells.append(cell(right_x, y, en)); y -= 22
    if order == 'rows':
        for f, e in zip(fr_cells, en_cells): ops += [f, e]
    else:
        ops += fr_cells + en_cells
    y -= 18
    sentences = [('Ayant accepté la défaite, les joueurs', 'sont rentrés chez eux.', 'Having accepted the defeat, the players', 'went home.'),
                 ('Étant partis très tôt, nous sommes', 'arrivés les premiers.', 'Having left very early, we were the first', 'to arrive.')]
    for fr1, fr2, en1, en2 in sentences:
        ops += [cell(left_x, y, fr1), cell(right_x, y, en1)]; y -= 16
        ops += [cell(left_x + 12, y, fr2), cell(right_x + 12, y, en2)]; y -= 24
    stream = b'\n'.join(ops)
    objs.append(b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R >>')
    objs.append(b'<< /Length %d >>\nstream\n' % len(stream) + stream + b'\nendstream')
    objs[1] = b'<< /Type /Pages /Count 1 /Kids [4 0 R] >>'
    data = b'%PDF-1.4\n'; offsets = [0]
    for i, obj in enumerate(objs, 1):
        offsets.append(len(data)); data += f'{i} 0 obj\n'.encode() + obj + b'\nendobj\n'
    xref = len(data)
    data += f'xref\n0 {len(objs)+1}\n0000000000 65535 f \n'.encode()
    data += b''.join(f'{o:010d} 00000 n \n'.encode() for o in offsets[1:])
    return data + f'trailer << /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF'.encode()


def edge_words_pdf_bytes():
    """A single-page fixture with one word hard against the LEFT margin and one
    hard against the RIGHT margin on the same line, plus isolated words above/
    below with generous blank space around all of them — built for testing that
    a blank-space click/tap never resolves to a nearby (or previously selected)
    word, at any margin distance, including page edges."""
    objs = [b'<< /Type /Catalog /Pages 2 0 R >>', b'', b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
    ops = [
        "BT /F1 14 Tf 45 740 Td (LeftEdge) Tj ET",
        "BT /F1 14 Tf 500 740 Td (RightEdge) Tj ET",
        "BT /F1 14 Tf 270 400 Td (MiddleWord) Tj ET",
    ]
    stream = ('\n'.join(ops)).encode()
    objs.append(b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R >>')
    objs.append(f'<< /Length {len(stream)} >>\nstream\n'.encode() + stream + b'\nendstream')
    objs[1] = b'<< /Type /Pages /Count 1 /Kids [4 0 R] >>'
    data = b'%PDF-1.4\n'; offsets = [0]
    for i, obj in enumerate(objs, 1):
        offsets.append(len(data)); data += f'{i} 0 obj\n'.encode() + obj + b'\nendobj\n'
    xref = len(data)
    data += f'xref\n0 {len(objs)+1}\n0000000000 65535 f \n'.encode()
    data += b''.join(f'{o:010d} 00000 n \n'.encode() for o in offsets[1:])
    return data + f'trailer << /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF'.encode()

