const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imgDir = path.join(process.cwd(), 'img');
const files = fs.readdirSync(imgDir).filter(f => f.endsWith('.png'));

async function checkSize() {
    if (files.length === 0) {
        console.log("No images found.");
        return;
    }

    const file = files[0];
    const filePath = path.join(imgDir, file);
    const metadata = await sharp(filePath).metadata();

    console.log(`File: ${file}`);
    console.log(`Size: ${metadata.width} x ${metadata.height}`);
}

checkSize();
