// prisma/seed-shared.ts
import { PrismaClient } from '../src/generated/prisma/client';
import { seedQuizzes } from './seed-quiz';

export async function seedShared(prisma: PrismaClient, randomUserId: string) {
    // Catégories
    const cultureGenerale = await prisma.category.create({ data: { name: 'Culture Générale', slug: 'culture-generale' } });
    const sciences = await prisma.category.create({ data: { name: 'Sciences', slug: 'sciences' } });
    const sports = await prisma.category.create({ data: { name: 'Sports', slug: 'sports' } });
    const artsCulture = await prisma.category.create({ data: { name: 'Arts & Culture', slug: 'arts-culture' } });
    const technologie = await prisma.category.create({ data: { name: 'Technologie', slug: 'technologie' } });
    const popCulture = await prisma.category.create({ data: { name: 'Pop culture', slug: 'pop-culture' } });
    const musique = await prisma.category.create({ data: { name: 'Musique', slug: 'musique' } });
    const videogames = await prisma.category.create({ data: { name: 'Jeux Vidéos', slug: 'jeux-video' } });
    const litterature = await prisma.category.create({ data: { name: 'Littérature', slug: 'litterature' } });
    const movies = await prisma.category.create({ data: { name: 'Cinéma', slug: 'cinema' } });
    const other = await prisma.category.create({ data: { name: 'Autre', slug: 'autre' } });
    console.log('✅ Catégories créées');

    // Mots
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

    // Quiz
    await seedQuizzes(prisma, randomUserId, {
        cultureGenerale, sciences, sports, artsCulture,
        technologie, popCulture, musique, videogames, litterature, other,
    });
}

export async function cleanDatabase(prisma: PrismaClient) {
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
}
