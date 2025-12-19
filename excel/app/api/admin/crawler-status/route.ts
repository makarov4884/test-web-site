import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const flagPath = path.join(process.cwd(), 'data', 'crawler_on.flag');

export async function GET() {
    const isOn = fs.existsSync(flagPath);
    return NextResponse.json({ isOn });
}

export async function POST(request: Request) {
    const { action } = await request.json(); // 'on' or 'off'

    if (action === 'on') {
        fs.writeFileSync(flagPath, 'ON');
        return NextResponse.json({ success: true, isOn: true });
    } else if (action === 'off') {
        if (fs.existsSync(flagPath)) fs.unlinkSync(flagPath);
        return NextResponse.json({ success: true, isOn: false });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' });
}
