// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

export const maxDuration = 60;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const dataUri = `data:${file.type};base64,${base64}`;

        const result = await cloudinary.uploader.upload(dataUri, {
            folder: 'quiz',
            resource_type: 'image',
            timeout: 300000,
        });
        const url = result.secure_url;

        return NextResponse.json({ url });
    } catch (e: any) {
        console.error('Erreur upload Cloudinary:', e);
        return NextResponse.json({ error: e?.message ?? 'Erreur serveur' }, { status: 500 });
    }
}
