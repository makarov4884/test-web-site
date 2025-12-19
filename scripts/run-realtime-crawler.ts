
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

        // 데이터 추출
        const stats = await page.evaluate(() => {
            const getText = (selector: string) => document.querySelector(selector)?.textContent?.trim() || '0';

            // Bcraping 사이트 구조에 맞춰 선택자 수정 필요 (현재 구조 추정)
            // 실제 사이트 구조를 반영해야 함. 
            // (사용자가 이전에 제공한 정보 기반 작성)

            // * 아래 선택자는 실제 사이트가 바뀌면 수정해야 함 *
            return {
                broadcast_time: getText('div:has-text("방송시간") + div') || '0시간',
                max_viewers: getText('div:has-text("최고시청자") + div') || '0명',
                avg_viewers: getText('div:has-text("평균시청자") + div') || '0명',
                fan_count: getText('div:has-text("팬가입") + div') || '0명',
                total_view_cnt: getText('div:has-text("누적시청자") + div') || '0명',
                chat_participation: getText('div:has-text("채팅참여율") + div') || '0%'
            };
        });

        // 랭킹 추출 (Top 5만)
        const rankingList = await page.evaluate(() => {
            const rows = document.querySelectorAll('table tbody tr'); // 테이블 선택자 확인 필요
            const list: any[] = [];
            rows.forEach((row, idx) => {
                if (idx < 5) {
                    const cols = row.querySelectorAll('td');
                    if (cols.length >= 4) {
                        list.push({
                            rank: idx + 1,
                            username: cols[1]?.textContent?.trim() || 'User',
                            score: parseInt(cols[3]?.textContent?.replace(/,/g, '') || '0')
                        });
                    }
                }
            });
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
