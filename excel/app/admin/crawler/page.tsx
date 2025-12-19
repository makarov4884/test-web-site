'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CrawlerControlPage() {
    const [isOn, setIsOn] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, 3000); // 3초마다 상태 확인
        return () => clearInterval(interval);
    }, []);

    const checkStatus = async () => {
        try {
            const res = await fetch('/api/admin/crawler-status');
            const data = await res.json();
            setIsOn(data.isOn);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const toggleCrawler = async (action: 'on' | 'off') => {
        setLoading(true);
        try {
            await fetch('/api/admin/crawler-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
            await checkStatus();
        } catch (e) {
            alert('오류 발생');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-8">
            <h1 className="text-4xl font-bold mb-10">크롤러 제어 센터</h1>

            <div className={`p-10 rounded-2xl shadow-2xl flex flex-col items-center gap-6 border-4 ${isOn ? 'border-green-500 bg-green-900/20' : 'border-red-500 bg-red-900/20'}`}>
                <div className="text-2xl font-semibold">
                    현재 상태:
                    <span className={`ml-3 text-4xl ${isOn ? 'text-green-400' : 'text-red-400'}`}>
                        {isOn ? '작동 중 (ON)' : '중지됨 (OFF)'}
                    </span>
                </div>

                <div className="flex gap-6 mt-4">
                    <button
                        onClick={() => toggleCrawler('on')}
                        disabled={isOn || loading}
                        className={`w-40 h-16 text-xl font-bold rounded-lg transition-all ${isOn
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-500 text-white shadow-lg hover:shadow-green-500/50'
                            }`}
                    >
                        시작 (ON)
                    </button>

                    <button
                        onClick={() => toggleCrawler('off')}
                        disabled={!isOn || loading}
                        className={`w-40 h-16 text-xl font-bold rounded-lg transition-all ${!isOn
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-500 text-white shadow-lg hover:shadow-red-500/50'
                            }`}
                    >
                        중지 (OFF)
                    </button>
                </div>

                <p className="text-gray-400 text-sm max-w-md text-center mt-2">
                    * '시작'을 누르면 즉시 수집을 시작하며, '중지'를 누르면 현재 작업을 마치고 대기 상태로 전환됩니다.
                </p>
            </div>

            <div className="mt-12 flex gap-4">
                <Link href="/" className="px-6 py-3 bg-gray-700 rounded hover:bg-gray-600 text-lg">
                    메인으로
                </Link>
                <Link href="/admin/sync" className="px-6 py-3 bg-gray-700 rounded hover:bg-gray-600 text-lg">
                    데이터 관리
                </Link>
            </div>
        </div>
    );
}
