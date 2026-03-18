export const GAME_CONFIG = {
    uno: {
        gameType: 'UNO' as const,
        label: 'UNO',
        icon: '🃏',
        higherIsBetter: true,
        scoreLabel: 'Points',
        description: 'À UNO, plus tu marques de points mieux c\'est : à chaque manche le gagnant additionne la valeur des cartes restantes des autres joueurs (chiffres = valeur, actions = 20 pts, jokers = 50 pts). Le classement est basé sur le total des points cumulés sur toutes les parties jouées. En mode 2v2, les points sont partagés entre les membres de l\'équipe.',
    },
    skyjow: {
        gameType: 'SKYJOW' as const,
        label: 'Skyjow',
        icon: '🂠',
        higherIsBetter: false,
        scoreLabel: 'Score moyen',
        description: "À Skyjow, moins de points c'est mieux ! Le classement est basé sur le score moyen par partie (somme des cartes restantes). Les colonnes de 3 cartes identiques sont éliminées. Le déclencheur du dernier tour voit son score doublé s'il n'est pas le meilleur.",
    },
    taboo: {
        gameType: 'TABOO' as const,
        label: 'Taboo',
        icon: '🗣️',
        higherIsBetter: true,
        scoreLabel: 'Points',
        description: "Le score représente le nombre de mots devinés par ton équipe sur l'ensemble des parties. Un mot deviné ou qui se fait buzzer comme piégé rapporte 10 point à l'équipe.",
    },
    quiz: {
        gameType: 'QUIZ' as const,
        label: 'Quiz',
        icon: '🎯',
        higherIsBetter: true,
        scoreLabel: 'Score total',
        description: 'Classement basé sur le meilleur score cumulé par quiz. Pour chaque quiz, seul ton meilleur score est comptabilisé. Le score total est la somme de tes meilleurs scores sur tous les quiz complétés.',
    },
    yahtzee: {
        gameType: 'YAHTZEE' as const,
        label: 'Yahtzee',
        icon: '🎲',
        higherIsBetter: true,
        scoreLabel: 'Score total',
        description: 'Classement basé sur le score total cumulé sur toutes les parties. Chaque catégorie bien remplie rapporte des points, avec des bonus pour la section haute (≥63 pts = +35) et les Yahtzee supplémentaires (+100 chacun).',
    },
    puissance4: {
        gameType: 'PUISSANCE4' as const,
        label: 'Puissance 4',
        icon: '🔴',
        higherIsBetter: true,
        scoreLabel: 'Victoires',
        description: 'Classement basé sur le nombre de victoires cumulées. Chaque victoire rapporte 1 point, et le total de points détermine le classement général.',
    },
    'just-one': {
        gameType: 'JUST_ONE' as const,
        label: 'Just One',
        icon: '🔤',
        higherIsBetter: true,
        scoreLabel: 'Score moyen',
        description: 'Jeu coopératif : les joueurs écrivent chacun un indice pour faire deviner un mot mystère. Les indices identiques sont annulés. Le score final (sur 13) reflète la performance collective de l\'équipe.',
    },
    'battleship': {
        gameType: 'BATTLESHIP' as const,
        label: 'Bataille Navale',
        icon: '🚢',
        higherIsBetter: true,
        scoreLabel: 'Victoires',
        description: '',
    },
} as const;

export const GAME_EMOJI_MAP = Object.fromEntries(
    Object.values(GAME_CONFIG).map(g => [g.gameType, g.icon])
) as Record<string, string>;

export const GAME_LABEL_MAP = Object.fromEntries(
    Object.values(GAME_CONFIG).map(g => [g.gameType, g.label])
) as Record<string, string>;

export type GameType = keyof typeof GAME_CONFIG;

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
};

export const MIN_PLAYERS: Partial<Record<GameType, number>> = {
    puissance4: 2,
    battleship: 2,
    taboo: 4,
    'just-one': 3,
};

export const EXACT_PLAYERS: Partial<Record<GameType, number>> = {
    puissance4: 2,
    battleship: 2,
};

export const NO_OPTIONS_GAMES: Partial<Record<GameType, string>> = {
    yahtzee: '🎲 Yahtzee — aucune option.',
    puissance4: '🔘 Puissance 4 — exactement 2 joueurs.',
    'just-one': `${GAME_CONFIG['just-one'].icon} Just One — 3 à 7 joueurs.`,
};

export const GAME_ROUTES: Partial<Record<GameType, (lobbyId: string) => string>> = {
    uno: (id) => `/uno/${id}`,
    taboo: (id) => `/taboo/${id}`,
    skyjow: (id) => `/skyjow/${id}`,
    yahtzee: (id) => `/yahtzee/${id}`,
    puissance4: (id) => `/puissance4/${id}`,
    'just-one': (id) => `/just-one/${id}`,
    'battleship': (id) => `/battleship/${id}`,
};
