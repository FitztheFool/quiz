import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const size = Math.min(Math.max(parseInt(searchParams.get('size') ?? '7', 10), 3), 20);

        const words = await prisma.word.findMany({ select: { word: true } });
        const shuffled = words.map(w => w.word).sort(() => Math.random() - 0.5);

        const cards = [];
        for (let i = 0; i + size <= shuffled.length; i += size) {
            cards.push({ words: shuffled.slice(i, i + size) });
        }

        return NextResponse.json(cards);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
