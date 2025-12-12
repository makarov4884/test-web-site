const https = require('https');

const bjId = 'pyh3646';

const options = {
    hostname: 'api.m.afreecatv.com',
    path: `/broad/a/watch?bj_id=${bjId}`,
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
        try {
            const json = JSON.parse(data);
            // Helper to recursively find keys
            function findKeys(obj, regex) {
                const matches = [];
                for (const key in obj) {
                    if (regex.test(key)) {
                        matches.push(`${key}: ${obj[key]}`);
                    }
                    if (typeof obj[key] === 'object' && obj[key] !== null) {
                        matches.push(...findKeys(obj[key], regex));
                    }
                }
                return matches;
            }

            const viewKeys = findKeys(json, /view/i);
            const cntKeys = findKeys(json, /cnt/i); // count
            const userKeys = findKeys(json, /user/i);

            console.log('--- View Related Keys ---');
            console.log(viewKeys.join('\n'));
            console.log('--- Count Related Keys ---');
            console.log(cntKeys.join('\n'));
            console.log('--- User Related Keys ---');
            console.log(userKeys.join('\n'));

        } catch (e) {
            console.log('Parsing Error');
        }
    });
});

req.on('error', (e) => {
    console.error(e);
});

req.write(`bj_id=${bjId}`);
req.end();
