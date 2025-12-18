'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface UnmappedItem {
    messageId: string;
    createDate: string;
    ballonUserName: string;
    ballonCount: number;
    targetBjName: string;
    message: string;
}

export default function MappingPage() {
    const [items, setItems] = useState<UnmappedItem[]>([]);
    const [bjs, setBjs] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [updates, setUpdates] = useState<{ [key: string]: string }>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/mapping');
            const data = await res.json();
            if (data.success) {
                setItems(data.data);
                setBjs(data.bjs);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBjChange = (messageId: string, value: string) => {
        setUpdates(prev => ({
            ...prev,
            [messageId]: value
        }));
    };

    const handleApply = async () => {
        if (Object.keys(updates).length === 0) return;

        if (!confirm(`${Object.keys(updates).length}건의 데이터를 수정하시겠습니까?`)) return;

        try {
            setSaving(true);
            const updateList = Object.entries(updates).map(([messageId, newBjName]) => ({
                messageId,
                newBjName
            }));

            const res = await fetch('/api/admin/mapping', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates: updateList })
            });

            const result = await res.json();
            if (result.success) {
                alert('성공적으로 수정되었습니다.');
                setUpdates({}); // 초기화
                fetchData(); // 재로딩
            } else {
                alert('수정 실패: ' + result.message);
            }
        } catch (error) {
            console.error('Error saving:', error);
            alert('저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleRollback = async () => {
        if (!confirm('가장 최근의 수정을 취소하시겠습니까? (이전 상태로 되돌리기)')) return;

        try {
            const res = await fetch('/api/admin/mapping', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates: 'rollback' })
            });
            const result = await res.json();
            if (result.success) {
                alert('되돌리기 성공!');
                fetchData();
            } else {
                alert('되돌리기 실패: ' + result.message);
            }
        } catch (error) {
            console.error(error);
            alert('오류 발생');
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">미분류 데이터 수동 매핑</h1>
                    <div className="flex gap-4">
                        <button
                            onClick={handleRollback}
                            className="px-4 py-2 bg-red-600 rounded hover:bg-red-500 font-bold text-white transition-colors"
                        >
                            ↩️ 실행 취소
                        </button>
                        <Link href="/" className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">
                            메인으로
                        </Link>
                        <Link href="/admin/sync" className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">
                            데이터 관리
                        </Link>
                    </div>
                </div>

                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">
                            미분류 목록 ({items.length}건)
                        </h2>
                        <button
                            onClick={handleApply}
                            disabled={saving || Object.keys(updates).length === 0}
                            className={`px-6 py-2 rounded font-bold transition-colors ${Object.keys(updates).length > 0
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            {saving ? '저장 중...' : '변경사항 저장'}
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-20 text-gray-500">로딩 중...</div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-20 text-green-400 text-lg">
                            🎉 모든 데이터가 분류되었습니다!
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-700 text-gray-300 uppercase text-xs">
                                    <tr>
                                        <th className="p-3">일시</th>
                                        <th className="p-3">후원자</th>
                                        <th className="p-3 text-right">개수</th>
                                        <th className="p-3">원본 메시지/타겟</th>
                                        <th className="p-3">BJ 지정</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {items.map((item) => (
                                        <tr key={item.messageId} className="hover:bg-gray-700/50">
                                            <td className="p-3 text-sm text-gray-400">
                                                {item.createDate}
                                            </td>
                                            <td className="p-3 font-medium text-white">
                                                {item.ballonUserName}
                                            </td>
                                            <td className="p-3 text-right font-bold text-yellow-400">
                                                {item.ballonCount.toLocaleString()}
                                            </td>
                                            <td className="p-3 text-gray-300 text-sm max-w-xs truncate">
                                                {item.targetBjName || '-'} <br />
                                                <span className="text-gray-500 text-xs">"{item.message}"</span>
                                            </td>
                                            <td className="p-3">
                                                <select
                                                    className="bg-gray-900 border border-gray-600 text-white text-sm rounded focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                                                    value={updates[item.messageId] || ''}
                                                    onChange={(e) => handleBjChange(item.messageId, e.target.value)}
                                                >
                                                    <option value="">(선택 안함)</option>
                                                    {bjs.map((bj) => (
                                                        <option key={bj} value={bj}>
                                                            {bj}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
