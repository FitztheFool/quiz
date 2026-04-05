// POST /api/auth/guest — crée un compte anonyme et démarre une session NextAuth
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { encode } from 'next-auth/jwt';
import { randomUUID } from 'crypto';

const ADJECTIVES = ['Brave', 'Swift', 'Clever', 'Lucky', 'Bold', 'Calm', 'Dark', 'Fond', 'Kind', 'Wild'];
const NOUNS = ['Panda', 'Fox', 'Eagle', 'Wolf', 'Tiger', 'Bear', 'Hawk', 'Lion', 'Lynx', 'Raven'];

function randomUsername(): string {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num = Math.floor(Math.random() * 9000 + 1000);
    return `${adj}${noun}${num}`;
}

export async function POST(req: NextRequest) {
    // Déjà connecté → rien à faire
    const session = await getServerSession(authOptions);
    if (session) return NextResponse.json({ ok: true });

    const body = await req.json().catch(() => ({}));
    let username: string = (typeof body.username === 'string' && body.username.trim()) || randomUsername();
    username = username.slice(0, 30);

    // Unicité du pseudo
    const taken = await prisma.user.findFirst({ where: { username } });
    if (taken) {
        username = `${username}_${Math.floor(Math.random() * 900 + 100)}`;
    }

    // Email unique fictif (non visible, non utilisé pour se connecter)
    const email = `guest_${randomUUID()}@guest.internal`;

    const user = await prisma.user.create({
        data: { username, email, isAnonymous: true },
        select: { id: true, username: true, role: true, isAnonymous: true, email: true },
    });

    // Forger un JWT NextAuth manuellement pour créer la session côté client
    const secret = process.env.NEXTAUTH_SECRET!;
    const token = await encode({
        secret,
        token: {
            id: user.id,
            sub: user.id,
            email: user.email,
            username: user.username!,
            role: user.role,
            isAnonymous: true,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 jours
        },
        maxAge: 60 * 60 * 24 * 30,
    });

    const cookieName = process.env.NEXTAUTH_URL?.startsWith('https')
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token';

    const res = NextResponse.json({ ok: true, username: user.username });
    res.cookies.set(cookieName, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NEXTAUTH_URL?.startsWith('https') ?? false,
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
    });
    return res;
}
