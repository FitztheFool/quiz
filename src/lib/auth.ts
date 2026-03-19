// src/lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import DiscordProvider from 'next-auth/providers/discord';
import { compare } from 'bcryptjs';
import prisma from './prisma';

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
            // OAuth : réactiver si compte désactivé
            if (account?.provider !== 'credentials') {
                const dbUser = await prisma.user.findUnique({
                    where: { id: user.id },
                    select: { deactivatedAt: true },
                });
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
                token.email = user.email ?? null;  // ← ajou
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
            const username = user.name || `user_${user.id.slice(-8)}`;
            await prisma.user.update({
                where: { id: user.id },
                data: { username },
            });
        },
        signIn: async ({ user, account }) => {
            if (account?.provider !== 'credentials' && user.image) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { image: user.image },
                });
            }
        },
    },
    logger: {
        error(code, metadata) { console.error('NEXTAUTH ERROR', code, metadata); },
    },
    secret: process.env.NEXTAUTH_SECRET,
};
