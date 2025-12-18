import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DonationData, BjStats, UserStats, RealtimeStats, BjKeywordMapping } from '@/types/festival';

const dataFilePath = path.join(process.cwd(), 'data', 'keywords.json');
const manualMappingsPath = path.join(process.cwd(), 'data', 'manual_mappings.json');

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

const getManualMappings = (): Record<string, string> => {
    if (!fs.existsSync(manualMappingsPath)) return {};
    try {
        const fileContent = fs.readFileSync(manualMappingsPath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (e) {
        console.error('Failed to parse manual_mappings.json:', e);
        return {};
    }
};

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const donations: DonationData[] = Array.isArray(body) ? body : (body.donations || []);

        if (!Array.isArray(donations)) {
            throw new Error('Invalid data format');
        }

        const keywordMappings = getKeywordMappings();
        const manualMappings = getManualMappings();
        const bjStatsMap = new Map<string, BjStats>();
        const userStatsMap = new Map<string, UserStats>();

        // keywords.json의 스트리머로 초기화
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

        // 미분류 항목 추가
        bjStatsMap.set('미분류', {
            bjName: '미분류',
            totalBalloons: 0,
            donationCount: 0,
            topDonor: '-',
            topDonorAmount: 0,
            lastUpdate: new Date(0).toISOString()
        });

        donations.forEach(donation => {
            let bjName = '미분류';
            let matched = false;

            // 스트리머 이름 정규화 함수
            const normalizeBjName = (name: string): string => {
                if (!name || name === '미분류') return '미분류';

                // 1. keywords.json의 bjName과 정확히 일치하는지 확인 (최우선)
                const exactMatch = keywordMappings.find(m => m.bjName === name);
                if (exactMatch) {
                    return exactMatch.bjName;
                }

                // 2. 특수문자, 숫자, 공백 제거하여 순수 한글만 추출 (기존 로직 유지 - 보조 수단)
                const cleanName = name.replace(/[^가-힣]/g, '');

                // keywords.json에서 매칭되는 스트리머 찾기
                for (const mapping of keywordMappings) {
                    const allKeywords = [mapping.bjName, ...mapping.keywords];
                    // 키워드가 cleanName에 포함되어 있는지 확인
                    if (allKeywords.some(keyword => keyword && cleanName.includes(keyword))) {
                        return mapping.bjName;
                    }
                }

                // 매칭 안 되면 원본 반환
                return name;
            };

            // 1. targetBjName 확인 (최우선 - crawl_data.json에 저장된 값)
            if (donation.targetBjName && donation.targetBjName !== '미분류' && donation.targetBjName.trim() !== '') {
                bjName = normalizeBjName(donation.targetBjName);
                matched = true;
            }

            // 2. 키워드 매핑 - message 확인
            if (!matched) {
                const searchText = donation.message || '';

                for (const mapping of keywordMappings) {
                    const allKeywords = [mapping.bjName, ...mapping.keywords];
                    if (allKeywords.some(keyword => keyword && searchText.includes(keyword))) {
                        bjName = mapping.bjName;
                        matched = true;
                        break;
                    }
                }
            }

            let effectiveCount = donation.ballonCount;

            const checkText = (text: string | undefined) => {
                if (!text) return false;
                const hangulTokens = text.replace(/[^가-힣]+/g, ' ').trim().split(/\s+/);
                return hangulTokens.includes('마');
            };

            if (checkText(donation.message) || checkText(donation.targetBjName)) {
                effectiveCount = -Math.abs(donation.ballonCount);
            }

            // 모든 BJ (미분류 포함) 집계
            if (!bjStatsMap.has(bjName)) {
                bjStatsMap.set(bjName, {
                    bjName: bjName,
                    totalBalloons: 0,
                    donationCount: 0,
                    topDonor: '-',
                    topDonorAmount: 0,
                    lastUpdate: new Date(0).toISOString()
                });
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

        const bjStatsArray = Array.from(bjStatsMap.values())
            .sort((a, b) => b.totalBalloons - a.totalBalloons);

        const userStatsArray = Array.from(userStatsMap.values())
            .sort((a, b) => b.totalBalloons - a.totalBalloons);

        // BJ별 합계를 더해서 총합 계산 (이미 차감 로직이 적용됨)
        const totalBalloons = bjStatsArray.reduce((sum, bj) => sum + bj.totalBalloons, 0);

        const realtimeStats: RealtimeStats = {
            totalBalloons: totalBalloons,
            totalDonations: donations.length,
            uniqueDonors: userStatsMap.size,
            uniqueBjs: bjStatsArray.length,
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
                'Cache-Control': 'no-store, no-cache, must-revalidate',
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
