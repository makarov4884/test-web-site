
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
        // (만약 bjId가 "tmxm" 같은 영어 아이디라면 매핑 테이블이 있어야 함)
        // 현재 마이그레이션된 keywords 테이블 구조: id, bj_name, keywords(배열)
        // 영문 ID가 keywords 배열에 포함되어 있다고 가정.

        let targetBjName = bjId; // 기본값
        const { data: matchBj } = await supabaseAdmin
            .from('keywords')
            .select('bj_name')
            .contains('keywords', [bjId]) // keywords 배열에 bjId가 포함된 행 찾기
            .limit(1)
            .maybeSingle();

        if (matchBj) targetBjName = matchBj.bj_name;

        // 3. 통계 집계
        // 해당 BJ의 모든 후원 내역 조회 (LIMIT 없이 가져와서 계산 - 데이터가 아주 많으면 RPC 권장)
        const { data: donations, error } = await supabaseAdmin
            .from('donations')
            .select('ballon_count, ballon_user_name')
            .eq('target_bj_name', targetBjName);

        if (error) throw error;

        let totalStar = 0;
        let totalCount = 0;
        const supporterMap = new Map<string, number>();

        (donations || []).forEach(d => {
            totalStar += d.ballon_count;
            totalCount++;

            const current = supporterMap.get(d.ballon_user_name) || 0;
            supporterMap.set(d.ballon_user_name, current + d.ballon_count);
        });

        // 4. 랭킹 생성
        const rankingList = Array.from(supporterMap.entries())
            .map(([username, count], idx) => ({
                rank: 0, // 나중에 채움
                username,
                userId: '', // 정보 없음
                score: count, // 별풍선 개수
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
            subscribers: '-', // 크롤링 없으므로 알 수 없음
            fans: '-',
            totalViewers: '-',
            lastUpdated: new Date().toISOString(),
            // 집계된 통계
            dailyStar: '0',
            monthlyStar: totalStar.toLocaleString(),
            totalStar: totalStar.toLocaleString(),
            fanCount: supporterMap.size.toLocaleString(),
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
