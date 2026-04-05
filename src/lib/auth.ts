// src/lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import DiscordProvider from 'next-auth/providers/discord';
import GoogleProvider from "next-auth/providers/google";
import { compare } from 'bcryptjs';
import prisma from './prisma';
import { createPending, getPending, deletePending } from './oauthPendingStore';

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma as any),
    session: { strategy: 'jwt' },
    pages: { signIn: '/login', signOut: '/login', error: '/login' },
    providers: [
        DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID!,
            clientSecret: process.env.DISCORD_CLIENT_SECRET!,
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        // Finalise la connexion OAuth après sélection du pseudo
        CredentialsProvider({
            id: 'oauth-completion',
            name: 'oauth-completion',
            credentials: { token: { type: 'text' } },
            async authorize(credentials) {
                if (!credentials?.token) return null;
                const entry = await getPending(credentials.token);
                if (!entry) return null;
                await deletePending(credentials.token);
                const user = await prisma.user.findUnique({
                    where: { id: entry.userId },
                    select: { id: true, email: true, username: true, role: true, image: true },
                });
                if (!user) return null;
                return {
                    id: user.id,
                    email: user.email ?? '',
                    username: user.username ?? '',
                    role: user.role,
                    image: user.image ?? null,
                };
            },
        }),
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                identifier: { label: 'Email ou pseudo', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.identifier || !credentials?.password) {
                    throw new Error('Email/pseudo et mot de passe requis');
                }
                const user = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { email: credentials.identifier },
                            { username: credentials.identifier },
                        ],
                    },
                });
                if (!user || !user.passwordHash) throw new Error('Aucun utilisateur trouvé');
                if (user.bannedAt) throw new Error('deactivated');
                const isPasswordValid = await compare(credentials.password, user.passwordHash);
                if (!isPasswordValid) throw new Error('Mot de passe incorrect');
                if (user.deactivatedAt) {
                    await prisma.user.update({ where: { id: user.id }, data: { deactivatedAt: null } });
                }
                return { id: user.id, email: user.email ?? '', username: user.username ?? '', role: user.role, image: user.image ?? null };
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === 'oauth-completion') return true;
            if (account?.provider !== 'credentials') {
                const dbUser = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { id: user.id },
                            ...(user.email ? [{ email: user.email }] : []),
                        ],
                    },
                    select: { id: true, deactivatedAt: true, passwordHash: true, bannedAt: true },
                });
                if (dbUser?.bannedAt) return '/login?error=AccountBanned';
                if (dbUser?.passwordHash) return '/login?error=OAuthAccountConflict';

                // Conflit pseudo : nouvel utilisateur Discord dont le pseudo est déjà pris
                if (!dbUser && user.name) {
                    const conflict = await prisma.user.findFirst({
                        where: { username: user.name, passwordHash: { not: null } },
                        select: { id: true },
                    });
                    if (conflict) {
                        const stem = user.name.replace(/[_]+$/, '');
                        const suggestions: string[] = [];
                        for (const c of [
                            `${stem}_${Math.floor(Math.random() * 900 + 100)}`,
                            `${stem}${Math.floor(Math.random() * 900 + 100)}`,
                            `${stem}_${Math.floor(Math.random() * 900 + 100)}`,
                        ]) {
                            const taken = await prisma.user.findFirst({ where: { username: c }, select: { id: true } });
                            if (!taken) suggestions.push(c);
                        }
                        if (suggestions.length < 3) suggestions.push(`user_${user.id.slice(-8)}`);
                        const token = await createPending(user.id, user.name, suggestions.slice(0, 3), {
                            email: user.email ?? null,
                            name: user.name ?? null,
                            image: user.image ?? null,
                            provider: account!.provider,
                            providerAccountId: account!.providerAccountId,
                            type: account!.type,
                            access_token: account!.access_token ?? null,
                            token_type: account!.token_type ?? null,
                            scope: account!.scope ?? null,
                        });
                        return `/auth/choose-username?token=${token}`;
                    }
                }

                if (dbUser?.deactivatedAt) {
                    await prisma.user.update({ where: { id: dbUser.id }, data: { deactivatedAt: null } });
                }
            }
            return true;
        },
        async jwt({ token, user, trigger }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.username = (user as any).username || user.name || '';
                token.image = user.image ?? null;
                token.email = user.email ?? null;
            }
            if (trigger === 'update') token.needsUsernameToken = undefined;
            if (token.id) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.id as string },
                    select: { role: true, username: true, image: true, email: true, isAnonymous: true },
                });
                if (dbUser) {
                    token.role = dbUser.role;
                    if (dbUser.username) token.username = dbUser.username;
                    if (dbUser.image) token.image = dbUser.image;
                    if (dbUser.email) token.email = dbUser.email;
                    token.isAnonymous = dbUser.isAnonymous;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.username = token.username as string;
                session.user.image = (token.image as string) ?? null;
                session.user.email = (token.email as string) ?? null;
                session.user.isAnonymous = (token.isAnonymous as boolean) ?? false;
            }
            return session;
        },
    },
    events: {
        createUser: async ({ user }) => {
            // Nouvel utilisateur OAuth sans conflit : assigne le pseudo Discord
            const base = user.name || `user_${user.id.slice(-8)}`;
            let username = base;
            const taken = await prisma.user.findFirst({ where: { username: base, NOT: { id: user.id } } });
            if (taken) username = `user_${user.id.slice(-8)}`;
            await prisma.user.update({ where: { id: user.id }, data: { username } });
        },
        signIn: async ({ user, account }) => {
            if (account?.provider === 'oauth-completion') return;
            await prisma.user.updateMany({
                where: { id: user.id },
                data: {
                    lastSeen: new Date(),
                    ...(account?.provider !== 'credentials' && user.image ? { image: user.image } : {}),
                },
            });
        },
    },
    logger: {
        error(code, metadata) { console.error('NEXTAUTH ERROR', code, metadata); },
    },
    secret: process.env.NEXTAUTH_SECRET,
};
