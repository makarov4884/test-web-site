const fs = require('fs');

const content = fs.readFileSync('excel/data/new_crawl_data.txt', 'utf-8');
const lines = content.trim().split('\n');

let total = 0;
let validLines = 0;
let errors = [];

lines.forEach((line, idx) => {
    const cols = line.split('\t');
    if (cols.length >= 5) {
        const balloonStr = cols[4];
        const balloon = parseInt(balloonStr);

        if (!isNaN(balloon)) {
            total += balloon;
            validLines++;
        } else {
            errors.push({ line: idx + 1, value: balloonStr });
        }
    }
});

console.log('Total lines:', lines.length);
console.log('Valid lines:', validLines);
console.log('Total balloons:', total.toLocaleString());
console.log('Errors:', errors.length);

if (errors.length > 0 && errors.length < 10) {
    console.log('\nError samples:');
    errors.forEach(e => console.log(`  Line ${e.line}: "${e.value}"`));
}
