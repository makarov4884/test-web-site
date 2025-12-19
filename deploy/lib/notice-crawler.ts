import type { Browser, Route } from 'playwright';
import { getStreamers } from '@/app/actions';
import path from 'path';
import fs from 'fs/promises';
import { supabaseAdmin } from '@/lib/supabase';

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
    console.log('[Notice Crawler] Starting crawl (Supabase DB Mode)...');
    const allNotices: Notice[] = [];
    let browser: Browser | null = null;

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
            // Optional file
        }

        browser = await chromium.launch({
            headless: true,
            args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-gpu']
        });

        // 10개씩 병렬 처리
        const batchSize = 10;
        for (let i = 0; i < streamers.length; i += batchSize) {
            const batch = streamers.slice(i, i + batchSize);
            const batchNotices: Notice[] = [];

            await Promise.all(batch.map(async (streamer) => {
                if (!browser) return;
                let context;
                try {
                    context = await browser.newContext({
                        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                        ignoreHTTPSErrors: true,
                    });
                    const page = await context.newPage();
                    await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,mp4}', route => route.abort());

                    let targetUrls: string[] = [];
                    const noteLink = noteLinks.find(n => n.id === streamer.bjId);
                    if (noteLink && noteLink.noticeUrl) {
                        targetUrls = Array.isArray(noteLink.noticeUrl) ? noteLink.noticeUrl : [noteLink.noticeUrl];
                    }
                    targetUrls.push(`https://www.sooplive.co.kr/station/${streamer.bjId}`);

                    for (const url of targetUrls) {
                        try {
                            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

                            // 간단한 날짜 파싱 및 추출 로직 (상세 로직 생략하고 핵심만)
                            const items = await page.evaluate(({ streamerId, streamerName }) => {
                                const els = document.querySelectorAll('li, tr, div[class*="Board_newsItem"]');
                                const results: any[] = [];
                                const now = new Date();

                                els.forEach((el, idx) => {
                                    const titleEl = el.querySelector('a');
                                    if (!titleEl) return;

                                    const title = titleEl.innerText.replace('공지', '').trim();
                                    const link = titleEl.getAttribute('href');
                                    const fullLink = link?.startsWith('http') ? link : `https://www.sooplive.co.kr${link}`;

                                    // 날짜 대충 찾기
                                    let date = now.toISOString().split('T')[0];
                                    const text = el.textContent || '';
                                    const dateMatch = text.match(/(\d{4})[-.](\d{2})[-.](\d{2})/);
                                    if (dateMatch) date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
                                    else if (text.includes('어제')) {
                                        const d = new Date(); d.setDate(d.getDate() - 1);
                                        date = d.toISOString().split('T')[0];
                                    }

                                    if (title && fullLink) {
                                        results.push({
                                            id: `${streamerId}_${idx}`,
                                            streamerId,
                                            streamerName,
                                            title,
                                            content: '',
                                            date,
                                            url: fullLink
                                        });
                                    }
                                });
                                return results;
                            }, { streamerId: streamer.bjId, streamerName: streamer.name });

                            batchNotices.push(...items);
                        } catch (e) {
                            // Page load error
                        }
                    }
                    await context.close();
                } catch (e) {
                    // Context error
                }
            }));

            // DB 저장 (Batch 단위)
            if (batchNotices.length > 0) {
                const dbPayloads = batchNotices.map(n => ({
                    bj_name: n.streamerName,
                    title: n.title,
                    link: n.url,
                    date: n.date,
                    is_fixed: false
                }));

                const { error } = await supabaseAdmin
                    .from('notices')
                    .upsert(dbPayloads, { onConflict: 'link', ignoreDuplicates: true });

                if (error) console.error('DB Error:', error.message);
                else console.log(`✅ Saved ${batchNotices.length} notices to DB.`);
            }
        }
    } catch (e) {
        console.error('Crawler Error:', e);
    } finally {
        if (browser) await browser.close();
    }
    return allNotices;
}
