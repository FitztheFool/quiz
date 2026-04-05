// src/app/api/quiz/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireRegistered } from '@/lib/authGuard';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const creatorId = searchParams.get('creatorId') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '6');

    const where = {
      AND: [
        search ? { title: { contains: search, mode: 'insensitive' as const } } : {},
        categoryId ? { categoryId } : {},
        creatorId
          ? { creatorId }
          : {
            OR: [
              { isPublic: true },
              { creatorId: session?.user?.id ?? '' },
            ],
          },
      ],
    };

    const [quizzes, total] = await Promise.all([
      prisma.quiz.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          isPublic: true,
          creatorId: true,
          creator: { select: { id: true, username: true } },
          category: { select: { name: true } },
          _count: { select: { questions: true } },
          createdAt: true,
          questions: { select: { points: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.quiz.count({ where }),
    ]);

    return NextResponse.json({
      quizzes,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des quiz:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireRegistered();
    if (error) return error;


    const body = await request.json();
    if (!Array.isArray(body.questions) || body.questions.length > 15) {
      return NextResponse.json(
        { error: 'Un quiz ne peut pas dépasser 15 questions.' },
        { status: 400 }
      );
    }
    const { title, description, isPublic, randomizeQuestions, categoryId, questions, creatorRole } = body;

    if (!categoryId) {
      return NextResponse.json({ error: 'La catégorie est obligatoire.' }, { status: 400 });
    }

    // Vérifier que l'utilisateur existe en base
    const userExists = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
    if (!userExists) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 401 });
    }

    // Si creatorRole === 'RANDOM', on utilise l'utilisateur système RANDOM
    let creatorId = session.user.id;
    if (creatorRole === 'RANDOM') {
      const randomUser = await prisma.user.findFirst({ where: { role: 'RANDOM' } });
      if (randomUser) creatorId = randomUser.id;
    }

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description: description || '',
        isPublic: isPublic ?? true,
        randomizeQuestions: randomizeQuestions ?? false,
        categoryId,
        creatorId,
        questions: {
          create: questions.map((q: any) => ({
            content: q.text,
            type: q.type,
            points: q.points,
            strictOrder: q.strictOrder ?? false,
            answers: {
              create: q.answers.map((a: any) => ({
                content: a.content,
                isCorrect: a.isCorrect,
              })),
            },
          })),
        },
      },
      include: {
        questions: { include: { answers: true } },
      },
    });

    return NextResponse.json(quiz, { status: 201 });
  } catch (error) {
    console.error('Erreur POST quiz:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
