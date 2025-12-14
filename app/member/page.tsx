"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useState } from "react";

// Member definition with approximate positions
interface MemberPosition {
    id: string; // AfreecaTV ID
    name: string; // Display Name (for tooltip/debug)
    top: string; // %
    left: string; // %
    width: string; // %
    height: string; // %
    url?: string; // Optional custom URL override
}

// Configuration based on the provided image layout
// Row 1: Jinu (Big Left) + 12 Members
// Row 2: 13 positions (11 members + 2 placeholders)
const MEMBERS: MemberPosition[] = [
    // --- ROW 1 ---
    { id: "pyh3646", name: "박진우", top: "10%", left: "2%", width: "12%", height: "40%" }, // Representative

    // Starting from Angchu (~15%) to Hanbit (~95%) -> ~6.5% each
    { id: "ang1117", name: "앙츄", top: "15%", left: "15%", width: "6%", height: "25%" },
    { id: "raming01", name: "가람", top: "15%", left: "21.5%", width: "6%", height: "25%" },
    { id: "2boo2boo", name: "뚜부", top: "15%", left: "28%", width: "6%", height: "25%" },
    { id: "j99063", name: "다우닝", top: "15%", left: "34.5%", width: "6%", height: "25%" },
    { id: "seulpang2", name: "하온", top: "15%", left: "41%", width: "6%", height: "25%" },
    { id: "wlls232", name: "요하정", top: "15%", left: "47.5%", width: "6%", height: "25%" },
    { id: "xjdhddl", name: "금별", top: "15%", left: "54%", width: "6%", height: "25%" },
    { id: "sky0525m", name: "진매", top: "15%", left: "60.5%", width: "6%", height: "25%" },
    { id: "seeun0427", name: "세은", top: "15%", left: "67%", width: "6%", height: "25%" },
    { id: "ch77667766", name: "먼지", top: "15%", left: "73.5%", width: "6%", height: "25%" },
    { id: "ji2b90", name: "제나", top: "15%", left: "80%", width: "6%", height: "25%" },
    { id: "gksapdlf", name: "한빛", top: "15%", left: "86.5%", width: "6%", height: "25%" },

    // --- ROW 2 ---
    // Starts from Left (~5%)
    // Park Ajin, Baekmansong, Misonyang, Soso, Dooni, Dusiang, Pangrin, Kkamang, Danyang, Choikkaebi, Unjaekun
    { id: "hjchu5871", name: "박아진", top: "65%", left: "4%", width: "6%", height: "25%" },
    { id: "20000song", name: "백만송", top: "65%", left: "11%", width: "6%", height: "25%" },
    { id: "miso0309xx", name: "미소냥", top: "65%", left: "18%", width: "6%", height: "25%" },
    { id: "soso99u", name: "소소", top: "65%", left: "25%", width: "6%", height: "25%" },
    { id: "doon98", name: "두니", top: "65%", left: "32%", width: "6%", height: "25%" },
    { id: "krkdrudwn77", name: "두시앙", top: "65%", left: "39%", width: "6%", height: "25%" },
    { id: "nqorfls1231", name: "팡린", top: "65%", left: "46%", width: "6%", height: "25%" },
    { id: "kkimkin0326", name: "까망", top: "65%", left: "53%", width: "6%", height: "25%" },
    { id: "danang1004", name: "다냥", top: "65%", left: "60%", width: "6%", height: "25%" },
    { id: "sunwo2534", name: "최깨비", top: "65%", left: "67%", width: "6%", height: "25%" },
    { id: "mjhdjddk77", name: "운재쿤", top: "65%", left: "74%", width: "6%", height: "25%" },

    // Who's & Next (Non-clickable or special?)
    // Let's make them non-clickable for now or just generic link
];

export default function MemberPage() {
    const [debug, setDebug] = useState(false); // Toggle to see hitboxes

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-pink-50 to-purple-50 flex flex-col font-sans">
            <Header />
            <main className="flex-1 flex flex-col items-center justify-center p-4 bg-transparent">

                {/* Image Container */}
                <div className="relative w-full max-w-[1400px] shadow-2xl rounded-xl overflow-hidden group">
                    <img
                        src="/images/team_jinu_members.jpg"
                        alt="Team JINU Members"
                        className="w-full h-auto object-cover select-none"
                    />

                    {/* Interactive Overlay */}
                    {MEMBERS.map((member) => (
                        <Link
                            key={member.id}
                            href={`/member/${member.id}`}
                            className={`absolute block transition-all hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] rounded-lg cursor-pointer ${debug ? 'bg-red-500/30 border border-red-500' : ''}`}
                            style={{
                                top: member.top,
                                left: member.left,
                                width: member.width,
                                height: member.height,
                            }}
                            title={`${member.name} 분석 페이지 보기`}
                        >
                            <span className="sr-only">{member.name}</span>
                        </Link>
                    ))}

                    {/* Debug Toggle (Hidden in production or bottom corner) */}
                    <button
                        onClick={() => setDebug(!debug)}
                        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white/20 hover:text-white bg-black/50 px-2 py-1 rounded"
                    >
                        {debug ? "영역 숨기기" : "영역 보기"}
                    </button>
                </div>

                <div className="mt-8 text-center text-gray-500 text-sm">
                    <p>멤버 사진을 클릭하면 상세 분석 데이터를 확인할 수 있습니다.</p>
                </div>
            </main>
            <Footer />
        </div>
    );
}
