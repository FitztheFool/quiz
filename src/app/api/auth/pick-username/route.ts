import { NextRequest, NextResponse } from 'next/server';
import { getPending, deletePending } from '@/lib/oauthPendingStore';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { token, username } = await req.json();
        if (!token || !username) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

        const entry = await getPending(token);
        if (!entry) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });

        if (!/^[a-zA-Z0-9_]{2,32}$/.test(username)) {
            return NextResponse.json({ error: 'Pseudo invalide (2-32 caractères, lettres/chiffres/_)' }, { status: 400 });
        }

        const taken = await prisma.user.findFirst({ where: { username, NOT: { id: entry.userId } }, select: { id: true } });
        if (taken) return NextResponse.json({ error: 'Ce pseudo est déjà pris' }, { status: 409 });

        const userExists = await prisma.user.findUnique({ where: { id: entry.userId }, select: { id: true } });
        if (!userExists) {
            await deletePending(token);
            return NextResponse.json({ error: 'session_expired' }, { status: 410 });
        }
        await prisma.user.update({ where: { id: entry.userId }, data: { username } });
        await deletePending(token);
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('[pick-username] error:', err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
