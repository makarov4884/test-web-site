const https = require('https');

const bjId = 'pyh3646';

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
            console.log('Root keys:', Object.keys(json));
            if (json.data) console.log('Data keys:', Object.keys(json.data));
            console.log('view_cnt at root:', json.view_cnt);
        } catch (e) { }
    });
});

req.write(`bj_id=${bjId}`);
req.end();
