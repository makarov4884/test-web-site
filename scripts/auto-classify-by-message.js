const fs = require('fs');
const path = require('path');

// 파일 경로
const crawlDataPath = path.join(__dirname, '..', 'data', 'crawl_data.json');
const keywordsPath = path.join(__dirname, '..', 'data', 'keywords.json');

console.log('🔧 메시지 기반 자동 분류 스크립트 시작...\n');

// keywords.json 읽기
const keywords = JSON.parse(fs.readFileSync(keywordsPath, 'utf-8'));

// crawl_data.json 읽기
const crawlData = JSON.parse(fs.readFileSync(crawlDataPath, 'utf-8'));

// 통계
let totalCount = 0;
let classifiedCount = 0;
const classificationStats = {};

// 데이터 분류
if (crawlData.data && Array.isArray(crawlData.data)) {
    crawlData.data = crawlData.data.map(item => {
        totalCount++;

        // 이미 분류된 항목은 건너뛰기
        if (item.targetBjName && item.targetBjName !== '미분류' && item.targetBjName.trim() !== '') {
            return item;
        }

        // 메시지에서 키워드 찾기
        const message = item.message || '';

        for (const mapping of keywords) {
            const allKeywords = [mapping.bjName, ...mapping.keywords];

            // 메시지에 키워드가 포함되어 있는지 확인
            const matchedKeyword = allKeywords.find(keyword =>
                keyword && message.includes(keyword)
            );

            if (matchedKeyword) {
                classifiedCount++;

                if (!classificationStats[mapping.bjName]) {
                    classificationStats[mapping.bjName] = { count: 0, balloons: 0 };
                }
                classificationStats[mapping.bjName].count++;
                classificationStats[mapping.bjName].balloons += item.ballonCount;

                return {
                    ...item,
                    targetBjName: mapping.bjName
                };
            }
        }

        return item;
    });
}

// 결과 출력
console.log(`📊 총 ${totalCount}개의 후원 데이터 처리`);
console.log(`✅ ${classifiedCount}개의 미분류 후원을 자동 분류 완료\n`);

if (Object.keys(classificationStats).length > 0) {
    console.log('📝 분류 내역:');
    Object.entries(classificationStats)
        .sort((a, b) => b[1].balloons - a[1].balloons)
        .forEach(([bjName, stats]) => {
            console.log(`  ${bjName}: ${stats.count}건 / ${stats.balloons.toLocaleString()}개`);
        });
    console.log('');
}

// 파일 저장
fs.writeFileSync(crawlDataPath, JSON.stringify(crawlData, null, 2));
console.log('💾 crawl_data.json 저장 완료!');
