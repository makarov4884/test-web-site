const http = require('http');

const keyword = 'pyh3646';

const options = {
    hostname: 'sch.afreecatv.com',
    path: `/api.php?m=searchList&v=1.0&szOrder=view_cnt&szKeyword=${keyword}&nPageNo=1&nListCnt=5`,
    method: 'GET',
    headers: {
        'User-Agent': 'Mozilla/5.0'
    }
};

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        try {
            const json = JSON.parse(data);
            // Look for 'real_broad' or 'd' (data)
            console.log('Keys:', Object.keys(json));
            if (json.REAL_BROAD) {
                console.log('REAL_BROAD:', JSON.stringify(json.REAL_BROAD, null, 2));
            }
        } catch (e) {
            console.log('Raw body (first 500):', data.substring(0, 500));
        }
    });
});

req.on('error', (e) => {
    console.error(e);
});

req.end();
