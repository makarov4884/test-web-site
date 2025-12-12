const http = require('http');

const url = 'http://live.sooplive.co.kr:8079/app/index.cgi?szType=read_bj_info&szBjId=gentle05';

http.get(url, (res) => {
    let rawData = [];
    res.on('data', c => rawData.push(c));
    res.on('end', () => {
        const buffer = Buffer.concat(rawData);
        console.log('Status:', res.statusCode);
        console.log('Length:', buffer.length);
        // ASCII check
        const text = buffer.toString('utf8'); // It might be CP949, but ASCII chars are same.
        console.log('Contains "gentle05":', text.includes('gentle05'));
        console.log('Head (hex):', buffer.slice(0, 50).toString('hex'));
        console.log('Head (utf8):', text.substring(0, 100));
    });
});
