import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizeWord, isSutomWord } from '@/lib/sutom/words';

// Returns a random guessable word + (when available) the theme of its word
// group, used as an opt-in hint in the Sutom game.
export async function GET() {
    const words = await prisma.word.findMany({
        select: { word: true, wordGroup: { select: { theme: true } } },
    });
    const seen = new Map<string, string>();
    for (const w of words) {
        if (!isSutomWord(w.word)) continue;
        const key = normalizeWord(w.word);
        if (!seen.has(key)) seen.set(key, w.wordGroup.theme);
    }
    const pool = [...seen.entries()];

    if (pool.length === 0) {
        return NextResponse.json({ error: 'Aucun mot disponible' }, { status: 503 });
    }
    const [word, category] = pool[Math.floor(Math.random() * pool.length)];
    return NextResponse.json({ word, category });
}
