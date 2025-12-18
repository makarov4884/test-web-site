const fs = require('fs');
const path = require('path');

// 방송 시작 시간 (2025-12-13 13:00:00)
const BROADCAST_START = new Date('2025-12-13T13:00:00+09:00');

// 상대 시간(HH:MM:SS)을 절대 시간으로 변환
function relativeToAbsolute(relativeTime) {
    const [hours, minutes, seconds] = relativeTime.split(':').map(Number);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    const absoluteDate = new Date(BROADCAST_START.getTime() + totalSeconds * 1000);

    // YYYY-MM-DD HH:MM:SS 형식으로 반환
    const year = absoluteDate.getFullYear();
    const month = String(absoluteDate.getMonth() + 1).padStart(2, '0');
    const day = String(absoluteDate.getDate()).padStart(2, '0');
    const hour = String(absoluteDate.getHours()).padStart(2, '0');
    const min = String(absoluteDate.getMinutes()).padStart(2, '0');
    const sec = String(absoluteDate.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hour}:${min}:${sec}`;
}

// TSV 데이터를 JSON으로 변환 (방송 시작 대비 상대 시간 형식)
const inputFile = path.join(__dirname, '..', 'excel', 'data', 'new_crawl_data_relative.txt');
const outputFile = path.join(__dirname, '..', 'data', 'crawl_data.json');

try {
    const content = fs.readFileSync(inputFile, 'utf-8');
    const lines = content.trim().split('\n');

    const donations = [];

    for (let i = 0; i < lines.length; i++) { // No header, process all lines
        const parts = lines[i].split('\t');
        if (parts.length < 6) continue;

        // TSV: 순번, messageId, relativeTime, userId, ballonCount, message, timestamp, targetBjName, event
        const [rowNum, messageId, relativeTime, ballonUserName, ballonCount, message, timestamp, targetBjName, event] = parts;

        // 1+1 이벤트 무시 - 원본 개수만 사용
        const actualCount = parseInt(ballonCount) || 0;

        // timestamp(절대 시간)가 있으면 사용, 없으면 relativeTime을 절대 시간으로 변환
        let createDate;
        if (timestamp && timestamp.trim()) {
            createDate = timestamp.trim();
        } else {
            createDate = relativeToAbsolute(relativeTime);
        }

        donations.push({
            messageId: messageId || `${createDate}-${ballonUserName}-${ballonCount}`,
            createDate: createDate,
            relativeTime: relativeTime, // 방송 시작 대비 상대 시간
            ballonUserName: ballonUserName,
            ballonCount: actualCount,
            targetBjName: (targetBjName && targetBjName.trim()) || '',
            message: message || '',
            isCancel: false
        });
    }

    const output = {
        success: true,
        data: donations
    };

    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    console.log(`✅ Converted ${donations.length} donations`);
    console.log(`Total balloons: ${donations.reduce((s, d) => s + d.ballonCount, 0).toLocaleString()}`);

} catch (error) {
    console.error('Error:', error.message);
}

