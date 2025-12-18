const fs = require('fs');
const path = require('path');

const manualPath = path.join(process.cwd(), 'data', 'manual_data.json');
const data = JSON.parse(fs.readFileSync(manualPath, 'utf-8'));

const seen = new Map();
const duplicates = [];

data.forEach((item, idx) => {
    const key = `${item.createDate}|${item.ballonUserName}|${item.ballonCount}`;
    if (seen.has(key)) {
        duplicates.push({
            index: idx,
            messageId: item.messageId,
            createDate: item.createDate,
            ballonUserName: item.ballonUserName,
            ballonCount: item.ballonCount,
            originalIndex: seen.get(key)
        });
    } else {
        seen.set(key, idx);
    }
});

console.log('총 데이터 개수:', data.length);
console.log('중복 개수:', duplicates.length);

if (duplicates.length > 0) {
    console.log('\n중복 데이터 목록:');
    duplicates.forEach(d => {
        console.log(`  [인덱스 ${d.index}] messageId: ${d.messageId}`);
        console.log(`    ${d.createDate} | ${d.ballonUserName} | ${d.ballonCount}개`);
        console.log(`    (원본 인덱스: ${d.originalIndex})\n`);
    });

    // 중복 제거된 데이터 저장
    const uniqueData = data.filter((item, idx) => {
        return !duplicates.some(d => d.index === idx);
    });

    console.log(`\n중복 제거 후 데이터 개수: ${uniqueData.length}`);
    console.log('중복 제거된 파일을 저장하시겠습니까? (수동으로 실행 필요)');
} else {
    console.log('\n✅ 중복 데이터가 없습니다!');
}
