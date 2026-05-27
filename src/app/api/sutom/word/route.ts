import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizeWord, isSutomWord } from '@/lib/sutom/words';

// Returns a random guessable word drawn from the seeded word groups.
export async function GET() {
    const words = await prisma.word.findMany({ select: { word: true } });
    const pool = [...new Set(
        words.map(w => w.word).filter(isSutomWord).map(normalizeWord)
    )];

    if (pool.length === 0) {
        return NextResponse.json({ error: 'Aucun mot disponible' }, { status: 503 });
    }
    const word = pool[Math.floor(Math.random() * pool.length)];
    return NextResponse.json({ word });
}
