const https = require('https');

const bjId = 'pyh3646';

const options = {
    hostname: 'bjapi.afreecatv.com',
    path: `/api/${bjId}/station`,
    method: 'GET',
    headers: {
        'User-Agent': 'Mozilla/5.0'
    }
};

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        try {
            const json = JSON.parse(data);
            console.log('Full Response:', JSON.stringify(json, null, 2));
        } catch (e) {
            console.log('Raw body:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(e);
});

req.end();
