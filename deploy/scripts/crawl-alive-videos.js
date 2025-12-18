const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const url = 'https://www.sooplive.co.kr/station/pyh3646/catch?keyword=alive';
    console.log(`Navigating to ${url}...`);

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Scroll to load more videos (more aggressive)
    for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(2000);
    }
    await page.waitForTimeout(3000);

    // Extract video elements
    const videos = await page.evaluate(() => {
        const items = [];

        // Target all video links
        const videoLinks = document.querySelectorAll('a[href*="/player/"]');

        videoLinks.forEach((link, idx) => {
            const href = link.href;
            const match = href.match(/\/player\/(\d+)\//);
            if (match) {
                const videoId = match[1];
                const imgEl = link.querySelector('img');
                const titleEl = link.querySelector('span, div[class*="Title"], div[class*="Text"]');

                items.push({
                    index: idx + 1,
                    videoId: videoId,
                    title: titleEl?.textContent?.trim() || `Alive Video ${idx + 1}`,
                    link: href,
                    thumbnail: imgEl?.src || ''
                });
            }
        });

        return items;
    });

    console.log(`Found ${videos.length} video items:`);
    videos.forEach(v => {
        console.log(`${v.index}. ID: ${v.videoId} - ${v.title}`);
    });

    await browser.close();
})();
