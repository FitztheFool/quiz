// src/app/api/user/[username]/upload-avatar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ username: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });

    const { username } = await params;
    if (session.user.username !== username)
        return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 });

    const formData = await req.formData();
    const file = formData.get('avatar') as File | null;
    if (!file) return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 });

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/tiff'];
    if (!allowedTypes.includes(file.type))
        return NextResponse.json({ error: 'Format non supporté. (jpg, png, webp, gif, tiff)' }, { status: 400 });

    if (file.size > 50 * 1024 * 1024)
        return NextResponse.json({ error: 'Fichier trop lourd (max 50 Mo).' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    const result = await cloudinary.uploader.upload(base64, {
        folder: 'avatars',
        public_id: `user_${session.user.id}`,
        overwrite: true,
        transformation: [{ width: 256, height: 256, crop: 'fill', gravity: 'face' }],
    });

    await prisma.user.update({
        where: { id: session.user.id },
        data: { image: result.secure_url },
    });

    return NextResponse.json({ imageUrl: `${result.secure_url}?t=${Date.now()}` });
}
