import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        // Supabase DB에서 모든 후원 내역 가져오기
        const { data: dbDonations, error } = await supabaseAdmin
            .from('donations')
            .select('*')
            .order('create_date', { ascending: false });

        if (error) {
            console.error('Fetch Error:', error);
            throw error;
        }

        // 프론트엔드 호환 포맷으로 변환 (CamelCase)
        const donations = (dbDonations || []).map((item: any) => ({
            messageId: item.message_id,
            createDate: item.create_date,
            relativeTime: item.relative_time,
            ballonUserName: item.ballon_user_name,
            ballonCount: item.ballon_count,
            targetBjName: item.target_bj_name,
            message: item.message,
            isCancel: item.is_cancel
        }));

        return NextResponse.json(donations);

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch crawl data' },
            { status: 500 }
        );
    }
}
