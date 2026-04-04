// src/app/api/user/[username]/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { GAME_CONFIG } from '@/lib/gameConfig';
import { GameType } from '@/generated/prisma/client';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ username: string }> }
) {
    try {
        const { username } = await params;
        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
        const pageSize = 20;
        const skip = (page - 1) * pageSize;
        const gameTypeFilter = searchParams.get('gameType') as GameType | null;

        const user = await prisma.user.findUnique({
            where: { username },
            select: { id: true, username: true, image: true, deactivatedAt: true, deletedAt: true },
        });

        if (!user || user.deactivatedAt || user.deletedAt) {
            return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
        }

        const gameStats: Record<string, { count: number; points: number; wins: number; rounds: number; correctAnswers: number; totalAnswers: number }> = {};
        for (const key of Object.keys(GAME_CONFIG)) {
            const type = GAME_CONFIG[key as keyof typeof GAME_CONFIG].gameType;
            gameStats[type] = { count: 0, points: 0, wins: 0, rounds: 0, correctAnswers: 0, totalAnswers: 0 };
        }

        // Points + rounds par gameType
        // rounds dédupliqués par (userId, gameId) via raw SQL pour éviter la multiplication par nb joueurs
        const [attemptSumsByType, tabooRoundsResult, distinctGamesByType] = await Promise.all([
            prisma.attempt.groupBy({
                by: ['gameType'],
                where: { userId: user.id },
                _sum: { score: true, correctAnswers: true, totalAnswers: true },
            }),
            prisma.$queryRaw<{ total_rounds: number }[]>`
            SELECT SUM(rounds)::int as total_rounds
            FROM (
                SELECT DISTINCT "gameId", rounds
                FROM attempts
                WHERE "gameType" = 'TABOO'
                  AND "userId" = ${user.id}
            ) sub
        `,
            prisma.attempt.findMany({
                where: { userId: user.id },
                select: { gameType: true, gameId: true, placement: true },
                distinct: ['gameId', 'gameType'],
            }),
        ]);

        const tabooRounds = tabooRoundsResult[0]?.total_rounds ?? 0;

        for (const row of attemptSumsByType) {
            if (!gameStats[row.gameType]) gameStats[row.gameType] = { count: 0, points: 0, wins: 0, rounds: 0, correctAnswers: 0, totalAnswers: 0 };
            gameStats[row.gameType].points = row._sum.score ?? 0;
            gameStats[row.gameType].rounds = row.gameType === 'TABOO' ? tabooRounds : 0;
            gameStats[row.gameType].correctAnswers = row._sum.correctAnswers ?? 0;
            gameStats[row.gameType].totalAnswers = row._sum.totalAnswers ?? 0;
        }

        for (const g of distinctGamesByType) {
            if (!gameStats[g.gameType]) gameStats[g.gameType] = { count: 0, points: 0, wins: 0, rounds: 0, correctAnswers: 0, totalAnswers: 0 };
            gameStats[g.gameType].count++;
            if (g.placement === 1) gameStats[g.gameType].wins++;
        }

        // Activité récente
        const where = {
            userId: user.id,
            ...(gameTypeFilter ? { gameType: gameTypeFilter } : {}),
        };

        const distinctGames = await prisma.attempt.findMany({
            where,
            distinct: ['gameId'],
            select: { gameId: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        });

        const totalGames = distinctGames.length;
        const totalPages = Math.ceil(totalGames / pageSize);
        const paginatedGameIds = distinctGames.slice(skip, skip + pageSize).map(g => g.gameId);

        const recentAttempts = await prisma.attempt.findMany({
            where: { userId: user.id, gameId: { in: paginatedGameIds } },
            include: { quiz: { select: { id: true, title: true } } },
            orderBy: { createdAt: 'desc' },
        });

        const allPlayersInGames = await prisma.attempt.findMany({
            where: { gameId: { in: paginatedGameIds } },
            include: { user: { select: { username: true } } },
            orderBy: { createdAt: 'desc' },
        });

        const playersByGame = new Map<string, { username: string; score: number; placement: number | null; abandon: boolean; afk: boolean; isBot?: boolean }[]>();
        const vsBotByGame = new Map<string, boolean>();
        for (const a of allPlayersInGames) {
            if (!playersByGame.has(a.gameId)) playersByGame.set(a.gameId, []);
            if (a.vsBot) vsBotByGame.set(a.gameId, true);
            const existing = playersByGame.get(a.gameId)!;
            const idx = existing.findIndex(p => p.username === a.user.username);
            if (idx === -1) {
                existing.push({
                    username: a.user.username ?? 'Inconnu',
                    score: a.gameType === 'PUISSANCE4' ? (a.score > 0 ? 1 : 0) : a.score,
                    placement: a.placement,
                    abandon: a.abandon,
                    afk: a.afk,
                });
            }
        }
        // Ajouter les entrées bots depuis botScores stocké sur les tentatives
        const botScoresByGame = new Map<string, { username: string; score: number; placement: number }[]>();
        for (const a of allPlayersInGames) {
            if (!a.vsBot || !a.botScores || botScoresByGame.has(a.gameId)) continue;
            const bots = a.botScores as { username: string; score: number; placement: number }[];
            if (Array.isArray(bots) && bots.length > 0) botScoresByGame.set(a.gameId, bots);
        }

        for (const [gameId, isVsBot] of vsBotByGame) {
            if (!isVsBot) continue;
            const humans = playersByGame.get(gameId) ?? [];
            const storedBots = botScoresByGame.get(gameId);
            if (storedBots && storedBots.length > 0) {
                for (const bot of storedBots) {
                    humans.push({ username: bot.username, score: bot.score, placement: bot.placement, abandon: false, afk: false, isBot: true });
                }
            } else {
                // Fallback pour les anciennes parties
                const usedPlacements = new Set(humans.map(p => p.placement).filter(p => p != null));
                let botPlacement = 1;
                while (usedPlacements.has(botPlacement)) botPlacement++;
                humans.push({ username: '🤖 Bot 1', score: 0, placement: botPlacement, abandon: false, afk: false, isBot: true });
            }
        }

        const byGame = new Map<string, typeof recentAttempts>();
        for (const a of recentAttempts) {
            if (!byGame.has(a.gameId)) byGame.set(a.gameId, []);
            byGame.get(a.gameId)!.push(a);
        }

        const recentActivity = paginatedGameIds.map(gameId => {
            const attempts = byGame.get(gameId) ?? [];
            const first = attempts[0];
            const myEntry = playersByGame.get(gameId)?.find(p => p.username === user.username);
            return {
                gameId,
                gameType: first.gameType,
                createdAt: first.createdAt,
                quiz: first.quiz ? { id: first.quiz.id, title: first.quiz.title } : null,
                score: first.gameType === 'PUISSANCE4'
                    ? ((myEntry?.score ?? first.score) > 0 ? 1 : 0)
                    : (myEntry?.score ?? first.score),
                placement: myEntry?.placement ?? first.placement,
                abandon: myEntry?.abandon ?? first.abandon,
                afk: myEntry?.afk ?? first.afk,
                vsBot: vsBotByGame.get(gameId) ?? false,
                players: (playersByGame.get(gameId) ?? []).sort((a, b) => {
                    if (a.placement != null && b.placement != null) return a.placement - b.placement;
                    if (a.placement != null) return -1;
                    if (b.placement != null) return 1;
                    return b.score - a.score;
                }),
            }
        });

        return NextResponse.json({
            user: { id: user.id, username: user.username, image: user.image },
            gameStats,
            totalGames,
            recentActivity,
            pagination: { page, pageSize, totalGames, totalPages },
        });
    } catch (err) {
        console.error('[stats] error:', err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
