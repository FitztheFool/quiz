import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    const { token, password } = await req.json();

    if (!token || !password) {
        return NextResponse.json({ error: 'Token et mot de passe requis' }, { status: 400 });
    }
    if (password.length < 6) {
        return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 6 caractères' }, { status: 400 });
    }

    const record = await prisma.verificationToken.findUnique({ where: { token } });
    if (!record || record.expires < new Date()) {
        if (record) await prisma.verificationToken.delete({ where: { token } });
        return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 400 });
    }

    const passwordHash = await hash(password, 10);

    await Promise.all([
        prisma.user.updateMany({
            where: { email: record.identifier },
            data: { passwordHash, status: 'ACTIVE' },
        }),
        prisma.verificationToken.delete({ where: { token } }),
    ]);

    return NextResponse.json({ ok: true });
}
