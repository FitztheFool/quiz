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
    const where = q ? { name: { contains: q, mode: 'insensitive' as const } } : {};
    const skip = (page - 1) * pageSize;

    const [categories, total] = await Promise.all([
        prisma.category.findMany({
            where,
            include: { _count: { select: { quizzes: true } } },
            orderBy: { name: 'asc' },
            skip,
            take: pageSize,
        }),
        prisma.category.count({ where }),
    ]);

    return NextResponse.json({ categories, page, totalPages: Math.max(1, Math.ceil(total / pageSize)), total });
}

export async function POST(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });

    const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const category = await prisma.category.create({ data: { name: name.trim(), slug } });
    return NextResponse.json(category, { status: 201 });
}

export async function PATCH(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { categoryId, name } = await req.json();
    if (!categoryId || !name?.trim()) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });

    const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const category = await prisma.category.update({ where: { id: categoryId }, data: { name: name.trim(), slug } });
    return NextResponse.json(category);
}

export async function DELETE(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { categoryId } = await req.json();
    if (!categoryId) return NextResponse.json({ error: 'categoryId manquant' }, { status: 400 });

    await prisma.category.delete({ where: { id: categoryId } });
    return NextResponse.json({ success: true });
}

