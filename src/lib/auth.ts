// src/lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import DiscordProvider from 'next-auth/providers/discord';
import { compare } from 'bcryptjs';
import prisma from './prisma';
import { createPending, getPending, deletePending } from './oauthPendingStore';

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
            id: 'oauth-completion',
            name: 'oauth-completion',
            credentials: { token: { type: 'text' } },
            async authorize(credentials) {
                if (!credentials?.token) return null;
                const entry = getPending(credentials.token);
                if (!entry) return null;
                deletePending(credentials.token);
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

                if (!user || !user.passwordHash) {
                    throw new Error('Aucun utilisateur trouvé');
                }

                const isPasswordValid = await compare(credentials.password, user.passwordHash);
                if (!isPasswordValid) {
                    throw new Error('Mot de passe incorrect');
                }

                // Réactivation automatique si compte désactivé
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
                    select: { deactivatedAt: true, passwordHash: true },
                });
                // Bloquer si le compte résolu (via email) est un compte credentials
                if (dbUser?.passwordHash) {
                    return '/login?error=OAuthAccountConflict';
                }
                // Bloquer si le pseudo Discord correspond à un username credentials existant
                if (user.name) {
                    const usernameConflict = await prisma.user.findFirst({
                        where: { username: user.name, passwordHash: { not: null }, NOT: { id: user.id } },
                        select: { id: true },
                    });
                    if (usernameConflict) {
                        const base = user.name;
                        const suggestions: string[] = [];
                        const candidates = [
                            `${base}_${Math.floor(Math.random() * 900 + 100)}`,
                            `${base}${Math.floor(Math.random() * 900 + 100)}`,
                            `${base}_${Math.floor(Math.random() * 900 + 100)}`,
                        ];
                        for (const c of candidates) {
                            const taken = await prisma.user.findFirst({ where: { username: c }, select: { id: true } });
                            if (!taken) suggestions.push(c);
                        }
                        if (suggestions.length < 3) {
                            suggestions.push(`user_${user.id.slice(-8)}`);
                        }
                        const token = createPending(user.id, base, suggestions.slice(0, 3));
                        return `/auth/choose-username?token=${token}`;
                    }
                }
                if (dbUser?.deactivatedAt) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { deactivatedAt: null },
                    });
                }
            }
            return true;
        },
        async jwt({ token, user, trigger, session: sessionData }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.username = user.username || user.name || '';
                token.image = user.image ?? null;
                token.email = user.email ?? null;
            }
            // Always refresh role from DB so changes take effect without re-login
            if (token.id) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.id as string },
                    select: { role: true },
                });
                if (dbUser) token.role = dbUser.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.username = token.username as string;
                session.user.image = token.image as string ?? null;
                session.user.email = token.email as string ?? null;  // ← ajoute
            }
            return session;
        },
    },
    events: {
        createUser: async ({ user }) => {
            const base = user.name || `user_${user.id.slice(-8)}`;
            let username = base;
            const taken = await prisma.user.findFirst({ where: { username: base, NOT: { id: user.id } } });
            if (taken) username = `user_${user.id.slice(-8)}`;
            await prisma.user.update({ where: { id: user.id }, data: { username } });
        },
        signIn: async ({ user, account }) => {
            await prisma.user.update({
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
