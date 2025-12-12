"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FaBullhorn, FaEye, FaSync, FaExternalLinkAlt, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { getStreamers } from "../actions";

interface Notice {
    id: string;
    streamerId: string;
    streamerName: string;
    title: string;
    content: string;
    date: string;
    views: number;
    profileImage?: string;
}

export default function NoticePage() {
    const router = useRouter();
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
    const [selectedStreamer, setSelectedStreamer] = useState<string>("ALL");
    const [expandedNoticeId, setExpandedNoticeId] = useState<string | null>(null);

    const fetchNotices = useCallback(async (isAutoRefresh = false) => {
        if (isAutoRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const streamers = await getStreamers();
            const allNotices: Notice[] = [];

            // 병렬로 API 호출하여 속도 개선
            const noticePromises = streamers.map(async (streamer) => {
                try {
                    const response = await fetch(`/api/notices/${streamer.bjId}`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.notices && Array.isArray(data.notices)) {
                            return data.notices;
                        }
                    }
                } catch (error) {
                    console.error(`Failed to fetch notices for ${streamer.bjId}:`, error);
                }
                return [];
            });

            const results = await Promise.all(noticePromises);
            results.forEach(items => allNotices.push(...items));

            // Remove duplicates based on ID
            const uniqueNotices = Array.from(new Map(allNotices.map(n => [n.id, n])).values());

            // 날짜 기준 정렬 (최신순)
            uniqueNotices.sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return dateB - dateA;
            });

            setNotices(uniqueNotices);
            setLastFetchTime(new Date());
        } catch (error) {
            console.error("Failed to fetch notices:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // 초기 로드
    useEffect(() => {
        fetch('/api/update-cache', { method: 'POST' }).catch(console.error);
        fetchNotices();
    }, [fetchNotices]);

    // 카테고리(스트리머 목록) 추출
    const streamersList = useMemo(() => {
        const names = new Set(notices.map(n => n.streamerName));
        return Array.from(names).sort();
    }, [notices]);

    // 필터링된 공지사항
    const filteredNotices = useMemo(() => {
        if (selectedStreamer === "ALL") return notices;
        return notices.filter(n => n.streamerName === selectedStreamer);
    }, [notices, selectedStreamer]);

    const handleManualRefresh = () => {
        fetchNotices(true);
    };

    const toggleExpand = (id: string) => {
        setExpandedNoticeId(prev => prev === id ? null : id);
    };

    const handleOpenOriginal = (e: React.MouseEvent, notice: Notice) => {
        e.stopPropagation();
        window.open(notice.id.includes('board') ? `https://bj.afreecatv.com/${notice.streamerId}/posts/${notice.id.split('-')[1]}` : `https://bj.afreecatv.com/${notice.streamerId}`, '_blank');
    };

    // 시간 표시 포맷팅
    const formatTimeAgo = (dateStr: string) => {
        // UTC 시간인 경우 한국 시간으로 보정 등의 처리가 필요할 수 있음
        // 서버에서 이미 ISOString으로 준다면 new Date()가 로컬 시간대로 파싱함
        const date = new Date(dateStr);
        const now = new Date();
        const diff = (now.getTime() - date.getTime()) / 1000; // 초 단위

        if (diff < 60) return "방금 전";
        if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
        if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;

        return `${date.getMonth() + 1}월 ${date.getDate()}일`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-pink-50 to-purple-50 flex flex-col font-sans">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                {/* 상단 헤더 영역 */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
                            <FaBullhorn className="text-cyan-600" />
                            방송국 공지사항
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {lastFetchTime && `마지막 업데이트: ${lastFetchTime.toLocaleTimeString('ko-KR')}`}
                        </p>
                    </div>
                    <button
                        onClick={handleManualRefresh}
                        disabled={refreshing}
                        className="self-start md:self-auto flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 border border-gray-200"
                    >
                        <FaSync className={refreshing ? 'animate-spin' : ''} />
                        새로고침
                    </button>
                </div>

                {/* 카테고리 탭 (가로 스크롤) */}
                <div className="mb-6 overflow-x-auto pb-2 scrollbar-hide">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSelectedStreamer("ALL")}
                            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${selectedStreamer === "ALL"
                                ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                                }`}
                        >
                            전체
                        </button>
                        {streamersList.map(name => (
                            <button
                                key={name}
                                onClick={() => setSelectedStreamer(name)}
                                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${selectedStreamer === name
                                    ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                                    }`}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 공지사항 리스트 */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500"></div>
                        <p className="mt-4 text-gray-500 text-sm">공지사항을 불러오고 있습니다...</p>
                    </div>
                ) : filteredNotices.length > 0 ? (
                    <div className="space-y-3">
                        {filteredNotices.map((notice) => {
                            const isExpanded = expandedNoticeId === notice.id;

                            return (
                                <div
                                    key={notice.id}
                                    onClick={() => toggleExpand(notice.id)}
                                    className={`group rounded-xl border transition-all cursor-pointer overflow-hidden ${isExpanded
                                        ? "bg-white border-pink-300 shadow-lg"
                                        : "bg-white/80 border-pink-200 hover:bg-white hover:border-pink-300 hover:shadow-md"
                                        }`}
                                >
                                    {/* 헤더 (항상 보임) */}
                                    <div className="p-4 flex items-start gap-3">
                                        {/* 프로필 이미지 */}
                                        <div className="shrink-0 mt-1">
                                            {notice.profileImage ? (
                                                <img
                                                    src={notice.profileImage}
                                                    alt={notice.streamerName}
                                                    className="w-10 h-10 rounded-full border border-pink-200 object-cover bg-gray-100"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center text-gray-700 font-bold border border-pink-200">
                                                    {notice.streamerName.charAt(0)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-pink-600">
                                                    {notice.streamerName}
                                                </span>
                                                <span className="text-[10px] text-gray-500 px-1.5 py-0.5 rounded bg-gray-100">
                                                    {formatTimeAgo(notice.date)}
                                                </span>
                                            </div>
                                            <h3 className={`text-base font-medium leading-snug transition-colors ${isExpanded ? "text-gray-800" : "text-gray-700 group-hover:text-pink-600"
                                                }`}>
                                                {notice.title}
                                            </h3>

                                            {/* 접혀있을 때 보이는 한 줄 요약 */}
                                            {!isExpanded && (
                                                <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                                                    클릭하여 내용 보기
                                                </p>
                                            )}
                                        </div>

                                        <div className="shrink-0 self-center">
                                            {isExpanded ? (
                                                <FaChevronUp className="text-gray-500" />
                                            ) : (
                                                <FaChevronDown className="text-gray-400 group-hover:text-gray-600" />
                                            )}
                                        </div>
                                    </div>

                                    {/* 펼쳐진 내용 (Content) */}
                                    {isExpanded && (
                                        <div className="px-5 pb-5 pt-0 border-t border-pink-200 mt-2 animate-in slide-in-from-top-2 duration-200">
                                            <div className="py-4 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                                                {notice.content}
                                            </div>

                                            <div className="flex items-center justify-between pt-2">
                                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <FaEye /> {notice.views.toLocaleString()}
                                                    </span>
                                                    <span>{notice.date.split('T')[0]}</span>
                                                </div>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // 부모의 onClick(접기) 방지
                                                        const postId = notice.id.split('-')[1];
                                                        window.open(`https://www.sooplive.co.kr/station/${notice.streamerId}/post/${postId}`, '_blank');
                                                    }}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-purple-500 hover:shadow-lg text-white text-xs font-bold rounded transition-all"
                                                >
                                                    <FaExternalLinkAlt />
                                                    원문 보러가기
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <FaBullhorn className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p>등록된 공지사항이 없습니다.</p>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
