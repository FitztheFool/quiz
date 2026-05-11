import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { gradeQuiz, type GradeAnswer } from '@/lib/quizGrade';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id: quizId } = await params;
    const body = await req.json().catch(() => ({}));
    const { isOwnQuiz, answers } = body as { isOwnQuiz?: boolean; answers?: GradeAnswer[] };

    if (isOwnQuiz) {
        return NextResponse.json({ ok: true, skipped: true });
    }

    if (!Array.isArray(answers)) {
        return NextResponse.json({ error: 'answers requis' }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        select: {
            isPublic: true,
            creatorId: true,
            questions: {
                select: {
                    id: true,
                    type: true,
                    points: true,
                    strictOrder: true,
                    answers: { select: { id: true, content: true, isCorrect: true } },
                },
            },
        },
    });

    if (!quiz) {
        return NextResponse.json({ error: 'Quiz introuvable' }, { status: 404 });
    }

    if (!quiz.isPublic && quiz.creatorId !== session.user.id) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { score, correctAnswers, totalAnswers } = gradeQuiz(quiz.questions as any, answers);

    await prisma.attempt.create({
        data: {
            userId: session.user.id,
            gameType: 'QUIZ',
            gameId: randomUUID(),
            quizId,
            score,
            correctAnswers,
            totalAnswers,
        },
    });

    return NextResponse.json({ ok: true, score, correctAnswers, totalAnswers });
}
