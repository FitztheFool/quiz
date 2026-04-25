import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/mail';
import { checkRateLimit, getIp } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
    const { allowed, retryAfter } = checkRateLimit(`forgot:${getIp(req)}`, 1, 60 * 1000);
    if (!allowed) {
        return NextResponse.json(
            { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
            { status: 429, headers: { 'Retry-After': String(retryAfter) } }
        );
    }

    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 });

    // Réponse identique que l'email existe ou non (évite l'énumération)
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, status: true } });

    if (user && user.status !== 'BANNED') {
        // Supprimer les anciens tokens pour cet email
        await prisma.verificationToken.deleteMany({ where: { identifier: email } });

        const token = randomBytes(32).toString('hex');
        await prisma.verificationToken.create({
            data: { identifier: email, token, expires: new Date(Date.now() + 60 * 60 * 1000) },
        });

        await sendPasswordResetEmail(email, token).catch(err =>
            console.error('[forgot-password] sendPasswordResetEmail error:', err)
        );
    }

    return NextResponse.json({ ok: true });
}
