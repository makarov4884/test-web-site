const https = require('https');

const bjId = 'kkimkin0326';

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
            if (json.data) {
                console.log('view_cnt:', json.data.view_cnt);
                console.log('broad_no:', json.data.broad_no);
                if (json.data.code) console.log('Code:', json.data.code);
            } else {
                console.log('No data');
            }
        } catch (e) { }
    });
});

req.write(`bj_id=${bjId}`);
req.end();
