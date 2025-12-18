const fs = require('fs');
const path = require('path');

const crawlDataPath = path.join(process.cwd(), 'data', 'crawl_data.json');

console.log('🗑️ MM-DD HH:MM:SS 형식 데이터 삭제 시작...');

// 파일 읽기
const fileContent = fs.readFileSync(crawlDataPath, 'utf-8');
const jsonData = JSON.parse(fileContent);

const originalCount = jsonData.data.length;

// MM-DD HH:MM:SS 형식이 아닌 데이터만 유지 (YYYY-MM-DD HH:MM:SS만 유지)
jsonData.data = jsonData.data.filter(item => {
    // YYYY-MM-DD 형식인지 확인
    const isCorrectFormat = /^\d{4}-\d{2}-\d{2}/.test(item.createDate);
    return isCorrectFormat;
});

const deletedCount = originalCount - jsonData.data.length;

// 날짜 내림차순 정렬
jsonData.data.sort((a, b) => {
    return new Date(b.createDate).getTime() - new Date(a.createDate).getTime();
});

// 파일 저장
fs.writeFileSync(crawlDataPath, JSON.stringify(jsonData, null, 2));

console.log(`✅ 삭제 완료!`);
console.log(`   - 삭제된 데이터: ${deletedCount}개`);
console.log(`   - 남은 데이터: ${jsonData.data.length}개`);
