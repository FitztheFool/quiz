import { NextRequest, NextResponse } from 'next/server';
import { getPending } from '@/lib/oauthPendingStore';
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

        const meta = entry.metadata;

        // Crée l'utilisateur s'il n'existe pas encore (signIn callback a redirigé avant création)
        await prisma.user.upsert({
            where: { id: entry.userId },
            update: { username },
            create: {
                id: entry.userId,
                email: meta?.email ?? `${entry.userId}@discord.placeholder`,
                name: meta?.name ?? null,
                image: meta?.image ?? null,
                username,
            },
        });

        // Crée le compte OAuth si non existant (nécessaire pour les futures connexions Discord)
        if (meta?.provider && meta?.providerAccountId) {
            await prisma.account.upsert({
                where: {
                    provider_providerAccountId: {
                        provider: meta.provider,
                        providerAccountId: meta.providerAccountId,
                    },
                },
                update: {},
                create: {
                    userId: entry.userId,
                    type: meta.type,
                    provider: meta.provider,
                    providerAccountId: meta.providerAccountId,
                    access_token: meta.access_token ?? null,
                    token_type: meta.token_type ?? null,
                    scope: meta.scope ?? null,
                },
            });
        }

        // Le pending reste pour que oauth-completion puisse signer l'utilisateur
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('[pick-username] error:', err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
