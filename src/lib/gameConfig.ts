export const GAME_COLOR: Record<string, {
    selected: string;
    badge: string;
    badgeActive: string;
    card: { border: string; bg: string; label: string };
}> = {
    UNO:        { selected: 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-300',             badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',            badgeActive: 'bg-red-600 text-white border-red-600',            card: { border: 'border-red-200 dark:border-red-800/60',    bg: 'bg-red-50 dark:bg-red-900/15',       label: 'text-red-700 dark:text-red-400' } },
    SKYJOW:     { selected: 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-300',             badge: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400',            badgeActive: 'bg-sky-600 text-white border-sky-600',            card: { border: 'border-sky-200 dark:border-sky-800/60',    bg: 'bg-sky-50 dark:bg-sky-900/15',       label: 'text-sky-700 dark:text-sky-400' } },
    TABOO:      { selected: 'border-pink-500 bg-pink-500/10 text-pink-600 dark:text-pink-300',         badge: 'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-400',          badgeActive: 'bg-pink-600 text-white border-pink-600',          card: { border: 'border-pink-200 dark:border-pink-800/60',  bg: 'bg-pink-50 dark:bg-pink-900/15',     label: 'text-pink-700 dark:text-pink-400' } },
    QUIZ:       { selected: 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300', badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400', badgeActive: 'bg-emerald-600 text-white border-emerald-600', card: { border: 'border-emerald-200 dark:border-emerald-800/60', bg: 'bg-emerald-50 dark:bg-emerald-900/15', label: 'text-emerald-700 dark:text-emerald-400' } },
    YAHTZEE:    { selected: 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-300', badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',  badgeActive: 'bg-orange-500 text-white border-orange-500',      card: { border: 'border-orange-200 dark:border-orange-800/60', bg: 'bg-orange-50 dark:bg-orange-900/15', label: 'text-orange-700 dark:text-orange-400' } },
    PUISSANCE4: { selected: 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-300',         badge: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400',          badgeActive: 'bg-rose-600 text-white border-rose-600',          card: { border: 'border-rose-200 dark:border-rose-800/60',  bg: 'bg-rose-50 dark:bg-rose-900/15',     label: 'text-rose-700 dark:text-rose-400' } },
    JUST_ONE:   { selected: 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-300', badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',  badgeActive: 'bg-purple-600 text-white border-purple-600',      card: { border: 'border-purple-200 dark:border-purple-800/60', bg: 'bg-purple-50 dark:bg-purple-900/15', label: 'text-purple-700 dark:text-purple-400' } },
    BATTLESHIP: { selected: 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-300',         badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',          badgeActive: 'bg-blue-600 text-white border-blue-600',          card: { border: 'border-blue-200 dark:border-blue-800/60',  bg: 'bg-blue-50 dark:bg-blue-900/15',     label: 'text-blue-700 dark:text-blue-400' } },
    DIAMANT:    { selected: 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-300',     badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',      badgeActive: 'bg-amber-500 text-white border-amber-500',        card: { border: 'border-amber-200 dark:border-amber-800/60', bg: 'bg-amber-50 dark:bg-amber-900/15',  label: 'text-amber-700 dark:text-amber-400' } },
    IMPOSTOR:   { selected: 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-300', badge: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400',  badgeActive: 'bg-violet-600 text-white border-violet-600',      card: { border: 'border-violet-200 dark:border-violet-800/60', bg: 'bg-violet-50 dark:bg-violet-900/15', label: 'text-violet-700 dark:text-violet-400' } },
};

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
    just_one: {
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
        scoreLabel: 'Points',
        description: "Un imposteur se cache parmi vous ! Les joueurs normaux reçoivent un mot secret et donnent des indices sans se trahir ; l'imposteur improvise. Après les tours de parole, tout le monde vote pour éliminer le suspect. Si l'imposteur est éliminé : chaque joueur normal gagne +2 pts, +1 bonus s'il a bien voté. Si le vote échoue : l'imposteur gagne +3 pts. L'imposteur peut aussi tenter de deviner le mot secret pour +2 pts supplémentaires. Le classement est basé sur le total de points cumulés.",
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
    just_one: [3, 4, 5, 6, 7],
    battleship: [2],
    diamant: [2, 3, 4, 5, 6, 7, 8],
    impostor: [4, 5, 6, 7, 8],
};

export const MIN_PLAYERS: Partial<Record<GameType, number>> = {
    puissance4: 2,
    taboo: 4,
    just_one: 3,
    battleship: 2,
    diamant: 2,
    impostor: 4,
};

export const EXACT_PLAYERS: Partial<Record<GameType, number>> = {
    puissance4: 2,
    battleship: 2,
};

export const NO_OPTIONS_GAMES: Partial<Record<GameType, string>> = {
    yahtzee: `${GAME_CONFIG.yahtzee.icon} Yahtzee — 2 à 8 joueurs`,
    puissance4: `${GAME_CONFIG.puissance4.icon} Puissance 4 — exactement 2 joueurs.`,
    just_one: `${GAME_CONFIG.just_one.icon} Just One — 3 à 7 joueurs.`,
    diamant: `${GAME_CONFIG.diamant.icon} Diamant — 2 à 8 joueurs.`,
};

export const GAME_ROUTES: Partial<Record<GameType, (lobbyId: string) => string>> = {
    uno: (id) => `/uno/${id}`,
    taboo: (id) => `/taboo/${id}`,
    skyjow: (id) => `/skyjow/${id}`,
    yahtzee: (id) => `/yahtzee/${id}`,
    puissance4: (id) => `/puissance4/${id}`,
    just_one: (id) => `/just-one/${id}`,
    battleship: (id) => `/battleship/${id}`,
    diamant: (id) => `/diamant/${id}`,
    impostor: (id) => `/impostor/${id}`,
};
