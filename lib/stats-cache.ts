import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';

const CACHE_FILE = path.join(process.cwd(), 'data', 'stats-cache.json');
const CRAWLER_URLS_FILE = path.join(process.cwd(), 'data', 'crawler-urls.json');

// Shorten cache duration to 1 hour as requested
const CACHE_DURATION = 60 * 60 * 1000;

export interface StreamerStats {
    bjId: string;
    name: string;
    profileImage: string;
    subscribers: string;
    fans: string;
    totalViewers: string;
    lastUpdated: string;
    // Specific parsed fields from bcraping HTML
    avgViewers?: string;
    chatParticipation?: string;
    totalStar?: string; // data-totalballon
    totalBroadcast?: string; // data-total-broadcast-time
    fanCount?: string; // data-fan-cnt
    totalViewCnt?: string; // data-total-view-cnt
    screenshotUrl?: string; // Cache the screenshot path
    screenshotOverview?: string;
    screenshotRanking?: string;
    screenshotStats?: string;
    // Additional parsed stats from Bcraping
    dailyStar?: string;
    monthlyStar?: string;
    rank?: string;
    broadcastTime?: string;
    maxViewers?: string;
}

async function ensureCacheFile() {
    try {
        await fs.access(CACHE_FILE);
    } catch {
        // Create empty cache if not exists
        await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
        await fs.writeFile(CACHE_FILE, '{}', 'utf-8');
    }
}

async function readCache(): Promise<Record<string, StreamerStats>> {
    await ensureCacheFile();
    const data = await fs.readFile(CACHE_FILE, 'utf-8');
    return JSON.parse(data || '{}');
}

