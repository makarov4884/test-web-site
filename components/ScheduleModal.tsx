"use client";

import { useState } from "react";
import { ScheduleItem } from "../app/actions";
import { FaTimes, FaCalendarAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

interface ScheduleModalProps {
    date: string; // MM.DD (or full date string)
    schedules: ScheduleItem[];
    isOpen: boolean;
    onClose: () => void;
}

export default function ScheduleModal({ date, schedules, isOpen, onClose }: ScheduleModalProps) {
    // Parsing date from "12.11" format for display is a bit tricky if year is missing, but homepage passes formatted string.
    // We can just display what is passed or parse it more robustly.

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
                    >
                        <div className="bg-zinc-900 border border-white/10 w-full max-w-md p-6 rounded-3xl shadow-2xl pointer-events-auto mx-4 relative overflow-hidden">
                            {/* Decorative Gradient Blob */}
                            <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl pointer-events-none"></div>

                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <FaCalendarAlt className="text-violet-400" />
                                    {date} 일정
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                {schedules.length > 0 ? (
                                    schedules.map((schedule) => (
                                        <div key={schedule.id} className="p-4 rounded-xl bg-black/40 border border-white/5 hover:border-violet-500/30 transition-colors">
                                            <div className="flex items-start justify-between mb-2">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${schedule.type === 'rest' ? 'bg-zinc-800 text-zinc-400' :
                                                    schedule.type === 'event' ? 'bg-violet-500 text-white' :
                                                        'bg-indigo-500/20 text-indigo-300'
                                                    }`}>
                                                    {schedule.type === 'rest' ? '휴방' : schedule.type === 'event' ? 'EVENT' : '방송'}
                                                </span>
                                            </div>
                                            <p className="text-white text-lg font-medium leading-relaxed">{schedule.content}</p>
                                            <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-xs text-muted-foreground">
                                                <div className="w-5 h-5 rounded-full bg-zinc-700"></div> {/* Avatar Placeholder */}
                                                <span>작성자: {schedule.authorId}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-muted-foreground bg-white/5 rounded-xl border border-dashed border-white/10">
                                        등록된 일정이 없습니다.
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 text-center">
                                <button onClick={onClose} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-colors">
                                    닫기
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
