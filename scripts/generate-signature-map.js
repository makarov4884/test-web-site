const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const dir = path.join(process.cwd(), 'public', 'signatures');
const mapFile = path.join(process.cwd(), 'public', 'signatures.json');

async function generateMap() {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
    let signatureMap = {};

    // Load existing map if partially generated
    // if (fs.existsSync(mapFile)) {
    //    try { signatureMap = JSON.parse(fs.readFileSync(mapFile, 'utf-8')); } catch (e) {}
    // }

    console.log(`Processing ${files.length} images with Basic OCR (Resize only)...`);

    const worker = await Tesseract.createWorker('eng');
    // PSM 6: Assume a single uniform block of text.
    // PSM 11: Sparse text.
    await worker.setParameters({
        tessedit_char_whitelist: '0123456789G', // Add 'G' or similar if logic needs anchor, but let's stick to digits.
        tessedit_pageseg_mode: '6',
    });

    let updatedCount = 0;

    for (const [index, file] of files.entries()) {
        const filePath = path.join(dir, file);
        if ((index + 1) % 20 === 0) console.log(`Processing ${index + 1}/${files.length}...`);

        try {
            // Minimal preprocessing: Just resize.
            // Sometimes grayscale helps, sometimes color is needed for contrast.
            // Let's try 2x resize + gray.
            const metadata = await sharp(filePath).metadata();
            const processedBuffer = await sharp(filePath)
                .resize(Math.round(metadata.width * 2)) // Enlarge
                .grayscale()
                .toBuffer();

            const { data: { text } } = await worker.recognize(processedBuffer);

            // Loose matching: find largest number
            const numbers = text.match(/\d+/g);
            let bestNumber = 0;

            if (numbers) {
                // Heuristic: Signature numbers are likely > 100.
                const candidates = numbers.map(n => parseInt(n, 10)).filter(n => n >= 10);
                if (candidates.length > 0) {
                    // Pick the largest one (likely the main count)
                    bestNumber = Math.max(...candidates);
                }
            }

            if (bestNumber > 0) {
                signatureMap[file] = bestNumber;
                updatedCount++;
            } else {
                signatureMap[file] = 0;
            }

        } catch (e) {
            console.error(`Error processing ${file}:`, e.message);
        }
    }

    await worker.terminate();
    fs.writeFileSync(mapFile, JSON.stringify(signatureMap, null, 2));
    console.log(`🎉 Final Map: Identified numbers for ${updatedCount}/${files.length} images.`);
}

generateMap();
