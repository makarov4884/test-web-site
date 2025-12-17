
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), 'data', 'stats-cache.json');
const MANUAL_RANKINGS_FILE = path.join(process.cwd(), 'data', 'manual-rankings.json');

// Helper to read cache only (no crawling)
async function readStatsFromCache(bjId: string) {
    try {
        const data = await fs.readFile(CACHE_FILE, 'utf-8');
        const cache = JSON.parse(data || '{}');
        return cache[bjId] || null;
    } catch (e) {
        return null;
    }
}

// Helper to read manual rankings
async function readManualRankings(bjId: string) {
    try {
        const data = await fs.readFile(MANUAL_RANKINGS_FILE, 'utf-8');
        const rankings = JSON.parse(data || '{}');
        return rankings[bjId]?.rankings || null;
    } catch (e) {
        return null;
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ bjId: string }> }
) {
    const { bjId } = await params;

    // Read from cache only - NO AUTO CRAWLING to prevent crashes
    let stats = await readStatsFromCache(bjId);

    // If no cache, return default data
    if (!stats) {
        stats = {
            bjId,
            name: bjId,
            profileImage: `https://stimg.sooplive.co.kr/LOGO/${bjId.slice(0, 2)}/${bjId}/m/${bjId}.webp`,
            subscribers: '-',
            fans: '-',
            totalViewers: '-',
            lastUpdated: new Date().toISOString()
        };
    }

    // Check for manual rankings
    const manualRankings = await readManualRankings(bjId);
    if (manualRankings && manualRankings.length > 0) {
        stats.rankingList = manualRankings;
    }

    // Enrich with registered name if available
    try {
        const streamersPath = path.join(process.cwd(), 'data', 'streamers.json');
        const streamersData = await fs.readFile(streamersPath, 'utf-8');
        const streamers = JSON.parse(streamersData);
        const registered = streamers.find((s: any) => s.bjId === bjId);
        if (registered) {
            stats.name = registered.name;
        }
    } catch (e) {
        // ignore error reading streamers.json
    }

    return NextResponse.json(stats);
}
