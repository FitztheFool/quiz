// src/app/api/quiz/[id]/check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

import { normalizeAnswer as normalize } from '@/lib/utils';

interface CheckBody {
    questionId: string;
    answerId?: string;
    answerIds?: string[];
    freeText?: string;
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: quizId } = await params;
        const body: CheckBody = await request.json();
        const { questionId, answerId, answerIds, freeText } = body;

        if (!questionId) {
            return NextResponse.json({ error: 'questionId requis' }, { status: 400 });
        }

        const session = await getServerSession(authOptions);

        // Vérifier que le quiz existe et est accessible
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            select: { isPublic: true, creatorId: true },
        });

        if (!quiz) {
            return NextResponse.json({ error: 'Quiz non trouvé' }, { status: 404 });
        }

        if (!quiz.isPublic && quiz.creatorId !== session?.user?.id) {
            return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
        }

        // Récupérer la question avec ses réponses correctes
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

        let isCorrect = false;
        let earnedPoints = 0;
        let correctAnswerText = '';

        if (question.type === 'TRUE_FALSE') {
            const selected = question.answers.find(a => a.id === answerId);
            const correct = question.answers.find(a => a.isCorrect);
            correctAnswerText = correct?.content ?? '';
            isCorrect = selected?.isCorrect === true;
            earnedPoints = isCorrect ? question.points : 0;

        } else if (question.type === 'MCQ') {
            const correctIds = question.answers.filter(a => a.isCorrect).map(a => a.id);
            correctAnswerText = question.answers.filter(a => a.isCorrect).map(a => a.content).join(', ');
            const selected = answerIds ?? [];
            isCorrect = selected.length === correctIds.length && selected.every(id => correctIds.includes(id));
            earnedPoints = isCorrect ? question.points : 0;

        } else if (question.type === 'TEXT') {
            const correct = question.answers.find(a => a.isCorrect) ?? question.answers[0];
            correctAnswerText = correct?.content ?? '';
            const userText = normalize(freeText ?? '');
            isCorrect = userText.length > 0 && userText === normalize(correctAnswerText);
            earnedPoints = isCorrect ? question.points : 0;

        } else if (question.type === 'MULTI_TEXT') {
            const correctTexts = question.answers.filter(a => a.isCorrect).map(a => a.content);
            correctAnswerText = correctTexts.join(', ');
            const userTexts = (freeText ?? '').split('||').map(t => normalize(t));
            const correctTextsLower = correctTexts.map(t => normalize(t));
            const strictOrder = (question as any).strictOrder ?? false;

            let correctCount = 0;
            if (strictOrder) {
                correctCount = userTexts.filter((t, i) => t === correctTextsLower[i]).length;
            } else {
                correctCount = userTexts.filter(t => correctTextsLower.includes(t)).length;
            }

            const pointsPerAnswer = correctTextsLower.length > 0 ? question.points / correctTextsLower.length : 0;
            earnedPoints = Math.round(correctCount * pointsPerAnswer);
            isCorrect = correctCount === correctTextsLower.length;
        } else if (question.type === 'MCQ_UNIQUE') {
            const correct = question.answers.find(a => a.isCorrect);
            const selected = question.answers.find(a => a.id === answerId);

            correctAnswerText = correct?.content ?? '';
            isCorrect = selected?.isCorrect === true;
            earnedPoints = isCorrect ? question.points : 0;
        }

        return NextResponse.json({ isCorrect, earnedPoints, correctAnswerText });
    } catch (error) {
        console.error('Erreur check réponse:', error);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
