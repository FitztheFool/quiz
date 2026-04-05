export const GAME_CONFIG = {
    uno: {
        gameType: 'UNO' as const,
        label: 'UNO',
        icon: '🃏',
        higherIsBetter: true,
        scoreLabel: 'Points',
        description: "Sois le premier à te défausser de toutes tes cartes !",
        rules: "Chaque joueur pose une carte qui correspond à la couleur ou au chiffre de la précédente. Les cartes spéciales (inversion, passe ton tour, +2, joker +4) pimentent la partie. N'oublie pas de crier UNO quand il te reste une seule carte !",
        score: "Le gagnant de chaque manche marque la valeur des cartes restantes : chiffres = valeur faciale, actions = 20 pts, jokers = 50 pts. Le classement est basé sur le total cumulé. En 2v2, les points sont partagés entre coéquipiers.",
    },
    skyjow: {
        gameType: 'SKYJOW' as const,
        label: 'Skyjow',
        icon: '🂠',
        higherIsBetter: false,
        scoreLabel: 'Score moyen',
        description: "Moins de points, c'est mieux !",
        rules: "Chaque joueur gère une grille de 12 cartes face cachée. À ton tour, pioche une carte et échange-la avec l'une de tes cartes. Les colonnes de 3 cartes identiques sont supprimées. La manche se termine quand toutes les cartes d'un joueur sont retournées.",
        score: "Ton score est la somme des cartes restantes dans ta grille. Si tu déclenches la fin de manche sans avoir le plus petit score, le tien est doublé ! Le classement repose sur le score moyen par partie.",
    },
    taboo: {
        gameType: 'TABOO' as const,
        label: 'Taboo',
        icon: '🗣️',
        higherIsBetter: true,
        scoreLabel: 'Points',
        description: "Fais deviner un maximum de mots sans prononcer les mots interdits !",
        rules: "Par équipes, un orateur décrit un mot mystère à son équipe en évitant les mots tabous listés sur la carte. L'équipe adverse surveille les infractions. Chaque mot deviné dans le temps imparti rapporte un point.",
        score: "1 point par mot deviné. 1 point par mot piégé activé. Le classement correspond au total de mots devinés sur l'ensemble des parties.",
    },
    quiz: {
        gameType: 'QUIZ' as const,
        label: 'Quiz',
        icon: '🎯',
        higherIsBetter: true,
        scoreLabel: 'Score total',
        description: "Teste tes connaissances sur tous les sujets !",
        rules: "Réponds aux questions le plus vite possible. Selon le mode choisi, un chrono par question ou global peut limiter ton temps. Les questions peuvent être vrai/faux, QCM ou texte libre.",
        score: "Pour chaque quiz, seul ton meilleur score est conservé. Ton score total correspond à la somme de tes meilleurs résultats sur tous les quiz joués.",
    },
    yahtzee: {
        gameType: 'YAHTZEE' as const,
        label: 'Yahtzee',
        icon: '🎲',
        higherIsBetter: true,
        scoreLabel: 'Score total',
        description: "Lance les dés et remplis intelligemment ta fiche de score !",
        rules: "À ton tour, lance 5 dés jusqu'à 3 fois en gardant ceux que tu veux. Place ensuite le résultat dans l'une des catégories de ta fiche (brelan, full, grande suite, Yahtzee…). Chaque case ne peut être remplie qu'une seule fois.",
        score: "Bonus de +35 pts si la section haute (1 à 6) atteint 63 pts. +100 pts pour chaque Yahtzee supplémentaire. Le classement est basé sur le score total cumulé sur toutes les parties.",
    },
    puissance4: {
        gameType: 'PUISSANCE4' as const,
        label: 'Puissance 4',
        icon: '🔴',
        higherIsBetter: true,
        scoreLabel: 'Victoires',
        description: "Aligne 4 pions avant ton adversaire !",
        rules: "À tour de rôle, chaque joueur lâche un pion dans une colonne de la grille. Les pions tombent au bas de la colonne. Le premier à aligner 4 pions (horizontalement, verticalement ou en diagonale) remporte la manche.",
        score: "1 point par victoire. Le classement est basé sur le total de victoires accumulées.",
    },
    just_one: {
        gameType: 'JUST_ONE' as const,
        label: 'Just One',
        icon: '🔤',
        higherIsBetter: true,
        scoreLabel: 'Score moyen',
        description: "Jeu coopératif : aidez le devineur à trouver le mot mystère !",
        rules: "Un joueur ferme les yeux pendant que les autres écrivent chacun un indice. Les indices identiques sont annulés avant d'être montrés au devineur. Il ne reste qu'un essai pour trouver le mot !",
        score: "1 point par mot trouvé, sur 13 manches au total. Le classement reflète le score moyen de l'équipe par partie.",
    },
    battleship: {
        gameType: 'BATTLESHIP' as const,
        label: 'Bataille Navale',
        icon: '🚢',
        higherIsBetter: true,
        scoreLabel: 'Victoires',
        description: "Coule la flotte ennemie avant que la tienne ne disparaisse !",
        rules: "Chaque joueur place secrètement sa flotte sur une grille. À tour de rôle, annoncez une case pour tenter de toucher un navire adverse. Un coup qui touche permet de rejouer. La partie se termine quand toute la flotte d'un joueur est coulée.",
        score: "1 point par victoire. Le classement est basé sur le nombre total de victoires.",
    },
    diamant: {
        gameType: 'DIAMANT' as const,
        label: 'Diamant',
        icon: '💎',
        higherIsBetter: true,
        scoreLabel: 'Points',
        description: "Explorez la grotte et repartez avant qu'il ne soit trop tard !",
        rules: "Chaque tour, une carte est retournée : des gemmes à ramasser ou un danger. Tous les joueurs encore dans la grotte se partagent les gemmes. Avant chaque carte, décidez de continuer ou de sortir pour sécuriser vos gains. Si le même danger apparaît deux fois, tous ceux restés dans la grotte repartent les mains vides. Les reliques ne peuvent être récupérées que par un joueur sortant seul : les 3 premières valent 2 💎 chacune, les suivantes 4 💎.",
        score: "Les gemmes rapportées dans votre coffre comptent comme points. Le classement est basé sur le total de points cumulés sur 5 manches.",
    },
    impostor: {
        gameType: 'IMPOSTOR' as const,
        label: 'Imposteur',
        icon: '🎭',
        higherIsBetter: true,
        scoreLabel: 'Points',
        description: "Un imposteur se cache parmi vous — saurez-vous le démasquer ?",
        rules: "Les joueurs normaux reçoivent un mot secret et donnent des indices sans se trahir. L'imposteur, qui ignore le mot, doit improviser et se fondre dans la masse. Après les tours de parole, tout le monde vote pour éliminer le suspect. L'imposteur est éliminé lorsqu'il reçoit le plus de votes.",
        score: "<p>Imposteur éliminé (pluralité — pas besoin de majorité absolue) : <ul><li>+2 pts pour chaque joueur ayant voté pour lui</li><li>+1 pts par joueur de l'équipe</li></ul></p><br><p>Vote raté : <ul><li>+3 pts pour l'imposteur</li><li>+1 pts par joueur ayant voté pour lui</li></ul></p><br><p>Dans tous les cas, l'imposteur peut tenter de deviner le mot mystère après le vote. S'il devine correctement : +2 pts et il remporte la manche malgré l'élimination. Le classement est basé sur le total de points cumulés.</p>",
    },
} as const;

