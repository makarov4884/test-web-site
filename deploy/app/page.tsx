"use client";

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { FaCalendarAlt, FaPlayCircle, FaStar, FaCommentDots, FaImage, FaUser, FaBullhorn, FaSync } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import { getStreamers, getSchedules, getPosts, type ScheduleItem, type Post } from "./actions";
import { getLiveStatus, type StreamerInfo } from "@/lib/live-api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import ScheduleModal from '@/components/ScheduleModal';
import { format, addDays } from 'date-fns';

interface Notice {
    id: string;
    streamerId: string;
    streamerName: string;
    title: string;
    content: string;
    date: string;
    url: string;
}

export default function Home() {
    const router = useRouter();
    const [liveList, setLiveList] = useState<StreamerInfo[]>([]);
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [recentPosts, setRecentPosts] = useState<Post[]>([]);
    const [recentNotices, setRecentNotices] = useState<Notice[]>([]);
    const [allNotices, setAllNotices] = useState<Notice[]>([]);
    const [showAllNotices, setShowAllNotices] = useState(false);
    const [selectedStreamer, setSelectedStreamer] = useState<string>('all');
    const [loadingNotices, setLoadingNotices] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [youtubeVideos, setYoutubeVideos] = useState<{
        main: { thumbnail: string; title: string; url: string; channelProfileImage: string } | null;
        sub: { thumbnail: string; title: string; url: string; channelProfileImage: string } | null;
    }>({ main: null, sub: null });

    // Current Week Calculation - Start from today, show next 7 days
    const today = new Date();
    const weekDays = Array.from({ length: 7 }).map((_, i) => {
        const d = addDays(today, i);
        const dayOfWeek = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

        return {
            fullDate: format(d, 'yyyy-MM-dd'),
            displayDate: format(d, 'MM.dd'),
            dayName: dayNames[dayOfWeek]
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

                // Fetch Recent Notices from new crawler
                setLoadingNotices(true);
                fetch('/api/notices/crawl')
                    .then(res => res.json())
                    .then(data => {
                        if (data.success && data.notices && Array.isArray(data.notices)) {
                            setRecentNotices(data.notices.slice(0, 5)); // 최신 5개만
                        }
                    })
                    .catch(console.error)
                    .finally(() => setLoadingNotices(false));

                // Fetch YouTube latest videos (with 1-hour cache)
                Promise.all([
                    fetch('/api/youtube/latest?channelId=UC0A6pmFQ3vOYQ6DWNQcC8_w').then(r => r.json()),
                    fetch('/api/youtube/latest?channelId=UC7e5oAresWJW6LOyygdSUXw').then(r => r.json())
                ]).then(([mainVideo, subVideo]) => {
                    setYoutubeVideos({
                        main: mainVideo.error ? null : mainVideo,
                        sub: subVideo.error ? null : subVideo
                    });
                }).catch(console.error);

            } catch (error) {
                console.error("Failed to fetch initial data:", error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 300000); // 5분마다 자동 새로고침
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
                            <p className="text-gray-700 font-medium drop-shadow">팀진우 이번주 방송 일정안내 (클릭하여 전체 일정 보기)</p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4 max-w-7xl mx-auto px-2">
                            {weekDays.map((day, idx) => {
                                const type = getDayType(day.fullDate);
                                const isToday = day.fullDate === format(new Date(), 'yyyy-MM-dd');

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => handleDayClick(day.fullDate)}
                                        className={cn(
                                            "p-4 md:p-6 rounded-2xl border flex flex-col items-center justify-center gap-3 md:gap-4 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl h-[160px] md:h-[180px] cursor-pointer backdrop-blur-sm",
                                            isToday && "ring-4 ring-pink-400 ring-offset-2",
                                            type === 'rest' ? "border-gray-300/50 bg-white/40" :
                                                type === 'event' ? "border-pink-300/60 bg-gradient-to-br from-pink-100/80 to-purple-100/80 shadow-pink-200/30" : "border-cyan-200/50 bg-white/60 hover:border-pink-300/50 hover:bg-gradient-to-br hover:from-cyan-50/80 hover:to-pink-50/80"
                                        )}>
                                        <div className="text-xs font-medium text-gray-600 uppercase tracking-widest">
                                            {day.dayName}
                                            {isToday && <span className="ml-1 text-pink-600">●</span>}
                                        </div>
                                        <div className="font-black text-xl md:text-2xl text-gray-800 font-mono">{day.displayDate}</div>
                                        <span className={cn(
                                            "font-bold text-center text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5 rounded-full w-full truncate",
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
                    <section className="rounded-3xl overflow-hidden border border-gray-200 shadow-lg bg-white">
                        <div className="bg-gradient-to-r from-pink-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FaBullhorn className="text-pink-500" />
                                    <h2 className="text-xl font-bold text-gray-800">공지사항</h2>
                                    <span className="text-sm text-gray-500">({recentNotices.length})</span>
                                </div>
                                <Link href="/notice" className="text-sm text-pink-600 hover:text-pink-700 transition-colors font-medium">
                                    전체보기 →
                                </Link>
                            </div>
                        </div>

                        {loadingNotices ? (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                <FaSync className="w-8 h-8 mb-4 animate-spin text-pink-300" />
                                <p className="text-sm">최신 소식을 불러오는 중입니다...</p>
                            </div>
                        ) : recentNotices.length > 0 ? (
                            <div className="divide-y divide-gray-100">
                                {recentNotices.map((notice, index) => (
                                    <a
                                        key={notice.id}
                                        href={notice.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex items-center gap-4 px-6 py-4 hover:bg-pink-50/50 transition-colors"
                                    >
                                        {/* 프로필 아이콘 */}
                                        <div className="shrink-0">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                                {notice.streamerName.charAt(0)}
                                            </div>
                                        </div>

                                        {/* 공지 내용 */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-pink-100 text-pink-700">
                                                    공지
                                                </span>
                                                <span className="text-sm font-medium text-gray-600">{notice.streamerName}</span>
                                            </div>
                                            <h4 className="font-medium text-gray-800 group-hover:text-pink-600 transition-colors truncate">
                                                {notice.title}
                                            </h4>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {notice.date}
                                            </p>
                                        </div>

                                        {/* 화살표 */}
                                        <div className="shrink-0 text-gray-300 group-hover:text-pink-500 transition-colors">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
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


                            {/* YouTube Channels */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <span className="text-red-600">▶</span>
                                    유튜브 채널
                                </h3>

                                {/* Main Channel */}
                                <a
                                    href="https://www.youtube.com/@TEAMJINU"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block rounded-2xl overflow-hidden relative group hover:shadow-2xl transition-all border border-pink-200/40"
                                >
                                    {/* Thumbnail */}
                                    <div className="aspect-video bg-gray-900 relative overflow-hidden">
                                        <img
                                            src={youtubeVideos.main?.thumbnail || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270"%3E%3Crect width="480" height="270" fill="%23cccccc"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="%23666666"%3ETEAM JINU%3C/text%3E%3C/svg%3E'}
                                            alt="TEAM JINU"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-20 h-20 rounded-full bg-red-600/80 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <span className="text-white text-4xl font-bold drop-shadow-lg">▶</span>
                                            </div>
                                        </div>
                                        <div className="absolute top-3 left-3">
                                            <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">YouTube</span>
                                        </div>
                                    </div>

                                    <div className="bg-white p-4">
                                        <div className="flex items-start gap-3">
                                            <img
                                                src={youtubeVideos.main?.channelProfileImage || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"%3E%3Crect width="40" height="40" fill="%23cccccc"/%3E%3C/svg%3E'}
                                                alt="팀진우"
                                                className="w-10 h-10 rounded-full object-cover shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-gray-800 truncate group-hover:text-red-600 transition-colors">팀진우</h4>
                                            </div>
                                        </div>
                                    </div>
                                </a>

                                {/* Second Channel */}
                                <a
                                    href="https://www.youtube.com/@TEAM-JINU"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block rounded-2xl overflow-hidden relative group hover:shadow-2xl transition-all border border-pink-200/40"
                                >
                                    {/* Thumbnail */}
                                    <div className="aspect-video bg-gray-900 relative overflow-hidden">
                                        <img
                                            src={youtubeVideos.sub?.thumbnail || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270"%3E%3Crect width="480" height="270" fill="%23cccccc"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="%23666666"%3ETEAM JINU%3C/text%3E%3C/svg%3E'}
                                            alt="TEAM-JINU"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-20 h-20 rounded-full bg-purple-600/80 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <span className="text-white text-4xl font-bold drop-shadow-lg">▶</span>
                                            </div>
                                        </div>
                                        <div className="absolute top-3 left-3">
                                            <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded">YouTube</span>
                                        </div>
                                    </div>

                                    <div className="bg-white p-4">
                                        <div className="flex items-start gap-3">
                                            <img
                                                src={youtubeVideos.sub?.channelProfileImage || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"%3E%3Crect width="40" height="40" fill="%23cccccc"/%3E%3C/svg%3E'}
                                                alt="박진우"
                                                className="w-10 h-10 rounded-full object-cover shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-gray-800 truncate group-hover:text-purple-600 transition-colors">박진우</h4>
                                            </div>
                                        </div>
                                    </div>
                                </a>
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
