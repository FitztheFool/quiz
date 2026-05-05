import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { requireRegistered } from '@/lib/authGuard';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(req: NextRequest) {
    const { error } = await requireRegistered();
    if (error) return error;

    const folder = req.nextUrl.searchParams.get('folder') ?? 'quiz';
    const timestamp = Math.round(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
        { timestamp, folder },
        process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json({
        signature,
        timestamp,
        api_key: process.env.CLOUDINARY_API_KEY,
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        folder,
    });
}
