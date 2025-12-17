"use client";

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getStreamers } from "../actions";
import { getLiveStatus, type StreamerInfo } from "@/lib/live-api";
import { useEffect, useState } from "react";
import { FaPlayCircle, FaUser } from 'react-icons/fa';

export default function LivePage() {
    const [liveList, setLiveList] = useState<StreamerInfo[]>([]);

    useEffect(() => {
        const fetchLive = async () => {
            const streamers = await getStreamers();
            const ids = streamers.map(s => s.bjId);
            if (ids.length === 0) return;
            const status = await getLiveStatus(ids);
            setLiveList(status);
        };

        fetchLive();
        const interval = setInterval(fetchLive, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-pink-50 to-purple-50 flex flex-col font-sans">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8 flex items-center gap-3 text-gray-800">
                    <span className="relative flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                    </span>
                    Live Streamers
                </h1>

                {liveList.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 bg-white/60 rounded-2xl border border-gray-200">
                        현재 방송중인 멤버가 없습니다.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {liveList.map((stream) => (
                            <a
                                href={stream.url}
                                target="_blank"
                                rel="noreferrer"
                                key={stream.id}
                                className="group block relative aspect-video rounded-xl overflow-hidden bg-gray-100 border border-pink-200 hover:border-pink-400 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-pink-200/50"
                            >
                                {stream.thumbnail ? (
                                    <img src={stream.thumbnail} alt={stream.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                                        <FaPlayCircle size={40} />
                                    </div>
                                )}

                                <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded">LIVE</div>
                                <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                                    <h3 className="font-bold text-white truncate text-shadow">{stream.title}</h3>
                                    <div className="flex items-center justify-between mt-1 text-xs text-zinc-300">
                                        <div className="flex items-center gap-1">
                                            <span className="font-medium text-pink-300">{stream.nickname}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <FaUser size={10} />
                                            <span>{stream.viewers.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
