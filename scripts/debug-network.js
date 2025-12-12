
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        page.on('response', async response => {
            const url = response.url();
            if (url.includes('api') || url.includes('json') || response.request().resourceType() === 'xhr' || response.request().resourceType() === 'fetch') {
                try {
                    const text = await response.text();
                    if (text.includes('1,725,184') || text.includes('1725184') || text.includes('4,200') || text.includes('4404') || text.includes('443658')) {
                        console.log(`[FOUND DATA] URL: ${url}`);
                        console.log(`[DATA PREVIEW] ${text.substring(0, 500)}`);
                    }
                } catch (e) {
                    // ignore
                }
            }
        });

        const url = 'https://bcraping.kr/monitor/danang1004';
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

        await new Promise(r => setTimeout(r, 5000));

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
