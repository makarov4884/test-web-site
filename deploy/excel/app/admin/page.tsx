'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BjKeywordMapping } from '@/types';

export default function AdminPage() {
    const [mappings, setMappings] = useState<BjKeywordMapping[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // 데이터 로드
    useEffect(() => {
        fetch('/api/admin/keywords')
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    setMappings(res.data);
                } else {
                    setMessage({ text: '데이터 로드 실패', type: 'error' });
                }
            })
            .catch(err => {
                console.error(err);
                setMessage({ text: '데이터 로드 중 오류 발생', type: 'error' });
            })
            .finally(() => setLoading(false));
    }, []);

    // 저장 호출
    const handleSave = async () => {
        try {
            setSaving(true);
            setMessage(null);
            const res = await fetch('/api/admin/keywords', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mappings }),
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ text: '저장되었습니다.', type: 'success' });
            } else {
                throw new Error(data.error);
            }
        } catch (err) {
            console.error(err);
            setMessage({ text: '저장 실패', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // BJ 추가
    const addBj = () => {
        setMappings([...mappings, { bjName: '', keywords: [] }]);
    };

    // BJ 삭제
    const removeBj = (index: number) => {
        const newMappings = mappings.filter((_, i) => i !== index);
        setMappings(newMappings);
    };

    // BJ 이름 수정
    const updateBjName = (index: number, name: string) => {
        const newMappings = [...mappings];
        newMappings[index].bjName = name;
        setMappings(newMappings);
    };

    // 키워드 수정
    const updateKeywords = (index: number, keywordsStr: string) => {
        const newMappings = [...mappings];
        newMappings[index].keywords = keywordsStr.split(',').map(k => k.trim()).filter(k => k);
        setMappings(newMappings);
    };

    // 키워드 추가
    const addKeyword = (index: number, keyword: string) => {
        if (!keyword.trim()) return;
        const newMappings = [...mappings];
        if (!newMappings[index].keywords.includes(keyword.trim())) {
            newMappings[index].keywords.push(keyword.trim());
            setMappings(newMappings);
        }
    };

    // 키워드 삭제
    const removeKeyword = (bjIndex: number, kwIndex: number) => {
        const newMappings = [...mappings];
        newMappings[bjIndex].keywords = newMappings[bjIndex].keywords.filter((_, i) => i !== kwIndex);
        setMappings(newMappings);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f1117] p-8 text-gray-900 dark:text-gray-100">
            <div className="max-w-6xl mx-auto space-y-8">
                <header className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
                        BJ 키워드 관리
                    </h1>
                    <div className="flex gap-2">
                        <Link href="/admin/sync" className="px-4 py-2 bg-gray-800 rounded-lg text-sm font-medium text-indigo-400 hover:bg-gray-700 transition flex items-center gap-2 border border-indigo-500/30">
                            📥 데이터 동기화
                        </Link>
                        <Link href="/admin/unmatched" className="px-4 py-2 bg-gray-800 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 transition flex items-center gap-2">
                            📋 미분류 관리
                        </Link>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {saving ? '저장 중...' : '저장하기'}
                        </button>
                    </div>
                </header>

                {message && (
                    <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-10">로딩 중...</div>
                ) : (
                    <div className="space-y-6">
                        {mappings.map((mapping, index) => (
                            <div key={index} className="bg-white dark:bg-[#1a1d24] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
                                <div className="flex justify-between items-start gap-4 mb-4">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-500 mb-1">BJ 이름 (정확히 입력)</label>
                                        <input
                                            type="text"
                                            value={mapping.bjName}
                                            onChange={(e) => updateBjName(index, e.target.value)}
                                            placeholder="예: 다냥♡"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <button
                                        onClick={() => removeBj(index)}
                                        className="mt-6 text-red-500 hover:text-red-700 p-2"
                                        title="삭제"
                                    >
                                        🗑️
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-2">키워드 (메시지 포함 단어)</label>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {mapping.keywords.map((kw, kIndex) => (
                                            <span key={kIndex} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200">
                                                {kw}
                                                <button
                                                    onClick={() => removeKeyword(index, kIndex)}
                                                    className="ml-2 text-indigo-400 hover:text-indigo-600 focus:outline-none"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="키워드 추가 + 엔터"
                                            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    addKeyword(index, e.currentTarget.value);
                                                    e.currentTarget.value = '';
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={addBj}
                            className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 hover:border-indigo-500 hover:text-indigo-500 transition-colors font-medium"
                        >
                            + 새로운 BJ 추가
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
