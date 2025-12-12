const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({
        headless: true, // headless: "new" is deprecated
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const bjId = 'pyh3646';
    const url = `https://bcraping.kr/monitor/${bjId}`;

    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Dump all buttons/links text to find the "Stats" tab
    console.log('Extracting tab candidates...');
    const buttons = await page.evaluate(() => {
        const candidates = [];
        document.querySelectorAll('button, a, li, div[role="button"]').forEach(el => {
            const text = el.textContent.trim();
            if (text.includes('통계') || text.includes('랭킹') || text.includes('모아보기')) {
                candidates.push({
                    tag: el.tagName,
                    text: text,
                    class: el.className,
                    outerHTML: el.outerHTML.substring(0, 200) // Truncate for readability
                });
            }
        });
        return candidates;
    });

    console.log('Found candidates:', JSON.stringify(buttons, null, 2));

    await browser.close();
})();
