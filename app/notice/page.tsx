'use client';

import { useState, useEffect } from 'react';
import { FaBullhorn, FaSync, FaChevronDown } from 'react-icons/fa';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface Notice {
    id: string;
    streamerId: string;
    streamerName: string;
    title: string;
    content: string;
    date: string;
    url: string;
}

interface Streamer {
    id: string;
    name: string;
}

export default function NoticePage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [streamers, setStreamers] = useState<Streamer[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStreamer, setSelectedStreamer] = useState<string>('all');
    const [expandedNotices, setExpandedNotices] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(false), 300000); // 5분 자동 갱신
        return () => clearInterval(interval);
    }, []);

    const fetchData = async (force: boolean = false) => {
        try {
            setLoading(true);

            // 스트리머 목록과 공지사항 동시 가져오기
            const [streamersRes, noticesRes] = await Promise.all([
                fetch('/api/streamers/list'),
                fetch(`/api/notices/crawl${force ? '?force=true' : ''}`)
            ]);

            const streamersData = await streamersRes.json();
            const noticesData = await noticesRes.json();

            if (streamersData.success) {
                setStreamers(streamersData.streamers);
            }

            if (noticesData.success) {
                setNotices(noticesData.notices);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredNotices = selectedStreamer === 'all'
        ? notices
        : notices.filter(n => n.streamerId === selectedStreamer);

    const toggleNotice = (noticeId: string) => {
        const newExpanded = new Set(expandedNotices);
        if (newExpanded.has(noticeId)) {
            newExpanded.delete(noticeId);
        } else {
            newExpanded.add(noticeId);
        }
        setExpandedNotices(newExpanded);
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-cyan-50 via-pink-50 to-purple-50">
            <Header />
            <div className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                {/* Header - SOOP 스타일 */}
                <div className="bg-white rounded-lg shadow-sm mb-6 p-6 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                                <FaBullhorn className="text-white text-lg" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">공지사항</h1>
                                <p className="text-sm text-gray-500">총 {filteredNotices.length}개</p>
                            </div>
                        </div>
                        <button
                            onClick={() => fetchData(true)}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            <FaSync className={loading ? 'animate-spin' : ''} />
                            새로고침
                        </button>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="bg-white rounded-lg shadow-sm mb-6 border border-gray-200">
                    <div className="flex gap-0 overflow-x-auto border-b border-gray-200">
                        <button
                            onClick={() => setSelectedStreamer('all')}
                            className={`px-6 py-3 font-medium whitespace-nowrap transition-all border-b-2 ${selectedStreamer === 'all'
                                ? 'border-pink-500 text-pink-600 bg-pink-50'
                                : 'border-transparent text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            전체
                        </button>
                        {streamers.map(streamer => (
                            <button
                                key={streamer.id}
                                onClick={() => setSelectedStreamer(streamer.id)}
                                className={`px-6 py-3 font-medium whitespace-nowrap transition-all border-b-2 ${selectedStreamer === streamer.id
                                    ? 'border-pink-500 text-pink-600 bg-pink-50'
                                    : 'border-transparent text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                {streamer.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notice List - SOOP 스타일 */}
                {loading ? (
                    <div className="text-center py-20">
                        <FaSync className="animate-spin text-4xl text-blue-500 mx-auto mb-4" />
                        <p className="text-gray-600">공지사항을 불러오는 중...</p>
                    </div>
                ) : filteredNotices.length > 0 ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        {filteredNotices.map((notice, index) => (
                            <div
                                key={notice.id}
                                className={`${index !== 0 ? 'border-t border-gray-100' : ''}`}
                            >
                                <div
                                    onClick={() => toggleNotice(notice.id)}
                                    className="p-5 hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Profile Image */}
                                        <div className="shrink-0">
                                            <img
                                                src={`https://profile.img.sooplive.co.kr/LOGO/${notice.streamerId.substring(0, 2)}/${notice.streamerId}/${notice.streamerId}.jpg`}
                                                alt={notice.streamerName}
                                                className="w-12 h-12 rounded-full object-cover border border-gray-200"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                }}
                                            />
                                            <div className="hidden w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold">
                                                {notice.streamerName.charAt(0)}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-pink-100 text-pink-600">
                                                    공지
                                                </span>
                                                <span className="text-sm font-medium text-gray-700">{notice.streamerName}</span>
                                            </div>
                                            <h3 className="font-semibold text-gray-800 mb-1">
                                                {notice.title}
                                            </h3>
                                            <p className="text-xs text-gray-400">
                                                {notice.date}
                                            </p>
                                        </div>

                                        {/* Arrow */}
                                        <div className={`shrink-0 text-gray-400 transition-transform ${expandedNotices.has(notice.id) ? 'rotate-180' : ''}`}>
                                            <FaChevronDown />
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {expandedNotices.has(notice.id) && (
                                    <div className="px-5 pb-5 pt-0 border-t border-gray-100 bg-gray-50">
                                        <div className="mt-4">
                                            {notice.content && (
                                                <p className="text-sm text-gray-600 mb-4 whitespace-pre-wrap">
                                                    {notice.content}
                                                </p>
                                            )}
                                            <a
                                                href={notice.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-block px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                원문 보기 →
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-lg p-20 text-center border border-gray-200">
                        <FaBullhorn className="text-5xl text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">공지사항이 없습니다</p>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}
