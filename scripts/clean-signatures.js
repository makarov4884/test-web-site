const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'signatures.json');

if (fs.existsSync(DATA_FILE)) {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    const initialLength = data.length;

    // Remove items with title 'Untitled'
    const cleanData = data.filter(item => item.title !== 'Untitled' && item.title !== '');

    fs.writeFileSync(DATA_FILE, JSON.stringify(cleanData, null, 2), 'utf-8');
    console.log(`Removed ${initialLength - cleanData.length} untitled items.`);
} else {
    console.log('No data file found.');
}
