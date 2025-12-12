const https = require('https');

const bjId = 'pyh3646';

const options = {
    hostname: 'live.afreecatv.com',
    path: `/afreeca/player_live_api.php?bj_id=${bjId}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
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
            if (json.CHANNEL) {
                console.log('VIEW_CNT raw:', json.CHANNEL.VIEW_CNT);
                console.log('Parsed Int:', parseInt(json.CHANNEL.VIEW_CNT));
            }
        } catch (e) {
            console.log('Raw body:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(e);
});

req.write(`bid=${bjId}`);
req.end();
