const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function crawlCatchVideos() {
    console.log('Starting SOOP catch videos crawl...');

    const browser = await chromium.launch({
        headless: false // Set to true for production
    });

    try {
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        const page = await context.newPage();

        // Navigate to catch page
        console.log('Navigating to catch page...');
        await page.goto('https://www.sooplive.co.kr/station/pyh3646/catch?keyword=alive', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        // Wait for initial content
        await page.waitForTimeout(5000);

        // Scroll to load more videos
        console.log('Scrolling to load all videos...');
        let previousHeight = 0;
        let currentHeight = await page.evaluate(() => document.body.scrollHeight);
        let scrollAttempts = 0;
        const maxScrollAttempts = 10;

        while (previousHeight !== currentHeight && scrollAttempts < maxScrollAttempts) {
            previousHeight = currentHeight;
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(2000);
            currentHeight = await page.evaluate(() => document.body.scrollHeight);
            scrollAttempts++;
            console.log(`Scroll attempt ${scrollAttempts}, height: ${currentHeight}`);
        }

        // Scroll back to top to ensure all elements are in view
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(1000);

        // Extract video data
        console.log('Extracting video data...');
        const videos = await page.evaluate(() => {
            const results = [];

            // Try multiple selectors - SOOP uses various class names
            const selectors = [
                'a[href*="/catch/"]',
                'a[href*="vod.sooplive"]',
                '.video-list a',
                '.catch-list a',
                '[class*="CatchItem"]',
                '[class*="VideoItem"]',
                'div[class*="video"] a',
                'div[class*="catch"] a'
            ];

            let videoElements = new Set();

            // Collect all matching elements
            selectors.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => videoElements.add(el));
                } catch (e) {
                    console.log('Selector failed:', selector);
                }
            });

            console.log('Found total elements:', videoElements.size);

            videoElements.forEach((el, index) => {
                try {
                    // Get link
                    const link = el.href || '';

                    // Skip if not a catch video link
                    if (!link.includes('catch') && !link.includes('vod.sooplive')) {
                        return;
                    }

                    // Get title - try multiple approaches
                    let title = '';
                    const titleSelectors = [
                        el.querySelector('[class*="title"]'),
                        el.querySelector('[class*="Title"]'),
                        el.querySelector('h3'),
                        el.querySelector('h4'),
                        el.querySelector('p'),
                        el.querySelector('span')
                    ];

                    for (const titleEl of titleSelectors) {
                        if (titleEl && titleEl.textContent.trim()) {
                            title = titleEl.textContent.trim();
                            break;
                        }
                    }

                    if (!title) {
                        title = el.textContent?.trim() || `캐치 영상 ${results.length + 1}`;
                    }

                    // Get thumbnail
                    const imgEl = el.querySelector('img');
                    const thumbnailUrl = imgEl?.src || imgEl?.getAttribute('data-src') || imgEl?.getAttribute('data-lazy-src') || '';

                    // Extract member from title with more patterns
                    let member = '기타';
                    const titleLower = title.toLowerCase();

                    // 멤버별 키워드 매칭
                    if (title.includes('박진우') || title.includes('진우') || title.includes('JINU') ||
                        title.includes('Jinu') || title.includes('pyh') || titleLower.includes('jinu')) {
                        member = '박진우';
                    }
                    else if (title.includes('하온') || titleLower.includes('haon')) {
                        member = '하온';
                    }
                    else if (title.includes('금별') || titleLower.includes('geumbyeol')) {
                        member = '금별';
                    }
                    else if (title.includes('까망') || titleLower.includes('kkamang')) {
                        member = '까망';
                    }
                    else if (title.includes('운재쿤') || title.includes('운재') || titleLower.includes('unjae')) {
                        member = '운재쿤';
                    }
                    else if (title.includes('요하정') || title.includes('요하') || titleLower.includes('yoha')) {
                        member = '요하정';
                    }
                    else if (title.includes('최깨비') || title.includes('깨비') || titleLower.includes('kkaebi')) {
                        member = '최깨비';
                    }



                    if (link || thumbnailUrl || title !== `캐치 영상 ${results.length + 1}`) {
                        results.push({
                            id: `catch-${results.length}`,
                            title,
                            thumbnailUrl,
                            videoUrl: link,
                            member,
                            date: new Date().toISOString()
                        });
                    }
                } catch (e) {
                    console.error('Error parsing element:', e);
                }
            });

            return results;
        });

        console.log(`Found ${videos.length} videos`);

        // Save to file
        const dataDir = path.join(process.cwd(), 'data');
        await fs.mkdir(dataDir, { recursive: true });

        const outputFile = path.join(dataDir, 'catch-videos.json');
        await fs.writeFile(outputFile, JSON.stringify({
            timestamp: Date.now(),
            videos
        }, null, 2));

        console.log(`Saved ${videos.length} videos to ${outputFile}`);
        console.log('\nSample videos:');
        videos.slice(0, 3).forEach(v => {
            console.log(`- ${v.title}`);
            console.log(`  URL: ${v.videoUrl}`);
            console.log(`  Thumbnail: ${v.thumbnailUrl.substring(0, 50)}...`);
        });

    } catch (error) {
        console.error('Crawl error:', error);
    } finally {
        await browser.close();
    }
}

crawlCatchVideos();
