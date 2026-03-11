// app/api/attempts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, gameType, gameId, score, placement, quizId } = body;

        if (!userId || !gameType || !gameId || score === undefined) {
            console.warn('[POST /api/attempts] Paramètres manquants', body);
            return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
        }

        const attempt = await prisma.attempt.create({
            data: {
                userId,
                gameType,
                gameId,
                score,
                placement: placement ?? null,
                quizId: quizId ?? null,
            },
        });

        return NextResponse.json(attempt);
    } catch (error) {
        console.error('[POST /api/attempts]', error);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