async function writeCache(data: Record<string, StreamerStats>) {
    await fs.writeFile(CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Global lock to prevent memory explosion from multiple browser launches
let isCrawling = false;

export async function getStreamerStats(bjId: string, forceRefresh: boolean = false): Promise<StreamerStats> {
    // 1. Try to read from cache first
    let cached: StreamerStats | undefined;
    try {
        const cache = await readCache();
        cached = cache[bjId];
    } catch (e) {
        console.warn(`[StatsCrawler] Failed to read cache for ${bjId}`, e);
    }

    const now = Date.now();
    // Use cached data if valid and not forcing refresh
    if (!forceRefresh && cached && cached.lastUpdated && (now - new Date(cached.lastUpdated).getTime() < CACHE_DURATION)) {
        return cached;
    }

    // 2. If cache expired/missing or forcing refresh, try to crawl
    // BUT only if not already crawling to prevent OOM
    if (isCrawling) {
        console.log(`[StatsCrawler] Crawl already in progress. Returning cached/default for ${bjId} to prevent crash.`);
        return cached || createDefaultStats(bjId);
    }

    try {
        isCrawling = true;
        console.log(`[StatsCrawler] ${forceRefresh ? 'Force refreshing' : 'Cache expired or missing for'} ${bjId}. Crawling new stats...`);
        const newStats = await crawlStats(bjId);

        // Save to cache
        try {
            const cache = await readCache();
            cache[bjId] = newStats;
            await writeCache(cache);
            console.log(`[StatsCrawler] ✅ Saved new stats for ${bjId}`);
        } catch (e) {
            console.error(`[StatsCrawler] Failed to save cache for ${bjId}`, e);
        }

        return newStats;
    } catch (error) {
        console.error(`[StatsCrawler] Error in getStreamerStats:`, error);
        // Fallback to cache or default on ANY error
        return cached || createDefaultStats(bjId);
    } finally {
        isCrawling = false;
    }
}

function createDefaultStats(bjId: string): StreamerStats {
    return {
        bjId,
        name: bjId,
        profileImage: `https://stimg.sooplive.co.kr/LOGO/${bjId.slice(0, 2)}/${bjId}/m/${bjId}.webp`,
        subscribers: '-',
        fans: '-',
        totalViewers: '-',
        lastUpdated: new Date().toISOString()
    };
}

async function crawlStats(bjId: string): Promise<StreamerStats> {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            // '--single-process', // REMOVED: Unstable
            '--disable-features=site-per-process',
            '--disable-extensions',
            '--ignore-certificate-errors'
        ]
    });

    // Default stats
    const stats: StreamerStats = {
        bjId,
        name: bjId,
        profileImage: `https://stimg.sooplive.co.kr/LOGO/${bjId.slice(0, 2)}/${bjId}/m/${bjId}.webp`,
        subscribers: '0',
        fans: '0',
        totalViewers: '0',
        lastUpdated: new Date().toISOString()
    };

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1600, height: 1200 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // 1. SOOP: Get Basic Profile Info
        try {
            console.log(`[StatsCrawler] Fetching SOOP info for ${bjId}`);
            await page.goto(`https://www.sooplive.co.kr/station/${bjId}/board`, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await page.waitForSelector('#station_logo', { timeout: 5000 }).catch(() => { });

            const soopData = await page.evaluate(() => {
                const results: any = {};
                const img = document.querySelector('.station_logo img, #station_logo img, .bj_profile img') as HTMLImageElement;
                if (img && img.src) results.profileImage = img.src;

                const nameEl = document.querySelector('.station_name .nick, h1, .bj_name');
                if (nameEl) results.name = nameEl.textContent?.trim();

                const textNodes = Array.from(document.querySelectorAll('.st_text, .my_station_info div, dt, dd'));
                textNodes.forEach(el => {
                    const text = el.textContent || '';
                    if (text.includes('애청자')) results.subscribers = text.replace(/[^0-9,]/g, '');
                    if (text.includes('팬클럽')) results.fans = text.replace(/[^0-9,]/g, '');
                });
                return results;
            });

            if (soopData.profileImage) stats.profileImage = soopData.profileImage;
            if (soopData.name) stats.name = soopData.name;
            if (soopData.subscribers) stats.subscribers = soopData.subscribers;
            if (soopData.fans) stats.fans = soopData.fans;

        } catch (e) {
            console.warn(`[StatsCrawler] SOOP crawl warning:`, e);
        }

        // 2. Bcraping: Get Screenshot & Extract Detailed Stats
        try {
            console.log(`[StatsCrawler] Accessing Bcraping for ${bjId}...`);

            // Determine Target URL
            let targetUrl = `https://bcraping.kr/monitor/${bjId}`;
            try {
                // Check if custom URL exists in crawler-urls.json
                const configExists = await fs.access(CRAWLER_URLS_FILE).then(() => true).catch(() => false);
                if (configExists) {
                    const configData = await fs.readFile(CRAWLER_URLS_FILE, 'utf-8');
                    const config = JSON.parse(configData);

                    // Handle array format [{streamer_id: "...", url: "..."}]
                    if (Array.isArray(config)) {
                        const match = config.find((item: any) => item.streamer_id === bjId);
                        if (match && match.url) {
                            targetUrl = match.url;
                            console.log(`[StatsCrawler] Using custom URL for ${bjId}: ${targetUrl}`);
                        }
                    } else if (config[bjId]) {
                        // Fallback to key-value if user reverts format
                        targetUrl = config[bjId];
                        console.log(`[StatsCrawler] Using custom URL for ${bjId}: ${targetUrl}`);
                    }
                }
            } catch (configErr) {
                console.warn('[StatsCrawler] Config read warning', configErr);
            }

            await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

            // Wait a bit for dynamic content
            await new Promise(r => setTimeout(r, 3000));

            // Helper: Click Tab by Text (Robust)
            const clickTab = async (searchText: string) => {
                try {
                    const found = await page.evaluate((text) => {
                        const elements = Array.from(document.querySelectorAll('a, button, li, span, div.tab'));
                        const target = elements.find(el => el.textContent?.trim() === text);
                        if (target) {
                            (target as HTMLElement).click();
                            return true;
                        }
                        return false;
                    }, searchText);
                    return found;
                } catch (e) {
                    console.log(`[StatsCrawler] Click tab '${searchText}' failed:`, e);
                    return false;
                }
            };

            // Helper: Force Show Tab via DOM (Fallback)
            const forceShowTab = async (containerId: string) => {
                try {
                    await page.evaluate((id) => {
                        const tabs = document.querySelectorAll('.bc-tab-item');
                        tabs.forEach((el: any) => el.style.display = 'none');
                        const target = document.getElementById(id);
                        if (target) target.style.display = 'block';
                    }, containerId);

                    // Wait for any internal animations
                    await new Promise(r => setTimeout(r, 1000));
                    return true;
                } catch (e) {
                    console.log(`[StatsCrawler] Force show tab failed for ${containerId}:`, e);
                    return false;
                }
            };

            // Helper: Discover Stats Tab ID if unknown
            const findStatsTabId = async () => {
                return await page.evaluate(() => {
                    const tabs = Array.from(document.querySelectorAll('.bc-tab-item'));
                    // Find one that is NOT summation or rank
                    const statsTab = tabs.find(el => !el.id.includes('summation') && !el.id.includes('rank'));
                    return statsTab ? statsTab.id : 'statistics-tab-container'; // fallback
                });
            };

            // Helper: Capture screenshot and return URL
            const capture = async (name: string) => {
                const publicDir = path.join(process.cwd(), 'public');
                const imagesDir = path.join(publicDir, 'stats-images');
                await fs.mkdir(imagesDir, { recursive: true });

                const imageFileName = `${bjId}-${name}.png`;
                const imagePath = path.join(imagesDir, imageFileName);
                await page.screenshot({ path: imagePath, fullPage: true });
                return `/stats-images/${imageFileName}?t=${Date.now()}`;
            };

            // Wait specifically for the stats elements to appear
            try {
                await page.waitForSelector('[data-totalballon]', { visible: true, timeout: 15000 });
                // Additional wait to ensure text is populated (sometimes elements appear before text)
                await new Promise(r => setTimeout(r, 2000));
            } catch (e) {
                console.warn('[StatsCrawler] Timeout waiting for data-totalballon selector');
            }

            // A. Extract Text Data
            const textStats = await page.evaluate(() => {
                const getTxt = (sel: string) => {
                    const el = document.querySelector(sel);
                    return el ? el.textContent?.trim().replace(/[^0-9,.]/g, '') || '' : '';
                };

                const getByLabel = (label: string) => {
                    try {
                        // Find all elements containing the label text
                        const elements = Array.from(document.querySelectorAll('*'));
                        const labelEl = elements.find(el =>
                            el.children.length === 0 && // Leaf node
                            el.textContent?.includes(label)
                        );

                        if (!labelEl) return '';

                        // Strategies to find the value associated with the label

                        // 1. Check direct siblings (next)
                        let sibling = labelEl.nextElementSibling;
                        if (sibling && /[0-9]/.test(sibling.textContent || '')) {
                            return sibling.textContent?.replace(/[^0-9,]/g, '') || '';
                        }

                        // 2. Check parent's next sibling (common in grid layouts)
                        if (labelEl.parentElement?.nextElementSibling) {
                            const pSibling = labelEl.parentElement.nextElementSibling;
                            if (/[0-9]/.test(pSibling.textContent || '')) {
                                return pSibling.textContent?.replace(/[^0-9,]/g, '') || '';
                            }
                        }

                        // 3. Check Parent's other children (if wrapper contains both)
                        if (labelEl.parentElement) {
                            const children = Array.from(labelEl.parentElement.children);
                            const valNode = children.find(c => c !== labelEl && /[0-9]/.test(c.textContent || ''));
                            if (valNode) return valNode.textContent?.replace(/[^0-9,]/g, '') || '';
                        }

                        // 4. Grandparent search (Card layout: Title in Header, Value in Body)
                        // This is risky but useful. Limit depth.
                    } catch (e) {
                        return '';
                    }
                    return '';
                };

                return {
                    // Top Stats Cards (Monthly usually)
                    broadcastTime: getTxt('[data-broadcast-time]') || getByLabel('월별 방송 시간'),
                    avgViewers: getTxt('[data-avg-viewer]') || getByLabel('평균 시청자'),
                    maxViewers: getTxt('[data-max-viewer]') || getByLabel('최고 시청자'),
                    chatParticipation: getTxt('[data-chat-participation-rate]') || getByLabel('참여율'),

                    // Broadcast Summary (Bottom)
                    totalStar: getTxt('[data-totalballon]') || getByLabel('누적 별풍선'),
                    totalBroadcast: getTxt('[data-total-broadcast-time]') || getByLabel('누적 방송 시간'),
                    fanCount: getTxt('[data-fan-cnt]') || getByLabel('팬클럽 수'),
                    totalViewCnt: getTxt('[data-total-view-cnt]') || getByLabel('누적 시청자')
                };
            });
            Object.assign(stats, textStats);

            // B. Capture Overview (summation-tab-container)
            try {
                await forceShowTab('summation-tab-container');
                // Wait specifically for the chart or top stats to be ready
                await page.waitForSelector('#summation-tab-container [data-broadcast-time]', { timeout: 3000 }).catch(() => { });
                stats.screenshotOverview = await capture('overview');
            } catch (e) {
                console.warn('[StatsCrawler] Overview Capture Warning:', e);
            }

            // C. Capture Ranking (rank-tab-container)
            try {
                await forceShowTab('rank-tab-container');
                await page.waitForSelector('#rank-tab-container .rank-top-user', { timeout: 3000 }).catch(() => { });
                stats.screenshotRanking = await capture('ranking');
            } catch (e) {
                console.warn('[StatsCrawler] Ranking Capture Warning:', e);
            }

            // D. Capture Stats (Unknown ID, discover it)
            try {
                const statsTabId = await findStatsTabId();
                await forceShowTab(statsTabId);
                await new Promise(r => setTimeout(r, 1500));
                stats.screenshotStats = await capture('stats');
            } catch (e) {
                console.warn('[StatsCrawler] Stats Capture Warning:', e);
            }

            // E. Extract other stats that might not have data attributes (e.g., daily/monthly stars, rank)
            const bcrapingData = await page.evaluate(() => {
                const results: any = {};
                const elements = Array.from(document.querySelectorAll('div, span, p, h3, h4, strong, b'));

                elements.forEach(el => {
                    const text = el.textContent?.trim() || '';

                    // Daily Star (오늘 별풍선)
                    if ((text.includes('오늘') || text.includes('금일')) && text.includes('별풍선')) {
                        const next = el.nextElementSibling?.textContent?.trim();
                        if (next && /[\d,]+/.test(next)) {
                            results.dailyStar = next.replace(/[^0-9,]/g, '');
                        } else {
                            const match = text.match(/[\d,]+개/);
                            if (match) results.dailyStar = match[0].replace(/[^0-9,]/g, '');
                        }
                    }

                    // Monthly Star (이번달/월간)
                    if ((text.includes('이번달') || text.includes('월간')) && text.includes('별풍선') && !results.monthlyStar) {
                        const next = el.nextElementSibling?.textContent?.trim();
                        if (next && /[\d,]+/.test(next)) {
                            results.monthlyStar = next.replace(/[^0-9,]/g, '');
                        }
                    }

                    // Rank
                    if ((text.includes('랭킹') || text.includes('순위')) && !results.rank) {
                        const next = el.nextElementSibling?.textContent?.trim();
                        if (next) results.rank = next.replace(/[^0-9,]/g, '');
                    }
                });
                return results;
            });

            if (bcrapingData.dailyStar) stats.dailyStar = bcrapingData.dailyStar;
            if (bcrapingData.monthlyStar) stats.monthlyStar = bcrapingData.monthlyStar;
            if (bcrapingData.rank) stats.rank = bcrapingData.rank;
            if (bcrapingData.broadcastTime) stats.broadcastTime = bcrapingData.broadcastTime;
            if (bcrapingData.maxViewers) stats.maxViewers = bcrapingData.maxViewers;

            // Capture Screenshot
            const publicDir = path.join(process.cwd(), 'public');
            const imagesDir = path.join(publicDir, 'stats-images');
            await fs.mkdir(imagesDir, { recursive: true });

            const imageFileName = `${bjId}.png`;
            const imagePath = path.join(imagesDir, imageFileName);
            await page.screenshot({ path: imagePath, fullPage: true });

            // Use timestamp to force image refresh
            stats.screenshotUrl = `/stats-images/${imageFileName}?t=${Date.now()}`;

        } catch (e) {
            console.error(`[StatsCrawler] Bcraping capture failed:`, e);
        }

    } catch (error) {
        console.error(`[StatsCrawler] Fatal error:`, error);
    } finally {
        if (browser) await browser.close();
    }

    return stats;
}
