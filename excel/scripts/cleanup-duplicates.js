const fs = require('fs');
const path = require('path');

console.log('🧹 중복 데이터 정리 스크립트 시작...\n');

// 1. crawl_data.json 정리
const crawlPath = path.join(process.cwd(), 'data', 'crawl_data.json');
if (fs.existsSync(crawlPath)) {
    try {
        const crawlData = JSON.parse(fs.readFileSync(crawlPath, 'utf-8'));
        const originalCount = crawlData.data ? crawlData.data.length : 0;

        // messageId 기반 중복 제거
        const uniqueMap = new Map();
        (crawlData.data || []).forEach(item => {
            if (!uniqueMap.has(item.messageId)) {
                uniqueMap.set(item.messageId, item);
            }
        });

        // 시간 내림차순 정렬
        const cleaned = Array.from(uniqueMap.values()).sort((a, b) => {
            return new Date(b.createDate).getTime() - new Date(a.createDate).getTime();
        });

        // 저장
        fs.writeFileSync(crawlPath, JSON.stringify({
            success: true,
            data: cleaned,
            lastUpdate: new Date().toISOString(),
            source: 'cleaned'
        }, null, 2));

        console.log(`✅ crawl_data.json 정리 완료`);
        console.log(`   - 원본: ${originalCount}개`);
        console.log(`   - 정리 후: ${cleaned.length}개`);
        console.log(`   - 삭제된 중복: ${originalCount - cleaned.length}개\n`);
    } catch (e) {
        console.error('❌ crawl_data.json 처리 실패:', e.message);
    }
} else {
    console.log('⚠️  crawl_data.json 파일이 없습니다.\n');
}

// 2. manual_data.json 정리
const manualPath = path.join(process.cwd(), 'data', 'manual_data.json');
if (fs.existsSync(manualPath)) {
    try {
        const manualData = JSON.parse(fs.readFileSync(manualPath, 'utf-8'));
        const originalCount = Array.isArray(manualData) ? manualData.length : 0;

        // messageId 기반 중복 제거
        const uniqueMap = new Map();
        (Array.isArray(manualData) ? manualData : []).forEach(item => {
            if (!uniqueMap.has(item.messageId)) {
                uniqueMap.set(item.messageId, item);
            }
        });

        // 시간 내림차순 정렬
        const cleaned = Array.from(uniqueMap.values()).sort((a, b) => {
            return new Date(b.createDate).getTime() - new Date(a.createDate).getTime();
        });

        // 저장
        fs.writeFileSync(manualPath, JSON.stringify(cleaned, null, 2));

        console.log(`✅ manual_data.json 정리 완료`);
        console.log(`   - 원본: ${originalCount}개`);
        console.log(`   - 정리 후: ${cleaned.length}개`);
        console.log(`   - 삭제된 중복: ${originalCount - cleaned.length}개\n`);
    } catch (e) {
        console.error('❌ manual_data.json 처리 실패:', e.message);
    }
} else {
    console.log('⚠️  manual_data.json 파일이 없습니다.\n');
}

console.log('🎉 중복 데이터 정리 완료!');
