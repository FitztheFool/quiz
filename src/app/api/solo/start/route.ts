import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSoloToken } from '@/lib/soloToken';

const VALID_GAMES = new Set(['PACMAN', 'BREAKOUT', 'SNAKE', 'TETRIS', 'SUTOM', 'SPACE_INVADERS', 'GAME_2048', 'FLAPPY_BIRD', 'PLUMBER']);

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { gameType } = await req.json();
    if (typeof gameType !== 'string' || !VALID_GAMES.has(gameType)) {
        return NextResponse.json({ error: 'Jeu invalide' }, { status: 400 });
    }

    const token = createSoloToken(session.user.id, gameType);
    return NextResponse.json({ token });
}
