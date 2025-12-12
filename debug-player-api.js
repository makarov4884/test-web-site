const https = require('http'); // The URL is http usually, but let's try https if needed. The player api is often http.

const TEST_BJ_ID = 'gentle05'; // Known active BJ
const url = `http://live.afreecatv.com/afreeca/player_live_api.php?bj_id=${TEST_BJ_ID}`;

const req = https.request(url, {}, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
            const json = JSON.parse(data);
            console.log('Station Name:', json.CHANNEL.RESULT === 1 ? 'Found' : 'Error');
            // print keys
            // we look for station title or similar
            // usually it is in CHANNEL -> STATION_NAME or TITLE
            console.log('Keys in CHANNEL:', Object.keys(json.CHANNEL));
            if (json.CHANNEL.TITLE) console.log('TITLE:', decodeURIComponent(json.CHANNEL.TITLE)); // often url encoded
            if (json.CHANNEL.BJ_ID) console.log('BJ_ID:', json.CHANNEL.BJ_ID);
        } catch (e) {
            console.log('Raw:', data.substring(0, 200));
        }
    });
});
req.end();
