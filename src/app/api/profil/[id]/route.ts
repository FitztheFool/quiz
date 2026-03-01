import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        // email volontairement exclu — profil public
        scores: {
          select: {
            totalScore: true,
            completedAt: true,
            quiz: {
              select: { id: true, title: true },
            },
          },
          orderBy: { completedAt: 'desc' },
        },
        createdQuizzes: {
          where: { isPublic: true }, // on n'expose que les quiz publics
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

    const totalScore = user.scores.reduce((sum, s) => sum + s.totalScore, 0);

    return NextResponse.json({
      id: user.id,
      name: user.username,
      totalScore,
      quizzesCompleted: user.scores.length,
      quizzesCreated: user.createdQuizzes.length,
      scores: user.scores,
      quizzes: user.createdQuizzes,
    });
  } catch (error) {
    console.error('Erreur profil public:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
