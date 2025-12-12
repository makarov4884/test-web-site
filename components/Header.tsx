"use client";
import Link from 'next/link';
import { FaSearch, FaBell, FaUser, FaBars, FaTimes, FaBullhorn, FaPen, FaComment } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import LoginModal from './LoginModal';
import { getSession, logout, type UserSession } from '@/app/auth-actions';

interface Notification {
    id: string;
    type: 'notice' | 'post' | 'comment';
    title: string;
    content: string;
    author: string;
    date: string;
    link: string;
}

export default function Header() {
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [user, setUser] = useState<UserSession | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isNotiOpen, setIsNotiOpen] = useState(false);
    const [hasNewNoti, setHasNewNoti] = useState(false);

    const checkSession = async () => {
        const session = await getSession();
        setUser(session);
    };

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();

                // Deduplicate notifications
                const uniqueData = Array.from(new Map(data.map((n: any) => [n.id, n])).values());

                setNotifications(uniqueData as Notification[]);
                if (uniqueData.length > 0) {
                    // Simple logic: if data exists, show badge. 
                    // Ideally we should compare with 'last read' time from localStorage.
                    const lastRead = localStorage.getItem('lastReadNotiTime');
                    if (!lastRead || new Date(data[0].date).getTime() > new Date(lastRead).getTime()) {
                        setHasNewNoti(true);
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        checkSession();
        fetchNotifications();

        // Poll for notifications every minute
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleLoginSuccess = async (id: string) => {
        // Wait a bit for session to be created, then refresh
        setTimeout(async () => {
            await checkSession();
        }, 500);
    };

    const handleLogout = async () => {
        await logout();
        setUser(null);
    };

    const handleNotiClick = () => {
        setIsNotiOpen(!isNotiOpen);
        if (!isNotiOpen && notifications.length > 0) {
            setHasNewNoti(false);
            localStorage.setItem('lastReadNotiTime', new Date().toISOString());
        }
    };

    const navItems = [
        { name: '홈', href: '/' },
        { name: '멤버', href: '/member' },
        { name: '방송일정', href: '/schedule' },
        { name: '자유 게시판', href: '/board/free' },
        { name: '랭킹', href: '/ranking' },
        { name: '공지사항', href: '/notice' },
        { name: '시그니처', href: '/signature' },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b border-pink-200/30 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-4">
                    <button
                        className="md:hidden p-2 hover:bg-pink-50 rounded-md text-gray-700"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <FaTimes /> : <FaBars />}
                    </button>
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:shadow-pink-300/50 transition-all">
                            T
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-pink-600 bg-clip-text text-transparent hidden sm:block">
                            Team Jinu
                        </span>
                    </Link>
                </div>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center space-x-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-pink-600 hover:bg-pink-50/50 rounded-md transition-all"
                        >
                            {item.name}
                        </Link>
                    ))}
                </nav>

                {/* Actions */}
                <div className="flex items-center space-x-2 relative">
                    <button className="p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-colors relative group">
                        <FaSearch className="w-5 h-5" />
                        <span className="sr-only">검색</span>
                    </button>

                    {/* Notification Bell */}
                    <div className="relative">
                        <button
                            className="p-2 text-gray-600 hover:text-cyan-600 hover:bg-cyan-50 rounded-full transition-colors relative"
                            onClick={handleNotiClick}
                        >
                            <FaBell className="w-5 h-5" />
                            {hasNewNoti && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>}
                        </button>

                        {/* Dropdown */}
                        {isNotiOpen && (
                            <div className="absolute right-0 mt-2 w-80 bg-white border border-pink-200/40 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                                <div className="p-3 border-b border-pink-100 bg-gradient-to-r from-cyan-50 to-pink-50 backdrop-blur">
                                    <h3 className="font-bold text-sm text-gray-800">알림</h3>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto">
                                    {notifications.length > 0 ? (
                                        notifications.map((noti) => (
                                            <div
                                                key={noti.id}
                                                onClick={() => {
                                                    router.push(noti.link);
                                                    setIsNotiOpen(false);
                                                }}
                                                className="p-3 hover:bg-pink-50/50 cursor-pointer border-b border-pink-100/50 last:border-0 transition-colors flex gap-3 items-start"
                                            >
                                                <div className={cn(
                                                    "mt-1 w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0",
                                                    noti.type === 'notice' ? "bg-cyan-100 text-cyan-600" :
                                                        noti.type === 'post' ? "bg-blue-100 text-blue-600" :
                                                            "bg-green-100 text-green-600"
                                                )}>
                                                    {noti.type === 'notice' && <FaBullhorn size={12} />}
                                                    {noti.type === 'post' && <FaPen size={12} />}
                                                    {noti.type === 'comment' && <FaComment size={12} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-800 truncate">{noti.title}</p>
                                                    <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{noti.content}</p>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <span className="text-[10px] text-gray-500">{noti.author}</span>
                                                        <span className="text-[10px] text-gray-400">•</span>
                                                        <span className="text-[10px] text-gray-500">{new Date(noti.date).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center text-gray-500 text-sm">
                                            새로운 알림이 없습니다.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {user ? (
                        <div className="flex items-center gap-3 ml-2">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-50 to-pink-50 rounded-full border border-pink-200/40">
                                {user.profile_image ? (
                                    <img src={user.profile_image} alt="Profile" className="w-5 h-5 rounded-full" />
                                ) : (
                                    <FaUser className="text-pink-500 w-3 h-3" />
                                )}
                                <span className="text-sm font-bold text-gray-800">{user.nickname || user.id}</span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="text-xs text-gray-500 hover:text-red-500 transition-colors"
                            >
                                로그아웃
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsLoginModalOpen(true)}
                            className="ml-2 px-4 py-2 bg-gradient-to-r from-cyan-400 to-pink-400 text-white text-sm font-medium rounded-full hover:shadow-lg hover:shadow-pink-300/40 transition-all"
                        >
                            로그인
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden border-b border-border/40 bg-background animate-in slide-in-from-top-2">
                    <nav className="flex flex-col p-4 space-y-2">
                        {navItems.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="px-4 py-3 text-sm font-medium hover:bg-accent rounded-md transition-colors text-foreground"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </nav>
                </div>
            )}

            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                onLoginSuccess={handleLoginSuccess}
            />
        </header>
    );
}
