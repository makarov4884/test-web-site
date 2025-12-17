import { NextResponse } from 'next/server';
// Use dynamic import for playwright to avoid build-time issues if not installed

export async function GET(
    request: Request,
    { params }: { params: Promise<{ bjId: string }> }
) {
    const { bjId } = await params;

    let browser: any = null;
    let context: any = null;
    let page: any = null;

    let rankingList: any[] = [];
    let chartData: any[] = [];
    let detailRanking: any[] = [];
    let stats: any = {};

    try {
        // Launch fresh browser for each request (more stable than shared browser)
        console.log('[Bcraping Proxy] 🚀 Launching fresh Playwright browser...');
        const { chromium } = await import('playwright');
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });

        // Context creation is fast
        context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 }, // Smaller viewport is faster
            javaScriptEnabled: true,
            bypassCSP: true
        });

        console.log(`[Bcraping Proxy] Fetching live data for ${bjId}...`);
        page = await context.newPage();

        // 1. Optimize resource loading - BLOCK CSS AGAIN for speed (we use 'attached' check instead of visible)
        await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,css,woff,woff2,ttf,ico,mp4,wav}', (route: any) => route.abort());
        await page.route('**/*googlesyndication.com*', (route: any) => route.abort());
        await page.route('**/*doubleclick.net*', (route: any) => route.abort());
        await page.route('**/*analytics*', (route: any) => route.abort());

        // 2. Navigation
        const targetUrl = `https://bcraping.kr/monitor/${bjId}`;
        console.log(`[Bcraping Proxy] Navigating to ${targetUrl}...`);

        // 'domcontentloaded' is faster than 'networkidle'
        await page.goto(targetUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 10000 // Reduced timeout
        });

        // 3. Extract stats text
        console.log(`[Bcraping Proxy] Waiting for stats text...`);
        try {
            // Wait for body attached
            await page.waitForSelector('body', { state: 'attached', timeout: 5000 });

            // Wait for data (optimized function)
            await page.waitForFunction(() => {
                const text = document.body.innerText || '';
                return text.includes('누적'); // Simpler check
            }, { timeout: 5000 }).catch(() => { });

        } catch (e) {
            console.log('[Bcraping Proxy] ⚠️ Warning: Body or data wait timeout.');
            // Proceed anyway, might get partial data
        }

        // Wait for stats elements
        try {
            await page.waitForSelector('[data-broadcast-time]', { timeout: 8000 });
        } catch (e) { console.log('Wait for data attributes timeout'); }

        stats = await page.evaluate(() => {
            const result: any = {};

            // Helper to find value associated with label
            const findValue = (label: string) => {
                // Find all elements containing the label
                const elements = Array.from(document.querySelectorAll('div, span, p, h3, h4'));
                const labelEl = elements.find(el => el.textContent?.trim() === label);

                if (labelEl) {
                    // Strategy 1: The value is in the next sibling or close by
                    // Look at parent's text content or siblings
                    const parent = labelEl.parentElement;
                    if (parent) {
                        const text = parent.innerText;
                        // Split by label and take the rest, clean up
                        const parts = text.split(label);
                        if (parts.length > 1) {
                            const val = parts[1].trim().split('\n')[0].trim();
                            if (val && val.match(/[\d,]/)) return val;
                        }
                    }
                }

                // Fallback: Regex on body but strictly bounded
                return null;
            };

            // Alternative: Find elements that look like cards (icon + label + value)
            // This is safer if we can identify the detailed structure.
            // Assuming the structure is consistent with the provided image (Icon / Label / Value)

            const cardTexts = document.body.innerText;

            const extractSafe = (pattern: RegExp) => {
                const match = cardTexts.match(pattern);
                // Validation: Broadcast time for a month cannot be > 744 hours
                if (match) {
                    let val = match[1];
                    if (val.includes('시간')) {
                        const num = parseFloat(val.replace(/,/g, '').replace('시간', ''));
                        // If unrealistic number (e.g. sum of all months), try to find a smaller number or fail
                        // But usually this means regex caught "Total" instead of "Monthly"
                        if (num > 750) {
                            // Try to find specific monthly stats if possible, otherwise return raw
                            return val;
                        }
                    }
                    return val;
                }
                return '0';
            };

            const getText = (selector: string) => document.querySelector(selector)?.textContent?.trim() || '0';

            // Extract values directly from spans with data attributes
            // Removing commas to ensure clean numbers if needed, but keeping as string for display
            const broadcastTime = getText('[data-broadcast-time]');
            const avgViewers = getText('[data-avg-viewer]');
            const maxViewers = getText('[data-max-viewer]');
            const chatParticipation = getText('[data-chat-participation-rate]');

            // Validate and assign (If value is ridiculously high for monthly stats, it might be parsing error or cumulative, but we trust the selector first)
            result.broadcastTime = broadcastTime ? `${broadcastTime}시간` : '0시간';
            result.avgViewers = avgViewers ? `${avgViewers}명` : '0명';
            result.maxViewers = maxViewers ? `${maxViewers}명` : '0명';
            result.chatParticipation = chatParticipation ? `${chatParticipation}%` : '0%';

            // Stats tab summary (Top colored cards usually have labels "누적 ...")
            // These selector usages are loose fallbacks for the purlple section
            const getRegex = (r: RegExp) => {
                const m = document.body.innerText.match(r);
                return m ? m[1] : null;
            }

            result.totalStar = getRegex(/누적\s*별풍선\s*([\d,]+\s*개)/) || '0개';
            result.totalBroadcast = getRegex(/누적\s*방송\s*시간\s*([\d,.]+\s*시간)/) || '0시간';
            result.fanCount = getRegex(/팬클럽\s*수\s*([\d,]+\s*명)/) || '0명';
            result.totalViewCnt = getRegex(/누적\s*시청자\s*([\d,]+\s*명)/) || '0명';

            return result;
        });

        // 4. Extract Top 20 Ranking (Overview)
        console.log(`[Bcraping Proxy] Extracting Top 20 ranking...`);

        // Try to trigger lazy load
        await page.evaluate(() => window.scrollBy(0, 500));
        await page.waitForTimeout(1000);

        try {
            const overviewSelector = 'div[data-list="vipRankging"]';
            // Wait for REAL data elements (not skeletons)
            try {
                await page.waitForSelector(`${overviewSelector} > div:not(.animate-pulse)`, { state: 'attached', timeout: 10000 });
            } catch (e) {
                console.log('[Bcraping Proxy] ⚠️ Warning: Timeout waiting for non-skeleton items.');
            }

            rankingList = await page.evaluate(() => {
                const container = document.querySelector('div[data-list="vipRankging"]');
                if (!container) return [];

                const items = Array.from(container.children);
                return items
                    .filter(item => !item.classList.contains('animate-pulse')) // Filter out skeletons
                    .map((item) => {
                        const rankEl = item.querySelector('div:nth-child(1) span');
                        const userLinkEl = item.querySelector('div:nth-child(2) a');
                        const imgEl = item.querySelector('div:nth-child(2) img');
                        const nickEl = item.querySelector('div:nth-child(2) .font-medium');

                        const val3 = item.querySelector('div:nth-child(3)')?.textContent?.trim() || '0';
                        const val4 = item.querySelector('div:nth-child(4)')?.textContent?.trim() || '0';
                        const val5 = item.querySelector('div:nth-child(5)')?.textContent?.trim() || '0';

                        return {
                            rank: parseInt(rankEl?.textContent?.trim() || '0'),
                            username: nickEl?.textContent?.trim() || 'Unknown',
                            userId: userLinkEl?.getAttribute('href')?.split('/').pop() || '',
                            image: imgEl?.getAttribute('src') || '',
                            supportCnt: val3,
                            score: val4,
                            totalScore: val5,
                            count: val3,
                            stars: val4,
                            monthlyTotal: val5
                        };
                    }).filter(item => item.username !== 'Unknown');
            });
            console.log(`[Bcraping Proxy] Extracted ${rankingList.length} items from Overview.`);
        } catch (e) {
            console.log('[Bcraping Proxy] ⚠️ Warning: Failed to extract Top 20.', e);
        }

        // 5. Click "통계" tab
        console.log(`[Bcraping Proxy] Clicking stats tab...`);
        try {
            // Use precise selector based on text or attribute
            const statsBtn = page.locator('button:has-text("통계"), button[data-tab="statistics"]');
            if (await statsBtn.count() > 0) {
                // Use force: true to bypass visibility checks
                await statsBtn.first().click({ force: true });

                // Wait for the container explicitly
                try {
                    // Wait for stats container and NON-SKELETON children
                    // Reduced timeout significantly. If it's not there in 5s, it won't be there.
                    await page.waitForSelector('div[data-list="vipRankging_all"] > div:not(.animate-pulse)', { state: 'attached', timeout: 5000 });
                    console.log('[Bcraping Proxy] ✅ Stats container found with real data.');
                } catch (timeout) {
                    console.log('[Bcraping Proxy] ⚠️ Timeout waiting for stats container.');
                }

                // Reduced fixed wait. Rely on the selector wait above.
                await page.waitForTimeout(1500);

                // Extract Charts
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
                    } catch (e) { return []; }
                });
                console.log(`[Bcraping Proxy] Extracted ${chartData.length} charts.`);

                // Extract monthly summary (합계/평균)
                const monthlySummary = await page.evaluate(() => {
                    const totalEl = document.querySelector('[data-ballonsummary="total_ballon"]');
                    const avgEl = document.querySelector('[data-ballonsummary="avg_ballon"]');
                    return {
                        total: totalEl?.textContent?.trim() || '',
                        average: avgEl?.textContent?.trim() || ''
                    };
                });
                console.log(`[Bcraping Proxy] Monthly Summary - Total: ${monthlySummary.total}, Avg: ${monthlySummary.average}`);

                // Extract broadcast statistics table
                const broadcastStats = await page.evaluate(() => {
                    const rows = document.querySelectorAll('#ballon-station-chart tr');
                    return Array.from(rows).map(row => {
                        const cells = row.querySelectorAll('td');
                        if (cells.length < 6) return null;

                        const broadcastLink = cells[1].querySelector('a');
                        const titleLink = cells[2].querySelector('a');
                        const topDonorLink = cells[5].querySelector('a');
                        const topDonorImg = cells[5].querySelector('img');

                        return {
                            rank: cells[0].textContent?.trim() || '',
                            broadcastNo: broadcastLink?.textContent?.trim() || '',
                            broadcastUrl: broadcastLink?.getAttribute('href') || '',
                            title: titleLink?.textContent?.trim() || '',
                            time: cells[3].textContent?.trim() || '',
                            stars: cells[4].textContent?.trim() || '',
                            topDonor: {
                                name: topDonorLink?.textContent?.trim() || '',
                                url: topDonorLink?.getAttribute('href') || '',
                                image: topDonorImg?.getAttribute('src') || ''
                            }
                        };
                    }).filter(item => item !== null);
                });
                console.log(`[Bcraping Proxy] Extracted ${broadcastStats.length} broadcast stats.`);

                // Store additional stats data
                stats.monthlySummary = monthlySummary;
                stats.broadcastStats = broadcastStats;

                // Extract Detail Ranking
                console.log(`[Bcraping Proxy] Extracting Top 50 detailed ranking...`);

                // Wait for children
                try {
                    await page.waitForFunction(() => {
                        const el = document.querySelector('div[data-list="vipRankging_all"]');
                        // Ensure we have children that are NOT skeletons
                        return el && Array.from(el.children).some(c => !c.classList.contains('animate-pulse'));
                    }, null, { timeout: 10000 });
                } catch (e) { }

                detailRanking = await page.evaluate(() => {
                    const container = document.querySelector('div[data-list="vipRankging_all"]');
                    if (!container) return [];
                    // ... extraction (same as before)
                    const items = Array.from(container.children);
                    return items
                        .filter(item => !item.classList.contains('animate-pulse'))
                        .map((item) => {
                            const rankEl = item.querySelector('div:nth-child(1) span');
                            const userLinkEl = item.querySelector('div:nth-child(2) a');
                            const imgEl = item.querySelector('div:nth-child(2) img');
                            const nickEl = item.querySelector('div:nth-child(2) .font-medium');

                            const val3 = item.querySelector('div:nth-child(3)')?.textContent?.trim() || '0';
                            const val4 = item.querySelector('div:nth-child(4)')?.textContent?.trim() || '0';
                            const val5 = item.querySelector('div:nth-child(5)')?.textContent?.trim() || '0';

                            return {
                                rank: parseInt(rankEl?.textContent?.trim() || '0'),
                                username: nickEl?.textContent?.trim() || 'Unknown',
                                userId: userLinkEl?.getAttribute('href')?.split('/').pop() || '',
                                image: imgEl?.getAttribute('src') || '',
                                supportCnt: val3,
                                score: val4,
                                totalScore: val5
                            };
                        }).filter(item => item.username !== 'Unknown');
                });
            } else {
                console.log('[Bcraping Proxy] ❌ Stats button not found.');
            }
        } catch (e) {
            console.error('[Bcraping Proxy] Error clicking stats tab:', e);
        }

        // Fallback
        if ((!rankingList || rankingList.length === 0) && detailRanking.length > 0) {
            rankingList = detailRanking.slice(0, 20);
        }

        console.log(`[Bcraping Proxy] ✅ Success! Fetched: Ranking(${rankingList.length}), Charts(${chartData.length}), Detail(${detailRanking.length})`);

        return NextResponse.json({
            success: true,
            stats,
            rankingList: rankingList.length > 0 ? rankingList : undefined,
            chartData,
            detailRanking,
            source: 'bcraping-proxy-playwright',
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[Bcraping Proxy] ❌ Error:', error.message);

        // Return partial if we have it
        if (rankingList.length > 0) {
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
        if (page) await page.close().catch(() => { });
        if (context) await context.close().catch(() => { });
        // Close browser since we launch fresh one per request
        if (browser) await browser.close().catch(() => { });
    }
}
