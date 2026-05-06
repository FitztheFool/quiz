import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: 'Token manquant.' }, { status: 400 });

    const record = await prisma.verificationToken.findUnique({ where: { token } });
    if (!record || record.expires < new Date()) {
        if (record) await prisma.verificationToken.delete({ where: { token } });
        return NextResponse.json({ error: 'Lien invalide ou expiré.' }, { status: 400 });
    }

    await Promise.all([
        prisma.user.updateMany({
            where: { email: record.identifier, status: 'PENDING' },
            data: { status: 'ACTIVE', isAnonymous: false, emailVerifiedAt: new Date() },
        }),
        prisma.verificationToken.delete({ where: { token } }),
    ]);

    return NextResponse.json({ ok: true });
}
