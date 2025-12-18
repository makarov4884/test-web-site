const fs = require('fs');
const path = require('path');

const publicDir = path.join(process.cwd(), 'public', 'signatures');
const jsonPath = path.join(process.cwd(), 'public', 'signatures.json');
const deployJsonPath = path.join(process.cwd(), 'deploy', 'public', 'signatures.json');

if (!fs.existsSync(publicDir)) {
    console.error('Signatures directory not found');
    process.exit(1);
}

const files = fs.readdirSync(publicDir)
    .filter(f => f.endsWith('.png') || f.endsWith('.jpg'));

const mapping = {};
files.forEach(file => {
    // Extract number from filename (e.g., "1000.png" -> 1000)
    const num = parseInt(file.replace(/\.(png|jpg|jpeg|gif)$/i, ''), 10);
    if (!isNaN(num)) {
        mapping[file] = num;
    } else {
        mapping[file] = 0;
    }
});

const jsonString = JSON.stringify(mapping, null, 2);
fs.writeFileSync(jsonPath, jsonString);
console.log(`Updated ${jsonPath} with ${Object.keys(mapping).length} entries.`);

if (fs.existsSync(path.dirname(deployJsonPath))) {
    fs.writeFileSync(deployJsonPath, jsonString);
    console.log(`Updated ${deployJsonPath}`);
}
