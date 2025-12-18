const fs = require('fs');
const path = require('path');

const publicDir = path.join(process.cwd(), 'public', 'signatures');
const jsonPath = path.join(process.cwd(), 'public', 'signatures.json');
const deployJsonPath = path.join(process.cwd(), 'deploy', 'public', 'signatures.json');

const rawNumbers = `
10074 12180 1205 4282 10000 300000
10099 2100 1270 1212 12000 100000
1122 1530 10054 1992 23000 1000
10825 8000 1668 13000 1435 1245
11700 11111 10085 10082 10031 10029
10025 4000 1033 1573 11554 1308
5050 5000 4600 4588 4274 4090
4001 3669 10075 2848 2808 2666
2400 2070 1052 1857 1550 1677
1459 1472 1424 1350 1344 1319
1234 1280 1240 1201 1090 1022
1007 1900 1888 1399 8383 1800
18888 1237 4242 10588 1475 3333
2288 2800 2158 4132 1440 3024
10777 4885 10072 4057 1063 4029
1444 5885 12121 1370 4222 10098
3008 4333 1500 1504 1518 1580
1600 1616 1699 1707 1744 1758
1775 1777 1829 1855 1919 2000
2004 2020 4025 4042 4044 4046
4082 4172 4175 4223 4298 4321
4444 4486 4545 4555 4888 5211
5555 6119 7777 10001 10007 10024
10027 10055 10084 10101 10110 10270
10333 10400 10462 1001 1003 1004
1005 1010 1111 1134 1140 1150
1166 1185 1199 1200 1214 1222
1225 10811 10944 10999 11004 12250
12345 13333 14000 14441 15775 20000
20496 30000 50000 2108 2222 2244
2300 2336 2355 2424 2500 2525
2600 2775 2777 3000 3080 3113
3388 3737 1251 1275 1277 1300
1301 1313 1324 1333 1337 1339
1367 1447 1450 1488
`;

const numbers = rawNumbers.trim().split(/\s+/).map(n => parseInt(n, 10));

if (!fs.existsSync(publicDir)) {
    console.error('Signatures directory not found');
    process.exit(1);
}

const files = fs.readdirSync(publicDir)
    .filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
    .sort((a, b) => {
        // Extract index: sig_..._N.png
        const idxA = parseInt(a.match(/_(\d+)\./)?.[1] || '0');
        const idxB = parseInt(b.match(/_(\d+)\./)?.[1] || '0');
        return idxA - idxB;
    });

console.log(`Found ${files.length} image files.`);
console.log(`Found ${numbers.length} numbers provided.`);

const mapping = {};
files.forEach((file, index) => {
    if (index < numbers.length) {
        mapping[file] = numbers[index];
    } else {
        // Fallback for files without numbers (though user list looks complete enough)
        mapping[file] = 0;
    }
});

// Optionally sort the map by number descending as previously requested to keep file neat
// Or just keys? Let's just write mapping. The API sorts it anyway.

fs.writeFileSync(jsonPath, JSON.stringify(mapping, null, 2));
console.log(`Updated ${jsonPath}`);

if (fs.existsSync(path.dirname(deployJsonPath))) {
    fs.writeFileSync(deployJsonPath, JSON.stringify(mapping, null, 2));
    console.log(`Updated ${deployJsonPath}`);
}
