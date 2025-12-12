const https = require('https');

const ID = 'gentle05';
// Note: legacy search api or new soop search
const url = `https://sch.afreecatv.com/api.php?m=search&v=1.0&szOrder=&szKeyword=${ID}`;

https.get(url, {
    headers: {
        'User-Agent': 'Mozilla/5.0' // basic
    }
}, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
            const json = JSON.parse(data);
            // It might return something like { DETAILS: { ... } } or LIST
            console.log('Keys:', Object.keys(json));
            console.log('Data:', JSON.stringify(json, null, 2).substring(0, 500));
        } catch (e) {
            console.log('Raw:', data.substring(0, 200));
        }
    });
});
