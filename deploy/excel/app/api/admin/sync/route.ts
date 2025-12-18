import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 헬퍼: 탭 또는 다중 공백으로 분리하되, 날짜/시간/숫자 패턴을 기준으로 필드 식별
const parseRow = (line: string) => {
    // 탭으로 1차 분리
    const parts = line.split('\t').map(p => p.trim());
    // 빈 줄 제외
    if (parts.length < 5) return null;

    // 인덱스 (0)
    // ID (1): 보통 1로 시작하는 긴 숫자
    // Date (2): YYYY-MM-DD HH:MM:SS
    // User (3)
    // Count (4)
    // Msg (5)
    // ...
    // Target (마지막이나 그 앞)

    try {
        const id = parts[1];
        const dateStr = parts[2];
        const user = parts[3];
        const countStr = parts[4];
        let msg = parts[5] || '';

        let target = '';

        // Target은 보통 마지막 컬럼에 있음. 
        // 하지만 마지막이 Date 컬럼(Col 6)인 경우도 있고, 
        // 비어있는 경우도 있음.

        // 뒤에서부터 유효한 텍스트(날짜 아니고 숫자 아닌) 찾기
        for (let i = parts.length - 1; i >= 5; i--) {
            const val = parts[i];
            if (!val) continue;
            // 날짜 형식 건너뛰기
            if (/^\d{4}-\d{2}-\d{2}/.test(val)) continue;
            // 숫자로만 된거 건너뛰기? (아닐수도 있음)

            // 이게 타겟일 확률 높음
            if (!target) {
                target = val;
                // 타겟 찾았으면, 그 앞이 메시지일 수도 있고... 
                // Index 5가 이미 메시지라고 가정했으니, 
                // 만약 target이 index 5와 같으면 메시지이자 타겟?
                // 경우의 수:
                // Msg | Date | Target
                // Msg | Target
                // Msg | (empty) | Target
                break;
            }
        }

        // 예외: Msg에 타겟내용이 있고, Target 컬럼은 비어있을 수 있음 -> 이 경우 Target은 빈값

        // 날짜 파싱 유효성 검사
        if (!/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return null;

        return {
            messageId: `${dateStr}-${user}-${countStr}`, // 기존 ID 체계와 맞춤 (또는 원본ID 사용 가능하면 좋음)
            // 주의: 사용자가 준 ID(1765...)는 우리가 생성한 messageId와 포맷이 다름.
            // 기존 데이터와 섞이면 중복처리가 어려울 수 있음.
            // 하지만 '일관성'을 위해 기존 포맷(날짜-유저-개수)을 따르는게 나을 수도 있고,
            // 아니면 이 기회에 원본 ID를 `originId`로 저장하는게 좋음.
            // 여기서는 기존 'date-user-count' 포맷을 생성해서 중복 체크에 활용.

            originId: id,
            createDate: dateStr,
            ballonUserName: user,
            ballonCount: parseInt(countStr.replace(/,/g, ''), 10),
            targetBjName: target,
            message: msg,
            isCancel: false
        };
    } catch (e) {
        return null;
    }
};

export async function POST(request: Request) {
    try {
        const { text, action, mode } = await request.json();

        if (!text) {
            return NextResponse.json({ success: false, error: '데이터가 없습니다.' });
        }

        const lines = text.split('\n');
        const parsedData: any[] = [];

        lines.forEach((line: string) => {
            const parsed = parseRow(line);
            if (parsed) {
                parsedData.push(parsed);
            }
        });

        // 분석 모드
        if (action === 'analyze') {
            const crawlPath = path.join(process.cwd(), 'data', 'crawl_data.json');
            let currentCount = 0;
            if (fs.existsSync(crawlPath)) {
                const currentData = JSON.parse(fs.readFileSync(crawlPath, 'utf-8'));
                currentCount = currentData.data.length;
            }

            return NextResponse.json({
                success: true,
                parsedCount: parsedData.length,
                currentCount: currentCount,
                diff: parsedData.length - currentCount,
                preview: parsedData.slice(0, 5)
            });
        }

        // 적용 모드 (덮어쓰기 or 병합)
        // 사용자가 "이게 원본이다"라고 했으므로 강력하게 병합하거나 교체해야 함.
        // 여기서는 '병합 + 우선순위(새 데이터)' 전략 사용
        if (action === 'apply') {
            const crawlPath = path.join(process.cwd(), 'data', 'crawl_data.json');

            let finalData = [];

            if (mode === 'overwrite') {
                // 덮어쓰기 모드: 입력된 데이터만 사용
                finalData = parsedData.sort((a: any, b: any) => {
                    return new Date(b.createDate).getTime() - new Date(a.createDate).getTime();
                });
            } else {
                // 병합 모드 (기존 로직)
                let existingData = [];
                if (fs.existsSync(crawlPath)) {
                    existingData = JSON.parse(fs.readFileSync(crawlPath, 'utf-8')).data || [];
                }

                const dataMap = new Map();

                // 1. 기존 데이터 맵핑
                existingData.forEach((item: any) => {
                    // 기존 messageId가 우리 포맷이면 그걸 키로, 아니면 생성
                    // 기존 포맷: YYYY-MM-DD HH:MM:SS-User-Count (가끔 초차이 있음)
                    // 따라서 단순 Key 매칭보다는...

                    // 여기서는 사용자가 준 데이터가 'Full Dump'라고 가정하고
                    // 기존 데이터를 parsedData로 '교체'하되, 
                    // parsedData에 없는(최신 크롤링된) 데이터가 있을 수 있으니 합치는게 안전.

                    // 편의상 Key를 만듦
                    const key = `${item.createDate}|${item.ballonUserName}|${item.ballonCount}`;
                    dataMap.set(key, item);
                });

                // 2. 새 데이터 덮어쓰기
                parsedData.forEach((item) => {
                    const key = `${item.createDate}|${item.ballonUserName}|${item.ballonCount}`;

                    // 타겟이 있는 경우 무조건 우선
                    if (item.targetBjName) {
                        dataMap.set(key, item);
                    } else {
                        // 타겟 없어도 원본 데이터라면 신뢰?
                        // 기존 데이터에 타겟이 있으면 유지?
                        if (dataMap.has(key)) {
                            const old = dataMap.get(key);
                            if (old.targetBjName) {
                                item.targetBjName = old.targetBjName; // 기존 타겟 보존
                            }
                        }
                        dataMap.set(key, item);
                    }
                });

                finalData = Array.from(dataMap.values()).sort((a: any, b: any) => {
                    return new Date(b.createDate).getTime() - new Date(a.createDate).getTime();
                });
            }

            // 저장
            const fileContent = {
                success: true,
                data: finalData,
                lastUpdate: new Date().toISOString(),
                source: "user_upload_sync"
            };

            fs.writeFileSync(crawlPath, JSON.stringify(fileContent, null, 2));

            return NextResponse.json({
                success: true,
                totalCount: finalData.length,
                message: '데이터 동기화 완료!'
            });
        }

        return NextResponse.json({ success: false, error: 'Invalid action' });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    }
}
