import re

with open('js/selection.js', 'r', encoding='utf-8') as f:
    code = f.read()

dist_util = """
// Утиліта для суворої перевірки: чи потрапляє клік дійсно у межі слова,
// а не у відступ (margin/padding) абзацу на рівні блоку.
function isPointInRects(clientX, clientY, rects, margin = 2) {
    for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (r.width && r.height &&
            clientX >= r.left - margin && clientX <= r.right + margin &&
            clientY >= r.top - margin && clientY <= r.bottom + margin) {
            return true;
        }
    }
    return false;
}
"""

code = code.replace("const IS_WORD_CH = (ch) => ch && /[\\p{L}\\p{N}'’-]/u.test(ch);", dist_util + "\nconst IS_WORD_CH = (ch) => ch && /[\\p{L}\\p{N}'’-]/u.test(ch);")

code = code.replace(
    "return { node, start: s, end: e };\n}",
    """const wBounds = { node, start: s, end: e };
    const rTest = document.createRange();
    rTest.setStart(wBounds.node, wBounds.start);
    rTest.setEnd(wBounds.endNode || wBounds.node, wBounds.end);
    if (!isPointInRects(clientX, clientY, rTest.getClientRects(), state.format === 'pdf' ? 10 : 2)) return null;
    return wBounds;
}"""
)

code = code.replace(
    "if (state.format !== 'pdf' && els.pages.contains(r.startContainer)) return reflowWordBounds(r.startContainer, r.startOffset);",
    """if (state.format !== 'pdf' && els.pages.contains(r.startContainer)) {
        const wBounds = reflowWordBounds(r.startContainer, r.startOffset);
        if (!wBounds) return null;
        const rTest = document.createRange();
        rTest.setStart(wBounds.node, wBounds.start);
        rTest.setEnd(wBounds.endNode || wBounds.node, wBounds.end);
        if (!isPointInRects(clientX, clientY, rTest.getClientRects(), 2)) return null;
        return wBounds;
    }"""
)

# Replace the manual hit logic in selectWordAtPoint
# Find: const rects = wordRange.getClientRects(); ... if (!hit) return null;
pattern = r"const rects = wordRange\.getClientRects\(\);[\s\S]*?if \(!hit\) return null;"
replacement = "if (!isPointInRects(clientX, clientY, wordRange.getClientRects(), state.format === 'pdf' ? 10 : 2)) return null;"
code = re.sub(pattern, replacement, code)

with open('js/selection.js', 'w', encoding='utf-8') as f:
    f.write(code)

