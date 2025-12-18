'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function UnmatchedPage() {
    const [donations, setDonations] = useState<any[]>([]);
    const [keywords, setKeywords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // View Mode: 'unmatched' | 'history'
    const [viewMode, setViewMode] = useState<'unmatched' | 'history'>('unmatched');
    const [manualMappings, setManualMappings] = useState<any[]>([]);
    const [allDonations, setAllDonations] = useState<any[]>([]);

    // 검색 필터링 (Effect 의존성 해결을 위해 상단 정의)
    const filteredDonations = donations.filter(d =>
        d.ballonUserName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.targetBjName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.message?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 자동 포커싱을 위한 Ref
    const focusIndexRef = useRef<number | null>(null);

    // 데이터 변경(목록 갱신) 시 다음 항목 자동 포커스
    useEffect(() => {
        const idx = focusIndexRef.current;
        if (idx !== null) {
            setTimeout(() => {
                const inputs = document.querySelectorAll('.bj-input');
                // 이전 인덱스가 그대로 유지되므로(항목이 삭제되어 당겨짐) 해당 인덱스에 포커스
                // 만약 마지막 항목이었다면 마지막 인풋에 포커스
                const target = inputs[idx] || inputs[inputs.length - 1];
                if (target) {
                    (target as HTMLElement).focus();
                }
                focusIndexRef.current = null;
            }, 50);
        }
    }, [filteredDonations]); // 목록 렌더링 후 실행

    // 데이터 로드
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        // setLoading(true); // 배경에서 조용히 갱신 (스크롤 유지 위함)
        try {
            // 1. 키워드 로드
            const keywordsRes = await fetch('/api/admin/keywords');
            const keywordsData = await keywordsRes.json();
            const registeredBjs = keywordsData.success ? keywordsData.data : [];
            setKeywords(registeredBjs);

            // 2. 수동 매핑 이력 로드 (History)
            const historyRes = await fetch('/api/admin/manual-mapping');
            const historyData = await historyRes.json();
            const history = historyData.success ? historyData.data : [];
            setManualMappings(history);

            // 3. 전체 후원 데이터 로드
            const donationsRes = await fetch('/api/crawl');
            const donationsData = await donationsRes.json();

            if (donationsData.success) {
                setAllDonations(donationsData.data);
                filterData(viewMode, donationsData.data, registeredBjs, history);
            }
        } catch (error) {
            console.error('데이터 로드 실패:', error);
            setMessage({ text: '데이터 로드 실패', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // 뷰 모드 변경 시 필터링 수행
    useEffect(() => {
        filterData(viewMode, allDonations, keywords, manualMappings);
    }, [viewMode]);

    const filterData = (mode: string, allData: any[], bjs: any[], history: any[]) => {
        if (!allData || allData.length === 0) return;

        if (mode === 'unmatched') {
            const bjNames = new Set(bjs.map((m: any) => m.bjName));
            // 미분류: 타겟명이 없거나 등록된 BJ 목록에 없는 경우
            const unmatched = allData.filter((d: any) =>
                !bjNames.has(d.targetBjName) || !d.targetBjName
            );
            setDonations(unmatched);
        } else {
            // 히스토리: 수동 매핑 이력에 존재하는 messageId 찾기
            const historyIds = new Set(history.map((m: any) => m.messageId));
            const historyList = allData.filter((d: any) => historyIds.has(d.messageId));

            // 매핑된 정보를 화면에 표시하기 위해 donations 데이터에 mappedTarget 주입
            const historyMap = new Map(history.map((m: any) => [m.messageId, m.targetBjName]));
            const enrichedHistory = historyList.map(d => ({
                ...d,
                mappedTarget: historyMap.get(d.messageId) // 현재 매핑된 BJ 이름
            }));

            setDonations(enrichedHistory);
        }
    };

    // BJ 이름 수동 매핑
    const handleMapping = async (messageId: string, bjName: string, index: number) => {
        if (!bjName.trim()) {
            setMessage({ text: 'BJ 이름을 입력해주세요', type: 'error' });
            return;
        }

        try {
            const res = await fetch('/api/admin/manual-mapping', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId, targetBjName: bjName })
            });

            if (res.ok) {
                setMessage({ text: '매핑이 저장되었습니다', type: 'success' });
                // 포커스 인덱스 예약
                focusIndexRef.current = index;
                // 리스트에서 제거 (미분류 목록에서 사라짐)
                setDonations(prev => prev.filter(d => d.messageId !== messageId));
                // loadData(); // 스크롤 튐 방지를 위해 자동 로드 제거 (필요시 백그라운드 처리)
            } else {
                setMessage({ text: '매핑 저장 실패', type: 'error' });
            }
        } catch (error) {
            console.error('매핑 저장 실패:', error);
            setMessage({ text: '매핑 저장 중 오류', type: 'error' });
        }
    };

    // 데이터 삭제 (미분류 데이터 삭제)
    const handleDeleteData = async (messageId: string) => {
        if (!confirm('이 후원 데이터를 영구 삭제하시겠습니까?')) return;

        try {
            const res = await fetch('/api/admin/clear-unmatched', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageIds: [messageId] })
            });

            if (res.ok) {
                setMessage({ text: '삭제되었습니다', type: 'success' });
                setDonations(prev => prev.filter(d => d.messageId !== messageId));
            } else {
                setMessage({ text: '삭제 실패', type: 'error' });
            }
        } catch (error) {
            console.error('삭제 실패:', error);
            setMessage({ text: '삭제 중 오류', type: 'error' });
        }
    };

    // 매핑 취소 (Undo)
    const handleUndoMapping = async (messageId: string) => {
        if (!confirm('매핑을 취소하고 학습된 키워드를 삭제하시겠습니까?')) return;

        try {
            const res = await fetch('/api/admin/manual-mapping', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId })
            });

            if (res.ok) {
                setMessage({ text: '매핑이 취소되었습니다', type: 'success' });
                // 목록에서 제거
                setDonations(prev => prev.filter(d => d.messageId !== messageId));
                // 필요 시 데이터 리로드 (다시 미분류로 돌아가야 하므로)
                loadData();
            } else {
                setMessage({ text: '취소 실패', type: 'error' });
            }
        } catch (error) {
            console.error('취소 실패:', error);
            setMessage({ text: '취소 중 오류', type: 'error' });
        }
    };

    // 전체 삭제 (미분류)
    const handleDeleteAll = async () => {
        if (!confirm(`미분류 후원 ${donations.length}건을 모두 삭제하시겠습니까?`)) return;

        try {
            const res = await fetch('/api/admin/clear-unmatched', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageIds: donations.map(d => d.messageId) })
            });

            if (res.ok) {
                setMessage({ text: '모두 삭제되었습니다', type: 'success' });
                setDonations([]);
            } else {
                setMessage({ text: '삭제 실패', type: 'error' });
            }
        } catch (error) {
            console.error('삭제 실패:', error);
            setMessage({ text: '삭제 중 오류', type: 'error' });
        }
    };



    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f1117] p-8 text-gray-900 dark:text-gray-100">
            <div className="max-w-7xl mx-auto space-y-6">
                <header className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                        ⚠️ 분류 관리자
                    </h1>
                    <div className="flex gap-2">
                        <Link href="/admin" className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors">
                            관리자 페이지
                        </Link>
                        <Link href="/" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors">
                            메인으로
                        </Link>
                    </div>
                </header>

                {/* 탭 버튼 */}
                <div className="flex space-x-1 bg-white dark:bg-gray-800 p-1 rounded-lg w-fit shadow-sm border dark:border-gray-700">
                    <button
                        onClick={() => setViewMode('unmatched')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'unmatched'
                            ? 'bg-indigo-600 text-white shadow'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        미분류 목록
                    </button>
                    <button
                        onClick={() => setViewMode('history')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'history'
                            ? 'bg-indigo-600 text-white shadow'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        완료 내역 (복구)
                    </button>
                </div>

                {message && (
                    <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                <div className="bg-white dark:bg-[#1a1d24] rounded-xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-bold">
                                {viewMode === 'unmatched' ? '미분류 후원 목록' : '분류 완료 내역'}
                                <span className="ml-2 text-sm font-normal text-gray-500">({filteredDonations.length}건)</span>
                            </h2>
                            <input
                                type="text"
                                placeholder="검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="px-4 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-800 text-sm"
                            />
                        </div>
                        {viewMode === 'unmatched' && donations.length > 0 && (
                            <button
                                onClick={handleDeleteAll}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                            >
                                🗑️ 전체 데이터 삭제
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="text-center py-10">로딩 중...</div>
                    ) : filteredDonations.length > 0 ? (
                        <div className="overflow-x-auto min-h-[400px]">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
                                    <tr>
                                        <th className="px-4 py-3 text-left">날짜</th>
                                        <th className="px-4 py-3 text-left">후원자</th>
                                        <th className="px-4 py-3 text-right">개수</th>
                                        {/* 미분류일 땐 현재 타겟, 히스토리일 땐 매핑된 BJ 표시 */}
                                        <th className="px-4 py-3 text-left">
                                            {viewMode === 'unmatched' ? '현재 타겟' : '매핑된 BJ'}
                                        </th>
                                        <th className="px-4 py-3 text-left">메시지</th>
                                        <th className="px-4 py-3 text-left">
                                            {viewMode === 'unmatched' ? 'BJ 지정' : '관리'}
                                        </th>
                                        {viewMode === 'unmatched' && <th className="px-4 py-3 text-center">삭제</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDonations.map((d, idx) => (
                                        <tr key={idx} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                                                {d.createDate}
                                            </td>
                                            <td className="px-4 py-3 font-medium">{d.ballonUserName}</td>
                                            <td className="px-4 py-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                                                {d.ballonCount?.toLocaleString()}
                                            </td>
                                            <td className={`px-4 py-3 ${viewMode === 'unmatched' ? 'text-red-500' : 'text-green-500 font-bold'}`}>
                                                {viewMode === 'unmatched' ? (d.targetBjName || '(없음)') : d.mappedTarget}
                                            </td>
                                            <td className="px-4 py-3 max-w-xs truncate text-gray-500" title={d.message}>
                                                {d.message || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {viewMode === 'unmatched' ? (
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            list="bj-list"
                                                            className="bj-input w-[180px] px-3 py-1.5 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-gray-400"
                                                            placeholder="BJ 검색 (엔터)"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    const val = e.currentTarget.value.trim();
                                                                    if (!val) return;

                                                                    // 1. 정확히 일치하는 경우
                                                                    const exactMatch = keywords.find((k: any) => k.bjName === val);
                                                                    if (exactMatch) {
                                                                        handleMapping(d.messageId, exactMatch.bjName, idx);
                                                                        e.currentTarget.value = '';
                                                                        return;
                                                                    }

                                                                    // 2. 검색어 포함 (부분 일치)
                                                                    const candidates = keywords.filter((k: any) => k.bjName.includes(val));
                                                                    if (candidates.length === 1) {
                                                                        // 하나만 매칭되면 자동 선택
                                                                        handleMapping(d.messageId, candidates[0].bjName, idx);
                                                                        e.currentTarget.value = '';
                                                                    } else if (candidates.length > 1) {
                                                                        alert(`'${val}' 검색 결과가 ${candidates.length}명(건) 있습니다. 더 정확히 입력해주세요.`);
                                                                    }
                                                                }
                                                            }}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                // 목록에서 클릭했을 때 (정확히 일치) 즉시 반영
                                                                if (keywords.some((k: any) => k.bjName === val)) {
                                                                    handleMapping(d.messageId, val, idx);
                                                                    e.target.value = '';
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleUndoMapping(d.messageId)}
                                                        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-xs transition-colors"
                                                    >
                                                        ↩️ 되돌리기
                                                    </button>
                                                )}
                                            </td>
                                            {viewMode === 'unmatched' && (
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => handleDeleteData(d.messageId)}
                                                        className="text-red-500 hover:text-red-700 p-1"
                                                        title="영구 삭제"
                                                    >
                                                        🗑️
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-500">
                            {searchTerm ? '검색 결과가 없습니다' : (viewMode === 'unmatched' ? '미분류 후원이 없습니다' : '처리된 내역이 없습니다')}
                        </div>
                    )}
                </div>
            </div>
            {/* 데이터리스트는 공유 */}
            <datalist id="bj-list">
                {keywords.map((k: any) => (
                    <option key={k.bjName} value={k.bjName} />
                ))}
            </datalist>
        </div>
    );
}
