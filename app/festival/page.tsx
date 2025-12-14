'use client';

import { FaStar } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

export default function FestivalPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
            <div className="container mx-auto px-4 py-16">
                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="mb-8 text-gray-600 hover:text-pink-600 transition-colors flex items-center gap-2"
                >
                    ← 뒤로가기
                </button>

                {/* Main Content */}
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-3xl border border-pink-200 p-16 text-center shadow-2xl">
                        {/* Icon */}
                        <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center mb-8 animate-pulse">
                            <FaStar className="text-pink-400" size={60} />
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">
                            페스티벌
                        </h1>

                        {/* Message */}
                        <p className="text-gray-500 text-xl mb-8">
                            추후 업데이트 예정입니다
                        </p>

                        {/* Decorative Line */}
                        <div className="w-24 h-1 bg-gradient-to-r from-pink-400 to-purple-400 mx-auto rounded-full"></div>

                        {/* Additional Info */}
                        <p className="text-gray-400 text-sm mt-8">
                            더 나은 서비스로 찾아뵙겠습니다
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
