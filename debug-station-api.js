const https = require('https');

const ID = 'gentle05';

function check(url) {
    console.log('Checking:', url);
    https.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
            'Referer': 'https://bj.afreecatv.com/'
        }
    }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            console.log(`[${url}] Status:`, res.statusCode);
            const preview = data.substring(0, 200);
            console.log(`[${url}] Preview:`, preview);
            try {
                const json = JSON.parse(data);
                console.log(`[${url}] JSON Keys:`, Object.keys(json));
                // check for station name or intro
                if (json.station) {
                    console.log(`[${url}] Station Name:`, json.station.station_name);
                    console.log(`[${url}] Station Title:`, json.station.station_title);
                }
            } catch (e) { }
        });
    });
}

check(`https://bjapi.afreecatv.com/api/${ID}/station`);
check(`https://live.afreecatv.com/afreeca/player_live_api.php?bj_id=${ID}`);
