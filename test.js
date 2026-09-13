const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:8080/test.html');
    
    // Evaluate the same logic
    const res = await page.evaluate(() => {
        const p = document.getElementById('target');
        const textNode = p.firstChild;
        const wordRange = document.createRange();
        wordRange.setStart(textNode, 0);
        wordRange.setEnd(textNode, 7); // "Charles"
        const rects = wordRange.getClientRects();
        return Array.from(rects).map(r => ({l: r.left, r: r.right, t: r.top, b: r.bottom}));
    });
    console.log(res);
    process.exit(0);
})();
