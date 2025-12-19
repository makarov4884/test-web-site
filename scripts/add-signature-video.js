const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Usage: node scripts/add-signature-video.js <VOD_URL>
// Usage: node scripts/add-signature-video.js <VOD_URL_OR_FILE_PATH>
const inputArg = process.argv[2];

if (!inputArg) {
    console.error('Usage: node scripts/add-signature-video.js <VOD_URL_OR_FILE_PATH>');
    process.exit(1);
}

// Absolute path normalization
const resolvedPath = path.resolve(inputArg);
console.log(`Checking input: ${resolvedPath} (Raw: ${inputArg})`);

const isDirectory = fs.existsSync(resolvedPath) && fs.lstatSync(resolvedPath).isDirectory();
const isFile = fs.existsSync(resolvedPath) && fs.lstatSync(resolvedPath).isFile();

if (isDirectory) {
    console.log(`Directory detected. Generating search URLs for all signatures in: ${resolvedPath}`);
    // Load signatures.json to ensure we only target valid/known numbers
    const sigMapPath = path.join(process.cwd(), 'public', 'signatures.json');
    if (fs.existsSync(sigMapPath)) {
        const sigMap = JSON.parse(fs.readFileSync(sigMapPath, 'utf-8'));
        const numbers = Object.values(sigMap);

        // Base Station ID - hardcoded to pyh3646 based on user context, or could be configurable
        const stationId = 'pyh3646';

        explicitUrls = numbers.map(num => `https://www.sooplive.co.kr/station/${stationId}/catch?keyword=${num}`);
        console.log(`Generated ${explicitUrls.length} URLs for batch processing.`);
    } else {
        console.error('signatures.json not found, cannot batch process directory.');
        process.exit(1);
    }
} else if (isFile) {
    console.log(`Reading URLs from file: ${resolvedPath}`);
    const fileContent = fs.readFileSync(resolvedPath, 'utf-8');
    explicitUrls = fileContent.split(/\r?\n/).filter(line => line.trim().startsWith('http'));
} else {
    // Treat as direct URL
    explicitUrls = [inputArg];
}

// Load signatures mapping once (Optimization: already loaded above if dir, but okay to reload or move up)
// We need 'sigMap' variable available globally or strictly passed. 
// Existing code loads it at line 29. Let's move line 29-35 UP or ensure it's available.

// Actually, let's keep the existing `const sigMapPath` block below (lines 30+), 
// but since I need it for Directory logic, I should move the `sigMap` loading TO THE TOP.

const sigMapPath = path.join(process.cwd(), 'public', 'signatures.json');
if (!fs.existsSync(sigMapPath)) {
    console.error('signatures.json not found!');
    process.exit(1);
}
const sigMap = JSON.parse(fs.readFileSync(sigMapPath, 'utf-8'));

// Load videos JSON once
const videoJsonPath = path.join(process.cwd(), 'public', 'signature_videos.json');
let videoData = [];
if (fs.existsSync(videoJsonPath)) {
    videoData = JSON.parse(fs.readFileSync(videoJsonPath, 'utf-8'));
}

async function main() {
    const browser = await chromium.launch({ headless: true });

    // Process sequentially
    let count = 0;
    for (const url of explicitUrls) {
        count++;
        if (!url || !url.startsWith('http')) {
            console.log(`Skipping invalid URL: ${url} `);
            continue;
        }

        try {
            console.log(`\n[${count}/${explicitUrls.length}] Processing: ${url}...`);
            const page = await browser.newPage();

            await processSingleUrl(page, url, sigMap, videoData);

            // Auto-save progress
            try {
                fs.writeFileSync(videoJsonPath, JSON.stringify(videoData, null, 2));
                // console.log('   (Progress Saved)'); 
            } catch (saveErr) {
                console.error('Error saving progress:', saveErr);
            }

            await page.close();
        } catch (e) {
            console.error(`Error processing ${url}: `, e.message);
        }
    }

    // Save videoData once after all URLs are processed
    fs.writeFileSync(videoJsonPath, JSON.stringify(videoData, null, 2));
    console.log('\nSaved all processed URLs to signature_videos.json');

    await browser.close();
}

