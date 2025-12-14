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
            args: ['--disable-http2', '--no-sandbox', '--disable-setuid-sandbox']
        });

        // Cookies removed to prevent session mismatch on Railway environment
        const cookies: any[] = [];

        // [속도 향상] 배치 사이즈를 1 -> 5로 증가시켜 5명씩 동시 크롤링
        // 리소스 차단 덕분에 병렬 처리 시에도 안정적임
        const batchSize = 5;
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
                                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
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
                            await page.waitForTimeout(2000);

                            const itemSelector = 'li[class*="Post_post"]';

                            try {
                                await page.waitForSelector(itemSelector, { state: 'attached', timeout: 10000 });
                            } catch (e) {
                                console.log(`[Notice Crawler] List not found for ${streamer.name} at ${url}`);
                                continue;
                            }

                            const extracted = await page.evaluate(({ itemSelector, streamerId, streamerName }) => {
                                const items: any[] = [];
                                const listItems = document.querySelectorAll(itemSelector as string);

                                listItems.forEach((li, idx) => {
                                    const titleEl = li.querySelector('[class*="ContentTitle_title"]');
                                    const contentEl = li.querySelector('[class*="Content_text"]');
                                    const dateContainer = li.querySelector('[class*="Interaction_details"]');
                                    const linkEl = li.querySelector('a[href*="/station/"]');

                                    if (titleEl && linkEl) {
                                        let title = titleEl.textContent || '';
                                        title = title.replace(/^공지\s*/, '').trim();

                                        const content = contentEl?.textContent?.trim() || '';

                                        let date = '';
                                        if (dateContainer) {
                                            date = dateContainer.textContent?.trim() || '';
                                            const dateMatch = date.match(/\d{4}-\d{2}-\d{2}/);
                                            if (dateMatch) {
                                                date = dateMatch[0];
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
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
    });
}

export async function crawlNoticeDetail(url: string): Promise<Notice | null> {
    return null;
}
