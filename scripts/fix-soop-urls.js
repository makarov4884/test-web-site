const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'signatures.json');

if (fs.existsSync(DATA_FILE)) {
    let data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    let count = 0;

    data = data.map(item => {
        if (item.videoUrl && item.videoUrl.includes('vod.sooplive.co.kr/embed/')) {
            // Wrong: vod.sooplive.co.kr/embed/1234
            // Right: vod.sooplive.co.kr/player/1234/embed
            const idMatch = item.videoUrl.match(/embed\/(\d+)/);
            if (idMatch) {
                count++;
                return {
                    ...item,
                    videoUrl: `https://vod.sooplive.co.kr/player/${idMatch[1]}/embed`
                };
            }
        }
        return item;
    });

    if (count > 0) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
        console.log(`Fixed ${count} signature URLs.`);
    } else {
        console.log('No URLs needed fixing.');
    }
} else {
    console.log('No data file found.');
}
