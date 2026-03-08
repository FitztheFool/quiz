// prisma/seed.ts
import dotenv from 'dotenv';
dotenv.config();

import crypto from 'node:crypto';

import { PrismaClient, QuestionType } from '@prisma/client';

import bcrypt from 'bcrypt';

// remplace temporairement l'import par une fonction locale
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
  await prisma.answer.deleteMany();
  await prisma.question.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // ─── 2. Catégories ────────────────────────────────────────────────────────
  const cultureGenerale = await prisma.category.create({ data: { name: 'Culture Générale', slug: 'culture-generale' } });
  const sciences = await prisma.category.create({ data: { name: 'Sciences', slug: 'sciences' } });
  const sports = await prisma.category.create({ data: { name: 'Sports', slug: 'sports' } });
  const artsCulture = await prisma.category.create({ data: { name: 'Arts & Culture', slug: 'arts-culture' } });
  const technologie = await prisma.category.create({ data: { name: 'Technologie', slug: 'technologie' } });

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
  const anonUser1 = await prisma.user.upsert({
    where: { email: 'user1@quiz.app' },
    update: {},
    create: { email: 'user1@quiz.app', username: 'User1', role: 'USER', passwordHash: defaultPasswordHash },
  });
  const anonUser2 = await prisma.user.upsert({
    where: { email: 'user2@quiz.app' },
    update: {},
    create: { email: 'user2@quiz.app', username: 'User2', role: 'USER', passwordHash: defaultPasswordHash },
  });
  const anonUser3 = await prisma.user.upsert({
    where: { email: 'user3@quiz.app' },
    update: {},
    create: { email: 'user3@quiz.app', username: 'User3', role: 'USER', passwordHash: defaultPasswordHash },
  });
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
  console.log(`✅ Utilisateur créé: ${farosUser.username}`);

  // ─── 3. MOTS ────────────────────────────────────────────────────────
  const words = [
    // Animaux
    'ÉLÉPHANT', 'GIRAFE', 'CROCODILE', 'PINGOUIN', 'DAUPHIN', 'PANTHÈRE', 'FLAMANT', 'KANGOUROU',
    'CAMÉLÉON', 'HIPPOPOTAME', 'AUTRUCHE', 'PERROQUET', 'SCORPION', 'PIEUVRE', 'BALEINE',
    // Objets
    'PARAPLUIE', 'TÉLESCOPE', 'MICROSCOPE', 'ACCORDÉON', 'TRAMPOLINE', 'ESCALATOR', 'BOUILLOIRE',
    'LAMPADAIRE', 'FRIGO', 'ASPIRATEUR', 'CALCULATRICE', 'CHRONOMÈTRE', 'THERMOMÈTRE',
    // Lieux
    'BIBLIOTHÈQUE', 'AQUARIUM', 'VOLCAN', 'DÉSERT', 'GLACIER', 'PHARE', 'CATHÉDRALE', 'CASINO',
    'STADE', 'CIRQUE', 'CIMETIÈRE', 'LABORATOIRE', 'OBSERVATOIRE', 'MANÈGE',
    // Concepts
    'GRAVITÉ', 'DÉMOCRATIE', 'RENAISSANCE', 'RÉVOLUTION', 'PHOTOSYNTHÈSE', 'HIBERNATION',
    'MIGRATION', 'ÉVOLUTION', 'INFLATION', 'PANDÉMIE', 'PROPHÉTIE', 'PARADOXE',
    // Métiers
    'ARCHÉOLOGUE', 'ASTRONAUTE', 'POMPIER', 'VÉTÉRINAIRE', 'SOMMELIER', 'CARTOGRAPHE',
    'CHORÉGRAPHE', 'MARIONNETTISTE', 'APICULTEUR', 'PLONGEUR', 'GLACIOLOGUE',
    // Sport / Loisirs
    'SKATEBOARD', 'PARACHUTE', 'PLANCHE À VOILE', 'TRAMPOLINE', 'BOOMERANG', 'CALLIGRAPHIE',
    'ORIGAMI', 'ESCALADE', 'ESCRIME', 'BOXE', 'NATATION', 'MARATHON',
    // Nourriture
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

  console.log(`✅ ${words.length} mots de 7 catégories ajoutés.`);

  // ─── 4. Quiz — ordre alterné (CG → SC → SP → AC → TE → CG → SC → ...) ───
  const quizData = [

    // ── Round 1 ──
    {
      title: "Culture Générale - Niveau Débutant",
      description: "Testez vos connaissances de base !",
      categoryId: cultureGenerale.id,
      isPublic: true, randomizeQuestions: false,
      questions: [
        {
          content: "Quelle est la capitale de la France ?", type: "MCQ", points: 1,
          answers: [{ content: "Paris", isCorrect: true }, { content: "Lyon", isCorrect: false }, { content: "Marseille", isCorrect: false }, { content: "Bordeaux", isCorrect: false }]
        },
        {
          content: "Combien y a-t-il de continents sur Terre ?", type: "MCQ", points: 1,
          answers: [{ content: "5", isCorrect: false }, { content: "6", isCorrect: false }, { content: "7", isCorrect: true }, { content: "8", isCorrect: false }]
        },
        {
          content: "La Tour Eiffel a été construite en 1889", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Quelle est la langue la plus parlée dans le monde ?", type: "MCQ", points: 2,
          answers: [{ content: "Anglais", isCorrect: false }, { content: "Mandarin", isCorrect: true }, { content: "Espagnol", isCorrect: false }, { content: "Hindi", isCorrect: false }]
        },
        {
          content: "Quel pays est le plus grand du monde en superficie ?", type: "MCQ", points: 2,
          answers: [{ content: "Canada", isCorrect: false }, { content: "Chine", isCorrect: false }, { content: "Russie", isCorrect: true }, { content: "États-Unis", isCorrect: false }]
        },
        {
          content: "Le Nil est le fleuve le plus long du monde", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
      ]
    },
    {
      title: "Le Système Solaire",
      description: "Découvrez notre système planétaire",
      categoryId: sciences.id,
      isPublic: true, randomizeQuestions: true,
      questions: [
        {
          content: "Combien de planètes y a-t-il dans le système solaire ?", type: "MCQ", points: 1,
          answers: [{ content: "7", isCorrect: false }, { content: "8", isCorrect: true }, { content: "9", isCorrect: false }, { content: "10", isCorrect: false }]
        },
        {
          content: "Jupiter est la plus grande planète du système solaire", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Quelle planète est surnommée la planète rouge ?", type: "TEXT", points: 2,
          answers: [{ content: "Mars", isCorrect: true }]
        },
        {
          content: "Quelle est la planète la plus proche du Soleil ?", type: "MCQ", points: 2,
          answers: [{ content: "Vénus", isCorrect: false }, { content: "Mercure", isCorrect: true }, { content: "Mars", isCorrect: false }, { content: "Terre", isCorrect: false }]
        },
        {
          content: "Saturne est connue pour ses anneaux", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Combien de temps met la lumière du Soleil pour atteindre la Terre ?", type: "MCQ", points: 3,
          answers: [{ content: "8 secondes", isCorrect: false }, { content: "8 minutes", isCorrect: true }, { content: "8 heures", isCorrect: false }, { content: "8 jours", isCorrect: false }]
        },
      ]
    },
    {
      title: "Football - Les Bases",
      description: "Le sport le plus populaire au monde",
      categoryId: sports.id,
      isPublic: true, randomizeQuestions: true,
      questions: [
        {
          content: "Combien de joueurs composent une équipe de football sur le terrain ?", type: "MCQ", points: 1,
          answers: [{ content: "9", isCorrect: false }, { content: "10", isCorrect: false }, { content: "11", isCorrect: true }, { content: "12", isCorrect: false }]
        },
        {
          content: "Un match de football dure 90 minutes", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Quel pays a remporté la Coupe du Monde 2018 ?", type: "TEXT", points: 2,
          answers: [{ content: "France", isCorrect: true }]
        },
        {
          content: "Combien de fois le Brésil a-t-il remporté la Coupe du Monde ?", type: "MCQ", points: 2,
          answers: [{ content: "3", isCorrect: false }, { content: "4", isCorrect: false }, { content: "5", isCorrect: true }, { content: "6", isCorrect: false }]
        },
        {
          content: "Le hors-jeu est une règle du football", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
      ]
    },
    {
      title: "Peinture et Sculpture",
      description: "Les grands artistes",
      categoryId: artsCulture.id,
      isPublic: true, randomizeQuestions: true,
      questions: [
        {
          content: "Qui a peint La Joconde ?", type: "MCQ", points: 1,
          answers: [{ content: "Michel-Ange", isCorrect: false }, { content: "Léonard de Vinci", isCorrect: true }, { content: "Raphaël", isCorrect: false }, { content: "Botticelli", isCorrect: false }]
        },
        {
          content: "Vincent van Gogh s'est coupé l'oreille", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Qui a peint Guernica ?", type: "TEXT", points: 2,
          answers: [{ content: "Picasso", isCorrect: true }]
        },
        {
          content: "Qui a sculpté Le Penseur ?", type: "MCQ", points: 2,
          answers: [{ content: "Michel-Ange", isCorrect: false }, { content: "Auguste Rodin", isCorrect: true }, { content: "Camille Claudel", isCorrect: false }, { content: "Donatello", isCorrect: false }]
        },
        {
          content: "La statue de David a été sculptée par Michel-Ange", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Dans quel musée parisien est exposée La Joconde ?", type: "TEXT", points: 1,
          answers: [{ content: "Le Louvre", isCorrect: true }]
        },
      ]
    },
    {
      title: "Histoire de l'Informatique",
      description: "Les pionniers du numérique",
      categoryId: technologie.id,
      isPublic: true, randomizeQuestions: true,
      questions: [
        {
          content: "Qui est considéré comme le père de l'informatique ?", type: "MCQ", points: 2,
          answers: [{ content: "Steve Jobs", isCorrect: false }, { content: "Alan Turing", isCorrect: true }, { content: "Bill Gates", isCorrect: false }, { content: "Tim Berners-Lee", isCorrect: false }]
        },
        {
          content: "Le premier ordinateur électronique s'appelait ENIAC", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Qui a inventé le World Wide Web ?", type: "MCQ", points: 2,
          answers: [{ content: "Steve Jobs", isCorrect: false }, { content: "Tim Berners-Lee", isCorrect: true }, { content: "Bill Gates", isCorrect: false }, { content: "Mark Zuckerberg", isCorrect: false }]
        },
        {
          content: "Apple a été fondé par Steve Jobs et Steve Wozniak", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "En quelle année a été créé le premier iPhone ?", type: "MCQ", points: 2,
          answers: [{ content: "2005", isCorrect: false }, { content: "2007", isCorrect: true }, { content: "2009", isCorrect: false }, { content: "2010", isCorrect: false }]
        },
        {
          content: "HTTP signifie HyperText Transfer Protocol", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
      ]
    },

    // ── Round 2 ──
    {
      title: "Géographie Mondiale",
      description: "Connaissez-vous bien notre planète ?",
      categoryId: cultureGenerale.id,
      isPublic: true, randomizeQuestions: true,
      questions: [
        {
          content: "Quel est le plus grand océan du monde ?", type: "MCQ", points: 2,
          answers: [{ content: "Océan Atlantique", isCorrect: false }, { content: "Océan Pacifique", isCorrect: true }, { content: "Océan Indien", isCorrect: false }, { content: "Océan Arctique", isCorrect: false }]
        },
        {
          content: "Quelle est la capitale du Japon ?", type: "TEXT", points: 1,
          answers: [{ content: "Tokyo", isCorrect: true }]
        },
        {
          content: "Le Mont Everest est la plus haute montagne du monde", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Dans quel pays se trouve le Sahara ?", type: "MCQ", points: 2,
          answers: [{ content: "Égypte", isCorrect: false }, { content: "Maroc", isCorrect: false }, { content: "Il s'étend sur plusieurs pays", isCorrect: true }, { content: "Algérie", isCorrect: false }]
        },
        {
          content: "Quelle est la capitale du Brésil ?", type: "TEXT", points: 2,
          answers: [{ content: "Brasilia", isCorrect: true }]
        },
      ]
    },
    {
      title: "Chimie et Physique",
      description: "Les lois de la nature",
      categoryId: sciences.id,
      isPublic: true, randomizeQuestions: false,
      questions: [
        {
          content: "Quelle est la vitesse de la lumière dans le vide ?", type: "MCQ", points: 3,
          answers: [{ content: "300 000 km/s", isCorrect: true }, { content: "150 000 km/s", isCorrect: false }, { content: "500 000 km/s", isCorrect: false }, { content: "1 000 000 km/s", isCorrect: false }]
        },
        {
          content: "L'eau est composée de deux atomes d'hydrogène et un atome d'oxygène", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Quel est le symbole chimique de l'or ?", type: "MCQ", points: 2,
          answers: [{ content: "Or", isCorrect: false }, { content: "Au", isCorrect: true }, { content: "Ag", isCorrect: false }, { content: "Go", isCorrect: false }]
        },
        {
          content: "La gravité sur la Lune est plus faible que sur Terre", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Quel est le symbole chimique du fer ?", type: "TEXT", points: 2,
          answers: [{ content: "Fe", isCorrect: true }]
        },
      ]
    },
    {
      title: "Jeux Olympiques",
      description: "L'histoire des JO",
      categoryId: sports.id,
      isPublic: true, randomizeQuestions: false,
      questions: [
        {
          content: "En quelle année ont eu lieu les premiers Jeux Olympiques modernes ?", type: "MCQ", points: 2,
          answers: [{ content: "1896", isCorrect: true }, { content: "1900", isCorrect: false }, { content: "1904", isCorrect: false }, { content: "1920", isCorrect: false }]
        },
        {
          content: "Les Jeux Olympiques ont lieu tous les 4 ans", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Dans quelle ville ont eu lieu les JO d'été de 2024 ?", type: "TEXT", points: 2,
          answers: [{ content: "Paris", isCorrect: true }]
        },
        {
          content: "Combien d'anneaux compte le symbole olympique ?", type: "MCQ", points: 1,
          answers: [{ content: "4", isCorrect: false }, { content: "5", isCorrect: true }, { content: "6", isCorrect: false }, { content: "7", isCorrect: false }]
        },
        {
          content: "Usain Bolt détient le record du monde du 100m", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Quelle est la distance d'un marathon ?", type: "MCQ", points: 2,
          answers: [{ content: "40,195 km", isCorrect: false }, { content: "42,195 km", isCorrect: true }, { content: "44,195 km", isCorrect: false }, { content: "45 km", isCorrect: false }]
        },
      ]
    },
    {
      title: "Musique à travers les Âges",
      description: "Du classique au rock",
      categoryId: artsCulture.id,
      isPublic: true, randomizeQuestions: false,
      questions: [
        {
          content: "Qui a composé La 5e Symphonie ?", type: "MCQ", points: 2,
          answers: [{ content: "Mozart", isCorrect: false }, { content: "Beethoven", isCorrect: true }, { content: "Bach", isCorrect: false }, { content: "Vivaldi", isCorrect: false }]
        },
        {
          content: "Mozart est né en Autriche", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Quel groupe est connu pour 'Bohemian Rhapsody' ?", type: "MCQ", points: 1,
          answers: [{ content: "The Beatles", isCorrect: false }, { content: "Queen", isCorrect: true }, { content: "Led Zeppelin", isCorrect: false }, { content: "Pink Floyd", isCorrect: false }]
        },
        {
          content: "Elvis Presley était surnommé 'The King'", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Dans quel pays est né le jazz ?", type: "MCQ", points: 2,
          answers: [{ content: "Cuba", isCorrect: false }, { content: "États-Unis", isCorrect: true }, { content: "France", isCorrect: false }, { content: "Brésil", isCorrect: false }]
        },
      ]
    },
    {
      title: "Internet et Réseaux Sociaux",
      description: "Le monde connecté",
      categoryId: technologie.id,
      isPublic: true, randomizeQuestions: false,
      questions: [
        {
          content: "En quelle année Facebook a-t-il été créé ?", type: "MCQ", points: 2,
          answers: [{ content: "2002", isCorrect: false }, { content: "2004", isCorrect: true }, { content: "2006", isCorrect: false }, { content: "2008", isCorrect: false }]
        },
        {
          content: "Instagram appartient à Meta (Facebook)", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Quel réseau social est basé sur des vidéos courtes ?", type: "MCQ", points: 1,
          answers: [{ content: "LinkedIn", isCorrect: false }, { content: "TikTok", isCorrect: true }, { content: "Pinterest", isCorrect: false }, { content: "Snapchat", isCorrect: false }]
        },
        {
          content: "Amazon a été fondé par Jeff Bezos", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Que signifie l'acronyme GAFAM ?", type: "MCQ", points: 2,
          answers: [{ content: "Google, Apple, Facebook, Amazon, Microsoft", isCorrect: true }, { content: "Google, AMD, Facebook, Amazon, Mozilla", isCorrect: false }, { content: "Gmail, Apple, Firefox, Amazon, Microsoft", isCorrect: false }, { content: "Google, Apple, Ford, Amazon, Meta", isCorrect: false }]
        },
      ]
    },

    // ── Round 3 ──
    {
      title: "Histoire de France",
      description: "De Clovis à la Ve République",
      categoryId: cultureGenerale.id,
      isPublic: true, randomizeQuestions: false,
      questions: [
        {
          content: "En quelle année a eu lieu la Révolution française ?", type: "MCQ", points: 2,
          answers: [{ content: "1789", isCorrect: true }, { content: "1792", isCorrect: false }, { content: "1804", isCorrect: false }, { content: "1815", isCorrect: false }]
        },
        {
          content: "Qui était le roi de France pendant la Révolution ?", type: "TEXT", points: 2,
          answers: [{ content: "Louis XVI", isCorrect: true }]
        },
        {
          content: "Napoléon Bonaparte est né en Corse", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Qui a été le premier président de la Ve République ?", type: "MCQ", points: 2,
          answers: [{ content: "Charles de Gaulle", isCorrect: true }, { content: "Georges Pompidou", isCorrect: false }, { content: "François Mitterrand", isCorrect: false }, { content: "René Coty", isCorrect: false }]
        },
        {
          content: "En quelle année la France a-t-elle aboli la peine de mort ?", type: "MCQ", points: 3,
          answers: [{ content: "1971", isCorrect: false }, { content: "1981", isCorrect: true }, { content: "1991", isCorrect: false }, { content: "2001", isCorrect: false }]
        },
        {
          content: "La Déclaration des droits de l'homme a été signée en 1789", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
      ]
    },
    {
      title: "Biologie et Animaux",
      description: "Le vivant et ses mystères",
      categoryId: sciences.id,
      isPublic: true, randomizeQuestions: true,
      questions: [
        {
          content: "Combien d'os compte le squelette humain adulte ?", type: "MCQ", points: 2,
          answers: [{ content: "186", isCorrect: false }, { content: "206", isCorrect: true }, { content: "226", isCorrect: false }, { content: "246", isCorrect: false }]
        },
        {
          content: "Les dauphins sont des mammifères", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Quel est l'animal terrestre le plus rapide ?", type: "MCQ", points: 2,
          answers: [{ content: "Le lion", isCorrect: false }, { content: "Le guépard", isCorrect: true }, { content: "L'antilope", isCorrect: false }, { content: "Le lévrier", isCorrect: false }]
        },
        {
          content: "Quel est le plus grand animal du monde ?", type: "TEXT", points: 2,
          answers: [{ content: "Baleine bleue", isCorrect: true }]
        },
        {
          content: "Le cœur humain a quatre cavités", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Combien de chromosomes possède un être humain ?", type: "MCQ", points: 3,
          answers: [{ content: "23", isCorrect: false }, { content: "46", isCorrect: true }, { content: "48", isCorrect: false }, { content: "52", isCorrect: false }]
        },
      ]
    },
    {
      title: "Tennis et Sports de Raquette",
      description: "Les tournois majeurs",
      categoryId: sports.id,
      isPublic: true, randomizeQuestions: true,
      questions: [
        {
          content: "Combien y a-t-il de tournois du Grand Chelem ?", type: "MCQ", points: 1,
          answers: [{ content: "3", isCorrect: false }, { content: "4", isCorrect: true }, { content: "5", isCorrect: false }, { content: "6", isCorrect: false }]
        },
        {
          content: "Roland-Garros se joue sur terre battue", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Sur quelle surface se joue Wimbledon ?", type: "MCQ", points: 2,
          answers: [{ content: "Terre battue", isCorrect: false }, { content: "Gazon", isCorrect: true }, { content: "Surface dure", isCorrect: false }, { content: "Moquette", isCorrect: false }]
        },
        {
          content: "Quel score s'appelle 'zéro' au tennis ?", type: "TEXT", points: 2,
          answers: [{ content: "Love", isCorrect: true }]
        },
        {
          content: "Rafael Nadal a remporté Roland-Garros plus de 10 fois", type: "TRUE_FALSE", points: 2,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
      ]
    },
    {
      title: "Cinéma et Littérature",
      description: "Les œuvres incontournables",
      categoryId: artsCulture.id,
      isPublic: true, randomizeQuestions: true,
      questions: [
        {
          content: "Qui a écrit Les Misérables ?", type: "MCQ", points: 2,
          answers: [{ content: "Émile Zola", isCorrect: false }, { content: "Victor Hugo", isCorrect: true }, { content: "Gustave Flaubert", isCorrect: false }, { content: "Alexandre Dumas", isCorrect: false }]
        },
        {
          content: "Molière était un dramaturge et acteur", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Quel film a remporté l'Oscar du meilleur film en 1998 ?", type: "MCQ", points: 3,
          answers: [{ content: "Saving Private Ryan", isCorrect: false }, { content: "Titanic", isCorrect: true }, { content: "Good Will Hunting", isCorrect: false }, { content: "La Vie est belle", isCorrect: false }]
        },
        {
          content: "Qui a écrit Roméo et Juliette ?", type: "TEXT", points: 1,
          answers: [{ content: "Shakespeare", isCorrect: true }]
        },
        {
          content: "Les Oscars sont décernés chaque année à Los Angeles", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Quel roman de Jules Verne parle d'un voyage autour du monde en 80 jours ?", type: "TEXT", points: 2,
          answers: [{ content: "Le Tour du monde en quatre-vingts jours", isCorrect: true }]
        },
      ]
    },
    {
      title: "Programmation et Systèmes",
      description: "Le monde du code",
      categoryId: technologie.id,
      isPublic: true, randomizeQuestions: true,
      questions: [
        {
          content: "Quel langage est principalement utilisé pour le développement web front-end ?", type: "MCQ", points: 2,
          answers: [{ content: "Python", isCorrect: false }, { content: "JavaScript", isCorrect: true }, { content: "Java", isCorrect: false }, { content: "C++", isCorrect: false }]
        },
        {
          content: "HTML signifie HyperText Markup Language", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Quel système d'exploitation est open source ?", type: "MCQ", points: 2,
          answers: [{ content: "Windows", isCorrect: false }, { content: "Linux", isCorrect: true }, { content: "macOS", isCorrect: false }, { content: "iOS", isCorrect: false }]
        },
        {
          content: "macOS est développé par Apple", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Quel langage de programmation porte le nom d'un serpent ?", type: "TEXT", points: 1,
          answers: [{ content: "Python", isCorrect: true }]
        },
        {
          content: "Un bug informatique est une erreur dans le code", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
      ]
    },

    // ── Round 4 ──
    {
      title: "Mythologie Grecque",
      description: "Les dieux et héros de l'Olympe",
      categoryId: cultureGenerale.id,
      isPublic: true, randomizeQuestions: true,
      questions: [
        {
          content: "Qui est le dieu grec du ciel et du tonnerre ?", type: "MCQ", points: 2,
          answers: [{ content: "Poséidon", isCorrect: false }, { content: "Zeus", isCorrect: true }, { content: "Hadès", isCorrect: false }, { content: "Apollon", isCorrect: false }]
        },
        {
          content: "Athéna est la déesse de la sagesse", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Comment s'appelle le héros qui a tué la Méduse ?", type: "TEXT", points: 2,
          answers: [{ content: "Persée", isCorrect: true }]
        },
        {
          content: "Quel dieu grec est associé à la mer ?", type: "MCQ", points: 1,
          answers: [{ content: "Arès", isCorrect: false }, { content: "Hermès", isCorrect: false }, { content: "Poséidon", isCorrect: true }, { content: "Héphaïstos", isCorrect: false }]
        },
        {
          content: "Hercule est le héros le plus célèbre de la mythologie grecque", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Quel est le nom du cheval ailé de la mythologie grecque ?", type: "TEXT", points: 2,
          answers: [{ content: "Pégase", isCorrect: true }]
        },
      ]
    },
    {
      title: "Inventions et Découvertes",
      description: "Les grandes innovations de l'Histoire",
      categoryId: sciences.id,
      isPublic: true, randomizeQuestions: true,
      questions: [
        {
          content: "Qui a inventé l'ampoule électrique ?", type: "MCQ", points: 2,
          answers: [{ content: "Nikola Tesla", isCorrect: false }, { content: "Thomas Edison", isCorrect: true }, { content: "Alexander Graham Bell", isCorrect: false }, { content: "Benjamin Franklin", isCorrect: false }]
        },
        {
          content: "Alexander Fleming a découvert la pénicilline", type: "TRUE_FALSE", points: 2,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Qui a découvert la gravité en observant une pomme tomber ?", type: "TEXT", points: 1,
          answers: [{ content: "Newton", isCorrect: true }]
        },
        {
          content: "Marie Curie a découvert la radioactivité", type: "TRUE_FALSE", points: 2,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "En quelle année l'homme a-t-il marché sur la Lune pour la première fois ?", type: "MCQ", points: 2,
          answers: [{ content: "1965", isCorrect: false }, { content: "1967", isCorrect: false }, { content: "1969", isCorrect: true }, { content: "1971", isCorrect: false }]
        },
      ]
    },
    {
      title: "Sports Collectifs",
      description: "Rugby, basket, handball...",
      categoryId: sports.id,
      isPublic: true, randomizeQuestions: false,
      questions: [
        {
          content: "Combien de joueurs composent une équipe de rugby à XV ?", type: "MCQ", points: 1,
          answers: [{ content: "13", isCorrect: false }, { content: "14", isCorrect: false }, { content: "15", isCorrect: true }, { content: "16", isCorrect: false }]
        },
        {
          content: "Combien de joueurs sont sur le terrain par équipe en NBA ?", type: "MCQ", points: 1,
          answers: [{ content: "4", isCorrect: false }, { content: "5", isCorrect: true }, { content: "6", isCorrect: false }, { content: "7", isCorrect: false }]
        },
        {
          content: "Michael Jordan a joué pour les Chicago Bulls", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Combien de joueurs y a-t-il dans une équipe de volleyball ?", type: "MCQ", points: 2,
          answers: [{ content: "5", isCorrect: false }, { content: "6", isCorrect: true }, { content: "7", isCorrect: false }, { content: "8", isCorrect: false }]
        },
        {
          content: "Le handball se joue avec les pieds", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: false }, { content: "Faux", isCorrect: true }]
        },
        {
          content: "Dans quel pays est né le basketball ?", type: "MCQ", points: 2,
          answers: [{ content: "Canada", isCorrect: true }, { content: "États-Unis", isCorrect: false }, { content: "Angleterre", isCorrect: false }, { content: "Australie", isCorrect: false }]
        },
      ]
    },
    {
      title: "Architecture et Monuments",
      description: "Les chefs-d'œuvre architecturaux",
      categoryId: artsCulture.id,
      isPublic: true, randomizeQuestions: false,
      questions: [
        {
          content: "Qui a conçu la Tour Eiffel ?", type: "MCQ", points: 2,
          answers: [{ content: "Le Corbusier", isCorrect: false }, { content: "Gustave Eiffel", isCorrect: true }, { content: "Haussmann", isCorrect: false }, { content: "Vauban", isCorrect: false }]
        },
        {
          content: "La Sagrada Familia à Barcelone est toujours en construction", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Dans quel pays se trouve le Colisée ?", type: "TEXT", points: 1,
          answers: [{ content: "Italie", isCorrect: true }]
        },
        {
          content: "Qui a conçu la Sagrada Familia ?", type: "MCQ", points: 2,
          answers: [{ content: "Salvador Dalí", isCorrect: false }, { content: "Antoni Gaudí", isCorrect: true }, { content: "Pablo Picasso", isCorrect: false }, { content: "Joan Miró", isCorrect: false }]
        },
        {
          content: "La Pyramide du Louvre a été construite dans les années 1980", type: "TRUE_FALSE", points: 2,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
      ]
    },
    {
      title: "Intelligence Artificielle et Cybersécurité",
      description: "Les enjeux du numérique moderne",
      categoryId: technologie.id,
      isPublic: true, randomizeQuestions: false,
      questions: [
        {
          content: "Que signifie IA ?", type: "MCQ", points: 1,
          answers: [{ content: "Internet Avancé", isCorrect: false }, { content: "Intelligence Artificielle", isCorrect: true }, { content: "Information Automatique", isCorrect: false }, { content: "Interface Augmentée", isCorrect: false }]
        },
        {
          content: "ChatGPT est un modèle de langage développé par OpenAI", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Qu'est-ce qu'un virus informatique ?", type: "MCQ", points: 2,
          answers: [{ content: "Un programme malveillant", isCorrect: true }, { content: "Un antivirus", isCorrect: false }, { content: "Un navigateur web", isCorrect: false }, { content: "Un système d'exploitation", isCorrect: false }]
        },
        {
          content: "Un pare-feu (firewall) protège votre ordinateur des intrusions", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Le phishing est une technique de piratage par email", type: "TRUE_FALSE", points: 2,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
      ]
    },

    // ── Round 5 ──
    {
      title: "Seconde Guerre Mondiale",
      description: "Histoire de 1939-1945",
      categoryId: cultureGenerale.id,
      isPublic: true, randomizeQuestions: false,
      questions: [
        {
          content: "En quelle année a débuté la Seconde Guerre mondiale ?", type: "MCQ", points: 2,
          answers: [{ content: "1938", isCorrect: false }, { content: "1939", isCorrect: true }, { content: "1940", isCorrect: false }, { content: "1941", isCorrect: false }]
        },
        {
          content: "Le Débarquement de Normandie a eu lieu le 6 juin 1944", type: "TRUE_FALSE", points: 2,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Quelle ville a été touchée par la première bombe atomique ?", type: "MCQ", points: 2,
          answers: [{ content: "Nagasaki", isCorrect: false }, { content: "Tokyo", isCorrect: false }, { content: "Hiroshima", isCorrect: true }, { content: "Osaka", isCorrect: false }]
        },
        {
          content: "Adolf Hitler était le chef de l'Allemagne nazie", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "En quelle année s'est terminée la Seconde Guerre mondiale ?", type: "MCQ", points: 1,
          answers: [{ content: "1944", isCorrect: false }, { content: "1945", isCorrect: true }, { content: "1946", isCorrect: false }, { content: "1947", isCorrect: false }]
        },
      ]
    },
    {
      title: "Écologie et Environnement",
      description: "Protégeons notre planète",
      categoryId: sciences.id,
      isPublic: true, randomizeQuestions: false,
      questions: [
        {
          content: "Quel gaz est principalement responsable du réchauffement climatique ?", type: "MCQ", points: 2,
          answers: [{ content: "Oxygène", isCorrect: false }, { content: "CO2", isCorrect: true }, { content: "Azote", isCorrect: false }, { content: "Hydrogène", isCorrect: false }]
        },
        {
          content: "La déforestation contribue au changement climatique", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Combien de temps met une bouteille en plastique à se dégrader ?", type: "MCQ", points: 2,
          answers: [{ content: "10 ans", isCorrect: false }, { content: "100 ans", isCorrect: false }, { content: "450 ans", isCorrect: true }, { content: "1000 ans", isCorrect: false }]
        },
        {
          content: "Les énergies renouvelables incluent l'énergie solaire et éolienne", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Quel est le principal gaz de l'atmosphère terrestre ?", type: "MCQ", points: 2,
          answers: [{ content: "Oxygène", isCorrect: false }, { content: "CO2", isCorrect: false }, { content: "Azote", isCorrect: true }, { content: "Argon", isCorrect: false }]
        },
        {
          content: "Quel terme désigne la disparition des espèces animales et végétales ?", type: "TEXT", points: 3,
          answers: [{ content: "Extinction", isCorrect: true }]
        },
      ]
    },
    {
      title: "Sports Mécaniques et Extrêmes",
      description: "Vitesse et sensations fortes",
      categoryId: sports.id,
      isPublic: true, randomizeQuestions: true,
      questions: [
        {
          content: "Quel pilote a remporté le plus de championnats du monde de F1 ?", type: "MCQ", points: 3,
          answers: [{ content: "Ayrton Senna", isCorrect: false }, { content: "Lewis Hamilton", isCorrect: true }, { content: "Alain Prost", isCorrect: false }, { content: "Sebastian Vettel", isCorrect: false }]
        },
        {
          content: "Le Grand Prix de Monaco fait partie du calendrier F1", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "De quelle couleur est le maillot du leader au Tour de France ?", type: "MCQ", points: 1,
          answers: [{ content: "Vert", isCorrect: false }, { content: "Jaune", isCorrect: true }, { content: "Blanc", isCorrect: false }, { content: "Rouge", isCorrect: false }]
        },
        {
          content: "Le biathlon combine ski de fond et tir à la carabine", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Quelle est la distance d'une piscine olympique ?", type: "MCQ", points: 2,
          answers: [{ content: "25 mètres", isCorrect: false }, { content: "50 mètres", isCorrect: true }, { content: "75 mètres", isCorrect: false }, { content: "100 mètres", isCorrect: false }]
        },
      ]
    },
    {
      title: "Bande Dessinée et Animation",
      description: "Le 9e art et les dessins animés",
      categoryId: artsCulture.id,
      isPublic: true, randomizeQuestions: true,
      questions: [
        {
          content: "Qui a créé Astérix ?", type: "MCQ", points: 2,
          answers: [{ content: "Hergé", isCorrect: false }, { content: "Goscinny et Uderzo", isCorrect: true }, { content: "Franquin", isCorrect: false }, { content: "Peyo", isCorrect: false }]
        },
        {
          content: "Tintin a été créé par Hergé", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Quel studio a créé Le Roi Lion ?", type: "MCQ", points: 1,
          answers: [{ content: "Pixar", isCorrect: false }, { content: "Disney", isCorrect: true }, { content: "DreamWorks", isCorrect: false }, { content: "Warner Bros", isCorrect: false }]
        },
        {
          content: "Les Schtroumpfs ont été créés par Peyo", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Dans quel pays la bande dessinée manga est-elle originaire ?", type: "TEXT", points: 1,
          answers: [{ content: "Japon", isCorrect: true }]
        },
        {
          content: "Quel est le vrai nom de Batman ?", type: "MCQ", points: 2,
          answers: [{ content: "Clark Kent", isCorrect: false }, { content: "Bruce Wayne", isCorrect: true }, { content: "Peter Parker", isCorrect: false }, { content: "Tony Stark", isCorrect: false }]
        },
      ]
    },
    {
      title: "Jeux Vidéo et Cryptomonnaies",
      description: "Les nouvelles technologies",
      categoryId: technologie.id,
      isPublic: true, randomizeQuestions: true,
      questions: [
        {
          content: "Quelle console a été créée par Nintendo en 1985 ?", type: "MCQ", points: 2,
          answers: [{ content: "Game Boy", isCorrect: false }, { content: "NES", isCorrect: true }, { content: "Super Nintendo", isCorrect: false }, { content: "N64", isCorrect: false }]
        },
        {
          content: "Minecraft est le jeu vidéo le plus vendu de tous les temps", type: "TRUE_FALSE", points: 2,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Quelle est la première cryptomonnaie créée ?", type: "MCQ", points: 2,
          answers: [{ content: "Ethereum", isCorrect: false }, { content: "Bitcoin", isCorrect: true }, { content: "Ripple", isCorrect: false }, { content: "Litecoin", isCorrect: false }]
        },
        {
          content: "Le Bitcoin a été créé sous le pseudonyme Satoshi Nakamoto", type: "TRUE_FALSE", points: 1,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
        {
          content: "Dans quel jeu vidéo incarne-t-on un plombier italien ?", type: "TEXT", points: 1,
          answers: [{ content: "Super Mario", isCorrect: true }]
        },
        {
          content: "La blockchain est une technologie de stockage de données décentralisée", type: "TRUE_FALSE", points: 2,
          answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }]
        },
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
              answers: {
                create: q.answers.map((a) => ({
                  content: a.content,
                  isCorrect: a.isCorrect,
                })),
              },
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

  // ─── 5. Attempts pour Faros et User ──────────────────────────────────────
  console.log('\n🎮 Création des attempts...');

  const allQuizzes = await prisma.quiz.findMany({
    select: {
      id: true,
      questions: {
        select: { points: true }
      }
    }
  });

  const getMaxScore = (quiz: typeof allQuizzes[0]) =>
    quiz.questions.reduce((sum, q) => sum + q.points, 0);

  const getRandScore = (max: number) =>
    Math.floor(Math.random() * (max + 1));

  const getDaysAgo = (days: number) =>
    new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Sélectionner 20 quiz aléatoires
  const shuffle = (arr: typeof allQuizzes) => arr.sort(() => Math.random() - 0.5);
  const farosQuizzes = shuffle([...allQuizzes]).slice(0, 20);
  const userQuizzes = shuffle([...allQuizzes]).slice(0, 20);

  for (let i = 0; i < farosQuizzes.length; i++) {
    const quiz = farosQuizzes[i];
    const max = getMaxScore(quiz);
    await prisma.attempt.create({
      data: {
        userId: farosUser.id,
        quizId: quiz.id,
        score: getRandScore(max),
        gameType: 'QUIZ',
        gameId: crypto.randomUUID(),  // ← ajouter
        createdAt: getDaysAgo(Math.floor(Math.random() * 30)),
      },
    });
  }

  for (let i = 0; i < userQuizzes.length; i++) {
    const quiz = userQuizzes[i];
    const max = getMaxScore(quiz);
    await prisma.attempt.create({
      data: {
        userId: anonUser.id,
        quizId: quiz.id,
        score: getRandScore(max),
        gameType: 'QUIZ',
        gameId: crypto.randomUUID(),
        createdAt: getDaysAgo(Math.floor(Math.random() * 30)),
      },
    });
  }

  console.log('✅ 20 attempts créés pour Faros et User');
  console.log(`\n✨ Seed terminé ! ${createdCount} quiz créés avec succès.`);

  // ─── Parties UNO ──────────────────────────────────────────────────────────
  console.log('\n🎴 Création des parties UNO...');

  const unoPlayers = [farosUser, anonUser, anonUser1, anonUser2, anonUser3];

  // Mélange Fisher-Yates
  function shufflePlayers<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // Date aléatoire sur une plage plus large
  function getRandomDateInLastDays(daysBack: number) {
    const now = Date.now();
    const min = now - daysBack * 24 * 60 * 60 * 1000;
    const timestamp = Math.floor(Math.random() * (now - min)) + min;
    return new Date(timestamp);
  }

  // Pour créer des parties plus espacées et plus réalistes
  const totalUnoGames = 80;
  const unoGameDates: Date[] = [];

  for (let g = 0; g < totalUnoGames; g++) {
    // On répartit les parties sur ~120 jours avec un peu d'aléatoire
    const baseDaysAgo = Math.floor((g / totalUnoGames) * 120);
    const jitterHours = Math.floor(Math.random() * 48); // variation jusqu'à 48h
    const gameDate = new Date(
      Date.now() -
      baseDaysAgo * 24 * 60 * 60 * 1000 -
      jitterHours * 60 * 60 * 1000
    );

    unoGameDates.push(gameDate);
  }

  // On trie du plus ancien au plus récent puis on rejoue un peu l'aléatoire
  unoGameDates.sort((a, b) => a.getTime() - b.getTime());

  for (let g = 0; g < totalUnoGames; g++) {
    const gameId = crypto.randomUUID();

    // Avec 5 joueurs dispo, on borne correctement entre 2 et 5
    const playerCount = Math.floor(Math.random() * (unoPlayers.length - 1)) + 2;

    const participants = shufflePlayers(unoPlayers).slice(0, playerCount);

    // On remélange pour que le classement change
    const rankedParticipants = shufflePlayers(participants);

    const gameDate = unoGameDates[g];

    for (let p = 0; p < rankedParticipants.length; p++) {
      const rank = p + 1;

      // petite différence de quelques secondes entre les joueurs d'une même partie
      const attemptDate = new Date(gameDate.getTime() + p * 1000);

      await prisma.attempt.create({
        data: {
          userId: rankedParticipants[p].id,
          score: computeUnoScore(rank),
          gameType: 'UNO',
          placement: rank,
          gameId,
          quizId: null,
          createdAt: attemptDate,
        },
      });
    }

    console.log(
      `  ✅ Partie UNO ${g + 1}/${totalUnoGames} — ${playerCount} joueurs — ${gameDate.toLocaleString('fr-FR')}`
    );
  }

  console.log(`✅ ${totalUnoGames} parties UNO créées`);
}
main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
