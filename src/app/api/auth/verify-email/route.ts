import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkRateLimit, getIp } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
    const { allowed, retryAfter } = checkRateLimit(`verify-email:${getIp(req)}`, 20, 15 * 60 * 1000);
    if (!allowed) {
        return NextResponse.json(
            { error: 'Trop de tentatives. Réessayez plus tard.' },
            { status: 429, headers: { 'Retry-After': String(retryAfter) } },
        );
    }

    const { token } = await req.json();
    if (!token || typeof token !== 'string') return NextResponse.json({ error: 'Token manquant.' }, { status: 400 });

    const record = await prisma.verificationToken.findUnique({ where: { token } });
    if (!record || record.expires < new Date()) {
        if (record) await prisma.verificationToken.delete({ where: { token } });
        return NextResponse.json({ error: 'Lien invalide ou expiré.' }, { status: 400 });
    }

    await Promise.all([
        prisma.user.updateMany({
            where: { email: record.identifier, status: 'PENDING' },
            data: { status: 'ACTIVE', isAnonymous: false, emailVerified: new Date() },
        }),
        prisma.verificationToken.delete({ where: { token } }),
    ]);

    return NextResponse.json({ ok: true });
}
