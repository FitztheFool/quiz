import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { auth } from '@/lib/auth';
import { randomUUID } from 'crypto';
import { randomUsername } from '@/lib/randomUsername';
import { checkRateLimit, getIp } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (session) return NextResponse.json({ ok: true });

        const ip = getIp(req);
        if (ip === 'unknown') {
            return NextResponse.json({ error: 'IP requise' }, { status: 400 });
        }
        const rl = checkRateLimit(`guest-create:${ip}`, 5, 60 * 60_000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: 'Trop de comptes invités créés. Réessayez plus tard.' },
                { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
            );
        }

        const body = await req.json().catch(() => ({}));
        let username: string = (typeof body.username === 'string' && body.username.trim()) || randomUsername();
        username = username.slice(0, 30);

        let userId: string;
        let finalUsername: string;

        const existing = await prisma.user.findFirst({
            where: { username },
            select: { id: true, username: true, isAnonymous: true, status: true },
        });

        if (existing?.isAnonymous) {
            if (existing.status === 'BANNED') {
                return NextResponse.json({ error: 'Votre compte a été banni.' }, { status: 403 });
            }
            userId = existing.id;
            finalUsername = existing.username!;
        } else {
            if (existing) {
                return NextResponse.json({ error: 'Pseudo déjà utilisé' }, { status: 409 });
            }
            const email = `guest_${randomUUID()}@guest.internal`;
            const user = await prisma.user.create({
                data: { username, email, isAnonymous: true, role: 'GUEST' },
                select: { id: true, username: true },
            });
            userId = user.id;
            finalUsername = user.username!;
        }

        return NextResponse.json({ ok: true, userId, username: finalUsername });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json({ error: 'Pseudo déjà utilisé' }, { status: 409 });
        }
        console.error('[POST /api/auth/guest]', error);
        return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 });
    }
}
