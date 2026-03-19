// src/app/api/attempt/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, gameType, gameId, score, placement, quizId, trapScore, rounds } = body;

        if (!userId || !gameType || !gameId || score === undefined) {
            console.warn('[POST /api/attempt] Paramètres manquants', body);
            return NextResponse.json({ error: 'Paramètres manquant' }, { status: 400 });
        }

        const attempt = await prisma.attempt.upsert({
            where: {
                userId_gameId: { userId, gameId }  // contrainte unique dans le schema
            },
            update: {
                score,
                placement: placement ?? null,
                trapScore: trapScore ?? 0,
                rounds: rounds ?? 0,
            },
            create: {
                userId,
                gameType,
                gameId,
                score,
                placement: placement ?? null,
                quizId: quizId ?? null,
                trapScore: trapScore ?? 0,
                rounds: rounds ?? 0,
            },
        });

        return NextResponse.json(attempt);
    } catch (error) {
        console.error('[POST /api/attempt]', error);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
