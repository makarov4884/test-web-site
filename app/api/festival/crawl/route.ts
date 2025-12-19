import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const dataDir = path.join(process.cwd(), 'data');
        const crawlPath = path.join(dataDir, 'crawl_data.json');
        const manualPath = path.join(dataDir, 'manual_data.json');
        const keywordsPath = path.join(dataDir, 'keywords.json');

        let donations: any[] = [];
        if (fs.existsSync(crawlPath)) {
            try {
                // Node.js 캐시 무효화 - 항상 최신 파일 읽기
                delete require.cache[crawlPath];
                const fileContent = fs.readFileSync(crawlPath, 'utf-8');
                const json = JSON.parse(fileContent);
                donations = json.data || [];
            } catch (e) {
                console.error('Failed to read crawl_data.json:', e);
            }
        }

        if (fs.existsSync(manualPath)) {
            try {
                const manual = JSON.parse(fs.readFileSync(manualPath, 'utf-8'));
                const map = new Map();
                donations.forEach(d => map.set(d.messageId, d));
                manual.forEach((d: any) => map.set(d.messageId, d));
                donations = Array.from(map.values());
            } catch (e) {
                console.error('Failed to merge manual_data:', e);
            }
        }

        // 날짜순 정렬만 수행
        donations.sort((a: any, b: any) => {
            const tA = new Date(a.createDate).getTime();
            const tB = new Date(b.createDate).getTime();
            return (tB || 0) - (tA || 0);
        });

        return NextResponse.json({
            success: true,
            data: donations,
            count: donations.length,
            timestamp: new Date().toISOString()
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
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
