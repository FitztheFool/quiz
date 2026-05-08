import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const groupId = searchParams.get('groupId');
        const exclude = searchParams.get('exclude') ?? '';

        if (!groupId) return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });

        const group = await prisma.wordGroup.findUnique({
            where: { id: groupId },
            include: { words: true },
        });

        if (!group) return NextResponse.json({ word: null });

        const candidates = group.words.filter(w => w.word !== exclude);
        if (candidates.length === 0) return NextResponse.json({ word: null });

        const picked = candidates[Math.floor(Math.random() * candidates.length)];
        return NextResponse.json({ word: picked.word });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
