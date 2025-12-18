import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const dirPath = path.join(process.cwd(), 'public', 'signatures');
        const mapPath = path.join(process.cwd(), 'public', 'signatures.json');

        if (!fs.existsSync(dirPath)) {
            return NextResponse.json({ images: [] });
        }

        let signatureMap: Record<string, number> = {};
        if (fs.existsSync(mapPath)) {
            try {
                signatureMap = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));
            } catch (e) {
                console.error("Failed to parse signature map", e);
            }
        }

        const files = fs.readdirSync(dirPath)
            .filter(file => /\.(png|jpg|jpeg|gif)$/i.test(file));

        const images = files
            .filter(file => signatureMap[file] !== undefined) // Only include mapped files
            .map(file => ({
                file,
                number: signatureMap[file]
            }));

        // Sort Ascending by number (1000 -> 300000)
        images.sort((a, b) => a.number - b.number);

        return NextResponse.json({ images }); // Returns objects { file, number }
    } catch (error) {
        return NextResponse.json({ error: 'Failed to list images' }, { status: 500 });
    }
}
