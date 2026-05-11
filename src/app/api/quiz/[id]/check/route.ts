// src/app/api/quiz/[id]/check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { checkRateLimit, getIp } from '@/lib/rateLimit';
import { gradeQuestion, correctAnswerText, type GradeAnswer } from '@/lib/quizGrade';

interface CheckBody extends GradeAnswer { }

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const { id: quizId } = await params;
        const ip = getIp(request);
        const rl = checkRateLimit(`quiz-check:${session.user.id}:${ip}:${quizId}`, 120, 60_000);
        if (!rl.allowed) {
            return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 });
        }

        const body: CheckBody = await request.json();
        const { questionId } = body;
        if (!questionId) {
            return NextResponse.json({ error: 'questionId requis' }, { status: 400 });
        }

        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            select: { isPublic: true, creatorId: true },
        });

        if (!quiz) {
            return NextResponse.json({ error: 'Quiz non trouvé' }, { status: 404 });
        }

        if (!quiz.isPublic && quiz.creatorId !== session.user.id) {
            return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
        }

        const question = await prisma.question.findFirst({
            where: { id: questionId, quizId },
            include: {
                answers: {
                    select: { id: true, content: true, isCorrect: true },
                },
            },
        });

        if (!question) {
            return NextResponse.json({ error: 'Question non trouvée' }, { status: 404 });
        }

        const normalizedQuestion = { ...question, strictOrder: (question as any).strictOrder ?? false };
        const { isCorrect, earnedPoints } = gradeQuestion(normalizedQuestion, body);

        return NextResponse.json({
            isCorrect,
            earnedPoints,
            correctAnswerText: correctAnswerText(normalizedQuestion),
        });
    } catch (error) {
        console.error('Erreur check réponse:', error);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
