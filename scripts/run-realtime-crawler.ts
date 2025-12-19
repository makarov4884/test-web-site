
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kvpkghcflwtmylmenfkc.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_JE1HtwuIatNRDBOp4C_9ow_ph8_KzhW';
const supabase = createClient(supabaseUrl, serviceRoleKey);

// 크롤링 대상 ID 목록 가져오기
async function getTargetBjIds() {
    // 1. DB에서 가져오기 시도
    const { data, error } = await supabase.from('keywords').select('keywords');
    if (!error && data) {
        // keywords 배열 안에 있는 영어 ID들 추출
        const ids = new Set<string>();
        data.forEach(row => {
            if (row.keywords && Array.isArray(row.keywords)) {
                row.keywords.forEach((k: string) => {
                    // 영어로된 ID만 추출 (간단한 정규식)
                    if (/^[a-zA-Z0-9_-]+$/.test(k) && !/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(k)) {
                        ids.add(k);
                    }
                });
            }
        });
        return Array.from(ids);
    }

    // 2. 실패 시 로컬 파일(streamers.json)에서 가져오기
    try {
        const streamersPath = path.join(process.cwd(), 'data', 'streamers.json');
        const content = fs.readFileSync(streamersPath, 'utf-8');
        const json = JSON.parse(content);
        return json.map((s: any) => s.bjId);
    } catch (e) {
        console.error('BJ 목록 로드 실패:', e);
        return ['pyh3646']; // 기본값
    }
}

async function crawlBjStats(page: any, bjId: string) {
    console.log(`📡 [${bjId}] 데이터 수집 시작...`);

    try {
        await page.goto(`https://bcraping.kr/monitor/${bjId}`, { waitUntil: 'networkidle', timeout: 30000 });

        // 데이터가 로딩될 때까지 대기 (스켈레톤 UI 이후)
        await page.waitForSelector('div:has-text("누적 방송 시간")', { timeout: 10000 }).catch(() => { });

        // 데이터 추출 - XPath 기반
        const stats = await page.evaluate(() => {
            const getByXPath = (xpath) => {
                const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                return result.singleNodeValue?.textContent?.trim() || '0';
            };

            return {
                broadcast_time: getByXPath('//div[contains(text(), "누적 방송 시간")]/following-sibling::div'),
                max_viewers: getByXPath('//div[contains(text(), "최고 시청자")]/following-sibling::div/span[1]'),
                avg_viewers: getByXPath('//div[contains(text(), "평균 시청자")]/following-sibling::div/span[1]'),
                fan_count: getByXPath('//div[contains(text(), "팬클럽 수")]/following-sibling::div'),
                total_view_cnt: getByXPath('//div[contains(text(), "시청자수")]/following-sibling::div'),
                chat_participation: getByXPath('//div[contains(text(), "채팅 참여율")]/following-sibling::div/span[1]')
            };
        });

        // 랭킹 추출 (Top 5만) - 랭킹 탭으로 이동 필요할 수도 있음
        const rankingList = await page.evaluate(() => {
            const rows = document.querySelectorAll('table tbody tr');
            const list = [];
            for (let idx = 0; idx < Math.min(rows.length, 5); idx++) {
                const row = rows[idx];
                const cols = row.querySelectorAll('td');
                if (cols.length >= 3) {
                    const usernameDiv = cols[1]?.querySelector('div:last-child');
                    list.push({
                        rank: idx + 1,
                        username: usernameDiv?.textContent?.trim() || 'User',
                        score: parseInt(cols[2]?.textContent?.replace(/,/g, '') || '0')
                    });
                }
            }
            return list;
        });

        console.log(`✅ [${bjId}] 수집 완료:`, stats);

        // Supabase 업데이트 (Upsert)
        const { error } = await supabase.from('streamer_stats').upsert({
            bj_id: bjId,
            ...stats,
            ranking_list: rankingList,
            last_updated: new Date().toISOString()
        });

        if (error) console.error(`❌ DB 저장 실패 [${bjId}]:`, error);

    } catch (e) {
        console.error(`⚠️ [${bjId}] 크롤링 에러:`, e);
    }
}

async function runLoop() {
    console.log('🚀 실시간 크롤러 시작 (Infinite Loop)');

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
            await page.waitForTimeout(2000); // 2초 휴식
        }

        await context.close();

        console.log('💤 한 바퀴 완료. 30초 대기...');
        await new Promise(resolve => setTimeout(resolve, 30000));
    }
}

runLoop().catch(console.error);
