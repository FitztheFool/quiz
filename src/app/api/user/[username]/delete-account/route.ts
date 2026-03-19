// src/app/api/user/[username]/delete-account/route.ts
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

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ username: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });

    const { username } = await params;
    if (session.user.username !== username)
        return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 });

    const { email, type } = await req.json();

    if (!email || email.trim().toLowerCase() !== session.user.email?.toLowerCase())
        return NextResponse.json({ error: 'Email incorrect.' }, { status: 400 });

    if (type !== 'soft' && type !== 'hard')
        return NextResponse.json({ error: 'Type invalide.' }, { status: 400 });

    if (type === 'soft') {
        // Désactivation — bloque la connexion, réactivable
        await prisma.user.update({
            where: { id: session.user.id },
            data: { deactivatedAt: new Date() },
        });
        return NextResponse.json({ success: true, type: 'soft' });
    }

    // Hard delete — suppression totale
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { image: true },
    });

    if (user?.image?.includes('cloudinary')) {
        try {
            await cloudinary.uploader.destroy(`avatars/user_${session.user.id}`);
        } catch (err) {
            console.error('Cloudinary delete error:', err);
        }
    }

    await prisma.user.delete({ where: { id: session.user.id } });

    return NextResponse.json({ success: true, type: 'hard' });
}
