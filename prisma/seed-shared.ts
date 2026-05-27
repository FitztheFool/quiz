// prisma/seed-shared.ts
import { PrismaClient } from '../src/generated/prisma/client';
import { seedQuizzes } from './seed-quiz';

export const wordGroups: Record<string, string[]> = {
    'Éclairage': [
        'HALOGÈNE', 'RÉVERBÈRE', 'LAMPADAIRE', 'PHARE', 'BOUGIE', 'LANTERNE', 'PROJECTEUR',
        'NÉON', 'TORCHE', 'VEILLEUSE', 'LUSTRE', 'APPLIQUE', 'LAMPE À ARC',
    ],
    'Animaux marins': [
        'DAUPHIN', 'BALEINE', 'PIEUVRE', 'REQUIN', 'MÉDUSE', 'HIPPOCAMPE', 'RAIE',
        'CRABE', 'HOMARD', 'MURÈNE', 'TORTUE', 'ORQUE', 'ÉTOILE DE MER', 'NAUTILE',
    ],
    'Animaux terrestres': [
        'ÉLÉPHANT', 'GIRAFE', 'KANGOUROU', 'HIPPOPOTAME', 'PANTHÈRE', 'RHINOCÉROS', 'GORILLE',
        'ZÈBRE', 'LION', 'TIGRE', 'LOUP', 'OURS', 'CHIMPANZÉ', 'HYÈNE',
    ],
    'Animaux exotiques': [
        'CAMÉLÉON', 'FLAMANT', 'AUTRUCHE', 'PERROQUET', 'SCORPION', 'PINGOUIN', 'CROCODILE',
        'KOALA', 'PANDA', 'JAGUAR', 'TAPIR', 'PAON', 'TOUCAN', 'OKAPI',
    ],
    'Instruments de mesure': [
        'THERMOMÈTRE', 'CHRONOMÈTRE', 'MICROSCOPE', 'TÉLESCOPE', 'CALCULATRICE', 'BAROMÈTRE', 'BOUSSOLE',
        'SISMOGRAPHE', 'VOLTMÈTRE', 'ALTIMÈTRE', 'SPECTROMÈTRE', 'HYGROMÈTRE', 'GYROSCOPE',
    ],
    'Appareils ménagers': [
        'BOUILLOIRE', 'FRIGO', 'ASPIRATEUR', 'ESCALATOR', 'MICRO-ONDES', 'LAVE-VAISSELLE',
        'SÈCHE-CHEVEUX', 'GRILLE-PAIN', 'CAFETIÈRE', 'MIXEUR', 'ROBOT CUISEUR', 'DÉSHUMIDIFICATEUR',
    ],
    'Lieux culturels': [
        'BIBLIOTHÈQUE', 'CATHÉDRALE', 'CASINO', 'OBSERVATOIRE', 'CIRQUE', 'STADE', 'MANÈGE', 'AQUARIUM',
        'MUSÉE', 'THÉÂTRE', 'OPÉRA', 'PALAIS', 'MOSQUÉE', 'PAGODE', 'PLANETARIUM',
    ],
    'Lieux naturels': [
        'VOLCAN', 'DÉSERT', 'GLACIER', 'MARÉCAGE', 'CANYON', 'RÉCIF',
        'FJORD', 'SAVANE', 'LAGUNE', 'DELTA', 'TOURBIÈRE', 'GROTTE', 'ATOLL',
    ],
    'Lieux insolites': [
        'CIMETIÈRE', 'LABORATOIRE', 'BUNKER', 'CAVERNE', 'CRYPTE', 'ÉGOUT', 'ENTREPÔT',
        'MINE', 'CHÂTEAU', 'IGLOO',
    ],
    'Concepts abstraits': [
        'GRAVITÉ', 'DÉMOCRATIE', 'PARADOXE', 'RÉVOLUTION', 'RENAISSANCE', 'PROPHÉTIE', 'INFLATION', 'PANDÉMIE',
        'UTOPIE', 'ANARCHIE', 'HIÉRARCHIE', 'NOSTALGIE',
    ],
    'Sciences naturelles': [
        'PHOTOSYNTHÈSE', 'HIBERNATION', 'MIGRATION', 'ÉVOLUTION', 'MÉTAMORPHOSE', 'FERMENTATION',
        'SYMBIOSE', 'OSMOSE', 'GESTATION', 'POLLINISATION', 'BIOLUMINESCENCE', 'ÉCHOLOCATION',
    ],
    'Sports de combat': [
        'ESCRIME', 'BOXE', 'JUDO', 'KARATÉ', 'LUTTE',
        'TAEKWONDO', 'SUMO', 'KENDO', 'CAPOEIRA', 'MUAY THAI', 'SAVATE', 'AIKIDO',
    ],
    'Sports aquatiques': [
        'NATATION', 'PLANCHE À VOILE', 'PLONGÉE', 'SURF', 'AVIRON',
        'KAYAK', 'POLO AQUATIQUE', 'NAGE SYNCHRONISÉE', 'WAKEBOARD', 'VOILE', 'KITESURF',
    ],
    'Sports extrêmes': [
        'SKATEBOARD', 'PARACHUTE', 'ESCALADE', 'PARAPENTE', 'WINGSUIT',
        'RAFTING', 'MOTOCROSS', 'BASE JUMP', 'SNOWBOARD', 'BMX', 'TYROLIENNE',
    ],
    'Sports d\'endurance': [
        'MARATHON', 'CYCLISME', 'TRIATHLON', 'TRAIL', 'BIATHLON', 'PENTATHLON', 'IRONMAN',
    ],
    'Arts & Loisirs': [
        'CALLIGRAPHIE', 'ORIGAMI', 'TRAMPOLINE', 'POTERIE', 'AQUARELLE',
        'SCULPTURE', 'BRODERIE', 'MACRAMÉ', 'GRAVURE', 'JONGLERIE', 'TAXIDERMIE',
    ],
    'Danses du monde': [
        'SALSA', 'TANGO', 'FLAMENCO', 'RUMBA', 'VALSE', 'CHARLESTON', 'HULA',
        'SAMBA', 'BOLERO', 'POLKA', 'LINDY HOP',
    ],
    'Cuisine du monde': [
        'GUACAMOLE', 'SUSHI', 'RAVIOLI', 'COUSCOUS', 'PAELLA', 'FONDUE', 'TACOS',
        'RAMEN', 'KEBAB', 'FALAFEL', 'BURRITO', 'TAPAS', 'DIM SUM',
    ],
    'Pâtisserie française': [
        'CROISSANT', 'MACARON', 'SOUFFLÉ', 'CRÊPE', 'ÉCLAIR', 'MADELEINE', 'TIRAMISU',
        'PARIS-BREST', 'RELIGIEUSE', 'TARTE TATIN', 'MILLEFEUILLE', 'BABA AU RHUM', 'KOUIGN-AMANN',
    ],
    'Métiers scientifiques': [
        'ARCHÉOLOGUE', 'ASTRONAUTE', 'GLACIOLOGUE', 'CARTOGRAPHE', 'VÉTÉRINAIRE',
        'GÉOLOGUE', 'OCÉANOGRAPHE', 'ENTOMOLOGUE', 'SISMOLOGUE', 'VULCANOLOGUE', 'PALÉONTOLOGUE',
    ],
    'Métiers artistiques': [
        'CHORÉGRAPHE', 'MARIONNETTISTE', 'SOMMELIER', 'SCULPTEUR',
        'LUTHIER', 'CALLIGRAPHE', 'ENLUMINEUR', 'SOUFFLEUR DE VERRE', 'FACTEUR DE CLAVECIN',
    ],
    'Métiers de terrain': [
        'POMPIER', 'APICULTEUR', 'PLONGEUR', 'GÉOMÈTRE', 'FORESTIER',
        'MAÇON', 'CHARPENTIER', 'BÛCHERON', 'GUIDE DE MONTAGNE', 'DÉMINEUR',
    ],
    'Transports': [
        'HÉLICOPTÈRE', 'LOCOMOTIVE', 'TRAMWAY', 'TÉLÉCABINE', 'PAQUEBOT',
        'GONDOLE', 'RICKSHAW', 'DIRIGEABLE', 'HYDRAVION', 'CATAMARAN', 'MONORAIL', 'HOVERCRAFT',
    ],
    'Météo extrême': [
        'TORNADE', 'CYCLONE', 'OURAGAN', 'BLIZZARD', 'GRÊLE', 'MOUSSON', 'CANICULE', 'TYPHON',
        'AVALANCHE', 'TEMPÊTE DE SABLE', 'ORAGE MAGNÉTIQUE',
    ],
    'Planètes & astronomie': [
        'MERCURE', 'VÉNUS', 'MARS', 'JUPITER', 'SATURNE', 'URANUS', 'NEPTUNE',
        'COMÈTE', 'NÉBULEUSE', 'PULSAR', 'QUASAR', 'TROU NOIR', 'ASTÉROÏDE',
    ],
    'Mythologie grecque': [
        'ZEUS', 'POSÉIDON', 'ATHÉNA', 'HÉPHAÏSTOS', 'ARTÉMIS', 'HERMÈS', 'APHRODITE',
        'ARÈS', 'DÉMÉTER', 'DIONYSOS', 'HESTIA', 'HÉCATE', 'ÉOLE', 'MORPHÉE',
    ],
    'Monuments célèbres': [
        'COLISÉE', 'PARTHÉNON', 'STONEHENGE', 'ALHAMBRA', 'ANGKOR', 'MACHU PICCHU',
        'ACROPOLE', 'VERSAILLES', 'KREMLIN', 'SAGRADA FAMILIA', 'NOTRE-DAME', 'TAJ MAHAL',
    ],
    'Fêtes & traditions': [
        'CARNAVAL', 'HALLOWEEN', 'MARDI GRAS', 'OKTOBERFEST',
        'HANOUKKA', 'RAMADAN',
    ],
    'Bijoux & parures': [
        'DIADÈME', 'BROCHE', 'AMULETTE', 'CHEVALIÈRE', 'PENDENTIF',
        'MÉDAILLON', 'TIARE', 'PARURE', 'BOUCLE D\'OREILLE', 'BAGUE',
    ],
    'Outils & bricolage': [
        'TRONÇONNEUSE', 'PERCEUSE', 'SCIE', 'RABOT',
        'ÉQUERRE', 'CISEAU À BOIS', 'MARTEAU', 'PINCE-MONSEIGNEUR', 'TOURNEVIS',
    ],
    'Fruits & légumes': [
        'ABRICOT', 'AUBERGINE', 'COURGETTE', 'POTIRON', 'ARTICHAUT', 'RHUBARBE', 'GROSEILLE',
        'MYRTILLE', 'BETTERAVE', 'ASPERGE', 'GRENADE', 'FIGUE', 'MANGUE', 'POIREAU',
    ],
    'Boissons': [
        'LIMONADE', 'EXPRESSO', 'TISANE', 'CIDRE', 'HYDROMEL', 'SMOOTHIE', 'MOJITO',
        'CAPPUCCINO', 'GRENADINE', 'NECTAR', 'MILKSHAKE', 'CHAMPAGNE',
    ],
    'Vêtements': [
        'ÉCHARPE', 'MANTEAU', 'CHAUSSETTE', 'BERMUDA', 'IMPERMÉABLE', 'SALOPETTE', 'CRAVATE',
        'MOUFLE', 'CASQUETTE', 'KIMONO', 'PONCHO', 'GILET',
    ],
    'Mobilier': [
        'COMMODE', 'TABOURET', 'ÉTAGÈRE', 'FAUTEUIL', 'CANAPÉ', 'BUFFET', 'HAMAC',
        'PARAVENT', 'PORTEMANTEAU', 'BANQUETTE', 'PUPITRE', 'BERCEAU',
    ],
    'Émotions': [
        'COLÈRE', 'JALOUSIE', 'ENTHOUSIASME', 'MÉLANCOLIE', 'SÉRÉNITÉ', 'ANGOISSE', 'EUPHORIE',
        'COMPASSION', 'FIERTÉ', 'TENDRESSE', 'EFFROI', 'GRATITUDE',
    ],
    'Couleurs': [
        'TURQUOISE', 'ÉCARLATE', 'INDIGO', 'MAGENTA', 'OCRE', 'POURPRE', 'ÉMERAUDE',
        'LAVANDE', 'CARMIN', 'AZUR', 'FUCHSIA', 'GRENAT',
    ],
    'Matériaux': [
        'ALUMINIUM', 'BRONZE', 'GRANIT', 'PORCELAINE', 'CUIVRE', 'MARBRE', 'PLATINE',
        'ARGILE', 'BÉTON', 'IVOIRE', 'VELOURS', 'LIÈGE',
    ],
    'Instruments de musique': [
        'VIOLONCELLE', 'TROMPETTE', 'ACCORDÉON', 'HARPE', 'CLARINETTE', 'XYLOPHONE', 'TAMBOURIN',
        'CORNEMUSE', 'BANJO', 'HARMONICA', 'MANDOLINE', 'SAXOPHONE',
    ],
    'Insectes': [
        'LIBELLULE', 'COCCINELLE', 'SAUTERELLE', 'MOUSTIQUE', 'LUCIOLE', 'MILLE-PATTES', 'CIGALE',
        'PUCERON', 'BOURDON', 'TERMITE', 'FOURMI', 'PAPILLON',
    ],
    'Oiseaux': [
        'HIRONDELLE', 'ROSSIGNOL', 'CHOUETTE', 'PÉLICAN', 'COLIBRI', 'MÉSANGE', 'ALBATROS',
        'MOINEAU', 'CORBEAU', 'PIVERT', 'CIGOGNE', 'HIBOU',
    ],
    'Créatures fantastiques': [
        'SORCIÈRE', 'DRAGON', 'LICORNE', 'OGRE', 'LUTIN', 'TROLL', 'VAMPIRE',
        'GOBELIN', 'CHIMÈRE', 'SIRÈNE', 'PHÉNIX', 'GRIFFON',
    ],
    'Espace': [
        'SATELLITE', 'FUSÉE', 'NAVETTE', 'COSMONAUTE', 'MÉTÉORITE', 'CONSTELLATION', 'ORBITE',
        'CRATÈRE', 'SUPERNOVA', 'GALAXIE', 'COMBINAISON', 'APESANTEUR',
    ],
    'Jeux & jouets': [
        'TOUPIE', 'CERF-VOLANT', 'MARELLE', 'DOMINO', 'KALÉIDOSCOPE', 'PUZZLE', 'BILBOQUET',
        'OSSELET', 'YOYO', 'TOBOGGAN', 'BALANÇOIRE', 'PELUCHE',
    ],
    'Phénomènes naturels': [
        'ARC-EN-CIEL', 'AURORE', 'MARÉE', 'ÉCLIPSE', 'SÉISME', 'ÉRUPTION', 'TSUNAMI',
        'GEYSER', 'MIRAGE', 'ROSÉE', 'BROUILLARD', 'FOUDRE',
    ],
};

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
    const cinema = await prisma.category.create({ data: { name: 'Cinéma', slug: 'cinema' } });
    const other = await prisma.category.create({ data: { name: 'Autre', slug: 'autre' } });
    console.log('✅ Catégories créées');

    // Groupes + mots
    for (const [theme, words] of Object.entries(wordGroups)) {
        await prisma.wordGroup.create({
            data: {
                theme,
                words: { create: words.map(word => ({ word })) },
            },
        });
    }
    const wordCount = Object.values(wordGroups).flat().length;
    console.log(`✅ ${Object.keys(wordGroups).length} groupes et ${wordCount} mots créés`);

    // Quiz
    await seedQuizzes(prisma, randomUserId, {
        cultureGenerale, sciences, sports, artsCulture,
        technologie, popCulture, musique, videogames, litterature, cinema, other,
    });
}

export async function cleanDatabase(prisma: PrismaClient) {
    // await prisma.account.deleteMany();
    // await prisma.session.deleteMany();
    // await prisma.verificationToken.deleteMany();
    // await prisma.answer.deleteMany();
    // await prisma.question.deleteMany();
    // await prisma.attempt.deleteMany();
    // await prisma.quiz.deleteMany();
    // await prisma.category.deleteMany();
    // await prisma.user.deleteMany();
    await prisma.word.deleteMany();
    await prisma.wordGroup.deleteMany();
}
