import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { verifySoloToken } from '@/lib/soloToken';
import prisma from '@/lib/prisma';
import { Prisma, type GameType } from '@/generated/prisma/client';

const DEFAULT_MIN_DURATION_MS = 10_000;

interface Config {
    gameType: GameType;
    maxScore: number;
    hasRounds?: boolean;
    maxRounds?: number;
    /** Minimum elapsed time between token issuance and submission (ms). */
    minDurationMs?: number;
}

export function createSoloSubmitHandler({
    gameType, maxScore, hasRounds = false, maxRounds = 1000,
    minDurationMs = DEFAULT_MIN_DURATION_MS,
}: Config) {
    return async function POST(req: NextRequest) {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        try {
            const body = await req.json();
            const { score, token } = body;

            if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > maxScore) {
                return NextResponse.json({ error: 'Score invalide' }, { status: 400 });
            }

            const check = verifySoloToken(token, session.user.id, gameType, minDurationMs);
            if (!check.ok) {
                return NextResponse.json({ error: check.error }, { status: 400 });
            }

            let rounds: number | undefined;
            if (hasRounds) {
                const raw = typeof body.level === 'number' && Number.isFinite(body.level) ? body.level : 1;
                rounds = Math.max(1, Math.min(maxRounds, Math.floor(raw)));
            }

            // Token un-shot : on refuse toute soumission ultérieure pour le même token,
            // empêche le replay pour gonfler le score.
            try {
                await prisma.attempt.create({
                    data: {
                        userId: session.user.id,
                        gameType,
                        gameId: token,
                        score,
                        ...(rounds !== undefined && { rounds }),
                    },
                });
            } catch (e) {
                if (e instanceof Prisma.PrismaClientKnownRequestError) {
                    if (e.code === 'P2002') return NextResponse.json({ error: 'Token déjà utilisé' }, { status: 409 });
                    if (e.code === 'P2003') {
                        // FK violation on userId → the session points to a user that no longer exists.
                        return NextResponse.json({ error: 'Session expirée, reconnectez-vous' }, { status: 401 });
                    }
                }
                throw e;
            }

            return NextResponse.json({ ok: true });
        } catch (err) {
            console.error(`[POST /api/${gameType.toLowerCase()}/submit]`, err);
            return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
        }
    };
}
