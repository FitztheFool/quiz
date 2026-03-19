// src/app/api/user/[username]/change-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ username: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id)
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

        const { username } = await params;
        if (session.user.username !== username)
            return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 });

        const { currentPassword, newPassword } = await req.json();

        if (!currentPassword || !newPassword)
            return NextResponse.json({ error: 'Champs manquants' }, { status: 400 });

        if (newPassword.length < 6)
            return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 6 caractères' }, { status: 400 });

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { passwordHash: true },
        });

        if (!user?.passwordHash)
            return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

        const valid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!valid)
            return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 400 });

        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: session.user.id },
            data: { passwordHash: hashed },
        });

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
