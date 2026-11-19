#!/usr/bin/env python3
# Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
# Copying, modification, distribution or commercial use without written permission is prohibited.
"""Writes tests/fixtures/pdf/flow-layout.pdf: one page that copies the layouts of a textbook page (Par Ici) which the
visual columns got wrong, each written in the content stream the way a layout program writes it -- frame by frame.

  1. A «Mémo» frame: a paragraph on the left, a two-column table printed two line heights beside it at another line
     pitch («moi + en = [mwaza]» rows); the paragraph is written first, then the table row by row.
  2. A bold instruction, then gap-fill exercise items «a. … ____ … .» with wide blanks, one item wrapping onto a second
     line with a hanging indent.
  3. A bold heading straight over its text (no full stop after the heading).
  4. A story threaded over two columns: the sentence that ends the left column goes on at the top of the right one.
  5. Two conjugation columns side by side (short lines, no full stop, the right one in lower case): not one story.

ASCII only (Helvetica / Helvetica-Bold, WinAnsi). Run: python3 tools/make_pdf_flow_fixture.py"""
import os

ITEMS = []   # (font, size, x, y, text) in stream order


def put(font, size, x, y, text):
    ITEMS.append((font, size, x, y, text))


# 1. Memo frame: paragraph (pitch 13) then the table (pitch 17), 21 pt (two line heights) right of the paragraph's longest line.
para = ["A l'oral, quand le pronom en suit", "un autre pronom, on ajoute parfois un",
        "z avant le en pour creer une liaison", "entre les deux pronoms. D'autres",
        "liaisons peuvent aussi etre faites."]
for k, line in enumerate(para):
    put('F1', 10, 60, 780 - 13 * k, line)
rows = [("moi + en = [mwaza]", "nous + en = [nuza]"), ("toi + en = [twaza]", "vous + en = [vuza]"),
        ("il + en = [ja]", "ils + en = [iza]"), ("elle + en = [ana]", "elles + en = [eza]")]
for k, (left, right) in enumerate(rows):
    put('F1', 10, 248, 778 - 17 * k, left)
    put('F1', 10, 355, 778 - 17 * k, right)

# 2. Exercise: bold instruction, items with blanks (gaps of 60-90 pt), a hanging indent.
put('F2', 10, 60, 680, "5."); put('F2', 10, 74, 680, "Ecoutez et completez.")
put('F1', 10, 60, 664, "a. Ce serait bien que tu"); put('F1', 10, 250, 664, "rendez-vous avec la"); put('F1', 10, 420, 664, ".")
put('F1', 10, 60, 650, "b. Il faudrait que vous en"); put('F1', 10, 260, 650, "avec le"); put('F1', 10, 380, 650, "adjoint, pour confirmer.")
put('F1', 10, 60, 636, "c. Il faut que tu"); put('F1', 10, 200, 636, "ton montage, va voir le technicien")
put('F1', 10, 72, 622, "pour emprunter l'equipement necessaire.")
put('F1', 10, 60, 608, "d. Il faut que tu"); put('F1', 10, 200, 608, "ramasser tes choses.")

# 3. Bold heading straight over its paragraph.
put('F2', 10, 60, 570, "Les connecteurs de temps")
put('F1', 10, 60, 557, "Pour indiquer l'ordre des etapes dans le temps, on utilise des")
put('F1', 10, 60, 544, "connecteurs comme d'abord, ensuite et enfin.")

# 4. A story threaded over two columns.
put('F1', 10, 60, 500, "Le premier paragraphe se termine ici.")
put('F1', 10, 60, 487, "La phrase suivante commence en bas de la")
put('F1', 10, 60, 474, "colonne de gauche et elle continue dans")
put('F1', 10, 320, 500, "la colonne de droite sans aucun point")
put('F1', 10, 320, 487, "avant la fin de la phrase.")

# 5. Two conjugation columns side by side, short lines, no full stops; the right one starts in lower case. Not one story.
for k, (left, right) in enumerate([("je prevaudrai", "j'aurai prevalu"), ("tu prevaudras", "tu auras prevalu"),
                                   ("il prevaudra", "il aura prevalu"), ("ils prevaudront", "ils auront prevalu")]):
    put('F1', 10, 60, 420 - 13 * k, left)
for k, (left, right) in enumerate([("je prevaudrai", "j'aurai prevalu"), ("tu prevaudras", "tu auras prevalu"),
                                   ("il prevaudra", "il aura prevalu"), ("ils prevaudront", "ils auront prevalu")]):
    put('F1', 10, 200, 420 - 13 * k, right)


def esc(s):
    return s.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')


def build():
    content = 'BT\n' + ''.join(f'/{f} {size} Tf 1 0 0 1 {x:.2f} {y:.2f} Tm ({esc(t)}) Tj\n' for f, size, x, y, t in ITEMS) + 'ET\n'
    objs = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
        f'<< /Length {len(content.encode("latin-1"))} >>\nstream\n{content}endstream',
    ]
    out = b'%PDF-1.4\n'
    offsets = []
    for n, body in enumerate(objs, 1):
        offsets.append(len(out))
        out += f'{n} 0 obj\n{body}\nendobj\n'.encode('latin-1')
    xref = len(out)
    out += f'xref\n0 {len(objs) + 1}\n0000000000 65535 f \n'.encode('latin-1')
    out += ''.join(f'{o:010d} 00000 n \n' for o in offsets).encode('latin-1')
    out += f'trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode('latin-1')
    return out


if __name__ == '__main__':
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tests', 'fixtures', 'pdf', 'flow-layout.pdf')
    with open(path, 'wb') as f:
        f.write(build())
    print('wrote', os.path.normpath(path))
