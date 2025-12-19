const supabase = require('./supabase-client');

async function checkKeywords() {
    console.log('🔍 키워드(BJ 매핑) 데이터 점검 중...');

    const { data, error } = await supabase
        .from('keywords')
        .select('*');

    if (error) {
        console.error('❌ 에러 발생:', error);
        return;
    }

    console.log(`총 ${data.length}명의 BJ 정보가 있습니다.`);
    if (data.length > 0) {
        console.log('첫 번째 데이터 예시:', data[0]);
    } else {
        console.log('⚠️ 데이터가 비어있습니다! API가 작동하지 않습니다.');
    }
}

checkKeywords();
