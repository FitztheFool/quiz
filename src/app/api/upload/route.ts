// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { requireRegistered } from '@/lib/authGuard';

export const maxDuration = 60;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function POST(req: NextRequest) {
    const { session, error } = await requireRegistered();
    if (error) return error;

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 });
        }

        if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
            return NextResponse.json({ error: 'Type de fichier non autorisé' }, { status: 400 });
        }

        if (file.size <= 0 || file.size > MAX_IMAGE_SIZE) {
            return NextResponse.json({ error: 'Fichier trop volumineux' }, { status: 413 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const dataUri = `data:${file.type};base64,${base64}`;

        const result = await cloudinary.uploader.upload(dataUri, {
            folder: `quiz/${session.user.id}`,
            resource_type: 'image',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
            transformation: [{ width: 2000, height: 2000, crop: 'limit' }],
            timeout: 300000,
        });
        const url = result.secure_url;

        return NextResponse.json({ url });
    } catch (e) {
        console.error('Erreur upload Cloudinary:', e);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
