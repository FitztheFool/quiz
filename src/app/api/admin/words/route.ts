import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';

// GET /api/admin/words
//   ?letter=A   → words starting with 'A' (case-insensitive)
//   (no params)  → letter index: { letter, count }[]
export async function GET(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const letter = req.nextUrl.searchParams.get('letter')?.toUpperCase();

    if (letter) {
        const words = await prisma.word.findMany({
            where: { word: { startsWith: letter, mode: 'insensitive' } },
            orderBy: { word: 'asc' },
            select: { id: true, word: true, description: true },
        });
        return NextResponse.json({ letter, words });
    }

    // Index: count per first letter
    const all = await prisma.word.findMany({ select: { word: true } });
    const counts: Record<string, number> = {};
    for (const { word } of all) {
        const l = word[0]?.toUpperCase() ?? '#';
        counts[l] = (counts[l] ?? 0) + 1;
    }
    const index = Object.entries(counts)
        .map(([letter, count]) => ({ letter, count }))
        .sort((a, b) => a.letter.localeCompare(b.letter));

    return NextResponse.json({ total: all.length, index });
}

// POST /api/admin/words  { word, description? }
export async function POST(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { word, description } = await req.json();
    if (!word?.trim()) return NextResponse.json({ error: 'Mot manquant' }, { status: 400 });

    try {
        const created = await prisma.word.create({
            data: { word: word.trim(), description: description?.trim() || null },
            select: { id: true, word: true, description: true },
        });
        return NextResponse.json(created, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Ce mot existe déjà' }, { status: 409 });
    }
}

// PATCH /api/admin/words  { wordId, word?, description? }
export async function PATCH(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { wordId, word, description } = await req.json();
    if (!wordId) return NextResponse.json({ error: 'wordId manquant' }, { status: 400 });

    const data: { word?: string; description?: string | null } = {};
    if (word?.trim()) data.word = word.trim();
    if (description !== undefined) data.description = description?.trim() || null;

    try {
        const updated = await prisma.word.update({
            where: { id: wordId },
            data,
            select: { id: true, word: true, description: true },
        });
        return NextResponse.json(updated);
    } catch {
        return NextResponse.json({ error: 'Mot introuvable ou déjà existant' }, { status: 404 });
    }
}

// DELETE /api/admin/words  { wordId }
export async function DELETE(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { wordId } = await req.json();
    if (!wordId) return NextResponse.json({ error: 'wordId manquant' }, { status: 400 });

    await prisma.word.delete({ where: { id: wordId } });
    return NextResponse.json({ success: true });
}
