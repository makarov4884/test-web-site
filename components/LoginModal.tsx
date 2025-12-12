"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FaTimes, FaShieldAlt, FaExternalLinkAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { generateVerificationCode, verifyStationContent } from "../app/auth-actions";

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: (id: string) => void;
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const [id, setId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [stationCode, setStationCode] = useState("");
    const [isStationCodeGenerated, setIsStationCodeGenerated] = useState(false);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setId("");
            setError("");
            setStationCode("");
            setIsStationCodeGenerated(false);
            setIsLoading(false);
        }
    }, [isOpen]);

    // Station Auth Logic
    const handleGenerateCode = async () => {
        if (!id.trim()) {
            setError("아이디를 입력하세요");
            return;
        }
        setError("");
        setIsLoading(true);
        setStationCode(""); // Clear previous code
        try {
            // Always generate a fresh code
            const res = await generateVerificationCode(id);
            if (res.success && res.code) {
                setStationCode(res.code);
                setIsStationCodeGenerated(true);
            } else {
                setError(res.message || "코드 생성 실패");
            }
        } catch (e) { setError("오류 발생"); }
        setIsLoading(false);
    };

    const handleStationVerify = async () => {
        setError("");
        setIsLoading(true);
        try {
            const res = await verifyStationContent(id);
            if (res.success) {
                onLoginSuccess(id);
                onClose();
            } else {
                setError(res.message || "인증 실패");
            }
        } catch (e) { setError("오류 발생"); }
        setIsLoading(false);
    };

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-[101] overflow-y-auto"
                    >
                        <div
                            className="flex min-h-full items-center justify-center p-4 text-center"
                            onClick={(e) => {
                                if (e.target === e.currentTarget) onClose();
                            }}
                        >
                            <div
                                className="w-full max-w-md transform overflow-hidden rounded-3xl bg-zinc-900 border border-white/10 p-8 text-left align-middle shadow-2xl transition-all relative bg-gradient-to-br from-zinc-900 via-black to-zinc-900 my-8"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Decorative Blob */}
                                <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                            <FaShieldAlt className="text-indigo-500" />
                                            방송국 인증 로그인
                                        </h2>
                                        <p className="text-muted-foreground text-sm mt-1">본인의 아프리카TV 방송국을 통해 인증합니다.</p>
                                    </div>
                                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors"><FaTimes /></button>
                                </div>

                                <div className="space-y-6">
                                    {!isStationCodeGenerated ? (
                                        <>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-zinc-400 ml-1">아프리카TV 아이디</label>
                                                <input
                                                    type="text"
                                                    value={id}
                                                    onChange={(e) => setId(e.target.value)}
                                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 text-white transition-colors"
                                                    placeholder="아이디 입력"
                                                />
                                            </div>
                                            <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
                                                <h4 className="text-blue-400 font-bold text-xs mb-2 flex items-center gap-2">
                                                    ℹ️ 인증 방법
                                                </h4>
                                                <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside">
                                                    <li>아이디를 입력하고 <b>인증번호 발급</b>을 누르세요.</li>
                                                    <li>발급된 코드를 복사하세요.</li>
                                                    <li>방송국 메인 화면의 <b>[방송국명]</b> 또는 <b>[소개글]</b>에 붙여넣고 저장하세요.</li>
                                                    <li>다시 돌아와서 <b>인증하기</b> 버튼을 누르세요.</li>
                                                </ol>
                                            </div>
                                            <button
                                                onClick={() => !isLoading && handleGenerateCode()}
                                                disabled={isLoading}
                                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                                            >
                                                {isLoading ? "생성 중..." : "인증번호 발급받기"}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="space-y-4 text-center">
                                                <div className="text-sm text-zinc-400 leading-relaxed">
                                                    아래 인증코드를 <br />
                                                    <span className="text-indigo-400 font-bold">방송국 메인(소개글/제목)</span>에 포함시켜주세요.
                                                </div>

                                                <div
                                                    className="relative group cursor-pointer"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(stationCode);
                                                        // Optional: Add toast indication could be nice here
                                                    }}
                                                >
                                                    <div className="text-3xl font-black text-white font-mono bg-black/50 py-6 rounded-xl border border-indigo-500/50 tracking-widest select-all hover:bg-black/70 transition-colors">
                                                        {stationCode}
                                                    </div>
                                                    <div className="absolute inset-x-0 -bottom-6 text-[10px] text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        클릭하여 복사
                                                    </div>
                                                </div>

                                                <a
                                                    href={`https://bj.afreecatv.com/${id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 hover:underline mt-2"
                                                >
                                                    내 방송국 바로가기 <FaExternalLinkAlt size={10} />
                                                </a>

                                                <div className="bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20 text-xs text-left text-yellow-200/80 mt-4 leading-relaxed">
                                                    ⚠️ <b>방송국 소개글</b>에 코드가 저장되어 있어야 인증이 완료됩니다. 인증 완료 후 코드는 삭제하셔도 됩니다.
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-3 pt-2">
                                                <button
                                                    onClick={() => !isLoading && handleStationVerify()}
                                                    disabled={isLoading}
                                                    className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                                                >
                                                    {isLoading ? "확인 중..." : "설정 완료, 인증하기"}
                                                </button>
                                                <button
                                                    onClick={() => setIsStationCodeGenerated(false)}
                                                    className="w-full py-3 text-zinc-500 text-sm hover:text-zinc-300 transition-colors"
                                                >
                                                    뒤로가기
                                                </button>
                                            </div>
                                        </>
                                    )}
                                    {error && (
                                        <div className="text-red-500 text-sm text-center bg-red-500/10 py-3 rounded-xl border border-red-500/20 animate-in fade-in slide-in-from-top-1 font-bold">
                                            {error}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
