import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { verifySoloToken } from '@/lib/soloToken';
import prisma from '@/lib/prisma';
import type { GameType } from '@/generated/prisma/client';

const MIN_DURATION_MS = 10_000;

interface Config {
    gameType: GameType;
    maxScore: number;
    hasRounds?: boolean;
}

export function createSoloSubmitHandler({ gameType, maxScore, hasRounds = false }: Config) {
    return async function POST(req: NextRequest) {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        try {
            const body = await req.json();
            const { score, token } = body;

            if (typeof score !== 'number' || score < 0 || score > maxScore) {
                return NextResponse.json({ error: 'Score invalide' }, { status: 400 });
            }

            const check = verifySoloToken(token, session.user.id, gameType, MIN_DURATION_MS);
            if (!check.ok) {
                return NextResponse.json({ error: check.error }, { status: 400 });
            }

            const rounds = hasRounds
                ? (typeof body.level === 'number' && body.level > 0 ? body.level : 1)
                : undefined;

            await prisma.attempt.upsert({
                where:  { userId_gameId: { userId: session.user.id, gameId: token } },
                update: { score: { set: score }, ...(rounds !== undefined && { rounds }) },
                create: { userId: session.user.id, gameType, gameId: token, score, ...(rounds !== undefined && { rounds }) },
            });

            return NextResponse.json({ ok: true });
        } catch (err) {
            console.error(`[POST /api/${gameType.toLowerCase()}/submit]`, err);
            return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
        }
    };
}