// Refactoring to separate function for cleanliness
// Refactoring to separate function for cleanliness
async function processSingleUrl(page, url, sigMap, videoData) {
    console.log(`Navigating to: ${url}`);

    // Determine if it's a Station/List page or a Player page
    const isStationPage = url.includes('/station/');

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
        console.error(`Failed to load ${url}: ${e.message}`);
        return;
    }
    await page.waitForTimeout(2500); // Check for CSR hydration

    let extractedVideoUrl = url;
    let finalTitle = '';

    // Determine if we should enforce a keyword match
    let strictNumber = null;
    try {
        const urlObj = new URL(url);
        const keyword = urlObj.searchParams.get('keyword');
        if (keyword && /^\d+$/.test(keyword)) {
            strictNumber = parseInt(keyword, 10);
            console.log(`[Strict Mode] Only accepting number: ${strictNumber} (from URL keyword)`);
        }
    } catch (e) { }

    // Load admin list
    const adminPath = path.join(process.cwd(), 'public', 'admins.json');
    const streamersPath = path.join(process.cwd(), 'data', 'streamers.json');

    let allowedKeywords = [];

    if (fs.existsSync(adminPath) && fs.existsSync(streamersPath)) {
        const admins = JSON.parse(fs.readFileSync(adminPath, 'utf-8'));
        const streamers = JSON.parse(fs.readFileSync(streamersPath, 'utf-8'));

        // Map Admin IDs to Nicknames/Keywords
        admins.forEach(adminId => {
            const streamer = streamers.find(s => s.bjId === adminId);
            if (streamer) {
                // Heuristic: If name has "S2", remove it. If name has "[...]", remove it?
                // User example: "진매S2" -> "진매"
                let name = streamer.name;

                // 1. Remove [TAG]
                name = name.replace(/\[.*?\]/g, '');
                // 2. Remove S2
                name = name.replace(/S2/i, '');
                // 3. Remove Special Chars
                name = name.replace(/[♥♡(?)\*]/g, '');

                name = name.trim();

                if (name) {
                    allowedKeywords.push(name);
                    // Also add the original just in case? Or just the processed one.
                    // Let's add the original simplified (e.g. without spaces) too if different
                }
            }
        });
        console.log(`Allowed Title Keywords (from Admins): ${allowedKeywords.join(', ')}`);
    }

    if (isStationPage) {
        // [Logic for Station/Catch List]
        console.log('Detected Station/List Page. Searching for ALL video items...');

        const videoItems = await page.evaluate(() => {
            const items = [];

            // Selector 1: Catch List Items (New UI)
            const catchLinks = document.querySelectorAll('a[href*="/player/"]');

            catchLinks.forEach(link => {
                const titleEl = link.querySelector('p[class*="Title-module__title"]');
                // Extract possible nickname (uploader) - kept for debug
                const nickEl = link.querySelector('div[class*="Title-module__sub_title"]');
                const nickname = nickEl ? nickEl.textContent.trim() : '';

                // Extract Thumbnail
                const imgEl = link.querySelector('img');
                const thumbUrl = imgEl ? imgEl.src : '';

                if (titleEl) {
                    items.push({
                        title: titleEl.textContent.trim(),
                        href: link.href,
                        nickname: nickname,
                        thumbnailUrl: thumbUrl
                    });
                } else {
                    // Check Generic logic as fallback or for VOD list
                    const genericTitle = link.querySelector('strong, h3, h4, p, [class*="title"], [class*="subject"]');
                    if (genericTitle) {
                        items.push({
                            title: genericTitle.textContent.trim(),
                            href: link.href,
                            nickname: '', // Fallback
                            thumbnailUrl: thumbUrl
                        });
                    }
                }
            });

            return items;
        });

        if (videoItems.length > 0) {
            console.log(`-> Found ${videoItems.length} items. Processing all...`);

            for (const item of videoItems) {
                const itemTitle = item.title;
                const itemUrl = item.href;
                const itemNick = item.nickname;
                const itemThumb = item.thumbnailUrl;

                // [New Filtering Logic]
                // [New Filtering Logic]
                let matchedKeyword = null;

                // 1. Title Keyword Filter (based on Admin List)
                if (allowedKeywords.length > 0) {
                    const keyword = allowedKeywords.find(k => itemTitle.includes(k));

                    if (!keyword) {
                        console.log(`   Skipping: Title "${itemTitle}" does not contain any allowed keywords.`);
                        continue;
                    }
                    matchedKeyword = keyword;
                } else {
                    matchedKeyword = itemNick || 'Unknown';
                }

                // 2. Check strict number match from URL keywords

                // --- Internal Processing Start ---
                console.log(`\n   Processing Item: "${itemTitle}" (Nick: ${itemNick}, Matched: ${matchedKeyword})`);

                // Clean up generic suffixes
                const cleanTitle = itemTitle.replace(/\| SOOP$/, '').replace(/의 방송국$/, '').trim();

                // Extract number logic (Reused)
                const numberMatches = cleanTitle.match(/([0-9,]+)/g);
                if (!numberMatches) {
                    console.log('   Skipping: No number in title.');
                    continue;
                }

                let number = -1;
                for (const m of numberMatches) {
                    const val = parseInt(m.replace(/,/g, ''), 10);
                    if (!isNaN(val)) {
                        // Strict check if applicable
                        if (strictNumber !== null && val !== strictNumber) {
                            continue;
                        }

                        if (Object.values(sigMap).includes(val)) {
                            number = val;
                            break;
                        }
                        // Fallback only if no strict mode and no match yet
                        if (strictNumber === null && number === -1) number = val;
                    }
                }

                if (number === -1) {
                    if (strictNumber !== null) {
                        console.log(`   Skipping: Number does not match keyword ${strictNumber}`);
                    } else {
                        console.log(`   Skipping: Invalid number extract from ${cleanTitle}`);
                    }
                    continue;
                }

                const filename = Object.keys(sigMap).find(key => sigMap[key] === number);
                if (!filename) {
                    console.log(`   Skipping: No image for number ${number}`);
                    continue;
                }

                console.log(`   -> Matched Number: ${number} (File: ${filename})`);

                // Add to Video Data
                let entry = videoData.find(v => v.file === filename);
                if (!entry) {
                    entry = { file: filename, number: number, videoUrls: [], videoMeta: {} };
                    videoData.push(entry);
                }

                // Backfill videoMeta if missing
                if (!entry.videoMeta) entry.videoMeta = {};

                // Normalize URL
                let saveUrl = itemUrl;
                if (saveUrl && !saveUrl.startsWith('http')) {
                    saveUrl = 'https://vod.sooplive.co.kr' + saveUrl;
                }
                const vodIdMatch = saveUrl.match(/\/video\/(\d+)/) || saveUrl.match(/\/player\/(\d+)/);
                if (vodIdMatch) {
                    saveUrl = `https://vod.sooplive.co.kr/player/${vodIdMatch[1]}/embed`;
                }

                // Save Metadata (Thumbnail + Author/Nickname)
                if (itemThumb || matchedKeyword) {
                    entry.videoMeta[saveUrl] = {
                        thumbnail: itemThumb || '',
                        author: matchedKeyword
                    };
                }

                if (!entry.videoUrls) entry.videoUrls = [];
                if (!entry.videoUrls.includes(saveUrl)) {
                    entry.videoUrls.push(saveUrl);
                    console.log(`   -> Added URL: ${saveUrl}`);
                } else {
                    console.log('   -> URL already exists.');
                }
                // --- Internal Processing End ---
            }
            return; // Finished processing list page

        } else {
            console.error('Could not find any video items on this station page. Please use a direct VOD URL.');
            return;
        }

    } else {
        // [Logic for Player Page]
        // Try to get precise title from DOM first
        const titleInfo = await page.evaluate(() => {
            const og = document.querySelector('meta[property="og:title"]');
            const ogTitle = og ? og.content : '';
            const docTitle = document.title;

            const vodTitleEl = document.querySelector('.broadcast_title') ||
                document.querySelector('.vod_title') ||
                document.querySelector('.catch_area .title') ||
                document.querySelector('div[class*="broadcast_title"]') ||
                document.querySelector('h3.title');

            const domTitle = vodTitleEl ? vodTitleEl.innerText : '';

            return { docTitle, ogTitle, domTitle };
        });

        finalTitle = titleInfo.domTitle || titleInfo.ogTitle || titleInfo.docTitle;
    }

    // Clean up generic suffixes
    finalTitle = finalTitle.replace(/\| SOOP$/, '').replace(/의 방송국$/, '').trim();
    console.log(`Found Title: "${finalTitle}"`);

    // Extract number (e.g., 1000, 1,000)
    // Supports: "1000개", "1,000", "No.1000"
    // Use refined regex to capture full numbers including those without commas
    const numberMatches = finalTitle.match(/([0-9,]+)/g);

    if (!numberMatches) {
        console.error('Could not find a number in the title.');
        return;
    }

    // Find the longest match that forms a valid number (heuristics) or just take the first meaningful one
    let number = -1;
    for (const m of numberMatches) {
        const val = parseInt(m.replace(/,/g, ''), 10);
        // We look for a number present in the keys if possible, or just the largest/valid one
        if (!isNaN(val)) {
            // Prefer the number that actually exists in our map if possible, 
            // otherwise just take the first valid one found (likely the main count)
            if (Object.values(sigMap).includes(val)) {
                number = val;
                break;
            }
            // Fallback: keep the first one if we haven't found a direct match yet
            if (number === -1) number = val;
        }
    }
    console.log(`Extracted Number: ${number}`);

    // Map to file
    const filename = Object.keys(sigMap).find(key => sigMap[key] === number);
    if (!filename) {
        console.error(`No signature image found for number ${number} in signatures.json`);
        return;
    }
    console.log(`Matched Image: ${filename}`);

    // Prepare Entry
    let entry = videoData.find(v => v.file === filename);
    if (!entry) {
        entry = { file: filename, number: number, videoUrls: [] };
        videoData.push(entry);
    }

    // Normalize Video URL for embedding
    let saveUrl = extractedVideoUrl;
    // Ensure absolute URL
    if (saveUrl && !saveUrl.startsWith('http')) {
        saveUrl = 'https://vod.sooplive.co.kr' + saveUrl; // Assumption
    }

    // Convert to Embed format
    const vodIdMatch = saveUrl.match(/\/video\/(\d+)/) || saveUrl.match(/\/player\/(\d+)/);
    if (vodIdMatch) {
        saveUrl = `https://vod.sooplive.co.kr/player/${vodIdMatch[1]}/embed`;
    }

    if (!entry.videoUrls) entry.videoUrls = [];
    if (!entry.videoUrls.includes(saveUrl)) {
        entry.videoUrls.push(saveUrl);
        console.log(`Added URL: ${saveUrl}`);
    } else {
        console.log('URL already exists.');
    }
}

main();
