import { NextResponse } from 'next/server';
import { getCachedNotices } from '@/lib/notice-cache';

export async function GET() {
    try {
        const allNotices = await getCachedNotices();

        // Sort by date descending and take top 5
        const recentNotices = allNotices
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5)
            .map(notice => ({
                id: notice.id,
                streamerId: notice.streamerId,
                streamerName: notice.streamerName,
                title: notice.title,
                content: notice.content,
                date: notice.date,
                views: notice.views
            }));

        return NextResponse.json({ notices: recentNotices });
    } catch (error) {
        console.error('[Recent Notices API] Error:', error);
        return NextResponse.json({ notices: [] });
    }
}
