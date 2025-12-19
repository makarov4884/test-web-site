const fs = require('fs');
const path = require('path');
const supabase = require('./supabase-client');

async function migrateData() {
    console.log('🚀 데이터 이사 재시도 (File -> Supabase DB)');

    // 1. 후원 내역 데이터 이동
    const crawlPath = path.join(__dirname, '../data/crawl_data.json');
    if (fs.existsSync(crawlPath)) {
        const fileContent = fs.readFileSync(crawlPath, 'utf8');
        const jsonContent = JSON.parse(fileContent);

        // 🔥 여기가 문제였음: 배열이 'data' 속성 안에 들어있음
        const crawlData = Array.isArray(jsonContent) ? jsonContent : (jsonContent.data || []);

        console.log(`📦 후원 내역 데이터 읽음: ${crawlData.length}개`);

        if (crawlData.length === 0) {
            console.error('❌ 데이터가 비어있습니다. 구조를 다시 확인하세요.');
            return;
        }

        // DB 초기화
        const { error: deleteError } = await supabase.from('donations').delete().neq('id', 0);
        if (deleteError) console.error('후원내역 삭제 실패:', deleteError);
        else console.log('🗑️ 기존 DB 데이터 삭제 완료');

        // 대량 데이터는 끊어서 올리기 (Batch)
        const BATCH_SIZE = 500;
        let successCount = 0;

        for (let i = 0; i < crawlData.length; i += BATCH_SIZE) {
            const chunk = crawlData.slice(i, i + BATCH_SIZE);

            // 데이터 매핑
            const donationPayloads = chunk.map(item => ({
                message_id: item.messageId || 'unknown_' + Math.random(),
                create_date: item.createDate,
                relative_time: item.relativeTime,
                ballon_user_name: item.ballonUserName,
                ballon_count: parseInt(item.ballonCount) || 0,
                target_bj_name: item.targetBjName,
                message: item.message,
                is_cancel: item.isCancel || false
            }));

            const { error: insertError } = await supabase.from('donations').insert(donationPayloads);
            if (insertError) {
                console.error(`❌ 후원내역 업로드 실패 (청크 ${i}):`, insertError);
            } else {
                successCount += chunk.length;
                process.stdout.write(`✅ 진행 중... (${successCount}/${crawlData.length})\r`);
            }
        }
        console.log('\n🎉 모든 데이터 이사 완료!');
    } else {
        console.log('⚠️ crawl_data.json 파일이 없습니다.');
    }
}

migrateData();
