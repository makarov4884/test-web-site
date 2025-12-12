"use client";

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { FaCalendarAlt, FaPlayCircle, FaStar, FaCommentDots, FaImage, FaUser, FaBullhorn } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import { getStreamers, getSchedules, getPosts, type ScheduleItem, type Post } from "./actions";
import { getLiveStatus, type StreamerInfo } from "@/lib/live-api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import ScheduleModal from '@/components/ScheduleModal';
import { format, startOfWeek, addDays } from 'date-fns';

interface Notice {
    id: string;
    streamerId: string;
    streamerName: string;
    title: string;
    content: string;
    date: string;
    views: number;
}

export default function Home() {
    const router = useRouter();
    const [liveList, setLiveList] = useState<StreamerInfo[]>([]);
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [recentPosts, setRecentPosts] = useState<Post[]>([]);
    const [recentNotices, setRecentNotices] = useState<Notice[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Current Week Calculation
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }).map((_, i) => {
        const d = addDays(startOfCurrentWeek, i);
        return {
            fullDate: format(d, 'yyyy-MM-dd'),
            displayDate: format(d, 'MM.dd'),
            dayName: ['월', '화', '수', '목', '금', '토', '일'][i]
        };
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch basic data in parallel
                const [streamers, scheds, posts] = await Promise.all([
                    getStreamers(),
                    getSchedules(),
                    getPosts()
                ]);

                setSchedules(scheds);
                setRecentPosts(posts.slice(0, 7));

                // Fetch Live Status separately as it depends on streamers
                if (streamers.length > 0) {
                    getLiveStatus(streamers.map(s => s.bjId)).then(setLiveList).catch(console.error);
                }

                // Fetch Recent Notices separately
                fetch('/api/notices/recent')
                    .then(res => res.json())
                    .then(data => {
                        if (data.notices && Array.isArray(data.notices)) {
                            setRecentNotices(data.notices);
                        }
                    })
                    .catch(console.error);

            } catch (error) {
                console.error("Failed to fetch initial data:", error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const handleDayClick = (date: string) => {
        setSelectedDate(date);
        setIsModalOpen(true);
    };

    const getDaySchedule = (date: string) => {
        return schedules.filter(s => s.date === date);
    };

    const getMainScheduleContent = (date: string) => {
        const dayScheds = getDaySchedule(date);
        if (dayScheds.length === 0) return '일정 없음';
        // Prioritize 'event' > 'normal' > 'rest'
        const event = dayScheds.find(s => s.type === 'event');
        if (event) return event.content;
        const normal = dayScheds.find(s => s.type === 'normal');
        if (normal) return normal.content;
        return dayScheds[0].content;
    };

    const getDayType = (date: string) => {
        const dayScheds = getDaySchedule(date);
        if (dayScheds.length === 0) return 'none';
        if (dayScheds.some(s => s.type === 'event')) return 'event';
        if (dayScheds.some(s => s.type === 'rest')) return 'rest';
        return 'normal';
    };

    // Take top 3
    const topLive = liveList.slice(0, 3);
    const hasMore = liveList.length > 3;

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-pink-50 to-purple-50 flex flex-col font-sans selection:bg-pink-300/30">
            <Header />

            <main className="flex-1 w-full">
                {/* HERO Section -> Weekly Schedule */}
                <section className="relative w-full py-20 gradient-bg-pastel min-h-[500px] flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-transparent z-10"></div>

                    <div className="container mx-auto px-4 z-20 space-y-8">
                        <div className="text-center space-y-2">
                            <Link href="/schedule">
                                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight cursor-pointer hover:opacity-80 transition-opacity drop-shadow-lg">
                                    WEEKLY <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-pink-600">SCHEDULE</span>
                                </h1>
                            </Link>
                            <p className="text-gray-700 font-medium drop-shadow">최가네 이번주 방송 일정안내 (클릭하여 전체 일정 보기)</p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-7 gap-4 max-w-6xl mx-auto">
                            {weekDays.map((day, idx) => {
                                const type = getDayType(day.fullDate);
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => handleDayClick(day.fullDate)}
                                        className={cn(
                                            "p-6 rounded-2xl border flex flex-col items-center justify-center gap-4 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl h-[180px] cursor-pointer backdrop-blur-sm",
                                            type === 'rest' ? "border-gray-300/50 bg-white/40 opacity-70" :
                                                type === 'event' ? "border-pink-300/60 bg-gradient-to-br from-pink-100/80 to-purple-100/80 shadow-pink-200/30" : "border-cyan-200/50 bg-white/60 hover:border-pink-300/50 hover:bg-gradient-to-br hover:from-cyan-50/80 hover:to-pink-50/80"
                                        )}>
                                        <div className="text-xs font-medium text-gray-600 uppercase tracking-widest">{day.dayName}</div>
                                        <div className="font-black text-2xl text-gray-800 font-mono">{day.displayDate}</div>
                                        <span className={cn(
                                            "font-bold text-center text-sm px-3 py-1.5 rounded-full w-full truncate",
                                            type === 'event' ? "text-pink-700 bg-pink-200/60" :
                                                type === 'rest' ? "text-gray-500" : "text-cyan-700 group-hover:text-pink-700"
                                        )}>
                                            {getMainScheduleContent(day.fullDate)}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </section>

                <div className="container mx-auto px-4 -mt-10 z-30 relative space-y-24 pb-20">
                    {/* LIVE STREAMING Section */}
                    <section className="rounded-3xl p-8 border border-pink-200/40 shadow-2xl backdrop-blur-xl bg-gradient-to-br from-white/90 to-pink-50/80">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </span>
                                    ON AIR
                                </h2>
                                <p className="text-gray-600 text-sm mt-1">실시간 방송중인 멤버 ({liveList.length})</p>
                            </div>
                            {hasMore && (
                                <Link href="/live" className="text-sm font-medium text-pink-600 hover:text-pink-700 transition-colors flex items-center gap-1">
                                    전체보기 &rarr;
                                </Link>
                            )}
                        </div>

                        {liveList.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {topLive.map((stream) => (
                                    <a href={stream.url} target="_blank" rel="noreferrer" key={stream.id} className="group aspect-video rounded-xl overflow-hidden relative bg-black border border-pink-200/30 hover:border-pink-400/60 transition-all hover:scale-[1.02] shadow-lg shadow-pink-200/30">
                                        {/* Thumbnail */}
                                        <img src={stream.thumbnail} alt={stream.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />

                                        {/* Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>

                                        <div className="absolute top-3 left-3 flex gap-2">
                                            <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse">LIVE</span>
                                        </div>

                                        <div className="absolute bottom-3 left-3 right-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-pink-300 font-bold text-sm shadow-black drop-shadow-md">{stream.nickname}</span>
                                                <div className="flex items-center gap-1 text-[10px] text-zinc-300 bg-black/50 px-1.5 py-0.5 rounded-full">
                                                    <FaUser size={8} /> {stream.viewers.toLocaleString()}
                                                </div>
                                            </div>
                                            <h3 className="text-white font-medium text-sm truncate drop-shadow-md">{stream.title}</h3>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-500 bg-white/40 rounded-2xl border border-dashed border-gray-300">
                                <FaPlayCircle className="w-12 h-12 mb-4 opacity-20" />
                                <p>현재 방송중인 멤버가 없습니다.</p>
                            </div>
                        )}
                    </section>

                    {/* NOTICES Section */}
                    <section className="rounded-3xl p-8 border border-cyan-200/40 shadow-2xl backdrop-blur-xl bg-gradient-to-br from-white/90 to-cyan-50/80">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                    <FaBullhorn className="text-cyan-600" />
                                    공지사항
                                </h2>
                                <p className="text-gray-600 text-sm mt-1">최신 공지사항 ({recentNotices.length})</p>
                            </div>
                            <Link href="/notice" className="text-sm text-cyan-600 hover:text-cyan-700 transition-colors font-medium">
                                전체보기 →
                            </Link>
                        </div>

                        {recentNotices.length > 0 ? (
                            <div className="space-y-3">
                                {recentNotices.map((notice) => (
                                    <div
                                        key={notice.id}
                                        onClick={() => router.push('/notice')}
                                        className="group p-5 rounded-2xl border border-cyan-200/40 bg-white/60 hover:bg-cyan-50/80 hover:border-cyan-300/60 transition-all cursor-pointer hover:scale-[1.01]"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="shrink-0">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                                                    {notice.streamerName.charAt(0)}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-cyan-100 text-cyan-700 border border-cyan-300/50">
                                                        공지
                                                    </span>
                                                    <span className="text-sm font-bold text-cyan-700">{notice.streamerName}</span>
                                                </div>
                                                <h4 className="font-medium text-gray-800 group-hover:text-cyan-700 transition-colors truncate">
                                                    {notice.title}
                                                </h4>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {notice.date}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-500 bg-white/40 rounded-2xl border border-dashed border-gray-300">
                                <FaBullhorn className="w-12 h-12 mb-4 opacity-20" />
                                <p>등록된 공지사항이 없습니다.</p>
                            </div>
                        )}
                    </section>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Board Feed */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className="flex items-center justify-between">
                                <h2 className="text-3xl font-bold flex items-center gap-3 text-gray-800">
                                    <FaCommentDots className="text-pink-500" />
                                    자유 게시판
                                </h2>
                                <Link href="/board/free" className="text-sm font-medium text-gray-600 hover:text-pink-600 transition-colors">전체보기 &rarr;</Link>
                            </div>

                            <div className="space-y-4">
                                {recentPosts.length > 0 ? recentPosts.map((post) => (
                                    <div
                                        key={post.id}
                                        className="group p-5 rounded-2xl border border-pink-200/40 bg-white/60 hover:bg-pink-50/80 hover:border-pink-300/60 transition-all cursor-pointer flex items-center justify-between hover:scale-[1.01]"
                                    >
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="flex flex-col gap-1 min-w-0">
                                                <h4 className="font-medium text-lg text-gray-800 group-hover:text-pink-600 transition-colors truncate">{post.title}</h4>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 md:hidden">
                                                    <span>{post.author}</span>
                                                    <span>•</span>
                                                    <span>{post.date}</span>
                                                </div>
                                            </div>
                                            {post.isHot && <span className="hidden md:inline-flex px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold border border-red-300/40">HOT</span>}
                                            {post.hasImage && <FaImage className="hidden md:block w-4 h-4 text-gray-400" />}
                                        </div>
                                        <div className="hidden md:flex flex-col items-end gap-1 text-sm text-gray-500 min-w-[80px]">
                                            <span className="font-medium text-gray-600 group-hover:text-pink-600">{post.author}</span>
                                            <span className="text-xs">{post.date.split(' ')[0]}</span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-12 text-center text-gray-500 border border-dashed border-gray-300 rounded-2xl bg-white/40">
                                        최근 올라온 게시글이 없습니다.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar / Ranking */}
                        <div className="space-y-8">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
                                    <FaStar className="text-yellow-500" />
                                    Monthly Ranking
                                </h2>
                                <span className="text-xs text-gray-500">12월 기준</span>
                            </div>

                            <div className="p-6 rounded-3xl border border-purple-200/40 bg-gradient-to-br from-white/90 to-purple-50/60 backdrop-blur space-y-6">
                                {[
                                    { name: "큰손회장님", point: "10,000,000", badge: "👑" },
                                    { name: "열혈팬1호", point: "5,500,000", badge: "🥈" },
                                    { name: "다이아수저", point: "3,200,000", badge: "🥉" },
                                    { name: "나도팬이다", point: "1,000,000", badge: "4" },
                                    { name: "소액주주", point: "500,000", badge: "5" }
                                ].map((rank, i) => (
                                    <div key={rank.name} className="flex items-center gap-4 group">
                                        <span className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner",
                                            i === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-600 text-white shadow-amber-500/20" :
                                                i === 1 ? "bg-gradient-to-br from-gray-300 to-zinc-500 text-white shadow-zinc-500/20" :
                                                    i === 2 ? "bg-gradient-to-br from-amber-700 to-orange-800 text-white shadow-orange-500/20" :
                                                        "bg-purple-100 text-purple-700"
                                        )}>{rank.badge === "4" || rank.badge === "5" ? rank.badge : rank.badge}</span>
                                        <div className="flex-1">
                                            <div className="font-bold text-gray-800 group-hover:text-purple-600 transition-colors">{rank.name}</div>
                                            <div className="text-xs text-gray-500">{rank.point} P</div>
                                        </div>
                                    </div>
                                ))}
                                <button className="w-full py-3 rounded-xl bg-purple-100 text-sm font-medium text-purple-700 hover:bg-purple-200 transition-colors">
                                    전체 랭킹 보기
                                </button>
                            </div>

                            {/* Ad Placeholder */}
                            <div className="aspect-square rounded-3xl border border-pink-200/40 bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center text-gray-400 overflow-hidden relative group">
                                <div className="absolute inset-0 bg-gradient-to-tr from-pink-200/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <span className="text-sm">AD AREA</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />

            {/* Modal */}
            {selectedDate && (
                <ScheduleModal
                    date={format(new Date(selectedDate), 'MM.dd (eee)')}
                    schedules={getDaySchedule(selectedDate)}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </div>
    );
}
