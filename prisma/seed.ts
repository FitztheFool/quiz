// prisma/seed.ts

import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import { cleanDatabase, seedShared } from './seed-shared';
import {
    seedQuizAttempts, seedUnoAttempts, seedSkyjowAttempts,
    seedTabooAttempts, seedYahtzeeAttempts, seedPuissance4Attempts,
    seedJustOneAttempts, seedBattleshipAttempts, seedDiamantAttempts,
    seedImpostorAttempts, seedSnakeAttempts, seedPacmanAttempts, seedBreakoutAttempts,
    seedTetrisAttempts, seedLudoAttempts,
} from './seed-attempts';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
    console.log('🌱 Début du seed (dev)...');

    await cleanDatabase(prisma);

    const hash = await bcrypt.hash('123456', 10);
    const upsert = (email: string, username: string, role: 'ADMIN' | 'RANDOM' | 'USER', status: 'ACTIVE' | 'PENDING' = 'ACTIVE') =>
        prisma.user.upsert({ where: { email }, update: { status }, create: { email, username, role, status, passwordHash: hash } });

    const adminUser = await upsert('admin@quiz.app', 'Admin', 'ADMIN');
    const randomUser = await upsert('random@quiz.app', 'Bot🤖', 'RANDOM');
    const farosUser = await upsert('faros@quiz.app', 'Faros', 'USER');
    const user = await upsert('user@quiz.app', 'User', 'USER');

    const numbered = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
            upsert(`user${i + 1}@quiz.app`, `User${i + 1}`, 'USER', i < 5 ? 'ACTIVE' : 'PENDING')
        )
    );
    const [user1, user2, user3, user4, user5] = numbered;
    console.log('✅ Utilisateurs créés');

    await seedShared(prisma, randomUser.id);

    const allPlayers = [farosUser, user, ...numbered];
    await seedQuizAttempts(prisma, { faros: farosUser, user1, user2, user3, user4, user5 });
    await seedUnoAttempts(prisma, allPlayers.slice(0, 10));
    await seedSkyjowAttempts(prisma, allPlayers.slice(0, 10));
    await seedTabooAttempts(prisma, allPlayers);
    await seedYahtzeeAttempts(prisma, allPlayers.slice(0, 10));
    await seedPuissance4Attempts(prisma, allPlayers.slice(0, 10));
    await seedJustOneAttempts(prisma, allPlayers.slice(0, 10));
    await seedBattleshipAttempts(prisma, allPlayers);
    await seedDiamantAttempts(prisma, allPlayers);
    await seedImpostorAttempts(prisma, allPlayers);
    await seedSnakeAttempts(prisma, allPlayers);
    await seedPacmanAttempts(prisma, allPlayers);
    await seedBreakoutAttempts(prisma, allPlayers);
    await seedTetrisAttempts(prisma, allPlayers);
    await seedLudoAttempts(prisma, allPlayers);

    console.log('\n✅ Seed dev terminé !');
}

main()
    .catch(e => { console.error('❌', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
