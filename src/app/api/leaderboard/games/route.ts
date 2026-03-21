// src/app/api/leaderboard/games/route.ts
// app/api/leaderboard/games/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { GameType } from '@prisma/client';
import { GAME_CONFIG } from '@/lib/gameConfig';


export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const game = searchParams.get('game') as keyof typeof GAME_CONFIG | null;
        const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
        const skip = (page - 1) * limit;

        if (!game || !GAME_CONFIG[game]) {
            return NextResponse.json({ error: 'Jeu invalide' }, { status: 400 });
        }

        const config = GAME_CONFIG[game];

        const eligibleUsers = await prisma.user.findMany({
            where: { role: { notIn: ['ADMIN', 'RANDOM'] } },
            select: { id: true, username: true },
        });
        const eligibleUserIds = eligibleUsers.map(u => u.id);

        if (game === 'quiz') {
            const allAttempts = await prisma.attempt.findMany({
                where: { userId: { in: eligibleUserIds }, gameType: 'QUIZ' },
                select: { userId: true, quizId: true, score: true },
            });

            const bestScores = new Map<string, Map<string, number>>();
            for (const attempt of allAttempts) {
                if (!attempt.quizId) continue;
                if (!bestScores.has(attempt.userId)) bestScores.set(attempt.userId, new Map());
                const byQuiz = bestScores.get(attempt.userId)!;
                byQuiz.set(attempt.quizId, Math.max(byQuiz.get(attempt.quizId) ?? 0, attempt.score));
            }

            const sorted = Array.from(bestScores.entries())
                .map(([userId, byQuiz]) => {
                    const total = Array.from(byQuiz.values()).reduce((sum, s) => sum + s, 0);
                    const quizCount = byQuiz.size;
                    return {
                        userId,
                        username: eligibleUsers.find(u => u.id === userId)?.username ?? '?',
                        score: total,
                        gamesPlayed: quizCount,
                        detail: `${quizCount} quiz complété${quizCount > 1 ? 's' : ''}`,
                    };
                })
                .sort((a, b) => b.score - a.score);

            const total = sorted.length;
            const leaderboard = sorted
                .slice(skip, skip + limit)
                .map((e, i) => ({ rank: skip + i + 1, ...e }));

            return NextResponse.json({
                leaderboard,
                config,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            });
        }

        // UNO, SKYJOW, TABOO, PUISSANCE4, ...
        const attempts = await prisma.attempt.findMany({
            where: { userId: { in: eligibleUserIds }, gameType: config.gameType as GameType },
            select: { userId: true, score: true, trapScore: true, placement: true, gameId: true },
        });

        // Pour Taboo : rounds dédupliqués par (userId, gameId) via raw SQL
        // → 1 valeur de rounds par partie par joueur, pas de multiplication
        const tabooRoundsByUser = game === 'taboo'
            ? await prisma.$queryRaw<{ userId: string; total_rounds: number }[]>`
                SELECT "userId", SUM(rounds)::int as total_rounds
                FROM (
                    SELECT DISTINCT "userId", "gameId", rounds
                    FROM attempts
                    WHERE "gameType" = 'TABOO'
                      AND "userId" = ANY(${eligibleUserIds})
                ) sub
                GROUP BY "userId"
            `
            : [];

        const roundsByUser = new Map<string, number>(
            tabooRoundsByUser.map(r => [r.userId, r.total_rounds])
        );

        const byUser = new Map<string, { scores: number[]; trapScores: number[]; placements: number[]; draws: number }>();
        for (const a of attempts) {
            if (!byUser.has(a.userId)) byUser.set(a.userId, { scores: [], trapScores: [], placements: [], draws: 0 });
            const u = byUser.get(a.userId)!;
            u.scores.push(a.score);
            u.trapScores.push(a.trapScore ?? 0);
            if (a.placement === null) {
                u.draws += 1;
            } else {
                u.placements.push(a.placement);
            }
        }

        const sorted = Array.from(byUser.entries())
            .map(([userId, data]) => {
                const gamesPlayed = data.scores.length;
                const totalScore = data.scores.reduce((s, v) => s + v, 0);
                const totalTrapScore = data.trapScores.reduce((s, v) => s + v, 0);
                const avgScore = gamesPlayed > 0 ? Math.round(totalScore / gamesPlayed) : 0;
                const wins = data.placements.filter(p => p === 1).length;
                const draws = data.draws;
                const score = game === 'skyjow' || game === 'just_one' ? avgScore
                    : game === 'puissance4' || game === 'battleship' ? wins
                        : totalScore;
                const totalRounds = roundsByUser.get(userId) ?? 0;

                let detail: string;
                switch (game) {
                    case 'skyjow':
                        detail = `Moy. ${avgScore} pts · ${gamesPlayed} partie${gamesPlayed > 1 ? 's' : ''}`;
                        break;
                    case 'taboo':
                        detail = `${totalScore} devinés · ${totalTrapScore} piégés · ${totalRounds} manche${totalRounds > 1 ? 's' : ''}`;
                        break;
                    case 'yahtzee':
                        detail = `Moy. ${avgScore} pts · ${wins} victoire${wins > 1 ? 's' : ''} · ${gamesPlayed} partie${gamesPlayed > 1 ? 's' : ''}`;
                        break;
                    case 'puissance4':
                        detail = `${wins} victoire${wins > 1 ? 's' : ''} · ${draws} nul${draws > 1 ? 's' : ''} · ${gamesPlayed} partie${gamesPlayed > 1 ? 's' : ''}`;
                        break;
                    case 'just_one':
                        detail = `Score moyen ${avgScore}/13 · ${gamesPlayed} partie${gamesPlayed > 1 ? 's' : ''}`;
                        break;
                    case 'battleship':
                        detail = `${wins} victoire${wins > 1 ? 's' : ''} · ${gamesPlayed} partie${gamesPlayed > 1 ? 's' : ''}`;
                        break;
                    default:
                        detail = `${wins} victoire${wins > 1 ? 's' : ''} · ${gamesPlayed} partie${gamesPlayed > 1 ? 's' : ''}`;
                }

                return {
                    userId,
                    username: eligibleUsers.find(u => u.id === userId)?.username ?? '?',
                    score,
                    gamesPlayed,
                    wins,
                    detail,
                };
            })
            .sort((a, b) => config.higherIsBetter ? b.score - a.score : a.score - b.score);

        const total = sorted.length;
        const leaderboard = sorted
            .slice(skip, skip + limit)
            .map((e, i) => ({ rank: skip + i + 1, ...e }));

        return NextResponse.json({
            leaderboard,
            config,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });

    } catch (error) {
        console.error('[GET /api/leaderboard/games]', error);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
