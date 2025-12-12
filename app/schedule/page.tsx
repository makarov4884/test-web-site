"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, subMonths, addMonths } from "date-fns";
import { FaChevronLeft, FaChevronRight, FaPlus, FaTrash, FaCalendarAlt } from "react-icons/fa";
import { getSchedules, addSchedule, deleteSchedule, getStreamers, type ScheduleItem } from "../actions";
import { getSession, type UserSession } from "../auth-actions";
import { cn } from "@/lib/utils";

export default function SchedulePage() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [user, setUser] = useState<UserSession | null>(null);
    const [canEdit, setCanEdit] = useState(false);

    const [newItemContent, setNewItemContent] = useState("");
    const [newItemType, setNewItemType] = useState<'normal' | 'event' | 'rest'>('normal');

    // Load Schedules
    const fetchSchedules = async () => {
        const data = await getSchedules();
        setSchedules(data);
    };

    useEffect(() => {
        fetchSchedules();

        // Check if user is logged in and is a registered streamer
        const checkAuth = async () => {
            const session = await getSession();
            setUser(session);

            if (session) {
                const streamers = await getStreamers();
                const isRegistered = streamers.some(s => s.bjId === session.id || s.id === session.id);
                setCanEdit(isRegistered);
            }
        };

        checkAuth();
    }, []);

    const handleAddSchedule = async () => {
        if (!newItemContent.trim()) return;
        if (!canEdit) {
            alert("일정을 추가할 권한이 없습니다.");
            return;
        }

        await addSchedule({
            date: format(selectedDate, 'yyyy-MM-dd'),
            content: newItemContent,
            type: newItemType,
            authorId: user?.nickname || user?.id || 'Anonymous'
        });

        setNewItemContent("");
        fetchSchedules();
    };

    const handleDelete = async (id: string) => {
        if (!canEdit) {
            alert("일정을 삭제할 권한이 없습니다.");
            return;
        }
        await deleteSchedule(id);
        fetchSchedules();
    };

    // Calendar Logic
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
        for (let i = 0; i < 7; i++) {
            formattedDate = format(day, "d");
            const cloneDay = day;

            const daySchedules = schedules.filter(s => s.date === format(cloneDay, 'yyyy-MM-dd'));
            const hasEvent = daySchedules.some(s => s.type === 'event');
            const hasRest = daySchedules.some(s => s.type === 'rest');

            days.push(
                <div
                    key={day.toString()}
                    className={cn(
                        "min-h-[100px] border border-pink-200 p-2 relative cursor-pointer transition-colors hover:bg-pink-50",
                        !isSameMonth(day, monthStart) ? "bg-gray-100 text-gray-400" : "bg-white text-gray-700",
                        isSameDay(day, selectedDate) ? "ring-2 ring-pink-400 bg-pink-100" : ""
                    )}
                    onClick={() => setSelectedDate(cloneDay)}
                >
                    <div className="flex justify-between items-start">
                        <span className="text-sm font-bold">{formattedDate}</span>
                        <div className="flex gap-1">
                            {hasEvent && <span className="w-2 h-2 rounded-full bg-purple-500"></span>}
                            {hasRest && <span className="w-2 h-2 rounded-full bg-gray-400"></span>}
                            {!hasEvent && !hasRest && daySchedules.length > 0 && <span className="w-2 h-2 rounded-full bg-cyan-400"></span>}
                        </div>
                    </div>

                    <div className="mt-2 space-y-1">
                        {daySchedules.slice(0, 3).map((s, idx) => (
                            <div key={idx} className={cn(
                                "text-[10px] truncate px-1 py-0.5 rounded",
                                s.type === 'rest' ? 'bg-gray-200 text-gray-600' :
                                    s.type === 'event' ? 'bg-purple-100 text-purple-700' : 'bg-cyan-100 text-cyan-700'
                            )}>
                                {s.content}
                            </div>
                        ))}
                        {daySchedules.length > 3 && <div className="text-[10px] text-gray-500">+{daySchedules.length - 3} more</div>}
                    </div>
                </div>
            );
            day = addDays(day, 1);
        }
        rows.push(
            <div className="grid grid-cols-7 gap-1" key={day.toString()}>
                {days}
            </div>
        );
        days = [];
    }

    const selectedDaySchedules = schedules.filter(s => s.date === format(selectedDate, 'yyyy-MM-dd'));

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-pink-50 to-purple-50 flex flex-col font-sans">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-12">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold flex items-center gap-2 text-gray-800">
                        <FaCalendarAlt className="text-pink-500" />
                        방송 일정
                    </h1>
                    {user && canEdit && (
                        <div className="px-4 py-2 bg-pink-100 text-pink-700 rounded-lg text-sm font-bold border border-pink-300">
                            편집 가능 ({user.nickname || user.id})
                        </div>
                    )}
                    {user && !canEdit && (
                        <div className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">
                            읽기 전용
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Calendar Side */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold font-mono text-gray-800">
                                {format(currentMonth, 'MMMM yyyy')}
                            </h2>
                            <div className="flex gap-2">
                                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-pink-100 rounded-full text-gray-700"><FaChevronLeft /></button>
                                <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1 text-sm bg-pink-100 text-pink-700 rounded hover:bg-pink-200">Today</button>
                                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-pink-100 rounded-full text-gray-700"><FaChevronRight /></button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-1 mb-2 text-center text-sm font-bold text-gray-600">
                            <div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div><div>SUN</div>
                        </div>
                        <div className="space-y-1">
                            {rows}
                        </div>
                    </div>

                    {/* Editor Side */}
                    {canEdit ? (
                        <div className="space-y-6">
                            <div className="p-6 rounded-2xl bg-white border border-pink-200 shadow-xl">
                                <h3 className="text-lg font-bold mb-1 flex items-center justify-between text-gray-800">
                                    <span>{format(selectedDate, 'yyyy.MM.dd (eee)')}</span>
                                    <span className="text-xs font-normal text-gray-500">작성: {user?.nickname || user?.id}</span>
                                </h3>
                                <p className="text-sm text-gray-600 mb-6">새로운 일정을 추가하세요</p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">내용</label>
                                        <input
                                            type="text"
                                            className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-200 transition-colors"
                                            placeholder="방송 컨텐츠 내용 입력..."
                                            value={newItemContent}
                                            onChange={(e) => setNewItemContent(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">타입</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                onClick={() => setNewItemType('normal')}
                                                className={cn("py-2 rounded-lg text-sm font-medium border transition-colors", newItemType === 'normal' ? "border-cyan-400 bg-cyan-100 text-cyan-700" : "border-gray-300 hover:bg-gray-50 text-gray-700")}
                                            >
                                                방송
                                            </button>
                                            <button
                                                onClick={() => setNewItemType('event')}
                                                className={cn("py-2 rounded-lg text-sm font-medium border transition-colors", newItemType === 'event' ? "border-purple-400 bg-purple-100 text-purple-700" : "border-gray-300 hover:bg-gray-50 text-gray-700")}
                                            >
                                                이벤트/합방
                                            </button>
                                            <button
                                                onClick={() => setNewItemType('rest')}
                                                className={cn("py-2 rounded-lg text-sm font-medium border transition-colors", newItemType === 'rest' ? "border-gray-400 bg-gray-200 text-gray-700" : "border-gray-300 hover:bg-gray-50 text-gray-700")}
                                            >
                                                휴방
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleAddSchedule}
                                        className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        <FaPlus /> 일정 추가
                                    </button>
                                </div>
                            </div>

                            {/* List for chosen day */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-sm text-gray-700">선택한 날짜의 일정</h4>
                                {selectedDaySchedules.length > 0 ? (
                                    selectedDaySchedules.map(item => (
                                        <div key={item.id} className="p-4 rounded-xl bg-white border border-pink-200 flex items-center justify-between group shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-2 h-10 rounded-full",
                                                    item.type === 'rest' ? "bg-gray-400" :
                                                        item.type === 'event' ? "bg-purple-500" : "bg-cyan-500"
                                                )}></div>
                                                <div>
                                                    <div className="font-medium text-gray-800">{item.content}</div>
                                                    <div className="text-xs text-gray-500 flex gap-2">
                                                        <span>{item.type.toUpperCase()}</span>
                                                        <span>•</span>
                                                        <span>{item.authorId}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-xl bg-gray-50">
                                        일정이 없습니다.
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="p-6 rounded-2xl bg-zinc-900 border border-white/10 shadow-xl text-center">
                                <h3 className="text-lg font-bold mb-2">{format(selectedDate, 'yyyy.MM.dd (eee)')}</h3>
                                <p className="text-sm text-zinc-500 mb-4">일정을 추가하려면 로그인이 필요합니다.</p>
                                <p className="text-xs text-zinc-600">등록된 스트리머만 일정을 수정할 수 있습니다.</p>
                            </div>

                            {/* List for chosen day - read only */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-sm text-zinc-400">선택한 날짜의 일정</h4>
                                {selectedDaySchedules.length > 0 ? (
                                    selectedDaySchedules.map(item => (
                                        <div key={item.id} className="p-4 rounded-xl bg-zinc-900 border border-white/5 flex items-center gap-3">
                                            <div className={cn("w-2 h-10 rounded-full",
                                                item.type === 'rest' ? "bg-zinc-600" :
                                                    item.type === 'event' ? "bg-violet-500" : "bg-indigo-500"
                                            )}></div>
                                            <div>
                                                <div className="font-medium text-zinc-200">{item.content}</div>
                                                <div className="text-xs text-muted-foreground flex gap-2">
                                                    <span>{item.type.toUpperCase()}</span>
                                                    <span>•</span>
                                                    <span>{item.authorId}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-zinc-600 border border-dashed border-white/5 rounded-xl">
                                        일정이 없습니다.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
