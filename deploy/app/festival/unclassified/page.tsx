'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DonationData } from '@/types/festival';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function UnclassifiedPage() {
    const router = useRouter();
    const [unclassifiedDonations, setUnclassifiedDonations] = useState<DonationData[]>([]);
    const [streamers, setStreamers] = useState<{ id: string, name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [classifying, setClassifying] = useState<string | null>(null);

    const fetchData = async (isBackground = false) => {
        try {
            if (!isBackground) setLoading(true);

            // 전체 데이터 가져오기
            const timestamp = new Date().getTime();
            const crawlRes = await fetch(`/api/festival/crawl?t=${timestamp}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });
            const crawlData = await crawlRes.json();

            if (crawlData.success) {
                // 미분류만 필터링
                const unclassified = crawlData.data.filter((d: DonationData) =>
                    !d.targetBjName || d.targetBjName === '미분류'
                );
                setUnclassifiedDonations(unclassified);
            }

            // 스트리머 목록 가져오기
            const streamersRes = await fetch('/api/festival/streamers');
            const streamersData = await streamersRes.json();
            if (streamersData.success) {
                setStreamers(streamersData.streamers);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => fetchData(true), 3000);
        return () => clearInterval(interval);
    }, []);

    const handleClassify = async (messageId: string, streamerName: string) => {
        try {
            setClassifying(messageId);
            const res = await fetch('/api/festival/classify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId, streamerName })
            });

            if (res.ok) {
                // 데이터 새로고침
                await fetchData();
            }
        } catch (error) {
            console.error('Classification error:', error);
        } finally {
            setClassifying(null);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-pink-50 to-purple-50 flex flex-col font-sans selection:bg-pink-300/30">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8">
                {/* Title Section */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={() => router.push('/festival')}
                            className="px-4 py-2 bg-white/60 hover:bg-white/80 border border-gray-300 rounded-full text-sm font-bold transition-all shadow-sm"
                        >
                            ← 돌아가기
                        </button>
                        <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 tracking-tight">
                            미분류 후원 관리
                        </h1>
                    </div>
                    <p className="text-gray-600 font-medium">
                        총 {unclassifiedDonations.length}개의 미분류 후원이 있습니다.
                    </p>
                </div>

                {/* Content */}
                <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-pink-200/40 shadow-xl overflow-hidden">
                    <div className="p-6 border-b border-pink-100 bg-gradient-to-r from-pink-50/50 to-purple-50/50">
                        <h2 className="text-xl font-bold text-gray-800">🔍 분류 대기 목록</h2>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center text-gray-500">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
                            데이터를 불러오는 중...
                        </div>
                    ) : unclassifiedDonations.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <div className="text-6xl mb-4">✅</div>
                            <p className="text-lg font-medium">모든 후원이 분류되었습니다!</p>
                        </div>
                    ) : (
                        <div className="overflow-y-auto max-h-[calc(100vh-300px)] p-6">
                            <div className="space-y-4">
                                {unclassifiedDonations.map((donation) => (
                                    <div
                                        key={donation.messageId}
                                        className="border border-gray-200 rounded-xl p-4 hover:border-pink-300 transition-colors bg-white/50"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                {/* 후원 정보 */}
                                                <div className="flex items-center gap-3 mb-3">
                                                    <span className="text-gray-500 font-mono text-xs">
                                                        {donation.createDate}
                                                    </span>
                                                    <span className="text-gray-400">/</span>
                                                    <span className="font-bold text-gray-800">
                                                        {donation.ballonUserName}
                                                    </span>
                                                    <span className="text-gray-400">/</span>
                                                    <span className="text-yellow-600 font-black">
                                                        {donation.ballonCount.toLocaleString()}개
                                                    </span>
                                                </div>

                                                {/* 메시지 */}
                                                {donation.message && (
                                                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-200">
                                                        💬 {donation.message}
                                                    </p>
                                                )}
                                            </div>

                                            {/* 분류 선택 */}
                                            <div className="min-w-[200px]">
                                                <select
                                                    onChange={(e) => e.target.value && handleClassify(donation.messageId, e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-pink-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-black bg-white"
                                                    defaultValue=""
                                                    disabled={classifying === donation.messageId}
                                                >
                                                    <option value="" disabled className="text-black">
                                                        {classifying === donation.messageId ? '처리 중...' : '스트리머 선택'}
                                                    </option>
                                                    {streamers.map((streamer) => (
                                                        <option key={streamer.id} value={streamer.name} className="text-black bg-white hover:bg-gray-100">
                                                            {streamer.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
