const fs = require('fs');
const path = require('path');

console.log('🔍 16:31:10 ~ 18:14:26 구간 데이터 확인...\n');

const manualPath = path.join(process.cwd(), 'data', 'manual_data.json');
const manualBackupPath = path.join(process.cwd(), 'data', 'manual_data_backup.json');

const parseDate = (dateStr) => {
    // "12-13 16:31:10" 또는 "2025-12-13 16:31:10" 형식 파싱
    let match = dateStr.match(/(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
    if (!match) {
        match = dateStr.match(/\d{4}-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
    }
    if (match) {
        const [_, month, day, hour, min, sec] = match;
        return new Date(`2025-${month}-${day} ${hour}:${min}:${sec}`).getTime();
    }
    return 0;
};

// 현재 manual_data.json
const currentManual = JSON.parse(fs.readFileSync(manualPath, 'utf-8'));
console.log(`📦 현재 manual_data.json: ${currentManual.length}개`);

// 시간 범위별 데이터 확인
const ranges = {
    'before_16_31': 0,
    '16_31_to_18_14': 0,
    'after_18_14': 0
};

const cutoff1 = new Date('2025-12-13 16:31:10').getTime();
const cutoff2 = new Date('2025-12-13 18:14:26').getTime();

currentManual.forEach(d => {
    const time = parseDate(d.createDate);
    if (time < cutoff1) ranges.before_16_31++;
    else if (time >= cutoff1 && time <= cutoff2) ranges['16_31_to_18_14']++;
    else ranges.after_18_14++;
});

console.log('\n📊 시간대별 데이터 분포:');
console.log(`   ~ 16:31:10: ${ranges.before_16_31}개`);
console.log(`   16:31:10 ~ 18:14:26: ${ranges['16_31_to_18_14']}개`);
console.log(`   18:14:26 ~: ${ranges.after_18_14}개`);

// 백업 파일 확인
if (fs.existsSync(manualBackupPath)) {
    const backupManual = JSON.parse(fs.readFileSync(manualBackupPath, 'utf-8'));
    console.log(`\n📦 백업 파일: ${backupManual.length}개`);

    const backupRanges = {
        'before_16_31': 0,
        '16_31_to_18_14': 0,
        'after_18_14': 0
    };

    backupManual.forEach(d => {
        const time = parseDate(d.createDate);
        if (time < cutoff1) backupRanges.before_16_31++;
        else if (time >= cutoff1 && time <= cutoff2) backupRanges['16_31_to_18_14']++;
        else backupRanges.after_18_14++;
    });

    console.log('\n📊 백업 파일 시간대별 분포:');
    console.log(`   ~ 16:31:10: ${backupRanges.before_16_31}개`);
    console.log(`   16:31:10 ~ 18:14:26: ${backupRanges['16_31_to_18_14']}개`);
    console.log(`   18:14:26 ~: ${backupRanges.after_18_14}개`);
}

console.log('\n💡 결론:');
if (ranges['16_31_to_18_14'] === 0) {
    console.log('⚠️  16:31:10 ~ 18:14:26 구간의 데이터가 없습니다!');
    console.log('💡 이 구간은 크롤러가 수집할 수 없는 과거 데이터입니다.');
    console.log('💡 수동으로 업로드하거나, 크롤러가 18:14:26 이후부터 실시간 수집합니다.');
} else {
    console.log(`✅ 16:31:10 ~ 18:14:26 구간에 ${ranges['16_31_to_18_14']}개 데이터가 있습니다.`);
}

console.log('\n🎉 확인 완료!');
