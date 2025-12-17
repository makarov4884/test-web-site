const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'signatures.json');

if (fs.existsSync(DATA_FILE)) {
    let data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    let count = 0;

    data = data.map(item => {
        // Tag all items from SOOP live as "Alive" category
        if (item.videoUrl && item.videoUrl.includes('vod.sooplive.co.kr')) {
            count++;
            return {
                ...item,
                category: 'Alive'
            };
        }
        return item;
    });

    if (count > 0) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
        console.log(`Updated ${count} items to category 'Alive'.`);
    } else {
        console.log('No items matched.');
    }
}
