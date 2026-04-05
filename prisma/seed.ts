import dotenv from 'dotenv';
dotenv.config();

import crypto from 'node:crypto';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import { seedQuizzes } from './seed-quiz';
import {
    seedQuizAttempts,
    seedUnoAttempts,
    seedSkyjowAttempts,
    seedTabooAttempts,
    seedYahtzeeAttempts,
    seedPuissance4Attempts,
    seedJustOneAttempts,
    seedBattleshipAttempts,
    seedDiamantAttempts,
    seedImpostorAttempts,
} from './seed-attempts';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Début du seed...');

    // ─── 1. Nettoyage ─────────────────────────────────────────────────────────
    await prisma.account.deleteMany();
    await prisma.session.deleteMany();
    await prisma.verificationToken.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.question.deleteMany();
    await prisma.attempt.deleteMany();
    await prisma.quiz.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    await prisma.word.deleteMany();

    // ─── 2. Catégories ────────────────────────────────────────────────────────
    const cultureGenerale = await prisma.category.create({ data: { name: 'Culture Générale', slug: 'culture-generale' } });
    const sciences = await prisma.category.create({ data: { name: 'Sciences', slug: 'sciences' } });
    const sports = await prisma.category.create({ data: { name: 'Sports', slug: 'sports' } });
    const artsCulture = await prisma.category.create({ data: { name: 'Arts & Culture', slug: 'arts-culture' } });
    const technologie = await prisma.category.create({ data: { name: 'Technologie', slug: 'technologie' } });
    const popCulture = await prisma.category.create({ data: { name: 'Pop culture', slug: 'pop-culture' } });
    const musique = await prisma.category.create({ data: { name: 'Musique', slug: 'musique' } });
    const videogames = await prisma.category.create({ data: { name: 'Jeu Vidéo', slug: 'jeu-video' } });
    const other = await prisma.category.create({ data: { name: 'Autre', slug: 'autre' } });

    console.log('✅ Catégories créées');

    // ─── 3. Utilisateurs ──────────────────────────────────────────────────────
    const defaultPasswordHash = await bcrypt.hash('123456', 10);

    const upsert = (email: string, username: string, role: 'ADMIN' | 'RANDOM' | 'USER') =>
        prisma.user.upsert({
            where: { email },
            update: {},
            create: { email, username, role, passwordHash: defaultPasswordHash },
        });

    const adminUser = await upsert('admin@quiz.app', 'Admin', 'ADMIN');
    const randomUser = await upsert('random@quiz.app', 'Bot🤖', 'RANDOM');
    const user = await upsert('user@quiz.app', 'User', 'USER');
    const farosUser = await upsert('faros@quiz.app', 'Faros', 'USER');

    const numbered = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
            upsert(`user${i + 1}@quiz.app`, `User${i + 1}`, 'USER')
        )
    );
    const [user1, user2, user3, user4, user5, user6, user7, user8, user9, user10] = numbered;

    console.log(`✅ ${2 + 1 + 1 + 10} utilisateurs créés`);

    // ─── 4. Mots ──────────────────────────────────────────────────────────────
    const words = [
        'ÉLÉPHANT', 'GIRAFE', 'CROCODILE', 'PINGOUIN', 'DAUPHIN', 'PANTHÈRE', 'FLAMANT', 'KANGOUROU',
        'CAMÉLÉON', 'HIPPOPOTAME', 'AUTRUCHE', 'PERROQUET', 'SCORPION', 'PIEUVRE', 'BALEINE',
        'PARAPLUIE', 'TÉLESCOPE', 'MICROSCOPE', 'ACCORDÉON', 'TRAMPOLINE', 'ESCALATOR', 'BOUILLOIRE',
        'LAMPADAIRE', 'FRIGO', 'ASPIRATEUR', 'CALCULATRICE', 'CHRONOMÈTRE', 'THERMOMÈTRE',
        'BIBLIOTHÈQUE', 'AQUARIUM', 'VOLCAN', 'DÉSERT', 'GLACIER', 'PHARE', 'CATHÉDRALE', 'CASINO',
        'STADE', 'CIRQUE', 'CIMETIÈRE', 'LABORATOIRE', 'OBSERVATOIRE', 'MANÈGE',
        'GRAVITÉ', 'DÉMOCRATIE', 'RENAISSANCE', 'RÉVOLUTION', 'PHOTOSYNTHÈSE', 'HIBERNATION',
        'MIGRATION', 'ÉVOLUTION', 'INFLATION', 'PANDÉMIE', 'PROPHÉTIE', 'PARADOXE',
        'ARCHÉOLOGUE', 'ASTRONAUTE', 'POMPIER', 'VÉTÉRINAIRE', 'SOMMELIER', 'CARTOGRAPHE',
        'CHORÉGRAPHE', 'MARIONNETTISTE', 'APICULTEUR', 'PLONGEUR', 'GLACIOLOGUE',
        'SKATEBOARD', 'PARACHUTE', 'PLANCHE À VOILE', 'BOOMERANG', 'CALLIGRAPHIE',
        'ORIGAMI', 'ESCALADE', 'ESCRIME', 'BOXE', 'NATATION', 'MARATHON',
        'GUACAMOLE', 'CROISSANT', 'FONDUE', 'SUSHI', 'RAVIOLI', 'MACARON', 'SOUFFLÉ', 'CRÊPE',
        'COUSCOUS', 'PAELLA', 'TIRAMISU', 'ÉCLAIR', 'MADELEINE',
    ];
    for (const word of words) {
        await prisma.word.upsert({ where: { word }, update: {}, create: { word } });
    }
    console.log(`✅ ${words.length} mots ajoutés`);

    // ─── 5. Quiz ──────────────────────────────────────────────────────────────
    await seedQuizzes(prisma, randomUser.id, {
        cultureGenerale, sciences, sports, artsCulture,
        technologie, popCulture, musique, videogames, other,
    });

    // ─── 6. Attempts ──────────────────────────────────────────────────────────
    const allPlayers = [farosUser, user, user1, user2, user3, user4, user5, user6, user7, user8, user9, user10];

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

    console.log('\n✅ Seed terminé !');
}

main()
    .catch((e) => { console.error('❌ Erreur lors du seed:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
