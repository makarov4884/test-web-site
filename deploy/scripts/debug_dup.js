const fs = require('fs');
const path = require('path');

const crawlPath = path.join(__dirname, '../data/crawl_data.json');
const crawlData = JSON.parse(fs.readFileSync(crawlPath, 'utf8'));

console.log(`Crawl data count: ${crawlData.data.length}`);

// Debug specific message
crawlData.data.forEach((item, index) => {
    if (item.message.includes("이어형 따잇")) {
        console.log(`Found [Index ${index}]: ${item.createDate} / ${item.relativeTime} / ${item.messageId} / ${item.ballonCount}`);
    }
});
