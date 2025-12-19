import { NextResponse } from 'next/server';
import { DonationData } from '@/types';

export async function POST(request: Request) {
    try {
        const { donations } = await request.json();

        if (!donations || !Array.isArray(donations)) {
            return NextResponse.json(
                { success: false, error: 'donations array is required' },
                { status: 400 }
            );
        }

        console.log(`Received ${donations.length} donations via upload`);

        return NextResponse.json({
            success: true,
            data: donations,
            count: donations.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic';
