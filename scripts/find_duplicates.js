const fs = require('fs');
const path = require('path');

const crawlPath = path.join(__dirname, '../data/crawl_data.json');
const manualPath = path.join(__dirname, '../data/manual_data.json');

const crawlData = JSON.parse(fs.readFileSync(crawlPath, 'utf8'));
const manualData = fs.existsSync(manualPath) ? JSON.parse(fs.readFileSync(manualPath, 'utf8')) : [];

console.log(`Crawl data count: ${crawlData.data.length}`);
console.log(`Manual data count: ${manualData.length}`);

// Check for duplicates within crawl_data
const seen = new Map();
const duplicates = [];

crawlData.data.forEach((item, index) => {
    // Key based on content, ignoring minute timestamp differences and messageId
    // Standardize date to ignore year/seconds for fuzzy match if needed?
    // Actually, exact message match + user + count is strong signal.
    const key = `${item.ballonUserName}|${item.ballonCount}|${item.message}`;

    if (seen.has(key)) {
        duplicates.push({
            original: seen.get(key),
            duplicate: item,
            index: index
        });
    } else {
        seen.set(key, item);
    }
});

console.log(`Found ${duplicates.length} potential duplicates based on (User+Count+Message).`);

if (duplicates.length > 0) {
    console.log('Sample duplicates:');
    duplicates.slice(0, 5).forEach(d => {
        console.log('---');
        console.log('Orig:', d.original);
        console.log('Dup :', d.duplicate);
    });
}
