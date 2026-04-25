import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    try {
        const { score, gameId } = await req.json();

        if (typeof score !== 'number' || score < 0 || score > 1000000) {
            return NextResponse.json({ error: 'Score invalide' }, { status: 400 });
        }
        if (!gameId || typeof gameId !== 'string') {
            return NextResponse.json({ error: 'gameId manquant' }, { status: 400 });
        }

        await prisma.attempt.upsert({
            where: { userId_gameId: { userId: session.user.id, gameId } },
            update: { score },
            create: {
                userId: session.user.id,
                gameType: 'PACMAN',
                gameId,
                score,
            },
        });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('[POST /api/pacman/submit]', err);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
