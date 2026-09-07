"""Minimal CDP client and synthetic PDF fixture for isolated browser tests."""
import base64, json, os, socket, struct, time, urllib.request

class CDP:
    def __init__(self):
        tabs = json.load(urllib.request.urlopen('http://127.0.0.1:9222/json'))
        from urllib.parse import urlparse
        u = urlparse(next(t['webSocketDebuggerUrl'] for t in tabs if t['type'] == 'page'))
        self.sock = socket.create_connection((u.hostname, u.port)); self.seq = 0
        key = base64.b64encode(os.urandom(16)).decode()
        self.sock.sendall(f'GET {u.path} HTTP/1.1\r\nHost: {u.netloc}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n'.encode())
        h = b''
        while not h.endswith(b'\r\n\r\n'): h += self.sock.recv(1)
        assert b'101 ' in h, h
    def read(self, n):
        data = b''
        while len(data) < n: data += self.sock.recv(n-len(data))
        return data
    def call(self, method, **params):
        self.seq += 1
        msg = json.dumps(dict(id=self.seq, method=method, params=params)).encode(); n = len(msg)
        header = bytes([0x81, 0x80 | n]) if n < 126 else bytes([0x81, 0xfe])+struct.pack('!H',n) if n < 65536 else bytes([0x81,0xff])+struct.pack('!Q',n)
        mask = os.urandom(4); self.sock.sendall(header+mask+bytes(c^mask[i%4] for i,c in enumerate(msg)))
        while True:
            a,b = self.read(2); n = b&127
            if n == 126: n = struct.unpack('!H',self.read(2))[0]
            if n == 127: n = struct.unpack('!Q',self.read(8))[0]
            data = json.loads(self.read(n))
            if data.get('id') == self.seq:
                if 'error' in data: raise RuntimeError(data['error'])
                return data.get('result',{})
    def js(self, expression):
        result = self.call('Runtime.evaluate', expression=expression, awaitPromise=True, returnByValue=True)
        if 'exceptionDetails' in result: raise RuntimeError(result['exceptionDetails'])
        return result.get('result',{}).get('value')

def pdf_bytes():
    objs = [b'<< /Type /Catalog /Pages 2 0 R >>',b'',b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
    kids=[]
    for p in range(1,121):
        page_id=len(objs)+1; kids.append(f'{page_id} 0 R')
        objs.append(f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents {page_id+1} 0 R >>'.encode())
        text = f'BT /F1 18 Tf 45 740 Td (Hello world. PDF page {p}.) Tj 0 -30 Td (Reading text beside an illustration.) Tj ET\n'
        if p % 2 == 0: text += '0.1 0.5 0.8 rg 50 420 220 230 re f\nBT /F1 14 Tf 300 620 Td (Illustration caption) Tj ET\n'
        text += 'BT /F1 14 Tf 45 200 Td (Lower text for zoom and pan.) Tj ET'
        stream=text.encode(); objs.append(f'<< /Length {len(stream)} >>\nstream\n'.encode()+stream+b'\nendstream')
    objs[1]=f'<< /Type /Pages /Count 120 /Kids [{" ".join(kids)}] >>'.encode()
    data=b'%PDF-1.4\n'; offsets=[0]
    for i,obj in enumerate(objs,1): offsets.append(len(data)); data+=f'{i} 0 obj\n'.encode()+obj+b'\nendobj\n'
    xref=len(data); data+=f'xref\n0 {len(objs)+1}\n0000000000 65535 f \n'.encode()
    data+=b''.join(f'{o:010d} 00000 n \n'.encode() for o in offsets[1:])
    return data+f'trailer << /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF'.encode()

