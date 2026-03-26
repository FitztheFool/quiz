// src/lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import DiscordProvider from 'next-auth/providers/discord';
import { compare } from 'bcryptjs';
import prisma from './prisma';
import { createPending } from './oauthPendingStore';

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: 'jwt',
    },
    pages: {
        signIn: '/login',
        signOut: '/login',
        error: '/login',
    },
    providers: [
        DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID!,
            clientSecret: process.env.DISCORD_CLIENT_SECRET!,
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

                if (!user || !user.passwordHash) {
                    throw new Error('Aucun utilisateur trouvé');
                }

                if (user.bannedAt) {
                    throw new Error('deactivated');
                }

                const isPasswordValid = await compare(credentials.password, user.passwordHash);
                if (!isPasswordValid) {
                    throw new Error('Mot de passe incorrect');
                }

                if (user.deactivatedAt) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { deactivatedAt: null },
                    });
                }

                return {
                    id: user.id,
                    email: user.email ?? '',
                    username: user.username ?? '',
                    role: user.role,
                    image: user.image ?? null,
                };
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider !== 'credentials') {
                const dbUser = await prisma.user.findUnique({
                    where: { id: user.id },
                    select: { deactivatedAt: true, passwordHash: true, bannedAt: true },
                });
                if (dbUser?.bannedAt) return '/login?error=AccountBanned';
                if (dbUser?.passwordHash) return '/login?error=OAuthAccountConflict';
                if (dbUser?.deactivatedAt) {
                    await prisma.user.update({ where: { id: user.id }, data: { deactivatedAt: null } });
                }
            }
            return true;
        },
        async jwt({ token, user, trigger }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.username = user.username || user.name || '';
                token.image = user.image ?? null;
                token.email = user.email ?? null;
            }
            // On first sign-in, check if username selection is pending
            if (trigger === 'signIn' && token.id) {
                const pending = await prisma.oauthPending.findFirst({
                    where: { userId: token.id as string, expiresAt: { gt: new Date() } },
                    select: { token: true },
                });
                if (pending) token.needsUsernameToken = pending.token;
            }
            // Clear needsUsernameToken when session is explicitly updated
            if (trigger === 'update') {
                token.needsUsernameToken = undefined;
            }
            // Always refresh from DB so changes take effect without re-login
            if (token.id) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.id as string },
                    select: { role: true, username: true, image: true, email: true },
                });
                if (dbUser) {
                    token.role = dbUser.role;
                    if (dbUser.username) token.username = dbUser.username;
                    if (dbUser.image) token.image = dbUser.image;
                    if (dbUser.email) token.email = dbUser.email;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.username = token.username as string;
                session.user.image = token.image as string ?? null;
                session.user.email = token.email as string ?? null;
                if (token.needsUsernameToken) {
                    (session as any).needsUsernameToken = token.needsUsernameToken as string;
                }
            }
            return session;
        },
    },
    events: {
        createUser: async ({ user }) => {
            const base = user.name || `user_${user.id.slice(-8)}`;
            let username = base;
            const taken = await prisma.user.findFirst({ where: { username: base, NOT: { id: user.id } } });
            if (taken) {
                username = `user_${user.id.slice(-8)}`;
                // Username conflict with a credentials account — create pending selection
                const stem = base.replace(/[_]+$/, '');
                const suggestions: string[] = [];
                const candidates = [
                    `${stem}_${Math.floor(Math.random() * 900 + 100)}`,
                    `${stem}${Math.floor(Math.random() * 900 + 100)}`,
                    `${stem}_${Math.floor(Math.random() * 900 + 100)}`,
                ];
                for (const c of candidates) {
                    const conflict = await prisma.user.findFirst({ where: { username: c }, select: { id: true } });
                    if (!conflict) suggestions.push(c);
                }
                if (suggestions.length < 3) suggestions.push(`user_${user.id.slice(-8)}`);
                await createPending(user.id, base, suggestions.slice(0, 3));
            }
            await prisma.user.update({ where: { id: user.id }, data: { username } });
        },
        signIn: async ({ user, account }) => {
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
