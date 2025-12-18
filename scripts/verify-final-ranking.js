const fs = require('fs');
const path = require('path');

const crawlPath = path.join(__dirname, '..', 'data', 'crawl_data.json');
const keywordsPath = path.join(__dirname, '..', 'data', 'keywords.json');

console.log('🔄 최종 순위 집계 시뮬레이션...\n');

const crawlData = JSON.parse(fs.readFileSync(crawlPath, 'utf-8'));
const keywordMappings = JSON.parse(fs.readFileSync(keywordsPath, 'utf-8'));

// 실제 stats API의 로직
const normalizeBjName = (name) => {
    if (!name || name === '미분류') return '미분류';

    // 1. 정확한 매칭
    const exactMatch = keywordMappings.find(m => m.bjName === name);
    if (exactMatch) {
        return exactMatch.bjName;
    }

    // 2. 클린 매칭
    const cleanName = name.replace(/[^가-힣]/g, '');
    for (const mapping of keywordMappings) {
        const allKeywords = [mapping.bjName, ...mapping.keywords];
        if (allKeywords.some(keyword => keyword && cleanName.includes(keyword))) {
            return mapping.bjName;
        }
    }
    return name;
};

// 집계
const stats = {};
let unclassifiedCount = 0;
let unclassifiedBalloons = 0;

crawlData.data.forEach(d => {
    let bjName = '미분류';
    let matched = false;

    if (d.targetBjName && d.targetBjName !== '미분류' && d.targetBjName.trim() !== '') {
        bjName = normalizeBjName(d.targetBjName);
        matched = true;
    }

    // 미분류인 경우 메시지 매칭 시도 (실제 API 로직)
    if (!matched || bjName === '미분류') {
        const message = d.message || '';
        for (const mapping of keywordMappings) {
            const allKeywords = [mapping.bjName, ...mapping.keywords];
            if (allKeywords.some(keyword => keyword && message.includes(keyword))) {
                bjName = mapping.bjName;
                matched = true;
                break;
            }
        }
    }

    if (bjName === '미분류') {
        unclassifiedCount++;
        unclassifiedBalloons += d.ballonCount;
    }

    if (!stats[bjName]) {
        stats[bjName] = { count: 0, balloons: 0 };
    }
    stats[bjName].count++;
    stats[bjName].balloons += d.ballonCount;
});

// 결과 출력
console.log('🏆 최종 스트리머 순위 (Top 30):\n');
const sorted = Object.entries(stats)
    .sort((a, b) => b[1].balloons - a[1].balloons);

sorted.forEach(([name, data], idx) => {
    console.log(`${(idx + 1).toString().padStart(2)}. ${name.padEnd(15)} ${data.balloons.toLocaleString().padStart(10)}개 (${data.count}건)`);
});

console.log(`\n📦 미분류: ${unclassifiedBalloons.toLocaleString()}개 (${unclassifiedCount}건)`);
