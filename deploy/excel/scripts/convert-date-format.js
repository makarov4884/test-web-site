const fs = require('fs');
const path = require('path');

console.log('🔄 날짜 형식 통일 및 정렬 시작...\n');

const manualPath = path.join(process.cwd(), 'data', 'manual_data.json');

if (!fs.existsSync(manualPath)) {
    console.log('❌ manual_data.json 파일이 없습니다!');
    process.exit(1);
}

try {
    const data = JSON.parse(fs.readFileSync(manualPath, 'utf-8'));
    console.log(`📦 데이터 로드: ${data.length}개\n`);

    // 날짜 형식 변환: "2025-12-13 16:31:10" → "12-13 16:31:10"
    const convertedData = data.map(item => {
        let newDate = item.createDate;

        // YYYY-MM-DD HH:MM:SS 형식을 MM-DD HH:MM:SS로 변환
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(newDate)) {
            newDate = newDate.substring(5); // "2025-" 부분 제거
        }

        return {
            ...item,
            createDate: newDate
        };
    });

    // 시간 내림차순 정렬 (최신이 위로)
    convertedData.sort((a, b) => {
        // MM-DD HH:MM:SS 형식을 비교 가능한 형태로 변환
        const parseDate = (dateStr) => {
            const match = dateStr.match(/(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
            if (match) {
                const [_, month, day, hour, min, sec] = match;
                return new Date(`2025-${month}-${day} ${hour}:${min}:${sec}`).getTime();
            }
            return 0;
        };

        const timeA = parseDate(a.createDate);
        const timeB = parseDate(b.createDate);

        // 시간이 다르면 시간 내림차순
        if (timeB !== timeA) {
            return timeB - timeA;
        }

        // 시간이 같으면 sequenceNum 오름차순
        const seqA = a.sequenceNum || 0;
        const seqB = b.sequenceNum || 0;
        return seqA - seqB;
    });

    // 저장
    fs.writeFileSync(manualPath, JSON.stringify(convertedData, null, 2));

    console.log(`✅ 날짜 형식 변환 및 정렬 완료`);
    console.log(`   - 총 데이터: ${convertedData.length}개\n`);

    // 샘플 데이터 출력 (최신 10개)
    console.log(`📋 변환된 데이터 샘플 (최신 10개):`);
    convertedData.slice(0, 10).forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.createDate} | ${item.ballonUserName} | ${item.ballonCount}개`);
    });

    console.log(`\n📋 변환된 데이터 샘플 (가장 오래된 10개):`);
    convertedData.slice(-10).reverse().forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.createDate} | ${item.ballonUserName} | ${item.ballonCount}개`);
    });

} catch (e) {
    console.error('❌ 처리 실패:', e.message);
}

console.log('\n🎉 변환 완료!');
