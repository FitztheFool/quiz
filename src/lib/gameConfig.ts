export const GAME_CONFIG = {
    uno: {
        gameType: 'UNO' as const,
        label: 'UNO',
        icon: '🃏',
        higherIsBetter: true,
        scoreLabel: 'Points',
        description: "À UNO, plus tu marques de points, mieux c'est ! À chaque manche, le gagnant récupère la valeur des cartes restantes des autres joueurs (chiffres = valeur, actions = 20 pts, jokers = 50 pts). Le classement est basé sur le total des points cumulés sur toutes les parties. En 2v2, les points sont partagés entre les coéquipiers.",
    },
    skyjow: {
        gameType: 'SKYJOW' as const,
        label: 'Skyjow',
        icon: '🂠',
        higherIsBetter: false,
        scoreLabel: 'Score moyen',
        description: "À Skyjow, moins de points c'est mieux ! Le classement repose sur le score moyen par partie (somme des cartes restantes). Les colonnes de 3 cartes identiques sont supprimées. Attention : si tu déclenches la fin de manche sans avoir le plus petit score, le tien est doublé.",
    },
    taboo: {
        gameType: 'TABOO' as const,
        label: 'Taboo',
        icon: '🗣️',
        higherIsBetter: true,
        scoreLabel: 'Mots devinés',
        description: "Fais deviner un maximum de mots à ton équipe sans utiliser les mots interdits ! Chaque mot trouvé rapporte 1 point. Le classement correspond au total de mots devinés sur l'ensemble des parties.",
    },
    quiz: {
        gameType: 'QUIZ' as const,
        label: 'Quiz',
        icon: '🎯',
        higherIsBetter: true,
        scoreLabel: 'Score total',
        description: "Teste tes connaissances ! Pour chaque quiz, seul ton meilleur score est conservé. Ton score total correspond à la somme de tes meilleurs résultats sur tous les quiz joués.",
    },
    yahtzee: {
        gameType: 'YAHTZEE' as const,
        label: 'Yahtzee',
        icon: '🎲',
        higherIsBetter: true,
        scoreLabel: 'Score total',
        description: "Accumule un maximum de points en remplissant intelligemment les différentes catégories. Bonus : +35 points si la section haute atteint 63, et +100 pour chaque Yahtzee supplémentaire. Le classement est basé sur le score total cumulé.",
    },
    puissance4: {
        gameType: 'PUISSANCE4' as const,
        label: 'Puissance 4',
        icon: '🔴',
        higherIsBetter: true,
        scoreLabel: 'Victoires',
        description: "Aligne 4 pions avant ton adversaire pour gagner ! Chaque victoire rapporte 1 point. Le classement est basé sur le total de victoires accumulées.",
    },
    'just-one': {
        gameType: 'JUST_ONE' as const,
        label: 'Just One',
        icon: '🔤',
        higherIsBetter: true,
        scoreLabel: 'Score moyen',
        description: "Jeu coopératif : fais deviner un mot mystère avec des indices uniques. Les indices identiques sont annulés ! Le score (sur 13) reflète la performance moyenne de ton équipe.",
    },
    battleship: {
        gameType: 'BATTLESHIP' as const,
        label: 'Bataille Navale',
        icon: '🚢',
        higherIsBetter: true,
        scoreLabel: 'Victoires',
        description: "Coule la flotte ennemie avant que la tienne ne disparaisse ! Chaque partie gagnée rapporte 1 point. Le classement est basé sur le nombre total de victoires.",
    },
    diamant: {
        gameType: 'DIAMANT' as const,
        label: 'Diamant',
        icon: '💎',
        higherIsBetter: true,
        scoreLabel: 'Points',
        description: "Explorez la grotte de Tacora et ramassez un maximum de diamants ! Chaque tour, décidez de continuer ou de sortir prudemment. Si le même danger apparaît deux fois, tous ceux encore dans la grotte repartent les mains vides. Le joueur avec le plus de rubis dans son coffre à la fin des 5 manches gagne.",
    },
    impostor: {
        gameType: 'IMPOSTOR' as const,
        label: 'Imposteur',
        icon: '🎭',
        higherIsBetter: true,
        scoreLabel: 'Victoires',
        description: "Un imposteur se cache parmi vous ! Les joueurs normaux reçoivent un mot secret et doivent donner des indices sans se trahir. L'imposteur improvise sans connaître le mot. Après les tours de parole, votez pour éliminer le suspect !",
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
    quiz: Array.from({ length: 19 }, (_, i) => i + 2),
    uno: [2, 3, 4, 5, 6, 7, 8],
    taboo: [4, 5, 6, 7, 8, 10, 12],
    skyjow: [2, 3, 4, 5, 6, 7, 8],
    yahtzee: [2, 3, 4, 5, 6, 7, 8],
    puissance4: [2],
    'just-one': [3, 4, 5, 6, 7],
    battleship: [2],
    diamant: [2, 3, 4, 5, 6, 7, 8],
    impostor: [4, 5, 6, 7, 8],
};

export const MIN_PLAYERS: Partial<Record<GameType, number>> = {
    puissance4: 2,
    taboo: 4,
    'just-one': 3,
    battleship: 2,
    diamant: 2,
    impostor: 4,
};

export const EXACT_PLAYERS: Partial<Record<GameType, number>> = {
    puissance4: 2,
    battleship: 2,
};

export const NO_OPTIONS_GAMES: Partial<Record<GameType, string>> = {
    yahtzee: '🎲 Yahtzee — aucune option.',
    puissance4: '🔘 Puissance 4 — exactement 2 joueurs.',
    'just-one': `${GAME_CONFIG['just-one'].icon} Just One — 3 à 7 joueurs.`,
    diamant: `${GAME_CONFIG.diamant.icon} Diamant — 2 à 8 joueurs.`,
};

export const GAME_ROUTES: Partial<Record<GameType, (lobbyId: string) => string>> = {
    uno: (id) => `/uno/${id}`,
    taboo: (id) => `/taboo/${id}`,
    skyjow: (id) => `/skyjow/${id}`,
    yahtzee: (id) => `/yahtzee/${id}`,
    puissance4: (id) => `/puissance4/${id}`,
    'just-one': (id) => `/just-one/${id}`,
    battleship: (id) => `/battleship/${id}`,
    diamant: (id) => `/diamant/${id}`,
    impostor: (id) => `/impostor/${id}`,
};
