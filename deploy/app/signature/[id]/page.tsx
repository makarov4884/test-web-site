'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { FaPlay } from 'react-icons/fa';
import { IoIosArrowBack } from 'react-icons/io';

interface Video {
    id: string;
    title: string;
    thumbnailUrl: string;
    videoUrl: string;
    category: string;
}

export default function SignatureDetailPage() {
    const router = useRouter();
    const params = useParams();
    const signatureId = params.id as string;

    const [videos, setVideos] = useState<Video[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [loading, setLoading] = useState(true);
    const [signatureTitle, setSignatureTitle] = useState('');

    useEffect(() => {
        // Fetch videos for this signature ID from API
        fetch(`/api/signature-videos/${signatureId}`)
            .then(res => res.json())
            .then(data => {
                setSignatureTitle(data.signatureTitle || `${signatureId} - 관련 영상`);
                setVideos(data.videos || []);

                // Auto-select first video
                if (data.videos && data.videos.length > 0) {
                    setSelectedVideo(data.videos[0]);
                }
            })
            .catch(err => {
                console.error('Failed to fetch videos:', err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [signatureId]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white font-sans">

            <div className="max-w-7xl mx-auto px-4 pt-6 pb-20">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <IoIosArrowBack className="text-2xl" />
                    </button>

                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-600">
                        {signatureTitle}
                    </h1>
                </div>

                {/* Category Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
                    <button className="px-4 py-2 bg-pink-500 text-white rounded-full text-sm font-medium whitespace-nowrap">
                        모먼트 (대화방)
                    </button>
                    <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full text-sm font-medium whitespace-nowrap">
                        10만원 (대화방)
                    </button>
                    <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full text-sm font-medium whitespace-nowrap">
                        클립 (대화방)
                    </button>
                </div>

                {/* Main Video Player */}
                {selectedVideo && (
                    <div className="mb-8">
                        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl">
                            {selectedVideo.videoUrl ? (
                                <iframe
                                    className="w-full h-full"
                                    src={selectedVideo.videoUrl}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    title={selectedVideo.title}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600">
                                    <div className="text-center">
                                        <FaPlay className="text-6xl mb-4 mx-auto opacity-50" />
                                        <p className="text-xl font-bold">{selectedVideo.title}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Video Thumbnails Grid */}
                {loading ? (
                    <div className="text-center py-20">
                        <p className="text-gray-400">로딩 중...</p>
                    </div>
                ) : videos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {videos.map((video) => (
                            <motion.div
                                key={video.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={() => setSelectedVideo(video)}
                                className={`cursor-pointer group ${selectedVideo?.id === video.id ? 'ring-2 ring-pink-500' : ''}`}
                            >
                                <div className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 shadow-md hover:shadow-xl transition-all duration-300">
                                    {video.thumbnailUrl ? (
                                        <img
                                            src={video.thumbnailUrl}
                                            alt={video.title}
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-white text-4xl font-black opacity-20">
                                                {signatureId}
                                            </div>
                                        </div>
                                    )}

                                    {/* Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                                    {/* Content info */}
                                    <div className="absolute bottom-0 left-0 p-2 w-full">
                                        <h3 className="text-white font-bold text-xs leading-tight line-clamp-2 group-hover:text-pink-200 transition-colors">
                                            {video.title}
                                        </h3>
                                    </div>

                                    {/* Play Icon Overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                                            <FaPlay className="text-white ml-1 text-sm" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <p className="text-gray-400 text-lg">영상이 없습니다</p>
                    </div>
                )}
            </div>
        </div>
    );
}
