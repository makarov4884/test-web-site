const supabase = require('./supabase-client');

async function checkCount() {
    // donations 테이블 전체 개수 세기
    const { count, error } = await supabase
        .from('donations')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error:', error);
    } else {
        console.log(`📊 현재 Supabase에 저장된 데이터 개수: ${count}개`);
    }
}

checkCount();
