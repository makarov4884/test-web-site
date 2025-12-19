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
            .or(`bj_name.eq.${bjId},keywords.cs.{${bjId}}`) // 정확하지 않지만 대략 검색
            .limit(1)
            .single();

        // keywords 테이블에 bjId 컬럼은 없지만, 클라이언트에서 bjId를 보통 닉네임이나 ID로 쓰므로
        // 정확한 매칭을 위해 keywords.json 대신 DB를 쓴다면 bjId 필드가 필요할 수 있음.
        // 현재는 DB에 bjId 컬럼이 없으니, 그냥 bj_name이라고 가정하고 진행하거나,
        // 클라이언트가 bjName을 파라미터로 주면 좋았겠지만, 일단 fallback 처리.
        if (keywordData) bjName = keywordData.bj_name;

        // 2. 후원 데이터 집계 (donations 테이블)
        // target_bj_name으로 검색해야 함. (bjId가 실제 닉네임과 다를 수 있어 주의 필요)
        // 여기서는 bjId가 URL 파라미터로 들어온 '아이디'지만, DB 저장된 건 '한글 닉네임'일 수 있음.
        // 따라서, 클라이언트에서 넘겨준 bjId가 'ID'라면 DB 조회 시 매핑이 필요함.
        // 일단 DB 조회를 위해 전체 데이터를 가져오는 건 비효율적이므로, 
        // 기존 로직처럼 'bjName'이 한글 닉네임이라고 가정하고 검색 시도.

        // 2-1. keywords 테이블에서 매핑된 정확한 한글 이름 찾기 시도
        let targetBjName = bjId; // 기본값
        const { data: matchBj } = await supabaseAdmin
            .from('keywords')
            .select('bj_name')
            .contains('keywords', [bjId])
            .limit(1)
            .maybeSingle();

        if (matchBj) targetBjName = matchBj.bj_name;

        // 3. 통계 집계 (donations 테이블 집계)
        const { data: donations, error } = await supabaseAdmin
            .from('donations')
            .select('ballon_count, ballon_user_name')
            .eq('target_bj_name', targetBjName);

        if (error) throw error;

        // 4. 크롤링된 실시간 통계 가져오기 (streamer_stats 테이블)
        const { data: crawledStats } = await supabaseAdmin
            .from('streamer_stats')
            .select('*')
            .eq('bj_id', bjId) // bjId로 검색
            .limit(1)
            .maybeSingle();

        let totalStar = 0;
        let totalCount = 0;
        const supporterMap = new Map<string, number>();

        (donations || []).forEach(d => {
            totalStar += d.ballon_count;
            totalCount++;

            const current = supporterMap.get(d.ballon_user_name) || 0;
            supporterMap.set(d.ballon_user_name, current + d.ballon_count);
        });

        // 크롤링된 별풍선 개수가 있으면 그것을 사용 (더 정확할 수 있음)
        // 단, 포맷이 '39,487명' 처럼 되어있을 수 있으므로 숫자만 추출
        let crawledStar = '0';
        if (crawledStats && crawledStats.fan_count) {
            crawledStar = crawledStats.fan_count;
        }

        // 4. 랭킹 생성
        const rankingList = Array.from(supporterMap.entries())
            .map(([username, count], idx) => ({
                rank: 0,
                username,
                userId: '',
                score: count,
                totalScore: count,
                image: null
            }))
            .sort((a, b) => b.score - a.score)
            .map((item, idx) => ({ ...item, rank: idx + 1 }))
            .slice(0, 30); // Top 30

        // 5. 응답 데이터 구성
        const stats = {
            bjId,
            name: targetBjName,
            profileImage: `https://stimg.sooplive.co.kr/LOGO/${bjId.slice(0, 2)}/${bjId}/m/${bjId}.webp`,
            subscribers: crawledStats?.broadcast_time || '-',
            fans: '-',
            totalViewers: crawledStats?.max_viewers || '-',
            lastUpdated: new Date().toISOString(),
            // 집계된 통계
            dailyStar: '0',
            monthlyStar: totalStar.toLocaleString(), // DB 집계값 사용 (Bcraping엔 월별 별풍선 데이터 없음)
            totalStar: totalStar.toLocaleString(),   // DB 집계값 사용
            fanCount: crawledStar !== '0' ? crawledStar : supporterMap.size.toLocaleString(), // 크롤링 된 팬클럽 수 우선, 없으면 참여자 수
            rankingList
        };

        return NextResponse.json(stats);

    } catch (e: any) {
        console.error('Stats API Error:', e);
        console.error('Stack:', e.stack);
        // 에러 시 기본값 반환 + 에러 메시지
        return NextResponse.json({
            bjId,
            name: bjId,
            error: 'Failed to fetch stats',
            details: e.message
        });
    }
}
