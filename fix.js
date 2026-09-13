const fs = require('fs');
let code = fs.readFileSync('js/selection.js', 'utf-8');

// We will add a strict distance check utility function at the top of selection.js
const distanceUtility = `
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
`;

// Insert the utility at the top
code = code.replace("const IS_WORD_CH = (ch) => ch && /[\\p{L}\\p{N}'’-]/u.test(ch);", distanceUtility + "\nconst IS_WORD_CH = (ch) => ch && /[\\p{L}\\p{N}'’-]/u.test(ch);");

// Now rewrite wordBoundsAt to use it!
code = code.replace(
    "return { node, start: s, end: e };\n}",
    `const wBounds = { node, start: s, end: e };
    const rTest = document.createRange();
    rTest.setStart(wBounds.node, wBounds.start);
    rTest.setEnd(wBounds.endNode || wBounds.node, wBounds.end);
    if (!isPointInRects(clientX, clientY, rTest.getClientRects(), state.format === 'pdf' ? 10 : 2)) return null;
    return wBounds;
}`
);

// In EPUB path of wordBoundsAt, reflowWordBounds is returned directly! We need to check it too!
code = code.replace(
    "if (state.format !== 'pdf' && els.pages.contains(r.startContainer)) return reflowWordBounds(r.startContainer, r.startOffset);",
    `if (state.format !== 'pdf' && els.pages.contains(r.startContainer)) {
        const wBounds = reflowWordBounds(r.startContainer, r.startOffset);
        if (!wBounds) return null;
        const rTest = document.createRange();
        rTest.setStart(wBounds.node, wBounds.start);
        rTest.setEnd(wBounds.endNode || wBounds.node, wBounds.end);
        if (!isPointInRects(clientX, clientY, rTest.getClientRects(), 2)) return null;
        return wBounds;
    }`
);

// Also rewrite the second path in selectWordAtPoint to use the strict check:
code = code.replace(
    /const rects = wordRange\.getClientRects\(\);[\s\S]*?if \(!hit\) return null;/g,
    `if (!isPointInRects(clientX, clientY, wordRange.getClientRects(), state.format === 'pdf' ? 10 : 2)) return null;`
);

fs.writeFileSync('js/selection.js', code);
