// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';

type SortKey = 'createdAt_desc' | 'createdAt_asc' | 'username_asc' | 'username_desc';

function getOrderBy(sort: SortKey) {
    switch (sort) {
        case 'createdAt_asc': return { createdAt: 'asc' as const };
        case 'username_asc': return { username: 'asc' as const };
        case 'username_desc': return { username: 'desc' as const };
        case 'createdAt_desc':
        default: return { createdAt: 'desc' as const };
    }
}

export async function GET(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(50, Math.max(1, Number.parseInt(searchParams.get('pageSize') || '10', 10)));
    const q = (searchParams.get('q') || '').trim();
    const sort = (searchParams.get('sort') || 'createdAt_desc') as SortKey;
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';

    const where: any = {};

    if (q) {
        where.OR = [
            { username: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
        ];
    }

    if (role) where.role = role;
    if (status) where.status = status; // ACTIVE | BANNED | DEACTIVATED

    const [rawUsers, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                status: true,
                image: true,
                createdAt: true,
                lastSeen: true,
                bannedAt: true,
                deactivatedAt: true,
                _count: { select: { createdQuizzes: true } },
                attempts: { select: { gameType: true } },
            },
            orderBy: getOrderBy(sort),
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.user.count({ where }),
    ]);

    const users = rawUsers.map(({ attempts, ...user }) => ({
        ...user,
        quizAttempts: attempts.filter(a => a.gameType === 'QUIZ').length,
        unoAttempts: attempts.filter(a => a.gameType === 'UNO').length,
    }));

    return NextResponse.json({
        users,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        page,
        pageSize,
    });
}

export async function PATCH(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await req.json();

    if (body.action === 'toggleBan') {
        const { userId } = body;
        if (!userId) return NextResponse.json({ error: 'userId manquant' }, { status: 400 });

        const target = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, status: true },
        });
        if (!target) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
        if (target.role === 'ADMIN') return NextResponse.json({ error: 'Impossible de bannir un admin' }, { status: 403 });

        const isBanned = target.status === 'BANNED';
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                status: isBanned ? 'ACTIVE' : 'BANNED',
                bannedAt: isBanned ? null : new Date(),
            },
            select: { id: true, status: true, bannedAt: true },
        });
        return NextResponse.json(user);
    }

    const { userId, role } = body;
    if (!userId || !role) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });

    const allowedRoles = new Set(['GUEST', 'USER', 'RANDOM', 'ADMIN']);
    if (!allowedRoles.has(role)) return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 });

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!target) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    if (target.role === 'ADMIN') return NextResponse.json({ error: 'Rôle verrouillé' }, { status: 403 });

    const user = await prisma.user.update({
        where: { id: userId },
        data: { role },
        select: { id: true, username: true, role: true },
    });
    return NextResponse.json(user);
}

export async function DELETE(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId manquant' }, { status: 400 });

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (target?.role === 'ADMIN') return NextResponse.json({ error: 'Impossible de supprimer un admin' }, { status: 403 });

    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ success: true });
}
