import { NextResponse } from 'next/server';
import { updateNoticesCache } from '@/lib/notice-cache';

export async function POST() {
    try {
        // Trigger update without awaiting to avoid timeout
        updateNoticesCache().catch(console.error);

        return NextResponse.json({
            success: true,
            message: 'Notice update triggered. Check console for progress.'
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to trigger update' }, { status: 500 });
    }
}
