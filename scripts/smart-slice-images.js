const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'img');
const destDir = path.join(process.cwd(), 'public', 'signatures');

if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

const THRESHOLD = 10;
const BACKGROUND_COLOR = { r: 255, g: 255, b: 255 };
const MIN_SIZE = 30; // Min size for split

function isContent(r, g, b) {
    return Math.abs(r - BACKGROUND_COLOR.r) > THRESHOLD ||
           Math.abs(g - BACKGROUND_COLOR.g) > THRESHOLD ||
           Math.abs(b - BACKGROUND_COLOR.b) > THRESHOLD;
}

async function sliceImages() {
    const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.png'));

    // Clear
    const existing = fs.readdirSync(destDir);
    for (const f of existing) fs.unlinkSync(path.join(destDir, f));

    let globalIndex = 0;

    for (const file of files) {
        console.log(`Analyzing ${file}...`);
        const original = sharp(path.join(srcDir, file));

        const processed = original.clone().flatten({ background: '#ffffff' }).removeAlpha().toColorspace('srgb');
        const { width, height } = await processed.metadata();
        const buffer = await processed.raw().toBuffer();
        const channels = 3;

        // 1. Vertical Split (Find Rows)
        const rowSegments = [];
        let inRow = false;
        let startY = 0;

        for (let y = 0; y < height; y++) {
            let rowHasContent = false;
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * channels;
                if (isContent(buffer[idx], buffer[idx + 1], buffer[idx + 2])) {
                    rowHasContent = true;
                    break;
                }
            }

            if (rowHasContent && !inRow) {
                inRow = true;
                startY = y;
            } else if (!rowHasContent && inRow) {
                inRow = false;
                rowSegments.push({ start: startY, end: y - 1 });
            }
        }
        if (inRow) rowSegments.push({ start: startY, end: height - 1 });

        console.log(`  Found ${rowSegments.length} rows.`);

        // 2. Horizontal Split for each Row (Find Columns)
        for (const rowSeg of rowSegments) {
            const rowHeight = rowSeg.end - rowSeg.start + 1;
            if (rowHeight < MIN_SIZE) continue;

            const colSegments = [];
            let inCol = false;
            let startX = 0;

            for (let x = 0; x < width; x++) {
                let colHasContent = false;
                // Scan only within this row segment
                for (let y = rowSeg.start; y <= rowSeg.end; y++) {
                    const idx = (y * width + x) * channels;
                    if (isContent(buffer[idx], buffer[idx + 1], buffer[idx + 2])) {
                        colHasContent = true;
                        break;
                    }
                }

                if (colHasContent && !inCol) {
                    inCol = true;
                    startX = x;
                } else if (!colHasContent && inCol) {
                    inCol = false;
                    colSegments.push({ start: startX, end: x - 1 });
                }
            }
            if (inCol) colSegments.push({ start: startX, end: width - 1 });

            console.log(`    Row ${rowSeg.start}-${rowSeg.end} has ${colSegments.length} items.`);

            // 3. Extract Items
            for (const colSeg of colSegments) {
                const colWidth = colSeg.end - colSeg.start + 1;
                if (colWidth < MIN_SIZE) continue;

                const region = {
                    left: colSeg.start,
                    top: rowSeg.start,
                    width: colWidth,
                    height: rowHeight
                };

                const fileName = `sig_${Date.now()}_${globalIndex++}.png`;

                try {
                    // Extract -> Trim -> Save
                    // Using separate sharp instance from buffer for safety
                    const segmentBuffer = await sharp(buffer, { raw: { width, height, channels } })
                        .extract(region)
                        .png()
                        .toBuffer();

                    await sharp(segmentBuffer)
                        .trim()
                        .toFile(path.join(destDir, fileName));
                } catch (err) {
                    console.error(`    Error saving item ${globalIndex}: ${err.message}`);
                }
            }
        }
    }
    console.log(`Slice complete. Saved to ${destDir}`);
}

sliceImages().catch(console.error);
