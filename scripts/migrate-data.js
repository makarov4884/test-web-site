const fs = require('fs');
const path = require('path');
const supabase = require('./supabase-client');

async function migrateData() {
    console.log('🚀 데이터 이사 시작 (File -> Supabase DB)');

    // 1. 키워드 데이터 이동
    const keywordsPath = path.join(__dirname, '../data/keywords.json');
    if (fs.existsSync(keywordsPath)) {
        const keywordsData = JSON.parse(fs.readFileSync(keywordsPath, 'utf8'));
        console.log(`📦 키워드 데이터 읽음: ${keywordsData.length}개`);

        // DB 초기화 (기존 데이터 삭제)
        const { error: deleteError } = await supabase.from('keywords').delete().neq('id', 0);
        if (deleteError) console.error('키워드 삭제 실패:', deleteError);

        // 데이터 가공 (id는 자동생성이므로 제외)
        const keywordPayloads = keywordsData.map(item => ({
            bj_name: item.bjName,
            keywords: item.keywords
        }));

        const { error: insertError } = await supabase.from('keywords').insert(keywordPayloads);
        if (insertError) {
            console.error('❌ 키워드 업로드 실패:', insertError);
        } else {
            console.log('✅ 키워드 업로드 완료!');
        }
    }

    // 2. 후원 내역 데이터 이동
    const crawlPath = path.join(__dirname, '../data/crawl_data.json');
    if (fs.existsSync(crawlPath)) {
        const crawlData = JSON.parse(fs.readFileSync(crawlPath, 'utf8'));
        console.log(`📦 후원 내역 데이터 읽음: ${crawlData.length}개`);

        // DB 초기화
        const { error: deleteError2 } = await supabase.from('donations').delete().neq('id', 0);
        if (deleteError2) console.error('후원내역 삭제 실패:', deleteError2);

        // 대량 데이터는 끊어서 올리기 (Batch)
        const BATCH_SIZE = 500;
        let successCount = 0;

        for (let i = 0; i < crawlData.length; i += BATCH_SIZE) {
            const chunk = crawlData.slice(i, i + BATCH_SIZE);

            // 데이터 매핑
            const donationPayloads = chunk.map(item => ({
                message_id: item.messageId || 'unknown_' + Math.random(), // ID 없으면 임시 생성
                create_date: item.createDate,
                relative_time: item.relativeTime,
                ballon_user_name: item.ballonUserName,
                ballon_count: parseInt(item.ballonCount) || 0,
                target_bj_name: item.targetBjName,
                message: item.message,
                is_cancel: item.isCancel || false
            }));

            const { error: insertError2 } = await supabase.from('donations').insert(donationPayloads);
            if (insertError2) {
                console.error(`❌ 후원내역 업로드 실패 (청크 ${i}):`, insertError2);
            } else {
                successCount += chunk.length;
                console.log(`✅ 후원내역 업로드 진행 중... (${successCount}/${crawlData.length})`);
            }
        }
        console.log('🎉 모든 데이터 이사 완료!');
    } else {
        console.log('⚠️ crawl_data.json 파일이 없습니다.');
    }
}

migrateData();
