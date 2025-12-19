import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
    try {
        const { filename, videoUrls } = await request.json();

        if (!filename || !Array.isArray(videoUrls)) {
            return NextResponse.json({ success: false, error: 'Invalid parameters. videoUrls must be an array.' }, { status: 400 });
        }

        const videoMapPath = path.join(process.cwd(), 'public', 'signature_videos.json');
        let videoMap: any[] = [];

        if (fs.existsSync(videoMapPath)) {
            try {
                videoMap = JSON.parse(fs.readFileSync(videoMapPath, 'utf-8'));
            } catch (e) {
                // Ignore error, start empty
            }
        }

        // URL 보정 로직 (각 URL에 대해 적용)
        const finalUrls = videoUrls.map((url: string) => {
            const soopMatch = url.match(/player\/(\d+)/);
            if (soopMatch && soopMatch[1]) {
                const videoId = soopMatch[1];
                if (!url.includes('/embed')) {
                    return `https://vod.sooplive.co.kr/player/${videoId}/embed`;
                }
            }
            return url;
        });

        // 기존 항목 업데이트 또는 추가
        const existingIndex = videoMap.findIndex((item: any) => item.file === filename);
        if (existingIndex >= 0) {
            videoMap[existingIndex].videoUrls = finalUrls;
            delete videoMap[existingIndex].videoUrl; // 구버전 필드 삭제
        } else {
            videoMap.push({
                file: filename,
                videoUrls: finalUrls
            });
        }

        fs.writeFileSync(videoMapPath, JSON.stringify(videoMap, null, 2));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving video link:', error);
        return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
    }
}
