import { NextResponse } from 'next/server';
import { getStreamers } from '@/app/actions';
import { getStreamerStats } from '@/lib/stats-cache';

let isUpdating = false;
let lastUpdateTime: Date | null = null;

export async function POST() {
    try {
        // Prevent concurrent updates
        if (isUpdating) {
            return NextResponse.json({
                message: 'Update already in progress',
                lastUpdate: lastUpdateTime
            }, { status: 429 });
        }

        const now = new Date();

        // Only update if last update was more than 30 minutes ago
        if (lastUpdateTime && (now.getTime() - lastUpdateTime.getTime()) < 30 * 60 * 1000) {
            return NextResponse.json({
                message: 'Stats recently updated',
                lastUpdate: lastUpdateTime,
                nextUpdate: new Date(lastUpdateTime.getTime() + 30 * 60 * 1000)
            });
        }

        isUpdating = true;

        // Get all registered streamers
        const streamers = await getStreamers();
        console.log(`[Update Stats] Starting update for ${streamers.length} streamers...`);

        // Update stats for all streamers (in background)
        const updatePromises = streamers.map(async (streamer) => {
            try {
                console.log(`[Update Stats] Fetching stats for ${streamer.bjId}...`);
                await getStreamerStats(streamer.bjId, true); // Force refresh
                console.log(`[Update Stats] ✓ Updated ${streamer.bjId}`);
            } catch (error) {
                console.error(`[Update Stats] ✗ Failed to update ${streamer.bjId}:`, error);
            }
        });

        // Wait for all updates to complete
        await Promise.all(updatePromises);

        lastUpdateTime = new Date();
        isUpdating = false;

        console.log(`[Update Stats] ✅ All stats updated successfully`);

        return NextResponse.json({
            message: 'Stats updated successfully',
            updated: streamers.length,
            lastUpdate: lastUpdateTime
        });

    } catch (error) {
        console.error('[Update Stats API] Error:', error);
        isUpdating = false;
        return NextResponse.json({
            error: 'Failed to update stats',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function GET() {
    const streamers = await getStreamers();
    return NextResponse.json({
        lastUpdate: lastUpdateTime,
        isUpdating,
        totalStreamers: streamers.length,
        nextUpdate: lastUpdateTime ? new Date(lastUpdateTime.getTime() + 30 * 60 * 1000) : null
    });
}
