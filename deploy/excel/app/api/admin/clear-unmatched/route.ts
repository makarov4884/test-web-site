import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
    try {
        const { messageIds } = await request.json();

        if (!Array.isArray(messageIds) || messageIds.length === 0) {
            return NextResponse.json({ success: false, error: 'No messageIds provided' });
        }

        const dataDir = path.join(process.cwd(), 'data');
        const crawlPath = path.join(dataDir, 'crawl_data.json');
        const manualPath = path.join(dataDir, 'manual_data.json');

        let deletedCount = 0;

        // 1. crawl_data.json에서 삭제
        if (fs.existsSync(crawlPath)) {
            try {
                const crawlData = JSON.parse(fs.readFileSync(crawlPath, 'utf-8'));
                const originalCount = crawlData.data ? crawlData.data.length : 0;

                crawlData.data = (crawlData.data || []).filter((item: any) =>
                    !messageIds.includes(item.messageId)
                );

                deletedCount += originalCount - crawlData.data.length;
                fs.writeFileSync(crawlPath, JSON.stringify(crawlData, null, 2));
            } catch (e) {
                console.error('Failed to process crawl_data.json:', e);
            }
        }

        // 2. manual_data.json에서 삭제
        if (fs.existsSync(manualPath)) {
            try {
                const manualData = JSON.parse(fs.readFileSync(manualPath, 'utf-8'));
                const originalCount = Array.isArray(manualData) ? manualData.length : 0;

                const filtered = (Array.isArray(manualData) ? manualData : []).filter((item: any) =>
                    !messageIds.includes(item.messageId)
                );

                deletedCount += originalCount - filtered.length;
                fs.writeFileSync(manualPath, JSON.stringify(filtered, null, 2));
            } catch (e) {
                console.error('Failed to process manual_data.json:', e);
            }
        }

        return NextResponse.json({
            success: true,
            deletedCount,
            message: `${deletedCount}개의 미분류 데이터가 삭제되었습니다.`
        });

    } catch (error: any) {
        console.error('Clear unmatched error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
