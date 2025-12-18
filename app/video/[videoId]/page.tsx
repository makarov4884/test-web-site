'use client';

import { useParams, useRouter } from 'next/navigation';
import { IoIosArrowBack } from 'react-icons/io';

export default function VideoPlayerPage() {
    const params = useParams();
    const router = useRouter();
    const videoId = params.videoId as string;

    const videoUrl = `https://vod.sooplive.co.kr/player/${videoId}/catch`;

    return (
        <div className="fixed inset-0 bg-black flex flex-col">
            {/* Back Button */}
            <div className="absolute top-4 left-4 z-50">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-sm"
                >
                    <IoIosArrowBack className="text-xl" />
                    <span>돌아가기</span>
                </button>
            </div>

            {/* Video Player */}
            <iframe
                src={videoUrl}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video Player"
            />
        </div>
    );
}
