'use client';

import { useState, useEffect } from 'react';

export default function Footer() {
    const [visitors, setVisitors] = useState(0);

    useEffect(() => {
        // 임시 접속자 수 (랜덤 30~150명)
        // 실제 구현을 위해서는 Firebase Realtime Database나 별도 백엔드가 필요합니다.
        setVisitors(Math.floor(Math.random() * (150 - 30) + 30));
    }, []);

    return (
        <footer className="w-full border-t border-pink-200/30 bg-white/50 backdrop-blur-sm py-8 mt-20">
            <div className="container mx-auto px-4 text-center text-sm text-gray-500 font-medium space-y-2">
                <p>&copy; 2024 Team Jinu. All rights reserved.</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                    <span>관리자 이메일: sch4884@naver.com</span>
                    <span className="hidden sm:inline">/</span>
                    <span>
                        현재 접속자수 : <span className="text-pink-600 font-bold">{visitors > 0 ? visitors.toLocaleString() : '...'}</span>명
                    </span>
                </div>
            </div>
        </footer>
    );
}
