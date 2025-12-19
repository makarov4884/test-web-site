'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface SignatureImage {
    file: string;
    number: number;
}

export default function SignatureAdminPage() {
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

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [videoUrls, setVideoUrls] = useState<string[]>([]);
    const [videoMap, setVideoMap] = useState<Record<string, string[]>>({});
    const [videoMetaMap, setVideoMetaMap] = useState<Record<string, Record<string, { thumbnail: string }>>>({});

    useEffect(() => {
        // Load images
        fetch('/api/processed-signatures')
            .then(res => res.json())
            .then(data => {
                if (data.images) setImages(data.images);
            })
            .catch(console.error)
            .finally(() => setLoading(false));

        // Load video map
        fetch('/signature_videos.json')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const map: Record<string, string[]> = {};
                    const metaMap: Record<string, Record<string, { thumbnail: string }>> = {};

                    data.forEach((item: any) => {
                        if (item.videoUrls && Array.isArray(item.videoUrls)) {
                            map[item.file] = item.videoUrls;
                        } else if (item.videoUrl) {
                            // Migration compatibility
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

    const handleImageClick = (file: string) => {
        setSelectedImage(file);
        setVideoUrls(videoMap[file] || ['']);
    };

    const addUrlField = () => {
        setVideoUrls([...videoUrls, '']);
    };

    const removeUrlField = (index: number) => {
        const newUrls = videoUrls.filter((_, i) => i !== index);
        setVideoUrls(newUrls.length ? newUrls : ['']);
    };

    const updateUrlField = (index: number, value: string) => {
        const newUrls = [...videoUrls];
        newUrls[index] = value;
        setVideoUrls(newUrls);
    };

    const handleSaveVideo = async () => {
        if (!selectedImage) return;

        // Filter out empty strings
        const validUrls = videoUrls.filter(url => url.trim() !== '');

        try {
            const res = await fetch('/api/signature/link-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: selectedImage, videoUrls: validUrls })
            });

            if (res.ok) {
                setVideoMap(prev => ({ ...prev, [selectedImage]: validUrls }));
                alert('Videos linked successfully!');
                setSelectedImage(null);
            } else {
                alert('Failed to save');
            }
        } catch (e) {
            console.error(e);
            alert('Error saving');
        }
    };

    const filteredImages = images.filter(item => {
        if (activeFilter === 'all') return true;

        const num = item.number;
        const filterNum = parseInt(activeFilter, 10);

        // If highest filter (30000), show everything above
        if (activeFilter === '30000') return num >= 30000;

        // Dynamic Range Step
        let step = 1000;
        if (filterNum >= 10000) {
            step = 10000;
        }
        return num >= filterNum && num < filterNum + step;
    });

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="flex items-center justify-center gap-2 mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Signature Admin</h1>
                    <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-0.5 rounded border border-red-300">ADMIN MODE</span>
                </div>

                {/* Filters */}
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
                                className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border overflow-hidden flex items-center justify-center p-2 relative group cursor-pointer ${videoMap[item.file] && videoMap[item.file].length > 0 ? 'border-green-400 border-2' : 'border-gray-100'}`}
                            >
                                <img
                                    src={`/signatures/${item.file}`}
                                    alt={item.file}
                                    className="max-w-full h-auto object-contain"
                                />
                                {/* Admin Labels */}
                                <div className="absolute top-1 left-1 bg-red-600 text-white text-[10px] px-1 rounded opacity-75">
                                    {item.number > 0 ? item.number : 'No Num'}
                                </div>
                                {videoMap[item.file] && videoMap[item.file].length > 0 && (
                                    <div className="absolute top-1 right-1 bg-green-500 text-white text-[10px] px-1 rounded">
                                        🎬 {videoMap[item.file].length}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-500">
                        No signatures found in this range.
                    </div>
                )}
            </main>

            {/* Modal */}
            {selectedImage && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold mb-4">Link Videos to Image</h3>
                        <p className="text-sm text-gray-500 mb-2">File: {selectedImage}</p>
                        <div className="flex justify-center mb-4 bg-gray-100 rounded p-2">
                            <img src={`/signatures/${selectedImage}`} alt="preview" className="max-h-32 object-contain" />
                        </div>

                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Video URLs (Soop VOD)
                        </label>

                        <div className="space-y-4 mb-4">
                            {videoUrls.map((url, idx) => {
                                const videoIdMatch = url.match(/\/(\d+)(\/|$)/);
                                const videoId = videoIdMatch ? videoIdMatch[1] : null;

                                // Try to get from Meta first, or fallback to pattern
                                const metaThumb = selectedImage && videoMetaMap[selectedImage] && videoMetaMap[selectedImage][url]
                                    ? videoMetaMap[selectedImage][url].thumbnail
                                    : null;

                                const thumbUrl = metaThumb || (videoId && videoId.length >= 2
                                    ? `https://video-img.sooplive.co.kr/${videoId.substring(0, 2)}/${videoId}/${videoId}_1_360.jpg`
                                    : null);

                                return (
                                    <div key={idx} className="flex flex-col gap-1 border p-2 rounded bg-gray-50">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={url}
                                                onChange={(e) => updateUrlField(idx, e.target.value)}
                                                placeholder="https://vod.afreecatv.com/..."
                                                className="flex-1 border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-pink-500 outline-none text-black text-sm"
                                            />
                                            <button
                                                onClick={() => removeUrlField(idx)}
                                                className="text-red-500 hover:bg-red-50 px-2 rounded font-bold"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        {thumbUrl && (
                                            <div className="relative w-32 h-18 bg-black rounded overflow-hidden shadow-sm">
                                                <img src={thumbUrl} alt="Video Thumbnail" className="w-full h-full object-cover" />
                                                <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[9px] px-1">Preview</div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            <button
                                onClick={addUrlField}
                                className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded hover:border-pink-300 hover:text-pink-500 transition-colors text-sm font-bold"
                            >
                                + Add Another Video
                            </button>
                        </div>

                        <div className="flex gap-2 justify-end pt-4 border-t">
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveVideo}
                                className="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 font-bold"
                            >
                                Save All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}
