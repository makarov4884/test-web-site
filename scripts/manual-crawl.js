/**
 * Manual Crawler Script - Fixed Ranking Selector
 * Run: node scripts/manual-crawl.js <bjId>
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const CACHE_FILE = path.join(process.cwd(), 'data', 'stats-cache.json');

async function crawlBJ(bjId) {
    console.log(`[Manual Crawl] Starting crawl for ${bjId}...`);

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1600, height: 1200 });

        // Crawl SOOP
        console.log('Fetching SOOP data...');
        await page.goto(`https://www.sooplive.co.kr/station/${bjId}/board`, {
            waitUntil: 'domcontentloaded',
            timeout: 15000
        });

        const soopData = await page.evaluate(() => {
            const results = {};
            const img = document.querySelector('.station_logo img, #station_logo img');
            if (img?.src) results.profileImage = img.src;

            const nameEl = document.querySelector('.station_name .nick, h1');
            if (nameEl) results.name = nameEl.textContent?.trim();

            return results;
        });

        // Crawl Bcraping
        console.log('Fetching Bcraping data...');
        await page.goto(`https://bcraping.kr/monitor/${bjId}`, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait for stats to load
        try {
            console.log('Waiting for stats elements...');
            await page.waitForSelector('[data-totalballon]', { visible: true, timeout: 15000 });
            await new Promise(r => setTimeout(r, 2000));
        } catch (e) {
            console.warn('Timeout waiting for stats, proceeding anyway...');
        }

        const bcrapingData = await page.evaluate(() => {
            const getTxt = (sel) => {
                const el = document.querySelector(sel);
                return el ? el.textContent?.trim().replace(/[^0-9,.]/g, '') || '' : '';
            };

            const getByLabel = (label) => {
                try {
                    // Find all elements containing the label text
                    const elements = Array.from(document.querySelectorAll('*'));
                    const labelEl = elements.find(el =>
                        el.children.length === 0 &&
                        el.textContent?.includes(label)
                    );

                    if (!labelEl) return '';

                    // 1. Check direct siblings (next)
                    let sibling = labelEl.nextElementSibling;
                    if (sibling && /[0-9]/.test(sibling.textContent || '')) {
                        return sibling.textContent?.replace(/[^0-9,]/g, '') || '';
                    }

                    // 2. Check parent's next sibling
                    if (labelEl.parentElement?.nextElementSibling) {
                        const pSibling = labelEl.parentElement.nextElementSibling;
                        if (/[0-9]/.test(pSibling.textContent || '')) {
                            return pSibling.textContent?.replace(/[^0-9,]/g, '') || '';
                        }
                    }

                    // 3. Check Parent's other children
                    if (labelEl.parentElement) {
                        const children = Array.from(labelEl.parentElement.children);
                        const valNode = children.find(c => c !== labelEl && /[0-9]/.test(c.textContent || ''));
                        if (valNode) return valNode.textContent?.replace(/[^0-9,]/g, '') || '';
                    }
                } catch (e) {
                    return '';
                }
                return '';
            };

            return {
                broadcastTime: getTxt('[data-broadcast-time]') || getByLabel('월별 방송 시간'),
                avgViewers: getTxt('[data-avg-viewer]') || getByLabel('평균 시청자'),
                maxViewers: getTxt('[data-max-viewer]') || getByLabel('최고 시청자'),
                chatParticipation: getTxt('[data-chat-participation-rate]') || getByLabel('참여율'),
                totalStar: getTxt('[data-totalballon]') || getByLabel('누적 별풍선'),
                totalBroadcast: getTxt('[data-total-broadcast-time]') || getByLabel('누적 방송 시간'),
                fanCount: getTxt('[data-fan-cnt]') || getByLabel('팬클럽 수'),
                totalViewCnt: getTxt('[data-total-view-cnt]') || getByLabel('누적 시청자')
            };
        });

        // Extract Ranking Data
        console.log('Extracting ranking data...');
        let rankingList = [];

        try {
            // Click 랭킹 tab
            const clicked = await page.evaluate(() => {
                const elements = Array.from(document.querySelectorAll('button, a, li, span'));
                const target = elements.find(el => el.textContent?.trim() === '랭킹');
                if (target) {
                    target.click();
                    return true;
                }
                return false;
            });

            if (clicked) {
                console.log('✓ Clicked 랭킹 tab, waiting 5 seconds for data to load...');
                await new Promise(r => setTimeout(r, 5000)); // Increased to 5 seconds
            }

            // Wait for content to load
            await page.waitForSelector('#rank-tab-container', { timeout: 5000 }).catch(() => { });

            // Extract ranking - try ALL possible table selectors
            rankingList = await page.evaluate(() => {
                // Try different selectors in order of preference
                const selectors = [
                    '#rank-tab-container tbody tr',
                    '#rank-tab-container table tr',
                    '#rank-tab-container tr',
                    'div[style*="display: block"] tbody tr',
                    'div[style*="display: block"] table tr'
                ];

                let rows = [];
                for (const selector of selectors) {
                    rows = Array.from(document.querySelectorAll(selector));
                    if (rows.length > 0) {
                        console.log(`Found ${rows.length} rows with: ${selector}`);
                        break;
                    }
                }

                if (rows.length === 0) {
                    console.log('No rows found with any selector');
                    return [];
                }

                return rows.map((row, index) => {
                    const cols = row.querySelectorAll('td, div[class*="col"]');

                    // Skip header rows
                    if (cols.length < 3) return null;

                    // Extract text from columns
                    const colTexts = Array.from(cols).map(c => c.textContent?.trim() || '');

                    // Try to find name (usually second column)
                    let name = colTexts[1] || 'Unknown';

                    // Try to find count (후원횟수)
                    let count = 0;
                    let stars = '0';
                    let monthlyTotal = '0';

                    // Parse numbers from columns
                    for (let i = 2; i < colTexts.length; i++) {
                        const text = colTexts[i].replace(/,/g, '');
                        if (/^\d+$/.test(text)) {
                            if (count === 0) {
                                count = parseInt(text);
                            } else if (stars === '0') {
                                stars = colTexts[i]; // Keep formatted
                            } else if (monthlyTotal === '0') {
                                monthlyTotal = colTexts[i];
                            }
                        }
                    }

                    return {
                        rank: index + 1,
                        name: name,
                        id: '',
                        count: count,
                        stars: stars,
                        monthlyTotal: monthlyTotal || stars
                    };
                }).filter(item => item !== null && item.name !== 'Unknown');
            });

            if (rankingList.length > 0) {
                console.log(`✅ Extracted ${rankingList.length} ranking entries`);
                console.log('Sample:', rankingList[0]);
            } else {
                console.log('⚠️  No ranking data extracted');
            }

        } catch (rankErr) {
            console.warn('❌ Ranking error:', rankErr.message);
        }

        const stats = {
            bjId,
            name: soopData.name || bjId,
            profileImage: soopData.profileImage || `https://stimg.sooplive.co.kr/LOGO/${bjId.slice(0, 2)}/${bjId}/m/${bjId}.webp`,
            subscribers: '-',
            fans: '-',
            totalViewers: '-',
            lastUpdated: new Date().toISOString(),
            ...bcrapingData,
            rankingList: rankingList.length > 0 ? rankingList : undefined
        };

        // Save
        let cache = {};
        try {
            const data = await fs.readFile(CACHE_FILE, 'utf-8');
            cache = JSON.parse(data);
        } catch (e) {
            await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
        }

        cache[bjId] = stats;
        await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));

        console.log(`[Manual Crawl] ✅ Success! Data saved for ${bjId}`);
        console.log(stats);

    } catch (error) {
        console.error('[Manual Crawl] ❌ Error:', error);
    } finally {
        await browser.close();
    }
}

// Run
const bjId = process.argv[2];
if (!bjId) {
    console.error('Usage: node scripts/manual-crawl.js <bjId>');
    process.exit(1);
}

crawlBJ(bjId).then(() => process.exit(0));
