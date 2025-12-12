"use client";

import { useState, useEffect } from "react";
import { FaTrash, FaPlus, FaSync, FaChartBar } from "react-icons/fa";
import { getStreamers, addStreamer, removeStreamer, type Streamer } from "../actions";

export default function AdminPage() {
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
        refreshList();
    }, []);

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
                setUpdateMessage(`✅ ${data.updated || streamers.length}명의 스트리머 통계가 업데이트되었습니다.`);
            } else {
                setUpdateMessage(`⚠️ ${data.message || '업데이트 실패'}`);
            }
        } catch (error) {
            setUpdateMessage(`❌ 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        } finally {
            setIsUpdatingStats(false);
            setTimeout(() => setUpdateMessage(""), 5000);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-pink-50 to-purple-50 p-8">
            <div className="max-w-2xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold text-gray-800">Admin Streamer Management</h1>

                {/* Stats Update Section */}
                <div className="bg-white border border-pink-200 rounded-xl p-6 space-y-4 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                                <FaChartBar className="text-cyan-600" />
                                통계 업데이트
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                모든 스트리머의 Bcraping 통계를 업데이트합니다 (30분 간격)
                            </p>
                        </div>
                        <button
                            onClick={handleUpdateStats}
                            disabled={isUpdatingStats}
                            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FaSync className={isUpdatingStats ? 'animate-spin' : ''} />
                            {isUpdatingStats ? '업데이트 중...' : '통계 업데이트'}
                        </button>
                    </div>
                    {updateMessage && (
                        <div className={`p-3 rounded-lg text-sm font-medium ${updateMessage.includes('✅') ? 'bg-green-100 text-green-800' :
                            updateMessage.includes('⚠️') ? 'bg-yellow-100 text-yellow-800' :
                                updateMessage.includes('❌') ? 'bg-red-100 text-red-800' :
                                    'bg-blue-100 text-blue-800'
                            }`}>
                            {updateMessage}
                        </div>
                    )}
                </div>

                <div className="bg-white border border-cyan-200 rounded-xl p-6 space-y-4 shadow-lg">
                    <h2 className="text-xl font-semibold text-gray-800">Add New Streamer</h2>
                    <div className="flex gap-4">
                        <input
                            type="text"
                            placeholder="AfreecaTV ID (e.g. glide)"
                            value={newId}
                            onChange={(e) => setNewId(e.target.value)}
                            className="flex-1 px-4 py-2 rounded-lg bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                        />
                        <input
                            type="text"
                            placeholder="Nickname (Optional)"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="flex-1 px-4 py-2 rounded-lg bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                        />
                        <button
                            onClick={handleAdd}
                            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
                        >
                            <FaPlus /> Add
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-800">Registered Streamers ({streamers.length})</h2>
                    <div className="grid gap-2">
                        {streamers.map((s) => (
                            <div key={s.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white hover:shadow-md transition-shadow">
                                <div>
                                    <span className="font-bold text-lg text-gray-800">{s.name}</span>
                                    <span className="text-gray-500 ml-2 text-sm">({s.bjId})</span>
                                </div>
                                <button
                                    onClick={() => handleDelete(s.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <FaTrash />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
