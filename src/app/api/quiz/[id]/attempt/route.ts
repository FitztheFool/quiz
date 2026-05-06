import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id: quizId } = await params;
    const { score, correctAnswers, totalAnswers, isOwnQuiz } = await req.json();

    if (isOwnQuiz) {
        return NextResponse.json({ ok: true, skipped: true });
    }

    const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        select: { isPublic: true, creatorId: true },
    });

    if (!quiz) {
        return NextResponse.json({ error: 'Quiz introuvable' }, { status: 404 });
    }

    if (!quiz.isPublic && quiz.creatorId !== session.user.id) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    await prisma.attempt.create({
        data: {
            userId: session.user.id,
            gameType: 'QUIZ',
            gameId: randomUUID(),
            quizId,
            score: score ?? 0,
            correctAnswers: correctAnswers ?? 0,
            totalAnswers: totalAnswers ?? 0,
        },
    });

    return NextResponse.json({ ok: true });
}
