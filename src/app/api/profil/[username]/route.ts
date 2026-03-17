import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ username: string }> }
) {
    const { username } = await params;

    if (!username) {
        return NextResponse.json({ error: 'Username manquant.' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);

    const user = await prisma.user.findUnique({
        where: { username },
        select: {
            id: true,
            name: true,
            username: true,
            image: true,
            deletedAt: true,
            deactivatedAt: true,
        },
    });

    if (!user || user.deletedAt || user.deactivatedAt) {
        return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
    }

    const isOwner = session?.user?.id === user.id;

    const createdQuizzes = await prisma.quiz.findMany({
        where: {
            creatorId: user.id,
            ...(isOwner ? {} : { isPublic: true }),
        },
        orderBy: { createdAt: 'desc' },
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
    });

    const attempts = await prisma.attempt.findMany({
        where: { userId: user.id },
        select: { score: true, gameType: true },
    });

    const totalScore = attempts.reduce((sum, a) => sum + a.score, 0);
    const quizzesCompleted = attempts.filter(a => a.gameType === 'QUIZ').length;

    return NextResponse.json({
        id: user.id,
        name: user.username ?? user.name,
        image: user.image,
        totalScore,
        quizzesCompleted,
        quizzesCreated: createdQuizzes.length,
        quizzes: createdQuizzes,
    });
}
