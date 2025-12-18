const fs = require('fs');
const path = require('path');

console.log('🗑️  미분류 후원 목록 삭제 시작...\n');

const crawlPath = path.join(process.cwd(), 'data', 'crawl_data.json');

if (!fs.existsSync(crawlPath)) {
    console.log('❌ crawl_data.json 파일이 없습니다!');
    process.exit(1);
}

try {
    const fileData = JSON.parse(fs.readFileSync(crawlPath, 'utf-8'));
    const originalCount = fileData.data ? fileData.data.length : 0;

    console.log(`📦 원본 데이터: ${originalCount}개\n`);

    // 백업 생성
    const backupPath = path.join(process.cwd(), 'data', 'crawl_data_backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(fileData, null, 2));
    console.log(`📦 백업 저장: crawl_data_backup.json\n`);

    // 빈 데이터로 초기화
    fs.writeFileSync(crawlPath, JSON.stringify({
        success: true,
        data: [],
        lastUpdate: new Date().toISOString(),
        source: 'cleared'
    }, null, 2));

    console.log(`✅ crawl_data.json 초기화 완료`);
    console.log(`   - 삭제된 데이터: ${originalCount}개`);
    console.log(`   - 남은 데이터: 0개\n`);

    console.log(`💡 미분류 후원 목록이 모두 삭제되었습니다!`);
    console.log(`💡 크롤러가 계속 실행 중이면 새로운 데이터가 자동으로 수집됩니다.`);

} catch (e) {
    console.error('❌ 처리 실패:', e.message);
}

console.log('\n🎉 작업 완료!');
