import { NextResponse } from 'next/server';
import { getStreamers } from '@/app/actions';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const streamers = await getStreamers();

        const keywords = streamers.map(streamer => ({
            bjName: streamer.name,
            keywords: [streamer.name]
        }));

        const keywordsPath = path.join(process.cwd(), 'data', 'keywords.json');
        fs.writeFileSync(keywordsPath, JSON.stringify(keywords, null, 2));

        return NextResponse.json({
            success: true,
            message: `Synced ${keywords.length} streamers`,
            streamers: keywords
        });
    } catch (error) {
        console.error('Error syncing streamers:', error);
        return NextResponse.json({ success: false, error: 'Failed to sync' }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
