const fs = require('fs');
const path = require('path');

console.log('🧹 초강력 중복 데이터 정리 스크립트 시작... (시간 오차 60초 허용)\n');

const crawlPath = path.join(process.cwd(), 'data', 'crawl_data.json');

if (fs.existsSync(crawlPath)) {
    try {
        const fileContent = JSON.parse(fs.readFileSync(crawlPath, 'utf-8'));
        const crawlData = fileContent.data || [];
        const originalCount = crawlData.length;

        // 시간순 정렬 (먼저 정렬해야 비교 용이)
        crawlData.sort((a, b) => new Date(b.createDate).getTime() - new Date(a.createDate).getTime());

        const cleaned = [];
        const removedIndices = new Set();

        for (let i = 0; i < crawlData.length; i++) {
            if (removedIndices.has(i)) continue;

            const current = crawlData[i];
            let isDuplicate = false;

            // 현재 항목(i)과 그 뒤의 항목들(j)을 비교
            // 정렬되어 있으므로 시간 차이가 많이 나면 루프 중단 가능
            for (let j = i + 1; j < crawlData.length; j++) {
                if (removedIndices.has(j)) continue;

                const compare = crawlData[j];
                const timeDiff = Math.abs(new Date(current.createDate).getTime() - new Date(compare.createDate).getTime());

                // 60초(1분) 이상 차이나면 더 이상 비교할 필요 없음 (정렬되어 있으므로)
                if (timeDiff > 60000) break;

                // 조건: 사용자명, 개수 일치
                if (current.ballonUserName === compare.ballonUserName &&
                    current.ballonCount === compare.ballonCount) {

                    // 중복 발견!
                    // 둘 중 하나를 삭제해야 함.
                    // 타겟 BJ 정보가 있는 것을 남김

                    if (current.targetBjName && !compare.targetBjName) {
                        removedIndices.add(j); // compare 삭제, current 유지
                    } else if (!current.targetBjName && compare.targetBjName) {
                        removedIndices.add(i); // current 삭제, compare 유지
                        isDuplicate = true; // 현재 루프 주체(i)가 삭제되었으므로 다음 i로 넘어감 (하지만 break하면 안됨, i가 중복인걸 표시만)
                        // i가 삭제되면 더 이상 j와 비교할 의미가 없음
                        break;
                    } else {
                        // 둘 다 타겟이 있거나 둘 다 없으면
                        // 최신 것(current)을 남기고 과거 것(compare)을 삭제 (또는 그 반대)
                        // 여기서는 단순히 j를 삭제 (i 유지)
                        removedIndices.add(j);
                    }
                }
            }

            if (!isDuplicate) {
                // i가 삭제되지 않았을 때만 추가하지 않고, 나중에 필터링
                // 여기 로직 복잡하므로 단순하게 removedIndices만 체크해서 나중에 재구성
            }
        }

        // 제거되지 않은 항목만 필터링
        const finalData = crawlData.filter((_, index) => !removedIndices.has(index));

        // 파일 저장
        fileContent.data = finalData;
        fileContent.lastUpdate = new Date().toISOString();
        fs.writeFileSync(crawlPath, JSON.stringify(fileContent, null, 2));

        console.log(`✅ crawl_data.json 초강력 정리 완료`);
        console.log(`   - 원본: ${originalCount}개`);
        console.log(`   - 정리 후: ${finalData.length}개`);
        console.log(`   - 삭제된 중복: ${originalCount - finalData.length}개\n`);

    } catch (e) {
        console.error('❌ 처리 실패:', e);
    }
} else {
    console.log('⚠️ 파일 없음');
}
