const https = require('https');

const ID = '69LFH1'; // ID from user screenshot

https.get(`https://bjapi.afreecatv.com/api/${ID}/station`, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
}, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
            const json = JSON.parse(data);
            if (json.station) {
                console.log('Station Name:', json.station.station_name);
                console.log('Brief:', json.station.station_title);
            } else {
                console.log('No Station Data', json);
            }
        } catch (e) { console.log(data); }
    });
});
