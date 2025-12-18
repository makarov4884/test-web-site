const fs = require('fs');
const path = require('path');

console.log('🔄 12-13 16:31:12 이전 데이터 복원 시작...\n');

const backupPath = path.join(process.cwd(), 'data', 'manual_data_backup.json');
const manualPath = path.join(process.cwd(), 'data', 'manual_data.json');

if (!fs.existsSync(backupPath)) {
    console.log('❌ 백업 파일이 없습니다!');
    process.exit(1);
}

try {
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    console.log(`📦 백업 파일 로드: ${backupData.length}개 데이터\n`);

    // 12-13 16:31:12 이전 데이터 필터링
    const cutoffTime = new Date('2025-12-13 16:31:12').getTime();

    const filteredData = backupData.filter(item => {
        const itemTime = new Date(item.createDate).getTime();
        return itemTime < cutoffTime;
    });

    console.log(`✅ 필터링 완료`);
    console.log(`   - 백업 전체: ${backupData.length}개`);
    console.log(`   - 12-13 16:31:12 이전: ${filteredData.length}개\n`);

    if (filteredData.length > 0) {
        // 시간 내림차순 정렬
        filteredData.sort((a, b) => {
            const timeA = new Date(a.createDate).getTime();
            const timeB = new Date(b.createDate).getTime();

            if (timeB !== timeA) {
                return timeB - timeA;
            }

            const seqA = a.sequenceNum || 0;
            const seqB = b.sequenceNum || 0;
            return seqA - seqB;
        });

        // 저장
        fs.writeFileSync(manualPath, JSON.stringify(filteredData, null, 2));

        console.log(`💾 manual_data.json 저장 완료`);
        console.log(`   - 복원된 데이터: ${filteredData.length}개\n`);

        // 샘플 데이터 출력
        console.log(`📋 복원된 데이터 샘플 (최신 5개):`);
        filteredData.slice(0, 5).forEach((item, idx) => {
            console.log(`   ${idx + 1}. ${item.createDate} | ${item.ballonUserName} | ${item.ballonCount}개`);
        });
    } else {
        console.log('⚠️  12-13 16:31:12 이전 데이터가 없습니다.');
    }

} catch (e) {
    console.error('❌ 처리 실패:', e.message);
}

console.log('\n🎉 복원 완료!');
