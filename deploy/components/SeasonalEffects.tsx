"use client";

import { useEffect, useState, useRef } from "react";
import { FaMusic, FaSnowflake, FaTimes, FaVolumeUp, FaVolumeMute, FaPause, FaPlay } from "react-icons/fa";

export default function SeasonalEffects() {
    const [isVisible, setIsVisible] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false); // Start as unmuted
    const [showPlayer, setShowPlayer] = useState(true);
    const playerRef = useRef<any>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Date Check & YouTube API Load
    useEffect(() => {
        const checkDate = () => {
            const now = new Date();
            const endDate = new Date('2025-12-26T23:59:59');
            if (now <= endDate) {
                setIsVisible(true);
            }
        };
        checkDate();
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        // Define global callback
        // @ts-ignore
        window.onYouTubeIframeAPIReady = () => {
            // @ts-ignore
            playerRef.current = new window.YT.Player('youtube-player', {
                height: '0',
                width: '0',
                videoId: 'AT164bKMS9E',
                playerVars: {
                    'playsinline': 1,
                    // 'list': 'RDAT164bKMS9E', // Removed to force single video loop
                    // 'listType': 'playlist',
                    'autoplay': 1,
                    'mute': 0,
                    'controls': 0,
                    'loop': 1,
                    'playlist': 'AT164bKMS9E', // Required for looping single video in IFrame API
                    'disablekb': 1,
                    'fs': 0
                },
                events: {
                    'onReady': (event: any) => {
                        event.target.setVolume(50);
                        event.target.playVideo();
                    },
                    'onStateChange': (event: any) => {
                        // 1 = Playing, 2 = Paused, 0 = Ended
                        if (event.data === 1) {
                            setIsPlaying(true);
                        } else if (event.data === 2) {
                            setIsPlaying(false);
                        } else if (event.data === 0) {
                            // Manual Loop: If ended, play again (Backup)
                            event.target.playVideo();
                        }
                    }
                }
            });
        };

        return () => {
            // @ts-ignore
            if (window.onYouTubeIframeAPIReady) window.onYouTubeIframeAPIReady = undefined;
        };
    }, [isVisible]);

    // Handle User Interaction to Unlock Audio (Browser Policy)
    useEffect(() => {
        if (!isVisible) return;

        const handleInteraction = () => {
            if (playerRef.current && typeof playerRef.current.getPlayerState === 'function') {
                const state = playerRef.current.getPlayerState();
                // If not playing (unstarted: -1, ended: 0, paused: 2, cued: 5)
                if (state !== 1 && state !== 3) {
                    playerRef.current.unMute();
                    playerRef.current.playVideo();
                    setIsMuted(false);
                }
            }
            // Remove listeners after first attempt
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
        };

        window.addEventListener('click', handleInteraction);
        window.addEventListener('keydown', handleInteraction);
        window.addEventListener('touchstart', handleInteraction);

        return () => {
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
        };
    }, [isVisible]);

    // Snow Effect
    useEffect(() => {
        if (!isVisible || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        // Speed: s (0.5 to 1.5 pixels per frame - very slow and gentle)
        const snowflakes: { x: number; y: number; r: number; s: number }[] = [];
        const maxFlakes = 100;

        for (let i = 0; i < maxFlakes; i++) {
            snowflakes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                r: Math.random() * 3 + 1, // Radius 1-4px
                s: Math.random() * 1 + 0.5 // Speed 0.5-1.5
            });
        }

        function draw() {
            if (!ctx) return;
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.beginPath();
            for (let i = 0; i < maxFlakes; i++) {
                const f = snowflakes[i];
                ctx.moveTo(f.x, f.y);
                ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2, true);
            }
            ctx.fill();
            move();
        }

        let angle = 0;
        function move() {
            angle += 0.01;
            for (let i = 0; i < maxFlakes; i++) {
                const f = snowflakes[i];
                // Gentle fall
                f.y += f.s;
                // Gentle sway
                f.x += Math.sin(angle + f.r) * 0.5;

                if (f.y > height) {
                    snowflakes[i] = { x: Math.random() * width, y: -5, r: f.r, s: f.s };
                }
                if (f.x > width) {
                    snowflakes[i].x = 0;
                } else if (f.x < 0) {
                    snowflakes[i].x = width;
                }
            }
        }

        let animationFrameId: number;
        const render = () => {
            draw();
            animationFrameId = requestAnimationFrame(render);
        };
        render();

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
        };
    }, [isVisible]);

    const togglePlay = () => {
        if (!playerRef.current) return;
        if (isPlaying) {
            playerRef.current.pauseVideo();
        } else {
            playerRef.current.playVideo();
        }
    };

    const toggleMute = () => {
        if (!playerRef.current) return;
        if (isMuted) {
            playerRef.current.unMute();
        } else {
            playerRef.current.mute();
        }
        setIsMuted(!isMuted);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden font-sans">
            {/* Snow Canvas */}
            <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full opacity-60" />

            {/* YouTube Player - Hidden */}
            <div id="youtube-player" className="absolute top-0 left-0 opacity-0 pointer-events-none w-0 h-0" />

            {/* Music Player Widget */}
            <div className="fixed bottom-6 right-6 pointer-events-auto flex items-end gap-2">
                {showPlayer ? (
                    <div className="bg-black/80 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-xl animate-in slide-in-from-bottom-5 text-white w-72">
                        <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                            <div className="flex items-center gap-2 text-sm font-bold text-pink-300">
                                <FaSnowflake className="animate-spin-slow" />
                                <span>Winter Special</span>
                            </div>
                            <button onClick={() => setShowPlayer(false)} className="text-white/50 hover:text-white">
                                <FaTimes size={12} />
                            </button>
                        </div>

                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-xl shadow-lg shrink-0 relative overflow-hidden">
                                <img
                                    src="https://img.youtube.com/vi/AT164bKMS9E/mqdefault.jpg"
                                    className="absolute w-full h-full object-cover opacity-80"
                                    alt="cover"
                                />
                                <FaMusic className="text-white relative z-10 drop-shadow-md" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <div className={`text-sm font-medium whitespace-nowrap ${isPlaying ? 'animate-marquee' : ''}`}>
                                    Essential Jazz Christmas
                                </div>
                                <div className="text-xs text-white/50 flex items-center gap-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                                    <span>{isPlaying ? (isMuted ? "Playing (Muted)" : "Playing") : "Paused"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                            <button
                                onClick={toggleMute}
                                className={`p-2 rounded-full transition-colors ${isMuted ? 'bg-red-500/20 text-red-400' : 'hover:bg-white/10'}`}
                                title={isMuted ? "Unmute" : "Mute"}
                            >
                                {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
                            </button>

                            <button
                                onClick={togglePlay}
                                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
                            >
                                {isPlaying ? <FaPause size={14} /> : <FaPlay size={14} className="ml-1" />}
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowPlayer(true)}
                        className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform animate-bounce-slow"
                        title="Music Player"
                    >
                        <FaMusic />
                    </button>
                )}
            </div>

            <style jsx>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
                .animate-bounce-slow {
                    animation: bounce 3s infinite;
                }
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-100%); }
                }
            `}</style>
        </div>
    );
}
