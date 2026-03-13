import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ username: string }> }
) {
    const { username } = await params;

    try {
        const user = await prisma.user.findUnique({
            where: { username },
            select: {
                id: true,
                username: true,
                attempts: {
                    select: {
                        score: true,
                        createdAt: true,
                        gameType: true,
                        placement: true,
                        quiz: {
                            select: {
                                id: true,
                                title: true,
                                questions: { select: { points: true } },
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                createdQuizzes: {
                    where: { isPublic: true },
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        isPublic: true,
                        createdAt: true,
                        creatorId: true,
                        category: { select: { name: true } },
                        _count: { select: { questions: true } },
                        questions: { select: { points: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
        }

        // Scores Quiz — meilleur score par quiz
        const quizScores = Object.values(
            user.attempts
                .filter((a) => a.gameType === 'QUIZ' && a.quiz !== null)
                .reduce((acc, a) => {
                    const quizId = a.quiz!.id;
                    const maxScore = a.quiz!.questions.reduce((sum, q) => sum + q.points, 0);
                    if (!acc[quizId] || a.score > acc[quizId].totalScore) {
                        acc[quizId] = {
                            type: 'QUIZ',
                            quiz: { id: a.quiz!.id, title: a.quiz!.title },
                            totalScore: a.score,
                            completedAt: a.createdAt,
                            maxScore,
                        };
                    }
                    return acc;
                }, {} as Record<string, any>)
        );

        // Scores autres jeux (UNO, SKYJOW, TABOO, YAHTZEE)
        const gameScores = user.attempts
            .filter((a) => a.gameType !== 'QUIZ')
            .map((a) => ({
                type: a.gameType,
                totalScore: a.score,
                placement: a.placement,
                completedAt: a.createdAt,
            }));

        const allScores = [...quizScores, ...gameScores]
            .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

        const gameStats = Object.entries(
            user.attempts.reduce((acc, a) => {
                acc[a.gameType] = (acc[a.gameType] || 0) + 1;
                return acc;
            }, {} as Record<string, number>)
        ).map(([type, count]) => ({ type, count }));


        return NextResponse.json({
            id: user.id,
            name: user.username,
            totalScore: quizScores.reduce((sum: number, s: any) => sum + s.totalScore, 0),
            quizzesCompleted: quizScores.length,
            quizzesCreated: user.createdQuizzes.length,
            scores: allScores,
            gameStats,
            quizzes: user.createdQuizzes,
        });
    } catch (error) {
        console.error('Erreur profil public:', error);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
