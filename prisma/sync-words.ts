/**
 * Met à jour UNIQUEMENT les groupes de mots (tables word_groups + words) en base,
 * sans toucher au reste (users, quiz, attempts…). Sûr à exécuter en production.
 *
 *   DATABASE_URL="<url-prod>" npx tsx prisma/sync-words.ts
 *   (ou: npm run db:sync-words  avec DATABASE_URL pointant la prod)
 *
 * Word/WordGroup ne sont référencés par aucune autre table : on les remplace
 * intégralement par le contenu de `wordGroups` (source unique dans seed-shared.ts).
 */
import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { wordGroups } from './seed-shared';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
    const themes = Object.keys(wordGroups);
    const total = Object.values(wordGroups).flat().length;

    // Garde-fou anti-doublon (contrainte word.word @unique).
    const all = Object.values(wordGroups).flat();
    const dup = all.find((w, i) => all.indexOf(w) !== i);
    if (dup) throw new Error(`Mot en double dans wordGroups : "${dup}"`);

    console.log(`🔄 Synchronisation de ${themes.length} groupes / ${total} mots…`);
    console.log(`   Base : ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')}`);

    await prisma.$transaction(async (tx) => {
        await tx.word.deleteMany();
        await tx.wordGroup.deleteMany();
        for (const [theme, words] of Object.entries(wordGroups)) {
            // Create the group first, then its words — avoids a Prisma 7 + pg-adapter
            // nested-write ordering issue (word inserted before the group is visible).
            const group = await tx.wordGroup.create({ data: { theme } });
            await tx.word.createMany({ data: words.map(word => ({ word, wordGroupId: group.id })) });
        }
    }, { timeout: 60_000, maxWait: 10_000 });

    const groups = await prisma.wordGroup.count();
    const words = await prisma.word.count();
    console.log(`✅ Terminé : ${groups} groupes, ${words} mots en base.`);
}

main()
    .catch((e) => { console.error('❌ Échec :', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
