const https = require('https');

// Test with a known BJ ID (e.g., 'ch1716' - user from previous logs, or any popular BJ)
const TEST_BJ_ID = 'testtest'; // Replace with a real one if needed, but let's try a dummy first to see structure

// URL found in mobile api often: 
// http://live.afreecatv.com:8079/app/index.cgi?szType=read_bj_info&szBjId={ID}
const url = `http://live.afreecatv.com:8079/app/index.cgi?szType=read_bj_info&szBjId=${TEST_BJ_ID}`;

// Using HTTP since the URL is http
const http = require('http');

const options = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
    }
};

const req = http.request(url, options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        try {
            // It's likely JSON or simple text
            // console.log('Raw Data:', data);
            const json = JSON.parse(data);
            console.log('Parsed JSON:', JSON.stringify(json, null, 2));
        } catch (e) {
            console.log('Not JSON or Error:', data.substring(0, 500));
        }
    });

});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.end();
