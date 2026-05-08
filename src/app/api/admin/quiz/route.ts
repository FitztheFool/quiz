// src/app/api/admin/quiz/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10) || 20));
    const q = searchParams.get('q')?.trim() ?? '';
    const categoryId = searchParams.get('categoryId')?.trim() ?? '';
    const where: NonNullable<NonNullable<Parameters<typeof prisma.quiz.findMany>[0]>['where']> = {};
    if (q) where.title = { contains: q, mode: 'insensitive' };
    if (categoryId === 'none') (where as any).categoryId = null;
    else if (categoryId) where.categoryId = categoryId;

    const [quizzes, total] = await Promise.all([
        prisma.quiz.findMany({
            where,
            select: {
                id: true,
                title: true,
                description: true,
                isPublic: true,
                createdAt: true,
                creator: { select: { username: true } },
                category: { select: { name: true } },
                _count: { select: { questions: true, attempts: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.quiz.count({ where }),
    ]);

    return NextResponse.json({ quizzes, total, totalPages: Math.ceil(total / pageSize) });
}

export async function DELETE(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { quizId } = await req.json();
    if (!quizId) return NextResponse.json({ error: 'quizId manquant' }, { status: 400 });

    await prisma.quiz.delete({ where: { id: quizId } });
    return NextResponse.json({ success: true });
}
