import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    // Next.js 15+ Params handling
    props: { params: Promise<{ bjId: string }> }
) {
    const params = await props.params;
    const bjId = params.bjId;

    try {
        // 1. BJ 이름 찾기 (keywords 테이블)
        let bjName = bjId;
        const { data: keywordData } = await supabaseAdmin
            .from('keywords')
            .select('bj_name')
            .or(`bj_name.eq.${bjId},keywords.cs.{${bjId}}`)
            .limit(1)
            .single();

        if (keywordData) bjName = keywordData.bj_name;

        // 2-1. keywords 테이블에서 매핑된 정확한 한글 이름 찾기 시도
        let targetBjName = bjName; // 기본값
        const { data: matchBj } = await supabaseAdmin
            .from('keywords')
            .select('bj_name')
            .contains('keywords', [bjId])
            .limit(1)
            .maybeSingle();

        if (matchBj) targetBjName = matchBj.bj_name;

        // 3. 크롤링된 실시간 통계 가져오기 (streamer_stats 테이블 ONLY)
        const { data: crawledStats } = await supabaseAdmin
            .from('streamer_stats')
            .select('*')
            .eq('bj_id', bjId) // bjId로 검색
            .limit(1)
            .maybeSingle();

        // 4. 응답 데이터 구성 (donations 테이블 미사용)
        const stats = {
            bjId,
            name: targetBjName,
            profileImage: `https://stimg.sooplive.co.kr/LOGO/${bjId.slice(0, 2)}/${bjId}/m/${bjId}.webp`,

            // streamer_stats 데이터 매핑
            subscribers: crawledStats?.broadcast_time || '-',
            fans: '-', // 상세 데이터 없음
            totalViewers: crawledStats?.max_viewers || '-',
            lastUpdated: new Date().toISOString(),

            // 별풍선 데이터는 streamer_stats에 없으므로 0 처리
            dailyStar: '0',
            monthlyStar: '0',
            totalStar: '0',

            // 팬클럽 수
            fanCount: crawledStats?.fan_count || '-',

            // 랭킹 리스트 (donations 테이블 미사용이므로 빈 배열)
            rankingList: []
        };

        return NextResponse.json(stats);

    } catch (e: any) {
        console.error('Stats API Error:', e);
        // 에러 시 기본값 반환
        return NextResponse.json({
            bjId,
            name: bjId,
            error: 'Failed to fetch stats',
            details: e.message
        });
    }
}
