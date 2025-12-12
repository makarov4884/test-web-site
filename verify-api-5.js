const https = require('https');

const bjId = 'pyh3646';

const options = {
    hostname: 'bj.afreecatv.com',
    path: `/${bjId}`,
    method: 'GET',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
};

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        // Look for patterns like "view_cnt" or "nViewer"
        const viewerMatch = data.match(/"view_cnt":\s*(\d+)/i) || data.match(/view_cnt\s*=\s*(\d+)/i);
        if (viewerMatch) {
            console.log('Found view_cnt:', viewerMatch[1]);
        } else {
            console.log('view_cnt not found in HTML');
        }

        // Dump a small part to check
        const start = data.indexOf('view_cnt');
        if (start > -1) {
            console.log('Context:', data.substring(start - 50, start + 50));
        }
    });
});

req.on('error', (e) => {
    console.error(e);
});

req.end();
