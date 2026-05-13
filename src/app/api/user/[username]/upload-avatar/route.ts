import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRegistered } from '@/lib/authGuard';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ username: string }> }
) {
    const { session, error } = await requireRegistered();
    if (error) return error;

    const { username } = await params;
    if (session.user.username !== username)
        return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 });

    const { imageUrl } = await req.json();
    if (!imageUrl || typeof imageUrl !== 'string')
        return NextResponse.json({ error: 'URL image manquante.' }, { status: 400 });

    let parsedUrl: URL;
    try { parsedUrl = new URL(imageUrl); } catch {
        return NextResponse.json({ error: 'URL invalide.' }, { status: 400 });
    }
    if (parsedUrl.protocol !== 'https:') {
        return NextResponse.json({ error: 'URL invalide.' }, { status: 400 });
    }
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const expectedHost = cloudName ? 'res.cloudinary.com' : null;
    const expectedPathPrefix = cloudName ? `/${cloudName}/image/upload/` : null;
    if (
        !expectedHost ||
        !expectedPathPrefix ||
        parsedUrl.hostname !== expectedHost ||
        !parsedUrl.pathname.startsWith(expectedPathPrefix)
    ) {
        return NextResponse.json({ error: 'URL image non autorisée.' }, { status: 400 });
    }
    // Vérifie que l'image appartient au dossier avatar du user (signé via upload/sign).
    if (!parsedUrl.pathname.includes(`/avatar/${session.user.id}/`)) {
        return NextResponse.json({ error: 'URL image non autorisée.' }, { status: 400 });
    }

    await prisma.user.update({
        where: { id: session.user.id },
        data: { image: imageUrl },
    });

    return NextResponse.json({ imageUrl: `${imageUrl}?t=${Date.now()}` });
}
