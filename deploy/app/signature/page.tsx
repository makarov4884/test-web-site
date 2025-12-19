'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { FaPlay, FaTimes } from 'react-icons/fa';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';

interface SignatureImage {
    file: string;
    number: number;
}

export default function SignaturePage() {
    const [images, setImages] = useState<SignatureImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');

    const filters = [
        { id: 'all', label: 'All' },
        { id: '1000', label: '1000~' },
        { id: '2000', label: '2000~' },
        { id: '3000', label: '3000~' },
        { id: '4000', label: '4000~' },
        { id: '5000', label: '5000~' },
        { id: '6000', label: '6000~' },
        { id: '7000', label: '7000~' },
        { id: '8000', label: '8000~' },
        { id: '9000', label: '9000~' },
        { id: '10000', label: '10000~' },
        { id: '20000', label: '20000~' },
        { id: '30000', label: '30000~' },
    ];

    const [videoMap, setVideoMap] = useState<Record<string, string[]>>({});
    const [videoMetaMap, setVideoMetaMap] = useState<Record<string, Record<string, { author?: string, thumbnail?: string }>>>({});

    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [selectedVideos, setSelectedVideos] = useState<string[] | null>(null);
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
    const [isAutoAdvance, setIsAutoAdvance] = useState(false);

    // Video Filtering
    const [activeAuthor, setActiveAuthor] = useState('All');
    const [availableAuthors, setAvailableAuthors] = useState<string[]>([]);

    useEffect(() => {
        fetch('/api/processed-signatures')
            .then(res => res.json())
            .then(data => {
                if (data.images) setImages(data.images);
            })
            .catch(console.error)
            .finally(() => setLoading(false));

        fetch('/signature_videos.json')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const map: Record<string, string[]> = {};
                    const metaMap: Record<string, Record<string, { author?: string, thumbnail?: string }>> = {};

                    data.forEach((item: any) => {
                        if (item.videoUrls && Array.isArray(item.videoUrls)) {
                            map[item.file] = item.videoUrls;
                        } else if (item.videoUrl) {
                            map[item.file] = [item.videoUrl];
                        }
                        if (item.videoMeta) {
                            metaMap[item.file] = item.videoMeta;
                        }
                    });
                    setVideoMap(map);
                    setVideoMetaMap(metaMap);
                }
            })
            .catch(() => { });
    }, []);

    // Derived filtered list
    const filteredVideos = selectedVideos ? selectedVideos.filter(url => {
        if (activeAuthor === 'All') return true;

        // Get metadata for this specific video
        const fileMeta = selectedFile && videoMetaMap[selectedFile];
        const videoInfo = fileMeta ? fileMeta[url] : null;

        // Type safe access
        const author = (videoInfo && typeof videoInfo === 'object' && 'author' in videoInfo)
            ? (videoInfo as any).author
            : 'Unknown';

        return author === activeAuthor;
    }) : [];

    // Auto-advance logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isAutoAdvance && filteredVideos.length > 1) {
            interval = setInterval(() => {
                setCurrentVideoIndex(prev => (prev < filteredVideos.length - 1 ? prev + 1 : 0));
            }, 8000);
        }
        return () => clearInterval(interval);
    }, [isAutoAdvance, filteredVideos]);

    const handleImageClick = (file: string) => {
        if (videoMap[file]) {
            const videos = videoMap[file];
            setSelectedFile(file);
            setSelectedVideos(videos);
            setCurrentVideoIndex(0);
            setIsAutoAdvance(false);

            // Calculate authors
            const authors = new Set<string>();
            const fileMeta = videoMetaMap[file];

            videos.forEach(url => {
                const author = (fileMeta && fileMeta[url]?.author) || 'Unknown';
                if (author && author !== 'Unknown') authors.add(author);
            });
            // If we have actual authors, show them. If only 'Unknown', effectively no filter needed (or just show All)
            const sortedAuthors = Array.from(authors).sort();
            setAvailableAuthors(['All', ...sortedAuthors]);
            setActiveAuthor('All');
        }
    };

    const handlePrevVideo = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (filteredVideos.length === 0) return;
        setCurrentVideoIndex(prev => (prev > 0 ? prev - 1 : filteredVideos.length - 1));
    };

    const handleNextVideo = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (filteredVideos.length === 0) return;
        setCurrentVideoIndex(prev => (prev < filteredVideos.length - 1 ? prev + 1 : 0));
    };

    const getVideoUrl = (url: string) => {
        if (!url) return '';
        let newUrl = url;
        const hasParams = newUrl.includes('?');
        const params: string[] = [];
        if (!newUrl.includes('autoplay=')) params.push('autoplay=true');
        if (!newUrl.includes('mute=')) params.push('mute=true');
        if (params.length > 0) {
            newUrl += (hasParams ? '&' : '?') + params.join('&');
        }
        return newUrl;
    };

    // ... [Inside Render return block updates below]

    const filteredImages = images.filter(item => {
        if (activeFilter === 'all') return true;

        const num = item.number;
        const filterNum = parseInt(activeFilter, 10);

        if (activeFilter === '30000') return num >= 30000;

        let step = 1000;
        if (filterNum >= 10000) step = 10000;
        return num >= filterNum && num < filterNum + step;
    });

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">Signature Gallery</h1>

                <div className="flex flex-wrap gap-2 justify-center mb-8">
                    {filters.map(f => (
                        <button
                            key={f.id}
                            onClick={() => setActiveFilter(f.id)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeFilter === f.id
                                ? 'bg-pink-500 text-white shadow-md'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
                    </div>
                ) : filteredImages.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {filteredImages.map((item, idx) => (
                            <div
                                key={idx}
                                onClick={() => handleImageClick(item.file)}
                                className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden flex items-center justify-center p-2 relative group ${videoMap[item.file] ? 'cursor-pointer hover:border-pink-300' : ''}`}
                            >
                                <img
                                    src={`/signatures/${item.file}`}
                                    alt={item.file}
                                    className="max-w-full h-auto object-contain"
                                />
                                {videoMap[item.file] && (
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="bg-pink-600 text-white p-3 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                            <FaPlay className="ml-1" />
                                            {videoMap[item.file].length > 1 && (
                                                <span className="absolute -top-1 -right-1 bg-white text-pink-600 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-pink-600">
                                                    {videoMap[item.file].length}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div className="absolute top-1 left-1 bg-black/50 text-white text-[10px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                    {item.number > 0 ? item.number : 'No Num'}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-500">
                        No signatures found in this range.
                    </div>
                )}
            </main>

            {/* Video Modal */}
            {selectedVideos && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedVideos(null)}>
                    <div className="relative w-full max-w-5xl bg-black rounded-xl overflow-hidden shadow-2xl flex flex-col items-center justify-center aspect-video" onClick={e => e.stopPropagation()}>

                        {/* Author Filters */}
                        {availableAuthors.length > 2 && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex gap-2 overflow-x-auto max-w-[80%] p-2 no-scrollbar">
                                {availableAuthors.map(author => (
                                    <button
                                        key={author}
                                        onClick={() => {
                                            setActiveAuthor(author);
                                            setCurrentVideoIndex(0);
                                        }}
                                        className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeAuthor === author
                                            ? 'bg-pink-600 text-white shadow-lg'
                                            : 'bg-black/60 text-gray-300 hover:bg-black/80'
                                            }`}
                                    >
                                        {author === 'All' ? 'ALL' : author}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Close Button */}
                        <button
                            onClick={() => setSelectedVideos(null)}
                            className="absolute top-4 right-4 text-white/70 hover:text-white z-20 bg-black/50 rounded-full p-2 transition-colors"
                        >
                            <FaTimes size={24} />
                        </button>

                        {/* Prev Button */}
                        {filteredVideos.length > 1 && (
                            <button
                                onClick={handlePrevVideo}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white z-20 bg-black/50 rounded-full p-3 transition-colors hover:bg-black/70"
                            >
                                <IoIosArrowBack size={30} />
                            </button>
                        )}

                        {/* Next Button */}
                        {filteredVideos.length > 1 && (
                            <button
                                onClick={handleNextVideo}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white z-20 bg-black/50 rounded-full p-3 transition-colors hover:bg-black/70"
                            >
                                <IoIosArrowForward size={30} />
                            </button>
                        )}

                        {/* Auto Advance Toggle */}
                        {filteredVideos.length > 1 && (
                            <button
                                onClick={() => setIsAutoAdvance(!isAutoAdvance)}
                                className={`absolute bottom-4 right-4 z-20 px-3 py-1 rounded-full text-xs font-bold transition-colors ${isAutoAdvance
                                    ? 'bg-pink-600 text-white shadow-lg'
                                    : 'bg-black/50 text-gray-300 hover:bg-black/70'
                                    }`}
                            >
                                {isAutoAdvance ? '🔄 Stop Loop' : '▶ Auto Loop'}
                            </button>
                        )}

                        {/* Video Frame */}
                        <div className="w-full h-full relative">
                            {filteredVideos.length > 0 ? (
                                <iframe
                                    key={filteredVideos[currentVideoIndex]} // Re-mount on change
                                    src={getVideoUrl(filteredVideos[currentVideoIndex])}
                                    className="w-full h-full"
                                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            ) : (
                                <div className="flex items-center justify-center h-full text-white text-lg">
                                    No videos match filter "{activeAuthor}"
                                </div>
                            )}
                        </div>

                        {/* Page Counter */}
                        {filteredVideos.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full font-bold z-20">
                                {currentVideoIndex + 1} / {filteredVideos.length}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}
