const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'public', 'signatures.json');
const deployFilePath = path.join(process.cwd(), 'deploy', 'public', 'signatures.json');

if (!fs.existsSync(filePath)) {
    console.error('signatures.json not found');
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

// Convert to array, sort, convert back to object (preserving order)
const sortedEntries = Object.entries(data).sort(([, valA], [, valB]) => valB - valA);

const sortedData = {};
sortedEntries.forEach(([key, val]) => {
    sortedData[key] = val;
});

const jsonString = JSON.stringify(sortedData, null, 2);

fs.writeFileSync(filePath, jsonString);
console.log('Sorted public/signatures.json');

if (fs.existsSync(path.dirname(deployFilePath))) {
    fs.mkdirSync(path.dirname(deployFilePath), { recursive: true });
    fs.writeFileSync(deployFilePath, jsonString);
    console.log('Updated deploy/public/signatures.json');
}
