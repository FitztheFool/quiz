// src/lib/createAnonymousUser.ts
import prisma from '@/lib/prisma';
import { randomInt } from 'crypto';

export async function createAnonymousUser() {
    for (let i = 0; i < 5; i++) {
        const suffix = randomInt(10000, 99999);
        const username = `anonyme${suffix}`;
        const email = `anonyme_${suffix}_${Date.now()}@local`;
        const passwordHash = `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        try {
            return await prisma.user.create({
                data: {
                    username,
                    email,
                    passwordHash,
                    role: 'ANONYMOUS',
                },
                select: { id: true },
            });
        } catch (e: any) {
            if (e?.code === 'P2002') continue; // collision unique
            throw e;
        }
    }

    throw new Error('Impossible de créer un utilisateur anonyme');
}
