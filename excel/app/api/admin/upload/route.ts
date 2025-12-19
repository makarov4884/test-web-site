import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
    try {
        const { text } = await req.json();
        const lines = text.split('\n');
        const parsedData = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            // 데이터 포맷: 순번(옵션) ID 날짜 시간 닉네임 개수 나머지...
            // 예: 1 176560845505147 2025-12-13 15:47:35 JN새로이 10074 비챠
            const match = line.trim().match(/^(\d+)?\s*(\d{14,})\s+(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\s+(.+?)\s+(\d+)\s+(.*)$/);

            if (match) {
                const [_, idx, msgId, date, user, countStr, rest] = match;

                // 나머지(rest) 파싱: "비챠" or "비챠   세은" or "비챠 \t 세은"
                // 탭이나 2칸 이상 공백으로 분리
                let message = rest.trim();
                let target = '';

                // 탭이나 다중 공백으로 분리 시도
                const parts = rest.split(/\t|\s{2,}/).map(s => s.trim()).filter(s => s);

                if (parts.length >= 2) {
                    // 마지막 부분이 닉네임(세은, 가람 등)일 확률이 높음 (2~4글자 한글)
                    const lastPart = parts[parts.length - 1];
                    if (/^[가-힣]{2,4}$/.test(lastPart)) {
                        target = lastPart;
                        message = parts.slice(0, parts.length - 1).join(' '); // 나머지는 메시지
                    } else {
                        message = parts.join(' ');
                    }
                } else if (parts.length === 1) {
                    message = parts[0];
                }

                // 순번을 포함한 messageId 생성 (원래 순서 유지를 위해)
                const sequenceNum = idx || (i + 1).toString();

                parsedData.push({
                    messageId: msgId,
                    createDate: date,
                    ballonUserName: user.trim(),
                    ballonCount: parseInt(countStr.replace(/,/g, ''), 10), // 콤마 제거
                    message: message,
                    targetBjName: target,
                    isManual: true,
                    sequenceNum: parseInt(sequenceNum, 10) // 순번 저장
                });
            }
        }

        // 데이터 저장 디렉토리
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

        const filePath = path.join(dataDir, 'manual_data.json');

        // 1단계: 업로드된 데이터 내부의 중복 제거
        const uploadedMap = new Map();
        parsedData.forEach(d => {
            const existing = uploadedMap.get(d.messageId);
            // 같은 messageId가 있으면 sequenceNum이 더 큰 것을 유지 (나중 데이터)
            if (!existing || (d.sequenceNum > existing.sequenceNum)) {
                uploadedMap.set(d.messageId, d);
            }
        });
        const uniqueUploadedData = Array.from(uploadedMap.values());

        // 2단계: 기존 데이터 로드
        let existingData: any[] = [];
        if (fs.existsSync(filePath)) {
            try {
                existingData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            } catch (e) { existingData = []; }
        }

        // 3단계: 기존 데이터와 병합 (중복 제거: 새 데이터로 덮어쓰기)
        const dataMap = new Map();
        existingData.forEach(d => dataMap.set(d.messageId, d));
        uniqueUploadedData.forEach(d => dataMap.set(d.messageId, d));

        // 4단계: 정렬 (시간 내림차순 → 순번 오름차순)
        const mergedList = Array.from(dataMap.values()).sort((a: any, b: any) => {
            const timeA = new Date(a.createDate).getTime();
            const timeB = new Date(b.createDate).getTime();

            // 시간이 다르면 시간 내림차순
            if (timeB !== timeA) {
                return timeB - timeA;
            }

            // 시간이 같으면 순번 오름차순 (원래 순서 유지)
            const seqA = a.sequenceNum || 0;
            const seqB = b.sequenceNum || 0;
            return seqA - seqB;
        });

        fs.writeFileSync(filePath, JSON.stringify(mergedList, null, 2));

        const duplicatesRemoved = parsedData.length - uniqueUploadedData.length;

        return NextResponse.json({
            success: true,
            uploaded: parsedData.length,
            unique: uniqueUploadedData.length,
            duplicatesRemoved: duplicatesRemoved,
            total: mergedList.length
        });

    } catch (error: any) {
        console.error('Upload Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
