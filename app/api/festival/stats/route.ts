import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { BjStats, UserStats, RealtimeStats, BjKeywordMapping, DonationData } from '@/types/festival';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
    try {
        // 클라이언트에서 보낸 데이터는 무시하고 DB에서 직접 조회 (신뢰성 확보)

        // 1. 키워드 가져오기
        const { data: keywordsData, error: keywordError } = await supabaseAdmin
            .from('keywords')
            .select('bj_name, keywords');

        if (keywordError) {
            console.error('Keyword Fetch Error:', keywordError);
            throw keywordError;
        }

        const bjKeywords: BjKeywordMapping[] = (keywordsData || []).map((item: any) => ({
            bjName: item.bj_name,
            keywords: item.keywords || []
        }));

        // 2. 전체 후원 내역 가져오기 (DB)
        const { data: dbDonations, error: dbError } = await supabaseAdmin
            .from('donations')
            .select('*')
            .order('create_date', { ascending: false }); // 최신순

        if (dbError) {
            console.error('Donation Fetch Error:', dbError);
            throw dbError;
        }

        // DB 데이터를 내부 포맷(CamelCase)으로 변환
        const donations: DonationData[] = (dbDonations || []).map((item: any) => ({
            messageId: item.message_id,
            createDate: item.create_date,
            relativeTime: item.relative_time,
            ballonUserName: item.ballon_user_name,
            ballonCount: item.ballon_count,
            targetBjName: item.target_bj_name,
            message: item.message,
            isCancel: item.is_cancel
        }));

        // 3. 통계 계산 로직 (기존과 동일)
        const bjStats = new Map<string, BjStats>();
        const userStats = new Map<string, UserStats>();
        let totalCount = 0;
        let totalBalloons = 0;

        // BJ 목록 초기화
        bjKeywords.forEach(bj => {
            bjStats.set(bj.bjName, {
                bjName: bj.bjName,
                totalBalloons: 0,
                donationCount: 0,
                percent: 0
            });
        });

        // 미분류 초기화
        bjStats.set('미분류', {
            bjName: '미분류',
            totalBalloons: 0,
            donationCount: 0,
            percent: 0
        });

        // 집계 시작
        donations.forEach(donation => {
            if (donation.isCancel) return; // 취소된 건 제외

            const count = parseInt(String(donation.ballonCount));
            totalCount++;
            totalBalloons += count;

            // BJ 집계
            let targetBj = donation.targetBjName;

            // 이름 보정 로직
            if (!targetBj) {
                targetBj = '미분류';
            } else {
                // DB에서 가져온 이름이 현재 키워드 목록에 있는지 확인
                const isValidBj = bjKeywords.some(k => k.bjName === targetBj);
                if (!isValidBj) {
                    // 키워드 목록엔 없지만 혹시 '미분류'가 아니라면 -> 그냥 그 이름대로 집계 (동적 추가)
                    // 하지만 깔끔한 통계를 위해 목록에 없으면 '미분류'로 취급할 수도 있음
                    // 여기서는 데이터 유연성을 위해 그대로 두되, 초기화되지 않은 BJ면 초기화
                    if (!bjStats.has(targetBj)) {
                        bjStats.set(targetBj, {
                            bjName: targetBj,
                            totalBalloons: 0,
                            donationCount: 0,
                            percent: 0
                        });
                    }
                }
            }

            const stat = bjStats.get(targetBj)!;
            stat.totalBalloons += count;
            stat.donationCount++;

            // 유저 집계
            const userName = donation.ballonUserName;
            if (!userStats.has(userName)) {
                userStats.set(userName, {
                    userName,
                    totalBalloons: 0,
                    donationCount: 0,
                    rank: 0
                });
            }
            const userStat = userStats.get(userName)!;
            userStat.totalBalloons += count;
            userStat.donationCount++;
        });

        // 정렬 및 점유율 계산
        const sortedBjStats = Array.from(bjStats.values())
            .sort((a, b) => b.totalBalloons - a.totalBalloons);

        // 전체 풍선 0일 때 NaN 방지
        const safeTotalBalloons = totalBalloons || 1;

        sortedBjStats.forEach(stat => {
            stat.percent = parseFloat(((stat.totalBalloons / safeTotalBalloons) * 100).toFixed(1));
        });

        const sortedUserStats = Array.from(userStats.values())
            .sort((a, b) => b.totalBalloons - a.totalBalloons)
            .slice(0, 30) // TOP 30
            .map((stat, index) => ({
                ...stat,
                rank: index + 1
            }));

        const responseData: RealtimeStats = {
            bjStats: sortedBjStats,
            userStats: sortedUserStats,
            totalStats: {
                totalCount,
                totalBalloons,
                unclassifiedCount: bjStats.get('미분류')?.donationCount || 0,
                unclassifiedBalloons: bjStats.get('미분류')?.totalBalloons || 0
            },
            recentDonations: donations.slice(0, 50)
        };

        return NextResponse.json(responseData);

    } catch (error) {
        console.error('Stats Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
