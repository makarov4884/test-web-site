const puppeteer = require('puppeteer');

async function debugBcraping() {
    const browser = await puppeteer.launch({
        headless: false, // See what's happening
        args: ['--no-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1200 });

    console.log('Navigating to Bcraping...');
    await page.goto('https://bcraping.kr/monitor/pyh3646', {
        waitUntil: 'networkidle2',
        timeout: 30000
    });

    console.log('Waiting 3 seconds...');
    await new Promise(r => setTimeout(r, 3000));

    // Check for ranking tab
    const tabs = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('button, a, li, span, div'));
        return elements
            .filter(el => el.textContent?.trim().length > 0 && el.textContent.trim().length < 20)
            .map(el => el.textContent?.trim())
            .filter((text, index, self) => self.indexOf(text) === index)
            .slice(0, 30);
    });

    console.log('\nAvailable tabs:', tabs);

    // Try clicking ranking
    const clicked = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('button, a, li, span'));
        const target = elements.find(el => el.textContent?.trim() === '랭킹');
        if (target) {
            target.click();
            return true;
        }
        return false;
    });

    console.log('Clicked 랭킹 tab:', clicked);

    await new Promise(r => setTimeout(r, 3000));

    // Check for table
    const tableInfo = await page.evaluate(() => {
        const container = document.querySelector('#rank-tab-container');
        const table = document.querySelector('#rank-tab-container table');
        const rows = document.querySelectorAll('#rank-tab-container table tbody tr');

        // Try alternative selectors
        const allTables = document.querySelectorAll('table');
        const allRows = document.querySelectorAll('tr');

        return {
            hasContainer: !!container,
            hasTable: !!table,
            rowsInRankContainer: rows.length,
            totalTables: allTables.length,
            totalRows: allRows.length,
            containerHTML: container ? container.innerHTML.substring(0, 500) : 'not found'
        };
    });

    console.log('\nTable info:', tableInfo);

    // Take screenshot
    await page.screenshot({ path: 'debug-bcraping-live.png', fullPage: true });
    console.log('\nScreenshot saved: debug-bcraping-live.png');

    console.log('\nPress Ctrl+C to close...');
    await new Promise(r => setTimeout(r, 60000));

    await browser.close();
}

debugBcraping().catch(console.error);
