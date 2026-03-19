// src/app/api/user/[username]/update-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ username: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });

    const { username } = await params;
    if (session.user.username !== username)
        return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 });

    const { email } = await req.json();

    if (!email || typeof email !== 'string')
        return NextResponse.json({ error: 'Email invalide.' }, { status: 400 });

    const trimmed = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed))
        return NextResponse.json({ error: "Format d'email invalide." }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email: trimmed } });
    if (existing && existing.id !== session.user.id)
        return NextResponse.json({ error: 'Cet email est déjà utilisé.' }, { status: 409 });

    const updated = await prisma.user.update({
        where: { id: session.user.id },
        data: { email: trimmed },
    });

    return NextResponse.json({ email: updated.email });
}
