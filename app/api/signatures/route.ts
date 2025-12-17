import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'signatures.json');

// Helper to read data
function blockRead() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            return [];
        }
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Error reading signatures:", e);
        return [];
    }
}

// Helper to write data
function blockWrite(data: any) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    } catch (e) {
        console.error("Error writing signatures:", e);
        return false;
    }
}

export async function GET() {
    const data = blockRead();
    return NextResponse.json(data);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        // body should be the full array or an operation
        // For simplicity, let's expect the full array or specific update actions
        // But for "edit on page", usually sending the updated item or list is easiest.
        // Let's assume the client sends the NEW FULL LIST for now (simplest for reordering/deleting),
        // OR an object with { action, item }

        // Let's implement full list replacement for simplicity if body is an array
        if (Array.isArray(body)) {
            blockWrite(body);
            return NextResponse.json({ success: true, data: body });
        }

        return NextResponse.json({ error: "Invalid data format" }, { status: 400 });

    } catch (e) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
