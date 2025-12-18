const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Target URL: Park Jin-woo Main Station
    const url = 'https://www.sooplive.co.kr/station/pyh3646';
    console.log(`Navigating to ${url}...`);

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    const links = await page.$$eval('a', as => as.map(a => a.href).filter(h => h.includes('/board/')));
    console.log('Found Board Links:', [...new Set(links)]);

    // Find elements containing "공지"
    const matches = await page.evaluate(() => {
        const results = [];
        const elements = document.querySelectorAll('div, li, span, strong, p, a');
        elements.forEach(el => {
            if (el.textContent && el.textContent.includes('공지') && el.children.length === 0) {
                // Check hierarchy
                let current = el;
                let path = [];
                while (current && current.tagName !== 'BODY' && path.length < 5) {
                    path.push(`${current.tagName}.${current.className}`);
                    current = current.parentElement;
                }
                results.push({ text: el.textContent.trim(), path: path.join(' < ') });
            }
        });
        return results;
    });

    console.log('Matches for "공지":', matches.slice(0, 5));

    await browser.close();
})();
