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

        // UNO, SKYJOW, TABOO
        const attempts = await prisma.attempt.findMany({
            where: { userId: { in: eligibleUserIds }, gameType: config.gameType as GameType },
            select: { userId: true, score: true, trapScore: true, placement: true, gameId: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
        });

        const byUser = new Map<string, { scores: number[]; trapScores: number[]; placements: number[]; turnsPlayed: number }>();
        for (const a of attempts) {
            if (!byUser.has(a.userId)) byUser.set(a.userId, { scores: [], trapScores: [], placements: [], turnsPlayed: 0 });
            const u = byUser.get(a.userId)!;
            if (game === 'taboo') {
                u.turnsPlayed += 1;
            } else {
                u.scores.push(a.score);
                u.trapScores.push(a.trapScore ?? 0);
            }
            if (a.placement !== null) u.placements.push(a.placement);
        }

        // Taboo : prendre uniquement le dernier attempt par (userId, gameId) = score final de la partie
        if (game === 'taboo') {
            const lastByUserGame = new Map<string, typeof attempts[0]>();
            for (const a of attempts) {
                const key = `${a.userId}__${a.gameId}`;
                const existing = lastByUserGame.get(key);
                if (!existing || a.createdAt > existing.createdAt) {
                    lastByUserGame.set(key, a);
                }
            }
            for (const a of lastByUserGame.values()) {
                const u = byUser.get(a.userId)!;
                u.scores.push(a.score);
                u.trapScores.push(a.trapScore ?? 0);
            }
        }

        const sorted = Array.from(byUser.entries())
            .map(([userId, data]) => {
                const gamesPlayed = data.scores.length;
                const turnsPlayed = game === 'taboo' ? data.turnsPlayed : gamesPlayed;
                const totalScore = data.scores.reduce((s, v) => s + v, 0);
                const totalTrapScore = data.trapScores.reduce((s, v) => s + v, 0);
                const avgScore = gamesPlayed > 0 ? Math.round(totalScore / gamesPlayed) : 0;
                const wins = data.placements.filter(p => p === 1).length;
                const score = game === 'skyjow' ? avgScore : totalScore;

                let detail: string;
                switch (game) {
                    case 'skyjow':
                        detail = `Moy. ${avgScore} pts · ${gamesPlayed} partie${gamesPlayed > 1 ? 's' : ''}`;
                        break;
                    case 'taboo':
                        detail = `${totalScore} devinés · ${totalTrapScore} piégés · ${turnsPlayed} manche${turnsPlayed > 1 ? 's' : ''}`;
                        break;
                    case 'yahtzee':
                        detail = `Moy. ${avgScore} pts · ${wins} victoire${wins > 1 ? 's' : ''} · ${gamesPlayed} partie${gamesPlayed > 1 ? 's' : ''}`;
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
