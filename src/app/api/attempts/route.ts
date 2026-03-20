// src/app/api/attempts/route.ts
// Route interne appelée par les serveurs de jeu
// Auth : Authorization: Bearer <INTERNAL_API_KEY>

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface ScoreEntry {
    userId: string;
    score: number;
    placement?: number | null;
    trapScore?: number;
    rounds?: number;
}

interface AttemptPayload {
    gameType: string;
    gameId: string;
    scores: ScoreEntry[];
}

export async function POST(req: NextRequest) {
    const auth = req.headers.get('authorization');
    const secret = process.env.INTERNAL_API_KEY;

    if (!secret || auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    try {
        const body: AttemptPayload = await req.json();
        const { gameType, gameId, scores } = body;

        if (!gameType || !gameId || !Array.isArray(scores) || scores.length === 0) {
            return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
        }

        await Promise.all(
            scores.map((s) =>
                prisma.attempt.upsert({
                    where: { userId_gameId: { userId: s.userId, gameId } },
                    update: {
                        score: s.score,
                        placement: s.placement ?? null,
                        trapScore: s.trapScore ?? 0,
                        rounds: s.rounds ?? 0,
                    },
                    create: {
                        userId: s.userId,
                        gameType: gameType as any,
                        gameId,
                        score: s.score,
                        placement: s.placement ?? null,
                        trapScore: s.trapScore ?? 0,
                        rounds: s.rounds ?? 0,
                    },
                })
            )
        );

        return NextResponse.json({ ok: true, saved: scores.length });
    } catch (error) {
        console.error('[POST /api/attempts]', error);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
