// src/app/api/words/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const groups = await prisma.wordGroup.findMany({ include: { words: true } });

        const cards = groups
            .filter(g => g.words.length > 0)
            .sort(() => Math.random() - 0.5)
            .map(g => ({
                id: g.id,
                theme: g.theme,
                words: g.words.map(w => w.word).sort(() => Math.random() - 0.5),
            }));

        return NextResponse.json(cards);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
