import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DonationData, BjStats, UserStats, RealtimeStats, BjKeywordMapping } from '@/types';

// 키워드 데이터 파일 경로
const dataFilePath = path.join(process.cwd(), 'data', 'keywords.json');

// 키워드 매핑 데이터 읽기
const getKeywordMappings = (): BjKeywordMapping[] => {
    if (!fs.existsSync(dataFilePath)) return [];
    try {
        const fileContent = fs.readFileSync(dataFilePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (e) {
        console.error('Failed to parse keywords.json:', e);
        return [];
    }
};

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const donations: DonationData[] = Array.isArray(body) ? body : (body.donations || []);

        if (!Array.isArray(donations)) {
            throw new Error('Invalid data format: donations must be an array');
        }

        const keywordMappings = getKeywordMappings();
        const bjStatsMap = new Map<string, BjStats>();
        const userStatsMap = new Map<string, UserStats>();

        // BJ 초기화
        keywordMappings.forEach(mapping => {
            bjStatsMap.set(mapping.bjName, {
                bjName: mapping.bjName,
                totalBalloons: 0,
                donationCount: 0,
                topDonor: '-',
                topDonorAmount: 0,
                lastUpdate: new Date(0).toISOString()
            });
        });

        donations.forEach(donation => {
            // 1. BJ 식별
            let bjName = donation.targetBjName || donation.message || '미분류';
            let matched = false;

            // 2. 키워드 매칭
            if (donation.message) {
                for (const mapping of keywordMappings) {
                    // BJ 이름 자체도 키워드로 포함하여 검색
                    const allKeywords = [mapping.bjName, ...mapping.keywords];
                    if (allKeywords.some(keyword => keyword && donation.message?.includes(keyword))) {
                        bjName = mapping.bjName;
                        matched = true;
                        break;
                    }
                }
            }
            if (!matched && donation.targetBjName) {
                for (const mapping of keywordMappings) {
                    const allKeywords = [mapping.bjName, ...mapping.keywords];
                    if (allKeywords.some(keyword => keyword && donation.targetBjName?.includes(keyword))) {
                        bjName = mapping.bjName;
                        matched = true;
                        break;
                    }
                }
            }

            // 3. 차감 로직 ("마" 독립 단어 감지 v3)
            // 타겟 BJ 이름이나 메시지 어디든 "마"라는 한글 단어가 있으면 차감
            let effectiveCount = donation.ballonCount;

            const checkText = (text: string | undefined) => {
                if (!text) return false;
                const hangulTokens = text.replace(/[^가-힣]+/g, ' ').trim().split(/\s+/);
                return hangulTokens.includes('마');
            };

            // 메시지 또는 타겟명에서 "마" 발견 시
            if (checkText(donation.message) || checkText(donation.targetBjName)) {
                effectiveCount = -Math.abs(donation.ballonCount);
            }

            // --- BJ 집계 (등록된 BJ만) ---
            // 등록되지 않은 BJ는 집계하지 않음
            // --- BJ 집계 (등록된 BJ만) ---
            // 등록되지 않은 BJ는 집계하지 않음
            if (!bjStatsMap.has(bjName)) {
                return;
            }

            const bjStats = bjStatsMap.get(bjName)!;
            bjStats.totalBalloons += effectiveCount;
            bjStats.donationCount += 1;

            if (effectiveCount > 0 && effectiveCount > bjStats.topDonorAmount) {
                bjStats.topDonor = donation.ballonUserName;
                bjStats.topDonorAmount = effectiveCount;
            }

            if (donation.createDate > bjStats.lastUpdate) {
                bjStats.lastUpdate = donation.createDate;
            }

            // --- 사용자 집계 ---
            if (!userStatsMap.has(donation.ballonUserName)) {
                userStatsMap.set(donation.ballonUserName, {
                    userName: donation.ballonUserName,
                    totalBalloons: 0,
                    donationCount: 0,
                    targetBjs: []
                });
            }

            const userStats = userStatsMap.get(donation.ballonUserName)!;
            userStats.totalBalloons += effectiveCount;
            userStats.donationCount += 1;

            if (bjName && !userStats.targetBjs.includes(bjName)) {
                userStats.targetBjs.push(bjName);
            }
        });

        // 필터링 제거 (모든 BJ 표시)
        const bjStatsArray = Array.from(bjStatsMap.values())
            .sort((a, b) => b.totalBalloons - a.totalBalloons);

        const userStatsArray = Array.from(userStatsMap.values())
            .sort((a, b) => b.totalBalloons - a.totalBalloons);

        // 전체 통계 (BJ별 합계와 일치시킴: 차감 반영)
        const totalBalloons = bjStatsArray.reduce((sum, bj) => sum + bj.totalBalloons, 0);

        const realtimeStats: RealtimeStats = {
            totalBalloons: totalBalloons,
            totalDonations: donations.length,
            uniqueDonors: userStatsMap.size,
            uniqueBjs: bjStatsArray.length, // 등록된 BJ만 카운트
            lastUpdate: new Date().toISOString()
        };

        return NextResponse.json({
            success: true,
            bjStats: bjStatsArray,
            userStats: userStatsArray,
            realtimeStats,
            timestamp: new Date().toISOString()
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

    } catch (error) {
        console.error('Stats calculation error:', error);
        return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
