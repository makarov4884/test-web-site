import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

// Singleton pattern for Puppeteer browser
let globalBrowser: any = null;

async function getBrowser() {
    if (globalBrowser) {
        try {
            // Check if browser is still connected
            if (globalBrowser.isConnected()) return globalBrowser;
        } catch (e) {
            console.log('[Bcraping Proxy] ⚠️ Browser disconnected, relaunching...');
        }
    }

    // @ts-ignore
    if (global.puppeteerBrowser && global.puppeteerBrowser.isConnected()) {
        // @ts-ignore
        return global.puppeteerBrowser;
    }

    console.log('[Bcraping Proxy] 🚀 Launching new browser instance...');
    globalBrowser = await puppeteer.launch({
        headless: true, // Keep headless for server environment
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-extensions',
            '--no-first-run',
            '--no-zygote',
            '--disable-features=site-per-process',
            '--disable-accelerated-2d-canvas',
            '--window-size=1920,1080', // Full HD size
            '--disable-blink-features=AutomationControlled', // Critical for bot evasion
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        protocolTimeout: 120000,
    });

    // Store in global object
    // @ts-ignore
    global.puppeteerBrowser = globalBrowser;
    return globalBrowser;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ bjId: string }> }
) {
    const { bjId } = await params;
    const browser = await getBrowser();
    let page: any = null;

    // Declare variables here so they are accessible in catch block
    let rankingList: any[] = [];
    let chartData: any[] = [];
    let detailRanking: any[] = [];
    let stats: any = {};

    try {
        console.log(`[Bcraping Proxy] Fetching live data for ${bjId}...`);

        page = await browser.newPage();

        // Advanced evasion techniques
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        // Pass webdriver check
        await page.evaluateOnNewDocument(() => {
            // @ts-ignore
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
            // @ts-ignore
            window.navigator.chrome = { runtime: {} };
        });

        // Error handling for page crash
        page.on('error', (err: any) => {
            console.error('[Bcraping Proxy] Page error:', err);
        });

        // Optimize resource loading
        await page.setRequestInterception(true);
        page.on('request', (req: any) => {
            const resourceType = req.resourceType();
            if (['font'].includes(resourceType)) { // Allow media/images for better compatibility
                req.abort();
            } else {
                req.continue();
            }
        });

        // Set shorter timeout for page operations
        page.setDefaultTimeout(30000); // 30 seconds
        page.setDefaultNavigationTimeout(30000);



        const targetUrl = `https://bcraping.kr/monitor/${bjId}`;
        // Go to page
        console.log(`[Bcraping Proxy] Navigating to ${targetUrl}...`);
        await page.goto(targetUrl, {
            waitUntil: 'domcontentloaded', // Wait for DOM only, faster and more stable
            timeout: 30000 // 30 seconds navigation timeout
        });

        // Reduced wait time
        console.log(`[Bcraping Proxy] Waiting for content...`);
        await new Promise(r => setTimeout(r, 2000));

        // Extract stats
        // Wait for stats content to appear (Text-based)
        console.log(`[Bcraping Proxy] Waiting for stats text to render...`);
        try {
            await page.waitForFunction(() => {
                const text = document.body.innerText;
                return text.includes('월별 방송 시간') || text.includes('누적 별풍선');
            }, { timeout: 5000 });
        } catch (e) {
            console.log('[Bcraping Proxy] ⚠️ Warning: Timeout waiting for specific stats text.');
        }

        // Extract stats using robust regex on normalized body text
        const stats = await page.evaluate(() => {
            const bodyText = document.body.innerText.replace(/\s+/g, ' '); // Compress whitespace

            const extract = (pattern: RegExp) => {
                const match = bodyText.match(pattern);
                return match ? match[1] : '0';
            };

            // Patterns match: Label -> (anything non-greedy) -> Number (+ unit)
            // e.g. "월별 방송 시간 123시간", "월별 방송 시간 : 123시간", "월별 방송 시간 ... 123.5시간"
            return {
                broadcastTime: extract(/월별\s*방송\s*시간[^0-9]*([\d,]+(?:\.\d+)?\s*시간)/),
                avgViewers: extract(/평균\s*시청자[^0-9]*([\d,]+\s*명)/),
                maxViewers: extract(/최고\s*시청자[^0-9]*([\d,]+\s*명)/),
                chatParticipation: extract(/채팅\s*참여율[^0-9]*([\d,.]+\s*%)/),

                totalStar: extract(/누적\s*별풍선[^0-9]*([\d,]+\s*개)/),
                totalBroadcast: extract(/누적\s*방송\s*시간[^0-9]*([\d,]+(?:\.\d+)?\s*시간)/),
                fanCount: extract(/팬클럽\s*수[^0-9]*([\d,]+\s*명)/),

                totalViewCnt: extract(/누적\s*시청자[^0-9]*([\d,]+\s*명)/)
            };
        });

        // 1. Extract Top 20 Ranking (vipRankging) - From "Overview" (모아보기) Tab
        console.log(`[Bcraping Proxy] Extracting Top 20 ranking from Overview tab...`);

        // Trigger lazy load
        try {
            await page.evaluate(async () => {
                window.scrollTo(0, 500);
            });
            await new Promise(r => setTimeout(r, 1000));
        } catch (e) { }

        // Initialize if not already (though declared in outer scope)
        rankingList = [];
        try {
            // Wait for the overview ranking list to have children
            const overviewSelector = 'div[data-list="vipRankging"]';
            await page.waitForFunction((sel: string) => {
                const el = document.querySelector(sel);
                return el && el.children.length > 0;
            }, { timeout: 10000 }, overviewSelector);

            rankingList = await page.evaluate(() => {
                const container = document.querySelector('div[data-list="vipRankging"]');
                if (!container) return [];

                const items = Array.from(container.children);
                return items.map((item) => {
                    const rankEl = item.querySelector('div:nth-child(1) span');
                    const userLinkEl = item.querySelector('div:nth-child(2) a');
                    const imgEl = item.querySelector('div:nth-child(2) img');
                    const nickEl = item.querySelector('div:nth-child(2) .font-medium');

                    // Standardize extraction for Top 20 matches Top 50
                    const val3 = item.querySelector('div:nth-child(3)')?.textContent?.trim() || '0';
                    const val4 = item.querySelector('div:nth-child(4)')?.textContent?.trim() || '0';
                    const val5 = item.querySelector('div:nth-child(5)')?.textContent?.trim() || '0';

                    return {
                        rank: parseInt(rankEl?.textContent?.trim() || '0'),
                        username: nickEl?.textContent?.trim() || 'Unknown',
                        userId: userLinkEl?.getAttribute('href')?.split('/').pop() || '',
                        image: imgEl?.getAttribute('src') || '',
                        // Mapping: 3=SupportCnt, 4=Score, 5=Total
                        supportCnt: val3,
                        score: val4,
                        totalScore: val5,
                        // Backward compatibility
                        count: val3,
                        stars: val4,
                        monthlyTotal: val5
                    };
                }).filter(item => item.username !== 'Unknown');
            });
            console.log(`[Bcraping Proxy] Extracted ${rankingList.length} items from Overview tab.`);
        } catch (e) {
            console.log('[Bcraping Proxy] ⚠️ Warning: Failed to extract Top 20 from Overview tab.', e);
        }

        // 2. Click "통계" tab and Extract Stats
        console.log(`[Bcraping Proxy] Clicking stats tab...`);
        chartData = [];
        detailRanking = [];

        try {
            // Find button handle
            const statsBtnSelector = 'button[data-tab="statistics"]';
            const fallbackSelector = 'button[data-target-view="static"]';

            let btnHandle = await page.$(statsBtnSelector);
            if (!btnHandle) {
                console.log('[Bcraping Proxy] Primary selector failed, trying fallback...');
                btnHandle = await page.$(fallbackSelector);
            }

            if (btnHandle) {
                console.log('[Bcraping Proxy] Found Stats button, scrolling into view...');
                try {
                    // Scroll to button to ensure visibility
                    await page.evaluate((el: any) => el.scrollIntoView({ block: 'center' }), btnHandle);
                    await new Promise(r => setTimeout(r, 500));

                    console.log('[Bcraping Proxy] Triggering click...');
                    await btnHandle.click();
                    // Backup force click
                    await page.evaluate((el: any) => el.click(), btnHandle);
                } catch (e) { console.log('Click error:', e); }
            } else {
                console.log('[Bcraping Proxy] ❌ Stats button NOT found via Selectors. Trying text match.');
                await page.evaluate(() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const target = btns.find(b => b.textContent?.trim() === '통계');
                    if (target) {
                        (target as HTMLElement).scrollIntoView();
                        (target as HTMLElement).click();
                    }
                });
            }

            // Simulate user interaction (scroll/mouse) to trigger data loading
            try {
                console.log('[Bcraping Proxy] Simulating user interaction...');
                await page.mouse.move(100, 100);
                await page.evaluate(() => window.scrollBy(0, 300));
                await new Promise(r => setTimeout(r, 1000));
            } catch (ignore) { }

            console.log('[Bcraping Proxy] Waiting for vipRankging_all container...');
            try {
                await page.waitForSelector('div[data-list="vipRankging_all"]', { timeout: 15000 });
                console.log('[Bcraping Proxy] ✅ vipRankging_all container appeared!');
            } catch (e) {
                console.log('[Bcraping Proxy] ⚠️ Warning: Timeout waiting for stats data container.');
            }

            // Additional short wait for content population
            await new Promise(r => setTimeout(r, 2000));

            // 2-1. Extract Charts (ApexCharts)
            console.log(`[Bcraping Proxy] Extracting chart data...`);
            chartData = await page.evaluate(() => {
                try {
                    // @ts-ignore
                    if (window.ApexCharts) {
                        // @ts-ignore
                        const charts = window.ApexCharts.getAll();
                        return charts.map((chart: any) => {
                            const options = chart.w.config;
                            return {
                                id: options.chart.id,
                                title: options.title?.text || '',
                                series: options.series,
                                xaxis: options.xaxis?.categories || []
                            };
                        });
                    }
                    return [];
                } catch (e) {
                    return [];
                }
            });

            // 2-2. Extract Top 50 Detail Ranking (vipRankging_all)
            console.log(`[Bcraping Proxy] Extracting Top 50 detailed ranking...`);

            let attempts = 0;
            let success = false;

            while (attempts < 2 && !success) {
                try {
                    attempts++;
                    // Wait until at least one item row appears in the container
                    await page.waitForFunction(
                        () => {
                            const container = document.querySelector('div[data-list="vipRankging_all"]');
                            return container && container.children.length > 0;
                        },
                        { timeout: 10000 }
                    );
                    success = true;
                } catch (e) {
                    console.log(`[Bcraping Proxy] ⚠️ Attempt ${attempts} failed to load detail ranking.`);

                    if (attempts < 2) {
                        console.log('[Bcraping Proxy] 🔄 Retrying... Refreshing page and clicking stats again.');
                        await page.reload({ waitUntil: 'domcontentloaded' });
                        await new Promise(r => setTimeout(r, 3000));

                        // Re-click stats button logic
                        try {
                            const statsBtnSelector = 'button[data-tab="statistics"]';
                            if (await page.$(statsBtnSelector)) {
                                await page.click(statsBtnSelector);
                            } else {
                                await page.evaluate(() => {
                                    const btns = Array.from(document.querySelectorAll('button'));
                                    const target = btns.find(b => b.textContent?.trim() === '통계');
                                    if (target) (target as HTMLElement).click();
                                });
                            }
                        } catch (retryErr) { console.log('Retry click failed'); }
                    }
                }
            }

            if (!success) {
                const debugHtml = await page.evaluate(() => {
                    const el = document.querySelector('div[data-list="vipRankging_all"]');
                    return el ? `Container found. Children: ${el.children.length}. InnerHTML: ${el.innerHTML.substring(0, 300)}...` : 'Container NOT found';
                });
                console.log('[Bcraping Proxy] Final Debug HTML:', debugHtml);
            }

            detailRanking = await page.evaluate(() => {
                const container = document.querySelector('div[data-list="vipRankging_all"]');
                if (!container) return [];

                const items = Array.from(container.children);
                return items.map((item) => {
                    const rankEl = item.querySelector('div:nth-child(1) span');
                    const userLinkEl = item.querySelector('div:nth-child(2) a');
                    const imgEl = item.querySelector('div:nth-child(2) img');
                    const nickEl = item.querySelector('div:nth-child(2) .font-medium');

                    // Top 50 Table Columns (Same structure):
                    const val3 = item.querySelector('div:nth-child(3)')?.textContent?.trim() || '0';
                    const val4 = item.querySelector('div:nth-child(4)')?.textContent?.trim() || '0';
                    const val5 = item.querySelector('div:nth-child(5)')?.textContent?.trim() || '0';

                    return {
                        rank: parseInt(rankEl?.textContent?.trim() || '0'),
                        username: nickEl?.textContent?.trim() || 'Unknown',
                        userId: userLinkEl?.getAttribute('href')?.split('/').pop() || '',
                        image: imgEl?.getAttribute('src') || '',
                        // Swap correctly: val3 is supportCnt, val4 is score
                        supportCnt: val3,
                        score: val4,
                        totalScore: val5
                    };
                }).filter(item => item.username !== 'Unknown');
            });

        } catch (e) {
            console.error('[Bcraping Proxy] Error during stats extraction:', e);
        }

        // FALLBACK: If rankingList is empty but we found detailRanking, use it to fill rankingList
        if ((!rankingList || rankingList.length === 0) && detailRanking.length > 0) {
            console.log('[Bcraping Proxy] 🔄 Using detailRanking as fallback for Top 20 ranking');
            rankingList = detailRanking.slice(0, 20);
        }

        console.log(`[Bcraping Proxy] ✅ Success! Fetched: Ranking Top20(${rankingList.length}), Charts(${chartData.length}), Detail Rank(${detailRanking.length})`);

        return NextResponse.json({
            success: true,
            stats,
            rankingList: rankingList.length > 0 ? rankingList : undefined,
            chartData,
            detailRanking,
            source: 'bcraping-proxy-puppeteer',
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('[Bcraping Proxy] ❌ Error:', error.message);

        // If we managed to get at least the rankingList, return partial success
        if (rankingList.length > 0) {
            console.log('[Bcraping Proxy] Returning partial data (Top 20 only) despite error.');
            return NextResponse.json({
                success: true,
                stats,
                rankingList,
                chartData: [],
                detailRanking: [],
                partial: true,
                error: error.message
            });
        }

        return NextResponse.json({
            success: false,
            error: error.message,
            stats: {},
            rankingList: undefined
        }, { status: 500 });
    } finally {
        // Only close page, keep browser open for reuse
        if (page) {
            try { await page.close(); } catch (e) { console.error('Failed to close page:', e); }
        }
    }
}
