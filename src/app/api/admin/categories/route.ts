// src/app/api/admin/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';

export async function GET() {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const categories = await prisma.category.findMany({
        include: { _count: { select: { quizzes: true } } },
        orderBy: { name: 'asc' },
    });

    return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });

    const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const category = await prisma.category.create({
        data: { name: name.trim(), slug },
    });

    return NextResponse.json(category, { status: 201 });
}

export async function PATCH(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { categoryId, name } = await req.json();
    if (!categoryId || !name?.trim()) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });

    const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const category = await prisma.category.update({
        where: { id: categoryId },
        data: { name: name.trim(), slug },
    });

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
