const https = require('https');

const ID = 'ch1716'; // Known top BJ

function check(url) {
    console.log('Checking:', url);
    https.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0'
        }
    }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            console.log(`[${url}] Status:`, res.statusCode);
            try {
                const json = JSON.parse(data);
                console.log(`[${url}] JSON Keys:`, Object.keys(json));
                if (json.station) {
                    console.log(`[${url}] Station Name:`, json.station.station_name);
                }
            } catch (e) { console.log('Not JSON'); }
        });
    });
}

check(`https://bjapi.afreecatv.com/api/${ID}/station`);
