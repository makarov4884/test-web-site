
const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        const url = 'https://bcraping.kr/monitor/danang1004';
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait a bit
        await new Promise(r => setTimeout(r, 5000));

        const html = await page.content();
        fs.writeFileSync('debug-page.html', html);
        console.log('HTML saved to debug-page.html');

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
