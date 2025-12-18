// 미분류 데이터 상세 분석
const fs = require('fs');
const path = require('path');

const crawlPath = path.join(__dirname, '..', 'data', 'crawl_data.json');
const fileContent = fs.readFileSync(crawlPath, 'utf-8');
const jsonData = JSON.parse(fileContent);

console.log('🔍 미분류 데이터 상세 분석\n');

// 미분류만 필터링
const unclassified = jsonData.data.filter(d => !d.targetBjName || d.targetBjName.trim() === '');

console.log(`미분류 건수: ${unclassified.length}건\n`);

// 별풍선 개수 계산
let totalBalloons = 0;
const balloonCounts = [];

unclassified.forEach(d => {
    totalBalloons += d.ballonCount;
    balloonCounts.push(d.ballonCount);
});

console.log(`총 별풍선: ${totalBalloons.toLocaleString()}개\n`);

// 통계
balloonCounts.sort((a, b) => b - a);
console.log('📊 별풍선 통계:');
console.log(`  최대: ${balloonCounts[0].toLocaleString()}개`);
console.log(`  최소: ${balloonCounts[balloonCounts.length - 1].toLocaleString()}개`);
console.log(`  평균: ${Math.round(totalBalloons / unclassified.length).toLocaleString()}개`);
console.log(`  중간값: ${balloonCounts[Math.floor(balloonCounts.length / 2)].toLocaleString()}개\n`);

// 상위 10개 미분류 후원
console.log('💰 상위 10개 미분류 후원:\n');
const top10 = [...unclassified]
    .sort((a, b) => b.ballonCount - a.ballonCount)
    .slice(0, 10);

top10.forEach((d, idx) => {
    console.log(`${idx + 1}. ${d.ballonCount.toLocaleString().padStart(8)}개 - ${d.ballonUserName}`);
    console.log(`   [${d.createDate}] ${d.message || '(메시지 없음)'}`);
    console.log('');
});

// 검증
console.log('\n✅ 검증:');
console.log(`미분류 건수: ${unclassified.length}건`);
console.log(`미분류 별풍선 합계: ${totalBalloons.toLocaleString()}개`);
console.log(`평균 별풍선/건: ${Math.round(totalBalloons / unclassified.length).toLocaleString()}개`);
