const fs = require('fs');
const path = require('path');

const dataPath = path.join(process.cwd(), 'data', 'crawl_data.json');
const keywordsPath = path.join(process.cwd(), 'data', 'keywords.json');

// 1. 데이터 로드
if (!fs.existsSync(dataPath) || !fs.existsSync(keywordsPath)) {
    console.log('❌ 데이터 파일이 없습니다.');
    process.exit(1);
}

const crawlData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
const keywords = JSON.parse(fs.readFileSync(keywordsPath, 'utf-8'));

console.log(`📊 전체 데이터: ${crawlData.data.length}건`);
console.log(`🔑 등록된 BJ: ${keywords.length}명`);

let fixedCount = 0;

// 2. 키워드 매칭 함수
function findBjName(text) {
    if (!text) return null;
    const cleanText = text.replace(/\s+/g, ''); // 공백 제거 후 비교

    for (const bj of keywords) {
        // BJ 이름 자체 포함 여부
        if (cleanText.includes(bj.bjName.replace(/\s+/g, ''))) return bj.bjName;

        // 키워드 포함 여부
        if (bj.keywords) {
            for (const keyword of bj.keywords) {
                if (cleanText.includes(keyword)) return bj.bjName;
            }
        }
    }
    return null;
}

// 3. 데이터 순회하며 분류
crawlData.data = crawlData.data.map(item => {
    // 이미 분류된 경우도 다시 체크 (키워드가 추가되었을 수 있으므로)
    // 단, 수동으로 확정된 데이터는 건드리지 않는게 좋지만, 
    // 현재 요청은 "닉네임으로 분류해달라"는 것이므로 과감하게 재분류 시도.

    // 타겟 BJ 이름이 비어있거나, 등록된 BJ 명단에 없는 경우 (미분류 상태)
    const currentBjExists = keywords.some(k => k.bjName === item.targetBjName);

    if (!currentBjExists) {
        // 메시지 + 기존 타겟 이름 합쳐서 힌트 찾기
        const hint = (item.targetBjName + ' ' + item.message).trim();
        const foundName = findBjName(hint);

        if (foundName && foundName !== item.targetBjName) {
            item.targetBjName = foundName;
            fixedCount++;
            // console.log(`✅ 분류 성공: [${hint}] -> ${foundName}`);
        }
    }
    return item;
});

// 4. 저장
if (fixedCount > 0) {
    fs.writeFileSync(dataPath, JSON.stringify(crawlData, null, 2));
    console.log(`🎉 총 ${fixedCount}건의 미분류 데이터를 자동으로 분류했습니다!`);
} else {
    console.log('✨ 분류할 데이터가 없거나 이미 모두 분류되었습니다.');
}
