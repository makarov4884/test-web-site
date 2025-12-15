const fs = require('fs');
// Uses native fetch in Node 18+

const bjId = 'kkimkin0326';
const endpoints = [
    `http://sch.afreecatv.com/api.php?m=station&v=1.0&a=GetStationBoardList&bj_id=${bjId}`,
    `http://sch.afreecatv.com/api.php?m=search&v=1.0&a=GetStationBoardList&bj_id=${bjId}`,
    `http://sch.afreecatv.com/api.php?m=station&v=1.0&a=GetBoardList&bj_id=${bjId}`,
    // Station main info which might contain board list
    `http://sch.afreecatv.com/api.php?m=station&v=1.0&a=GetStationInfo&bj_id=${bjId}`,
];

// Try to use native fetch if available
const _fetch = global.fetch ? global.fetch : fetch;

(async () => {
    for (const url of endpoints) {
        try {
            console.log(`Checking ${url}...`);
            const res = await _fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
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
