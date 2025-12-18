const fs = require('fs');
const path = require('path');

const crawlPath = path.join(__dirname, '..', 'data', 'crawl_data.json');
const keywordsPath = path.join(__dirname, '..', 'data', 'keywords.json');

console.log('🔄 BJ 닉네임 일괄 업데이트 시작...\n');

// 파일 읽기
const crawlData = JSON.parse(fs.readFileSync(crawlPath, 'utf-8'));
const keywords = JSON.parse(fs.readFileSync(keywordsPath, 'utf-8'));

// 매핑 테이블 생성 (키워드 -> 공식 닉네임)
const nameMap = {};
keywords.forEach(mapping => {
    // 공식 닉네임 자체도 매핑
    nameMap[mapping.bjName] = mapping.bjName;

    // 키워드들도 매핑
    mapping.keywords.forEach(keyword => {
        nameMap[keyword] = mapping.bjName;
    });
});

// 추가 매핑 (알려진 구 닉네임들)
const legacyMap = {
    "박아진": "박아진_",
    "아진": "박아진_",
    "백만송": "백만송♥",
    "소냥": "미소냥.",
    "비소냥": "미소냥.",
    "소소": "♡소소",
    "안소소": "♡소소",
    "두니": "두니♡",
    "두니야": "두니♡",
    "금별": "금별♥",
    "골댄*": "금별♥",
    "세은": "세은06",
    "하온": "하온♡",
    "먼지": "먼지♡",
    "진매": "진매S2",
    "한빛": "한빛_♥",
    "다냥": "다냥♡",
    "단냥이": "다냥♡",
    "깨비": "최깨비",
    "운재": "운재쿤!",
    "하정": "요하정",
    "팡린": "팡린*",
    "까망": "까망._.",
    "박진우": "박진우[JINU]",
    "가람": "가람♥",
    "뚜부": "뚜부♥"
};

Object.assign(nameMap, legacyMap);

// 데이터 업데이트
let updatedCount = 0;
const stats = {};

if (crawlData.data && Array.isArray(crawlData.data)) {
    crawlData.data = crawlData.data.map(item => {
        const oldName = item.targetBjName;

        if (!oldName || oldName === '미분류' || oldName.trim() === '') {
            return item;
        }

        // 매핑 찾기 (정확한 일치 우선, 그 다음 포함 여부 확인)
        let newName = nameMap[oldName];

        if (!newName) {
            // 키워드 포함 여부 확인
            const matchedMapping = keywords.find(m =>
                m.keywords.some(k => oldName.includes(k))
            );
            if (matchedMapping) {
                newName = matchedMapping.bjName;
            }
        }

        if (newName && newName !== oldName) {
            updatedCount++;

            if (!stats[newName]) stats[newName] = 0;
            stats[newName]++;

            return {
                ...item,
                targetBjName: newName
            };
        }

        return item;
    });
}

// 결과 출력
console.log(`✅ 총 ${updatedCount}개의 데이터가 업데이트되었습니다.\n`);

console.log('📝 변경 내역:');
Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, count]) => {
        console.log(`  ${name}: ${count}건 변경됨`);
    });

// 파일 저장
fs.writeFileSync(crawlPath, JSON.stringify(crawlData, null, 2));
console.log('\n💾 crawl_data.json 저장 완료!');
