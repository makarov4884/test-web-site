// 미분류 등록 테스트 스크립트
const fs = require('fs');
const path = require('path');

const crawlPath = path.join(__dirname, '..', 'data', 'crawl_data.json');

// 파일 읽기
const fileContent = fs.readFileSync(crawlPath, 'utf-8');
const jsonData = JSON.parse(fileContent);

console.log('📊 데이터 분석 시작...\n');

// 통계
let totalDonations = jsonData.data.length;
let withTargetBj = jsonData.data.filter(d => d.targetBjName && d.targetBjName.trim() !== '').length;
let unclassified = totalDonations - withTargetBj;

console.log(`총 후원 개수: ${totalDonations.toLocaleString()}`);
console.log(`분류된 후원: ${withTargetBj.toLocaleString()}`);
console.log(`미분류 후원: ${unclassified.toLocaleString()}\n`);

// 스트리머별 집계
const bjStats = {};
jsonData.data.forEach(d => {
    const bjName = d.targetBjName && d.targetBjName.trim() !== '' ? d.targetBjName : '미분류';
    if (!bjStats[bjName]) {
        bjStats[bjName] = {
            count: 0,
            balloons: 0
        };
    }
    bjStats[bjName].count++;
    bjStats[bjName].balloons += d.ballonCount;
});

// 정렬
const sorted = Object.entries(bjStats)
    .sort((a, b) => b[1].balloons - a[1].balloons)
    .slice(0, 10);

console.log('🏆 상위 10 스트리머:\n');
sorted.forEach(([name, stats], idx) => {
    console.log(`${idx + 1}. ${name.padEnd(10)} - ${stats.balloons.toLocaleString().padStart(10)} 개 (${stats.count.toLocaleString()} 건)`);
});

// 미분류 샘플 5개
console.log('\n\n🔍 미분류 샘플 (최근 5개):\n');
const unclassifiedSamples = jsonData.data
    .filter(d => !d.targetBjName || d.targetBjName.trim() === '')
    .slice(0, 5);

unclassifiedSamples.forEach((d, idx) => {
    console.log(`${idx + 1}. [${d.createDate}] ${d.ballonUserName} - ${d.ballonCount}개`);
    console.log(`   메시지: ${d.message || '(없음)'}`);
    console.log(`   messageId: ${d.messageId}\n`);
});
