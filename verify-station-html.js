const https = require('https');

// Retry with HTTPS and different endpoint or search if 302
// 302 usually means redirect to login or mobile page.
// Try getting the Station Main Page HTML directly.
// https://bj.afreecatv.com/{ID}

const TEST_BJ_ID = 'gentle05'; // A known BJ ID (e.g., from top list) or random valid one
const url = `https://bj.afreecatv.com/${TEST_BJ_ID}`;

const options = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
};

const req = https.request(url, options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        // Be careful printing large HTML
        // Search for <title> or specifics
        if (data.includes('방송국')) {
            console.log('Found Station Page');
        }

        // Look for potential verification spots:
        // "today_notice_txt" (오늘의 공지) usually visible
        // "g_notice_layer"

        // Let's print a small chunk around "title"
        const titleMatch = data.match(/<title>(.*?)<\/title>/);
        if (titleMatch) console.log('Title:', titleMatch[1]);
    });

});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.end();
