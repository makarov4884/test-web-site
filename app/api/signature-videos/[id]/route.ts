import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // Video data mapping for each signature
    const videoData: Record<string, any[]> = {
        '1000': [
            {
                id: '1',
                title: 'Alive 1000 - 빅진우[JINU] #1',
                thumbnailUrl: 'https://videoimg.sooplive.co.kr/php/SnapshotLoad.php?rowKey=catch_20251214_15387419_1_r',
                videoUrl: 'https://vod.sooplive.co.kr/embed/player/180705391/catch',
                category: 'Alive'
            },
            {
                id: '2',
                title: 'Alive 1000 - 빅진우[JINU] #2',
                thumbnailUrl: '',
                videoUrl: 'https://vod.sooplive.co.kr/embed/player/180634417/catch',
                category: 'Alive'
            },
            {
                id: '3',
                title: 'Alive 1000 - 빅진우[JINU] #3',
                thumbnailUrl: '',
                videoUrl: 'https://vod.sooplive.co.kr/embed/player/179362745/catch',
                category: 'Alive'
            },
            {
                id: '4',
                title: 'Alive 1000 - 빅진우[JINU] #4',
                thumbnailUrl: '',
                videoUrl: 'https://vod.sooplive.co.kr/embed/player/179329745/catch',
                category: 'Alive'
            },
            {
                id: '5',
                title: 'Alive 1000 - 빅진우[JINU] #5',
                thumbnailUrl: '',
                videoUrl: 'https://vod.sooplive.co.kr/embed/player/179296807/catch',
                category: 'Alive'
            },
            {
                id: '6',
                title: 'Alive 1000 - 빅진우[JINU] #6',
                thumbnailUrl: '',
                videoUrl: 'https://vod.sooplive.co.kr/embed/player/179260755/catch',
                category: 'Alive'
            },
            {
                id: '7',
                title: 'Alive 1000 - 빅진우[JINU] #7',
                thumbnailUrl: '',
                videoUrl: 'https://vod.sooplive.co.kr/embed/player/179260535/catch',
                category: 'Alive'
            },
            {
                id: '8',
                title: 'Alive 1000 - 빅진우[JINU] #8',
                thumbnailUrl: '',
                videoUrl: 'https://vod.sooplive.co.kr/embed/player/179260429/catch',
                category: 'Alive'
            },
            {
                id: '9',
                title: 'Alive 1000 - 빅진우[JINU] #9',
                thumbnailUrl: '',
                videoUrl: 'https://vod.sooplive.co.kr/embed/player/179259339/catch',
                category: 'Alive'
            }
        ]
    };

    const videos = videoData[id] || [];

    return NextResponse.json({
        signatureId: id,
        signatureTitle: `${id} - Alive 영상`,
        videos
    });
}
