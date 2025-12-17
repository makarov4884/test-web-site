import { NextResponse } from 'next/server';
import { getStreamers } from '@/app/actions';

export async function GET() {
    try {
        const streamers = await getStreamers();

        return NextResponse.json({
            success: true,
            streamers: streamers.map(s => ({
                id: s.bjId,
                name: s.name
            }))
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
