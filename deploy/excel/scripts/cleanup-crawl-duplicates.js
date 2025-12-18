const fs = require('fs');
const path = require('path');

console.log('🧹 crawl_data.json 중복 제거 시작...\n');

const crawlPath = path.join(process.cwd(), 'data', 'crawl_data.json');

if (!fs.existsSync(crawlPath)) {
    console.log('❌ crawl_data.json 파일이 없습니다!');
    process.exit(1);
}

try {
    const fileData = JSON.parse(fs.readFileSync(crawlPath, 'utf-8'));
    const data = fileData.data || [];
    const originalCount = data.length;

    console.log(`📦 원본 데이터: ${originalCount}개\n`);

    // 1. messageId 기반 중복 제거
    const uniqueByIdMap = new Map();
    data.forEach(item => {
        if (!uniqueByIdMap.has(item.messageId)) {
            uniqueByIdMap.set(item.messageId, item);
        }
    });

    const afterIdDedup = Array.from(uniqueByIdMap.values());
    console.log(`✅ messageId 중복 제거: ${originalCount}개 → ${afterIdDedup.length}개 (${originalCount - afterIdDedup.length}개 제거)`);

    // 2. 내용 기반 중복 제거 (날짜+사용자+개수)
    const uniqueByContentMap = new Map();
    afterIdDedup.forEach(item => {
        const key = `${item.createDate}|${item.ballonUserName}|${item.ballonCount}`;
        const existing = uniqueByContentMap.get(key);

        if (!existing) {
            uniqueByContentMap.set(key, item);
        } else {
            // messageId가 더 긴 것을 유지 (더 정확한 ID)
            if (item.messageId.length > existing.messageId.length) {
                uniqueByContentMap.set(key, item);
            }
        }
    });

    const afterContentDedup = Array.from(uniqueByContentMap.values());
    console.log(`✅ 내용 중복 제거: ${afterIdDedup.length}개 → ${afterContentDedup.length}개 (${afterIdDedup.length - afterContentDedup.length}개 제거)\n`);

    // 3. 시간 내림차순 정렬
    afterContentDedup.sort((a, b) => {
        const parseDate = (dateStr) => {
            // "12-13 17:40:03" 형식 파싱
            const match = dateStr.match(/(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
            if (match) {
                const [_, month, day, hour, min, sec] = match;
                return new Date(`2025-${month}-${day} ${hour}:${min}:${sec}`).getTime();
            }
            return 0;
        };

        const timeA = parseDate(a.createDate);
        const timeB = parseDate(b.createDate);
        return timeB - timeA; // 내림차순
    });

    // 4. 저장
    const backupPath = path.join(process.cwd(), 'data', 'crawl_data_backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(fileData, null, 2));
    console.log(`📦 백업 저장: crawl_data_backup.json\n`);

    fs.writeFileSync(crawlPath, JSON.stringify({
        success: true,
        data: afterContentDedup,
        lastUpdate: new Date().toISOString(),
        source: 'deduped'
    }, null, 2));

    console.log(`✅ crawl_data.json 저장 완료`);
    console.log(`   - 최종 데이터: ${afterContentDedup.length}개`);
    console.log(`   - 총 제거: ${originalCount - afterContentDedup.length}개\n`);

    // 샘플 출력
    console.log(`📋 최신 데이터 샘플 (5개):`);
    afterContentDedup.slice(0, 5).forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.createDate} | ${item.ballonUserName} | ${item.ballonCount}개`);
    });

} catch (e) {
    console.error('❌ 처리 실패:', e.message);
}

console.log('\n🎉 중복 제거 완료!');
