const fs = require('fs');
const path = require('path');

// 방송 시작 시간 (bcraping.kr에서 확인된 시간)
const BROADCAST_START = new Date('2025-12-13 13:00:34');

// 절대 시간을 방송 시작 대비 상대 시간으로 변환
function toRelativeTime(absoluteTime) {
    const date = new Date(absoluteTime);
    const diffMs = date - BROADCAST_START;

    if (diffMs < 0) {
        console.warn(`Warning: Time ${absoluteTime} is before broadcast start`);
        return '00:00:00';
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// 파일 경로
const inputFile = path.join(__dirname, '..', 'excel', 'data', 'new_crawl_data.txt');
const outputFile = path.join(__dirname, '..', 'excel', 'data', 'new_crawl_data_relative.txt');

try {
    console.log('📖 Reading file...');
    const content = fs.readFileSync(inputFile, 'utf-8');
    const lines = content.trim().split('\n');

    console.log(`📊 Processing ${lines.length} lines...`);

    const convertedLines = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split('\t');

        if (parts.length < 3) {
            console.warn(`Line ${i + 1}: Invalid format, skipping`);
            errorCount++;
            continue;
        }

        // TSV 구조: 순번, messageId, createDate, userId, ballonCount, message, timestamp, targetBjName, event
        const [rowNum, messageId, createDate, ...rest] = parts;

        try {
            // 절대 시간을 상대 시간으로 변환
            const relativeTime = toRelativeTime(createDate);

            // 변환된 라인 생성 (createDate를 relativeTime으로 교체)
            const convertedLine = [rowNum, messageId, relativeTime, ...rest].join('\t');
            convertedLines.push(convertedLine);
            successCount++;
        } catch (error) {
            console.error(`Line ${i + 1}: Error converting time - ${error.message}`);
            errorCount++;
        }
    }

    // 변환된 데이터를 파일에 저장
    fs.writeFileSync(outputFile, convertedLines.join('\n') + '\n', 'utf-8');

    console.log('\n✅ Conversion completed!');
    console.log(`   Success: ${successCount} lines`);
    console.log(`   Errors: ${errorCount} lines`);
    console.log(`   Output file: ${outputFile}`);

    // 샘플 데이터 출력
    console.log('\n📋 Sample converted data (first 3 lines):');
    convertedLines.slice(0, 3).forEach((line, idx) => {
        const parts = line.split('\t');
        console.log(`   ${idx + 1}. Time: ${parts[2]}, User: ${parts[3]}, Balloons: ${parts[4]}`);
    });

} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
