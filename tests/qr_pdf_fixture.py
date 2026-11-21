# Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
# Copying, modification, distribution or commercial use without written permission is prohibited.
"""A PDF with real QR codes drawn as vector squares, for the QR tests (tests/pdf_qr_browser.py, tests/saved_links_browser.py).

The codes are the PNGs tests/crop_web_search_browser.py reads: QR_URL holds https://example.com/qr-test?a=1, QR_TXT
the text «Bonjour le monde». Page 1: no code; page 2: the URL code; page 3: both codes; page 4: no code.
"""
import os, re, base64, struct, zlib

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = open(os.path.join(HERE, 'crop_web_search_browser.py'), encoding='utf-8').read()


def png_bits(name):
    """1-bit grayscale PNG (no interlace) → rows of booleans, True = black."""
    raw = base64.b64decode(re.search(name + r" = '([^']+)'", SRC).group(1))
    pos, idat = 8, b''
    while pos < len(raw):
        n, = struct.unpack('>I', raw[pos:pos + 4]); typ = raw[pos + 4:pos + 8]; data = raw[pos + 8:pos + 8 + n]; pos += 12 + n
        if typ == b'IHDR': w, h, depth, ctype = struct.unpack('>IIBB', data[:10]); assert depth == 1 and ctype == 0
        if typ == b'IDAT': idat += data
    data, stride, rows, prev = zlib.decompress(idat), (w + 7) // 8, [], bytes((w + 7) // 8)
    for y in range(h):
        f, line = data[y * (stride + 1)], bytearray(data[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        for i in range(stride):
            a = line[i - 1] if i else 0; b = prev[i]; c_ = prev[i - 1] if i else 0
            if f == 1: line[i] = (line[i] + a) & 255
            elif f == 2: line[i] = (line[i] + b) & 255
            elif f == 3: line[i] = (line[i] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c_; pa, pb, pc = abs(p - a), abs(p - b), abs(p - c_)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c_)) & 255
        prev = bytes(line)
        rows.append([not (line[x // 8] >> (7 - x % 8)) & 1 for x in range(w)])
    return rows


def qr_ops(rows, left, top, size):
    """Black runs of each pixel row as filled rectangles, the code `size` points wide, its top-left at (left, top)."""
    k = size / len(rows); out = ['0 0 0 rg']
    for y, row in enumerate(rows):
        x = 0
        while x < len(row):
            if row[x]:
                x0 = x
                while x < len(row) and row[x]: x += 1
                out.append(f'{left + x0 * k:.3f} {top - (y + 1) * k:.3f} {(x - x0) * k:.3f} {k:.3f} re')
            else: x += 1
    return '\n'.join(out) + '\nf\n'


URL_ROWS, TXT_ROWS = png_bits('QR_URL'), png_bits('QR_TXT')


def dark_box(rows, left, top, size):
    """Where the code's black modules lie on the page (its white quiet zone is not part of the code), PDF units from the top-left."""
    k = size / len(rows); ys = [y for y, r in enumerate(rows) if any(r)]; xs = [x for r in rows for x, v in enumerate(r) if v]
    return left + min(xs) * k, (800 - top) + min(ys) * k, (max(xs) + 1 - min(xs)) * k, (max(ys) + 1 - min(ys)) * k


BOX = dark_box(URL_ROWS, 300, 600, 180)


def qr_pdf():
    pages = [
        'BT /F1 18 Tf 45 740 Td (A page with no code at all.) Tj ET',
        'BT /F1 18 Tf 45 740 Td (Scan the code for the exercise audio.) Tj ET\n' + qr_ops(URL_ROWS, 300, 600, 180),
        'BT /F1 18 Tf 45 740 Td (Two codes on one page.) Tj ET\n' + qr_ops(URL_ROWS, 60, 420, 170) + qr_ops(TXT_ROWS, 360, 420, 170),
        'BT /F1 18 Tf 45 740 Td (The last page.) Tj ET',
    ]
    objs, kids = [b'<< /Type /Catalog /Pages 2 0 R >>', b'', b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'], []
    for text in pages:
        pid = len(objs) + 1; kids.append(f'{pid} 0 R')
        objs.append(f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents {pid + 1} 0 R >>'.encode())
        stream = text.encode(); objs.append(f'<< /Length {len(stream)} >>\nstream\n'.encode() + stream + b'\nendstream')
    objs[1] = f'<< /Type /Pages /Count {len(kids)} /Kids [{" ".join(kids)}] >>'.encode()
    data, offsets = b'%PDF-1.4\n', [0]
    for i, obj in enumerate(objs, 1): offsets.append(len(data)); data += f'{i} 0 obj\n'.encode() + obj + b'\nendobj\n'
    xref = len(data); data += f'xref\n0 {len(objs) + 1}\n0000000000 65535 f \n'.encode()
    data += b''.join(f'{o:010d} 00000 n \n'.encode() for o in offsets[1:])
    return data + f'trailer << /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF'.encode()
