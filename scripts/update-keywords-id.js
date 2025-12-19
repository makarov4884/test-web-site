const fs = require('fs');
const path = require('path');
const supabase = require('./supabase-client');

async function updateKeywordsWithId() {
    console.log('🔄 BJ 영어 아이디를 DB에 매핑 중...');

    // 1. streamers.json에서 영어 ID 가져오기
    const streamersPath = path.join(__dirname, '../data/streamers.json');
    const streamersData = JSON.parse(fs.readFileSync(streamersPath, 'utf8'));

    // 2. DB의 keywords 테이블 조회
    const { data: dbKeywords, error } = await supabase.from('keywords').select('*');
    if (error) {
        console.error('DB 조회 실패:', error);
        return;
    }

    // 3. 매칭 및 업데이트
    for (const dbRow of dbKeywords) {
        // 이름으로 매칭 시도
        const match = streamersData.find(s =>
            dbRow.bj_name.includes(s.name) || s.name.includes(dbRow.bj_name) ||
            (dbRow.keywords && dbRow.keywords.includes(s.name))
        );

        if (match) {
            // 기존 키워드 배열에 bjId 추가 (중복 방지)
            const newKeywords = [...(dbRow.keywords || [])];
            if (!newKeywords.includes(match.bjId)) {
                newKeywords.push(match.bjId);
            }

            // 업데이트
            const { error: updateError } = await supabase
                .from('keywords')
                .update({ keywords: newKeywords })
                .eq('id', dbRow.id);

            if (updateError) console.error(`❌ ${dbRow.bj_name} 업데이트 실패:`, updateError);
            else console.log(`✅ ${dbRow.bj_name} -> ${match.bjId} 추가 완료`);
        } else {
            console.log(`⚠️ ${dbRow.bj_name}에 해당하는 영어 ID를 찾을 수 없음`);
        }
    }
    console.log('🎉 매핑 작업 완료!');
}

updateKeywordsWithId();
