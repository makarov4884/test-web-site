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
    { url: `https://api.m.afreecatv.com/station/board/a/list`, method: 'POST', body: `bj_id=${bjId}` },
    { url: `https://api.m.afreecatv.com/board/a/list`, method: 'POST', body: `bj_id=${bjId}` },
    { url: `https://api.m.afreecatv.com/station/v2/board/list?bj_id=${bjId}`, method: 'GET' },
    // Try to list boards first
    { url: `https://api.m.afreecatv.com/station/board/a/category`, method: 'POST', body: `bj_id=${bjId}` },
];

(async () => {
    for (const ep of endpoints) {
        try {
            console.log(`Checking [${ep.method}] ${ep.url}...`);
            const opts = {
                method: ep.method,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 AfreecaTV/4.0',
                    'Cookie': cookieString,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };
            if (ep.body) opts.body = ep.body;

            const res = await fetch(ep.url, opts);
            console.log(`[${res.status}] ${ep.url}`);

            if (res.ok) {
                const text = await res.text();
                // Print first 500 chars to see if it's JSON or HTML
                console.log(text.substring(0, 500));
            }
        } catch (e) {
            console.log(`[ERR] ${ep.url}: ${e.message}`);
        }
    }
})();