export type GameType = keyof typeof GAME_CONFIG;

export const GAME_EMOJI_MAP = Object.fromEntries(
    Object.values(GAME_CONFIG).map(g => [g.gameType, g.icon])
) as Record<string, string>;

export const GAME_LABEL_MAP = Object.fromEntries(
    Object.values(GAME_CONFIG).map(g => [g.gameType, g.label])
) as Record<string, string>;

export const GAME_OPTIONS = Object.entries(GAME_CONFIG).map(([key, g]) => ({
    value: key as GameType,
    icon: g.icon,
    label: g.label,
}));

export const MAX_PLAYERS_BY_GAME: Record<GameType, number[]> = {
    quiz: Array.from({ length: 30 }, (_, i) => i + 1),
    uno: [2, 3, 4, 5, 6, 7, 8],
    taboo: [4, 5, 6, 7, 8, 9, 10, 11, 12],
    skyjow: [2, 3, 4, 5, 6, 7, 8],
    yahtzee: [2, 3, 4, 5, 6, 7, 8],
    puissance4: [2],
    just_one: [3, 4, 5, 6, 7],
    battleship: [2],
    diamant: [2, 3, 4, 5, 6, 7, 8],
    impostor: [4, 5, 6, 7, 8],
};

export const MIN_PLAYERS: Partial<Record<GameType, number>> = {
    quiz: 1,
    puissance4: 2,
    taboo: 4,
    just_one: 3,
    battleship: 2,
    diamant: 2,
    impostor: 4,
};

