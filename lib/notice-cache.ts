import fs from 'fs/promises';
import path from 'path';
import { crawlNotices as crawlNoticesFromCrawler, type Notice } from './notice-crawler';

interface CachedNotice extends Notice {
    views?: number;
    crawledAt: string;
    profileImage?: string;
}

const CACHE_FILE = path.join(process.cwd(), 'notices-cache.json');
const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

let isUpdating = false;
let lastUpdate: Date | null = null;
// Track initialization to avoid re-reading cache continuously if needed, though readCache handles file IO.

// Read cache
async function readCache(): Promise<CachedNotice[]> {
    try {
        const data = await fs.readFile(CACHE_FILE, 'utf-8');
        const notices = JSON.parse(data);
        if (notices.length > 0 && !lastUpdate) {
            // Try to recover lastUpdate from file stats or content? 
            // Ideally we should store lastUpdate in a separate file or meta wrapper.
            // For now, let's assume if we have data, we might need a refresh unless we rely on memory.
            // But memory is lost on restart. Let's just rely on memory for throttle for now.
        }
        return notices;
    } catch {
        return [];
    }
}

// Write cache
async function writeCache(notices: CachedNotice[]): Promise<void> {
    await fs.writeFile(CACHE_FILE, JSON.stringify(notices, null, 2));
}

// Update cache using the optimized crawler
export async function updateNoticesCache(force: boolean = false): Promise<void> {
    if (isUpdating) {
        console.log('[Notice Cache] Update already in progress');
        return;
    }

    if (!force && lastUpdate && (Date.now() - lastUpdate.getTime() < UPDATE_INTERVAL)) {
        console.log('[Notice Cache] Cache is fresh (updated within 5 mins). Skipping update.');
        return;
    }

    isUpdating = true;
    console.log(`[Notice Cache] Starting update via optimized crawler (Force: ${force})...`);

    try {
        // Use the optimized parallel crawler from notice-crawler.ts
        const freshNotices = await crawlNoticesFromCrawler();

        if (freshNotices.length > 0) {
            const cachedNotices: CachedNotice[] = freshNotices.map(n => ({
                ...n,
                crawledAt: new Date().toISOString(),
                // Construct profile image URL conventionally as crawler doesn't return it yet
                profileImage: `https://profile.img.sooplive.co.kr/LOGO/${n.streamerId.substring(0, 2)}/${n.streamerId}/${n.streamerId}.jpg`
            }));

            await writeCache(cachedNotices);
            lastUpdate = new Date();
            console.log(`[Notice Cache] Update complete. Cached ${cachedNotices.length} notices.`);
        } else {
            console.log('[Notice Cache] No notices found during crawl, preserving existing cache if any.');
        }

    } catch (error) {
        console.error('[Notice Cache] Update failed:', error);
    } finally {
        isUpdating = false;
    }
}

// Get cached notices
export async function getCachedNotices(): Promise<CachedNotice[]> {
    return await readCache();
}

// Get last update time
export function getLastUpdateTime(): Date | null {
    return lastUpdate;
}
