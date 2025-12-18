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

interface Video {
    id: string;
    title: string;
    thumbnailUrl: string;
    videoUrl: string;
    category: string;
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

    useEffect(() => {
        fetch('/api/processed-signatures')
            .then(res => res.json())
            .then(data => {
                if (data.images) setImages(data.images);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

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
                <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">Signature Gallery</h1>

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
                                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden flex items-center justify-center p-2 relative group"
                            >
                                <img
                                    src={`/signatures/${item.file}`}
                                    alt={item.file}
                                    className="max-w-full h-auto object-contain"
                                />
                                {/* Optional: Show detected number on hover */}
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

            <Footer />
        </div>
    );
}
