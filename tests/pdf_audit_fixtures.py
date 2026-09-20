"""Small actual PDF fixtures; generation and browser tests need only stdlib.

Encoded image samples live in fixtures/pdf (see its README for provenance).
Every returned PDF is a complete file passed through the public upload path.
"""
from pathlib import Path
import zlib
import struct

ASSETS = Path(__file__).parent / 'fixtures' / 'pdf'


def pdf_document(pages, outline=None, page_labels=None):
    """outline: list of {'title': str, 'page': 1-based int, 'children': [...]}
    building a real /Outlines bookmark tree with explicit page destinations.
    page_labels: list of {'style': 'D'|'r'|'R'|None, 'start': int (1-based
    physical page this range begins at), 'prefix': str} building /PageLabels.
    Each page spec may include 'links': [{'rect': [x1,y1,x2,y2], 'page': N}]
    for real Link annotations (destination = top of target page N)."""
    objects = [None, b'',
               b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
    kids = []
    page_ids = []  # filled in as pages are built, index 0 -> page 1's object id

    def add(value):
        objects.append(value)
        return len(objects)

    def stream(data, attrs=''):
        return add(f'<< /Length {len(data)} {attrs} >>\nstream\n'.encode() + data + b'\nendstream')

    # Reserve page object numbers up front so a link/outline destination can
    # reference ANY page (including ones not yet built, i.e. forward refs).
    for _ in pages:
        page_ids.append(add(b''))

    for number, spec in enumerate(pages, 1):
        width, height = spec.get('size', (600, 800))
        image = spec.get('image')
        resource = ''
        ops = []
        if image:
            iw, ih = spec.get('image_size', (64, 80))
            attrs = f'/Type /XObject /Subtype /Image /Width {iw} /Height {ih} /BitsPerComponent 8 /ColorSpace /DeviceRGB'
            if image == 'jpx':
                data = (ASSETS / 'gradient.jp2').read_bytes()
                attrs += ' /Filter /JPXDecode'
            elif image == 'jpeg':
                data = (ASSETS / 'gradient.jpg').read_bytes()
                attrs += ' /Filter /DCTDecode'
            elif image == 'ccitt':
                data = (ASSETS / 'scan.ccitt').read_bytes()
                attrs = f'/Type /XObject /Subtype /Image /Width 64 /Height 80 /BitsPerComponent 1 /ColorSpace /DeviceGray /Filter /CCITTFaxDecode /DecodeParms << /K -1 /Columns 64 /Rows 80 /BlackIs1 true >>'
            elif image == 'jbig2':
                # Embedded JBIG2 sequential segments: page information, an MMR
                # immediate generic region, end-of-page. Real JBIG2 decoding.
                def segment(number, kind, body):
                    return struct.pack('>IBBBI', number, kind, 0, 1, len(body)) + body
                data = segment(1, 48, struct.pack('>IIIIBH',64,80,0,0,0,0))
                data += segment(2, 38, struct.pack('>IIIIBB',64,80,0,0,0,1)+(ASSETS/'scan.ccitt').read_bytes())
                data += segment(3, 49, b'')
                attrs = '/Type /XObject /Subtype /Image /Width 64 /Height 80 /BitsPerComponent 1 /ColorSpace /DeviceGray /Filter /JBIG2Decode'
            elif image == 'broken':
                data = b'not a JPEG image'
                attrs += ' /Filter /DCTDecode'
            else:
                # Four saturated colors, high compression even for large bitmaps.
                row = b'\x15\x45\x90' * (iw // 2) + b'\xdd\x85\x12' * (iw - iw // 2)
                data = zlib.compress(row * ih)
                attrs += ' /Filter /FlateDecode'
            if spec.get('alpha'):
                alpha = zlib.compress(bytes([130]) * iw * ih)
                mask = stream(alpha, f'/Type /XObject /Subtype /Image /Width {iw} /Height {ih} /BitsPerComponent 8 /ColorSpace /DeviceGray /Filter /FlateDecode')
                attrs += f' /SMask {mask} 0 R'
            image_id = stream(data, attrs)
            resource = f'/XObject << /Im {image_id} 0 R >>'
            for col in range(spec.get('columns', 1)):
                cols = spec.get('columns', 1)
                ops.append(f'q {width/cols} 0 0 {height} {col*width/cols} 0 cm /Im Do Q')
        if spec.get('vector'):
            ops.append(f'0.8 0.1 0.2 rg {width*.25} {height*.3} {width*.5} {height*.4} re f')
        if spec.get('text') or spec.get('ocr'):
            text = spec.get('text', 'Invisible OCR text remains selectable. Another sentence.')
            text = text.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
            ops.append(f"BT /F1 18 Tf {'3 Tr' if spec.get('ocr') else '0 Tr'} 20 {height-35} Td ({text}) Tj ET")
            if spec.get('text'):
                ops.append(f'BT /F1 13 Tf 20 {height-65} Td (Second paragraph: image and text document page {number}.) Tj ET')
        contents = stream('\n'.join(ops).encode())
        page_id = page_ids[number - 1]
        annots = ''
        for link in spec.get('links', []):
            target_id = page_ids[link['page'] - 1]
            rect = ' '.join(str(v) for v in link['rect'])
            ann_id = add(f'<< /Type /Annot /Subtype /Link /Rect [{rect}] /Border [0 0 0] /Dest [{target_id} 0 R /XYZ null null null] >>'.encode())
            annots += f'{ann_id} 0 R '
        annots_entry = f' /Annots [{annots.strip()}]' if annots else ''
        objects[page_id - 1] = f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {width} {height}] /Rotate {spec.get("rotate", 0)} /Resources << /Font << /F1 3 0 R >> {resource} >> /Contents {contents} 0 R{annots_entry} >>'.encode()
        kids.append(f'{page_id} 0 R')
    objects[1] = f'<< /Type /Pages /Count {len(kids)} /Kids [{" ".join(kids)}] >>'.encode()

    catalog_extra = ''
    if outline:
        def build_outline_items(items, parent_id):
            ids = []
            for item in items:
                item_id = add(b'')  # reserved; filled in after children are known
                child_first = child_last = 'null'
                if item.get('children'):
                    child_ids = build_outline_items(item['children'], item_id)
                    child_first, child_last = f'{child_ids[0]} 0 R', f'{child_ids[-1]} 0 R'
                title = item['title'].replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
                dest = f'[{page_ids[item["page"] - 1]} 0 R /XYZ null null null]' if item.get('page') else 'null'
                count = f' /Count {len(item.get("children", []))}' if item.get('children') else ''
                objects[item_id - 1] = (
                    f'<< /Title ({title}) /Parent {parent_id} 0 R /Dest {dest}'
                    f'{f" /First {child_first} /Last {child_last}" if item.get("children") else ""}{count} >>'
                ).encode()
                ids.append(item_id)
            for i, item_id in enumerate(ids):
                obj = objects[item_id - 1].decode()
                prev = f' /Prev {ids[i-1]} 0 R' if i > 0 else ''
                nxt = f' /Next {ids[i+1]} 0 R' if i < len(ids) - 1 else ''
                objects[item_id - 1] = (obj[:-3] + prev + nxt + ' >>').encode()
            return ids
        outline_root_id = add(b'')
        top_ids = build_outline_items(outline, outline_root_id)
        objects[outline_root_id - 1] = f'<< /Type /Outlines /First {top_ids[0]} 0 R /Last {top_ids[-1]} 0 R /Count {len(top_ids)} >>'.encode()
        catalog_extra += f' /Outlines {outline_root_id} 0 R'

    if page_labels:
        nums = []
        for rng in page_labels:
            entry = '<<'
            if rng.get('style'): entry += f' /S /{rng["style"]}'
            if rng.get('prefix'): entry += f' /P ({rng["prefix"]})'
            entry += ' >>'
            nums.append(f'{rng["start"] - 1} {entry}')
        labels_id = add(f'<< /Nums [{" ".join(nums)}] >>'.encode())
        catalog_extra += f' /PageLabels {labels_id} 0 R'

    objects[0] = f'<< /Type /Catalog /Pages 2 0 R{catalog_extra} >>'.encode()
    data = b'%PDF-1.7\n%\xe2\xe3\xcf\xd3\n'
    offsets = []
    for i, obj in enumerate(objects, 1):
        offsets.append(len(data))
        data += f'{i} 0 obj\n'.encode() + obj + b'\nendobj\n'
    xref = len(data)
    data += f'xref\n0 {len(objects)+1}\n0000000000 65535 f \n'.encode()
    data += b''.join(f'{offset:010d} 00000 n \n'.encode() for offset in offsets)
    return data + f'trailer << /Size {len(objects)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode()


def pdf_fixtures():
    return {
        'A text': pdf_document([{'text': 'Hello world. This is an English PDF.'}]),
        'B image-heavy JPX': pdf_document([{'image': 'jpx', 'columns': 6}]),
        'B image-heavy small text': pdf_document([{'image': 'jpx', 'columns': 6, 'text': 'A small image caption.'}]),
        'C image-only scan CCITT': pdf_document([{'image': 'ccitt'}]),
        'C image-only scan JBIG2': pdf_document([{'image': 'jbig2'}]),
        'D full-page JPEG': pdf_document([{'image': 'jpeg'}] * 3),
        'E high resolution': pdf_document([{'image': 'raw', 'image_size': (2400, 3200)}]),
        'F mixed text vector images': pdf_document([{'image': 'jpeg', 'vector': True, 'text': 'Mixed PDF visible text.'}]),
        'G no extractable text': pdf_document([{'image': 'raw'}]),
        'H scanned invisible OCR': pdf_document([{'image': 'jpeg', 'ocr': True}]),
        'I alternating pages': pdf_document([{'text': 'Text on page one.'}, {'image': 'jpx'}, {'image': 'jpeg', 'text': 'Mixed page three.'}]),
        'J landscape': pdf_document([{'image': 'jpeg', 'size': (800, 600)}]),
        'K portrait': pdf_document([{'image': 'jpeg'}]),
        'L mixed orientation': pdf_document([{'image': 'jpx'}, {'image': 'jpeg', 'size': (800, 600)}]),
        'M rotated': pdf_document([{'image': 'jpeg', 'rotate': angle} for angle in (90, 180, 270)]),
        'N unusual dimensions': pdf_document([{'image': 'raw', 'size': size} for size in [(300, 1000), (1000, 300), (80, 80)]]),
        'O large embedded bitmap': pdf_document([{'image': 'raw', 'image_size': (4096, 4096)}]),
        'P transparency': pdf_document([{'image': 'raw', 'alpha': True}]),
        'long 48 pages': pdf_document([{'image': ['jpx', 'jpeg', 'ccitt'][i % 3], 'text': f'Page {i+1}.'} for i in range(48)]),
        'almost empty': pdf_document([{'text': '.'}]),
        'valid blank page': pdf_document([{}]),
    }
