const https = require('https');

const url = 'https://www.sooplive.co.kr/station/gentle05';

https.get(url, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
}, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Length:', data.length);
        console.log('Title:', data.match(/<title>(.*?)<\/title>/)?.[1]);
        // dump first 1000 chars
        console.log('Head:', data.substring(0, 1000));
        // check for specific meta tags
        console.log('Description:', data.match(/<meta property="og:description" content="(.*?)"/)?.[1]);
    });
});
