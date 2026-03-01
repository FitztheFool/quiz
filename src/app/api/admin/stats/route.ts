import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

export async function GET() {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const [totalUsers, totalQuizzes, totalScores, topQuizzes, recentActivity] = await Promise.all([
        prisma.user.count(),
        prisma.quiz.count(),
        prisma.score.count(),

        // Quiz les plus joués avec stats de réponses
        prisma.quiz.findMany({
            select: {
                id: true,
                title: true,
                _count: { select: { scores: true } },
                scores: {
                    select: { totalScore: true },
                },
                questions: {
                    select: {
                        id: true,
                        content: true,
                        points: true,
                        type: true,
                    },
                },
            },
            orderBy: { scores: { _count: 'desc' } },
            take: 10,
        }),

        // Activité récente (scores des 30 derniers jours)
        prisma.score.findMany({
            where: {
                completedAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                },
            },
            select: {
                completedAt: true,
                totalScore: true,
                quiz: { select: { title: true } },
                user: { select: { username: true } },
            },
            orderBy: { completedAt: 'desc' },
            take: 50,
        }),
    ]);

    const totalPointsScored = await prisma.score.aggregate({ _sum: { totalScore: true } });

    const quizzesWithStats = topQuizzes.map((quiz) => {
        const scores = quiz.scores.map((s) => s.totalScore);
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
        const maxPossibleScore = quiz.questions.reduce((sum, q) => sum + q.points, 0);

        return {
            id: quiz.id,
            title: quiz.title,
            playCount: quiz._count.scores,
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
            scores: totalScores,
            pointsScored: totalPointsScored._sum.totalScore ?? 0,
        },
        topQuizzes: quizzesWithStats,
        recentActivity,
    });
}
