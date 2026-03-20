// src/app/api/words/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const words = await prisma.word.findMany();

        // Mélanger
        const shuffled = words
            .map(w => w.word)
            .sort(() => Math.random() - 0.5);

        // Grouper par 5
        const cards = [];
        for (let i = 0; i + 5 <= shuffled.length; i += 5) {
            cards.push({ words: shuffled.slice(i, i + 5) });
        }

        return NextResponse.json(cards);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
