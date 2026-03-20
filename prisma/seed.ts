// prisma/seed.ts
import dotenv from 'dotenv';
dotenv.config();

import crypto from 'node:crypto';

import { PrismaClient, QuestionType } from '@prisma/client';

import bcrypt from 'bcrypt';

function computeUnoScore(rank: number) {
    if (rank === 1) return 20;
    if (rank === 2) return 13;
    if (rank === 3) return 6;
    return 2;
}

const prisma = new PrismaClient();

async function main() {
    console.log('1 - entrée dans main');
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
    const other = await prisma.category.create({ data: { name: 'Autre', slug: 'autre' } });

    console.log('✅ Catégories créées');

    // ─── 3. Utilisateurs ──────────────────────────────────────────────────────
    const defaultPasswordHash = await bcrypt.hash('123456', 10);

    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@quiz.app' },
        update: {},
        create: { email: 'admin@quiz.app', username: 'Admin', role: 'ADMIN', passwordHash: defaultPasswordHash },
    });
    const randomUser = await prisma.user.upsert({
        where: { email: 'random@quiz.app' },
        update: {},
        create: { email: 'random@quiz.app', username: 'Aléatoire', role: 'RANDOM', passwordHash: defaultPasswordHash },
    });

    const anonUser = await prisma.user.upsert({
        where: { email: 'user@quiz.app' },
        update: {},
        create: { email: 'user@quiz.app', username: 'User', role: 'USER', passwordHash: defaultPasswordHash },
    });
    const [anonUser1, anonUser2, anonUser3, anonUser4, anonUser5, anonUser6, anonUser7, anonUser8, anonUser9, anonUser10] = await Promise.all(
        Array.from({ length: 10 }, (_, i) => prisma.user.upsert({
            where: { email: `user${i + 1}@quiz.app` },
            update: {},
            create: { email: `user${i + 1}@quiz.app`, username: `User${i + 1}`, role: 'USER', passwordHash: defaultPasswordHash },
        }))
    );
    const farosUser = await prisma.user.upsert({
        where: { email: 'faros@quiz.app' },
        update: {},
        create: { email: 'faros@quiz.app', username: 'Faros', role: 'USER', passwordHash: defaultPasswordHash },
    });

    console.log(`✅ Utilisateur créé: ${adminUser.username}`);
    console.log(`✅ Utilisateur créé: ${randomUser.username}`);
    console.log(`✅ Utilisateur créé: ${anonUser1.username}`);
    console.log(`✅ Utilisateur créé: ${anonUser2.username}`);
    console.log(`✅ Utilisateur créé: ${anonUser3.username}`);
    console.log(`✅ Utilisateur créé: ${anonUser4.username}`);
    console.log(`✅ Utilisateur créé: ${anonUser5.username}`);
    console.log(`✅ Utilisateur créé: ${anonUser6.username}`);
    console.log(`✅ Utilisateur créé: ${anonUser7.username}`);
    console.log(`✅ Utilisateur créé: ${anonUser8.username}`);
    console.log(`✅ Utilisateur créé: ${anonUser9.username}`);
    console.log(`✅ Utilisateur créé: ${anonUser10.username}`);
    console.log(`✅ Utilisateur créé: ${farosUser.username}`);

    // ─── 3. MOTS ────────────────────────────────────────────────────────
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
        await prisma.word.upsert({
            where: { word },
            update: {},
            create: { word },
        });
    }
    console.log(`✅ ${words.length} mots ajoutés.`);

    // ─── 4. Quiz ──────────────────────────────────────────────────────────────
    const quizData = [
        {
            title: "Culture Générale - Niveau Débutant",
            description: "Testez vos connaissances de base !",
            categoryId: cultureGenerale.id,
            isPublic: true, randomizeQuestions: false,
            questions: [
                { content: "Quelle est la capitale de la France ?", type: "MCQ", points: 1, answers: [{ content: "Paris", isCorrect: true }, { content: "Lyon", isCorrect: false }, { content: "Marseille", isCorrect: false }, { content: "Bordeaux", isCorrect: false }] },
                { content: "Combien y a-t-il de continents sur Terre ?", type: "MCQ", points: 1, answers: [{ content: "5", isCorrect: false }, { content: "6", isCorrect: false }, { content: "7", isCorrect: true }, { content: "8", isCorrect: false }] },
                { content: "La Tour Eiffel a été construite en 1889", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quelle est la langue la plus parlée dans le monde ?", type: "MCQ", points: 2, answers: [{ content: "Anglais", isCorrect: false }, { content: "Mandarin", isCorrect: true }, { content: "Espagnol", isCorrect: false }, { content: "Hindi", isCorrect: false }] },
                { content: "Quel pays est le plus grand du monde en superficie ?", type: "MCQ", points: 2, answers: [{ content: "Canada", isCorrect: false }, { content: "Chine", isCorrect: false }, { content: "Russie", isCorrect: true }, { content: "États-Unis", isCorrect: false }] },
                { content: "Le Nil est le fleuve le plus long du monde", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
            ]
        },
        {
            title: "Le Système Solaire", description: "Découvrez notre système planétaire", categoryId: sciences.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Combien de planètes y a-t-il dans le système solaire ?", type: "MCQ", points: 1, answers: [{ content: "7", isCorrect: false }, { content: "8", isCorrect: true }, { content: "9", isCorrect: false }, { content: "10", isCorrect: false }] },
                { content: "Jupiter est la plus grande planète du système solaire", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quelle planète est surnommée la planète rouge ?", type: "TEXT", points: 2, answers: [{ content: "Mars", isCorrect: true }] },
                { content: "Quelle est la planète la plus proche du Soleil ?", type: "MCQ", points: 2, answers: [{ content: "Vénus", isCorrect: false }, { content: "Mercure", isCorrect: true }, { content: "Mars", isCorrect: false }, { content: "Terre", isCorrect: false }] },
                { content: "Saturne est connue pour ses anneaux", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Combien de temps met la lumière du Soleil pour atteindre la Terre ?", type: "MCQ", points: 3, answers: [{ content: "8 secondes", isCorrect: false }, { content: "8 minutes", isCorrect: true }, { content: "8 heures", isCorrect: false }, { content: "8 jours", isCorrect: false }] },
            ]
        },
        {
            title: "Football - Les Bases", description: "Le sport le plus populaire au monde", categoryId: sports.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Combien de joueurs composent une équipe de football sur le terrain ?", type: "MCQ", points: 1, answers: [{ content: "9", isCorrect: false }, { content: "10", isCorrect: false }, { content: "11", isCorrect: true }, { content: "12", isCorrect: false }] },
                { content: "Un match de football dure 90 minutes", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel pays a remporté la Coupe du Monde 2018 ?", type: "TEXT", points: 2, answers: [{ content: "France", isCorrect: true }] },
                { content: "Combien de fois le Brésil a-t-il remporté la Coupe du Monde ?", type: "MCQ", points: 2, answers: [{ content: "3", isCorrect: false }, { content: "4", isCorrect: false }, { content: "5", isCorrect: true }, { content: "6", isCorrect: false }] },
                { content: "Le hors-jeu est une règle du football", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
            ]
        },
        {
            title: "Peinture et Sculpture", description: "Les grands artistes", categoryId: artsCulture.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Qui a peint La Joconde ?", type: "MCQ", points: 1, answers: [{ content: "Michel-Ange", isCorrect: false }, { content: "Léonard de Vinci", isCorrect: true }, { content: "Raphaël", isCorrect: false }, { content: "Botticelli", isCorrect: false }] },
                { content: "Vincent van Gogh s'est coupé l'oreille", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Qui a peint Guernica ?", type: "TEXT", points: 2, answers: [{ content: "Picasso", isCorrect: true }] },
                { content: "Qui a sculpté Le Penseur ?", type: "MCQ", points: 2, answers: [{ content: "Michel-Ange", isCorrect: false }, { content: "Auguste Rodin", isCorrect: true }, { content: "Camille Claudel", isCorrect: false }, { content: "Donatello", isCorrect: false }] },
                { content: "La statue de David a été sculptée par Michel-Ange", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Dans quel musée parisien est exposée La Joconde ?", type: "TEXT", points: 1, answers: [{ content: "Le Louvre", isCorrect: true }] },
            ]
        },
        {
            title: "Histoire de l'Informatique", description: "Les pionniers du numérique", categoryId: technologie.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Qui est considéré comme le père de l'informatique ?", type: "MCQ", points: 2, answers: [{ content: "Steve Jobs", isCorrect: false }, { content: "Alan Turing", isCorrect: true }, { content: "Bill Gates", isCorrect: false }, { content: "Tim Berners-Lee", isCorrect: false }] },
                { content: "Le premier ordinateur électronique s'appelait ENIAC", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Qui a inventé le World Wide Web ?", type: "MCQ", points: 2, answers: [{ content: "Steve Jobs", isCorrect: false }, { content: "Tim Berners-Lee", isCorrect: true }, { content: "Bill Gates", isCorrect: false }, { content: "Mark Zuckerberg", isCorrect: false }] },
                { content: "Apple a été fondé par Steve Jobs et Steve Wozniak", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "En quelle année a été créé le premier iPhone ?", type: "MCQ", points: 2, answers: [{ content: "2005", isCorrect: false }, { content: "2007", isCorrect: true }, { content: "2009", isCorrect: false }, { content: "2010", isCorrect: false }] },
                { content: "HTTP signifie HyperText Transfer Protocol", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
            ]
        },
        {
            title: "Géographie Mondiale", description: "Connaissez-vous bien notre planète ?", categoryId: cultureGenerale.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Quel est le plus grand océan du monde ?", type: "MCQ", points: 2, answers: [{ content: "Océan Atlantique", isCorrect: false }, { content: "Océan Pacifique", isCorrect: true }, { content: "Océan Indien", isCorrect: false }, { content: "Océan Arctique", isCorrect: false }] },
                { content: "Quelle est la capitale du Japon ?", type: "TEXT", points: 1, answers: [{ content: "Tokyo", isCorrect: true }] },
                { content: "Le Mont Everest est la plus haute montagne du monde", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Dans quel pays se trouve le Sahara ?", type: "MCQ", points: 2, answers: [{ content: "Égypte", isCorrect: false }, { content: "Maroc", isCorrect: false }, { content: "Il s'étend sur plusieurs pays", isCorrect: true }, { content: "Algérie", isCorrect: false }] },
                { content: "Quelle est la capitale du Brésil ?", type: "TEXT", points: 2, answers: [{ content: "Brasilia", isCorrect: true }] },
            ]
        },
        {
            title: "Chimie et Physique", description: "Les lois de la nature", categoryId: sciences.id, isPublic: true, randomizeQuestions: false,
            questions: [
                { content: "Quelle est la vitesse de la lumière dans le vide ?", type: "MCQ", points: 3, answers: [{ content: "300 000 km/s", isCorrect: true }, { content: "150 000 km/s", isCorrect: false }, { content: "500 000 km/s", isCorrect: false }, { content: "1 000 000 km/s", isCorrect: false }] },
                { content: "L'eau est composée de deux atomes d'hydrogène et un atome d'oxygène", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel est le symbole chimique de l'or ?", type: "MCQ", points: 2, answers: [{ content: "Or", isCorrect: false }, { content: "Au", isCorrect: true }, { content: "Ag", isCorrect: false }, { content: "Go", isCorrect: false }] },
                { content: "La gravité sur la Lune est plus faible que sur Terre", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel est le symbole chimique du fer ?", type: "TEXT", points: 2, answers: [{ content: "Fe", isCorrect: true }] },
            ]
        },
        {
            title: "Jeux Olympiques", description: "L'histoire des JO", categoryId: sports.id, isPublic: true, randomizeQuestions: false,
            questions: [
                { content: "En quelle année ont eu lieu les premiers Jeux Olympiques modernes ?", type: "MCQ", points: 2, answers: [{ content: "1896", isCorrect: true }, { content: "1900", isCorrect: false }, { content: "1904", isCorrect: false }, { content: "1920", isCorrect: false }] },
                { content: "Les Jeux Olympiques ont lieu tous les 4 ans", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Dans quelle ville ont eu lieu les JO d'été de 2024 ?", type: "TEXT", points: 2, answers: [{ content: "Paris", isCorrect: true }] },
                { content: "Combien d'anneaux compte le symbole olympique ?", type: "MCQ", points: 1, answers: [{ content: "4", isCorrect: false }, { content: "5", isCorrect: true }, { content: "6", isCorrect: false }, { content: "7", isCorrect: false }] },
                { content: "Usain Bolt détient le record du monde du 100m", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quelle est la distance d'un marathon ?", type: "MCQ", points: 2, answers: [{ content: "40,195 km", isCorrect: false }, { content: "42,195 km", isCorrect: true }, { content: "44,195 km", isCorrect: false }, { content: "45 km", isCorrect: false }] },
            ]
        },
        {
            title: "Musique à travers les Âges", description: "Du classique au rock", categoryId: artsCulture.id, isPublic: true, randomizeQuestions: false,
            questions: [
                { content: "Qui a composé La 5e Symphonie ?", type: "MCQ", points: 2, answers: [{ content: "Mozart", isCorrect: false }, { content: "Beethoven", isCorrect: true }, { content: "Bach", isCorrect: false }, { content: "Vivaldi", isCorrect: false }] },
                { content: "Mozart est né en Autriche", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel groupe est connu pour 'Bohemian Rhapsody' ?", type: "MCQ", points: 1, answers: [{ content: "The Beatles", isCorrect: false }, { content: "Queen", isCorrect: true }, { content: "Led Zeppelin", isCorrect: false }, { content: "Pink Floyd", isCorrect: false }] },
                { content: "Elvis Presley était surnommé 'The King'", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Dans quel pays est né le jazz ?", type: "MCQ", points: 2, answers: [{ content: "Cuba", isCorrect: false }, { content: "États-Unis", isCorrect: true }, { content: "France", isCorrect: false }, { content: "Brésil", isCorrect: false }] },
            ]
        },
        {
            title: "Internet et Réseaux Sociaux", description: "Le monde connecté", categoryId: technologie.id, isPublic: true, randomizeQuestions: false,
            questions: [
                { content: "En quelle année Facebook a-t-il été créé ?", type: "MCQ", points: 2, answers: [{ content: "2002", isCorrect: false }, { content: "2004", isCorrect: true }, { content: "2006", isCorrect: false }, { content: "2008", isCorrect: false }] },
                { content: "Instagram appartient à Meta (Facebook)", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel réseau social est basé sur des vidéos courtes ?", type: "MCQ", points: 1, answers: [{ content: "LinkedIn", isCorrect: false }, { content: "TikTok", isCorrect: true }, { content: "Pinterest", isCorrect: false }, { content: "Snapchat", isCorrect: false }] },
                { content: "Amazon a été fondé par Jeff Bezos", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Que signifie l'acronyme GAFAM ?", type: "MCQ", points: 2, answers: [{ content: "Google, Apple, Facebook, Amazon, Microsoft", isCorrect: true }, { content: "Google, AMD, Facebook, Amazon, Mozilla", isCorrect: false }, { content: "Gmail, Apple, Firefox, Amazon, Microsoft", isCorrect: false }, { content: "Google, Apple, Ford, Amazon, Meta", isCorrect: false }] },
            ]
        },
        {
            title: "Histoire de France", description: "De Clovis à la Ve République", categoryId: cultureGenerale.id, isPublic: true, randomizeQuestions: false,
            questions: [
                { content: "En quelle année a eu lieu la Révolution française ?", type: "MCQ", points: 2, answers: [{ content: "1789", isCorrect: true }, { content: "1792", isCorrect: false }, { content: "1804", isCorrect: false }, { content: "1815", isCorrect: false }] },
                { content: "Qui était le roi de France pendant la Révolution ?", type: "TEXT", points: 2, answers: [{ content: "Louis XVI", isCorrect: true }] },
                { content: "Napoléon Bonaparte est né en Corse", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Qui a été le premier président de la Ve République ?", type: "MCQ", points: 2, answers: [{ content: "Charles de Gaulle", isCorrect: true }, { content: "Georges Pompidou", isCorrect: false }, { content: "François Mitterrand", isCorrect: false }, { content: "René Coty", isCorrect: false }] },
                { content: "En quelle année la France a-t-elle aboli la peine de mort ?", type: "MCQ", points: 3, answers: [{ content: "1971", isCorrect: false }, { content: "1981", isCorrect: true }, { content: "1991", isCorrect: false }, { content: "2001", isCorrect: false }] },
                { content: "La Déclaration des droits de l'homme a été signée en 1789", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
            ]
        },
        {
            title: "Biologie et Animaux", description: "Le vivant et ses mystères", categoryId: sciences.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Combien d'os compte le squelette humain adulte ?", type: "MCQ", points: 2, answers: [{ content: "186", isCorrect: false }, { content: "206", isCorrect: true }, { content: "226", isCorrect: false }, { content: "246", isCorrect: false }] },
                { content: "Les dauphins sont des mammifères", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel est l'animal terrestre le plus rapide ?", type: "MCQ", points: 2, answers: [{ content: "Le lion", isCorrect: false }, { content: "Le guépard", isCorrect: true }, { content: "L'antilope", isCorrect: false }, { content: "Le lévrier", isCorrect: false }] },
                { content: "Quel est le plus grand animal du monde ?", type: "TEXT", points: 2, answers: [{ content: "Baleine bleue", isCorrect: true }] },
                { content: "Le cœur humain a quatre cavités", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Combien de chromosomes possède un être humain ?", type: "MCQ", points: 3, answers: [{ content: "23", isCorrect: false }, { content: "46", isCorrect: true }, { content: "48", isCorrect: false }, { content: "52", isCorrect: false }] },
            ]
        },
        {
            title: "Tennis et Sports de Raquette", description: "Les tournois majeurs", categoryId: sports.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Combien y a-t-il de tournois du Grand Chelem ?", type: "MCQ", points: 1, answers: [{ content: "3", isCorrect: false }, { content: "4", isCorrect: true }, { content: "5", isCorrect: false }, { content: "6", isCorrect: false }] },
                { content: "Roland-Garros se joue sur terre battue", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Sur quelle surface se joue Wimbledon ?", type: "MCQ", points: 2, answers: [{ content: "Terre battue", isCorrect: false }, { content: "Gazon", isCorrect: true }, { content: "Surface dure", isCorrect: false }, { content: "Moquette", isCorrect: false }] },
                { content: "Quel score s'appelle 'zéro' au tennis ?", type: "TEXT", points: 2, answers: [{ content: "Love", isCorrect: true }] },
                { content: "Rafael Nadal a remporté Roland-Garros plus de 10 fois", type: "TRUE_FALSE", points: 2, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
            ]
        },
        {
            title: "Cinéma et Littérature", description: "Les œuvres incontournables", categoryId: artsCulture.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Qui a écrit Les Misérables ?", type: "MCQ", points: 2, answers: [{ content: "Émile Zola", isCorrect: false }, { content: "Victor Hugo", isCorrect: true }, { content: "Gustave Flaubert", isCorrect: false }, { content: "Alexandre Dumas", isCorrect: false }] },
                { content: "Molière était un dramaturge et acteur", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel film a remporté l'Oscar du meilleur film en 1998 ?", type: "MCQ", points: 3, answers: [{ content: "Saving Private Ryan", isCorrect: false }, { content: "Titanic", isCorrect: true }, { content: "Good Will Hunting", isCorrect: false }, { content: "La Vie est belle", isCorrect: false }] },
                { content: "Qui a écrit Roméo et Juliette ?", type: "TEXT", points: 1, answers: [{ content: "Shakespeare", isCorrect: true }] },
                { content: "Les Oscars sont décernés chaque année à Los Angeles", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel roman de Jules Verne parle d'un voyage autour du monde en 80 jours ?", type: "TEXT", points: 2, answers: [{ content: "Le Tour du monde en quatre-vingts jours", isCorrect: true }] },
            ]
        },
        {
            title: "Programmation et Systèmes", description: "Le monde du code", categoryId: technologie.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Quel langage est principalement utilisé pour le développement web front-end ?", type: "MCQ", points: 2, answers: [{ content: "Python", isCorrect: false }, { content: "JavaScript", isCorrect: true }, { content: "Java", isCorrect: false }, { content: "C++", isCorrect: false }] },
                { content: "HTML signifie HyperText Markup Language", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel système d'exploitation est open source ?", type: "MCQ", points: 2, answers: [{ content: "Windows", isCorrect: false }, { content: "Linux", isCorrect: true }, { content: "macOS", isCorrect: false }, { content: "iOS", isCorrect: false }] },
                { content: "macOS est développé par Apple", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel langage de programmation porte le nom d'un serpent ?", type: "TEXT", points: 1, answers: [{ content: "Python", isCorrect: true }] },
                { content: "Un bug informatique est une erreur dans le code", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
            ]
        },
        {
            title: "Mythologie Grecque", description: "Les dieux et héros de l'Olympe", categoryId: cultureGenerale.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Qui est le dieu grec du ciel et du tonnerre ?", type: "MCQ", points: 2, answers: [{ content: "Poséidon", isCorrect: false }, { content: "Zeus", isCorrect: true }, { content: "Hadès", isCorrect: false }, { content: "Apollon", isCorrect: false }] },
                { content: "Athéna est la déesse de la sagesse", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Comment s'appelle le héros qui a tué la Méduse ?", type: "TEXT", points: 2, answers: [{ content: "Persée", isCorrect: true }] },
                { content: "Quel dieu grec est associé à la mer ?", type: "MCQ", points: 1, answers: [{ content: "Arès", isCorrect: false }, { content: "Hermès", isCorrect: false }, { content: "Poséidon", isCorrect: true }, { content: "Héphaïstos", isCorrect: false }] },
                { content: "Hercule est le héros le plus célèbre de la mythologie grecque", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel est le nom du cheval ailé de la mythologie grecque ?", type: "TEXT", points: 2, answers: [{ content: "Pégase", isCorrect: true }] },
            ]
        },
        {
            title: "Inventions et Découvertes", description: "Les grandes innovations de l'Histoire", categoryId: sciences.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Qui a inventé l'ampoule électrique ?", type: "MCQ", points: 2, answers: [{ content: "Nikola Tesla", isCorrect: false }, { content: "Thomas Edison", isCorrect: true }, { content: "Alexander Graham Bell", isCorrect: false }, { content: "Benjamin Franklin", isCorrect: false }] },
                { content: "Alexander Fleming a découvert la pénicilline", type: "TRUE_FALSE", points: 2, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Qui a découvert la gravité en observant une pomme tomber ?", type: "TEXT", points: 1, answers: [{ content: "Newton", isCorrect: true }] },
                { content: "Marie Curie a découvert la radioactivité", type: "TRUE_FALSE", points: 2, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "En quelle année l'homme a-t-il marché sur la Lune pour la première fois ?", type: "MCQ", points: 2, answers: [{ content: "1965", isCorrect: false }, { content: "1967", isCorrect: false }, { content: "1969", isCorrect: true }, { content: "1971", isCorrect: false }] },
            ]
        },
        {
            title: "Sports Collectifs", description: "Rugby, basket, handball...", categoryId: sports.id, isPublic: true, randomizeQuestions: false,
            questions: [
                { content: "Combien de joueurs composent une équipe de rugby à XV ?", type: "MCQ", points: 1, answers: [{ content: "13", isCorrect: false }, { content: "14", isCorrect: false }, { content: "15", isCorrect: true }, { content: "16", isCorrect: false }] },
                { content: "Combien de joueurs sont sur le terrain par équipe en NBA ?", type: "MCQ", points: 1, answers: [{ content: "4", isCorrect: false }, { content: "5", isCorrect: true }, { content: "6", isCorrect: false }, { content: "7", isCorrect: false }] },
                { content: "Michael Jordan a joué pour les Chicago Bulls", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Combien de joueurs y a-t-il dans une équipe de volleyball ?", type: "MCQ", points: 2, answers: [{ content: "5", isCorrect: false }, { content: "6", isCorrect: true }, { content: "7", isCorrect: false }, { content: "8", isCorrect: false }] },
                { content: "Le handball se joue avec les pieds", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: false }, { content: "Faux", isCorrect: true }] },
                { content: "Dans quel pays est né le basketball ?", type: "MCQ", points: 2, answers: [{ content: "Canada", isCorrect: true }, { content: "États-Unis", isCorrect: false }, { content: "Angleterre", isCorrect: false }, { content: "Australie", isCorrect: false }] },
            ]
        },
        {
            title: "Architecture et Monuments", description: "Les chefs-d'œuvre architecturaux", categoryId: artsCulture.id, isPublic: true, randomizeQuestions: false,
            questions: [
                { content: "Qui a conçu la Tour Eiffel ?", type: "MCQ", points: 2, answers: [{ content: "Le Corbusier", isCorrect: false }, { content: "Gustave Eiffel", isCorrect: true }, { content: "Haussmann", isCorrect: false }, { content: "Vauban", isCorrect: false }] },
                { content: "La Sagrada Familia à Barcelone est toujours en construction", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Dans quel pays se trouve le Colisée ?", type: "TEXT", points: 1, answers: [{ content: "Italie", isCorrect: true }] },
                { content: "Qui a conçu la Sagrada Familia ?", type: "MCQ", points: 2, answers: [{ content: "Salvador Dalí", isCorrect: false }, { content: "Antoni Gaudí", isCorrect: true }, { content: "Pablo Picasso", isCorrect: false }, { content: "Joan Miró", isCorrect: false }] },
                { content: "La Pyramide du Louvre a été construite dans les années 1980", type: "TRUE_FALSE", points: 2, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
            ]
        },
        {
            title: "Intelligence Artificielle et Cybersécurité", description: "Les enjeux du numérique moderne", categoryId: technologie.id, isPublic: true, randomizeQuestions: false,
            questions: [
                { content: "Que signifie IA ?", type: "MCQ", points: 1, answers: [{ content: "Internet Avancé", isCorrect: false }, { content: "Intelligence Artificielle", isCorrect: true }, { content: "Information Automatique", isCorrect: false }, { content: "Interface Augmentée", isCorrect: false }] },
                { content: "ChatGPT est un modèle de langage développé par OpenAI", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Qu'est-ce qu'un virus informatique ?", type: "MCQ", points: 2, answers: [{ content: "Un programme malveillant", isCorrect: true }, { content: "Un antivirus", isCorrect: false }, { content: "Un navigateur web", isCorrect: false }, { content: "Un système d'exploitation", isCorrect: false }] },
                { content: "Un pare-feu (firewall) protège votre ordinateur des intrusions", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Le phishing est une technique de piratage par email", type: "TRUE_FALSE", points: 2, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
            ]
        },
        {
            title: "Seconde Guerre Mondiale", description: "Histoire de 1939-1945", categoryId: cultureGenerale.id, isPublic: true, randomizeQuestions: false,
            questions: [
                { content: "En quelle année a débuté la Seconde Guerre mondiale ?", type: "MCQ", points: 2, answers: [{ content: "1938", isCorrect: false }, { content: "1939", isCorrect: true }, { content: "1940", isCorrect: false }, { content: "1941", isCorrect: false }] },
                { content: "Le Débarquement de Normandie a eu lieu le 6 juin 1944", type: "TRUE_FALSE", points: 2, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quelle ville a été touchée par la première bombe atomique ?", type: "MCQ", points: 2, answers: [{ content: "Nagasaki", isCorrect: false }, { content: "Tokyo", isCorrect: false }, { content: "Hiroshima", isCorrect: true }, { content: "Osaka", isCorrect: false }] },
                { content: "Adolf Hitler était le chef de l'Allemagne nazie", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "En quelle année s'est terminée la Seconde Guerre mondiale ?", type: "MCQ", points: 1, answers: [{ content: "1944", isCorrect: false }, { content: "1945", isCorrect: true }, { content: "1946", isCorrect: false }, { content: "1947", isCorrect: false }] },
            ]
        },
        {
            title: "Écologie et Environnement", description: "Protégeons notre planète", categoryId: sciences.id, isPublic: true, randomizeQuestions: false,
            questions: [
                { content: "Quel gaz est principalement responsable du réchauffement climatique ?", type: "MCQ", points: 2, answers: [{ content: "Oxygène", isCorrect: false }, { content: "CO2", isCorrect: true }, { content: "Azote", isCorrect: false }, { content: "Hydrogène", isCorrect: false }] },
                { content: "La déforestation contribue au changement climatique", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Combien de temps met une bouteille en plastique à se dégrader ?", type: "MCQ", points: 2, answers: [{ content: "10 ans", isCorrect: false }, { content: "100 ans", isCorrect: false }, { content: "450 ans", isCorrect: true }, { content: "1000 ans", isCorrect: false }] },
                { content: "Les énergies renouvelables incluent l'énergie solaire et éolienne", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel est le principal gaz de l'atmosphère terrestre ?", type: "MCQ", points: 2, answers: [{ content: "Oxygène", isCorrect: false }, { content: "CO2", isCorrect: false }, { content: "Azote", isCorrect: true }, { content: "Argon", isCorrect: false }] },
                { content: "Quel terme désigne la disparition des espèces animales et végétales ?", type: "TEXT", points: 3, answers: [{ content: "Extinction", isCorrect: true }] },
            ]
        },
        {
            title: "Sports Mécaniques et Extrêmes", description: "Vitesse et sensations fortes", categoryId: sports.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Quel pilote a remporté le plus de championnats du monde de F1 ?", type: "MCQ", points: 3, answers: [{ content: "Ayrton Senna", isCorrect: false }, { content: "Lewis Hamilton", isCorrect: true }, { content: "Alain Prost", isCorrect: false }, { content: "Sebastian Vettel", isCorrect: false }] },
                { content: "Le Grand Prix de Monaco fait partie du calendrier F1", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "De quelle couleur est le maillot du leader au Tour de France ?", type: "MCQ", points: 1, answers: [{ content: "Vert", isCorrect: false }, { content: "Jaune", isCorrect: true }, { content: "Blanc", isCorrect: false }, { content: "Rouge", isCorrect: false }] },
                { content: "Le biathlon combine ski de fond et tir à la carabine", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quelle est la distance d'une piscine olympique ?", type: "MCQ", points: 2, answers: [{ content: "25 mètres", isCorrect: false }, { content: "50 mètres", isCorrect: true }, { content: "75 mètres", isCorrect: false }, { content: "100 mètres", isCorrect: false }] },
            ]
        },
        {
            title: "Bande Dessinée et Animation", description: "Le 9e art et les dessins animés", categoryId: artsCulture.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Qui a créé Astérix ?", type: "MCQ", points: 2, answers: [{ content: "Hergé", isCorrect: false }, { content: "Goscinny et Uderzo", isCorrect: true }, { content: "Franquin", isCorrect: false }, { content: "Peyo", isCorrect: false }] },
                { content: "Tintin a été créé par Hergé", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel studio a créé Le Roi Lion ?", type: "MCQ", points: 1, answers: [{ content: "Pixar", isCorrect: false }, { content: "Disney", isCorrect: true }, { content: "DreamWorks", isCorrect: false }, { content: "Warner Bros", isCorrect: false }] },
                { content: "Les Schtroumpfs ont été créés par Peyo", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Dans quel pays la bande dessinée manga est-elle originaire ?", type: "TEXT", points: 1, answers: [{ content: "Japon", isCorrect: true }] },
                { content: "Quel est le vrai nom de Batman ?", type: "MCQ", points: 2, answers: [{ content: "Clark Kent", isCorrect: false }, { content: "Bruce Wayne", isCorrect: true }, { content: "Peter Parker", isCorrect: false }, { content: "Tony Stark", isCorrect: false }] },
            ]
        },
        {
            title: "Jeux Vidéo et Cryptomonnaies", description: "Les nouvelles technologies", categoryId: technologie.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Quelle console a été créée par Nintendo en 1985 ?", type: "MCQ", points: 2, answers: [{ content: "Game Boy", isCorrect: false }, { content: "NES", isCorrect: true }, { content: "Super Nintendo", isCorrect: false }, { content: "N64", isCorrect: false }] },
                { content: "Minecraft est le jeu vidéo le plus vendu de tous les temps", type: "TRUE_FALSE", points: 2, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quelle est la première cryptomonnaie créée ?", type: "MCQ", points: 2, answers: [{ content: "Ethereum", isCorrect: false }, { content: "Bitcoin", isCorrect: true }, { content: "Ripple", isCorrect: false }, { content: "Litecoin", isCorrect: false }] },
                { content: "Le Bitcoin a été créé sous le pseudonyme Satoshi Nakamoto", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Dans quel jeu vidéo incarne-t-on un plombier italien ?", type: "TEXT", points: 1, answers: [{ content: "Super Mario", isCorrect: true }] },
                { content: "La blockchain est une technologie de stockage de données décentralisée", type: "TRUE_FALSE", points: 2, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
            ]
        },
        // ── Musique ────────────────────────────────────────────────────────────
        {
            title: "Les Beatles", description: "Le groupe légendaire de Liverpool", categoryId: musique.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "De quelle ville les Beatles sont-ils originaires ?", type: "MCQ", points: 1, answers: [{ content: "Londres", isCorrect: false }, { content: "Manchester", isCorrect: false }, { content: "Liverpool", isCorrect: true }, { content: "Birmingham", isCorrect: false }] },
                { content: "Combien de membres composaient les Beatles ?", type: "MCQ", points: 1, answers: [{ content: "3", isCorrect: false }, { content: "4", isCorrect: true }, { content: "5", isCorrect: false }, { content: "6", isCorrect: false }] },
                { content: "John Lennon a été assassiné en 1980", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel album des Beatles se termine par une face B vide ?", type: "MCQ", points: 3, answers: [{ content: "Abbey Road", isCorrect: false }, { content: "Sgt. Pepper's", isCorrect: false }, { content: "Let It Be", isCorrect: false }, { content: "Revolver", isCorrect: false }] },
                { content: "Qui était le batteur des Beatles ?", type: "MCQ", points: 1, answers: [{ content: "John Lennon", isCorrect: false }, { content: "Paul McCartney", isCorrect: false }, { content: "George Harrison", isCorrect: false }, { content: "Ringo Starr", isCorrect: true }] },
                { content: "Hey Jude dure plus de 7 minutes", type: "TRUE_FALSE", points: 2, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
            ]
        },
        {
            title: "Tubes des Années 80", description: "La décennie synthé et néon", categoryId: musique.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Quel artiste a sorti l'album 'Thriller' en 1982 ?", type: "MCQ", points: 1, answers: [{ content: "Prince", isCorrect: false }, { content: "Michael Jackson", isCorrect: true }, { content: "David Bowie", isCorrect: false }, { content: "Madonna", isCorrect: false }] },
                { content: "Thriller est l'album le plus vendu de tous les temps", type: "TRUE_FALSE", points: 2, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "De quel pays vient ABBA ?", type: "MCQ", points: 1, answers: [{ content: "Norvège", isCorrect: false }, { content: "Danemark", isCorrect: false }, { content: "Suède", isCorrect: true }, { content: "Finlande", isCorrect: false }] },
                { content: "Quel groupe a sorti 'Don't You (Forget About Me)' en 1985 ?", type: "MCQ", points: 2, answers: [{ content: "Duran Duran", isCorrect: false }, { content: "The Cure", isCorrect: false }, { content: "Simple Minds", isCorrect: true }, { content: "Depeche Mode", isCorrect: false }] },
                { content: "Madonna est surnommée la 'Queen of Pop'", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel instrument est emblématique de la musique des années 80 ?", type: "MCQ", points: 2, answers: [{ content: "Violon", isCorrect: false }, { content: "Synthétiseur", isCorrect: true }, { content: "Trompette", isCorrect: false }, { content: "Contrebasse", isCorrect: false }] },
            ]
        },
        {
            title: "Rap et Hip-Hop", description: "Culture urbaine et flow", categoryId: musique.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Dans quelle ville le hip-hop est-il né dans les années 1970 ?", type: "MCQ", points: 2, answers: [{ content: "Los Angeles", isCorrect: false }, { content: "Chicago", isCorrect: false }, { content: "New York", isCorrect: true }, { content: "Atlanta", isCorrect: false }] },
                { content: "Eminem est d'origine afro-américaine", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: false }, { content: "Faux", isCorrect: true }] },
                { content: "Quel rappeur français a sorti l'album 'PNL' ?", type: "MCQ", points: 2, answers: [{ content: "Booba", isCorrect: false }, { content: "Nekfeu", isCorrect: false }, { content: "PNL", isCorrect: true }, { content: "Stromae", isCorrect: false }] },
                { content: "Le rap est l'un des quatre piliers du hip-hop", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel artiste se cache derrière le surnom 'Slim Shady' ?", type: "TEXT", points: 2, answers: [{ content: "Eminem", isCorrect: true }] },
                { content: "Jay-Z a fondé le label Roc Nation", type: "TRUE_FALSE", points: 2, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
            ]
        },
        {
            title: "Chanson Française", description: "De Brel à Stromae", categoryId: musique.id, isPublic: true, randomizeQuestions: false,
            questions: [
                { content: "Quelle chanteuse française est surnommée 'La Môme' ?", type: "MCQ", points: 1, answers: [{ content: "Barbara", isCorrect: false }, { content: "Édith Piaf", isCorrect: true }, { content: "Dalida", isCorrect: false }, { content: "Juliette Gréco", isCorrect: false }] },
                { content: "Jacques Brel est français", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: false }, { content: "Faux", isCorrect: true }] },
                { content: "Stromae est de nationalité belge", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel chanteur a popularisé 'Ne me quitte pas' ?", type: "MCQ", points: 2, answers: [{ content: "Serge Gainsbourg", isCorrect: false }, { content: "Charles Aznavour", isCorrect: false }, { content: "Jacques Brel", isCorrect: true }, { content: "Georges Brassens", isCorrect: false }] },
                { content: "Quel instrument Serge Gainsbourg jouait-il principalement ?", type: "MCQ", points: 2, answers: [{ content: "Guitare", isCorrect: false }, { content: "Piano", isCorrect: true }, { content: "Saxophone", isCorrect: false }, { content: "Violon", isCorrect: false }] },
                { content: "Quel est le vrai prénom de Stromae ?", type: "TEXT", points: 3, answers: [{ content: "Paul", isCorrect: true }] },
            ]
        },
        {
            title: "Instruments de Musique", description: "Cordes, vents et percussions", categoryId: musique.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Combien de cordes possède une guitare classique ?", type: "MCQ", points: 1, answers: [{ content: "4", isCorrect: false }, { content: "5", isCorrect: false }, { content: "6", isCorrect: true }, { content: "7", isCorrect: false }] },
                { content: "Le piano est à la fois un instrument à cordes et à percussion", type: "TRUE_FALSE", points: 2, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel instrument est associé aux orchestres classiques comme instrument soliste par excellence ?", type: "MCQ", points: 2, answers: [{ content: "Flûte", isCorrect: false }, { content: "Violon", isCorrect: true }, { content: "Alto", isCorrect: false }, { content: "Hautbois", isCorrect: false }] },
                { content: "La contrebasse est plus grande que le violoncelle", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel instrument joue Yo-Yo Ma ?", type: "MCQ", points: 2, answers: [{ content: "Violon", isCorrect: false }, { content: "Alto", isCorrect: false }, { content: "Violoncelle", isCorrect: true }, { content: "Contrebasse", isCorrect: false }] },
                { content: "Quel est l'instrument à vent le plus grave de l'orchestre ?", type: "TEXT", points: 3, answers: [{ content: "Tuba", isCorrect: true }] },
            ]
        },
        // ── Pop Culture ────────────────────────────────────────────────────────
        {
            title: "Harry Potter", description: "Le monde des sorciers", categoryId: popCulture.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Quel est le nom de l'école de sorcellerie de Harry Potter ?", type: "TEXT", points: 1, answers: [{ content: "Poudlard", isCorrect: true }] },
                { content: "Dans quelle maison Harry Potter est-il placé ?", type: "MCQ", points: 1, answers: [{ content: "Serpentard", isCorrect: false }, { content: "Poufsouffle", isCorrect: false }, { content: "Gryffondor", isCorrect: true }, { content: "Serdaigle", isCorrect: false }] },
                { content: "Hermione Granger est la meilleure amie de Harry Potter", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel sort tue instantanément ?", type: "MCQ", points: 2, answers: [{ content: "Expecto Patronum", isCorrect: false }, { content: "Avada Kedavra", isCorrect: true }, { content: "Expelliarmus", isCorrect: false }, { content: "Crucio", isCorrect: false }] },
                { content: "J.K. Rowling a écrit les 7 tomes de Harry Potter", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Comment s'appelle le journal sorcier dans Harry Potter ?", type: "MCQ", points: 2, answers: [{ content: "La Gazette Magique", isCorrect: false }, { content: "La Gazette du Sorcier", isCorrect: true }, { content: "Le Courrier des Sorciers", isCorrect: false }, { content: "Le Monde Enchanté", isCorrect: false }] },
            ]
        },
        {
            title: "Marvel et Super-Héros", description: "L'univers cinématographique Marvel", categoryId: popCulture.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Quel super-héros porte un costume rouge et bleu avec une toile d'araignée ?", type: "TEXT", points: 1, answers: [{ content: "Spider-Man", isCorrect: true }] },
                { content: "Thor est le dieu de la foudre dans la mythologie nordique", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel métal compose le bouclier de Captain America ?", type: "MCQ", points: 2, answers: [{ content: "Titane", isCorrect: false }, { content: "Adamantium", isCorrect: false }, { content: "Vibranium", isCorrect: true }, { content: "Acier inoxydable", isCorrect: false }] },
                { content: "Tony Stark est le vrai nom de Batman", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: false }, { content: "Faux", isCorrect: true }] },
                { content: "Quel film a lancé le MCU (Marvel Cinematic Universe) en 2008 ?", type: "MCQ", points: 2, answers: [{ content: "Thor", isCorrect: false }, { content: "Captain America", isCorrect: false }, { content: "Iron Man", isCorrect: true }, { content: "The Avengers", isCorrect: false }] },
                { content: "Quel personnage dit la réplique 'I am Groot' ?", type: "TEXT", points: 1, answers: [{ content: "Groot", isCorrect: true }] },
            ]
        },
        {
            title: "Séries TV Incontournables", description: "Les grandes séries de la décennie", categoryId: popCulture.id, isPublic: true, randomizeQuestions: false,
            questions: [
                { content: "Dans quelle série trouve-t-on les personnages Walter White et Jesse Pinkman ?", type: "MCQ", points: 1, answers: [{ content: "Narcos", isCorrect: false }, { content: "Breaking Bad", isCorrect: true }, { content: "Ozark", isCorrect: false }, { content: "Dexter", isCorrect: false }] },
                { content: "Game of Thrones est basé sur les romans de George R.R. Martin", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Combien de saisons compte 'Friends' ?", type: "MCQ", points: 2, answers: [{ content: "8", isCorrect: false }, { content: "9", isCorrect: false }, { content: "10", isCorrect: true }, { content: "12", isCorrect: false }] },
                { content: "Stranger Things se déroule dans les années 1980", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Dans quelle série fictive 'Los Alamos' est-il au cœur de l'intrigue ?", type: "MCQ", points: 3, answers: [{ content: "The Crown", isCorrect: false }, { content: "Black Mirror", isCorrect: false }, { content: "Better Call Saul", isCorrect: false }, { content: "Breaking Bad", isCorrect: true }] },
                { content: "Qui est le créateur de la série 'The Office' (version américaine) ?", type: "MCQ", points: 3, answers: [{ content: "Seth MacFarlane", isCorrect: false }, { content: "Greg Daniels", isCorrect: true }, { content: "Ricky Gervais", isCorrect: false }, { content: "Steve Carell", isCorrect: false }] },
            ]
        },
        {
            title: "Jeux Vidéo Pop Culture", description: "Icônes du gaming", categoryId: popCulture.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Dans quelle série de jeux vidéo incarne-t-on Link ?", type: "MCQ", points: 1, answers: [{ content: "Final Fantasy", isCorrect: false }, { content: "The Legend of Zelda", isCorrect: true }, { content: "Dragon Quest", isCorrect: false }, { content: "Metroid", isCorrect: false }] },
                { content: "Fortnite est un jeu de type Battle Royale", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel personnage de jeu vidéo est associé à une casquette rouge et à des champignons ?", type: "TEXT", points: 1, answers: [{ content: "Mario", isCorrect: true }] },
                { content: "Sonic est un personnage de Nintendo", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: false }, { content: "Faux", isCorrect: true }] },
                { content: "Quel est le studio derrière la saga 'The Witcher' ?", type: "MCQ", points: 2, answers: [{ content: "Ubisoft", isCorrect: false }, { content: "CD Projekt Red", isCorrect: true }, { content: "Rockstar Games", isCorrect: false }, { content: "Bethesda", isCorrect: false }] },
                { content: "League of Legends est un jeu de type MOBA", type: "TRUE_FALSE", points: 2, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
            ]
        },
        {
            title: "Cinéma Pop Culture", description: "Blockbusters et films cultes", categoryId: popCulture.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Qui a réalisé la trilogie 'Le Seigneur des Anneaux' ?", type: "MCQ", points: 2, answers: [{ content: "Steven Spielberg", isCorrect: false }, { content: "James Cameron", isCorrect: false }, { content: "Peter Jackson", isCorrect: true }, { content: "Christopher Nolan", isCorrect: false }] },
                { content: "Avatar (2009) est le film le plus rentable de l'histoire du cinéma", type: "TRUE_FALSE", points: 2, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quelle saga met en scène Vin Diesel dans un rôle principal de course automobile ?", type: "MCQ", points: 1, answers: [{ content: "Rush", isCorrect: false }, { content: "Fast & Furious", isCorrect: true }, { content: "Speed Racer", isCorrect: false }, { content: "Driven", isCorrect: false }] },
                { content: "Quentin Tarantino est connu pour ses dialogues et sa violence stylisée", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Dans quel film la réplique 'May the Force be with you' est-elle célèbre ?", type: "TEXT", points: 1, answers: [{ content: "Star Wars", isCorrect: true }] },
                { content: "Quel acteur joue le rôle de Jack Dawson dans Titanic ?", type: "MCQ", points: 1, answers: [{ content: "Brad Pitt", isCorrect: false }, { content: "Leonardo DiCaprio", isCorrect: true }, { content: "Tom Hanks", isCorrect: false }, { content: "Matt Damon", isCorrect: false }] },
            ]
        },
    ];

    console.log(`\n🎯 Création de ${quizData.length} quiz...`);
    let createdCount = 0;
    for (const quiz of quizData) {
        try {
            await prisma.quiz.create({
                data: {
                    title: quiz.title,
                    description: quiz.description,
                    categoryId: quiz.categoryId,
                    isPublic: quiz.isPublic,
                    randomizeQuestions: quiz.randomizeQuestions,
                    creatorId: randomUser.id,
                    questions: {
                        create: quiz.questions.map((q) => ({
                            content: q.content,
                            type: q.type as QuestionType,
                            points: q.points,
                            answers: { create: q.answers.map((a) => ({ content: a.content, isCorrect: a.isCorrect })) },
                        })),
                    },
                },
            });
            createdCount++;
            console.log(`  ✅ ${createdCount}/${quizData.length} - ${quiz.title}`);
        } catch (error) {
            console.error(`  ❌ Erreur lors de la création du quiz "${quiz.title}":`, error);
        }
    }

    // ─── 5. Attempts Quiz ─────────────────────────────────────────────────────
    console.log('\n🎮 Création des attempts Quiz...');

    const allQuizzes = await prisma.quiz.findMany({
        select: { id: true, questions: { select: { points: true } } }
    });

    const getMaxScore = (quiz: typeof allQuizzes[0]) => quiz.questions.reduce((sum, q) => sum + q.points, 0);
    const getRandScore = (max: number) => Math.floor(Math.random() * (max + 1));
    const getDaysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    function shufflePlayers<T>(arr: T[]): T[] {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    const shuffle = (arr: typeof allQuizzes) => arr.sort(() => Math.random() - 0.5);
    const farosQuizzes = shuffle([...allQuizzes]).slice(0, 20);
    const anonUser1Quizzes = shuffle([...allQuizzes]).slice(0, 20);
    const anonUser2Quizzes = shuffle([...allQuizzes]).slice(0, 20);
    const anonUser3Quizzes = shuffle([...allQuizzes]).slice(0, 20);
    const anonUser4Quizzes = shuffle([...allQuizzes]).slice(0, 20);
    const anonUser5Quizzes = shuffle([...allQuizzes]).slice(0, 20);

    for (let i = 0; i < farosQuizzes.length; i++) {
        const quiz = farosQuizzes[i];
        await prisma.attempt.create({
            data: { userId: farosUser.id, quizId: quiz.id, score: getRandScore(getMaxScore(quiz)), gameType: 'QUIZ', gameId: crypto.randomUUID(), createdAt: getDaysAgo(Math.floor(Math.random() * 30)) },
        });
    }
    for (let i = 0; i < anonUser1Quizzes.length; i++) {
        const quiz = anonUser1Quizzes[i];
        await prisma.attempt.create({
            data: { userId: anonUser1.id, quizId: quiz.id, score: getRandScore(getMaxScore(quiz)), gameType: 'QUIZ', gameId: crypto.randomUUID(), createdAt: getDaysAgo(Math.floor(Math.random() * 30)) },
        });
    }

    for (let i = 0; i < anonUser2Quizzes.length; i++) {
        const quiz = anonUser2Quizzes[i];
        await prisma.attempt.create({
            data: { userId: anonUser2.id, quizId: quiz.id, score: getRandScore(getMaxScore(quiz)), gameType: 'QUIZ', gameId: crypto.randomUUID(), createdAt: getDaysAgo(Math.floor(Math.random() * 30)) },
        });
    }
    for (let i = 0; i < anonUser3Quizzes.length; i++) {
        const quiz = anonUser3Quizzes[i];
        await prisma.attempt.create({
            data: { userId: anonUser3.id, quizId: quiz.id, score: getRandScore(getMaxScore(quiz)), gameType: 'QUIZ', gameId: crypto.randomUUID(), createdAt: getDaysAgo(Math.floor(Math.random() * 30)) },
        });
    }
    for (let i = 0; i < anonUser4Quizzes.length; i++) {
        const quiz = anonUser4Quizzes[i];
        await prisma.attempt.create({
            data: { userId: anonUser3.id, quizId: quiz.id, score: getRandScore(getMaxScore(quiz)), gameType: 'QUIZ', gameId: crypto.randomUUID(), createdAt: getDaysAgo(Math.floor(Math.random() * 30)) },
        });
    }
    for (let i = 0; i < anonUser4Quizzes.length; i++) {
        const quiz = anonUser4Quizzes[i];
        await prisma.attempt.create({
            data: { userId: anonUser3.id, quizId: quiz.id, score: getRandScore(getMaxScore(quiz)), gameType: 'QUIZ', gameId: crypto.randomUUID(), createdAt: getDaysAgo(Math.floor(Math.random() * 30)) },
        });
    }

    console.log('✅ 20 attempts Quiz créés pour Faros, User1, User2, User3, User4 et User5');

    // ─── 6. Parties UNO ───────────────────────────────────────────────────────
    console.log('\n🎴 Création des parties UNO...');

    const unoPlayers = [farosUser, anonUser, anonUser1, anonUser2, anonUser3, anonUser4, anonUser5, anonUser6, anonUser7, anonUser8];
    const totalUnoGames = 80;
    const unoGameDates: Date[] = [];

    for (let g = 0; g < totalUnoGames; g++) {
        const baseDaysAgo = Math.floor((g / totalUnoGames) * 120);
        const jitterHours = Math.floor(Math.random() * 48);
        unoGameDates.push(new Date(Date.now() - baseDaysAgo * 24 * 60 * 60 * 1000 - jitterHours * 60 * 60 * 1000));
    }
    unoGameDates.sort((a, b) => a.getTime() - b.getTime());

    for (let g = 0; g < totalUnoGames; g++) {
        const gameId = crypto.randomUUID();
        const playerCount = Math.floor(Math.random() * (unoPlayers.length - 1)) + 2;
        const participants = shufflePlayers(unoPlayers).slice(0, playerCount);
        const rankedParticipants = shufflePlayers(participants);
        const gameDate = unoGameDates[g];

        for (let p = 0; p < rankedParticipants.length; p++) {
            await prisma.attempt.create({
                data: {
                    userId: rankedParticipants[p].id,
                    score: computeUnoScore(p + 1),
                    gameType: 'UNO',
                    placement: p + 1,
                    gameId,
                    quizId: null,
                    trapScore: 0,
                    createdAt: new Date(gameDate.getTime() + p * 1000),
                },
            });
        }
        console.log(`  ✅ Partie UNO ${g + 1}/${totalUnoGames} — ${playerCount} joueurs`);
    }
    console.log(`✅ ${totalUnoGames} parties UNO créées`);

    // ─── 7. Parties SKYJOW ────────────────────────────────────────────────────
    console.log('\n🂠 Création des parties Skyjow...');

    const skyjowPlayers = [farosUser, anonUser, anonUser1, anonUser2, anonUser3, anonUser4, anonUser5, anonUser6, anonUser7, anonUser8];
    const totalSkyjowGames = 60;
    const skyjowGameDates: Date[] = [];

    for (let g = 0; g < totalSkyjowGames; g++) {
        const baseDaysAgo = Math.floor((g / totalSkyjowGames) * 90);
        const jitterHours = Math.floor(Math.random() * 24);
        skyjowGameDates.push(new Date(Date.now() - baseDaysAgo * 24 * 60 * 60 * 1000 - jitterHours * 60 * 60 * 1000));
    }
    skyjowGameDates.sort((a, b) => a.getTime() - b.getTime());

    for (let g = 0; g < totalSkyjowGames; g++) {
        const gameId = crypto.randomUUID();
        const playerCount = Math.floor(Math.random() * (skyjowPlayers.length - 1)) + 2;
        const participants = shufflePlayers(skyjowPlayers).slice(0, playerCount);
        const gameDate = skyjowGameDates[g];

        const scores: number[] = participants.map((_, i) => {
            if (i === 0) return Math.floor(Math.random() * 20) + 5;
            return Math.floor(Math.random() * 45) + 15;
        });
        const minScore = Math.min(...scores);
        const triggerIndex = participants.length - 1;
        if (scores[triggerIndex] !== minScore) {
            scores[triggerIndex] = Math.min(scores[triggerIndex] * 2, 120);
        }

        for (let p = 0; p < participants.length; p++) {
            await prisma.attempt.create({
                data: {
                    userId: participants[p].id,
                    score: scores[p],
                    gameType: 'SKYJOW',
                    placement: p + 1,
                    gameId,
                    quizId: null,
                    trapScore: 0,
                    createdAt: new Date(gameDate.getTime() + p * 1000),
                },
            });
        }
        console.log(`  ✅ Partie Skyjow ${g + 1}/${totalSkyjowGames} — ${playerCount} joueurs`);
    }
    console.log(`✅ ${totalSkyjowGames} parties Skyjow créées`);

    // ─── 8. Parties TABOO ────────────────────────────────────────────────────
    console.log('\n🗣️ Création des parties Taboo...');

    const tabooPlayers = [farosUser, anonUser, anonUser1, anonUser2, anonUser3, anonUser4, anonUser5, anonUser6, anonUser7, anonUser8, anonUser9, anonUser10];
    const totalTabooGames = 40;
    const tabooGameDates: Date[] = [];

    for (let g = 0; g < totalTabooGames; g++) {
        const baseDaysAgo = Math.floor((g / totalTabooGames) * 90);
        const jitterHours = Math.floor(Math.random() * 24);
        tabooGameDates.push(new Date(Date.now() - baseDaysAgo * 24 * 60 * 60 * 1000 - jitterHours * 60 * 60 * 1000));
    }
    tabooGameDates.sort((a, b) => a.getTime() - b.getTime());

    for (let g = 0; g < totalTabooGames; g++) {
        const gameId = crypto.randomUUID();
        const gameDate = tabooGameDates[g];

        const playerCount = Math.floor(Math.random() * (tabooPlayers.length - 3)) + 4; // 4 à 7 joueurs
        const participants = shufflePlayers(tabooPlayers).slice(0, Math.min(playerCount, tabooPlayers.length));
        const teamA = participants.slice(0, Math.ceil(participants.length / 2));
        const teamB = participants.slice(Math.ceil(participants.length / 2));

        const totalRounds = Math.floor(Math.random() * 5) + 2;
        let scoreA = 0, scoreB = 0, trapA = 0, trapB = 0;

        for (let r = 0; r < totalRounds; r++) {
            // Manche équipe A
            const outcomeA = Math.random();
            if (outcomeA < 0.45) { scoreA += 1; }
            else if (outcomeA < 0.75) { scoreB += 1; trapB += 1; }

            // Manche équipe B
            const outcomeB = Math.random();
            if (outcomeB < 0.45) { scoreB += 1; }
            else if (outcomeB < 0.75) { scoreA += 1; trapA += 1; }
        }

        // Placement final — un seul attempt par joueur à la fin de la partie
        const winnerTeam = scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : null;

        for (let p = 0; p < participants.length; p++) {
            const player = participants[p];
            const isTeamA = teamA.includes(player);
            const myScore = isTeamA ? scoreA : scoreB;
            const myTrapScore = isTeamA ? trapA : trapB;
            const myTeamKey = isTeamA ? 'A' : 'B';
            const placement = winnerTeam === null ? null : myTeamKey === winnerTeam ? 1 : 2;

            await prisma.attempt.create({
                data: {
                    userId: player.id,
                    score: myScore,
                    trapScore: myTrapScore,
                    rounds: totalRounds,
                    gameType: 'TABOO',
                    placement,
                    gameId,
                    quizId: null,
                    createdAt: new Date(gameDate.getTime() + p * 1000),
                },
            });
        }

        console.log(`  ✅ Partie Taboo ${g + 1}/${totalTabooGames} — A: ${scoreA}pts (trap:${trapA}) · B: ${scoreB}pts (trap:${trapB}) — gagnant: ${winnerTeam ?? 'nul'} — ${totalRounds} manches`);
    }
    console.log(`✅ ${totalTabooGames} parties Taboo créées`);


    // ─── 9. Parties YAHTZEE ───────────────────────────────────────────────────
    console.log('\n🎲 Création des parties Yahtzee...');

    const yahtzeePlayers = [farosUser, anonUser, anonUser1, anonUser2, anonUser3, anonUser4, anonUser5, anonUser6, anonUser7, anonUser8];
    const totalYahtzeeGames = 50;
    const yahtzeeGameDates: Date[] = [];

    for (let g = 0; g < totalYahtzeeGames; g++) {
        const baseDaysAgo = Math.floor((g / totalYahtzeeGames) * 100);
        const jitterHours = Math.floor(Math.random() * 36);
        yahtzeeGameDates.push(new Date(Date.now() - baseDaysAgo * 24 * 60 * 60 * 1000 - jitterHours * 60 * 60 * 1000));
    }
    yahtzeeGameDates.sort((a, b) => a.getTime() - b.getTime());

    for (let g = 0; g < totalYahtzeeGames; g++) {
        const gameId = crypto.randomUUID();
        const playerCount = Math.floor(Math.random() * (yahtzeePlayers.length - 1)) + 2;
        const participants = shufflePlayers(yahtzeePlayers).slice(0, playerCount);
        const gameDate = yahtzeeGameDates[g];

        // Score Yahtzee réaliste : entre 100 et 375 pts
        const scores = participants.map(() => Math.floor(Math.random() * 275) + 100);

        // Classement basé sur le score (plus haut = meilleur)
        const ranked = [...participants]
            .map((player, i) => ({ player, score: scores[i] }))
            .sort((a, b) => b.score - a.score);

        for (let p = 0; p < ranked.length; p++) {
            await prisma.attempt.create({
                data: {
                    userId: ranked[p].player.id,
                    score: ranked[p].score,
                    gameType: 'YAHTZEE',
                    placement: p + 1,
                    gameId,
                    quizId: null,
                    trapScore: 0,
                    createdAt: new Date(gameDate.getTime() + p * 1000),
                },
            });
        }
        console.log(`  ✅ Partie Yahtzee ${g + 1}/${totalYahtzeeGames} — ${playerCount} joueurs — scores: ${ranked.map(r => r.score).join(', ')}`);
    }
    console.log(`✅ ${totalYahtzeeGames} parties Yahtzee créées`);

    // ─── 10. Parties PUISSANCE4 ───────────────────────────────────────────────
    console.log('\n🔴 Création des parties Puissance 4...');

    const p4Players = [farosUser, anonUser, anonUser1, anonUser2, anonUser3, anonUser4, anonUser5, anonUser6, anonUser7, anonUser8];
    const totalP4Games = 30;

    for (let g = 0; g < totalP4Games; g++) {
        const gameId = crypto.randomUUID();
        const baseDaysAgo = Math.floor((g / totalP4Games) * 60);
        const jitterHours = Math.floor(Math.random() * 24);
        const gameDate = new Date(Date.now() - baseDaysAgo * 24 * 60 * 60 * 1000 - jitterHours * 60 * 60 * 1000);

        const shuffled = shufflePlayers(p4Players);
        const player1 = shuffled[0];
        const player2 = shuffled[1];

        const isDraw = Math.random() < 0.15; // 15% de nuls
        const winnerIndex = Math.random() < 0.5 ? 0 : 1;
        const players = [player1, player2];

        for (let p = 0; p < 2; p++) {
            const isWinner = !isDraw && p === winnerIndex;
            await prisma.attempt.create({
                data: {
                    userId: players[p].id,
                    score: isWinner ? 10 : 0,
                    gameType: 'PUISSANCE4',
                    placement: isDraw ? null : (isWinner ? 1 : 2),
                    gameId,
                    quizId: null,
                    trapScore: 0,
                    createdAt: new Date(gameDate.getTime() + p * 1000),
                },
            });
        }
        console.log(`  ✅ Partie P4 ${g + 1}/${totalP4Games} — ${player1.username} vs ${player2.username} — ${isDraw ? 'Nul' : `${players[winnerIndex].username} gagne`}`);
    }
    console.log(`✅ ${totalP4Games} parties Puissance 4 créées`);

    // ─── 11. Parties JUST ONE ─────────────────────────────────────────────────
    console.log('\n🔤 Création des parties Just One...');

    const justOnePlayers = [farosUser, anonUser, anonUser1, anonUser2, anonUser3, anonUser4, anonUser5, anonUser6, anonUser7, anonUser8];
    const totalJustOneGames = 35;

    for (let g = 0; g < totalJustOneGames; g++) {
        const gameId = crypto.randomUUID();
        const baseDaysAgo = Math.floor((g / totalJustOneGames) * 60);
        const jitterHours = Math.floor(Math.random() * 24);
        const gameDate = new Date(Date.now() - baseDaysAgo * 24 * 60 * 60 * 1000 - jitterHours * 60 * 60 * 1000);

        const playerCount = Math.floor(Math.random() * 5) + 3; // 3 à 7 joueurs
        const participants = shufflePlayers(justOnePlayers).slice(0, Math.min(playerCount, justOnePlayers.length));

        // Score coopératif : mots devinés sur 13
        const score = Math.floor(Math.random() * 10) + 3; // 3 à 12

        for (let p = 0; p < participants.length; p++) {
            await prisma.attempt.create({
                data: {
                    userId: participants[p].id,
                    score,
                    gameType: 'JUST_ONE',
                    placement: null,
                    gameId,
                    quizId: null,
                    trapScore: 0,
                    createdAt: new Date(gameDate.getTime() + p * 1000),
                },
            });
        }
        console.log(`  ✅ Partie Just One ${g + 1}/${totalJustOneGames} — ${participants.length} joueurs — score: ${score}/13`);
    }
    console.log(`✅ ${totalJustOneGames} parties Just One créées`);

    // ─── 12. Parties BATTLESHIP ───────────────────────────────────────────────
    console.log('\n🚢 Création des parties Bataille Navale...');

    const battleshipPlayers = [farosUser, anonUser, anonUser1, anonUser2, anonUser3, anonUser4, anonUser5, anonUser6, anonUser7, anonUser8, anonUser9, anonUser10];
    const totalBattleshipGames = 30;

    for (let g = 0; g < totalBattleshipGames; g++) {
        const gameId = crypto.randomUUID();
        const baseDaysAgo = Math.floor((g / totalBattleshipGames) * 60);
        const jitterHours = Math.floor(Math.random() * 24);
        const gameDate = new Date(Date.now() - baseDaysAgo * 24 * 60 * 60 * 1000 - jitterHours * 60 * 60 * 1000);

        const shuffled = shufflePlayers(battleshipPlayers);
        const player1 = shuffled[0];
        const player2 = shuffled[1];
        const winnerIndex = Math.random() < 0.5 ? 0 : 1;
        const players = [player1, player2];

        for (let p = 0; p < 2; p++) {
            const isWinner = p === winnerIndex;
            await prisma.attempt.create({
                data: {
                    userId: players[p].id,
                    score: isWinner ? 10 : 0,
                    gameType: 'BATTLESHIP',
                    placement: isWinner ? 1 : 2,
                    gameId,
                    quizId: null,
                    trapScore: 0,
                    createdAt: new Date(gameDate.getTime() + p * 1000),
                },
            });
        }
        console.log(`  ✅ Partie Battleship ${g + 1}/${totalBattleshipGames} — ${player1.username} vs ${player2.username} — gagnant: ${players[winnerIndex].username}`);
    }
    console.log(`✅ ${totalBattleshipGames} parties Bataille Navale créées`);

    // ─── 13. Parties DIAMANT ──────────────────────────────────────────────────
    console.log('\n💎 Création des parties Diamant...');

    const diamantPlayers = [farosUser, anonUser, anonUser1, anonUser2, anonUser3, anonUser4, anonUser5, anonUser6, anonUser7, anonUser8, anonUser9, anonUser10];
    const totalDiamantGames = 40;

    for (let g = 0; g < totalDiamantGames; g++) {
        const gameId = crypto.randomUUID();
        const baseDaysAgo = Math.floor((g / totalDiamantGames) * 70);
        const jitterHours = Math.floor(Math.random() * 24);
        const gameDate = new Date(Date.now() - baseDaysAgo * 24 * 60 * 60 * 1000 - jitterHours * 60 * 60 * 1000);

        const playerCount = Math.floor(Math.random() * 5) + 2; // 2 à 6 joueurs
        const participants = shufflePlayers(diamantPlayers).slice(0, Math.min(playerCount, diamantPlayers.length));

        // Score Diamant : rubis sécurisés, entre 0 et 50, + reliques (5 pts chacune)
        const scores = participants.map(() => {
            const rubies = Math.floor(Math.random() * 45);
            const diamonds = Math.random() < 0.3 ? Math.floor(Math.random() * 3) + 1 : 0;
            return rubies + diamonds * 5;
        });

        // Classement basé sur le score (plus haut = meilleur)
        const ranked = [...participants]
            .map((player, i) => ({ player, score: scores[i] }))
            .sort((a, b) => b.score - a.score);

        for (let p = 0; p < ranked.length; p++) {
            await prisma.attempt.create({
                data: {
                    userId: ranked[p].player.id,
                    score: ranked[p].score,
                    gameType: 'DIAMANT',
                    placement: p + 1,
                    gameId,
                    quizId: null,
                    trapScore: 0,
                    createdAt: new Date(gameDate.getTime() + p * 1000),
                },
            });
        }
        console.log(`  ✅ Partie Diamant ${g + 1}/${totalDiamantGames} — ${playerCount} joueurs — scores: ${ranked.map(r => r.score).join(', ')}`);
    }
    console.log(`✅ ${totalDiamantGames} parties Diamant créées`);

    console.log(`\n✨ Seed terminé ! ${createdCount} quiz créés avec succès.`);
}

main()
    .catch((e) => {
        console.error('❌ Erreur lors du seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
