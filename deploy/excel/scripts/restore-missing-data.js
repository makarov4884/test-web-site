const fs = require('fs');
const path = require('path');

console.log('🔍 빠진 데이터 확인 및 복원 시작...\n');

const crawlPath = path.join(process.cwd(), 'data', 'crawl_data.json');
const manualPath = path.join(process.cwd(), 'data', 'manual_data.json');
const manualBackupPath = path.join(process.cwd(), 'data', 'manual_data_backup.json');

// 시간 범위 설정
const startTime = new Date('2025-12-13 13:11:15').getTime();
const endTime = new Date('2025-12-13 18:10:46').getTime();

const parseDate = (dateStr) => {
    // "12-13 13:11:15" 형식 파싱
    const match = dateStr.match(/(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
    if (match) {
        const [_, month, day, hour, min, sec] = match;
        return new Date(`2025-${month}-${day} ${hour}:${min}:${sec}`).getTime();
    }
    return 0;
};

// 현재 manual_data.json 로드
let currentManual = [];
if (fs.existsSync(manualPath)) {
    currentManual = JSON.parse(fs.readFileSync(manualPath, 'utf-8'));
}

console.log(`📦 현재 manual_data.json: ${currentManual.length}개`);

// 백업 파일 로드
let backupManual = [];
if (fs.existsSync(manualBackupPath)) {
    backupManual = JSON.parse(fs.readFileSync(manualBackupPath, 'utf-8'));
    console.log(`📦 백업 manual_data.json: ${backupManual.length}개\n`);
} else {
    console.log('⚠️  백업 파일이 없습니다.\n');
}

// 현재 데이터의 messageId 세트
const currentIds = new Set(currentManual.map(d => d.messageId));

// 백업에서 빠진 데이터 찾기 (시간 범위 내)
const missingData = backupManual.filter(d => {
    const time = parseDate(d.createDate);
    const inRange = time >= startTime && time <= endTime;
    const isMissing = !currentIds.has(d.messageId);
    return inRange && isMissing;
});

console.log(`🔍 시간 범위: 12-13 13:11:15 ~ 12-13 18:10:46`);
console.log(`📊 빠진 데이터: ${missingData.length}개\n`);

if (missingData.length > 0) {
    console.log(`📋 빠진 데이터 샘플 (처음 10개):`);
    missingData.slice(0, 10).forEach((d, idx) => {
        console.log(`   ${idx + 1}. ${d.createDate} | ${d.ballonUserName} | ${d.ballonCount}개`);
    });

    // 데이터 병합
    const merged = [...currentManual, ...missingData];

    // 시간 내림차순 정렬
    merged.sort((a, b) => {
        const timeA = parseDate(a.createDate);
        const timeB = parseDate(b.createDate);

        if (timeB !== timeA) {
            return timeB - timeA;
        }

        const seqA = a.sequenceNum || 0;
        const seqB = b.sequenceNum || 0;
        return seqA - seqB;
    });

    // 저장
    fs.writeFileSync(manualPath, JSON.stringify(merged, null, 2));

    console.log(`\n✅ 복원 완료`);
    console.log(`   - 이전: ${currentManual.length}개`);
    console.log(`   - 복원 후: ${merged.length}개`);
    console.log(`   - 추가됨: ${missingData.length}개`);
} else {
    console.log('✅ 빠진 데이터가 없습니다!');
}

console.log('\n🎉 작업 완료!');
