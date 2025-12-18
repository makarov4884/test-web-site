'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SyncPage() {
    const [text, setText] = useState('');
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'applying' | 'done'>('idle');
    const [result, setResult] = useState<any>(null);

    const handleAnalyze = async () => {
        try {
            setStatus('analyzing');
            const res = await fetch('/api/admin/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, action: 'analyze' })
            });
            const data = await res.json();
            setResult(data);
            setStatus('idle');
        } catch (e) {
            alert('분석 실패');
            setStatus('idle');
        }
    };

    const handleApply = async (mode: 'merge' | 'overwrite' = 'merge') => {
        const message = mode === 'overwrite'
            ? '⚠️ 경고: 기존 데이터를 모두 삭제하고 입력한 데이터로 교체합니다. 이 작업은 되돌릴 수 없습니다. 진행하시겠습니까?'
            : '정말로 데이터를 동기화하시겠습니까? 기존 데이터와 병합됩니다.';

        if (!confirm(message)) return;

        try {
            setStatus('applying');
            const res = await fetch('/api/admin/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, action: 'apply', mode })
            });
            const data = await res.json();
            if (data.success) {
                alert(`동기화 완료! 총 ${data.totalCount}개의 데이터가 저장되었습니다.`);
                setStatus('done');
                setResult(null);
                setText('');
            } else {
                alert('동기화 실패: ' + data.error);
                setStatus('idle');
            }
        } catch (e) {
            alert('요청 실패');
            setStatus('idle');
        }
    };

    return (
        <div className="min-h-screen bg-[#0f1117] text-gray-100 font-sans p-8">
            {/* ... header ... */}
            <div className="max-w-4xl mx-auto space-y-8">
                <header className="flex items-center justify-between border-b border-gray-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-black text-white mb-2">데이터 수동 동기화</h1>
                        <p className="text-gray-400 text-sm">엑셀이나 텍스트 파일의 전체 데이터를 붙여넣어 시스템을 최신 상태로 동기화합니다.</p>
                    </div>
                    <Link href="/admin" className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
                        돌아가기
                    </Link>
                </header>

                <div className="space-y-4">
                    <div className="bg-[#1a1d24] p-6 rounded-2xl border border-gray-800">
                        <label className="block text-sm font-bold text-gray-300 mb-2">
                            데이터 붙여넣기 (전체 내용)
                        </label>
                        <textarea
                            className="w-full h-96 bg-[#0f1117] border border-gray-700 rounded-xl p-4 text-xs font-mono text-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                            placeholder={"예시:\n1\t1765...\t2025-12-13 19:41:46\tUser\t3000\t...\tTarget\n..."}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                    </div>

                    {result && (
                        <div className="bg-indigo-900/20 border border-indigo-500/30 p-6 rounded-xl animate-in fade-in slide-in-from-top-2">
                            <h3 className="text-lg font-bold text-indigo-300 mb-4">📊 분석 결과</h3>
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-[#0f1117] p-4 rounded-lg border border-indigo-500/20 text-center">
                                    <p className="text-xs text-gray-500 mb-1">입력된 데이터</p>
                                    <p className="text-2xl font-black text-white">{result.parsedCount}개</p>
                                </div>
                                <div className="bg-[#0f1117] p-4 rounded-lg border border-gray-700 text-center">
                                    <p className="text-xs text-gray-500 mb-1">현재 시스템 데이터</p>
                                    <p className="text-2xl font-black text-gray-400">{result.currentCount}개</p>
                                </div>
                                <div className="bg-[#0f1117] p-4 rounded-lg border border-gray-700 text-center">
                                    <p className="text-xs text-gray-500 mb-1">예상 변화량</p>
                                    <p className="text-2xl font-black text-green-400">+{result.diff}개</p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-4">
                                <button
                                    onClick={() => { setResult(null); setText(''); }}
                                    className="px-6 py-3 rounded-xl font-bold bg-gray-700 text-gray-300 hover:bg-gray-600 transition"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={() => handleApply('merge')}
                                    disabled={status === 'applying'}
                                    className="px-6 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition flex items-center gap-2"
                                >
                                    {status === 'applying' ? '적용 중...' : '병합하기 (Merge)'}
                                </button>
                                <button
                                    onClick={() => handleApply('overwrite')}
                                    disabled={status === 'applying'}
                                    className="px-6 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-500/20 transition flex items-center gap-2"
                                >
                                    {status === 'applying' ? '적용 중...' : '전체 교체하기 (Overwrite)'}
                                </button>
                            </div>
                        </div>
                    )}

                    {!result && (
                        <div className="flex justify-end">
                            <button
                                onClick={handleAnalyze}
                                disabled={!text || status === 'analyzing'}
                                className="px-8 py-4 rounded-xl font-bold bg-white text-black hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {status === 'analyzing' ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        분석 중...
                                    </>
                                ) : (
                                    '데이터 분석하기'
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
