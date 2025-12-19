const fs = require('fs');
const path = require('path');

console.log('🧹 강력한 중복 데이터 정리 스크립트 시작...\n');

// manual_data.json 정리 (내용 기반 중복 제거)
const manualPath = path.join(process.cwd(), 'data', 'manual_data.json');
if (fs.existsSync(manualPath)) {
    try {
        const manualData = JSON.parse(fs.readFileSync(manualPath, 'utf-8'));
        const originalCount = Array.isArray(manualData) ? manualData.length : 0;

        // 내용 기반 중복 제거 (날짜+사용자+개수로 판단)
        const contentMap = new Map();
        (Array.isArray(manualData) ? manualData : []).forEach(item => {
            // 고유 키: 날짜 + 사용자명 + 별풍선 개수
            const key = `${item.createDate}|${item.ballonUserName}|${item.ballonCount}`;

            const existing = contentMap.get(key);
            if (!existing) {
                // 새로운 항목
                contentMap.set(key, item);
            } else {
                // 중복 발견 - messageId가 더 긴 것을 유지 (더 정확한 ID)
                if (item.messageId.length > existing.messageId.length) {
                    contentMap.set(key, item);
                }
            }
        });

        // 시간 내림차순 정렬
        const cleaned = Array.from(contentMap.values()).sort((a, b) => {
            const timeA = new Date(a.createDate).getTime();
            const timeB = new Date(b.createDate).getTime();

            if (timeB !== timeA) {
                return timeB - timeA;
            }

            // 같은 시간이면 sequenceNum 순서
            const seqA = a.sequenceNum || 0;
            const seqB = b.sequenceNum || 0;
            return seqA - seqB;
        });

        // 저장
        fs.writeFileSync(manualPath, JSON.stringify(cleaned, null, 2));

        console.log(`✅ manual_data.json 정리 완료`);
        console.log(`   - 원본: ${originalCount}개`);
        console.log(`   - 정리 후: ${cleaned.length}개`);
        console.log(`   - 삭제된 중복: ${originalCount - cleaned.length}개\n`);

        if (originalCount - cleaned.length > 0) {
            console.log(`💡 ${originalCount - cleaned.length}개의 중복 항목이 제거되었습니다!`);
        }
    } catch (e) {
        console.error('❌ manual_data.json 처리 실패:', e.message);
    }
} else {
    console.log('⚠️  manual_data.json 파일이 없습니다.\n');
}

// crawl_data.json 정리 (동일 로직 적용)
const crawlPath = path.join(process.cwd(), 'data', 'crawl_data.json');
if (fs.existsSync(crawlPath)) {
    try {
        const fileContent = JSON.parse(fs.readFileSync(crawlPath, 'utf-8'));
        // crawl_data.json은 { success: true, data: [...] } 구조임
        const crawlData = fileContent.data || [];
        const originalCount = crawlData.length;

        // 내용 기반 중복 제거
        const contentMap = new Map();
        crawlData.forEach(item => {
            const key = `${item.createDate}|${item.ballonUserName}|${item.ballonCount}`;
            const existing = contentMap.get(key);

            if (!existing) {
                contentMap.set(key, item);
            } else {
                // 중복 시, 타겟 BJ 이름이 있는 것을 우선
                if (!existing.targetBjName && item.targetBjName) {
                    contentMap.set(key, item);
                }
                // 타겟 유무가 같으면 messageId가 더 긴 것(보통 더 정확) 선호
                else if ((!!existing.targetBjName === !!item.targetBjName) && item.messageId.length > existing.messageId.length) {
                    contentMap.set(key, item);
                }
            }
        });

        const cleaned = Array.from(contentMap.values()).sort((a, b) => {
            return new Date(b.createDate).getTime() - new Date(a.createDate).getTime();
        });

        // 파일 저장 (구조 유지)
        fileContent.data = cleaned;
        fileContent.lastUpdate = new Date().toISOString(); // 업데이트 시각 갱신
        fs.writeFileSync(crawlPath, JSON.stringify(fileContent, null, 2));

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

console.log('🎉 중복 데이터 정리 완료!');
