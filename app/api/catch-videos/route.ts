import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface CatchVideo {
    id: string;
    title: string;
    thumbnailUrl: string;
    videoUrl: string;
    member: string;
    date: string;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    const cacheFile = path.join(process.cwd(), 'data', 'catch-videos.json');

    // Check cache (1 hour)
    if (!force) {
        try {
            const cacheData = await fs.readFile(cacheFile, 'utf-8');
            const cache = JSON.parse(cacheData);
            const cacheAge = Date.now() - cache.timestamp;

            if (cacheAge < 3600000) { // 1 hour
                return NextResponse.json({
                    success: true,
                    videos: cache.videos,
                    cached: true
                });
            }
        } catch (e) {
            // Cache doesn't exist or is invalid
        }
    }

    try {
        // Real scraping with Puppeteer
        const puppeteer = require('puppeteer');
        let browser;
        let scrapedVideos: CatchVideo[] = [];

        try {
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });
            const page = await browser.newPage();

            // Set User-Agent to look like a real browser
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            await page.setViewport({ width: 1920, height: 1080 });

            // Go to the specific URL
            await page.goto('https://www.sooplive.co.kr/station/pyh3646/catch?keyword=alive', {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });

            // Wait and scroll to trigger lazy loading
            try {
                await page.waitForSelector('body');
                // Scroll down a bit
                await page.evaluate(() => window.scrollTo(0, 1000));
                await new Promise(r => setTimeout(r, 3000));
            } catch (e) {
                console.log("Wait/Scroll failed", e);
            }

            // Scrape data
            // @ts-ignore
            scrapedVideos = await page.evaluate(() => {
                const videos = [];
                // Try multiple selectors
                const anchors = Array.from(document.querySelectorAll('a[href*="/catch/"]'));

                // Use a Set to avoid duplicates based on video ID or URL
                const processedUrls = new Set();

                anchors.forEach((anchor, index) => {
                    const href = anchor.getAttribute('href');
                    if (!href || processedUrls.has(href)) return;

                    // Navigate up to find the container (li or div)
                    // The anchor is usually the thumbnail or title
                    const container = anchor.closest('li') || anchor.closest('div');
                    if (!container) return;

                    const titleEl = container.querySelector('.title, .tit, strong, h3') || anchor;
                    const imgEl = container.querySelector('img');

                    const title = titleEl?.textContent?.trim() || '';
                    const thumbnail = imgEl?.getAttribute('src') || '';

                    // Filter by keyword 'alive' (case insensitive)
                    if (title.toLowerCase().includes('alive')) {
                        processedUrls.add(href);

                        // Extract member
                        let member = '기타';
                        const match = title.match(/\[(.*?)\]/g);
                        if (match && match.length >= 2) {
                            const first = match[0].replace(/[\[\]]/g, '');
                            const second = match[1].replace(/[\[\]]/g, '');
                            if (first === '캐치') member = second;
                            else if (second === '캐치') member = first;
                            else member = first !== '캐치' ? first : second;
                        } else if (match && match.length === 1) {
                            const first = match[0].replace(/[\[\]]/g, '');
                            if (first !== '캐치') member = first;
                        }
                        member = member.split(' ')[0];

                        videos.push({
                            id: `catch-${href.split('/').pop()}-${index}`,
                            title,
                            thumbnailUrl: thumbnail,
                            videoUrl: `https://www.sooplive.co.kr${href}`,
                            member,
                            date: new Date().toISOString()
                        });
                    }
                });
                return videos;
            });

        } catch (scrapeError) {
            console.error("Scraping failed:", scrapeError);
            throw scrapeError;
        } finally {
            if (browser) await browser.close();
        }

        // Save to cache
        try {
            await fs.mkdir(path.dirname(cacheFile), { recursive: true });
            await fs.writeFile(cacheFile, JSON.stringify({
                timestamp: Date.now(),
                videos: scrapedVideos
            }, null, 2));
        } catch (e) {
            console.error('Failed to save cache:', e);
        }

        return NextResponse.json({
            success: true,
            videos: scrapedVideos,
            cached: false
        });

    } catch (error) {
        console.error('Error:', error);

        return NextResponse.json({
            success: false,
            error: 'Failed to fetch catch videos',
            videos: []
        }, { status: 500 });
    }
}
