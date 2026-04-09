// PATCH /api/auth/guest/claim
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hash } from 'bcryptjs';

export async function PATCH(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    if (session.user.role !== 'GUEST') {
        return NextResponse.json({ error: 'Compte déjà finalisé' }, { status: 400 });
    }

    const { email, password, username } = await req.json();

    if (!email || !password) {
        return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }
    if (password.length < 6) {
        return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 6 caractères' }, { status: 400 });
    }

    // Vérifier conflits
    const conflict = await prisma.user.findFirst({
        where: {
            AND: [
                { NOT: { id: session.user.id } },
                {
                    OR: [
                        { email },
                        ...(username ? [{ username }] : []),
                    ],
                },
            ],
        },
    });

    if (conflict) {
        if (conflict.email === email) {
            return NextResponse.json({ error: 'Cet email est déjà utilisé.' }, { status: 400 });
        }
        return NextResponse.json({ error: "Ce nom d'utilisateur est déjà pris." }, { status: 400 });
    }

    const passwordHash = await hash(password, 10);

    await prisma.user.update({
        where: { id: session.user.id },
        data: {
            email,
            passwordHash,
            isAnonymous: false,
            role: 'USER',
            ...(username ? { username } : {}),
        },
    });

    return NextResponse.json({ ok: true });
}
