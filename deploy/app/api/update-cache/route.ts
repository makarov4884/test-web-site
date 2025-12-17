import { NextResponse } from 'next/server';
import { updateNoticesCache, getLastUpdateTime } from '@/lib/notice-cache';

export async function POST() {
    try {
        const lastUpdate = getLastUpdateTime();
        const now = new Date();

        // Only update if last update was more than 10 minutes ago or never updated
        if (!lastUpdate || (now.getTime() - lastUpdate.getTime()) > 10 * 60 * 1000) {
            // Don't await - let it run in background
            updateNoticesCache().catch(console.error);
            return NextResponse.json({ message: 'Cache update started' });
        }

        return NextResponse.json({ message: 'Cache recently updated', lastUpdate });
    } catch (error) {
        console.error('[Update Cache API] Error:', error);
        return NextResponse.json({ error: 'Failed to update cache' }, { status: 500 });
    }
}

export async function GET() {
    const lastUpdate = getLastUpdateTime();
    return NextResponse.json({ lastUpdate });
}
