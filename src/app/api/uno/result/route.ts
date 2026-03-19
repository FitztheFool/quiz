// src/app/api/uno/result/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { computeUnoScore } from '@/lib/unoRewards';

interface FinalScore {
    userId: string;
    rank: number;
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { finalScores, gameId }: { finalScores: FinalScore[]; gameId?: string } = await req.json();
    if (!Array.isArray(finalScores) || finalScores.length === 0) {
        return NextResponse.json({ error: 'Payload invalide' }, { status: 400 });
    }

    const me = finalScores.find(s => s.userId === session.user.id);
    if (!me) {
        return NextResponse.json({ error: 'Joueur introuvable dans les scores' }, { status: 400 });
    }

    // gameId partagé envoyé par le client (même valeur pour tous les joueurs de la partie)
    const sharedGameId = gameId ?? crypto.randomUUID();
    const score = computeUnoScore(me.rank);

    await prisma.attempt.create({
        data: {
            userId:    me.userId,
            score,
            gameType:  'UNO',
            placement: me.rank,
            quizId:    null,
            gameId:    sharedGameId,
        },
    });

    return NextResponse.json({ ok: true, score });
}
