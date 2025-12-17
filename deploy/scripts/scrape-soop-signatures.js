const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TARGET_URL = 'https://www.sooplive.co.kr/station/pyh3646/catch?keyword=alive';
const DATA_FILE = path.join(__dirname, '..', 'data', 'signatures.json');

(async () => {
    console.log('Starting scraper for:', TARGET_URL);
    const browser = await chromium.launch({ headless: true }); // Headless true for speed, change to false if debugging needed
    const page = await browser.newPage();

    try {
        await page.goto(TARGET_URL, { waitUntil: 'networkidle' });

        // Wait a bit
        await page.waitForTimeout(5000);

        await page.screenshot({ path: 'soop-debug.png' });

        // Extract using simpler selectors
        const extractedVideos = await page.evaluate(() => {
            const results = [];
            // Find all anchor tags with player link
            const links = Array.from(document.querySelectorAll('a[href*="/station/"][href*="/catch/player/"], a[href*="/video/"], a[href*="/player/"]'));

            links.forEach(link => {
                const href = link.href;
                let title = "";
                let container = link;

                // Traverse up to find a container that might have the title
                // We look for p tags with "Title-module__title" class
                for (let i = 0; i < 4; i++) {
                    if (!container) break;

                    // 1. Try Specific User provided class part
                    const titleEl = container.querySelector('p[class*="Title-module__title"]');
                    if (titleEl) {
                        title = titleEl.textContent.trim();
                        break;
                    }

                    // 2. Try generic P tag if it looks like a title (non-empty, not date)
                    // This is risky, but if we are in a small item container...
                    // Let's rely on the class mainly.

                    container = container.parentElement;
                }

                if (!title) title = link.textContent.trim() || "Untitled";

                // Extract ID
                const match = href.match(/\/player\/(\d+)/);
                if (match) {
                    const id = match[1];
                    if (!results.some(r => r.id === parseInt(id))) {
                        results.push({
                            id: parseInt(id),
                            title: title,
                            videoUrl: `https://vod.sooplive.co.kr/player/${id}/embed`,
                            thumbnailUrl: '',
                            rawDate: null
                        });
                    }
                }
            });
            return results;
        });

        console.log(`Found ${extractedVideos.length} videos.`);

        // Read existing data
        let existingData = [];
        if (fs.existsSync(DATA_FILE)) {
            existingData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        }

        // Merge and Format
        // We need to map to: { id, title, isNew, category, videoUrl }
        // We will treat these imports as category 'All' or maybe 'SoopCatch' if we want to distinguish?
        // User asked to "put into festival page", existing categories are '1000', '2000' etc based on number?
        // Existing IDs are small numbers (1005, 1004...). Soop IDs are large (e.g. 1293123).
        // This won't conflict. We can map them to 'All'.

        let newCount = 0;
        const now = new Date();
        const oneWeekAgo = new Date(now.setDate(now.getDate() - 7));

        extractedVideos.forEach(vid => {
            // Check if exists
            if (!existingData.some(e => e.id === vid.id)) {
                // Determine isNew
                let isNew = false;
                if (vid.rawDate) {
                    if (vid.rawDate.includes('분 전') || vid.rawDate.includes('시간 전') || vid.rawDate.includes('일 전')) {
                        // "1 day ago", check if < 7 days
                        const dayMatch = vid.rawDate.match(/(\d+)일/);
                        if (dayMatch) {
                            const days = parseInt(dayMatch[1]);
                            if (days <= 7) isNew = true;
                        } else {
                            // hours/mins ago -> new
                            isNew = true;
                        }
                    } else if (vid.rawDate.match(/\d{4}\.\d{2}\.\d{2}/)) {
                        // YYYY.MM.DD
                        const parts = vid.rawDate.split('.');
                        const d = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
                        if (d > oneWeekAgo) isNew = true;
                    }
                }

                existingData.push({
                    id: vid.id,
                    title: vid.title,
                    isNew: isNew,
                    category: 'All', // Default category
                    videoUrl: vid.videoUrl
                });
                newCount++;
            }
        });

        if (newCount > 0) {
            fs.writeFileSync(DATA_FILE, JSON.stringify(existingData, null, 2), 'utf-8');
            console.log(`Added ${newCount} new signatures.`);
        } else {
            console.log('No new videos to add.');
        }

    } catch (e) {
        console.error('Error scraping:', e);
    } finally {
        await browser.close();
    }
})();
