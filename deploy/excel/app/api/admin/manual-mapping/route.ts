import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// 파일 경로
const manualMappingPath = path.join(process.cwd(), 'data', 'manual_mappings.json');
const keywordsPath = path.join(process.cwd(), 'data', 'keywords.json');
const crawlDataPath = path.join(process.cwd(), 'data', 'crawl_data.json');

export async function POST(request: Request) {
    try {
        const { messageId, targetBjName } = await request.json();

        if (!messageId || !targetBjName) {
            return NextResponse.json({ success: false, error: 'Missing required fields' });
        }

        // 1. 수동 매핑 저장 (기존 로직 유지 - 개별 건 처리용)
        let mappings = [];
        if (fs.existsSync(manualMappingPath)) {
            try { mappings = JSON.parse(fs.readFileSync(manualMappingPath, 'utf-8')); } catch (e) { }
        }

        const existingIndex = mappings.findIndex((m: any) => m.messageId === messageId);
        if (existingIndex >= 0) {
            mappings[existingIndex].targetBjName = targetBjName;
        } else {
            mappings.push({ messageId, targetBjName });
        }
        fs.writeFileSync(manualMappingPath, JSON.stringify(mappings, null, 2));

        // 2. [핵심] 자동 학습 기능: 원본 데이터의 타겟명을 키워드로 등록
        // 미분류된 원래 타겟명을 찾아서 keywords.json에 추가
        if (fs.existsSync(crawlDataPath) && fs.existsSync(keywordsPath)) {
            const crawlData = JSON.parse(fs.readFileSync(crawlDataPath, 'utf-8'));
            const originalItem = crawlData.data.find((d: any) => d.messageId === messageId);

            if (originalItem && originalItem.targetBjName) {
                const invalidTargetName = originalItem.targetBjName.trim();

                // 타겟명이 있고, 아직 등록된 BJ 이름과 다를 때만 학습
                if (invalidTargetName && invalidTargetName !== targetBjName) {
                    let keywordsData = JSON.parse(fs.readFileSync(keywordsPath, 'utf-8'));

                    // 해당 BJ 찾기
                    const bjIndex = keywordsData.findIndex((k: any) => k.bjName === targetBjName);

                    if (bjIndex >= 0) {
                        // 키워드 중복 체크 후 추가
                        if (!keywordsData[bjIndex].keywords.includes(invalidTargetName)) {
                            keywordsData[bjIndex].keywords.push(invalidTargetName);
                            // 키워드 업데이트 저장
                            fs.writeFileSync(keywordsPath, JSON.stringify(keywordsData, null, 2));
                            console.log(`🧠 [자동 학습] '${targetBjName}'의 키워드로 '${invalidTargetName}' 등록 완료!`);
                        }
                    }
                }
            }
        }

        return NextResponse.json({ success: true, mappings });
    } catch (error) {
        console.error('Manual mapping save error:', error);
        return NextResponse.json({ success: false, error: 'Failed to save mapping' });
    }
}

export async function GET() {
    if (!fs.existsSync(manualMappingPath)) return NextResponse.json({ success: true, data: [] });
    try {
        const data = JSON.parse(fs.readFileSync(manualMappingPath, 'utf-8'));
        return NextResponse.json({ success: true, data });
    } catch (e) {
        return NextResponse.json({ success: false, data: [] });
    }
}

export async function DELETE(request: Request) {
    try {
        const { messageId } = await request.json();

        if (!fs.existsSync(manualMappingPath)) return NextResponse.json({ success: true });

        // 1. 삭제할 매핑 찾기
        let mappings = JSON.parse(fs.readFileSync(manualMappingPath, 'utf-8'));
        const mappingToDelete = mappings.find((m: any) => m.messageId === messageId);

        if (mappingToDelete) {
            // 2. 학습된 키워드 삭제 (Reverse-Learning)
            if (fs.existsSync(crawlDataPath) && fs.existsSync(keywordsPath)) {
                try {
                    const crawlDataContent = fs.readFileSync(crawlDataPath, 'utf-8');
                    const crawlJson = JSON.parse(crawlDataContent);
                    const crawlData = crawlJson.data || [];

                    // 원본 데이터에서 당시의 타겟명(키워드로 등록된 것) 찾기
                    const originalItem = crawlData.find((d: any) => d.messageId === messageId);

                    if (originalItem && originalItem.targetBjName) {
                        const keywordToRemove = originalItem.targetBjName.trim();

                        // 해당 BJ의 키워드 목록에서 제거
                        let keywordsData = JSON.parse(fs.readFileSync(keywordsPath, 'utf-8'));
                        const bjIndex = keywordsData.findIndex((k: any) => k.bjName === mappingToDelete.targetBjName);

                        if (bjIndex >= 0) {
                            const originalLen = keywordsData[bjIndex].keywords.length;
                            keywordsData[bjIndex].keywords = keywordsData[bjIndex].keywords.filter((k: string) => k !== keywordToRemove);

                            if (keywordsData[bjIndex].keywords.length !== originalLen) {
                                fs.writeFileSync(keywordsPath, JSON.stringify(keywordsData, null, 2));
                                console.log(`🧠 [학습 취소] '${mappingToDelete.targetBjName}'의 키워드 '${keywordToRemove}' 삭제 완료`);
                            }
                        }
                    }
                } catch (err) {
                    console.error('Keyword removal failed:', err);
                }
            }

            // 3. 매핑 삭제
            mappings = mappings.filter((m: any) => m.messageId !== messageId);
            fs.writeFileSync(manualMappingPath, JSON.stringify(mappings, null, 2));
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ success: false, error: 'Delete failed' });
    }
}
