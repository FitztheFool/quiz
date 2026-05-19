import NextAuth, { CredentialsSignin } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import Discord from 'next-auth/providers/discord';
import Google from 'next-auth/providers/google';
import { compare } from 'bcryptjs';
import prisma from './prisma';
import { createPending, getPending, deletePending } from './oauthPendingStore';

class InvalidCredentialsError extends CredentialsSignin { code = 'invalid_credentials'; }
class AccountBannedError extends CredentialsSignin { code = 'account_banned'; }
class AccountPendingError extends CredentialsSignin { code = 'account_pending'; }
class MissingFieldsError extends CredentialsSignin { code = 'missing_fields'; }

export const { auth, handlers, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma as any),
    session: { strategy: 'jwt' },
    pages: { signIn: '/login', signOut: '/login', error: '/login' },
    providers: [
        Discord({
            clientId: process.env.DISCORD_CLIENT_ID!,
            clientSecret: process.env.DISCORD_CLIENT_SECRET!,
        }),
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        Credentials({
            id: 'oauth-completion',
            name: 'oauth-completion',
            credentials: { token: { type: 'text' } },
            async authorize(credentials) {
                if (!credentials?.token) return null;
                const entry = await getPending(credentials.token as string);
                if (!entry) return null;
                await deletePending(credentials.token as string);
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
        Credentials({
            id: 'guest',
            name: 'guest',
            credentials: { userId: { type: 'text' } },
            async authorize(credentials) {
                if (!credentials?.userId) return null;
                const user = await prisma.user.findUnique({
                    where: { id: credentials.userId as string },
                    select: { id: true, email: true, username: true, role: true, image: true, isAnonymous: true, status: true },
                });
                if (!user) return null;
                if (user.status === 'BANNED') throw new Error('AccountBanned');
                return {
                    id: user.id,
                    email: user.email ?? '',
                    username: user.username ?? '',
                    role: user.role,
                    image: user.image ?? null,
                    isAnonymous: user.isAnonymous,
                };
            },
        }),
        Credentials({
            name: 'credentials',
            credentials: {
                identifier: { label: 'Email ou pseudo', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.identifier || !credentials?.password) {
                    throw new MissingFieldsError();
                }
                const user = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { email: credentials.identifier as string },
                            { username: credentials.identifier as string },
                        ],
                    },
                });
                if (!user || !user.passwordHash) throw new InvalidCredentialsError();
                if (user.status === 'BANNED') throw new AccountBannedError();
                const isPasswordValid = await compare(credentials.password as string, user.passwordHash);
                if (!isPasswordValid) throw new InvalidCredentialsError();
                if (user.status === 'PENDING') throw new AccountPendingError();
                if (user.status === 'DEACTIVATED') {
                    await prisma.user.update({ where: { id: user.id }, data: { status: 'ACTIVE', deactivatedAt: null } });
                }
                return { id: user.id, email: user.email ?? '', username: user.username ?? '', role: user.role, image: user.image ?? null };
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === 'oauth-completion') return true;
            if (account?.provider === 'guest') return true;
            if (account?.provider !== 'credentials') {
                const dbUser = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { id: user.id },
                            ...(user.email ? [{ email: user.email }] : []),
                        ],
                    },
                    select: { id: true, status: true, passwordHash: true, deactivatedAt: true },
                });
                if (dbUser?.status === 'BANNED') return '/login?error=AccountBanned';
                if (dbUser?.passwordHash) return '/login?error=OAuthAccountConflict';

                if (dbUser && !dbUser.passwordHash) {
                    const existingAccount = await prisma.account.findFirst({
                        where: { userId: dbUser.id },
                        select: { provider: true },
                    });
                    if (existingAccount && existingAccount.provider !== account?.provider) {
                        return `/login?error=OAuthEmailConflict&provider=${existingAccount.provider}`;
                    }
                }

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
                        if (suggestions.length < 3) suggestions.push(`user_${user.id!.slice(-8)}`);
                        const token = await createPending(user.id!, user.name, suggestions.slice(0, 3), {
                            email: user.email ?? null,
                            name: user.name ?? null,
                            image: user.image ?? null,
                            provider: account!.provider,
                            providerAccountId: account!.providerAccountId,
                            type: account!.type,
                            access_token: (account!.access_token as string) ?? null,
                            token_type: (account!.token_type as string) ?? null,
                            scope: (account!.scope as string) ?? null,
                        });
                        return `/auth/choose-username?token=${token}`;
                    }
                }

                if (dbUser?.status === 'PENDING' || dbUser?.status === 'DEACTIVATED') {
                    await prisma.user.update({ where: { id: dbUser.id }, data: { status: 'ACTIVE', deactivatedAt: null } });
                }
            }
            return true;
        },
        async jwt({ token, user, trigger, account }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
                token.username = (user as any).username || user.name || '';
                token.image = user.image ?? null;
                token.email = user.email ?? null;
            }
            if (trigger === 'update') token.needsUsernameToken = undefined;
            if (token.id) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.id as string },
                    select: { role: true, username: true, image: true, email: true, isAnonymous: true, status: true, passwordHash: true },
                });
                if (dbUser) {
                    // OAuth users (no passwordHash) stuck in PENDING — race between events.createUser
                    // and JWT generation, or pre-existing PENDING user that signIn callback missed.
                    if (dbUser.status === 'PENDING' && !dbUser.passwordHash && !dbUser.isAnonymous) {
                        await prisma.user.update({
                            where: { id: token.id as string },
                            data: { status: 'ACTIVE' },
                        });
                        dbUser.status = 'ACTIVE';
                    }
                    token.role = dbUser.role;
                    if (dbUser.username) token.username = dbUser.username;
                    if (dbUser.image) token.image = dbUser.image;
                    if (dbUser.email) token.email = dbUser.email;
                    token.isAnonymous = dbUser.isAnonymous;
                    token.status = dbUser.status;
                }
            }
            if (account?.error === 'RefreshAccessTokenError') {
                token.error = 'RefreshAccessTokenError';
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
                session.user.status = (token.status as string) ?? undefined;
            }
            if (token.error) {
                (session as any).error = token.error;
            }
            return session;
        },
    },
    events: {
        createUser: async ({ user }) => {
            const base = user.name || `user_${user.id!.slice(-8)}`;
            let username = base;
            const taken = await prisma.user.findFirst({ where: { username: base, NOT: { id: user.id! } } });
            if (taken) username = `user_${user.id!.slice(-8)}`;
            await prisma.user.update({ where: { id: user.id! }, data: { username, status: 'ACTIVE' } });
        },
        signIn: async ({ user, account }) => {
            if (account?.provider === 'oauth-completion') return;
            await prisma.user.updateMany({
                where: { id: user.id! },
                data: {
                    lastSeen: new Date(),
                    ...(account?.provider !== 'credentials' && user.image ? { image: user.image } : {}),
                },
            });
        },
    },
    logger: {
        error(code, ...message) { console.error('NEXTAUTH ERROR', code, ...message); },
    },
    secret: process.env.NEXTAUTH_SECRET,
});
