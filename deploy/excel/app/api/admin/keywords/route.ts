import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { BjKeywordMapping } from '@/types';

const dataFilePath = path.join(process.cwd(), 'data', 'keywords.json');

// 데이터 읽기
const readData = (): BjKeywordMapping[] => {
    if (!fs.existsSync(dataFilePath)) {
        // 파일이 없으면 빈 배열 생성 후 반환
        if (!fs.existsSync(path.dirname(dataFilePath))) {
            fs.mkdirSync(path.dirname(dataFilePath), { recursive: true });
        }
        fs.writeFileSync(dataFilePath, '[]', 'utf-8');
        return [];
    }
    const fileContent = fs.readFileSync(dataFilePath, 'utf-8');
    try {
        return JSON.parse(fileContent);
    } catch (e) {
        console.error('JSON parse error:', e);
        return [];
    }
};

// 데이터 쓰기
const writeData = (data: BjKeywordMapping[]) => {
    if (!fs.existsSync(path.dirname(dataFilePath))) {
        fs.mkdirSync(path.dirname(dataFilePath), { recursive: true });
    }
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
};

export async function GET() {
    try {
        const data = readData();
        return NextResponse.json({ success: true, data });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to read keywords' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const mappings: BjKeywordMapping[] = body.mappings;

        if (!Array.isArray(mappings)) {
            throw new Error('Invalid data format');
        }

        writeData(mappings);

        return NextResponse.json({ success: true, message: 'Keywords saved successfully' });
    } catch (error) {
        console.error('Save keywords error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
