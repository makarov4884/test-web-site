const fs = require('fs');

const bjId = 'kkimkin0326';
// Try to load cookies
let cookieString = '';
try {
    const cookies = JSON.parse(fs.readFileSync('data/soop-cookies.json', 'utf8'));
    cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    console.log(`Loaded ${cookies.length} cookies.`);
} catch (e) { console.log('No cookies loaded'); }

const endpoints = [
    // Mobile API candidates
    `https://api.m.afreecatv.com/station/board/list?bj_id=${bjId}`,
    `https://api.m.afreecatv.com/board/list?bj_id=${bjId}`,
    `https://bjapi.afreecatv.com/api/${bjId}/board`,
    `https://bjapi.afreecatv.com/api/${bjId}/station/boards`,
    // Legacy STBBS API
    `http://stbbs.afreecatv.com/api/list/bbs_no/54728884/page/1`,
    `https://stbbs.afreecatv.com/api/list/bbs_no/54728884/page/1`,
    `https://bjapi.afreecatv.com/api/pyh3646/board/54728884`,
    // Known working patterns from similar apps
    `https://bjapi.afreecatv.com/api/${bjId}/board/list`,
];

(async () => {
    for (const url of endpoints) {
        try {
            console.log(`Checking ${url}...`);
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 AfreecaTV/4.0',
                    'Cookie': cookieString
                }
            });
            console.log(`[${res.status}] ${url}`);
            if (res.ok) {
                const text = await res.text();
                console.log(text.substring(0, 500));
            }
        } catch (e) {
            console.log(`[ERR] ${url}: ${e.message}`);
        }
    }
})();
