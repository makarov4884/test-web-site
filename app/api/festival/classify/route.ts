import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const { messageId, bjName } = await request.json();

        if (!messageId || !bjName) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Supabase DB 업데이트
        const { data, error } = await supabaseAdmin
            .from('donations')
            .update({ target_bj_name: bjName })
            .eq('message_id', messageId)
            .select(); // 업데이트된 데이터 반환

        if (error) {
            console.error('Update Error:', error);
            throw error;
        }

        // 업데이트 결과 확인
        if (!data || data.length === 0) {
            return NextResponse.json(
                { error: 'Donation not found' },
                { status: 404 }
            );
        }

        const updatedItem = data[0];

        return NextResponse.json({
            success: true,
            updatedDonation: {
                messageId: updatedItem.message_id,
                targetBjName: updatedItem.target_bj_name
            }
        });

    } catch (error) {
        console.error('Classify Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
