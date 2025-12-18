// 스트리머별 별풍선 개수 검증
const fs = require('fs');
const path = require('path');

const crawlPath = path.join(__dirname, '..', 'data', 'crawl_data.json');
const fileContent = fs.readFileSync(crawlPath, 'utf-8');
const jsonData = JSON.parse(fileContent);

console.log('🔍 스트리머별 별풍선 개수 검증\n');

// 사용자가 제공한 데이터
const userProvidedData = {
    '두시앙': 469261,
    '세은': 265557,
    '하온': 259478,
    '두니': 225833,
    '소소': 225232,
    '백만송': 202315,
    '진매': 172310,
    '먼지': 152899,
    '금별': 150492,
    '박아진': 134149,
    '소냥': 100753,
    '뚜부': 99865,
    '다냥': 79897,
    '까망': 66478,
    '운재': 58251,
    '깨비': 56702,
    '가람': 51095,
    '하정': 44757,
    '한빛': 38903,
    '팡린': 28831,
    '박진우': 16645
};

// 실제 데이터 집계
const actualStats = {};
jsonData.data.forEach(d => {
    const bjName = d.targetBjName && d.targetBjName.trim() !== '' ? d.targetBjName : '미분류';
    if (!actualStats[bjName]) {
        actualStats[bjName] = {
            count: 0,
            balloons: 0
        };
    }
    actualStats[bjName].count++;
    actualStats[bjName].balloons += d.ballonCount;
});

// 비교
console.log('📊 검증 결과:\n');
console.log('스트리머'.padEnd(12) + '제공값'.padStart(12) + '실제값'.padStart(12) + '차이'.padStart(12) + '상태');
console.log('='.repeat(60));

let totalDiff = 0;
let matchCount = 0;
let mismatchCount = 0;

Object.keys(userProvidedData).forEach(bjName => {
    const provided = userProvidedData[bjName];
    const actual = actualStats[bjName]?.balloons || 0;
    const diff = actual - provided;
    const status = diff === 0 ? '✅' : '❌';

    if (diff === 0) {
        matchCount++;
    } else {
        mismatchCount++;
    }

    totalDiff += Math.abs(diff);

    console.log(
        bjName.padEnd(12) +
        provided.toLocaleString().padStart(12) +
        actual.toLocaleString().padStart(12) +
        (diff >= 0 ? '+' : '') + diff.toLocaleString().padStart(11) +
        '  ' + status
    );
});

console.log('='.repeat(60));
console.log(`\n일치: ${matchCount}개, 불일치: ${mismatchCount}개`);
console.log(`총 차이: ${totalDiff.toLocaleString()}개\n`);

// 전체 통계
console.log('📈 전체 통계:\n');
const totalProvided = Object.values(userProvidedData).reduce((sum, val) => sum + val, 0);
const totalActual = Object.values(actualStats)
    .filter((_, key) => Object.keys(actualStats)[_] !== '미분류')
    .reduce((sum, stat) => sum + stat.balloons, 0);

console.log(`제공된 총합: ${totalProvided.toLocaleString()}개`);
console.log(`실제 총합 (미분류 제외): ${totalActual.toLocaleString()}개`);
console.log(`미분류: ${actualStats['미분류']?.balloons.toLocaleString() || 0}개 (${actualStats['미분류']?.count || 0}건)`);
console.log(`\n전체 합계: ${(totalActual + (actualStats['미분류']?.balloons || 0)).toLocaleString()}개`);

// 실제 데이터 순위
console.log('\n\n🏆 실제 데이터 기준 순위:\n');
const sorted = Object.entries(actualStats)
    .filter(([name]) => name !== '미분류')
    .sort((a, b) => b[1].balloons - a[1].balloons);

sorted.forEach(([name, stats], idx) => {
    console.log(`${(idx + 1).toString().padStart(2)}. ${name.padEnd(10)} ${stats.balloons.toLocaleString().padStart(10)}개 (${stats.count}건)`);
});
