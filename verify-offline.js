const https = require('https');

// A likely offline ID or just a test one. 
// Trying 'krkdrudwn77' (from user list)
const bjId = 'krkdrudwn77';

const options = {
    hostname: 'api.m.afreecatv.com',
    path: `/broad/a/watch?bj_id=${bjId}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0'
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('Keys:', Object.keys(json));
            if (json.data) {
                console.log('Data exists.');
                console.log('broad_no:', json.data.broad_no);
                console.log('view_cnt:', json.data.view_cnt);
                console.log('Data keys:', Object.keys(json.data));
            } else {
                console.log('Data is null/undefined');
            }
        } catch (e) {
            console.log('Error parsing');
        }
    });
});

req.write(`bj_id=${bjId}`);
req.end();
