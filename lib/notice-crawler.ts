import { chromium, type Browser, type Route } from 'playwright';
import { getStreamers } from '@/app/actions';
import fs from 'fs/promises';
import path from 'path';

export interface Notice {
    id: string;
    streamerId: string;
    streamerName: string;
    title: string;
    content: string;
    date: string;
    url: string;
}

interface NoteLink {
    id: string;
    noticeUrl: string | string[];
}

export async function crawlNotices(): Promise<Notice[]> {
    console.log('[Notice Crawler] Starting crawl v6 (Batch Speedup)...');
    const allNotices: Notice[] = [];
    let browser: Browser | null = null;

    try {
        const streamers = await getStreamers();
        if (!streamers || streamers.length === 0) {
            console.log('[Notice Crawler] No streamers found');
            return [];
        }

        let noteLinks: NoteLink[] = [];
        try {
            const noteLinkFile = path.join(process.cwd(), 'notelink.json');
            const noteLinkData = await fs.readFile(noteLinkFile, 'utf-8');
            noteLinks = JSON.parse(noteLinkData);
        } catch (err) {
            console.log('[Notice Crawler] notelink.json not found, using default paths only.');
        }

        browser = await chromium.launch({
            headless: true,
            args: [
                '--disable-http2',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Critical for Docker/Railway
                '--disable-gpu'
            ]
        });

        // Try to load cookies from file
        let cookies: any[] = [];
        try {
            const cookiePath = path.join(process.cwd(), 'data', 'soop-cookies.json');
            const cookieData = await fs.readFile(cookiePath, 'utf-8');
            const parsedCookies = JSON.parse(cookieData);

            // Sanitize cookies for Puppeteer
            cookies = parsedCookies.map((cookie: any) => {
                // Remove fields that might cause issues with Puppeteer
                const { sameSite, ...rest } = cookie;
                return {
                    ...rest,
                    // Ensure domain is correct for all subdomains
                    domain: '.sooplive.co.kr',
                    path: '/',
                    // Ensure secure is true for https
                    secure: true
                };
            });
            console.log(`[Notice Crawler] Loaded and sanitized ${cookies.length} cookies.`);
        } catch (e) {
            console.log('[Notice Crawler] No cookie file found or failed to load. Crawling as guest.');
        }

        // [안정성 향상] 메모리 부족 방지를 위해 배치 사이즈를 1로 감소 (Railway 환경 최적화)
        const batchSize = 1;
        for (let i = 0; i < streamers.length; i += batchSize) {
            const batch = streamers.slice(i, i + batchSize);

            await Promise.all(batch.map(async (streamer) => {
                if (!browser) return; // Should not happen

                const context = await browser.newContext({
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                    viewport: { width: 1920, height: 1080 },
                    ignoreHTTPSErrors: true,
                    extraHTTPHeaders: {
                        'Referer': 'https://www.sooplive.co.kr/',
                        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
                    }
                });

                if (cookies.length > 0) {
                    try {
                        await context.addCookies(cookies);
                    } catch (e) { }
                }

                const page = await context.newPage();

                await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,ico,woff,woff2,ttf,eot,mp4,webm}', (route: Route) => route.abort());

                console.log(`[Notice Crawler] Crawling ${streamer.name} (${streamer.bjId})...`);

                try {
                    let targetUrls: string[] = [];
                    const noteLink = noteLinks.find(n => n.id === streamer.bjId);

                    if (noteLink && noteLink.noticeUrl) {
                        if (Array.isArray(noteLink.noticeUrl)) {
                            targetUrls = noteLink.noticeUrl;
                        } else {
                            targetUrls = [noteLink.noticeUrl];
                        }
                    } else {
                        targetUrls = [`https://www.sooplive.co.kr/station/${streamer.bjId}/post`];
                    }

                    for (let rawUrl of targetUrls) {
                        const url = rawUrl.trim();
                        if (!url) continue;

                        let retries = 3;
                        let success = false;

                        while (retries > 0 && !success) {
                            try {
                                await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
                                await page.waitForTimeout(2000); // Wait for hydration
                                success = true;
                            } catch (e: any) {
                                retries--;
                                console.log(`[Notice Crawler] Retry ${3 - retries}/3 for ${streamer.name} (${url}): ${e.message}`);
                                if (retries === 0) {
                                    console.error(`[Notice Crawler] Failed to load ${url} after 3 attempts.`);
                                } else {
                                    await new Promise(res => setTimeout(res, 2000));
                                }
                            }
                        }

                        if (!success) continue;

                        try {
                            // Wait for any list item to appear
                            // Primary selector for main feed: li[class*="Post_"]
                            // Secondary selector for specific board: li (generic) or li[class*="List_"]
                            const isBoardUrl = url.includes('/board/');
                            let itemSelector = 'li[class*="Post_"]';

                            if (isBoardUrl) {
                                // Specific board pages might have different structure
                                itemSelector = 'div[class*="List_"] li, li[class*="Post_"]';
                            }

                            try {
                                // Fallback wait for ul if li not found immediately
                                await page.waitForSelector(itemSelector, { state: 'attached', timeout: 10000 });
                            } catch (e) {
                                console.log(`[Notice Crawler] Primary selector failed, trying fallback for ${streamer.name}...`);
                                // Try generic fallback including table rows
                                itemSelector = 'li, tr';
                                try {
                                    await page.waitForSelector('li, tr', { state: 'attached', timeout: 5000 });
                                } catch (e2) {
                                    console.log(`[Notice Crawler] List not found for ${streamer.name} at ${url}`);
                                    continue;
                                }
                            }

                            const extracted = await page.evaluate(({ itemSelector, streamerId, streamerName }) => {
                                const items: any[] = [];
                                const listItems = document.querySelectorAll(itemSelector as string);
                                const now = new Date();

                                listItems.forEach((el, idx) => {
                                    let titleEl = el.querySelector('[class*="ContentTitle_title"]');
                                    let contentEl = el.querySelector('[class*="Content_text"]');
                                    let dateContainer = el.querySelector('[class*="Interaction_details"]');
                                    let linkEl = el.querySelector('a[href*="/station/"]') as HTMLAnchorElement | null;

                                    // Table Row specific logic (Old Board Style)
                                    if (el.tagName.toLowerCase() === 'tr') {
                                        const subjectLink = el.querySelector('a') as HTMLAnchorElement | null;
                                        if (subjectLink) {
                                            titleEl = subjectLink;
                                            linkEl = subjectLink;
                                            // Date usually in 3rd or 4th cell
                                            const cells = el.querySelectorAll('td');
                                            if (cells.length > 2) {
                                                const dateText = cells[2]?.textContent || cells[3]?.textContent;
                                                if (dateText) dateContainer = { textContent: dateText } as any;
                                            }
                                        }
                                    }

                                    if (titleEl && linkEl) {
                                        let title = titleEl.textContent || '';
                                        title = title.replace(/^공지\s*/, '').trim();

                                        const content = contentEl?.textContent?.trim() || '';

                                        let date = '';
                                        if (dateContainer) {
                                            const rawDate = dateContainer.textContent?.trim() || '';

                                            // 1. YYYY-MM-DD or YYYY.MM.DD
                                            const dateMatch = rawDate.match(/(\d{4})[-.](\d{2})[-.](\d{2})/);
                                            if (dateMatch) {
                                                date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`; // Normalize to YYYY-MM-DD
                                            } else {
                                                // Relative time handling
                                                const y = now.getFullYear();
                                                const m = String(now.getMonth() + 1).padStart(2, '0');
                                                const d = String(now.getDate()).padStart(2, '0');

                                                if (rawDate.match(/\d{2}:\d{2}/) || rawDate.includes('분 전') || rawDate.includes('초 전') || rawDate.includes('방금') || rawDate.includes('시간 전')) {
                                                    // Today
                                                    date = `${y}-${m}-${d}`;
                                                } else if (rawDate.includes('어제')) {
                                                    // Yesterday
                                                    const yesterday = new Date(now);
                                                    yesterday.setDate(now.getDate() - 1);
                                                    const ym = String(yesterday.getMonth() + 1).padStart(2, '0');
                                                    const yd = String(yesterday.getDate()).padStart(2, '0');
                                                    date = `${yesterday.getFullYear()}-${ym}-${yd}`;
                                                } else if (rawDate.includes('일 전')) {
                                                    // N days ago
                                                    const daysMatch = rawDate.match(/(\d+)일 전/);
                                                    if (daysMatch) {
                                                        const daysAgo = parseInt(daysMatch[1], 10);
                                                        const pastDate = new Date(now);
                                                        pastDate.setDate(now.getDate() - daysAgo);
                                                        const pm = String(pastDate.getMonth() + 1).padStart(2, '0');
                                                        const pd = String(pastDate.getDate()).padStart(2, '0');
                                                        date = `${pastDate.getFullYear()}-${pm}-${pd}`;
                                                    } else {
                                                        // Fallback to today if parsing fails but format detected
                                                        date = `${y}-${m}-${d}`;
                                                    }
                                                }
                                            }
                                        }

                                        let href = linkEl.getAttribute('href') || '';
                                        if (href && !href.startsWith('http')) {
                                            href = `https://www.sooplive.co.kr${href}`;
                                        }

                                        const hasRealText = /[가-힣a-zA-Z]/.test(title);

                                        if (title.length >= 1 && hasRealText) {
                                            items.push({
                                                id: `${streamerId}_${idx}_${Date.now()}`,
                                                streamerId: streamerId as string,
                                                streamerName: streamerName as string,
                                                title,
                                                content,
                                                date,
                                                url: href
                                            });
                                        }
                                    }
                                });
                                return items;
                            }, { itemSelector, streamerId: streamer.bjId, streamerName: streamer.name });

                            if (extracted.length > 0) {
                                allNotices.push(...extracted);
                                console.log(`[Notice Crawler] Extracted ${extracted.length} items from ${url}`);
                            } else {
                                console.log(`[Notice Crawler] 0 items extracted from ${url}`);
                            }

                        } catch (err: any) {
                            console.error(`[Notice Crawler] Error processing ${url}:`, err.message);
                        }
                    }

                } finally {
                    await context.close();
                }
            }));
        }

    } catch (error) {
        console.error('[Notice Crawler] Critical Error:', error);
    } finally {
        if (browser) await browser.close();
    }

    return allNotices.sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        // Handle Invalid Date (NaN)
        const valA = isNaN(timeA) ? 0 : timeA;
        const valB = isNaN(timeB) ? 0 : timeB;
        return valB - valA;
    });
}

export async function crawlNoticeDetail(url: string): Promise<Notice | null> {
    return null;
}
