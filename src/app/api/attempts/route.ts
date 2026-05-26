// src/app/api/attempts/route.ts
// Route interne appelée par les serveurs de jeu
// Auth : Authorization: Bearer <INTERNAL_API_KEY>

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { GameType } from '@/generated/prisma/client';
import { timingSafeEqual } from 'crypto';

interface ScoreEntry {
    userId: string;
    score: number;
    placement?: number | null;
    team?: number | null;
    trapScore?: number;
    rounds?: number;
    correctAnswers?: number;
    totalAnswers?: number;
    abandon?: boolean;
    afk?: boolean;
}

interface BotScore {
    username: string;
    score: number;
    placement: number;
    team?: number | null;
}

interface AttemptPayload {
    gameType: string;
    gameId: string;
    quizId?: string;
    vsBot?: boolean;
    bots?: BotScore[];
    scores: ScoreEntry[];
}

const VALID_GAME_TYPES = new Set(Object.values(GameType));
const MAX_SCORE = 10_000_000;
const MAX_ROUNDS = 10_000;
const MAX_PLACEMENT = 1_000;
const MAX_GAME_ID_LEN = 128;

function clampInt(n: unknown, min: number, max: number, fallback = 0): number {
    if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(n)));
}

export async function POST(req: NextRequest) {
    const auth = req.headers.get('authorization');
    const secret = process.env.INTERNAL_API_KEY;
    const expected = `Bearer ${secret}`;

    const authorized =
        !!secret &&
        !!auth &&
        auth.length === expected.length &&
        timingSafeEqual(Buffer.from(auth), Buffer.from(expected));

    if (!authorized) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    try {
        const body: AttemptPayload = await req.json();
        const { gameType, gameId, quizId, vsBot, bots, scores } = body;

        if (!gameType || !gameId || !Array.isArray(scores) || scores.length === 0) {
            return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
        }
        if (!VALID_GAME_TYPES.has(gameType as GameType)) {
            return NextResponse.json({ error: 'gameType invalide' }, { status: 400 });
        }
        if (typeof gameId !== 'string' || gameId.length === 0 || gameId.length > MAX_GAME_ID_LEN) {
            return NextResponse.json({ error: 'gameId invalide' }, { status: 400 });
        }
        if (scores.length > 32) {
            return NextResponse.json({ error: 'Trop de scores' }, { status: 400 });
        }
        if (bots && (!Array.isArray(bots) || bots.length > 32)) {
            return NextResponse.json({ error: 'bots invalide' }, { status: 400 });
        }

        // Vérifier que les userId existent en BDD
        const existingUsers = await prisma.user.findMany({
            where: { id: { in: scores.map(s => s.userId) } },
            select: { id: true },
        });
        const validUserIds = new Set(existingUsers.map(u => u.id));
        const validScores = scores.filter(s => validUserIds.has(s.userId));

        if (validScores.length === 0) {
            const invalidIds = scores.map(s => s.userId).filter(id => !validUserIds.has(id));
            console.warn(`[POST /api/attempts] ${gameType} ${gameId}: 0 valid users (unknown ids: ${invalidIds.join(',')})`);
            return NextResponse.json({ ok: true, saved: 0 });
        }

        // Bot scores stored (as JSON) on the first (highest-placed) human attempt
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const botScoresJson: any = bots && bots.length > 0 ? bots : null;

        await Promise.all(
            validScores.map((s, i) => {
                const botScores = i === 0 ? botScoresJson : null;
                const score = clampInt(s.score, 0, MAX_SCORE);
                const placement = s.placement == null ? null : clampInt(s.placement, 1, MAX_PLACEMENT, 1);
                const team = s.team === 0 || s.team === 1 ? s.team : null;
                const trapScore = clampInt(s.trapScore, 0, MAX_SCORE);
                const rounds = clampInt(s.rounds, 0, MAX_ROUNDS);
                const correctAnswers = clampInt(s.correctAnswers, 0, MAX_ROUNDS);
                const totalAnswers = clampInt(s.totalAnswers, 0, MAX_ROUNDS);
                return prisma.attempt.upsert({
                    where: { userId_gameId: { userId: s.userId, gameId } },
                    update: {
                        score,
                        placement,
                        team,
                        trapScore,
                        rounds,
                        correctAnswers,
                        totalAnswers,
                        abandon: !!s.abandon,
                        afk: !!s.afk,
                        vsBot: !!vsBot,
                        ...(botScores !== null ? { botScores } : {}),
                    },
                    create: {
                        userId: s.userId,
                        gameType: gameType as GameType,
                        gameId,
                        quizId: quizId ?? null,
                        score,
                        placement,
                        team,
                        trapScore,
                        rounds,
                        correctAnswers,
                        totalAnswers,
                        abandon: !!s.abandon,
                        afk: !!s.afk,
                        vsBot: !!vsBot,
                        botScores,
                    },
                });
            })
        );

        return NextResponse.json({ ok: true, saved: validScores.length });
    } catch (error) {
        console.error('[POST /api/attempts]', error);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
