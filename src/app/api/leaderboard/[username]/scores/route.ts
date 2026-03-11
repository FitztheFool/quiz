// app/api/leaderboard/games/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const GAME_CONFIG = {
    uno: {
        gameType: 'UNO' as const,
        label: 'UNO',
        higherIsBetter: true,
        scoreLabel: 'Points',
        description: 'Les points sont calculés selon le placement final : 🥇 1ère place = 20 pts · 🥈 2ème = 13 pts · 🥉 3ème = 6 pts · Autres = 2 pts. Le classement est basé sur le total de points cumulés.',
    },
    skyjow: {
        gameType: 'SKYJOW' as const,
        label: 'Skyjow',
        higherIsBetter: false,
        scoreLabel: 'Score moyen',
        description: 'À Skyjow, moins de points c\'est mieux ! Le classement est basé sur le score moyen par partie (somme des cartes restantes). Les colonnes de 3 cartes identiques sont éliminées. Le déclencheur du dernier tour voit son score doublé s\'il n\'est pas le meilleur.',
    },
    taboo: {
        gameType: 'TABOO' as const,
        label: 'Taboo',
        higherIsBetter: true,
        scoreLabel: 'Mots devinés',
        description: 'Le score représente le nombre de mots devinés par ton équipe sur l\'ensemble des parties. Un mot deviné ou qui se fait buzzer comme piégé rapporte 1 point à l\'équipe.',
    },
    quiz: {
        gameType: 'QUIZ' as const,
        label: 'Quiz',
        higherIsBetter: true,
        scoreLabel: 'Score total',
        description: 'Classement basé sur le meilleur score cumulé par quiz. Pour chaque quiz, seul ton meilleur score est comptabilisé. Le score total est la somme de tes meilleurs scores sur tous les quiz complétés.',
    },
};

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
            where: { userId: { in: eligibleUserIds }, gameType: config.gameType },
            select: { userId: true, score: true, trapScore: true, placement: true, createdAt: true },
        });

        const byUser = new Map<string, { scores: number[]; trapScores: number[]; placements: number[] }>();
        for (const a of attempts) {
            if (!byUser.has(a.userId)) byUser.set(a.userId, { scores: [], trapScores: [], placements: [] });
            const u = byUser.get(a.userId)!;
            u.scores.push(a.score);
            u.trapScores.push(a.trapScore ?? 0);
            if (a.placement !== null) u.placements.push(a.placement);
        }

        const sorted = Array.from(byUser.entries())
            .map(([userId, data]) => {
                const gamesPlayed = data.scores.length;
                const totalScore = data.scores.reduce((s, v) => s + v, 0);
                const totalTrapScore = data.trapScores.reduce((s, v) => s + v, 0);
                const avgScore = gamesPlayed > 0 ? Math.round(totalScore / gamesPlayed) : 0;
                const wins = data.placements.filter(p => p === 1).length;
                const score = game === 'skyjow' ? avgScore : totalScore;

                const detail = game === 'skyjow'
                    ? `Moy. ${avgScore} pts · ${gamesPlayed} partie${gamesPlayed > 1 ? 's' : ''}`
                    : game === 'taboo'
                        ? `${totalScore} deviné${totalScore > 1 ? 's' : ''} · ${totalTrapScore} piégé${totalTrapScore > 1 ? 's' : ''} · ${gamesPlayed} manche${gamesPlayed > 1 ? 's' : ''}`
                        : `${wins} victoire${wins > 1 ? 's' : ''} · ${gamesPlayed} partie${gamesPlayed > 1 ? 's' : ''}`;

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
