"use client";

import { useState, useEffect } from "react";
import { FaTrash, FaPlus, FaSync, FaChartBar, FaLock } from "react-icons/fa";
import { getStreamers, addStreamer, removeStreamer, type Streamer } from "../actions";

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [authError, setAuthError] = useState("");
    const [streamers, setStreamers] = useState<Streamer[]>([]);
    const [newId, setNewId] = useState("");
    const [newName, setNewName] = useState("");
    const [isUpdatingStats, setIsUpdatingStats] = useState(false);
    const [updateMessage, setUpdateMessage] = useState("");

    const refreshList = async () => {
        const list = await getStreamers();
        setStreamers(list);
    };

    useEffect(() => {
        // 세션 스토리지에서 인증 상태 확인
        const authenticated = sessionStorage.getItem('admin_authenticated');
        if (authenticated === 'true') {
            setIsAuthenticated(true);
            refreshList();
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await fetch('/api/admin/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            if (data.success) {
                setIsAuthenticated(true);
                sessionStorage.setItem('admin_authenticated', 'true');
                setAuthError("");
                refreshList();
            } else {
                setAuthError("비밀번호가 올바르지 않습니다.");
                setPassword("");
            }
        } catch (error) {
            setAuthError("인증 중 오류가 발생했습니다.");
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        sessionStorage.removeItem('admin_authenticated');
        setPassword("");
    };

    // 로그인하지 않은 경우 로그인 화면 표시
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                            <FaLock className="text-purple-600 text-2xl" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin 로그인</h1>
                        <p className="text-gray-600">관리자 페이지에 접근하려면 비밀번호를 입력하세요</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                비밀번호
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="비밀번호 입력"
                                autoFocus
                            />
                        </div>

                        {authError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {authError}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
                        >
                            로그인
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const handleAdd = async () => {
        if (!newId) return;
        try {
            await addStreamer(newId, newName || newId);
            setNewId("");
            setNewName("");
            refreshList();
        } catch (e: any) {
            alert("Failed to add or already exists: " + e.message);
        }
    };

    const handleDelete = async (docId: string) => {
        if (confirm("삭제하시겠습니까?")) {
            await removeStreamer(docId);
            refreshList();
        }
    };

    const handleUpdateStats = async () => {
        setIsUpdatingStats(true);
        setUpdateMessage("통계 업데이트 중...");

        try {
            const response = await fetch('/api/update-stats', { method: 'POST' });
            const data = await response.json();

            if (response.ok) {
                setUpdateMessage(`✅ ${data.message || '통계 업데이트 완료!'}`);
            } else {
                setUpdateMessage(`❌ 오류: ${data.error || '알 수 없는 오류'}`);
            }
        } catch (error) {
            setUpdateMessage("❌ 통계 업데이트 실패");
        } finally {
            setIsUpdatingStats(false);
            setTimeout(() => setUpdateMessage(""), 5000);
        }
    };

    // 인증된 경우 Admin 페이지 표시
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Admin Dashboard
                    </h1>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        로그아웃
                    </button>
                </div>

                {/* 통계 업데이트 섹션 */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-purple-100">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <FaChartBar className="text-purple-600" />
                        통계 관리
                    </h2>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleUpdateStats}
                            disabled={isUpdatingStats}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <FaSync className={isUpdatingStats ? "animate-spin" : ""} />
                            {isUpdatingStats ? "업데이트 중..." : "통계 업데이트"}
                        </button>
                        {updateMessage && (
                            <span className="text-sm text-gray-700">{updateMessage}</span>
                        )}
                    </div>
                </div>

                {/* 스트리머 관리 섹션 */}
                <div className="bg-white rounded-2xl shadow-xl p-6 border border-purple-100">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">스트리머 관리</h2>

                    {/* 추가 폼 */}
                    <div className="flex gap-3 mb-6">
                        <input
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="BJ ID (예: pyh3646)"
                            value={newId}
                            onChange={(e) => setNewId(e.target.value)}
                        />
                        <input
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="이름 (선택)"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                        <button
                            onClick={handleAdd}
                            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg flex items-center gap-2"
                        >
                            <FaPlus /> 추가
                        </button>
                    </div>

                    {/* 스트리머 목록 */}
                    <div className="space-y-2">
                        {streamers.map((s) => (
                            <div
                                key={s.id}
                                className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 hover:border-purple-300 transition-colors"
                            >
                                <div>
                                    <span className="font-semibold text-gray-800">{s.name}</span>
                                    <span className="text-gray-500 ml-3">({s.bjId})</span>
                                </div>
                                <button
                                    onClick={() => handleDelete(s.id)}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                                >
                                    <FaTrash /> 삭제
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
