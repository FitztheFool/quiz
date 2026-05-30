import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';

const PAGE_SIZE = 20;

const WORD_SELECT = {
    id: true, word: true, description: true,
    wordGroupId: true, wordGroup: { select: { id: true, theme: true } },
};

// GET /api/admin/words
//   ?letter=A&page=1  → mots paginés pour cette lettre
//   (no letter)       → index par lettre { letter, count }[]
export async function GET(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const letter = req.nextUrl.searchParams.get('letter')?.toUpperCase();
    const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get('pageSize') ?? String(PAGE_SIZE), 10) || PAGE_SIZE));

    const groupId = req.nextUrl.searchParams.get('groupId')?.trim() ?? '';

    if (q || groupId) {
        const where: { word?: { contains: string; mode: 'insensitive' }; wordGroupId?: string } = {};
        if (q) where.word = { contains: q, mode: 'insensitive' };
        if (groupId) where.wordGroupId = groupId;
        const [words, total] = await Promise.all([
            prisma.word.findMany({ where, orderBy: { word: 'asc' }, select: WORD_SELECT, skip: (page - 1) * pageSize, take: pageSize }),
            prisma.word.count({ where }),
        ]);
        return NextResponse.json({ words, page, totalPages: Math.max(1, Math.ceil(total / pageSize)), total });
    }

    if (letter) {
        const where = { word: { startsWith: letter, mode: 'insensitive' as const } };
        const [words, total] = await Promise.all([
            prisma.word.findMany({
                where,
                orderBy: { word: 'asc' },
                select: WORD_SELECT,
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.word.count({ where }),
        ]);
        return NextResponse.json({ letter, words, page, totalPages: Math.max(1, Math.ceil(total / pageSize)), total });
    }

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

// POST /api/admin/words  { word, description?, wordGroupId? }
export async function POST(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { word, description, wordGroupId } = await req.json();
    if (!word?.trim()) return NextResponse.json({ error: 'Mot manquant' }, { status: 400 });
    if (!wordGroupId?.trim()) return NextResponse.json({ error: 'Groupe requis' }, { status: 400 });

    try {
        const created = await prisma.word.create({
            data: { word: word.trim(), description: description?.trim() || null, wordGroupId },
            select: WORD_SELECT,
        });
        return NextResponse.json(created, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Ce mot existe déjà' }, { status: 409 });
    }
}

// PATCH /api/admin/words  { wordId, word?, description?, wordGroupId? }
export async function PATCH(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { wordId, word, description, wordGroupId } = await req.json();
    if (!wordId) return NextResponse.json({ error: 'wordId manquant' }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (word?.trim()) data.word = word.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (wordGroupId !== undefined) {
        if (!wordGroupId?.trim()) return NextResponse.json({ error: 'Groupe requis' }, { status: 400 });
        data.wordGroupId = wordGroupId;
    }

    try {
        const updated = await prisma.word.update({ where: { id: wordId }, data, select: WORD_SELECT });
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
