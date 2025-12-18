const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'img');
const destDir = path.join(process.cwd(), 'public', 'signatures');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

async function processImages() {
    if (!fs.existsSync(srcDir)) {
        console.error(`❌ Source directory not found: ${srcDir}`);
        return;
    }

    const files = fs.readdirSync(srcDir).filter(file => file.toLowerCase().endsWith('.png') || file.toLowerCase().endsWith('.jpg'));

    console.log(`🖼️ Found ${files.length} images in ${srcDir}`);

    for (const file of files) {
        const inputPath = path.join(srcDir, file);
        const outputPath = path.join(destDir, file);

        try {
            // Trim whitespace
            await sharp(inputPath)
                .trim() // Removes surrounding whitespace (transparent or similar color)
                .toFile(outputPath);

            console.log(`✅ Processed: ${file}`);
        } catch (error) {
            console.error(`❌ Failed to process ${file}:`, error.message);
        }
    }

    console.log('🎉 All images processed and saved to public/signatures/');
}

processImages();
