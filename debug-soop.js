const puppeteer = require('puppeteer');

async function inspectPage() {
    // Target URL (one of the failing ones)
    const url = 'https://www.sooplive.co.kr/station/sky0525m/board/114444133';

    console.log(`Inspecting ${url}...`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 5000)); // Wait for render

        // Dump simplified structure
        const structure = await page.evaluate(() => {
            // Try to find list container
            const potentialLists = document.querySelectorAll('ul, div[class*="list"], div[class*="List"]');
            const results = [];

            potentialLists.forEach((list, i) => {
                if (list.children.length > 3) { // Likely a real list
                    const sample = list.children[0];
                    results.push({
                        listTag: list.tagName,
                        listClass: list.className,
                        childTag: sample.tagName,
                        childClass: sample.className,
                        childHTML: sample.outerHTML.substring(0, 200) // First 200 chars
                    });
                }
            });
            return results;
        });

        console.log('Structure found:', JSON.stringify(structure, null, 2));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
}

inspectPage();
