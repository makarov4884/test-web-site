import fs from 'fs/promises';
import path from 'path';

interface NoticeLink {
    id: string;
    noticeUrl: string | string[];
}

interface CachedNotice {
    id: string;
    streamerId: string;
    streamerName: string;
    title: string;
    content: string;
    date: string;
    views: number;
    crawledAt: string;
    profileImage?: string;
}

const CACHE_FILE = path.join(process.cwd(), 'notices-cache.json');
const NOTELINK_FILE = path.join(process.cwd(), 'notelink.json');
const STREAMERS_FILE = path.join(process.cwd(), 'data', 'streamers.json');

let isUpdating = false;
let lastUpdate: Date | null = null;

// Read cache
async function readCache(): Promise<CachedNotice[]> {
    try {
        const data = await fs.readFile(CACHE_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

// Write cache
async function writeCache(notices: CachedNotice[]): Promise<void> {
    await fs.writeFile(CACHE_FILE, JSON.stringify(notices, null, 2));
}

// Crawl notices for a streamer
async function crawlNoticesForStreamer(bjId: string, urls: string[], registeredName?: string): Promise<CachedNotice[]> {
    const puppeteer = await import('puppeteer');
    const notices: CachedNotice[] = [];

    try {
        const browser = await puppeteer.default.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });

        // Get streamer name
        let streamerName = bjId;
        try {
            const stationResponse = await fetch(`https://bjapi.afreecatv.com/api/${bjId}/station`, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            if (stationResponse.ok) {
                const data = await stationResponse.json();
                streamerName = data.station?.station_name || bjId;
            }
        } catch (e) {
            // Ignore
        }

        for (const url of urls) {
            const page = await browser.newPage();

            try {
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

                await page.goto(url, {
                    waitUntil: 'networkidle2',
                    timeout: 45000
                });

                await page.waitForSelector('li[class*="Post_post"], .post_list li, .board_list tr', {
                    timeout: 15000
                }).catch(() => { });

                await new Promise(resolve => setTimeout(resolve, 2000));

                const pageData = await page.evaluate((streamerId) => {
                    const profileSelectors = [
                        'div[class*="__soopui__Image-module__wrapper"] img',
                        'img[class*="__soopui__Image-module__image"]',
                        'span[class*="__soopui__AvatarCommon"] img',
                        '.station_logo img',
                        '#station_logo img',
                        '.bj_profile img',
                        '.profile_img img',
                        '#bj_profile_img',
                        '.my_profile img',
                        '.my_box .thumb img',
                        '.profile_area .thumb img'
                    ];

                    let profileImage = '';
                    for (const selector of profileSelectors) {
                        const img = document.querySelector(selector) as HTMLImageElement;
                        if (img && img.src && !img.src.includes('blank')) {
                            profileImage = img.src;
                            break;
                        }
                    }

                    const nameEl = document.querySelector('.bj_name, .station_name, .nickname') as HTMLElement;
                    const extractedName = nameEl?.textContent?.trim() || streamerId;

                    const elements = document.querySelectorAll('.post_list li, .board_list tr, article, .list-item, .board-item, li[class*="Post_post"]');
                    const extracted: any[] = [];

                    elements.forEach((element, index) => {
                        try {
                            const linkElement = element.querySelector('a[href*="post"], a[href*="board"]');
                            if (!linkElement) return;

                            const linkHref = linkElement.getAttribute('href');
                            const postIdMatch = linkHref?.match(/(?:post|board)\/(\d+)/);
                            const postId = postIdMatch ? postIdMatch[1] : null;

                            let title = '';
                            let content = '';

                            const strongEl = linkElement.querySelector('strong, b, .title, [class*="title"]');
                            if (strongEl && strongEl.textContent?.trim() !== '공지') {
                                title = strongEl.textContent?.trim() || '';
                                const fullText = linkElement.textContent?.trim() || '';
                                content = fullText.replace('공지', '').replace(title, '').trim();
                            }

                            if (!title) {
                                const clone = linkElement.cloneNode(true) as HTMLElement;
                                const badges = clone.querySelectorAll('.badge, span');
                                badges.forEach(b => {
                                    if (b.textContent?.trim() === '공지') b.remove();
                                });

                                const rawText = clone.textContent?.trim() || '';
                                const lines = rawText.split(/\n+/);
                                if (lines.length > 1) {
                                    title = lines[0].trim();
                                    content = lines.slice(1).join('\n').trim();
                                } else {
                                    title = rawText;
                                    content = rawText;
                                }
                            }

                            title = title.replace(/^공지/, '').trim();
                            if (!content) content = title;
                            if (!title) return;

                            // Date extraction
                            const dateElement = element.querySelector('.date, .time, time, .post-date, .board-date, div[class*="date"], span[class*="date"], [class*="Time"], [class*="Interaction_details"] span:last-child');
                            let dateStr = dateElement?.textContent?.trim() || '';

                            const el = element as HTMLElement;
                            if (!dateStr && el.innerText) {
                                const timeMatch = el.innerText.match(/\d{2}:\d{2}/);
                                if (timeMatch) {
                                    dateStr = timeMatch[0];
                                }
                            }

                            if (!dateStr || (!dateStr.match(/\d{4}-\d{2}-\d{2}/) && !dateStr.includes('전') && !dateStr.includes('어제'))) {
                                const elementText = element.textContent || '';
                                const dateMatch = elementText.match(/(\d{4}-\d{2}-\d{2})/);
                                if (dateMatch) {
                                    dateStr = dateMatch[1];
                                }
                            }

                            // Parse date
                            let postDate: Date | null = null;
                            const now = new Date();

                            if (dateStr.includes('방금 전')) {
                                postDate = new Date();
                            } else if (dateStr.includes('분 전')) {
                                const mins = parseInt(dateStr.replace(/[^0-9]/g, ''));
                                postDate = new Date(now.getTime() - mins * 60 * 1000);
                            } else if (dateStr.includes('시간 전')) {
                                const hours = parseInt(dateStr.replace(/[^0-9]/g, ''));
                                postDate = new Date(now.getTime() - hours * 60 * 60 * 1000);
                            } else if (dateStr.includes('일 전')) {
                                const days = parseInt(dateStr.replace(/[^0-9]/g, ''));
                                postDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
                            } else if (dateStr.includes('어제')) {
                                postDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                            } else {
                                dateStr = dateStr.replace(/\./g, '-');
                                if (dateStr.match(/^\d{2}:\d{2}$/)) {
                                    const [hours, mins] = dateStr.split(':').map(Number);
                                    postDate = new Date(now);
                                    postDate.setHours(hours, mins, 0, 0);
                                } else if (dateStr.match(/^\d{2}-\d{2}$/)) {
                                    const year = now.getFullYear();
                                    postDate = new Date(`${year}-${dateStr}`);
                                } else if (dateStr.match(/^\d{2}-\d{2}-\d{2}$/)) {
                                    postDate = new Date(`20${dateStr}`);
                                } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                    postDate = new Date(dateStr);
                                }
                            }

                            if (postDate && !isNaN(postDate.getTime())) {
                                const viewElement = element.querySelector('.view, .hit, .view-count');
                                const views = parseInt(viewElement?.textContent?.replace(/[^0-9]/g, '') || '0');

                                extracted.push({
                                    id: `${streamerId}-${postId || index}`,
                                    title,
                                    date: postDate.toISOString(),
                                    views,
                                    postId
                                });
                            }
                        } catch (err) {
                            // ignore extraction errors
                        }
                    });

                    return { notices: extracted, profileImage, extractedName };
                }, bjId);

                notices.push(...pageData.notices.map((n: any) => ({
                    ...n,
                    streamerId: bjId,
                    streamerName: registeredName || pageData.extractedName,
                    profileImage: pageData.profileImage,
                    content: n.content || n.title,
                    id: `${bjId}-${n.postId || Math.random().toString(36).substr(2, 9)}`,
                    crawledAt: new Date().toISOString()
                })));

            } catch (pageError) {
                console.error(`Error crawling ${url}:`, (pageError as Error).message);
            } finally {
                await page.close();
            }
        }

        await browser.close();
    } catch (error) {
        console.error(`Browser launch error for ${bjId}:`, error);
    }

    // Deduplicate and limit to 5 per streamer
    const uniqueNotices = Array.from(new Map(notices.map(n => [n.id, n])).values());
    uniqueNotices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return uniqueNotices.slice(0, 5);
}

// Update cache
export async function updateNoticesCache(): Promise<void> {
    if (isUpdating) {
        console.log('[Notice Cache] Update already in progress');
        return;
    }

    isUpdating = true;
    console.log('[Notice Cache] Starting update...');

    try {
        const notelinkData = await fs.readFile(NOTELINK_FILE, 'utf-8');
        const notelinks: NoticeLink[] = JSON.parse(notelinkData);

        let streamerMap: Record<string, string> = {};
        try {
            const streamerData = await fs.readFile(STREAMERS_FILE, 'utf-8');
            const streamers = JSON.parse(streamerData);
            streamers.forEach((s: any) => {
                streamerMap[s.bjId] = s.name;
            });
        } catch (e) {
            console.log('[Notice Cache] Could not read streamers.json');
        }

        const allNotices: CachedNotice[] = [];

        for (const link of notelinks) {
            if (!link.noticeUrl) continue;

            const urls = Array.isArray(link.noticeUrl) ? link.noticeUrl : [link.noticeUrl];
            console.log(`[Notice Cache] Crawling ${link.id}...`);

            const registeredName = streamerMap[link.id];
            const notices = await crawlNoticesForStreamer(link.id, urls, registeredName);
            allNotices.push(...notices);
        }

        allNotices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        await writeCache(allNotices);
        lastUpdate = new Date();

        console.log(`[Notice Cache] Update complete. Cached ${allNotices.length} notices`);
    } catch (error) {
        console.error('[Notice Cache] Update failed:', error);
    } finally {
        isUpdating = false;
    }
}

// Get cached notices
export async function getCachedNotices(): Promise<CachedNotice[]> {
    return await readCache();
}

// Get last update time
export function getLastUpdateTime(): Date | null {
    return lastUpdate;
}

// Start auto-update
export function startAutoUpdate(): void {
    updateNoticesCache();
    setInterval(() => {
        updateNoticesCache();
    }, 10 * 60 * 1000);
    console.log('[Notice Cache] Auto-update started (10 min)');
}
