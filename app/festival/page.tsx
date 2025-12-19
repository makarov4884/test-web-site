'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DonationData, RealtimeStats, BjStats, UserStats } from '@/types/festival';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { IoClose, IoDownload } from 'react-icons/io5';

export default function FestivalPage() {
    const [donations, setDonations] = useState<DonationData[]>([]);
    const [realtimeStats, setRealtimeStats] = useState<RealtimeStats | null>(null);
    const [bjStats, setBjStats] = useState<BjStats[]>([]);
    const [userStats, setUserStats] = useState<UserStats[]>([]);
    const [loading, setLoading] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAll, setShowAll] = useState(false);
    const [videoUrl, setVideoUrl] = useState('https://play.sooplive.co.kr/pyh3646/289919534');

    // 모달 관련 상태
    const [selectedBj, setSelectedBj] = useState<BjStats | null>(null);
    const [bjDonations, setBjDonations] = useState<DonationData[]>([]);

    // 스트리머 클릭 핸들러
    const handleBjClick = (bj: BjStats) => {
        if (bj.bjName === '미분류') return;

        // 공백 제거 후 비교 (정확도 향상)
        const targetName = bj.bjName.trim();
        const filtered = donations.filter(d =>
            (d.targetBjName && d.targetBjName.trim() === targetName)
        );

        setBjDonations(filtered);
        setSelectedBj(bj);
        setAutoRefresh(false);
    };

    // 해당 BJ의 Top 후원자 계산 함수
    const getTopSupporters = (bjName: string) => {
        const supporterMap = new Map<string, number>();

        donations.forEach(d => {
            if (d.targetBjName && d.targetBjName.trim() === bjName.trim()) {
                const current = supporterMap.get(d.ballonUserName) || 0;
                supporterMap.set(d.ballonUserName, current + d.ballonCount);
            }
        });

        return Array.from(supporterMap.entries())
            .map(([userName, total]) => ({ userName, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5); // TOP 5만
    };

    // 엑셀 다운로드 핸들러
    const handleDownloadExcel = () => {
        if (!selectedBj || bjDonations.length === 0) return;

        const excelData = bjDonations.map(d => ({
            '날짜': d.createDate,
            '방송시간': d.relativeTime || '-',
            '후원자': d.ballonUserName,
            '별풍선': d.ballonCount,
            '메시지': d.message || ''
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        XLSX.utils.book_append_sheet(wb, ws, "후원내역");

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/octet-stream' });

        saveAs(data, `${selectedBj.bjName}_후원내역_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const closeDetailModal = () => {
        setSelectedBj(null);
        setBjDonations([]);
        setAutoRefresh(true); // 모달 닫을 때 자동 갱신 재개
    };

    const fetchData = async () => {
        try {
            setLoading(true);

            const timestamp = new Date().getTime();
            const crawlRes = await fetch(`/api/festival/crawl?t=${timestamp}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });
            const crawlData = await crawlRes.json();

            if (!crawlData.success) {
                throw new Error(crawlData.error || '데이터를 가져오는데 실패했습니다.');
            }

            const statsRes = await fetch(`/api/festival/stats?t=${timestamp}`, {
                method: 'POST',
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                },
                body: JSON.stringify(crawlData.data),
            });

            const statsData = await statsRes.json();

            if (!statsData.success) {
                throw new Error(statsData.error || '통계를 계산하는데 실패했습니다.');
            }

            const uniqueMap = new Map();
            crawlData.data.forEach((item: any) => {
                if (!uniqueMap.has(item.messageId)) {
                    uniqueMap.set(item.messageId, item);
                }
            });

            const uniqueData = Array.from(uniqueMap.values()).sort((a: any, b: any) => {
                const parseDate = (dateStr: string) => {
                    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
                        return new Date(dateStr).getTime();
                    }
                    const match = dateStr.match(/(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
                    if (match) {
                        const [_, month, day, hour, min, sec] = match;
                        const year = new Date().getFullYear();
                        return new Date(`${year}-${month}-${day} ${hour}:${min}:${sec}`).getTime();
                    }
                    return 0;
                };

                const timeA = parseDate(a.createDate);
                const timeB = parseDate(b.createDate);
                return timeB - timeA;
            });

            setDonations(uniqueData as DonationData[]);
            setRealtimeStats(statsData.realtimeStats);
            setBjStats(statsData.bjStats);
            setUserStats(statsData.userStats);

        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);



    const safeParseDate = (dateStr: string) => {
        if (!dateStr) return new Date();
        let safeStr = dateStr.replace(' ', 'T');
        if (!/^\d{4}/.test(safeStr)) {
            safeStr = `${new Date().getFullYear()}-${safeStr}`;
        }
        const date = new Date(safeStr);
        return isNaN(date.getTime()) ? new Date() : date;
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (autoRefresh) {
            interval = setInterval(fetchData, 1000);
        }
        return () => clearInterval(interval);
    }, [autoRefresh]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-pink-50 to-purple-50 flex flex-col font-sans selection:bg-pink-300/30">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8">
                {/* Title Section */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 tracking-tight mb-2">
                        Team Jinu Festival
                    </h1>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-end gap-4 mb-6">
                    <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-pink-200/40 shadow-sm">
                        <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                        <span className="text-xs font-medium text-gray-700">LIVE</span>
                    </div>
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${autoRefresh
                            ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                            : 'bg-white/60 text-gray-600 border border-gray-300'
                            }`}
                    >
                        {autoRefresh ? '자동 갱신 ON' : '자동 갱신 OFF'}
                    </button>
                </div>

                {/* Top Section: Video & Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

                    {/* Video Player */}
                    <div className="lg:col-span-2">
                        <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-pink-200/40 relative group">
                            <iframe
                                src={videoUrl}
                                className="w-full h-full"
                                allowFullScreen
                            />
                            <div className="absolute top-4 left-4 bg-red-600/90 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-2 shadow-lg">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                LIVE MONITORING
                            </div>
                            <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <input
                                    type="text"
                                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs text-white placeholder-white/60 focus:outline-none focus:border-pink-400"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    placeholder="영상 임베드 주소 입력..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="space-y-4">
                        {/* Total Counter */}
                        <div className="bg-gradient-to-br from-white/90 to-pink-50/80 backdrop-blur-xl p-6 rounded-3xl border border-pink-200/40 shadow-xl relative overflow-hidden h-[180px] flex flex-col justify-center">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <svg className="w-24 h-24 text-pink-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>
                            </div>
                            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Total Revenue</h3>
                            <p className="text-4xl font-black text-gray-800 truncate">
                                {realtimeStats?.totalBalloons.toLocaleString()}
                                <span className="text-xl text-pink-600 ml-1">개</span>
                            </p>
                            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                실시간 집계중
                            </div>
                        </div>

                        {/* Top BJ Badge */}
                        {bjStats.length > 0 ? (
                            <div className="bg-gradient-to-br from-pink-100/80 to-purple-100/80 backdrop-blur-xl p-6 rounded-3xl border border-pink-300/60 shadow-xl relative h-[180px] flex flex-col justify-center">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-pink-700 text-xs font-bold uppercase tracking-widest mb-2">Current No.1</h3>
                                        <p className="text-3xl font-black text-gray-800 truncate w-40">{bjStats[0].bjName}</p>
                                        <p className="text-xl font-bold text-pink-600 mt-1">{bjStats[0].totalBalloons.toLocaleString()} 개</p>
                                    </div>
                                    <div className="text-6xl animate-bounce">👑</div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-gray-200 h-[180px] flex items-center justify-center text-gray-500">
                                데이터 수집중...
                            </div>
                        )}
                    </div>
                </div>

                {/* Middle: Rankings & Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

                    {/* Streamer Ranking */}
                    <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-pink-200/40 shadow-xl overflow-hidden h-[600px] flex flex-col">
                        <div className="p-6 border-b border-pink-100 flex justify-between items-center shrink-0 bg-gradient-to-r from-pink-50/50 to-purple-50/50">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                🏆 스트리머 순위
                            </h2>
                            <span className="text-xs text-gray-500">실시간 반영</span>
                        </div>
                        <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-pink-300">
                            <table className="w-full text-sm">
                                <thead className="bg-pink-50/50 text-gray-600 uppercase text-xs sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4 text-left">Rank</th>
                                        <th className="px-6 py-4 text-left">Streamer</th>
                                        <th className="px-6 py-4 text-right">Progress</th>
                                        <th className="px-6 py-4 text-right">Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-pink-100">
                                    {bjStats.map((bj, idx) => (
                                        <tr
                                            key={bj.bjName}
                                            className="hover:bg-pink-50/30 transition-colors group"
                                        >
                                            <td className="px-6 py-4 font-bold text-gray-500 w-16">
                                                {idx + 1}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-800">
                                                <div
                                                    className={`flex items-center gap-2 ${bj.bjName !== '미분류' ? 'cursor-pointer hover:text-pink-600 transition-colors' : ''}`}
                                                    onClick={() => handleBjClick(bj)}
                                                >
                                                    {bj.bjName}
                                                    {bj.bjName === '미분류' && (
                                                        <a
                                                            href="/festival/unclassified"
                                                            className="ml-2 text-xs text-pink-600 hover:text-pink-700 underline"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            (분류하기 →)
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 w-48">
                                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${idx === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-700' : 'bg-pink-500'}`}
                                                        style={{ width: `${(bj.totalBalloons / (bjStats[0].totalBalloons || 1)) * 100}%` }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-800 group-hover:text-pink-600 transition-colors">
                                                {bj.totalBalloons.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Recent Logs */}
                    <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-pink-200/40 shadow-xl overflow-hidden flex flex-col h-[600px]">
                        <div className="p-6 border-b border-pink-100 flex justify-between items-center bg-gradient-to-r from-pink-50/50 to-purple-50/50 sticky top-0 z-10 shrink-0">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                ⚡ 실시간 후원 로그
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-1"></span>
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowAll(!showAll)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${showAll
                                        ? 'bg-pink-500 text-white border-pink-500'
                                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                >
                                    {showAll ? '접기' : '전체보기'}
                                </button>
                                <input
                                    type="text"
                                    placeholder="검색..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-pink-300 focus:outline-none w-32"
                                />
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1 p-4 space-y-2 relative scrollbar-thin scrollbar-thumb-pink-300">
                            {donations
                                .filter(d =>
                                    (d.ballonUserName && d.ballonUserName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                    (d.targetBjName && d.targetBjName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                    (d.message && d.message.toLowerCase().includes(searchTerm.toLowerCase()))
                                )
                                .slice(0, showAll ? undefined : 100)
                                .map((donation, idx) => (
                                    <div key={`${donation.messageId}-${idx}`} className="px-3 py-2 hover:bg-pink-50/50 transition-colors border-b border-pink-100/30 last:border-0">
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="text-gray-500 font-mono text-xs min-w-[130px]">
                                                {donation.createDate}
                                            </span>
                                            <span className="text-gray-400">/</span>
                                            <span className="text-blue-600 font-mono text-xs min-w-[60px]">
                                                {donation.relativeTime || '-'}
                                            </span>
                                            <span className="text-gray-400">/</span>
                                            <span className="font-bold text-gray-800 min-w-[100px] truncate">
                                                {donation.ballonUserName}
                                            </span>
                                            <span className="text-gray-400">/</span>
                                            <span className="text-yellow-600 font-black min-w-[60px]">
                                                {donation.ballonCount.toLocaleString()}개
                                            </span>
                                            <span className="text-gray-400">/</span>
                                            <span className="text-gray-600 flex-1 truncate">
                                                {donation.message || '-'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>

                {/* User Ranking Section */}
                <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-pink-200/40 shadow-xl overflow-hidden">
                    <div className="p-6 border-b border-pink-100 bg-gradient-to-r from-pink-50/50 to-purple-50/50">
                        <h2 className="text-xl font-bold text-gray-800">💰 큰손 랭킹 (Top 10)</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-6">
                        {userStats.slice(0, 10).map((user, idx) => (
                            <div key={user.userName} className="bg-gradient-to-br from-pink-50/50 to-purple-50/50 p-4 rounded-2xl border border-pink-200/40 flex flex-col items-center text-center hover:border-pink-300/60 transition-all hover:scale-105">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-2 ${idx === 0 ? 'bg-yellow-500 text-white' : idx === 1 ? 'bg-gray-400 text-white' : idx === 2 ? 'bg-orange-700 text-white' : 'bg-pink-500 text-white'}`}>
                                    {idx + 1}
                                </div>
                                <p className="font-bold text-gray-700 truncate w-full mb-1">{user.userName}</p>
                                <p className="text-pink-600 font-bold">{user.totalBalloons.toLocaleString()}</p>
                            </div>
                        ))}
                        {userStats.length === 0 && (
                            <div className="col-span-5 text-center text-gray-500 py-8">
                                데이터 집계중입니다...
                            </div>
                        )}
                    </div>
                </div>

            </main>

            {/* 상세 내역 모달 */}
            {selectedBj && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
                        {/* 모달 헤더 */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-pink-50 to-purple-50 rounded-t-3xl shrink-0">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                    <span className="text-pink-600">{selectedBj.bjName}</span>
                                    <span>상세 리포트</span>
                                </h2>
                                <p className="text-gray-500 text-sm mt-1">
                                    총 <span className="font-bold text-gray-800">{selectedBj.totalBalloons.toLocaleString()}</span>개
                                    (<span className="font-bold text-gray-800">{selectedBj.donationCount.toLocaleString()}</span>건)
                                </p>
                            </div>
                            <button
                                onClick={closeDetailModal}
                                className="p-2 hover:bg-white rounded-full transition-colors text-gray-500 hover:text-gray-800"
                            >
                                <IoClose size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 space-y-6">

                            {/* 1. 이 방의 큰손들 (Top Supporters) */}
                            <div className="bg-white rounded-2xl shadow-sm border border-pink-100 overflow-hidden">
                                <div className="px-5 py-3 border-b border-gray-100 bg-pink-50/30">
                                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                                        👑 이 방의 회장님 (Top 5)
                                    </h3>
                                </div>
                                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                    {getTopSupporters(selectedBj.bjName).map((supporter, idx) => (
                                        <div key={idx} className={`flex flex-col items-center p-3 rounded-xl border ${idx === 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100'}`}>
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${idx === 0 ? 'bg-yellow-500 text-white' : 'bg-gray-400 text-white'}`}>
                                                {idx + 1}
                                            </div>
                                            <span className="font-bold text-gray-800 text-sm truncate w-full text-center">
                                                {supporter.userName}
                                            </span>
                                            <span className="text-pink-600 text-xs font-bold">
                                                {supporter.total.toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                    {getTopSupporters(selectedBj.bjName).length === 0 && (
                                        <div className="col-span-full text-center text-gray-400 text-sm">데이터 없음</div>
                                    )}
                                </div>
                            </div>

                            {/* 2. 전체 후원 목록 */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                                    <h3 className="font-bold text-gray-700">📜 전체 후원 기록</h3>
                                </div>
                                {bjDonations.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-white text-gray-500 border-b border-gray-100">
                                                <tr>
                                                    <th className="px-4 py-3 text-left w-24">날짜</th>
                                                    <th className="px-4 py-3 text-left w-20">시간</th>
                                                    <th className="px-4 py-3 text-left">후원자</th>
                                                    <th className="px-4 py-3 text-right w-24">개수</th>
                                                    <th className="px-4 py-3 text-left">메시지</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {bjDonations.map((d, idx) => (
                                                    <tr key={idx} className="hover:bg-pink-50/20 transition-colors">
                                                        <td className="px-4 py-2 text-gray-400 text-xs">{d.createDate.split(' ')[0].slice(5)}</td>
                                                        <td className="px-4 py-2 text-blue-500 text-xs font-mono">{d.relativeTime || '-'}</td>
                                                        <td className="px-4 py-2 font-medium text-gray-700">{d.ballonUserName}</td>
                                                        <td className="px-4 py-2 text-right font-bold text-pink-500">{d.ballonCount.toLocaleString()}</td>
                                                        <td className="px-4 py-2 text-gray-500 text-xs max-w-xs truncate">{d.message || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-gray-400">
                                        후원 내역이 없습니다.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 모달 푸터 */}
                        <div className="p-5 border-t border-gray-100 bg-white rounded-b-3xl flex justify-end gap-3 shrink-0">
                            <button
                                onClick={closeDetailModal}
                                className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-bold text-sm"
                            >
                                닫기
                            </button>
                            <button
                                onClick={handleDownloadExcel}
                                className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors font-bold flex items-center gap-2 shadow-lg shadow-green-100 text-sm"
                            >
                                <IoDownload />
                                엑셀 저장
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}
