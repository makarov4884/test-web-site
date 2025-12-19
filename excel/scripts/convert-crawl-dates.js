const fs = require('fs');
const path = require('path');

// 날짜 형식 변환 함수 (MM-DD HH:MM:SS -> YYYY-MM-DD HH:MM:SS)
function normalizeDateFormat(dateStr) {
    // 이미 YYYY-MM-DD 형식이면 그대로 반환
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        return dateStr;
    }

    // MM-DD HH:MM:SS 형식을 YYYY-MM-DD HH:MM:SS로 변환
    const match = dateStr.match(/^(\d{2})-(\d{2})\s+(.+)$/);
    if (match) {
        const [_, month, day, time] = match;
        const year = new Date().getFullYear();
        return `${year}-${month}-${day} ${time}`;
    }

    return dateStr;
}

// 메시지에서 날짜 패턴 제거
function cleanMessage(msg) {
    if (!msg) return '';

    // MM-DD HH:MM:SS 패턴 제거
    msg = msg.replace(/\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/g, '').trim();
    // YYYY-MM-DD HH:MM:SS 패턴 제거
    msg = msg.replace(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/g, '').trim();

    return msg;
}

const crawlDataPath = path.join(process.cwd(), 'data', 'crawl_data.json');

console.log('📝 크롤 데이터 날짜 형식 변환 시작...');

// 파일 읽기
const fileContent = fs.readFileSync(crawlDataPath, 'utf-8');
const jsonData = JSON.parse(fileContent);

let convertedCount = 0;
let messageCleanedCount = 0;

// 각 데이터 항목 변환
jsonData.data = jsonData.data.map(item => {
    const oldDate = item.createDate;
    const newDate = normalizeDateFormat(item.createDate);

    if (oldDate !== newDate) {
        convertedCount++;
    }

    // 메시지 정리
    const oldMessage = item.message || '';
    const newMessage = cleanMessage(oldMessage);

    if (oldMessage !== newMessage) {
        messageCleanedCount++;
    }

    return {
        ...item,
        createDate: newDate,
        messageId: `${newDate}-${item.ballonUserName}-${item.ballonCount}`,
        message: newMessage
    };
});

// 날짜 내림차순 정렬
jsonData.data.sort((a, b) => {
    return new Date(b.createDate).getTime() - new Date(a.createDate).getTime();
});

// 파일 저장
fs.writeFileSync(crawlDataPath, JSON.stringify(jsonData, null, 2));

console.log(`✅ 변환 완료!`);
console.log(`   - 날짜 형식 변환: ${convertedCount}개`);
console.log(`   - 메시지 정리: ${messageCleanedCount}개`);
console.log(`   - 총 데이터: ${jsonData.data.length}개`);
