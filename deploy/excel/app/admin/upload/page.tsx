'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminUploadData() {
    const [text, setText] = useState('');
    const [status, setStatus] = useState('');
    const [parsedCount, setParsedCount] = useState<number | null>(null);

    const handleUpload = async () => {
        if (!text.trim()) return;

        setStatus('Uploading...');
        try {
            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });
            const data = await res.json();
            if (data.success) {
                const msg = data.duplicatesRemoved > 0
                    ? `성공! ${data.unique}건 추가됨 (중복 ${data.duplicatesRemoved}건 제거, 전체 ${data.total}건)`
                    : `성공! ${data.unique}건 추가됨 (전체 ${data.total}건)`;
                setStatus(msg);
                setParsedCount(data.unique);
                setText(''); // Clear
            } else {
                setStatus(`실패: ${data.error}`);
            }
        } catch (e: any) {
            setStatus(`에러: ${e.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">📥 데이터 수동 업로드</h1>
                    <div className="flex gap-2">
                        <Link href="/admin" className="px-4 py-2 bg-gray-100 rounded text-gray-700 hover:bg-gray-200">
                            관리자 홈
                        </Link>
                        <Link href="/" className="px-4 py-2 bg-gray-100 rounded text-gray-700 hover:bg-gray-200">
                            메인으로
                        </Link>
                    </div>
                </div>

                <p className="mb-4 text-gray-600 text-sm">
                    엑셀이나 텍스트 파일에서 복사한 데이터를 아래에 붙여넣으세요.<br />
                    형식: <code>순번 ID 날짜 시간 닉네임 개수 메시지 [타겟]</code> (탭 또는 공백 구분)
                </p>

                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={`예시:\n311 176559904866758 2025-12-13 13:10:48 [JINU]푸우 300 금별 팡`}
                    className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
                />

                <div className="flex justify-between items-center">
                    <div className="text-indigo-600 font-bold">{status}</div>
                    <button
                        onClick={handleUpload}
                        disabled={!text.trim() || status === 'Uploading...'}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        데이터 업로드
                    </button>
                </div>
            </div>
        </div>
    );
}
