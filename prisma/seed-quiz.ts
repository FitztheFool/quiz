// prisma/seed-quiz.ts
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { QuestionType } from '../src/generated/prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

interface QuizQuestion {
    content: string;
    type: string;
    points: number;
    answers: { content: string; isCorrect: boolean }[];
}

interface QuizData {
    title: string;
    description: string;
    categoryId: string;
    isPublic: boolean;
    randomizeQuestions: boolean;
    questions: QuizQuestion[];
}

export async function seedQuizzes(
    prisma: PrismaClient,
    creatorId: string,
    categories: {
        cultureGenerale: { id: string };
        sciences: { id: string };
        sports: { id: string };
        artsCulture: { id: string };
        technologie: { id: string };
        popCulture: { id: string };
        musique: { id: string };
        videogames: { id: string };
        other: { id: string };
    }
) {
    const { cultureGenerale, sciences, sports, artsCulture, technologie, popCulture, musique, videogames, other } = categories;

    const quizData: QuizData[] = [
        // ── Jeu Vidéo ──────────────────────────────────────────────────────────
        {
            title: "RPG & Aventure", description: "Épées, magie et quêtes épiques", categoryId: videogames.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Dans quelle série incarne-t-on un détective de monstres appelé Geralt ?", type: "MCQ", points: 2, answers: [{ content: "Dragon Age", isCorrect: false }, { content: "The Witcher", isCorrect: true }, { content: "Dark Souls", isCorrect: false }, { content: "Baldur's Gate", isCorrect: false }] },
                { content: "Dark Souls est réputé pour sa difficulté élevée", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel est le nom du héros principal de la saga Final Fantasy VII ?", type: "MCQ", points: 2, answers: [{ content: "Tidus", isCorrect: false }, { content: "Lightning", isCorrect: false }, { content: "Cloud Strife", isCorrect: true }, { content: "Noctis", isCorrect: false }] },
                { content: "Skyrim se déroule dans l'univers d'Elder Scrolls", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel studio a développé la saga Dark Souls ?", type: "TEXT", points: 2, answers: [{ content: "FromSoftware", isCorrect: true }] },
                { content: "Dans Zelda : Breath of the Wild, sur quelle console est sorti le jeu en premier ?", type: "MCQ", points: 2, answers: [{ content: "Wii U", isCorrect: false }, { content: "Nintendo Switch", isCorrect: true }, { content: "3DS", isCorrect: false }, { content: "Wii U et Switch simultanément", isCorrect: false }] },
            ]
        },
        {
            title: "FPS & Action", description: "Tirs, explosions et réflexes", categoryId: videogames.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Quelle franchise de FPS met en scène le Master Chief ?", type: "MCQ", points: 1, answers: [{ content: "Call of Duty", isCorrect: false }, { content: "Halo", isCorrect: true }, { content: "Doom", isCorrect: false }, { content: "Titanfall", isCorrect: false }] },
                { content: "Counter-Strike est un jeu de tir compétitif en équipe", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel jeu popularisé en 2016 met des héros aux capacités uniques dans des matchs 6v6 ?", type: "MCQ", points: 2, answers: [{ content: "Valorant", isCorrect: false }, { content: "Apex Legends", isCorrect: false }, { content: "Overwatch", isCorrect: true }, { content: "Paladins", isCorrect: false }] },
                { content: "Doom (1993) est considéré comme l'un des fondateurs du genre FPS", type: "TRUE_FALSE", points: 2, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Dans quel FPS incarne-t-on un astronaute sur une station spatiale envahie par des démons ?", type: "TEXT", points: 2, answers: [{ content: "Doom", isCorrect: true }] },
                { content: "Quel est le battle royale développé par Respawn Entertainment ?", type: "MCQ", points: 2, answers: [{ content: "Fortnite", isCorrect: false }, { content: "PUBG", isCorrect: false }, { content: "Apex Legends", isCorrect: true }, { content: "Warzone", isCorrect: false }] },
            ]
        },
        {
            title: "Consoles & Histoire du Jeu Vidéo", description: "Des bornes d'arcade aux générations modernes", categoryId: videogames.id, isPublic: true, randomizeQuestions: false,
            questions: [
                { content: "Quelle est la console la plus vendue de tous les temps ?", type: "MCQ", points: 2, answers: [{ content: "PlayStation 2", isCorrect: true }, { content: "Nintendo DS", isCorrect: false }, { content: "Game Boy", isCorrect: false }, { content: "Wii", isCorrect: false }] },
                { content: "La Dreamcast de Sega était une console de 6e génération", type: "TRUE_FALSE", points: 2, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "En quelle année la première PlayStation a-t-elle été lancée au Japon ?", type: "MCQ", points: 2, answers: [{ content: "1992", isCorrect: false }, { content: "1994", isCorrect: true }, { content: "1996", isCorrect: false }, { content: "1998", isCorrect: false }] },
                { content: "Atari a créé le jeu Pong en 1972", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel constructeur a fabriqué la console Xbox ?", type: "TEXT", points: 1, answers: [{ content: "Microsoft", isCorrect: true }] },
                { content: "La Nintendo Switch est une console hybride portable et salon", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
            ]
        },
        {
            title: "Jeux de Sport & Course", description: "Stades et circuits virtuels", categoryId: videogames.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Quelle série de simulation de football est éditée par EA Sports ?", type: "MCQ", points: 1, answers: [{ content: "Pro Evolution Soccer", isCorrect: false }, { content: "EA Sports FC (ex-FIFA)", isCorrect: true }, { content: "Football Manager", isCorrect: false }, { content: "Top Eleven", isCorrect: false }] },
                { content: "Mario Kart est une série de jeux de course développée par Nintendo", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel jeu de course simule le championnat de Formule 1 avec licence officielle ?", type: "MCQ", points: 2, answers: [{ content: "Gran Turismo", isCorrect: false }, { content: "Forza Motorsport", isCorrect: false }, { content: "F1 de Codemasters", isCorrect: true }, { content: "Need for Speed", isCorrect: false }] },
                { content: "La série NBA 2K est développée par 2K Games", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Dans quel jeu de sport peut-on jouer au Quidditch de manière virtuelle ?", type: "MCQ", points: 3, answers: [{ content: "Pottermore Arena", isCorrect: false }, { content: "Harry Potter: Quidditch World Cup", isCorrect: true }, { content: "Hogwarts Legacy", isCorrect: false }, { content: "Wizarding Sports VR", isCorrect: false }] },
                { content: "Gran Turismo est une exclusivité PlayStation", type: "TRUE_FALSE", points: 2, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
            ]
        },
        {
            title: "Jeux Indépendants & Pixel Art", description: "Les pépites du jeu indé", categoryId: videogames.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Quel jeu indépendant met en scène une petite fille nommée Madeline qui escalade une montagne ?", type: "MCQ", points: 2, answers: [{ content: "Hollow Knight", isCorrect: false }, { content: "Celeste", isCorrect: true }, { content: "Ori and the Blind Forest", isCorrect: false }, { content: "Cuphead", isCorrect: false }] },
                { content: "Stardew Valley a été développé par une seule personne", type: "TRUE_FALSE", points: 2, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Dans quel jeu incarne-t-on un chevalier insecte dans un royaume souterrain ?", type: "MCQ", points: 2, answers: [{ content: "Shovel Knight", isCorrect: false }, { content: "Hollow Knight", isCorrect: true }, { content: "Blasphemous", isCorrect: false }, { content: "Dead Cells", isCorrect: false }] },
                { content: "Undertale est un jeu de rôle indépendant sorti en 2015", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel jeu indépendant propose de gérer un hospice en fin de vie de manière narrative ?", type: "MCQ", points: 3, answers: [{ content: "Papers Please", isCorrect: false }, { content: "A Mortician's Tale", isCorrect: false }, { content: "Spiritfarer", isCorrect: true }, { content: "Night in the Woods", isCorrect: false }] },
                { content: "Cuphead est inspiré des dessins animés des années 1930", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
            ]
        },

        // ── Autre ──────────────────────────────────────────────────────────────
        {
            title: "Gastronomie & Cuisine du Monde", description: "Saveurs et traditions culinaires", categoryId: other.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Quel pays est à l'origine de la pizza ?", type: "MCQ", points: 1, answers: [{ content: "Espagne", isCorrect: false }, { content: "Italie", isCorrect: true }, { content: "Grèce", isCorrect: false }, { content: "France", isCorrect: false }] },
                { content: "Le wasabi est une pâte piquante d'origine japonaise", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel est l'ingrédient principal du houmous ?", type: "MCQ", points: 1, answers: [{ content: "Lentilles", isCorrect: false }, { content: "Pois chiches", isCorrect: true }, { content: "Haricots blancs", isCorrect: false }, { content: "Fèves", isCorrect: false }] },
                { content: "La sauce béchamel est une sauce mère de la cuisine française", type: "TRUE_FALSE", points: 2, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "De quel pays est originaire le kimchi ?", type: "TEXT", points: 2, answers: [{ content: "Corée", isCorrect: true }] },
                { content: "Quel fromage français est surnommé 'le roi des fromages' ?", type: "MCQ", points: 2, answers: [{ content: "Camembert", isCorrect: false }, { content: "Roquefort", isCorrect: false }, { content: "Brie de Meaux", isCorrect: true }, { content: "Comté", isCorrect: false }] },
            ]
        },
        {
            title: "Langues & Linguistique", description: "Les mystères du langage humain", categoryId: other.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Combien de langues officielles compte l'ONU ?", type: "MCQ", points: 2, answers: [{ content: "4", isCorrect: false }, { content: "5", isCorrect: false }, { content: "6", isCorrect: true }, { content: "7", isCorrect: false }] },
                { content: "Le portugais est la langue officielle du Brésil", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quelle est la langue la plus difficile au monde selon les linguistes ?", type: "MCQ", points: 3, answers: [{ content: "Mandarin", isCorrect: false }, { content: "Arabe", isCorrect: false }, { content: "Il n'existe pas de consensus", isCorrect: true }, { content: "Japonais", isCorrect: false }] },
                { content: "L'esperanto est une langue naturelle parlée en Europe de l'Est", type: "TRUE_FALSE", points: 2, answers: [{ content: "Vrai", isCorrect: false }, { content: "Faux", isCorrect: true }] },
                { content: "Dans combien de pays l'espagnol est-il langue officielle ?", type: "MCQ", points: 2, answers: [{ content: "15", isCorrect: false }, { content: "20", isCorrect: true }, { content: "25", isCorrect: false }, { content: "30", isCorrect: false }] },
                { content: "Le français descend du latin", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
            ]
        },
        {
            title: "Astronomie & Espace", description: "Au-delà de notre système solaire", categoryId: other.id, isPublic: true, randomizeQuestions: false,
            questions: [
                { content: "Qu'est-ce qu'une année-lumière ?", type: "MCQ", points: 2, answers: [{ content: "Une durée de 365 jours dans l'espace", isCorrect: false }, { content: "La distance parcourue par la lumière en un an", isCorrect: true }, { content: "La vitesse maximale d'un vaisseau spatial", isCorrect: false }, { content: "La période de rotation d'une étoile", isCorrect: false }] },
                { content: "Un trou noir absorbe la lumière", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Combien d'étoiles compte approximativement la Voie Lactée ?", type: "MCQ", points: 3, answers: [{ content: "1 milliard", isCorrect: false }, { content: "100 à 400 milliards", isCorrect: true }, { content: "10 milliards", isCorrect: false }, { content: "1 000 milliards", isCorrect: false }] },
                { content: "La NASA est une agence spatiale américaine", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel est le nom de la première femme à être allée dans l'espace ?", type: "MCQ", points: 2, answers: [{ content: "Sally Ride", isCorrect: false }, { content: "Valentina Terechkova", isCorrect: true }, { content: "Svetlana Savitskaïa", isCorrect: false }, { content: "Claudie Haigneré", isCorrect: false }] },
                { content: "Mars possède deux lunes", type: "TRUE_FALSE", points: 2, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
            ]
        },
        {
            title: "Psychologie & Comportement", description: "Comprendre l'esprit humain", categoryId: other.id, isPublic: true, randomizeQuestions: true,
            questions: [
                { content: "Qui est le fondateur de la psychanalyse ?", type: "MCQ", points: 1, answers: [{ content: "Carl Jung", isCorrect: false }, { content: "Sigmund Freud", isCorrect: true }, { content: "Alfred Adler", isCorrect: false }, { content: "Wilhelm Wundt", isCorrect: false }] },
                { content: "L'effet placebo est un phénomène psychologique réel et mesurable", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel biais cognitif nous pousse à chercher des informations qui confirment nos croyances ?", type: "MCQ", points: 2, answers: [{ content: "Biais de disponibilité", isCorrect: false }, { content: "Biais de confirmation", isCorrect: true }, { content: "Effet Dunning-Kruger", isCorrect: false }, { content: "Biais d'ancrage", isCorrect: false }] },
                { content: "La pyramide de Maslow décrit une hiérarchie des besoins humains", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quel est le nom du phénomène où une personne se comporte différemment quand elle sait qu'elle est observée ?", type: "TEXT", points: 3, answers: [{ content: "Effet Hawthorne", isCorrect: true }] },
                { content: "Le sommeil paradoxal est la phase durant laquelle on rêve le plus", type: "TRUE_FALSE", points: 2, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
            ]
        },
        {
            title: "Économie & Finance", description: "Comprendre les grands mécanismes économiques", categoryId: other.id, isPublic: true, randomizeQuestions: false,
            questions: [
                { content: "Qu'est-ce que le PIB ?", type: "MCQ", points: 1, answers: [{ content: "Le prix d'un baril de pétrole", isCorrect: false }, { content: "La valeur totale des biens et services produits par un pays", isCorrect: true }, { content: "Le budget annuel d'un gouvernement", isCorrect: false }, { content: "Le taux d'inflation d'un pays", isCorrect: false }] },
                { content: "L'inflation désigne une hausse générale des prix", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
                { content: "Quelle institution fixe les taux directeurs en zone euro ?", type: "MCQ", points: 2, answers: [{ content: "La Commission Européenne", isCorrect: false }, { content: "La Banque Centrale Européenne", isCorrect: true }, { content: "Le FMI", isCorrect: false }, { content: "La Banque Mondiale", isCorrect: false }] },
                { content: "Le bitcoin est une monnaie émise par une banque centrale", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: false }, { content: "Faux", isCorrect: true }] },
                { content: "Quel économiste est associé à la théorie de la 'main invisible' du marché ?", type: "MCQ", points: 2, answers: [{ content: "Karl Marx", isCorrect: false }, { content: "John Maynard Keynes", isCorrect: false }, { content: "Adam Smith", isCorrect: true }, { content: "Milton Friedman", isCorrect: false }] },
                { content: "Une action en bourse représente une part de propriété d'une entreprise", type: "TRUE_FALSE", points: 1, answers: [{ content: "Vrai", isCorrect: true }, { content: "Faux", isCorrect: false }] },
            ]
        },
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
                    creatorId,
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

    console.log(`\n✅ ${createdCount}/${quizData.length} quiz créés.`);
}
