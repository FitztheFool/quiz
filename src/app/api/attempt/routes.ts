// app/api/attempts/route.ts
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { userId, gameType, gameId, score, placement, quizId } = body;

    if (!userId || !gameType || !gameId || score === undefined) {
        return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    const attempt = await prisma.attempt.create({
        data: { userId, gameType, gameId, score, placement: placement ?? null, quizId: quizId ?? null },
    });

    return NextResponse.json(attempt);
}
