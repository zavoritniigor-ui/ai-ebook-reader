"""Deterministic, redistributable EPUB/FB2 corpus builders (stdlib only).

These produce actual ZIP/XML/image files; no reader/parser functions are mocked.
Importing this module does not start a browser or run tests.
"""
import base64
import io
import struct
import zipfile
import zlib


TEXT = "Hello reader. This is a complete English sentence. Українська книжка: їжак, ґанок, п'ять. Polski: zażółć gęślą jaźń. Café café 👩🏽‍🚀 — “quotes”."


def png(width=240, height=160):
    """Visible four-quadrant RGB bitmap, not a transparent 1×1 parser token."""
    def chunk(kind, data):
        return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data) & 0xffffffff)
    rows = b''.join(b'\0' + b''.join(bytes((220 if x < width // 2 else 25, 160 if y < height // 2 else 35, 65 if x < width // 2 else 205)) for x in range(width)) for y in range(height))
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', width, height, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(rows, 9)) + chunk(b'IEND', b''))


def archive(files):
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w') as zip_file:
        for name, data in files.items():
            info = zipfile.ZipInfo(name, date_time=(2020, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            zip_file.writestr(info, data)
    return output.getvalue()


def epub(chapters, resources=None, prefixed=False):
    """chapters: a list of body HTML strings, or mapping of paths to body HTML."""
    if not isinstance(chapters, dict):
        chapters = {f'Text/chapter-{i}.xhtml': body for i, body in enumerate(chapters)}
    prefix = 'opf:' if prefixed else ''
    namespace = 'xmlns:opf' if prefixed else 'xmlns'
    container_prefix = 'ocf:' if prefixed else ''
    container_namespace = 'xmlns:ocf' if prefixed else 'xmlns'
    files = {
        'mimetype': 'application/epub+zip',
        'META-INF/container.xml': f'<{container_prefix}container {container_namespace}="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><{container_prefix}rootfiles><{container_prefix}rootfile full-path="OPS/package.opf" media-type="application/oebps-package+xml"/></{container_prefix}rootfiles></{container_prefix}container>',
        'OPS/package.opf': f'<{prefix}package {namespace}="http://www.idpf.org/2007/opf" version="3.0"><{prefix}metadata/><{prefix}manifest>'
            + ''.join(f'<{prefix}item id="c{i}" href="{path}" media-type="application/xhtml+xml"/>' for i, path in enumerate(chapters))
            + f'</{prefix}manifest><{prefix}spine>' + ''.join(f'<{prefix}itemref idref="c{i}"/>' for i in range(len(chapters))) + f'</{prefix}spine></{prefix}package>',
    }
    for path, body in chapters.items():
        from urllib.parse import unquote
        files['OPS/' + unquote(path)] = f'<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Metadata only</title></head><body>{body}</body></html>'
    files.update({'OPS/' + path: data for path, data in (resources or {}).items()})
    return archive(files)


def fb2(body, cover=False, malformed_binary=False):
    image = base64.b64encode(png()).decode()
    return ('<?xml version="1.0" encoding="utf-8"?>'
            '<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:l="http://www.w3.org/1999/xlink">'
            + ('<description><title-info><book-title>Cover book</book-title><coverpage><image l:href="#cover"/></coverpage></title-info></description>' if cover else '')
            + '<body>' + body + '</body><binary id="cover" content-type="image/png">'
            + ('bad!base64' if malformed_binary else image) + '</binary></FictionBook>')


def fb2_zip(text):
    return archive({"Книжка (Zażółć)/reader's book.fb2": text, 'README.txt': 'Deterministic FB2 archive fixture.'})
