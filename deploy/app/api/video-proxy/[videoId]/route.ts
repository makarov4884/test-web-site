import { NextResponse } from 'next/server';
import { chromium } from 'playwright';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ videoId: string }> }
) {
    const { videoId } = await params;

    try {
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        const url = `https://vod.sooplive.co.kr/player/${videoId}/catch`;
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);

        // Extract video URL from page
        const videoData = await page.evaluate(() => {
            // Try to find video element
            const videoEl = document.querySelector('video');
            if (videoEl) {
                return {
                    src: videoEl.src || videoEl.currentSrc || null,
                    poster: videoEl.poster || null
                };
            }
            return null;
        });

        await browser.close();

        if (videoData && videoData.src) {
            return NextResponse.json({
                videoUrl: videoData.src,
                poster: videoData.poster
            });
        } else {
            return NextResponse.json({ error: 'Video URL not found' }, { status: 404 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
