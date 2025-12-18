/*
 * Festival Crawler V3 (Deep Scan Edition)
 * - Network Packet Sniffing (Real-time)
 * - Deep DOM Scanning (Infinite Scroll Support)
 * - Auto Date Correction
 * - Cleaned & Optimized
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 설정
const TARGET_URL = 'https://bcraping.kr/monitor/pyh3646/289919534';
const RELOAD_INTERVAL = 15000; // 15초

async function startCrawler() {
    console.log('🚀 Festival Crawler V3 (Deep Scan) Starting...');

    const dataPath = path.join(process.cwd(), 'data', 'crawl_data.json');
    const dataDir = path.dirname(dataPath);

    if (!fs.existsSync(dataDir)) {
        try { fs.mkdirSync(dataDir, { recursive: true }); } catch (e) { }
    }

    let browser;
    try {
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1920,1080'
            ]
        });
    } catch (e) {
        console.error('Failed to launch browser:', e);
        return;
    }

    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    let dataQueue = [];

    // 1. 네트워크 패킷 감청
    page.on('response', async (response) => {
        try {
            const req = response.request();
            if (!req) return;
            const type = req.resourceType();
            if (['image', 'stylesheet', 'font', 'script', 'media'].includes(type)) return;

            const text = await response.text();
            if ((text.startsWith('{') || text.startsWith('[')) && text.length > 10) {
                const json = JSON.parse(text);
                let items = [];

                if (Array.isArray(json)) items = json;
                else if (json.data && Array.isArray(json.data)) items = json.data;
                else if (json.rows && Array.isArray(json.rows)) items = json.rows;
                else if (json.list && Array.isArray(json.list)) items = json.list;
                if (items.length === 0 && json.gridData) items = json.gridData;

                if (items.length > 0) {
                    items.forEach((item) => {
                        const parsed = parseItem(item);
                        if (parsed) dataQueue.push(parsed);
                    });
                }
            }
        } catch (e) { }
    });

    // 메인 루프
    while (true) {
        try {
            console.log('🔄 Reloading & Scanning...');
            await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await new Promise(r => setTimeout(r, 5000));

            // Deep Scan - 스크롤을 끝까지 내려서 과거 데이터 로딩
            await page.evaluate(async () => {
                const scrollContainer = document.querySelector('.tui-grid-rside-area .tui-grid-body-area');
                if (scrollContainer) {
                    const totalHeight = scrollContainer.scrollHeight;
                    let currentHeight = 0;
                    while (currentHeight < totalHeight) {
                        currentHeight += 500;
                        scrollContainer.scrollTop = currentHeight;
                        await new Promise(r => setTimeout(r, 100));
                    }
                    await new Promise(r => setTimeout(r, 500));
                    scrollContainer.scrollTop = 0;
                }
            });
            await new Promise(r => setTimeout(r, 1000));

            // DOM 스크래핑
            const domItems = await page.evaluate(() => {
                const results = [];
                const rows = document.querySelectorAll('.tui-grid-rside-area .tui-grid-body-area .tui-grid-table tr');
                rows.forEach(row => {
                    const getText = (idx) => row.querySelector(`td:nth-child(${idx}) .tui-grid-cell-content`)?.textContent?.trim() || '';
                    let date = getText(2);
                    const user = getText(3);
                    const count = getText(4);
                    const msg = getText(5);
                    const target = getText(7);

                    // 날짜 보정
                    if (date && date.includes(':') && date.length < 10) {
                        const today = new Date();
                        const y = today.getFullYear();
                        const m = String(today.getMonth() + 1).padStart(2, '0');
                        const d = String(today.getDate()).padStart(2, '0');
                        date = `${y}-${m}-${d} ${date}`;
                    }

                    if (date && user && count) {
                        results.push({
                            messageId: `${date}-${user}-${count}`,
                            createDate: date,
                            ballonUserName: user,
                            ballonCount: parseInt(count.replace(/,/g, ''), 10),
                            targetBjName: target,
                            message: msg,
                            messageDate: date,
                            targetBjGroup: ''
                        });
                    }
                });
                return results;
            });

            if (domItems.length > 0) {
                console.log(`👁️ Deep Scraped: ${domItems.length} items`);
                dataQueue.push(...domItems);
            }

            if (dataQueue.length > 0) {
                saveData(dataPath, dataQueue);
                dataQueue = [];
            }

        } catch (error) {
            console.error(`❌ Error: ${error.message}`);
            await new Promise(r => setTimeout(r, 5000));
        }

        await new Promise(r => setTimeout(r, RELOAD_INTERVAL));
    }
}

function parseItem(item) {
    const keys = Object.keys(item);
    const findKey = (candidates) => keys.find(k => candidates.some(c => k.toLowerCase().includes(c)));

    const kDate = findKey(['date', 'time', 'created']);
    const kUser = findKey(['user', 'nick', 'name', 'sender']);
    const kCount = findKey(['count', 'balloon', 'coin', 'amount', 'cnt']);
    const kBj = findKey(['bj', 'target', 'receiver']);
    const kMsg = findKey(['msg', 'message', 'chat', 'content']);

    if (!kUser || !kCount) return null;

    let createDate = kDate ? item[kDate] : new Date().toISOString();
    if (createDate && createDate.includes(':') && createDate.length < 10) {
        const today = new Date();
        createDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} ${createDate}`;
    }

    const ballonCountRaw = item[kCount];
    const ballonCount = typeof ballonCountRaw === 'string' ? parseInt(ballonCountRaw.replace(/,/g, ''), 10) : ballonCountRaw;

    return {
        messageId: `${createDate}-${item[kUser]}-${ballonCount}`,
        createDate,
        ballonUserName: item[kUser],
        ballonCount,
        targetBjName: kBj ? item[kBj] : '',
        message: kMsg ? item[kMsg] : '',
        messageDate: createDate,
        targetBjGroup: ''
    };
}

function saveData(filePath, newItems) {
    let existingItems = [];
    if (fs.existsSync(filePath)) {
        try { existingItems = JSON.parse(fs.readFileSync(filePath, 'utf-8')).data || []; } catch (e) { }
    }

    const itemMap = new Map();
    existingItems.forEach(i => itemMap.set(i.messageId, i));
    newItems.forEach(i => itemMap.set(i.messageId, i));

    const merged = Array.from(itemMap.values()).sort((a, b) => {
        return new Date(b.createDate).getTime() - new Date(a.createDate).getTime();
    });

    try {
        fs.writeFileSync(filePath, JSON.stringify({
            success: true,
            data: merged,
            lastUpdate: new Date().toISOString(),
            source: 'festival_crawler_v3'
        }, null, 2));
        console.log(`💾 Data Saved. Total: ${merged.length} (Latest: ${merged[0]?.createDate})`);

        // Firestore Sync
        try {
            const { syncToFirestore } = require('./sync-firestore');
            syncToFirestore(); // Fire and forget (optional: await)
        } catch (e) {
            console.log('⚠️ Firestore sync skipped (need setup)');
        }

    } catch (e) { }
}

startCrawler();
