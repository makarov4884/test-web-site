import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://kvpkghcflwtmylmenfkc.supabase.co';
const serviceRoleKey = 'sb_secret_JE1HtwuIatNRDBOp4C_9ow_ph8_KzhW';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function getStreamers() {
    // Supabase에서 스트리머 목록 가져오기
    const { data } = await supabase.from('keywords').select('bj_name, keywords');
    const streamers: Array<{ bjId: string; name: string }> = [];

    if (data) {
        data.forEach(row => {
            if (row.keywords && Array.isArray(row.keywords)) {
                row.keywords.forEach((k: string) => {
                    if (/^[a-zA-Z0-9_-]+$/.test(k)) {
                        streamers.push({ bjId: k, name: row.bj_name || k });
                    }
                });
            }
        });
    }

    // 중복 제거
    const uniqueStreamers = Array.from(
        new Map(streamers.map(s => [s.bjId, s])).values()
    );

    return uniqueStreamers;
}

async function crawlNotices() {
    console.log('[Notice Crawler] Starting crawl (Supabase DB Mode)...');

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const streamers = await getStreamers();
        console.log(`[Notice Crawler] Found ${streamers.length} streamers`);

        if (streamers.length === 0) {
            console.log('[Notice Crawler] No streamers found');
            return;
        }

        const allNotices: any[] = [];

        for (const streamer of streamers) { // 전체 스트리머
            console.log(`[Notice Crawler] Crawling ${streamer.name} (${streamer.bjId})...`);

            const context = await browser.newContext();
            const page = await context.newPage();

            try {
                const url = `https://www.sooplive.co.kr/station/${streamer.bjId}`;
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
                await page.waitForTimeout(3000);

                const notices = await page.evaluate(({ bjId, bjName }) => {
                    const items: any[] = [];
                    const listItems = document.querySelectorAll('li[class*="Post_"], div[class*="Board_newsItem"]');

                    listItems.forEach((el, idx) => {
                        const titleEl = el.querySelector('[class*="ContentTitle_title"], [class*="Title_title"]');
                        const linkEl = el.querySelector('a');
                        const dateEl = el.querySelector('[class*="Interaction_details"], [class*="Date_date"]');

                        if (titleEl && linkEl) {
                            const title = titleEl.textContent?.trim() || '';
                            const href = linkEl.getAttribute('href') || '';
                            const fullUrl = href.startsWith('http') ? href : `https://www.sooplive.co.kr${href}`;

                            const dateText = dateEl?.textContent?.trim() || '';
                            const now = new Date();
                            let date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

                            const dateMatch = dateText.match(/(\d{4})[-.](\d{2})[-.](\d{2})/);
                            if (dateMatch) {
                                date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
                            }

                            if (title.length > 0) {
                                items.push({
                                    id: `${bjId}_${idx}_${Date.now()}`,
                                    streamerId: bjId,
                                    streamerName: bjName,
                                    title: title.replace(/^공지\s*/, ''),
                                    content: '',
                                    date,
                                    url: fullUrl
                                });
                            }
                        }
                    });

                    return items;
                }, { bjId: streamer.bjId, bjName: streamer.name });

                if (notices.length > 0) {
                    allNotices.push(...notices);
                    console.log(`[Notice Crawler] Found ${notices.length} notices from ${streamer.name}`);
                }

            } catch (e: any) {
                console.error(`[Notice Crawler] Error crawling ${streamer.name}:`, e.message);
            } finally {
                await context.close();
            }
        }

        // Supabase에 저장
        if (allNotices.length > 0) {
            console.log(`[Notice Crawler] Saving ${allNotices.length} notices to Supabase...`);

            for (const notice of allNotices) {
                const { error } = await supabase.from('notices').upsert({
                    id: notice.id,
                    streamer_id: notice.streamerId,
                    streamer_name: notice.streamerName,
                    title: notice.title,
                    content: notice.content,
                    date: notice.date,
                    url: notice.url,
                    created_at: new Date().toISOString()
                });

                if (error) {
                    console.error(`[Notice Crawler] Error saving notice:`, error.message);
                }
            }

            console.log(`✅ Saved ${allNotices.length} notices to Supabase!`);
        }

    } finally {
        await browser.close();
    }
}

async function main() {
    console.log('🔄 공지사항 크롤러 시작...');
    try {
        await crawlNotices();
        console.log(`✅ 크롤링 완료!`);
    } catch (error) {
        console.error('❌ 크롤러 실행 중 오류 발생:', error);
    }
}

main();
