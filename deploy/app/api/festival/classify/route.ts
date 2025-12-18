import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { db } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
    try {
        const { messageId, streamerName } = await request.json();

        if (!messageId || !streamerName) {
            return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
        }

        // keywords.json 읽기
        const keywordsPath = path.join(process.cwd(), 'data', 'keywords.json');
        let normalizedStreamerName = streamerName;

        if (fs.existsSync(keywordsPath)) {
            try {
                const keywordsContent = fs.readFileSync(keywordsPath, 'utf-8');
                const keywords = JSON.parse(keywordsContent);

                // streamerName이 keywords에 있는 bjName과 일치하는지 확인
                const matchedBj = keywords.find((k: any) => k.bjName === streamerName);
                if (matchedBj) {
                    normalizedStreamerName = matchedBj.bjName;
                }
            } catch (e) {
                console.error('Failed to parse keywords.json:', e);
            }
        }

        // crawl_data.json 파일 직접 수정
        const crawlPath = path.join(process.cwd(), 'data', 'crawl_data.json');

        if (!fs.existsSync(crawlPath)) {
            return NextResponse.json({ success: false, error: 'Data file not found' }, { status: 404 });
        }

        // 파일 읽기 (캐시 무효화를 위해 동기적으로 읽기)
        delete require.cache[crawlPath]; // Node.js 캐시 무효화
        const fileContent = fs.readFileSync(crawlPath, 'utf-8');
        const jsonData = JSON.parse(fileContent);

        // 해당 messageId를 찾아서 targetBjName 업데이트
        let found = false;
        let updatedDonation: any = null;

        if (jsonData.data && Array.isArray(jsonData.data)) {
            jsonData.data = jsonData.data.map((item: any) => {
                if (item.messageId === messageId) {
                    found = true;
                    updatedDonation = {
                        ...item,
                        targetBjName: normalizedStreamerName
                    };
                    return updatedDonation;
                }
                return item;
            });
        }

        if (db) {
            try {
                // 전체 데이터를 Firestore에 업데이트 (비효율적이지만 Single Document 구조상 필요)
                await db.collection('festival_data').doc('main_data').set({
                    donations: jsonData.data,
                    lastUpdated: new Date().toISOString()
                }, { merge: true });
                console.log('🔥 Check! Synced classification to Firestore');
            } catch (e) {
                console.error('Failed to sync to Firestore:', e);
            }
        }

        if (!found) {
            return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 });
        }

        // 파일에 다시 저장
        fs.writeFileSync(crawlPath, JSON.stringify(jsonData, null, 2));

        console.log(`✅ Classification successful: ${messageId} -> ${normalizedStreamerName} (${updatedDonation?.ballonCount} balloons)`);

        return NextResponse.json({
            success: true,
            updated: {
                messageId,
                streamerName: normalizedStreamerName,
                ballonCount: updatedDonation?.ballonCount
            }
        });
    } catch (error) {
        console.error('Error saving classification:', error);
        return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';

