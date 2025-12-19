'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DonationData, RealtimeStats, BjStats, UserStats } from '@/types';

export default function Home() {
  const [donations, setDonations] = useState<DonationData[]>([]);
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStats | null>(null);
  const [bjStats, setBjStats] = useState<BjStats[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [videoUrl, setVideoUrl] = useState('https://play.sooplive.co.kr/pyh3646/289919534');

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. 크롤링 API 호출 (캐시 방지)
      const timestamp = new Date().getTime();
      const crawlRes = await fetch(`/api/crawl?t=${timestamp}`, {
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

      // 2. 통계 API 호출 (캐시 방지)
      const statsRes = await fetch(`/api/stats?t=${timestamp}`, {
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

      // 3. 중복 제거 (messageId 기준)
      const uniqueMap = new Map();
      crawlData.data.forEach((item: any) => {
        if (!uniqueMap.has(item.messageId)) {
          uniqueMap.set(item.messageId, item);
        }
      });

      // 4. 시간 내림차순 정렬 (YYYY-MM-DD 지원)
      const uniqueData = Array.from(uniqueMap.values()).sort((a: any, b: any) => {
        const parseDate = (dateStr: string) => {
          // YYYY-MM-DD HH:MM:SS
          if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
            return new Date(dateStr).getTime();
          }
          // MM-DD HH:MM:SS
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
        return timeB - timeA; // 내림차순
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

  // 안전한 날짜 파싱 헬퍼
  const safeParseDate = (dateStr: string) => {
    if (!dateStr) return new Date();

    // YYYY-MM-DD HH:MM:SS 포맷을 YYYY-MM-DDTHH:MM:SS로 변환 (브라우저 호환성)
    let safeStr = dateStr.replace(' ', 'T');

    // 연도가 없는 경우 (MM-DD HH:MM:SS)
    if (!/^\d{4}/.test(safeStr)) {
      safeStr = `${new Date().getFullYear()}-${safeStr}`;
    }

    const date = new Date(safeStr);
    return isNaN(date.getTime()) ? new Date() : date;
  };

  // 자동 새로고침 (1초)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchData, 1000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <div className="min-h-screen bg-[#0f1117] text-gray-100 font-sans selection:bg-indigo-500/30">

      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-[#0f1117]/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-black italic tracking-tighter">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">STAR</span>
            <span className="text-white ml-1">COIN</span>
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-1.5 rounded-full border border-gray-700">
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
              <span className="text-xs font-medium text-gray-300">LIVE</span>
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${autoRefresh
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/50'
                : 'bg-gray-800 text-gray-400 border border-gray-700'
                }`}
            >
              {autoRefresh ? '자동 갱신 ON' : '자동 갱신 OFF'}
            </button>
            <Link
              href="/admin"
              className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors border border-gray-700"
            >
              ⚙️ 관리자
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-20 max-w-7xl mx-auto px-4 space-y-8">

        {/* Top Section: Video & Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Video Player */}
          <div className="lg:col-span-2 space-y-4">
            <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800 relative group">
              <iframe
                src={videoUrl}
                className="w-full h-full"
                allowFullScreen
              />
              <div className="absolute top-4 left-4 bg-red-600/90 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-2 shadow-lg">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                LIVE MONITORING
              </div>
              {/* 주소 변경 오버레이 */}
              <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <input
                  type="text"
                  className="flex-1 bg-gray-900/80 border border-gray-700 rounded px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="영상 임베드 주소 입력..."
                />
              </div>
            </div>
          </div>

          {/* Right: Summary Cards */}
          <div className="space-y-4">
            {/* Total Counter */}
            <div className="bg-[#1a1d24] p-6 rounded-2xl border border-gray-800 shadow-xl relative overflow-hidden h-[180px] flex flex-col justify-center">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg className="w-24 h-24 text-indigo-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>
              </div>
              <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Total Revenue</h3>
              <p className="text-4xl font-black text-white truncate">
                {realtimeStats?.totalBalloons.toLocaleString()}
                <span className="text-xl text-indigo-400 ml-1">개</span>
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                실시간 집계중
              </div>
            </div>

            {/* Top BJ Badge */}
            {bjStats.length > 0 ? (
              <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 p-6 rounded-2xl border border-indigo-500/30 shadow-xl relative h-[180px] flex flex-col justify-center">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-2">Current No.1</h3>
                    <p className="text-3xl font-black text-white truncate w-40">{bjStats[0].bjName}</p>
                    <p className="text-xl font-bold text-indigo-200 mt-1">{bjStats[0].totalBalloons.toLocaleString()} 개</p>
                  </div>
                  <div className="text-6xl animate-bounce">👑</div>
                </div>
              </div>
            ) : (
              <div className="bg-[#1a1d24] p-6 rounded-2xl border border-gray-800 h-[180px] flex items-center justify-center text-gray-600">
                데이터 수집중...
              </div>
            )}
          </div>
        </div>

        {/* Middle: Rankings & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Streamer Ranking */}
          <div className="bg-[#1a1d24] rounded-2xl border border-gray-800 shadow-xl overflow-hidden h-[600px] flex flex-col">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                🏆 스트리머 순위
              </h2>
              <span className="text-xs text-gray-500">실시간 반영 (마이너스 포함)</span>
            </div>
            <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-[#15171e] text-gray-400 uppercase text-xs sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-left bg-[#15171e]">Rank</th>
                    <th className="px-6 py-4 text-left bg-[#15171e]">Streamer</th>
                    <th className="px-6 py-4 text-right bg-[#15171e]">Progress</th>
                    <th className="px-6 py-4 text-right bg-[#15171e]">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {bjStats.map((bj, idx) => (
                    <tr key={bj.bjName} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 font-bold text-gray-500 w-16">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-4 font-medium text-white">
                        {bj.bjName}
                      </td>
                      <td className="px-6 py-4 w-48">
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${idx === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-700' : 'bg-indigo-600'}`}
                            style={{ width: `${(bj.totalBalloons / (bjStats[0].totalBalloons || 1)) * 100}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-white group-hover:text-indigo-400 transition-colors">
                        {bj.totalBalloons.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Logs (Live Feed) */}
          <div className="bg-[#1a1d24] rounded-2xl border border-gray-800 shadow-xl overflow-hidden flex flex-col h-[600px]">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#1a1d24] sticky top-0 z-10 shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                ⚡ 실시간 후원 로그
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-1"></span>
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${showAll
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'}`}
                >
                  {showAll ? '접기' : '전체보기'}
                </button>
                <input
                  type="text"
                  placeholder="검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none w-32"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2 relative scrollbar-thin scrollbar-thumb-gray-700">
              {donations
                .filter(d =>
                  (d.ballonUserName && d.ballonUserName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                  (d.targetBjName && d.targetBjName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                  (d.message && d.message.toLowerCase().includes(searchTerm.toLowerCase()))
                )
                .slice(0, showAll ? undefined : 100)
                .map((donation, idx) => (
                  <div key={`${donation.messageId}-${idx}`} className="flex items-start gap-3 p-3 rounded-lg bg-[#15171e] border border-gray-800/50 hover:border-indigo-500/30 transition-all animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-gray-200">{donation.ballonUserName}</span>
                        <span className="text-xs text-gray-500">to</span>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded text-white ${donation.targetBjName ? 'bg-indigo-600' : 'bg-red-600'}`}>
                          {donation.targetBjName || '미분류'}
                        </span>
                        <span className="text-[10px] text-gray-600 ml-auto tabular-nums">
                          {formatDistanceToNow(safeParseDate(donation.createDate), { addSuffix: true, locale: ko })}
                        </span>
                      </div>
                      {donation.message && (
                        <p className="text-xs text-gray-400 truncate pl-1 border-l-2 border-gray-700">
                          {donation.message}
                        </p>
                      )}
                    </div>
                    <div className="text-right min-w-[60px]">
                      <span className={`text-sm font-black ${donation.ballonCount > 0 ? 'text-yellow-400 drop-shadow-sm' : 'text-blue-400'}`}>
                        {donation.ballonCount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

        </div>

        {/* User Ranking Section */}
        <div className="bg-[#1a1d24] rounded-2xl border border-gray-800 shadow-xl overflow-hidden mt-6">
          <div className="p-6 border-b border-gray-800">
            <h2 className="text-xl font-bold text-white">💰 큰손 랭킹 (Top 10)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-6">
            {userStats.slice(0, 10).map((user, idx) => (
              <div key={user.userName} className="bg-[#15171e] p-4 rounded-xl border border-gray-800 flex flex-col items-center text-center hover:border-indigo-500/50 transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-2 ${idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-gray-400 text-black' : idx === 2 ? 'bg-orange-700 text-white' : 'bg-gray-700 text-gray-300'}`}>
                  {idx + 1}
                </div>
                <p className="font-bold text-gray-200 truncate w-full mb-1">{user.userName}</p>
                <p className="text-indigo-400 font-bold">{user.totalBalloons.toLocaleString()}</p>
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
    </div>
  );
}
