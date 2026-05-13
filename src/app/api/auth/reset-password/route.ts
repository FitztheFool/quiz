import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import prisma from '@/lib/prisma';
import { checkRateLimit, getIp } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
    const { allowed, retryAfter } = checkRateLimit(`reset:${getIp(req)}`, 5, 15 * 60 * 1000);
    if (!allowed) {
        return NextResponse.json(
            { error: 'Trop de tentatives. Réessayez plus tard.' },
            { status: 429, headers: { 'Retry-After': String(retryAfter) } }
        );
    }

    const { token, password } = await req.json();

    if (!token || !password) {
        return NextResponse.json({ error: 'Token et mot de passe requis' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
        return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères' }, { status: 400 });
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
