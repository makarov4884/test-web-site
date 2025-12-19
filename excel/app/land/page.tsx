'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';
import { BjStats, DonationData } from '@/types';

// 커스텀 툴팁 컴포넌트
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-xl text-center">
                <p className="font-bold text-white mb-1">{data.name}</p>
                <p className="text-indigo-400 font-bold">{data.value.toLocaleString()} 개</p>
                <p className="text-xs text-gray-500 mt-1">점유율: {data.percent}%</p>
            </div>
        );
    }
    return null;
};

// 트리맵 셀 커스텀
const CustomizedContent = (props: any) => {
    const { root, depth, x, y, width, height, index, name, value, percent } = props;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={props.fill}
                stroke="#1a1d24"
                strokeWidth={2}
                className="transition-opacity duration-300 hover:opacity-80 cursor-pointer"
            />
            {width > 50 && height > 30 && (
                <text
                    x={x + width / 2}
                    y={y + height / 2}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={Math.min(width / 5, height / 3, 16)}
                    fontWeight="bold"
                    dominantBaseline="central"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                >
                    {name}
                </text>
            )}
            {width > 50 && height > 50 && (
                <text
                    x={x + width / 2}
                    y={y + height / 2 + 20}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.7)"
                    fontSize={12}
                    dominantBaseline="central"
                >
                    {value.toLocaleString()}
                </text>
            )}
        </g>
    );
};

export default function LandPage() {
    const [bjStats, setBjStats] = useState<BjStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [treeData, setTreeData] = useState<any[]>([]);

    const colors = [
        '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316',
        '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#64748b'
    ];

    const fetchData = async () => {
        try {
            setLoading(true);
            const timestamp = new Date().getTime();
            const crawlRes = await fetch(`/api/crawl?t=${timestamp}`);
            const crawlData = await crawlRes.json();

            const statsRes = await fetch(`/api/stats?t=${timestamp}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(crawlData.data),
            });
            const statsData = await statsRes.json();

            if (statsData.success) {
                setBjStats(statsData.bjStats);

                // 트리맵 데이터 변환
                const total = statsData.bjStats.reduce((acc: number, cur: BjStats) => acc + cur.totalBalloons, 0);
                const formattedData = statsData.bjStats
                    .filter((bj: BjStats) => bj.totalBalloons > 0)
                    .map((bj: BjStats, idx: number) => ({
                        name: bj.bjName,
                        value: bj.totalBalloons,
                        fill: colors[idx % colors.length],
                        percent: ((bj.totalBalloons / total) * 100).toFixed(1)
                    }));
                setTreeData(formattedData);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 3000); // 3초마다 갱신
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-[#0f1117] text-gray-100 font-sans">
            {/* Header */}
            <header className="fixed top-0 w-full z-50 bg-[#0f1117]/80 backdrop-blur-md border-b border-gray-800">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="text-2xl font-black italic tracking-tighter hover:opacity-80 transition-opacity">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">STAR</span>
                        <span className="text-white ml-1">COIN</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-gray-400">Land Map Analysis</span>
                        <Link
                            href="/"
                            className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors border border-gray-700"
                        >
                            ⬅️ 메인으로
                        </Link>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-20 max-w-7xl mx-auto px-4 space-y-8">

                {/* Top Section: Title & Summary */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black text-white">
                        <span className="mr-2">🗺️</span>
                        쿠니랜드 영토 점유 현황
                    </h1>
                    <p className="text-gray-400">
                        후원 기여도에 따른 실시간 영토 크기 (Total Volume Based)
                    </p>
                </div>

                {/* Treemap Visualization */}
                <div className="bg-[#1a1d24] rounded-2xl border border-gray-800 shadow-2xl p-6 h-[500px]">
                    {loading && treeData.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                            로딩중...
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <Treemap
                                data={treeData}
                                dataKey="value"
                                aspectRatio={4 / 3}
                                stroke="#1a1d24"
                                content={<CustomizedContent />}
                            >
                                <Tooltip content={<CustomTooltip />} />
                            </Treemap>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Detailed Data Table */}
                <div className="bg-[#1a1d24] rounded-2xl border border-gray-800 shadow-xl overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            📊 상세 데이터표
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[#15171e] text-gray-400 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4">Rank</th>
                                    <th className="px-6 py-4">Streamer (Owner)</th>
                                    <th className="px-6 py-4 text-right">Total Score</th>
                                    <th className="px-6 py-4 text-center">Share</th>
                                    <th className="px-6 py-4">Top Contributor</th>
                                    <th className="px-6 py-4 text-right">Top Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {bjStats.map((bj, idx) => (
                                    <tr key={bj.bjName} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-500 w-16">{idx + 1}</td>
                                        <td className="px-6 py-4 font-bold text-white">{bj.bjName}</td>
                                        <td className="px-6 py-4 text-right font-bold text-indigo-400">
                                            {bj.totalBalloons.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-center text-gray-400">
                                            {treeData.find(d => d.name === bj.bjName)?.percent}%
                                        </td>
                                        <td className="px-6 py-4 text-gray-300">{bj.topDonor}</td>
                                        <td className="px-6 py-4 text-right text-gray-400">
                                            {bj.topDonorAmount.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>
        </div>
    );
}
