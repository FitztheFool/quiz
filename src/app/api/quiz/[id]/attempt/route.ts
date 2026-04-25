import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id: quizId } = await params;
    const { score, correctAnswers, totalAnswers, isOwnQuiz } = await req.json();

    if (isOwnQuiz) {
        return NextResponse.json({ ok: true, skipped: true });
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
