// src/app/api/user/[username]/ranks/route.ts
// Retourne le classement du joueur (1er, 2ème, 3ème...) par jeu
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type RankRow = { gameType: string; rnk: number };

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ username: string }> }
) {
    try {
        const { username } = await params;

        const user = await prisma.user.findUnique({
            where: { username },
            select: { id: true, deactivatedAt: true, deletedAt: true, role: true },
        });

        if (!user || user.deletedAt || (user.deactivatedAt && user.role !== 'ADMIN')) {
            return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
        }

        const eligibleUsers = await prisma.user.findMany({
            where: { role: { notIn: ['RANDOM'] } },
            select: { id: true },
        });
        // Toujours inclure l'utilisateur demandeur pour qu'il ait un rang même s'il est admin
        const eligibleIds = [...new Set([...eligibleUsers.map(u => u.id), user.id])];

        // ── 1. Jeux classés par score total (UNO, TABOO, YAHTZEE, DIAMANT, IMPOSTOR) ─
        const sumRanks = await prisma.$queryRaw<RankRow[]>`
            WITH scores AS (
                SELECT "userId", "gameType"::text, SUM(score) AS val
                FROM attempts
                WHERE "userId" = ANY(${eligibleIds})
                  AND "gameType"::text = ANY(ARRAY['UNO','TABOO','YAHTZEE','DIAMANT','IMPOSTOR'])
                GROUP BY "userId", "gameType"
            ),
            ranked AS (
                SELECT "userId", "gameType",
                    RANK() OVER (PARTITION BY "gameType" ORDER BY val DESC) AS rnk
                FROM scores
            )
            SELECT "gameType", rnk::int FROM ranked WHERE "userId" = ${user.id}
        `;

        // ── 1b. Solo games ranked by best score (MAX) ────────────────────────────────
        const snakeRanks = await prisma.$queryRaw<RankRow[]>`
            WITH scores AS (
                SELECT "userId", "gameType"::text, MAX(score) AS val
                FROM attempts
                WHERE "userId" = ANY(${eligibleIds})
                  AND "gameType"::text = ANY(ARRAY['SNAKE','PACMAN'])
                GROUP BY "userId", "gameType"
            ),
            ranked AS (
                SELECT "userId", "gameType",
                    RANK() OVER (PARTITION BY "gameType" ORDER BY val DESC) AS rnk
                FROM scores
            )
            SELECT "gameType", rnk::int FROM ranked WHERE "userId" = ${user.id}
        `;

        // ── 2. Jeux classés par score moyen (JUST_ONE ↑, SKYJOW ↓) ──────────────────
        const avgRanks = await prisma.$queryRaw<RankRow[]>`
            WITH scores AS (
                SELECT "userId", "gameType"::text,
                    SUM(score)::float / COUNT(*)::float AS val
                FROM attempts
                WHERE "userId" = ANY(${eligibleIds})
                  AND "gameType"::text = ANY(ARRAY['SKYJOW','JUST_ONE'])
                GROUP BY "userId", "gameType"
            ),
            ranked AS (
                SELECT "userId", "gameType",
                    RANK() OVER (
                        PARTITION BY "gameType"
                        ORDER BY
                            CASE WHEN "gameType" = 'SKYJOW'   THEN val END ASC,
                            CASE WHEN "gameType" = 'JUST_ONE' THEN val END DESC
                    ) AS rnk
                FROM scores
            )
            SELECT "gameType", rnk::int FROM ranked WHERE "userId" = ${user.id}
        `;

        // ── 3. Jeux classés par victoires (PUISSANCE4, BATTLESHIP) ───────────────────
        const winRanks = await prisma.$queryRaw<RankRow[]>`
            WITH scores AS (
                SELECT a."userId", a."gameType"::text,
                    COUNT(DISTINCT CASE WHEN a.placement = 1 THEN a."gameId" END)::int AS val
                FROM attempts a
                WHERE a."userId" = ANY(${eligibleIds})
                  AND a."gameType"::text = ANY(ARRAY['PUISSANCE4','BATTLESHIP'])
                GROUP BY a."userId", a."gameType"
            ),
            ranked AS (
                SELECT "userId", "gameType",
                    RANK() OVER (PARTITION BY "gameType" ORDER BY val DESC) AS rnk
                FROM scores
            )
            SELECT "gameType", rnk::int FROM ranked WHERE "userId" = ${user.id}
        `;

        // ── 4. Quiz : somme des meilleurs scores par quiz ─────────────────────────────
        const quizRanks = await prisma.$queryRaw<RankRow[]>`
            WITH best AS (
                SELECT "userId", "quizId", MAX(score) AS best_score
                FROM attempts
                WHERE "gameType"::text = 'QUIZ'
                  AND "userId" = ANY(${eligibleIds})
                  AND "quizId" IS NOT NULL
                GROUP BY "userId", "quizId"
            ),
            scores AS (
                SELECT "userId", 'QUIZ' AS "gameType", SUM(best_score) AS val
                FROM best
                GROUP BY "userId"
            ),
            ranked AS (
                SELECT "userId", "gameType",
                    RANK() OVER (PARTITION BY "gameType" ORDER BY val DESC) AS rnk
                FROM scores
            )
            SELECT "gameType", rnk::int FROM ranked WHERE "userId" = ${user.id}
        `;

        const ranks: Record<string, number> = {};
        for (const row of [...sumRanks, ...snakeRanks, ...avgRanks, ...winRanks, ...quizRanks]) {
            ranks[row.gameType] = Number(row.rnk);
        }

        return NextResponse.json({ ranks });
    } catch (err) {
        console.error('[ranks] error:', err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
