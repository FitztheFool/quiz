// src/lib/oauthPendingStore.ts
import prisma from './prisma';

export type OauthMetadata = {
    email: string | null;
    name: string | null;
    image: string | null;
    provider: string;
    providerAccountId: string;
    type: string;
    access_token?: string | null;
    token_type?: string | null;
    scope?: string | null;
};

export async function createPending(
    userId: string,
    baseName: string,
    suggestions: string[],
    metadata?: OauthMetadata,
): Promise<string> {
    const token = crypto.randomUUID();
    await prisma.oauthPending.create({
        data: {
            token,
            userId,
            baseName,
            suggestions,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            metadata: metadata ?? undefined,
        },
    });
    return token;
}

export async function getPending(token: string) {
    const entry = await prisma.oauthPending.findUnique({ where: { token } });
    if (!entry || entry.expiresAt < new Date()) {
        if (entry) await prisma.oauthPending.delete({ where: { token } });
        return null;
    }
    return {
        userId: entry.userId,
        baseName: entry.baseName,
        suggestions: entry.suggestions,
        metadata: entry.metadata as OauthMetadata | null,
    };
}

export async function deletePending(token: string) {
    await prisma.oauthPending.deleteMany({ where: { token } });
}
