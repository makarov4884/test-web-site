const sharp = require('sharp');
const path = require('path');

async function check() {
    try {
        const filePath = path.join(process.cwd(), 'public/signatures/1000.png');
        const metadata = await sharp(filePath).metadata();
        console.log(`1000.png: ${metadata.width} x ${metadata.height}`);
    } catch (e) {
        console.error(e);
    }
}
check();
