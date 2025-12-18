import type { Browser, Route } from 'playwright';
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

export async function crawlNotices(onProgress?: (notices: Notice[]) => Promise<void>): Promise<Notice[]> {
    console.log('[Notice Crawler] Starting crawl v7 (Incremental Saving)...');
    const allNotices: Notice[] = [];
    let browser: Browser | null = null;

    // Use createRequire to bypass Webpack bundling completely
    // This fixes "undefined (reading 'exitZones')" by loading the actual node_module at runtime
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const { chromium } = require('playwright');

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
                '--disable-gpu',
                '--disable-blink-features=AutomationControlled' // Anti-detection
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

        // [Performance Tuning] Increased batch size for faster crawling
        // [Performance Tuning] Increased batch size for faster crawling
        // If memory issues occur on Railway (Page Crashed), reduce this back to 2
        const batchSize = 8;
        for (let i = 0; i < streamers.length; i += batchSize) {
            const batch = streamers.slice(i, i + batchSize);

            await Promise.all(batch.map(async (streamer) => {
                if (!browser) return;

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
                            targetUrls = [...noteLink.noticeUrl];
                        } else {
                            targetUrls = [noteLink.noticeUrl];
                        }
                    }
                    // Always add the Main Station Page as a fallback/catch-all (contains recent notices)
                    targetUrls.push(`https://www.sooplive.co.kr/station/${streamer.bjId}`);

                    for (let rawUrl of targetUrls) {
                        const url = rawUrl.trim();
                        if (!url) continue;

                        let retries = 2; // Reduced from 3
                        let success = false;

                        while (retries > 0 && !success) {
                            try {
                                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }); // 15s -> 20s
                                await page.waitForTimeout(2500); // 1.5s -> 2.5s (Safer for slow server)
                                success = true;
                            } catch (e: any) {
                                retries--;
                                if (retries === 0) {
                                    console.error(`[Notice Crawler] Failed to load ${url} after 2 attempts.`);
                                } else {
                                    await new Promise(res => setTimeout(res, 2000));
                                }
                            }
                        }

                        if (!success) continue;

                        try {
                            const isBoardUrl = url.includes('/board/');
                            let itemSelector = 'li[class*="Post_"]';

                            if (isBoardUrl) {
                                itemSelector = 'div[class*="List_"] li, li[class*="Post_"], tr';
                            }

                            // Support new SOOP UI (Board_newsItem)
                            itemSelector += ', div[class*="Board_newsItem"]';

                            try {
                                await page.waitForSelector(itemSelector, { state: 'attached', timeout: 8000 }); // 5s -> 8s
                            } catch (e) {
                                itemSelector = 'li, tr, div[class*="Board_newsItem"]';
                                try {
                                    await page.waitForSelector('li, tr, div[class*="Board_newsItem"]', { state: 'attached', timeout: 3000 });
                                } catch (e2) {
                                    continue;
                                }
                            }

                            const extracted = await page.evaluate(({ isBoardUrl, streamerId, streamerName }) => {
                                // Helper to get unique elements (deduplication by reference)
                                const getUniqueElements = (elements: Element[]) => {
                                    return Array.from(new Set(elements));
                                };

                                const items: any[] = [];

                                // Robust separate queries to avoid selector parsing issues
                                let rawElements: Element[] = [];
                                if (isBoardUrl) {
                                    rawElements.push(...Array.from(document.querySelectorAll('div[class*="List_"] li')));
                                    rawElements.push(...Array.from(document.querySelectorAll('li[class*="Post_"]')));
                                    rawElements.push(...Array.from(document.querySelectorAll('tr')));
                                }
                                // Always check for new UI (Board_newsItem) and generic lists
                                rawElements.push(...Array.from(document.querySelectorAll('div[class*="Board_newsItem"]')));

                                // Fallback: if nothing found, try generic li/tr
                                if (rawElements.length === 0) {
                                    rawElements.push(...Array.from(document.querySelectorAll('li')));
                                    rawElements.push(...Array.from(document.querySelectorAll('tr')));
                                }

                                const listItems = getUniqueElements(rawElements);
                                const now = new Date(); // Browser time

                                listItems.forEach((el, idx) => {
                                    // Extraction logic
                                    let titleEl = el.querySelector('[class*="ContentTitle_title"], [class*="Title_title"]');
                                    let contentEl = el.querySelector('[class*="Content_text"]');
                                    let dateContainer = el.querySelector('[class*="Interaction_details"], [class*="Date_date"]'); // Guessing Date_date
                                    let linkEl = el.querySelector('a[href*="/station/"], a[class*="Board_contents"]');

                                    // If the element itself is the link container (New UI often wraps everything in A)
                                    if (el.tagName === 'A' || el.querySelector('a[class*="Board_contents"]')) {
                                        const anchor = el.tagName === 'A' ? el : el.querySelector('a[class*="Board_contents"]');
                                        if (anchor) linkEl = anchor as HTMLAnchorElement;
                                    }

                                    if (el.tagName.toLowerCase() === 'tr') {
                                        // ... existing TR logic ...
                                        const subjectLink = el.querySelector('a') as HTMLAnchorElement | null;
                                        if (subjectLink) {
                                            titleEl = subjectLink;
                                            linkEl = subjectLink;
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

                                        // Attempt to find date in text if container missing
                                        if (!dateContainer && el.textContent) {
                                            // Fallback search for date-like string in the whole item
                                            const match = el.textContent.match(/(\d{4}[-.]\d{2}[-.]\d{2})|(\d+시간 전)|(\d+분 전)/);
                                            if (match) dateContainer = { textContent: match[0] } as any;
                                        }

                                        if (dateContainer) {
                                            const rawDate = dateContainer.textContent?.trim() || '';
                                            const dateMatch = rawDate.match(/(\d{4})[-.](\d{2})[-.](\d{2})/);
                                            if (dateMatch) {
                                                date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
                                            } else {
                                                // Relative date handling
                                                const y = now.getFullYear();
                                                const m = String(now.getMonth() + 1).padStart(2, '0');
                                                const d = String(now.getDate()).padStart(2, '0');

                                                if (rawDate.match(/\d{2}:\d{2}/) || rawDate.includes('분 전') || rawDate.includes('초 전') || rawDate.includes('방금') || rawDate.includes('시간 전')) {
                                                    date = `${y}-${m}-${d}`;
                                                } else if (rawDate.includes('어제')) {
                                                    const yesterday = new Date(now);
                                                    yesterday.setDate(now.getDate() - 1);
                                                    const ym = String(yesterday.getMonth() + 1).padStart(2, '0');
                                                    const yd = String(yesterday.getDate()).padStart(2, '0');
                                                    date = `${yesterday.getFullYear()}-${ym}-${yd}`;
                                                } else if (rawDate.includes('일 전')) {
                                                    const daysMatch = rawDate.match(/(\d+)일 전/);
                                                    if (daysMatch) {
                                                        const daysAgo = parseInt(daysMatch[1], 10);
                                                        const pastDate = new Date(now);
                                                        pastDate.setDate(now.getDate() - daysAgo);
                                                        const pm = String(pastDate.getMonth() + 1).padStart(2, '0');
                                                        const pd = String(pastDate.getDate()).padStart(2, '0');
                                                        date = `${pastDate.getFullYear()}-${pm}-${pd}`;
                                                    } else {
                                                        date = `${y}-${m}-${d}`;
                                                    }
                                                } else {
                                                    // Default fallback
                                                    date = `${y}-${m}-${d}`;
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
                            }, { isBoardUrl, streamerId: streamer.bjId, streamerName: streamer.name });

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

            // [Incremental Saving] Trigger callback after batch
            if (onProgress) {
                console.log(`[Notice Crawler] Batch ${i / batchSize + 1} complete. Auto-saving...`);
                // Filter and pass immediately
                const currentFiltered = allNotices
                    .filter(notice => {
                        const noticeDate = new Date(notice.date);
                        // Relaxed Date Filter: 2025-12-01 (To ensure we see recent December posts)
                        const cutoffDate = new Date('2025-12-01');
                        if (isNaN(noticeDate.getTime())) return true; // Include if date parsing failed just in case
                        return noticeDate >= cutoffDate;
                    })
                    .sort((a, b) => {
                        const timeA = new Date(a.date).getTime();
                        const timeB = new Date(b.date).getTime();
                        return timeB - timeA;
                    });

                await onProgress(currentFiltered);
            }
        }

    } catch (error) {
        console.error('[Notice Crawler] Critical Error:', error);
    } finally {
        if (browser) await browser.close();
    }

    // Deduplicate logic
    const uniqueMap = new Map<string, Notice>();
    allNotices.forEach(notice => {
        // Create unique key based on streamer, title, and date
        const key = `${notice.streamerId}|${notice.title}|${notice.date}`;
        if (!uniqueMap.has(key)) {
            uniqueMap.set(key, notice);
        }
    });

    const finalNotices = Array.from(uniqueMap.values())
        .filter(notice => {
            const noticeDate = new Date(notice.date);
            const cutoffDate = new Date('2025-12-01');
            if (isNaN(noticeDate.getTime())) return false;
            return noticeDate >= cutoffDate;
        })
        .sort((a, b) => {
            const timeA = new Date(a.date).getTime();
            const timeB = new Date(b.date).getTime();
            const valA = isNaN(timeA) ? 0 : timeA;
            const valB = isNaN(timeB) ? 0 : timeB;
            return valB - valA;
        });

    return finalNotices;
}

export async function crawlNoticeDetail(url: string): Promise<Notice | null> {
    return null;
}
