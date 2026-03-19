// src/app/api/admin/quiz/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    const [quizzes, total] = await Promise.all([
        prisma.quiz.findMany({
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
        prisma.quiz.count(),
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
