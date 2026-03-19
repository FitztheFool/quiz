// src/app/api/taboo/[word]/route.ts
// src/app/api/taboo/word/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/taboo/word?count=2&exclude=WORD1,WORD2
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const count = Math.min(Number(searchParams.get('count') ?? 1), 10);
    const exclude = searchParams.get('exclude')?.split(',').filter(Boolean) ?? [];

    const total = await prisma.word.count({
        where: { word: { notIn: exclude } },
    });

    if (total === 0) {
        return NextResponse.json({ error: 'No words available' }, { status: 404 });
    }

    // Tirer `count` mots distincts aléatoirement
    const words: { word: string; id: string }[] = [];
    const usedIds = new Set<string>();

    for (let i = 0; i < count; i++) {
        const remaining = total - usedIds.size;
        if (remaining <= 0) break;
        const skip = Math.floor(Math.random() * remaining);
        const result = await prisma.word.findFirst({
            where: {
                word: { notIn: exclude },
                id: { notIn: Array.from(usedIds) },
            },
            skip,
            select: { id: true, word: true },
        });
        if (result) {
            words.push(result);
            usedIds.add(result.id);
        }
    }

    return NextResponse.json(words.map(w => w.word));
}
