const puppeteer = require('puppeteer');

(async () => {
    console.log('Starting scrape test...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        await page.goto('https://www.sooplive.co.kr/station/pyh3646/catch?keyword=alive', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait for list
        try {
            await page.waitForSelector('ul li div a.thumb', { timeout: 5000 });
        } catch (e) {
            console.log("Selector not found immediately.");
        }

        const videos = await page.evaluate(() => {
            const items = document.querySelectorAll('li');
            const results = [];

            items.forEach((item) => {
                const titleEl = item.querySelector('.title, .tit');
                const thumbEl = item.querySelector('a.thumb');

                if (titleEl && thumbEl) {
                    const title = titleEl.textContent.trim();
                    if (title.toLowerCase().includes('alive')) {
                        results.push(title);
                    }
                }
            });
            return results;
        });

        console.log('Found videos:', videos);

        // Extract members
        const members = new Set();
        videos.forEach(title => {
            const match = title.match(/\[(.*?)\]/g);
            if (match && match.length >= 2) {
                const first = match[0].replace(/[\[\]]/g, '');
                const second = match[1].replace(/[\[\]]/g, '');
                let member = first !== '캐치' ? first : second;
                // cleaner
                member = member.split(' ')[0];
                members.add(member);
            }
        });

        console.log('Extracted Members:', Array.from(members));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
