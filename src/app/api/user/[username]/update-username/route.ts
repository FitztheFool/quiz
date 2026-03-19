// src/app/api/user/[username]/update-username/route.ts
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

    const { username: newUsername } = await req.json();

    if (!newUsername || typeof newUsername !== 'string')
        return NextResponse.json({ error: 'Username invalide.' }, { status: 400 });

    const trimmed = newUsername.trim();

    if (trimmed.length < 3 || trimmed.length > 20)
        return NextResponse.json({ error: 'Le username doit faire entre 3 et 20 caractères.' }, { status: 400 });

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed))
        return NextResponse.json({ error: 'Caractères autorisés : lettres, chiffres, _ et -' }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { username: trimmed } });
    if (existing && existing.id !== session.user.id)
        return NextResponse.json({ error: 'Cet username est déjà pris.' }, { status: 409 });

    const updated = await prisma.user.update({
        where: { id: session.user.id },
        data: { username: trimmed },
    });

    return NextResponse.json({ username: updated.username });
}
