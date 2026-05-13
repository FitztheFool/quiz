// PATCH /api/auth/guest/claim
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { sendVerificationEmail } from '@/lib/mail';
import { checkRateLimit, getIp } from '@/lib/rateLimit';

export async function PATCH(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    if (session.user.role !== 'GUEST') {
        return NextResponse.json({ error: 'Compte déjà finalisé' }, { status: 400 });
    }

    const { allowed, retryAfter } = checkRateLimit(`guest-claim:${session.user.id}:${getIp(req)}`, 5, 15 * 60 * 1000);
    if (!allowed) {
        return NextResponse.json(
            { error: 'Trop de tentatives. Réessayez plus tard.' },
            { status: 429, headers: { 'Retry-After': String(retryAfter) } },
        );
    }

    const { email, password, username } = await req.json();

    if (!email || !password) {
        return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
        return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères' }, { status: 400 });
    }
    if (username && !/^[a-zA-Z0-9_]{2,32}$/.test(username)) {
        return NextResponse.json({ error: 'Nom d\'utilisateur invalide (2-32 caractères, lettres/chiffres/underscore uniquement)' }, { status: 400 });
    }

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
        return NextResponse.json({ error: 'Email ou nom d\'utilisateur déjà utilisé.' }, { status: 400 });
    }

    const passwordHash = await hash(password, 10);

    // Enregistrer email + mot de passe sans promouvoir le compte — la vérification email le fera
    await prisma.user.update({
        where: { id: session.user.id },
        data: {
            email,
            passwordHash,
            status: 'PENDING',
            isAnonymous: false,
            role: 'USER',
            ...(username ? { username } : {}),
        },
    });

    // Créer le token de vérification et envoyer l'email
    const token = randomBytes(32).toString('hex');
    await prisma.verificationToken.create({
        data: {
            identifier: email,
            token,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
    });

    await sendVerificationEmail(email, token).catch(err =>
        console.error('Erreur envoi email de vérification (claim):', err)
    );

    return NextResponse.json({ ok: true, pendingVerification: true });
}
