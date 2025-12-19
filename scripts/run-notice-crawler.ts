import { crawlNotices } from '../lib/notice-crawler';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kvpkghcflwtmylmenfkc.supabase.co';
const serviceRoleKey = 'sb_secret_JE1HtwuIatNRDBOp4C_9ow_ph8_KzhW';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
    console.log('🔄 공지사항 크롤러 시작...');

    try {
        // 원래 크롤러 사용 (더 강력함)
        const notices = await crawlNotices(async (currentNotices) => {
            // 진행 중 저장 (Incremental Saving)
            console.log(`📝 ${currentNotices.length}개 공지사항 저장 중...`);

            for (const notice of currentNotices) {
                const { error } = await supabase.from('notices').upsert({
                    id: notice.id,
                    bj_field: notice.streamerId,
                    bj_name: notice.streamerName,
                    title: notice.title,
                    date: notice.date,
                    link: notice.url,
                    created_at: new Date().toISOString()
                });

                if (error) {
                    console.error(`❌ 저장 실패 [${notice.streamerName}]:`, error.message);
                }
            }

            console.log(`✅ ${currentNotices.length}개 저장 완료!`);
        });

        console.log(`✅ 크롤링 완료! 총 ${notices.length}개의 공지사항을 수집했습니다.`);

    } catch (error) {
        console.error('❌ 크롤러 실행 중 오류 발생:', error);
    }
}

main();