export const NO_OPTIONS_GAMES: Partial<Record<GameType, string>> = {
    yahtzee: `${GAME_CONFIG.yahtzee.icon} Yahtzee — 2 à 8 joueurs`,
    puissance4: `${GAME_CONFIG.puissance4.icon} Puissance 4 — solo (vs bot) ou 2 joueurs.`,
    battleship: `${GAME_CONFIG.battleship.icon} Bataille Navale — solo (vs bot) ou 2 joueurs.`,
    just_one: `${GAME_CONFIG.just_one.icon} Just One — 3 à 7 joueurs.`,
    diamant: `${GAME_CONFIG.diamant.icon} Diamant — 2 à 8 joueurs.`,
};

export const BOT_SUPPORTED_GAMES: Set<string> = new Set(['puissance4', 'yahtzee', 'diamant', 'battleship', 'uno', 'skyjow']);

export const SOLO_GAMES: Record<string, string> = {
    yahtzee: '#A32D2D',
    quiz: '#A32D2D',
    puissance4: '#A32D2D',
    diamant: '#A32D2D',
    battleship: '#A32D2D',
    uno: '#A32D2D',
    skyjow: '#A32D2D',
    //uno: '#185FA5',
};

// URL slugs for games that use /[slug]/[lobbyId]/[gameId] routing (excludes quiz)
export const GAME_URL_SLUGS = ['uno', 'skyjow', 'taboo', 'yahtzee', 'puissance4', 'just-one', 'battleship', 'diamant', 'impostor'] as const;

export const GAME_ROUTES: Partial<Record<GameType, (lobbyId: string, gameId?: string) => string>> = {
    uno: (id, gid) => gid ? `/uno/${id}/${gid}` : `/uno/${id}`,
    taboo: (id, gid) => gid ? `/taboo/${id}/${gid}` : `/taboo/${id}`,
    skyjow: (id, gid) => gid ? `/skyjow/${id}/${gid}` : `/skyjow/${id}`,
    yahtzee: (id, gid) => gid ? `/yahtzee/${id}/${gid}` : `/yahtzee/${id}`,
    puissance4: (id, gid) => gid ? `/puissance4/${id}/${gid}` : `/puissance4/${id}`,
    just_one: (id, gid) => gid ? `/just-one/${id}/${gid}` : `/just-one/${id}`,
    battleship: (id, gid) => gid ? `/battleship/${id}/${gid}` : `/battleship/${id}`,
    diamant: (id, gid) => gid ? `/diamant/${id}/${gid}` : `/diamant/${id}`,
    impostor: (id, gid) => gid ? `/impostor/${id}/${gid}` : `/impostor/${id}`,
    quiz: (id, gid) => gid ? `/quiz/${id}/${gid}` : `/quiz/${id}`,
};
