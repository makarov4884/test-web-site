'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
    FaUser, FaClock, FaHeart, FaStar, FaArrowLeft,
    FaChevronLeft, FaChevronRight
} from 'react-icons/fa';
import { TbMoneybag, TbBroadcast } from 'react-icons/tb';

interface StreamerStats {
    bjId: string;
    name: string;
    profileImage: string;
    subscribers: string;
    fans: string;
    totalViewers: string;
    lastUpdated: string;
    dailyStar?: string;
    monthlyStar?: string;
    broadcastTime?: string;
    maxViewers?: string;
    // Bcraping data
    avgViewers?: string;
    chatParticipation?: string;
    totalStar?: string;
    totalBroadcast?: string;
    fanCount?: string;
    totalViewCnt?: string;
    rankingList?: any[];
    chartData?: any[];
    detailRanking?: any[];
}

export default function StreamerAnalysisPage() {
    const params = useParams();
    const router = useRouter();
    const bjId = params.bjId as string;
    const [stats, setStats] = useState<StreamerStats | null>(null);
    const [activeTab, setActiveTab] = useState('모아보기');
    const [isLoadingLive, setIsLoadingLive] = useState(false);

    const hasFetchedRef = useRef(false);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(`/api/stats/${bjId}`);
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (error) {
                console.error("Failed to fetch stats:", error);
            }
        };

        const fetchLiveData = async () => {
            setIsLoadingLive(true);
            try {
                const res = await fetch(`/api/bcraping-proxy/${bjId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setStats(prev => {
                            // 빈 값이거나 "0"인 값은 기존 데이터를 유지
                            const mergeValue = (newVal: any, oldVal: any) => {
                                if (!newVal || newVal === '0' || newVal === '0시간' || newVal === '0명' || newVal === '0개' || newVal === '0.0%') {
                                    return oldVal;
                                }
                                return newVal;
                            };

                            return {
                                ...prev,
                                rankingList: data.rankingList || prev?.rankingList || [],
                                detailRanking: data.detailRanking || prev?.detailRanking || [],
                                chartData: data.chartData || prev?.chartData || [],
                                bjId,
                                name: prev?.name || bjId,
                                profileImage: prev?.profileImage || `https://stimg.sooplive.co.kr/LOGO/${bjId.slice(0, 2)}/${bjId}/m/${bjId}.webp`,
                                lastUpdated: data.timestamp || prev?.lastUpdated,
                                subscribers: prev?.subscribers || '-',
                                fans: prev?.fans || '-',
                                totalViewers: prev?.totalViewers || '-',
                                // 기존 데이터를 유지하면서 새 데이터가 있으면 병합
                                broadcastTime: mergeValue(data.stats?.broadcastTime, prev?.broadcastTime),
                                avgViewers: mergeValue(data.stats?.avgViewers, prev?.avgViewers),
                                maxViewers: mergeValue(data.stats?.maxViewers, prev?.maxViewers),
                                chatParticipation: mergeValue(data.stats?.chatParticipation, prev?.chatParticipation),
                                totalStar: mergeValue(data.stats?.totalStar, prev?.totalStar),
                                totalBroadcast: mergeValue(data.stats?.totalBroadcast, prev?.totalBroadcast),
                                fanCount: mergeValue(data.stats?.fanCount, prev?.fanCount),
                                totalViewCnt: mergeValue(data.stats?.totalViewCnt, prev?.totalViewCnt),
                            };
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to fetch live data:", error);
            } finally {
                setIsLoadingLive(false);
            }
        };

        if (!hasFetchedRef.current) {
            hasFetchedRef.current = true;
            fetchStats();
            fetchLiveData();
        }
    }, [bjId]);

    const displayName = stats?.name || bjId;
    const profileImage = stats?.profileImage;

    // Use real Bcraping ranking data or empty array
    const rankingData = stats?.rankingList || [];
    const detailRankingData = stats?.detailRanking || [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-pink-50 to-purple-50 pb-20 font-sans">
            {/* Navigation Bar */}
            <div className="flex items-center gap-4 p-4 border-b border-pink-200/30 bg-white/60">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-pink-100 rounded-full transition-colors"
                >
                    <FaArrowLeft className="text-gray-600" />
                </button>
                <div className="text-sm text-gray-600">
                    <span className="cursor-pointer hover:text-gray-800" onClick={() => router.push('/member')}>멤버 목록</span>
                    <span className="mx-2">/</span>
                    <span className="text-gray-800 font-bold">{displayName}</span>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 pt-8">
                {/* Profile Header */}
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full p-[2px] bg-gradient-to-r from-cyan-400 to-pink-400">
                            <img
                                src={profileImage || "https://res.sooplive.co.kr/images/svg/soop_logo.svg"}
                                alt="Profile"
                                className="w-full h-full rounded-full bg-white object-cover border-2 border-white"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://res.sooplive.co.kr/images/svg/soop_logo.svg";
                                }}
                            />
                        </div>
                        <span className="absolute bottom-0 right-0 bg-gray-200 text-[10px] text-gray-600 font-bold px-1.5 py-0.5 rounded border border-white">
                            OFF
                        </span>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-2xl font-bold flex items-center justify-center md:justify-start gap-2 mb-2 text-gray-800">
                            {displayName}
                            <span className="text-gray-500 text-lg font-normal">@{bjId}</span>
                        </h1>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 justify-center md:justify-start">
                            <div className="flex items-center gap-1">
                                <span className="w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center text-purple-600 text-xs">
                                    <TbMoneybag />
                                </span>
                                <span>누적 후원 {stats?.totalStar ? `${stats.totalStar}개` : '-'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-5 h-5 rounded-full bg-pink-200 flex items-center justify-center text-pink-600 text-xs">
                                    <FaUser />
                                </span>
                                <span>누적 시청자수 {stats?.totalViewCnt ? `${stats.totalViewCnt}명` : '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex justify-center md:justify-start gap-8 border-b border-pink-200 mb-8 overflow-x-auto">
                    {['모아보기'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab
                                ? 'text-pink-600 border-b-2 border-pink-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Date Selectors */}
                <div className="flex justify-center gap-4 mb-8">
                    <div className="flex items-center bg-white rounded-lg px-4 py-2 gap-4 border border-pink-200">
                        <button className="text-gray-500 hover:text-gray-800"><FaChevronLeft size={12} /></button>
                        <span className="font-bold text-gray-800">2025 년</span>
                        <button className="text-gray-500 hover:text-gray-800"><FaChevronRight size={12} /></button>
                    </div>
                    <div className="flex items-center bg-white rounded-lg px-4 py-2 gap-4 border border-pink-200">
                        <button className="text-gray-500 hover:text-gray-800"><FaChevronLeft size={12} /></button>
                        <span className="font-bold text-gray-800">12 월</span>
                        <button className="text-gray-500 hover:text-gray-800"><FaChevronRight size={12} /></button>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="min-h-[500px] animate-fade-in">
                    {isLoadingLive ? (
                        <div className="flex flex-col items-center justify-center h-[400px] gap-4">
                            <div className="relative w-12 h-12">
                                <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full"></div>
                                <div className="absolute top-0 left-0 w-full h-full border-4 border-pink-500 rounded-full animate-spin border-t-transparent"></div>
                            </div>
                            <p className="text-gray-600 font-medium animate-pulse">데이터 분석 중...</p>
                        </div>
                    ) : (
                        <>
                            {/* Common Stats Grid (Applied to all tabs for consistency with screenshot) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                <DarkStatsCard
                                    title="월별 방송 시간"
                                    value={stats?.broadcastTime ? `${stats.broadcastTime}시간` : "0시간"}
                                    icon={<FaClock />}
                                    iconColor="text-blue-400"
                                    iconBg="bg-blue-400/20"
                                />
                                <DarkStatsCard
                                    title="평균 시청자"
                                    value={stats?.avgViewers ? `${stats.avgViewers}명` : "0명"}
                                    icon={<FaUser />}
                                    iconColor="text-green-400"
                                    iconBg="bg-green-400/20"
                                />
                                <DarkStatsCard
                                    title="최고 시청자"
                                    value={stats?.maxViewers ? `${stats.maxViewers}명` : "0명"}
                                    icon={<TbBroadcast />}
                                    iconColor="text-yellow-400"
                                    iconBg="bg-yellow-400/20"
                                />
                                <DarkStatsCard
                                    title="채팅 참여율"
                                    value={stats?.chatParticipation ? `${stats.chatParticipation}%` : "0%"}
                                    icon={<FaHeart />}
                                    iconColor="text-purple-400"
                                    iconBg="bg-purple-400/20"
                                />
                            </div>

                            {/* Broadcast Summary Section (Purple Header) */}
                            <div className="rounded-2xl overflow-hidden bg-white border border-pink-200 mb-8 shadow-lg">
                                <div className="bg-gradient-to-r from-pink-400 to-purple-400 px-6 py-4 flex items-center gap-2">
                                    <h3 className="font-bold text-white text-lg">방송 기록 요약</h3>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <SummaryItem
                                        label="누적 별풍선"
                                        value={stats?.totalStar ? `${stats.totalStar}개` : "0개"}
                                        icon={<TbMoneybag size={18} className="text-yellow-200" />}
                                        bg="bg-yellow-500/20 text-yellow-500"
                                    />
                                    <SummaryItem
                                        label="누적 방송 시간"
                                        value={stats?.totalBroadcast || "0시간"}
                                        icon={<FaClock size={16} className="text-blue-200" />}
                                        bg="bg-blue-500/20 text-blue-500"
                                    />
                                    <SummaryItem
                                        label="팬클럽 수"
                                        value={stats?.fanCount ? `${stats.fanCount}명` : "0명"}
                                        icon={<FaHeart size={16} className="text-purple-200" />}
                                        bg="bg-purple-500/20 text-purple-500"
                                    />
                                    <SummaryItem
                                        label="누적 시청자"
                                        value={stats?.totalViewCnt ? `${stats.totalViewCnt}명` : "0명"}
                                        icon={<FaUser size={16} className="text-green-200" />}
                                        bg="bg-green-500/20 text-green-500"
                                    />
                                </div>
                            </div>

                            {activeTab === '모아보기' && (
                                <div className="bg-white rounded-2xl border border-pink-200 overflow-hidden shadow-md">
                                    <div className="p-5 border-b border-pink-200 flex items-center justify-between">
                                        <h3 className="font-bold text-lg text-gray-800">이번달 랭킹 TOP 20</h3>
                                        <button className="flex items-center gap-1 bg-pink-100 text-pink-600 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-pink-200 transition-colors">
                                            <FaStar size={10} /> 별풍선 기준
                                        </button>
                                    </div>
                                    <RankingTable data={rankingData} limit={20} />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// Reusable Ranking Table Component for consistency
function RankingTable({ data, limit }: { data: any[], limit?: number }) {
    const displayData = limit ? data.slice(0, limit) : data;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-pink-50 text-gray-700 text-xs font-bold border-b border-pink-200">
                    <tr>
                        <th className="py-3 px-6 w-16 text-center">순위</th>
                        <th className="py-3 px-4">사용자</th>
                        <th className="py-3 px-4 text-center">후원횟수</th>
                        <th className="py-3 px-4 text-center text-cyan-600">별풍선</th>
                        <th className="py-3 px-6 text-right text-yellow-600">달 총 별풍선</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-pink-100 bg-white">
                    {displayData.map((rank, idx) => (
                        <tr key={idx} className="hover:bg-pink-50 transition-colors group">
                            <td className="py-4 px-6 text-center">
                                {rank.rank <= 3 ? (
                                    <div className="flex justify-center">
                                        <div className={`
                                            w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg
                                            ${rank.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : ''}
                                            ${rank.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500' : ''}
                                            ${rank.rank === 3 ? 'bg-gradient-to-br from-orange-600 to-amber-800' : ''}
                                        `}>
                                            {rank.rank}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold mx-auto">
                                        {rank.rank}
                                    </span>
                                )}
                            </td>
                            <td className="py-4 px-4 font-medium">
                                <a
                                    href={rank.userId && rank.userId !== 'test_user' ? `https://bj.afreecatv.com/${rank.userId}` : '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 text-gray-700 group-hover:text-gray-900 transition-colors"
                                >
                                    <img
                                        src={rank.userId && rank.userId !== 'test_user'
                                            ? `https://stimg.sooplive.co.kr/LOGO/${rank.userId.slice(0, 2)}/${rank.userId}/m/${rank.userId}.webp`
                                            : (rank.image || 'https://cdn.bcraping.kr/empty_profile.png')}
                                        alt={rank.username}
                                        className="w-9 h-9 rounded-full object-cover ring-2 ring-pink-200 group-hover:ring-pink-300 transition-all border border-pink-100"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            // SOOP 이미지가 실패하면 기본 이미지로 변경
                                            if (target.src.includes('stimg.sooplive.co.kr')) {
                                                // 숲 이미지가 안 나오면 Bcraping 이미지나 기본값 시도
                                                target.src = rank.image || 'https://res.sooplive.co.kr/images/svg/soop_logo.svg';
                                            } else {
                                                target.src = 'https://res.sooplive.co.kr/images/svg/soop_logo.svg';
                                            }
                                        }}
                                    />
                                    {rank.username}
                                </a>
                            </td>
                            <td className="py-4 px-4 text-center text-gray-700 font-bold">{rank.supportCnt || rank.count}</td>
                            <td className="py-4 px-4 text-center text-cyan-600 font-bold">{rank.score || rank.stars}</td>
                            <td className="py-4 px-6 text-right text-yellow-600 font-bold">{rank.totalScore || rank.monthlyTotal}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// Stats Card Component (Top Stats)
function DarkStatsCard({ title, value, change, subText, isPositive, icon, iconColor, iconBg, actionButton }: any) {
    return (
        <div className="bg-white p-5 rounded-2xl border border-pink-200 relative flex flex-col justify-between h-32 shadow-md">
            <div className="flex justify-between items-start">
                <div className={`w-8 h-8 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center`}>
                    {icon}
                </div>
                {change && (
                    <span className={`text-xs font-bold ${isPositive === true ? 'text-green-600' : isPositive === false ? 'text-red-500' : 'text-red-500'}`}>
                        {change}
                    </span>
                )}
            </div>
            <div>
                <div className="text-gray-600 text-xs mb-1">{title}</div>
                <div className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
                    {value}
                    {actionButton}
                </div>
                <div className="text-gray-500 text-[10px] mt-1">{subText}</div>
            </div>
        </div>
    );
}

// Summary Item Component (Purple Section Items)
function SummaryItem({ label, value, icon, bg }: any) {
    return (
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bg}`}>
                {icon}
            </div>
            <div>
                <div className="text-gray-600 text-xs font-bold mb-0.5">{label}</div>
                <div className="text-gray-800 font-bold text-lg">{value}</div>
            </div>
        </div>
    );
}
