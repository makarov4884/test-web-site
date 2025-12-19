
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Vercel 캐시 방지 (항상 DB 조회)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
    request: Request,
    props: { params: Promise<{ bjId: string }> }
) {
    const params = await props.params;
    const { bjId } = params;

    try {
        // Supabase에서 미리 크롤링된 데이터 조회
        const { data, error } = await supabaseAdmin
            .from('streamer_stats')
            .select('*')
            .eq('bj_id', bjId)
            .single();

        if (error || !data) {
            // 아직 데이터가 없거나 에러인 경우
            // 빈 껍데기만 줘서 프론트엔드 에러 방지 및 로딩 상태 해제
            return NextResponse.json({
                success: true, // 에러 아님, 그냥 데이터가 없는 것
                bjId,
                message: 'Waiting for crawler...',
                stats: {
                    broadcastTime: '0시간',
                    maxViewers: '0명',
                    avgViewers: '0명',
                    fanCount: '0명',
                    totalViewCnt: '0명',
                    chatParticipation: '0%'
                },
                rankingList: [],
                detailRanking: [],
                chartData: []
            });
        }

        // 프론트엔드가 기대하는 포맷으로 변환
        return NextResponse.json({
            success: true,
            timestamp: data.last_updated,
            stats: {
                broadcastTime: data.broadcast_time,
                maxViewers: data.max_viewers,
                avgViewers: data.avg_viewers,
                fanCount: data.fan_count,
                totalViewCnt: data.total_view_cnt,
                chatParticipation: data.chat_participation
            },
            rankingList: data.ranking_list || [],
            chartData: [],
            detailRanking: []
        });

    } catch (e: any) {
        console.error('Proxy Error:', e);
        return NextResponse.json({
            success: false,
            error: e.message
        }, { status: 500 });
    }
}
