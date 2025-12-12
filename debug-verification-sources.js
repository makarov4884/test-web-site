const https = require('https');
const http = require('http');

const TEST_ID = 'gentle05'; // Example ID

function check(url, protocol) {
    console.log(`Checking: ${url}`);
    const req = protocol.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    }, (res) => {
        console.log(`[${url}] Status: ${res.statusCode}`);
        if (res.statusCode >= 300 && res.statusCode < 400) {
            console.log(`[${url}] Redirect -> ${res.headers.location}`);
            // Follow redirect once
            if (res.headers.location) {
                const newUrl = res.headers.location;
                const newProto = newUrl.startsWith('https') ? https : http;
                check(newUrl, newProto);
            }
            return;
        }

        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            console.log(`[${url}] Length: ${data.length}`);
            // Check for title or specific content
            if (data.includes('<title>')) {
                const title = data.match(/<title>(.*?)<\/title>/)[1];
                console.log(`[${url}] Title: ${title}`);
            }
        });
    });
    req.on('error', e => console.log(`[${url}] Error: ${e.message}`));
}

// 1. PC Page
check(`https://bj.afreecatv.com/${TEST_ID}`, https);

// 2. Mobile Page
check(`https://m.afreecatv.com/station/${TEST_ID}`, https);

// 3. Mobile API (http)
check(`http://live.afreecatv.com:8079/app/index.cgi?szType=read_bj_info&szBjId=${TEST_ID}`, http);
