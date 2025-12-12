import { NextRequest, NextResponse } from 'next/server';
import { getCachedNotices } from '@/lib/notice-cache';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ bjId: string }> }
) {
    const { bjId } = await params;

    try {
        // Get cached notices
        const allNotices = await getCachedNotices();

        // Filter by streamer ID
        const notices = allNotices
            .filter(notice => notice.streamerId === bjId)
            .map(notice => ({
                id: notice.id,
                streamerId: notice.streamerId,
                streamerName: notice.streamerName,
                title: notice.title,
                content: notice.content,
                date: notice.date,
                views: notice.views
            }));

        console.log(`[Notice API] Returned ${notices.length} cached notices for ${bjId}`);
        return NextResponse.json({ notices });
    } catch (error) {
        console.error(`[Notice API] Error fetching notices for ${bjId}:`, error);
        return NextResponse.json({ notices: [] });
    }
}
