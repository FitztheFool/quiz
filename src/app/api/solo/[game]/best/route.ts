import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { GameType } from '@/generated/prisma/client';

const SOLO_GAMES: Record<string, GameType> = {
    pacman:   'PACMAN',
    breakout: 'BREAKOUT',
    snake:    'SNAKE',
    tetris:   'TETRIS',
};

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ game: string }> }
) {
    const { game } = await params;
    const gameType = SOLO_GAMES[game];
    if (!gameType) return NextResponse.json({ error: 'Jeu invalide' }, { status: 400 });

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ best: 0 });

    const agg = await prisma.attempt.aggregate({
        where: { userId: session.user.id, gameType },
        _max: { score: true },
    });

    return NextResponse.json({ best: agg._max.score ?? 0 });
}
