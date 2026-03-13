import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
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

    // Period filter
    const periodRaw = Number.parseInt(searchParams.get('period') || '30', 10);
    const period = Number.isFinite(periodRaw) ? (periodRaw < -1 ? 30 : periodRaw) : 30;

    // Activity pagination
    const activityPage = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10));
    const activityPageSize = Math.min(
        100,
        Math.max(1, Number.parseInt(searchParams.get('pageSize') || String(ACTIVITY_PAGE_SIZE), 10))
    );

    // User search filter (searches across attempt → user.username)
    const userQuery = searchParams.get('q')?.trim() ?? '';

    // Game type filter
    const VALID_GAME_TYPES = ['QUIZ', 'UNO', 'TABOO', 'SKYJOW', 'YAHTZEE'] as const;
    type GameType = typeof VALID_GAME_TYPES[number];
    const gameTypeParam = searchParams.get('gameType')?.toUpperCase() ?? '';
    const gameTypeFilter: GameType | null = (VALID_GAME_TYPES as readonly string[]).includes(gameTypeParam)
        ? (gameTypeParam as GameType)
        : null;

    const sinceFilter = getSinceForRecentActivity(period);

    // Build the `where` clause for attempts
    const attemptWhere: Record<string, unknown> = {};
    if (sinceFilter) attemptWhere.createdAt = sinceFilter;
    if (userQuery) {
        attemptWhere.user = { username: { contains: userQuery, mode: 'insensitive' } };
    }
    if (gameTypeFilter) {
        attemptWhere.gameType = gameTypeFilter;
    }

    const selectAttemptFields = {
        createdAt: true,
        score: true,
        gameType: true,
        placement: true,
        gameId: true,
        quiz: { select: { id: true, title: true } },
        user: { select: { username: true } },
    } as const;

    const [
        totalUsers,
        totalQuizzes,
        gameCountsAllTime,
        topQuizzesAllTime,
        totalPointsAllTime,
        totalActivityAttempts,
        // Step 1 — fetch only attempts matching the filters to discover gameIds
        filteredAttempts,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.quiz.count(),
        prisma.attempt.groupBy({
            by: ['gameType'],
            _count: { id: true },
            _sum: { score: true },
        }),
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
        prisma.attempt.aggregate({
            _sum: { score: true },
        }),
        prisma.attempt.count({ where: attemptWhere }),
        prisma.attempt.findMany({
            where: attemptWhere,
            select: selectAttemptFields,
            orderBy: { createdAt: 'desc' },
            take: activityPage * activityPageSize * 8,
        }),
    ]);

    // ── Step 2: paginate filtered games ──────────────────────────────────────
    // Build a lightweight game index from the filtered attempts (one entry per gameId)
    const filteredGameIndex = new Map<string, { createdAt: Date; gameType: string; gameId: string; quiz: { id: string; title: string } | null }>();
    for (const a of filteredAttempts) {
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

    const sortedGameIds = [...filteredGameIndex.values()]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const totalGames = sortedGameIds.length;
    const avgPlayersPerGame = totalGames > 0 ? filteredAttempts.length / totalGames : 1;
    const estimatedTotalGames = Math.ceil(totalActivityAttempts / Math.max(1, avgPlayersPerGame));

    // Paginate the game list
    const pageGameIds = sortedGameIds
        .slice((activityPage - 1) * activityPageSize, activityPage * activityPageSize)
        .map(g => g.gameId);

    // ── Step 3: fetch ALL players for the paginated games ────────────────────
    // This second query ignores the user/gameType filters so every participant
    // of a matched game is returned, not just the ones matching the search.
    const allPlayersForPage = await prisma.attempt.findMany({
        where: { gameId: { in: pageGameIds } },
        select: selectAttemptFields,
        orderBy: { createdAt: 'desc' },
    });

    // ── Build per-game groups with full player lists ──────────────────────────
    const gameMap = new Map<string, {
        createdAt: Date;
        gameType: string;
        gameId: string;
        quiz: { id: string; title: string } | null;
        players: { username: string; score: number; placement: number | null }[];
    }>();

    // Seed the map with the paginated game metadata (preserves order)
    for (const gameId of pageGameIds) {
        const meta = filteredGameIndex.get(gameId)!;
        gameMap.set(gameId, { ...meta, players: [] });
    }

    // Fill in all players (from the unfiltered second query)
    for (const a of allPlayersForPage) {
        const key = a.gameId ?? `solo-${a.user.username}-${a.createdAt.getTime()}`;
        if (!gameMap.has(key)) continue; // belongs to a game not on this page
        const game = gameMap.get(key)!;
        if (!game.players.some(p => p.username === a.user.username)) {
            game.players.push({ username: a.user.username, score: a.score, placement: a.placement });
        }
    }

    const groupedActivity = [...gameMap.values()].map(g => ({
        createdAt: g.createdAt,
        gameType: g.gameType,
        gameId: g.gameId,
        quiz: g.quiz,
        playerCount: g.players.length,
        players: g.players.sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99)),
    }));

    // ── Top quizzes stats ────────────────────────────────────────────────────
    const gameStats: Record<string, { count: number; points: number }> = {};
    for (const row of gameCountsAllTime) {
        gameStats[row.gameType] = {
            count: row._count.id,
            points: row._sum.score ?? 0,
        };
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
            // Estimated total — exact count would need a raw GROUP BY gameId query
            totalGames: Math.max(totalGames, estimatedTotalGames),
            totalPages: Math.max(
                1,
                Math.ceil(Math.max(totalGames, estimatedTotalGames) / activityPageSize)
            ),
        },
    });
}
