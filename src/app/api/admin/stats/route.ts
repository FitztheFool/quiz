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
        abandon: true,
        afk: true,
        vsBot: true,
        botScores: true,
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
        tabooRoundsPerGame,
        justOneStatsPerGame,
        topQuizzesAllTime,
        totalPointsAllTime,
        allPlayersForPage,
        filteredAttemptsForPage,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.quiz.count(),
        prisma.$queryRaw<{ gameType: string; total_score: number; total_correct: number; total_answers: number }[]>`
            SELECT
                "gameType",
                SUM(score)::int as total_score,
                SUM("correctAnswers")::int as total_correct,
                SUM("totalAnswers")::int as total_answers
            FROM attempts
            GROUP BY "gameType"
        `,
        prisma.attempt.findMany({
            select: { gameType: true, gameId: true },
            distinct: ['gameId', 'gameType'],
        }),
        // Taboo : 1 ligne par partie pour ne pas multiplier par le nb de joueurs
        prisma.$queryRaw<{ total_rounds: number }[]>`
            SELECT SUM(rounds)::int as total_rounds
            FROM (
                SELECT DISTINCT "gameId", rounds
                FROM attempts
                WHERE "gameType" = 'TABOO'
            ) sub
        `,
        // Just One : dédupliqué par gameId pour ne pas multiplier par le nb de joueurs
        prisma.$queryRaw<{ total_correct: number; total_answers: number }[]>`
            SELECT
                SUM("correctAnswers")::int as total_correct,
                SUM("totalAnswers")::int as total_answers
            FROM (
                SELECT DISTINCT ON ("gameId") "correctAnswers", "totalAnswers"
                FROM attempts
                WHERE "gameType" = 'JUST_ONE'
                ORDER BY "gameId", "createdAt" ASC
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

    const totalTabooRounds = tabooRoundsPerGame[0]?.total_rounds ?? 0;
    const totalJustOneCorrect = justOneStatsPerGame[0]?.total_correct ?? 0;
    const totalJustOneAnswers = justOneStatsPerGame[0]?.total_answers ?? 0;

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
            if (!existing.quiz && a.quiz) {
                existing.quiz = { id: a.quiz.id, title: a.quiz.title };
            }
        }
    }

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

    const vsBotByGame = new Map<string, boolean>();
    for (const a of allPlayersForPage) {
        if (a.vsBot) vsBotByGame.set(a.gameId ?? '', true);
    }

    const gameMap = new Map<string, {
        createdAt: Date;
        gameType: string;
        gameId: string;
        quiz: { id: string; title: string } | null;
        players: { username: string; score: number; placement: number | null; abandon?: boolean; afk?: boolean; isBot?: boolean }[];
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
                abandon: a.abandon ?? false,
                afk: a.afk ?? false,
            });
        }
    }

    const botScoresByGame = new Map<string, { username: string; score: number; placement: number }[]>();
    for (const a of allPlayersForPage) {
        if (!a.vsBot || !a.botScores || !a.gameId) continue;
        const bots = a.botScores as { username: string; score: number; placement: number }[];
        if (Array.isArray(bots) && bots.length > 0 && !botScoresByGame.has(a.gameId)) {
            botScoresByGame.set(a.gameId, bots);
        }
    }

    for (const [gameId, isVsBot] of vsBotByGame) {
        if (!isVsBot) continue;
        const game = gameMap.get(gameId);
        if (!game) continue;
        const storedBots = botScoresByGame.get(gameId);
        if (storedBots && storedBots.length > 0) {
            for (const bot of storedBots) {
                game.players.push({ username: bot.username, score: bot.score, placement: bot.placement, abandon: false, afk: false, isBot: true });
            }
        } else {
            const usedPlacements = new Set(game.players.map(p => p.placement).filter(p => p != null));
            let botPlacement = 1;
            while (usedPlacements.has(botPlacement)) botPlacement++;
            game.players.push({ username: '🤖 Bot 1', score: 0, placement: botPlacement, abandon: false, afk: false, isBot: true });
        }
    }

    const groupedActivity = [...gameMap.values()].map(g => ({
        createdAt: g.createdAt,
        gameType: g.gameType,
        gameId: g.gameId,
        quiz: g.quiz,
        vsBot: vsBotByGame.get(g.gameId) ?? false,
        playerCount: g.players.length,
        players: g.players.sort((a, b) => {
            if (a.placement != null && b.placement != null) return a.placement - b.placement;
            if (a.placement != null) return -1;
            if (b.placement != null) return 1;
            return b.score - a.score;
        }),
    }));

    const gameStats: Record<string, { count: number; points: number; rounds: number; correctAnswers: number; totalAnswers: number }> = {};

    for (const g of Object.values(GAME_CONFIG)) {
        gameStats[g.gameType] = { count: 0, points: 0, rounds: 0, correctAnswers: 0, totalAnswers: 0 };
    }

    for (const row of gameStatsByType) {
        if (!gameStats[row.gameType]) continue;
        gameStats[row.gameType].points = Number(row.total_score) ?? 0;
        gameStats[row.gameType].rounds = row.gameType === 'TABOO' ? totalTabooRounds : 0;
        // Just One : on écrase après avec les valeurs dédupliquées
        if (row.gameType !== 'JUST_ONE') {
            gameStats[row.gameType].correctAnswers = Number(row.total_correct) ?? 0;
            gameStats[row.gameType].totalAnswers = Number(row.total_answers) ?? 0;
        }
    }

    // Just One : valeurs dédupliquées par gameId
    gameStats['JUST_ONE'].correctAnswers = totalJustOneCorrect;
    gameStats['JUST_ONE'].totalAnswers = totalJustOneAnswers;

    // Taboo : rounds dédupliqués par gameId
    if (gameStats['TABOO']) gameStats['TABOO'].rounds = totalTabooRounds;

    // ← boucle unique, plus de doublon
    for (const g of distinctGamesByType) {
        if (!gameStats[g.gameType]) gameStats[g.gameType] = { count: 0, points: 0, rounds: 0, correctAnswers: 0, totalAnswers: 0 };
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
