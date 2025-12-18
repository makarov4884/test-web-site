const fs = require('fs');
const path = require('path');

console.log('🗑️  날짜 형식 데이터 삭제 스크립트 시작...\n');

const manualPath = path.join(process.cwd(), 'data', 'manual_data.json');

if (fs.existsSync(manualPath)) {
    try {
        const data = JSON.parse(fs.readFileSync(manualPath, 'utf-8'));
        const originalCount = data.length;

        // createDate가 "2025-12-13 13:10:48" 형식인 데이터 필터링 (제거)
        // YYYY-MM-DD HH:MM:SS 형식 감지
        const filtered = data.filter(item => {
            const datePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
            return !datePattern.test(item.createDate);
        });

        const removedCount = originalCount - filtered.length;

        if (removedCount > 0) {
            // 백업 생성
            const backupPath = path.join(process.cwd(), 'data', 'manual_data_backup.json');
            fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
            console.log(`📦 백업 파일 생성: manual_data_backup.json\n`);

            // 필터링된 데이터 저장
            fs.writeFileSync(manualPath, JSON.stringify(filtered, null, 2));

            console.log(`✅ manual_data.json 정리 완료`);
            console.log(`   - 원본: ${originalCount}개`);
            console.log(`   - 삭제: ${removedCount}개`);
            console.log(`   - 남은 데이터: ${filtered.length}개\n`);

            console.log(`💡 ${removedCount}개의 날짜 형식 데이터가 삭제되었습니다!`);
        } else {
            console.log(`✅ 삭제할 날짜 형식 데이터가 없습니다.`);
            console.log(`   - 전체 데이터: ${originalCount}개\n`);
        }
    } catch (e) {
        console.error('❌ 처리 실패:', e.message);
    }
} else {
    console.log('⚠️  manual_data.json 파일이 없습니다.');
}

console.log('\n🎉 작업 완료!');
