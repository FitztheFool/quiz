// src/app/api/quiz/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '12', 10) || 12));
    const categoryId = searchParams.get('categoryId');
    const onlyMine = searchParams.get('onlyMine') === 'true';
    const skip = (page - 1) * pageSize;

    const creatorId = searchParams.get('creatorId');

    const isOwnProfile = creatorId && session?.user?.id === creatorId;
    const where: any = {
      ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(creatorId
        ? { creatorId, ...(isOwnProfile ? {} : { isPublic: true }) }
        : onlyMine && session?.user?.id
          ? { creatorId: session.user.id }
          : { isPublic: true }),
    };

    const [quizzes, total] = await Promise.all([
      prisma.quiz.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          creator: { select: { id: true, username: true, email: true } },
          _count: { select: { questions: true, attempts: true } },
        },
      }),
      prisma.quiz.count({ where }),
    ]);

    return NextResponse.json({
      quizzes: quizzes.map((q) => ({
        id: q.id,
        title: q.title,
        description: q.description,
        imageUrl: q.imageUrl ?? null,
        isPublic: q.isPublic,
        category: q.category ?? null,
        creator: {
          id: q.creator.id,
          username: q.creator.username || q.creator.email?.split('@')[0] || 'Anonyme',
        },
        _count: {
          questions: q._count.questions,
          attempts: q._count.attempts,
        },
        createdAt: q.createdAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Erreur GET /api/quiz:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, isPublic, randomizeQuestions, categoryId, imageUrl, questions, creatorRole } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Titre requis' }, { status: 400 });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'Au moins une question est requise' }, { status: 400 });
    }

    if (questions.length > 15) {
      return NextResponse.json({ error: 'Un quiz ne peut pas dépasser 15 questions.' }, { status: 400 });
    }

    let creatorId = session.user.id;
    if (creatorRole === 'RANDOM') {
      const randomUser = await prisma.user.findUnique({ where: { email: 'random@quiz.app' }, select: { id: true } });
      if (randomUser) creatorId = randomUser.id;
    }

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description: description ?? '',
        isPublic: isPublic ?? false,
        randomizeQuestions: randomizeQuestions ?? false,
        imageUrl: imageUrl || '/quiz/default-cover.svg',
        creatorId,
        categoryId: categoryId ?? null,
        questions: {
          create: questions.map((q: any) => ({
            content: q.text,
            type: q.type,
            points: q.points ?? 1,
            strictOrder: q.strictOrder ?? false,
            imageUrl: q.imageUrl ?? null,
            answers: {
              create: q.answers.map((a: any) => ({
                content: a.content,
                isCorrect: a.isCorrect,
              })),
            },
          })),
        },
      } as any,
      include: {
        creator: { select: { id: true, username: true } },
        questions: { include: { answers: true } },
      },
    });

    return NextResponse.json(quiz, { status: 201 });
  } catch (error) {
    console.error('Erreur POST /api/quiz:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
