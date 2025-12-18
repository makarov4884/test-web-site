const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    const videoId = '180705391';
    const url = `https://vod.sooplive.co.kr/player/${videoId}/catch`;
    console.log(`Navigating to ${url}...`);

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    // Extract video URL from page
    const result = await page.evaluate(() => {
        // Try to find video element
        const videoEl = document.querySelector('video');
        console.log('Video element:', videoEl);

        if (videoEl) {
            console.log('Video src:', videoEl.src);
            console.log('Video currentSrc:', videoEl.currentSrc);
        }

        // Try to find m3u8 URL in page source
        const scripts = Array.from(document.querySelectorAll('script'));
        const m3u8Urls = [];

        for (const script of scripts) {
            const content = script.textContent || '';
            const matches = content.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/g);
            if (matches) {
                m3u8Urls.push(...matches);
            }
        }

        return {
            videoSrc: videoEl?.src || null,
            videoCurrentSrc: videoEl?.currentSrc || null,
            m3u8Urls: m3u8Urls,
            pageTitle: document.title
        };
    });

    console.log('Result:', JSON.stringify(result, null, 2));

    // Wait for user to inspect
    console.log('Waiting 10 seconds for inspection...');
    await page.waitForTimeout(10000);

    await browser.close();
})();
