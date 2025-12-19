import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const adminsFilePath = path.join(process.cwd(), 'public', 'admins.json');

function getAdmins(): string[] {
    if (fs.existsSync(adminsFilePath)) {
        try {
            return JSON.parse(fs.readFileSync(adminsFilePath, 'utf-8'));
        } catch (e) {
            return [];
        }
    }
    return [];
}

function saveAdmins(admins: string[]) {
    fs.writeFileSync(adminsFilePath, JSON.stringify(admins, null, 2));
}

export async function GET() {
    try {
        const admins = getAdmins();
        return NextResponse.json({ success: true, admins });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { id } = await request.json();
        if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

        const admins = getAdmins();
        if (!admins.includes(id)) {
            admins.push(id);
            saveAdmins(admins);
        }

        return NextResponse.json({ success: true, admins });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { id } = await request.json();
        if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

        let admins = getAdmins();
        admins = admins.filter(adminId => adminId !== id);
        saveAdmins(admins);

        return NextResponse.json({ success: true, admins });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
    }
}
