import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataPath = path.join(process.cwd(), 'data', 'crawl_data.json');
const keywordsPath = path.join(process.cwd(), 'data', 'keywords.json');

// BJ 이름 정규화 함수 (키워드 매칭)
function findBjName(rawName: string, message: string, keywordsData: any[]): string | null {
    const target = (rawName + ' ' + message).trim();

    if (!target) return null;

    for (const bj of keywordsData) {
        // 1. BJ 이름 자체가 포함되어 있는지 확인
        if (target.includes(bj.bjName)) return bj.bjName;

        // 2. 키워드 확인
        if (bj.keywords) {
            for (const keyword of bj.keywords) {
                if (target.includes(keyword)) return bj.bjName;
            }
        }
    }
    return null;
}

export async function GET() {
    try {
        // 데이터 로드
        let crawlData = { data: [] };
        if (fs.existsSync(dataPath)) {
            crawlData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        }

        let keywordsData = [];
        if (fs.existsSync(keywordsPath)) {
            keywordsData = JSON.parse(fs.readFileSync(keywordsPath, 'utf-8'));
        }

        // 미분류 데이터 필터링
        const unmappedItems = crawlData.data.filter((item: any) => {
            const match = findBjName(item.targetBjName, item.message || '', keywordsData);
            // 매칭되는 BJ가 없으면 미분류
            return match === null;
        });

        return NextResponse.json({
            success: true,
            data: unmappedItems,
            bjs: keywordsData.map((k: any) => k.bjName)
        });

    } catch (error) {
        console.error('Error fetching unmapped data:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { updates } = await request.json(); // updates: [{ messageId: '...', newBjName: '...' }] OR 'rollback'

        // 롤백 요청 처리
        if (updates === 'rollback') {
            const backupPath = path.join(process.cwd(), 'data', 'crawl_data.backup_mapping.json');
            if (fs.existsSync(backupPath)) {
                fs.copyFileSync(backupPath, dataPath);
                return NextResponse.json({ success: true, message: 'Rollback successful' });
            } else {
                return NextResponse.json({ success: false, message: 'No backup found to rollback' });
            }
        }

        if (!Array.isArray(updates) || updates.length === 0) {
            return NextResponse.json({ success: false, message: 'No updates provided' });
        }

        // 파일 읽기
        let crawlData = { data: [] };
        if (fs.existsSync(dataPath)) {
            crawlData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        } else {
            return NextResponse.json({ success: false, message: 'Data file not found' }, { status: 404 });
        }

        // [롤백용 백업 생성] 수정 전 상태 저장
        const backupPath = path.join(process.cwd(), 'data', 'crawl_data.backup_mapping.json');
        fs.writeFileSync(backupPath, JSON.stringify(crawlData, null, 2));

        let updatedCount = 0;

        // 데이터 업데이트
        crawlData.data = crawlData.data.map((item: any) => {
            const update = updates.find((u: any) => u.messageId === item.messageId);
            if (update) {
                updatedCount++;
                return { ...item, targetBjName: update.newBjName }; // BJ 이름 강제 변경
            }
            return item;
        });

        // 저장
        crawlData.lastUpdate = new Date().toISOString();
        fs.writeFileSync(dataPath, JSON.stringify(crawlData, null, 2));

        return NextResponse.json({ success: true, updatedCount });

    } catch (error) {
        console.error('Error updating mapping:', error);
        return NextResponse.json({ success: false, error: 'Failed to update mapping' }, { status: 500 });
    }
}
