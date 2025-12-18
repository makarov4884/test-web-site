const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'public', 'signatures');

async function runOCR() {
    if (!fs.existsSync(dir)) {
        console.error("Directory not found:", dir);
        return;
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
    console.log(`Found ${files.length} images to process with OCR...`);

    // Worker creation (reusing worker is faster)
    const worker = await Tesseract.createWorker('eng'); // Numbers are English/Universal
    // English 'eng' works well for digits. 'kor' might be needed if text is mixed but for "1500" eng is sufficient.

    // Set whitelist chars to speed up and improve accuracy for numbers
    await worker.setParameters({
        tessedit_char_whitelist: '0123456789',
    });

    let processedCount = 0;

    for (const file of files) {
        // Skip if already renamed (starts with number)
        if (/^\d{3,}_/.test(file)) {
            console.log(`Skipping ${file} (Already renamed)`);
            continue;
        }

        const filePath = path.join(dir, file);

        try {
            console.log(`Scanning ${file}...`);
            const { data: { text } } = await worker.recognize(filePath);

            // Find the first sequence of digits (3+ digits)
            // e.g. "걸스데이 1500" -> match "1500"
            const match = text.match(/\d{3,}/);

            if (match) {
                const number = match[0];
                const newName = `${number}_${file}`;
                const newPath = path.join(dir, newName);

                fs.renameSync(filePath, newPath);
                console.log(`✅ Renamed: ${file} -> ${newName} (Found: ${number})`);
                processedCount++;
            } else {
                console.log(`⚠️  No number found in ${file}. Text: "${text.trim()}"`);
            }
        } catch (err) {
            console.error(`❌ Error detecting text in ${file}:`, err.message);
        }
    }

    await worker.terminate();
    console.log(`🎉 OCR Complete! Processed ${processedCount} files.`);
}

runOCR();
