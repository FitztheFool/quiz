import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get('pageSize') ?? String(PAGE_SIZE), 10) || PAGE_SIZE));
    const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
    const where = q ? { theme: { contains: q, mode: 'insensitive' as const } } : {};
    const skip = (page - 1) * pageSize;

    const [groups, total] = await Promise.all([
        prisma.wordGroup.findMany({
            where,
            orderBy: { theme: 'asc' },
            select: { id: true, theme: true, _count: { select: { words: true } } },
            skip,
            take: pageSize,
        }),
        prisma.wordGroup.count({ where }),
    ]);

    return NextResponse.json({ groups, page, totalPages: Math.max(1, Math.ceil(total / pageSize)), total });
}

export async function POST(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { theme } = await req.json();
    if (!theme?.trim()) return NextResponse.json({ error: 'Thème manquant' }, { status: 400 });

    try {
        const created = await prisma.wordGroup.create({
            data: { theme: theme.trim() },
            select: { id: true, theme: true, _count: { select: { words: true } } },
        });
        return NextResponse.json(created, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Ce thème existe déjà' }, { status: 409 });
    }
}

export async function PATCH(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { groupId, theme } = await req.json();
    if (!groupId || !theme?.trim()) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });

    try {
        const updated = await prisma.wordGroup.update({
            where: { id: groupId },
            data: { theme: theme.trim() },
            select: { id: true, theme: true, _count: { select: { words: true } } },
        });
        return NextResponse.json(updated);
    } catch {
        return NextResponse.json({ error: 'Groupe introuvable ou thème déjà existant' }, { status: 404 });
    }
}

export async function DELETE(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { groupId } = await req.json();
    if (!groupId) return NextResponse.json({ error: 'groupId manquant' }, { status: 400 });

    await prisma.$transaction([
        prisma.word.deleteMany({ where: { wordGroupId: groupId } }),
        prisma.wordGroup.delete({ where: { id: groupId } }),
    ]);
    return NextResponse.json({ success: true });
}

