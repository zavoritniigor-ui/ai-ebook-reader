import re

with open('js/selection.js', 'r', encoding='utf-8') as f:
    code = f.read()

pattern = r"if \(!Array\.from\(wordRange\.getClientRects\(\)\)\.some\(rect =>\s*rect\.width && rect\.height && clientX >= rect\.left - 1 && clientX <= rect\.right \+ 1 &&\s*clientY >= rect\.top - 1 && clientY <= rect\.bottom \+ 1\)\) return null;"
replacement = "if (!isPointInRects(clientX, clientY, wordRange.getClientRects(), 2)) return null;"

code = re.sub(pattern, replacement, code)

with open('js/selection.js', 'w', encoding='utf-8') as f:
    f.write(code)
