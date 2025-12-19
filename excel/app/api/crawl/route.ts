import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic'; // 캐싱 방지

export async function GET() {
    try {
        const dataDir = path.join(process.cwd(), 'data');
        const crawlPath = path.join(dataDir, 'crawl_data.json');
        const manualPath = path.join(dataDir, 'manual_data.json');
        const keywordsPath = path.join(dataDir, 'keywords.json');

        // 1. 크롤링 데이터 로드 (crawl_data.json)
        let donations: any[] = [];
        if (fs.existsSync(crawlPath)) {
            try {
                // 파일 읽기 시도 (동시성 문제 대비 재시도 로직 단순화)
                const fileContent = fs.readFileSync(crawlPath, 'utf-8');
                const json = JSON.parse(fileContent);
                donations = json.data || [];
            } catch (e) {
                console.error('Failed to read crawl_data.json:', e);
            }
        }

        // 2. 수동 데이터 로드 및 병합 (manual_data.json)
        if (fs.existsSync(manualPath)) {
            try {
                const manual = JSON.parse(fs.readFileSync(manualPath, 'utf-8'));
                const map = new Map();
                // 기존 크롤링 데이터
                donations.forEach(d => map.set(d.messageId, d));
                // 수동 데이터 (우선순위 높음 - 덮어쓰기)
                manual.forEach((d: any) => map.set(d.messageId, d));

                donations = Array.from(map.values());
            } catch (e) {
                console.error('Failed to merge manual_data:', e);
            }
        }

        // 3. 키워드 매핑 로직 (BJ 이름 정리)
        let mappings: any[] = [];
        if (fs.existsSync(keywordsPath)) {
            try { mappings = JSON.parse(fs.readFileSync(keywordsPath, 'utf-8')); } catch (e) { }
        }

        const cleansedDonations = donations.map((d: any) => {
            let cleanBjName = d.targetBjName;
            let extraMessage = '';

            // 사용자 요청: 타겟 미지정 + 5000개 + 래곤제이 -> 팡린* 처리
            if (d.ballonUserName === '래곤제이' && d.ballonCount === 5000 && (!d.targetBjName || !d.targetBjName.trim())) {
                cleanBjName = '팡린*';
            }

            // 키워드 매핑
            const targetName = String(d.targetBjName || '');
            for (const mapping of mappings) {
                if (mapping.keywords.some((k: string) => targetName.includes(k))) {
                    cleanBjName = mapping.bjName;
                    const remainder = targetName.trim();
                    if (remainder) extraMessage = remainder;
                    break;
                }
            }

            return {
                ...d,
                targetBjName: cleanBjName,
                // 메시지에 타겟명 찌꺼기 붙이기 (요청사항)
                message: (extraMessage ? extraMessage + ' ' : '') + (d.message || '')
            };
        });

        // 4. 최종 정렬 (날짜 내림차순 - 최신순)
        cleansedDonations.sort((a: any, b: any) => {
            const tA = new Date(a.createDate).getTime();
            const tB = new Date(b.createDate).getTime();
            // 날짜 파싱 실패 시 0 처리하여 에러 방지
            return (tB || 0) - (tA || 0);
        });

        // [DEBUG] 서버 콘솔에 최신 데이터 1개 출력 확인
        if (cleansedDonations.length > 0) {
            console.log(`API Serving ${cleansedDonations.length} items. Latest: ${cleansedDonations[0].createDate} / ${cleansedDonations[0].ballonUserName}`);
        }

        return NextResponse.json({
            success: true,
            data: cleansedDonations,
            count: cleansedDonations.length,
            timestamp: new Date().toISOString()
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch data',
            data: []
        });
    }
}
