const fs = require('fs');
const path = require('path');

// 설정: 입력 파일과 출력 파일 경로
const INPUT_FILE = path.join(process.cwd(), 'raw_data.txt');
const OUTPUT_FILE = path.join(process.cwd(), 'data', 'crawl_data.json');

// 메인 함수
async function importData() {
    console.log('🚀 데이터 수동 변환기 시작...');

    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`❌ 오류: '${INPUT_FILE}' 파일이 없습니다.`);
        console.error('👉 프로젝트 폴더에 "raw_data.txt" 파일을 만들고, 엑셀 데이터를 붙여넣으세요.');
        return;
    }

    const rawContent = fs.readFileSync(INPUT_FILE, 'utf-8');
    const lines = rawContent.split('\n');
    const parsedData = [];

    console.log(`📄 읽은 라인 수: ${lines.length}줄`);

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // 탭(\t) 또는 다중 공백으로 분리
        const parts = line.split(/[\t]+/).map(s => s.trim());

        // 포맷 분석: [No] [ID] [Date] [Nick] [Count] [Msg] [Date2] ...
        // 예: 4  1765...  2025-12-14 04:09:18  (JINU)GOGO  3000  메시지...

        let date, nick, count, msg, bjName = '';

        if (parts.length >= 5) {
            // 날짜 (YYYY-MM-DD HH:mm:ss 형식 찾기)
            const dateIdx = parts.findIndex(p => /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(p));

            if (dateIdx !== -1) {
                date = parts[dateIdx];

                // 별풍선 개수 찾기: 날짜 *이후*에 나오는 숫자 찾기 (앞의 행 번호("1")가 카운트로 오인되는 것 방지)
                // 보통 Date(2) -> Nick(3) -> Count(4) 순서임
                const countRelIdx = parts.slice(dateIdx + 1).findIndex(p => /^\d+$/.test(p.replace(/,/g, '')) && parseInt(p) > 0 && p.length < 10);

                if (countRelIdx !== -1) {
                    const countIdx = dateIdx + 1 + countRelIdx;
                    count = parseInt(parts[countIdx].replace(/,/g, ''), 10);

                    // 닉네임은 개수 바로 앞 (날짜와 개수 사이일 가능성 높음)
                    if (countIdx > 0) nick = parts[countIdx - 1];

                    // BJ 이름이나 메시지는 개수 뒤에 옴
                    if (countIdx + 1 < parts.length) msg = parts[countIdx + 1];
                }
            } else {
                // 날짜를 못 찾은 경우 기존 로직 시도 (하지만 거의 모든 라인에 날짜가 있어 보임)
                // 별풍선 개수 (숫자만 있는 것)
                const countIdx = parts.findIndex(p => /^\d+$/.test(p.replace(/,/g, '')) && parseInt(p) > 0 && p.length < 10);
                if (countIdx !== -1) {
                    count = parseInt(parts[countIdx].replace(/,/g, ''), 10);
                    if (countIdx > 0) nick = parts[countIdx - 1];
                    if (countIdx + 1 < parts.length) msg = parts[countIdx + 1];
                }
            }
        }

        // 데이터가 불완전하면 건너뜀 (혹은 기본값)
        if (!date || !nick || !count) {
            // 다른 패턴 시도 (공백 분리)
            const partsSpace = line.split(/\s{2,}/); // 2칸 이상 공백
            if (partsSpace.length >= 4) {
                date = partsSpace.find(p => /^\d{4}-\d{2}-\d{2}/.test(p));
                // ... (간단 파서라 정교함은 떨어질 수 있음)
            }
            if (!date || !nick) {
                // console.log(`⚠️ 파싱 실패 (건너뜀): ${line.substring(0, 50)}...`);
                continue;
            }
        }

        // BJ 이름 추출 (메시지에서 추출하거나, 별도 컬럼이 없으면 메시지 전체를 타겟으로)
        // 사용자가 준 예시에는 타겟 BJ 이름이 명시적으로 안 보이고 메시지만 있음 ("아 4등은...")
        // 따라서 msg를 targetBjName으로, message도 msg로 설정

        const item = {
            messageId: `${date}-${nick}-${count}`, // 고유키 생성
            createDate: date,
            ballonUserName: nick,
            ballonCount: count,
            targetBjName: msg || '', // 일단 메시지 내용을 타겟으로 넣음 (자동분류기가 나중에 처리)
            message: msg || '',
            isCancel: false
        };

        parsedData.push(item);
    }

    console.log(`✅ 변환 성공: ${parsedData.length}건`);

    // JSON 저장
    const outputData = {
        success: true,
        data: parsedData,
        lastUpdate: new Date().toISOString(),
        source: 'manual_file_import'
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2));
    console.log(`💾 저장 완료: ${OUTPUT_FILE}`);
}

importData();
