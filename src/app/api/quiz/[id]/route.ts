// src/app/api/quiz/[id]/route.ts

import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quizId } = await params;
    const session = await auth();

    const authHeader = request.headers.get('authorization') ?? '';
    const internalKey = process.env.INTERNAL_API_KEY;
    const expectedKey = `Bearer ${internalKey}`;
    const isInternalRequest = !!(
        internalKey &&
        authHeader.length === expectedKey.length &&
        timingSafeEqual(Buffer.from(authHeader), Buffer.from(expectedKey))
    );

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        category: { select: { id: true, name: true } },
        creator: { select: { id: true, username: true, email: true } },
        questions: {
          include: {
            answers: {
              select: { id: true, content: true, isCorrect: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        attempts: {
          select: { score: true },
          orderBy: { score: 'desc' },
          take: 1,
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz non trouvé' }, { status: 404 });
    }

    // Internal requests may be scoped to a lobby host: a private quiz is only
    // playable in a lobby if the host owns it (prevents IDOR via lobby:setQuiz).
    // No hostId param → unchanged full internal access (other internal callers).
    const requestedHostId = request.nextUrl.searchParams.get('hostId');
    const internalAllowed = isInternalRequest && (!requestedHostId || quiz.isPublic || quiz.creatorId === requestedHostId);

    if (!quiz.isPublic && quiz.creatorId !== session?.user?.id && !internalAllowed) {
      return NextResponse.json({ error: "Vous n'avez pas accès à ce quiz privé" }, { status: 403 });
    }

    const isOwner = session?.user?.id === quiz.creatorId;
    const isAdmin = session?.user?.role === 'ADMIN';
    const revealAnswers = isInternalRequest || isOwner || isAdmin;

    const formattedQuiz = {
      id: quiz.id,
      title: quiz.title,
      imageUrl: quiz.imageUrl ?? null,
      category: quiz.category ?? null,
      description: quiz.description || '',
      isPublic: quiz.isPublic,
      randomizeQuestions: quiz.randomizeQuestions,
      creatorId: quiz.creatorId,
      creator: {
        id: quiz.creator.id,
        username: quiz.creator.username || quiz.creator.email?.split('@')[0] || 'Utilisateur anonyme',
      },
      questions: quiz.questions.map((q) => {
        if (q.type === 'TEXT') {
          return {
            id: q.id,
            text: q.content,
            type: q.type,
            points: q.points,
            imageUrl: q.imageUrl ?? null,
            strictOrder: false,
            answers: revealAnswers
              ? [{ id: q.answers[0]?.id, text: q.answers.find(a => a.isCorrect)?.content || q.answers[0]?.content, isCorrect: true }]
              : [{ id: q.answers[0]?.id }],
          };
        }

        if (q.type === 'MULTI_TEXT') {
          const correctAnswers = q.answers.filter(a => a.isCorrect);
          return {
            id: q.id,
            text: q.content,
            type: q.type,
            points: q.points,
            imageUrl: q.imageUrl ?? null,
            strictOrder: (q as any).strictOrder ?? false,
            answers: revealAnswers
              ? correctAnswers.map((a) => ({ id: a.id, text: a.content, isCorrect: true }))
              : correctAnswers.map((a) => ({ id: a.id })),
          };
        }

        return {
          id: q.id,
          text: q.content,
          type: q.type,
          points: q.points,
          imageUrl: q.imageUrl ?? null,
          strictOrder: (q as any).strictOrder ?? false,
          answers: q.answers.map((a) => ({
            id: a.id,
            text: a.content,
            ...(revealAnswers ? { isCorrect: a.isCorrect } : {}),
          })),
        };
      }),
      bestScore: quiz.attempts[0]?.score ?? null,
    };

    return NextResponse.json(formattedQuiz, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la récupération du quiz:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    if (!Array.isArray(body.questions) || body.questions.length > 15) {
      return NextResponse.json({ error: 'Un quiz ne peut pas dépasser 15 questions.' }, { status: 400 });
    }

    const { title, description, isPublic, randomizeQuestions, questions } = body;

    const existingQuiz = await prisma.quiz.findUnique({
      where: { id },
      select: { creatorId: true },
    });

    if (!existingQuiz) {
      return NextResponse.json({ error: 'Quiz non trouvé' }, { status: 404 });
    }

    if (existingQuiz.creatorId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.quiz.update({
        where: { id },
        data: {
          title,
          description,
          isPublic,
          randomizeQuestions: randomizeQuestions ?? false,
          imageUrl: body.imageUrl || '/quiz/default-cover.svg',
        },
      });

      await tx.answer.deleteMany({
        where: { question: { quizId: id } },
      });

      await tx.question.deleteMany({
        where: { quizId: id },
      });

      for (const q of questions) {
        await tx.question.create({
          data: {
            content: q.text,
            type: q.type,
            points: q.points,
            strictOrder: q.strictOrder ?? false,
            imageUrl: q.imageUrl ?? null,
            quizId: id,
            answers: {
              create: q.answers.map((a: any) => ({
                content: a.content,
                isCorrect: a.isCorrect,
              })),
            },
          },
        });
      }
    });

    const fullQuiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, username: true } },
        questions: { include: { answers: true } },
      },
    });

    return NextResponse.json(fullQuiz);
  } catch (error) {
    console.error('Erreur PUT quiz:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;

    const existingQuiz = await prisma.quiz.findUnique({
      where: { id },
      select: { creatorId: true },
    });

    if (!existingQuiz) {
      return NextResponse.json({ error: 'Quiz non trouvé' }, { status: 404 });
    }

    if (existingQuiz.creatorId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    await prisma.quiz.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur DELETE quiz:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
