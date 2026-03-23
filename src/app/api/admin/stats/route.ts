// src/app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { GAME_CONFIG } from '@/lib/gameConfig';
import prisma from '@/lib/prisma';

function getSinceForRecentActivity(period: number) {
    if (period === -1) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        return { gte: start };
    }
    if (!Number.isFinite(period) || period === 0) return null;
    if (period > 0) return { gte: new Date(Date.now() - period * 24 * 60 * 60 * 1000) };
    return null;
}

const ACTIVITY_PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);

    const periodRaw = Number.parseInt(searchParams.get('period') || '30', 10);
    const period = Number.isFinite(periodRaw) ? (periodRaw < -1 ? 30 : periodRaw) : 30;

    const activityPage = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10));
    const activityPageSize = Math.min(
        100,
        Math.max(1, Number.parseInt(searchParams.get('pageSize') || String(ACTIVITY_PAGE_SIZE), 10))
    );

    const userQuery = searchParams.get('q')?.trim() ?? '';

    const VALID_GAME_TYPES = Object.values(GAME_CONFIG).map(g => g.gameType);
    const gameTypeParam = searchParams.get('gameType')?.toUpperCase() ?? '';
    const gameTypeFilter = VALID_GAME_TYPES.includes(gameTypeParam as any) ? gameTypeParam : null;

    const sinceFilter = getSinceForRecentActivity(period);

    const attemptWhere: Record<string, unknown> = {};
    if (sinceFilter) attemptWhere.createdAt = sinceFilter;
    if (userQuery) attemptWhere.user = { username: { contains: userQuery, mode: 'insensitive' } };
    if (gameTypeFilter) attemptWhere.gameType = gameTypeFilter;

    const selectAttemptFields = {
        createdAt: true,
        score: true,
        gameType: true,
        placement: true,
        gameId: true,
        quiz: { select: { id: true, title: true } },
        user: { select: { username: true } },
    } as const;

    const distinctGameIds = await prisma.attempt.findMany({
        where: attemptWhere,
        select: { gameId: true, createdAt: true },
        distinct: ['gameId'],
        orderBy: { createdAt: 'desc' },
    });

    const totalFilteredGames = distinctGameIds.length;
    const totalPages = Math.max(1, Math.ceil(totalFilteredGames / activityPageSize));

    const pageGameIds = distinctGameIds
        .slice((activityPage - 1) * activityPageSize, activityPage * activityPageSize)
        .map(g => g.gameId);

    const [
        totalUsers,
        totalQuizzes,
        gameStatsByType,
        distinctGamesByType,
        // rounds Taboo : 1 attempt par partie (dédupliqué par gameId) pour ne pas multiplier par le nb de joueurs
        tabooRoundsPerGame,
        topQuizzesAllTime,
        totalPointsAllTime,
        allPlayersForPage,
        filteredAttemptsForPage,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.quiz.count(),
        prisma.attempt.groupBy({
            by: ['gameType'],
            _sum: { score: true },
        }),
        prisma.attempt.findMany({
            select: { gameType: true, gameId: true },
            distinct: ['gameId', 'gameType'],
        }),
        // 1 ligne par partie Taboo — raw SQL pour garantir la déduplication
        prisma.$queryRaw<{ total_rounds: number }[]>`
            SELECT SUM(rounds)::int as total_rounds
            FROM (
                SELECT DISTINCT "gameId", rounds
                FROM attempts
                WHERE "gameType" = 'TABOO'
            ) sub
        `,
        prisma.quiz.findMany({
            select: {
                id: true,
                title: true,
                _count: { select: { attempts: true } },
                attempts: { select: { score: true } },
                questions: { select: { points: true } },
            },
            orderBy: { attempts: { _count: 'desc' } },
            take: 10,
        }),
        prisma.attempt.aggregate({ _sum: { score: true } }),
        prisma.attempt.findMany({
            where: { gameId: { in: pageGameIds } },
            select: selectAttemptFields,
            orderBy: { createdAt: 'desc' },
        }),
        prisma.attempt.findMany({
            where: { ...attemptWhere, gameId: { in: pageGameIds } },
            select: selectAttemptFields,
            orderBy: { createdAt: 'desc' },
        }),
    ]);

    // Somme des rounds Taboo dédupliqués par partie
    const totalTabooRounds = tabooRoundsPerGame[0]?.total_rounds ?? 0;

    const filteredGameIndex = new Map<string, {
        createdAt: Date;
        gameType: string;
        gameId: string;
        quiz: { id: string; title: string } | null;
    }>();

    for (const a of filteredAttemptsForPage) {
        const key = a.gameId ?? `solo-${a.user.username}-${a.createdAt.getTime()}`;
        const existing = filteredGameIndex.get(key);
        if (existing) {
            existing.createdAt = a.createdAt;
            existing.gameType = a.gameType;
            // Garder le quiz de allPlayersForPage s'il existe déjà
            if (!existing.quiz && a.quiz) {
                existing.quiz = { id: a.quiz.id, title: a.quiz.title };
            }
        }
    }

    // D'abord, indexer TOUS les joueurs pour avoir le quiz
    for (const a of allPlayersForPage) {
        const key = a.gameId ?? `solo-${a.user.username}-${a.createdAt.getTime()}`;
        if (!filteredGameIndex.has(key)) {
            filteredGameIndex.set(key, {
                createdAt: a.createdAt,
                gameType: a.gameType,
                gameId: a.gameId ?? key,
                quiz: a.quiz ? { id: a.quiz.id, title: a.quiz.title } : null,
            });
        }
    }


    const gameMap = new Map<string, {
        createdAt: Date;
        gameType: string;
        gameId: string;
        quiz: { id: string; title: string } | null;
        players: { username: string; score: number; placement: number | null }[];
    }>();

    for (const gameId of pageGameIds) {
        const meta = filteredGameIndex.get(gameId);
        if (!meta) continue;
        gameMap.set(gameId, { ...meta, players: [] });
    }

    for (const a of allPlayersForPage) {
        const key = a.gameId ?? `solo-${a.user.username}-${a.createdAt.getTime()}`;
        if (!gameMap.has(key)) continue;
        const game = gameMap.get(key)!;
        if (!game.players.some(p => p.username === a.user.username)) {
            game.players.push({
                username: a.user.username ?? 'Anonyme',
                score: a.score,
                placement: a.placement,
            });
        }
    }

    const groupedActivity = [...gameMap.values()].map(g => ({
        createdAt: g.createdAt,
        gameType: g.gameType,
        gameId: g.gameId,
        quiz: g.quiz,
        playerCount: g.players.length,
        players: g.players.sort((a, b) => {
            if (a.placement != null && b.placement != null) return a.placement - b.placement;
            if (a.placement != null) return -1;
            if (b.placement != null) return 1;
            return b.score - a.score;
        }),
    }));

    // Initialise tous les jeux à 0 pour qu'ils apparaissent même sans données
    const gameStats: Record<string, { count: number; points: number; rounds: number }> = {};
    for (const g of Object.values(GAME_CONFIG)) {
        gameStats[g.gameType] = { count: 0, points: 0, rounds: 0 };
    }

    for (const row of gameStatsByType) {
        gameStats[row.gameType] = {
            count: 0,
            points: row._sum.score ?? 0,
            rounds: row.gameType === 'TABOO' ? totalTabooRounds : 0,
        };
    }

    for (const g of distinctGamesByType) {
        if (!gameStats[g.gameType]) gameStats[g.gameType] = { count: 0, points: 0, rounds: 0 };
        gameStats[g.gameType].count++;
    }

    const quizzesWithStats = topQuizzesAllTime.map((quiz) => {
        const scores = quiz.attempts.map((a) => a.score);
        const avgScore = scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0;
        const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
        const maxPossibleScore = quiz.questions.reduce((sum, q) => sum + (q.points ?? 0), 0);
        return {
            id: quiz.id,
            title: quiz.title,
            playCount: quiz._count.attempts,
            avgScore,
            maxScore,
            maxPossibleScore,
            questionCount: quiz.questions.length,
        };
    });

    return NextResponse.json({
        totals: {
            users: totalUsers,
            quizzes: totalQuizzes,
            pointsScored: totalPointsAllTime._sum.score ?? 0,
            gameStats,
        },
        topQuizzes: quizzesWithStats,
        recentActivity: groupedActivity,
        activityMeta: {
            page: activityPage,
            pageSize: activityPageSize,
            totalGames: totalFilteredGames,
            totalPages,
        },
    });
}
