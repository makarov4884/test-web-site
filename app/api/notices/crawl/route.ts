import { NextRequest, NextResponse } from 'next/server';
import { getCachedNotices, updateNoticesCache } from '@/lib/notice-cache';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const force = searchParams.get('force') === 'true';

        // 1. Try to get cached notices first
        let notices = await getCachedNotices();

        // 2. If cache is empty OR force requested, update immediately
        if (!notices || notices.length === 0 || force) {
            console.log(`[Notice API] Cache miss or force (${force}), updating...`);
            await updateNoticesCache(true); // Force update
            notices = await getCachedNotices();
        } else {
            // 3. If cache hit, trigger background update (throttled by cache logic)
            updateNoticesCache(false).catch(err => console.error('[Notice API] Background update failed:', err));
        }

        return NextResponse.json({
            success: true,
            count: notices?.length || 0,
            notices: notices || []
        });
    } catch (error: any) {
        console.error('[Notice API] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
