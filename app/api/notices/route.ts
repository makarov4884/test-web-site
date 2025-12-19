import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
    try {
        // Supabase DB에서 공지사항 가져오기
        const { data: notices, error } = await supabaseAdmin
            .from('notices')
            .select('*')
            .order('date', { ascending: false }) // 날짜 내림차순
            .limit(100); // 최근 100개만

        if (error) throw error;

        // 프론트엔드 포맷으로 변환
        const formattedNotices = (notices || []).map(n => ({
            id: n.id.toString(),
            streamerId: n.bj_field,
            streamerName: n.bj_name,
            title: n.title,
            url: n.link,
            date: n.date,
            isFixed: n.is_fixed
        }));

        return NextResponse.json(formattedNotices);

    } catch (error) {
        console.error('Notices API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch notices' }, { status: 500 });
    }
}
