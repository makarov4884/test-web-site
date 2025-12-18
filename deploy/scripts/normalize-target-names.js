const fs = require('fs');
const path = require('path');

// 파일 경로
const crawlDataPath = path.join(__dirname, '..', 'data', 'crawl_data.json');
const keywordsPath = path.join(__dirname, '..', 'data', 'keywords.json');

console.log('🔧 targetBjName 정규화 스크립트 시작...\n');

// keywords.json 읽기
const keywords = JSON.parse(fs.readFileSync(keywordsPath, 'utf-8'));

// crawl_data.json 읽기
const crawlData = JSON.parse(fs.readFileSync(crawlDataPath, 'utf-8'));

// 정규화 함수
function normalizeBjName(name) {
    if (!name || name === '미분류') return '미분류';

    // 특수문자, 숫자, 공백 제거하여 순수 한글만 추출
    const cleanName = name.replace(/[^가-힣]/g, '');

    // keywords.json에서 매칭되는 스트리머 찾기
    for (const mapping of keywords) {
        const allKeywords = [mapping.bjName, ...mapping.keywords];
        // 키워드가 cleanName에 포함되어 있는지 확인
        if (allKeywords.some(keyword => keyword && cleanName.includes(keyword))) {
            return mapping.bjName;
        }
    }

    // 매칭 안 되면 미분류
    return '미분류';
}

// 통계
let totalCount = 0;
let changedCount = 0;
const changes = {};

// 데이터 정규화
if (crawlData.data && Array.isArray(crawlData.data)) {
    crawlData.data = crawlData.data.map(item => {
        totalCount++;
        const originalName = item.targetBjName;
        const normalizedName = normalizeBjName(originalName);

        if (originalName !== normalizedName) {
            changedCount++;
            if (!changes[originalName]) {
                changes[originalName] = { count: 0, to: normalizedName };
            }
            changes[originalName].count++;

            return {
                ...item,
                targetBjName: normalizedName
            };
        }

        return item;
    });
}

// 결과 출력
console.log(`📊 총 ${totalCount}개의 후원 데이터 처리`);
console.log(`✅ ${changedCount}개의 targetBjName 정규화 완료\n`);

if (Object.keys(changes).length > 0) {
    console.log('📝 변경 내역:');
    Object.entries(changes)
        .sort((a, b) => b[1].count - a[1].count)
        .forEach(([from, info]) => {
            console.log(`  "${from}" → "${info.to}" (${info.count}건)`);
        });
    console.log('');
}

// 파일 저장
fs.writeFileSync(crawlDataPath, JSON.stringify(crawlData, null, 2));
console.log('💾 crawl_data.json 저장 완료!');
