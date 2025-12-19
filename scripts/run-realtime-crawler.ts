import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kvpkghcflwtmylmenfkc.supabase.co';
const serviceRoleKey = 'sb_secret_JE1HtwuIatNRDBOp4C_9ow_ph8_KzhW';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function getTargetBjIds() {
    const { data } = await supabase.from('keywords').select('keywords');
    const ids = new Set<string>();

    if (data) {
        data.forEach(row => {
            if (row.keywords && Array.isArray(row.keywords)) {
                row.keywords.forEach((k: string) => {
                    if (/^[a-zA-Z0-9_-]+$/.test(k)) {
                        ids.add(k);
                    }
                });
            }
        });
    }

    return ids.size > 0 ? Array.from(ids) : ['pyh3646'];
}

async function crawlBjStats(page: any, bjId: string) {
    console.log(`📡 [${bjId}] 데이터 수집 시작...`);

    try {
        await page.goto(`https://bcraping.kr/monitor/${bjId}`, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000);

        const stats = await page.evaluate(() => {
            function getByXPath(xpath: string): string {
                const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                return result.singleNodeValue?.textContent?.trim() || '0';
            }

            const xpaths = {
                broadcast_time: '//div[contains(text(), "누적 방송 시간")]/following-sibling::div',
                max_viewers: '//div[contains(text(), "최고 시청자")]/following-sibling::div/span[1]',
                avg_viewers: '//div[contains(text(), "평균 시청자")]/following-sibling::div/span[1]',
                fan_count: '//div[contains(text(), "팬클럽 수")]/following-sibling::div',
                total_view_cnt: '//div[contains(text(), "시청자수")]/following-sibling::div',
                chat_participation: '//div[contains(text(), "채팅 참여율")]/following-sibling::div/span[1]'
            };

            return {
                broadcast_time: getByXPath(xpaths.broadcast_time),
                max_viewers: getByXPath(xpaths.max_viewers),
                avg_viewers: getByXPath(xpaths.avg_viewers),
                fan_count: getByXPath(xpaths.fan_count),
                total_view_cnt: getByXPath(xpaths.total_view_cnt),
                chat_participation: getByXPath(xpaths.chat_participation)
            };
        });

        console.log(`✅ [${bjId}] 수집 완료:`, stats);

        const { error } = await supabase.from('streamer_stats').upsert({
            bj_id: bjId,
            ...stats,
            ranking_list: [],
            last_updated: new Date().toISOString()
        });

        if (error) console.error(`❌ DB 저장 실패 [${bjId}]:`, error);

    } catch (e: any) {
        console.error(`⚠️ [${bjId}] 크롤링 에러:`, e.message);
    }
}

async function runLoop() {
    console.log('🚀 실시간 크롤러 시작');

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    while (true) {
        const bjIds = await getTargetBjIds();
        console.log(`📋 대상 BJ: ${bjIds.length}명`);

        const context = await browser.newContext();
        const page = await context.newPage();

        for (const bjId of bjIds) {
            await crawlBjStats(page, bjId);
            await page.waitForTimeout(2000);
        }

        await context.close();

        console.log('💤 한 바퀴 완료. 30초 대기...');
        await new Promise(resolve => setTimeout(resolve, 30000));
    }
}

runLoop().catch(console.error);
