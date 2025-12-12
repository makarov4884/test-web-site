const https = require('http'); // HTTP for this endpoint? Try https first but maybe it's plain http

// Trying a different endpoint or correct headers if needed.
// Actually, let's try the MOBILE API which is very reliable.
// https://sch.afreecatv.com/api.php might need URL encoding for Korean, but here it is english.
// The previous "Raw body" was empty? Or maybe the console output was cut off?
// Re-running with https but slightly different path or query.

const keyword = 'pyh3646';

const options = {
    hostname: 'sch.afreecatv.com',
    path: `/api.php?m=searchList&v=1.0&szOrder=view_cnt&szKeyword=${keyword}&nPageNo=1&nListCnt=5`,
    method: 'GET',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': '*/*'
    }
};

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Body Length:', data.length);
        console.log('Body:', data.substring(0, 2000));
    });
});

req.on('error', (e) => {
    console.error(e);
});

req.end();
