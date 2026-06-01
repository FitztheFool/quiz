export const GAME_CONFIG = {
    uno: {
        gameType: 'UNO' as const,
        label: 'UNO',
        mode: 'both' as const,
        higherIsBetter: true,
        scoreLabel: 'Points',
        description: "Sois le premier à te défausser de toutes tes cartes !",
        players: '1 – 8 joueurs',
        rules: "Chaque joueur pose une carte qui correspond à la couleur ou au chiffre de la précédente. Les cartes spéciales (inversion, passe ton tour, +2, joker +4) pimentent la partie. N'oublie pas de crier UNO quand il te reste une seule carte !",
        score: "Le gagnant de chaque manche marque la valeur des cartes restantes : chiffres = valeur faciale, actions = 20 pts, jokers = 50 pts. Le classement est basé sur le total cumulé. En 2v2, les points sont partagés entre coéquipiers.",
    },
    skyjow: {
        gameType: 'SKYJOW' as const,
        label: 'Skyjow',
        mode: 'both' as const,
        higherIsBetter: false,
        scoreLabel: 'Score moyen',
        description: "Moins de points, c'est mieux !",
        players: '1 – 8 joueurs',
        rules: "Chaque joueur gère une grille de 12 cartes face cachée. À ton tour, pioche une carte et échange-la avec l'une de tes cartes. Les colonnes de 3 cartes identiques sont supprimées. La manche se termine quand toutes les cartes d'un joueur sont retournées.",
        score: "Ton score est la somme des cartes restantes dans ta grille. Si tu déclenches la fin de manche sans avoir le plus petit score, le tien est doublé ! Le classement repose sur le score moyen par partie.",
    },
    taboo: {
        gameType: 'TABOO' as const,
        label: 'Taboo',
        mode: 'multi' as const,
        higherIsBetter: true,
        scoreLabel: 'Points',
        description: "Fais deviner un maximum de mots sans prononcer les mots interdits !",
        players: '4 – 12 joueurs',
        rules: "Par équipes, un orateur décrit un mot mystère à son équipe en évitant les mots tabous listés sur la carte. L'équipe adverse surveille les infractions. Chaque mot deviné dans le temps imparti rapporte un point.",
        score: "1 point par mot deviné. 1 point par mot piégé activé. Le classement correspond au total de mots devinés sur l'ensemble des parties.",
    },
    quiz: {
        gameType: 'QUIZ' as const,
        label: 'Quiz',
        mode: 'both' as const,
        higherIsBetter: true,
        scoreLabel: 'Score total',
        description: "Teste tes connaissances sur tous les sujets !",
        players: '1-30 joueurs',
        rules: "Réponds aux questions le plus vite possible. Selon le mode choisi, un chrono par question ou global peut limiter ton temps. Les questions peuvent être vrai/faux, QCM ou texte libre.",
        score: "Pour chaque quiz, seul ton meilleur score est conservé. Ton score total correspond à la somme de tes meilleurs résultats sur tous les quiz joués.",
    },
    yahtzee: {
        gameType: 'YAHTZEE' as const,
        label: 'Yahtzee',
        mode: 'both' as const,
        higherIsBetter: true,
        scoreLabel: 'Score total',
        description: "Lance les dés et remplis intelligemment ta fiche de score !",
        players: '1 – 8 joueurs',
        rules: "À ton tour, lance 5 dés jusqu'à 3 fois en gardant ceux que tu veux. Place ensuite le résultat dans l'une des catégories de ta fiche (brelan, full, grande suite, Yahtzee…). Chaque case ne peut être remplie qu'une seule fois.",
        score: "Bonus de +35 pts si la section haute (1 à 6) atteint 63 pts. +100 pts pour chaque Yahtzee supplémentaire. Le classement est basé sur le score total cumulé sur toutes les parties.",
    },
    puissance4: {
        gameType: 'PUISSANCE4' as const,
        label: 'Puissance 4',
        mode: 'both' as const,
        higherIsBetter: true,
        scoreLabel: 'Victoires',
        description: "Aligne 4 pions avant ton adversaire !",
        players: 'vs bot ou 2j',
        rules: "À tour de rôle, chaque joueur lâche un pion dans une colonne de la grille. Les pions tombent au bas de la colonne. Le premier à aligner 4 pions (horizontalement, verticalement ou en diagonale) remporte la manche.",
        score: "1 point par victoire. Le classement est basé sur le total de victoires accumulées.",
    },
    just_one: {
        gameType: 'JUST_ONE' as const,
        label: 'Just One',
        mode: 'multi' as const,
        higherIsBetter: true,
        scoreLabel: 'Score moyen',
        description: "Jeu coopératif : aidez le devineur à trouver le mot mystère !",
        players: '3 – 7 joueurs',
        rules: "Un joueur ferme les yeux pendant que les autres écrivent chacun un indice. Les indices identiques sont annulés avant d'être montrés au devineur. Il ne reste qu'un essai pour trouver le mot !",
        score: "1 point par mot trouvé, sur 13 manches au total. Le classement reflète le score moyen de l'équipe par partie.",
    },
    battleship: {
        gameType: 'BATTLESHIP' as const,
        label: 'Bataille Navale',
        mode: 'both' as const,
        higherIsBetter: true,
        scoreLabel: 'Victoires',
        description: "Coule la flotte ennemie avant que la tienne ne disparaisse !",
        players: 'vs bot ou 2j',
        rules: "Chaque joueur place secrètement sa flotte sur une grille. À tour de rôle, annoncez une case pour tenter de toucher un navire adverse. Un coup qui touche permet de rejouer. La partie se termine quand toute la flotte d'un joueur est coulée.",
        score: "1 point par victoire. Le classement est basé sur le nombre total de victoires.",
    },
    diamant: {
        gameType: 'DIAMANT' as const,
        label: 'Diamant',
        mode: 'both' as const,
        higherIsBetter: true,
        scoreLabel: 'Points',
        description: "Explorez la grotte et repartez avant qu'il ne soit trop tard !",
        players: '1 – 8 joueurs',
        rules: "Chaque tour, une carte est retournée : des gemmes à ramasser ou un danger. Tous les joueurs encore dans la grotte se partagent les gemmes. Avant chaque carte, décidez de continuer ou de sortir pour sécuriser vos gains. Si le même danger apparaît deux fois, tous ceux restés dans la grotte repartent les mains vides. Les reliques ne peuvent être récupérées que par un joueur sortant seul : les 3 premières valent 10 diamant chacune, les suivantes 20.",
        score: "Les gemmes rapportées dans votre coffre comptent comme points. Le classement est basé sur le total de points cumulés sur 5 manches.",
    },
    ludo: {
        gameType: 'LUDO' as const,
        label: 'Ludo',
        mode: 'both' as const,
        higherIsBetter: true,
        scoreLabel: 'Victoires',
        description: "Sortez vos 4 pions, rentrez-les à la maison avant les autres !",
        players: '2 – 4 joueurs (ou vs bot)',
        rules: "Lancez le dé chacun votre tour pour avancer vos pions. Selon les options, sortir un pion de la base nécessite un 6 (ou 1, ou n'importe quel score). Capturez les pions adverses en atterrissant dessus pour les renvoyer à leur base. Les cases étoilées sont sûres. Le premier joueur à amener ses 4 pions à la maison gagne.",
        score: "1 point par victoire. Le classement est basé sur le total de victoires accumulées.",
    },
    perudo: {
        gameType: 'PERUDO' as const,
        label: 'Perudo',
        mode: 'both' as const,
        higherIsBetter: true,
        scoreLabel: 'Victoires',
        description: "Bluffez et démasquez vos adversaires au jeu des dés !",
        players: '2 – 6 joueurs (ou vs bot)',
        rules: "Chaque joueur lance ses dés en secret. À tour de rôle, faites une annonce (X dés de valeur Y) qui doit dépasser strictement la précédente. Les 1 sont wild — ils comptent pour n'importe quelle face. Si vous ne croyez pas l'annonce, criez « Dudo » : on révèle tous les dés. Si l'annonce est tenue, le challenger perd un dé ; sinon, c'est l'annonceur. À 0 dé, vous êtes éliminé.",
        score: "1 point par victoire. Le classement est basé sur le total de victoires.",
    },
    cant_stop: {
        gameType: 'CANT_STOP' as const,
        label: "Can't Stop",
        mode: 'both' as const,
        higherIsBetter: true,
        scoreLabel: 'Victoires',
        description: "Push-your-luck aux dés — claim 3 colonnes pour gagner !",
        players: '2 – 4 joueurs (ou vs bot)',
        rules: "Lancez 4 dés et choisissez un des 3 splits. Avancez vos marqueurs sur les colonnes correspondant aux sommes. 3 marqueurs temporaires max par tour. Continuez ou stoppez pour banker. Si aucun split légal possible → bust, vous perdez la progression du tour. Premier à claim 3 colonnes au sommet gagne.",
        score: "1 point par victoire. Le classement est basé sur le total de victoires.",
    },
    mille_bornes: {
        gameType: 'MILLE_BORNES' as const,
        label: 'Mille Bornes',
        mode: 'both' as const,
        higherIsBetter: true,
        scoreLabel: 'Victoires',
        description: "La course de cartes — atteignez la distance avant vos adversaires !",
        players: '2 – 4 joueurs (ou vs bot)',
        rules: "Posez des cartes Distance (25 à 200 km) pour avancer, à condition d'avoir un feu vert. Attaquez n'importe quel adversaire avec une attaque (Stop, Limite de vitesse, Accident, Panne d'essence, Crevaison) ; il doit jouer la parade correspondante pour repartir. Les 4 bottes (Prioritaire, As du volant, Citerne, Increvable) immunisent et, jouées juste après l'attaque correspondante, réussissent un Coup Fourré (rejouez aussitôt). Le premier à atteindre exactement la distance cible (700 ou 1000 km) gagne la manche.",
        score: "1 point par victoire. Le classement est basé sur le total de victoires.",
    },
    impostor: {
        gameType: 'IMPOSTOR' as const,
        label: 'Imposteur',
        mode: 'multi' as const,
        higherIsBetter: true,
        scoreLabel: 'Points',
        description: "Un imposteur se cache parmi vous — saurez-vous le démasquer ?",
        players: '4 – 8 joueurs',
        rules: "Les joueurs normaux reçoivent un mot secret et donnent des indices sans se trahir. L'imposteur, qui ignore le mot, doit improviser et se fondre dans la masse. En option, un Mister White reçoit un mot différent mais de la même catégorie — il ne sait pas qu'il est Mister White. Après les tours de parole, tout le monde vote pour éliminer l'imposteur et (si l'option est activée) le Mister White.",
        score: "<p>Imposteur éliminé : <ul><li>+2 pts pour chaque joueur ayant voté pour lui</li><li>+1 pt par joueur de l'équipe</li></ul></p><br><p>Vote raté : <ul><li>+3 pts pour l'imposteur</li><li>+1 pt par joueur ayant quand même voté pour lui</li></ul></p><br><p>Mister White (si option activée) : <ul><li>Non identifié : +2 pts pour le Mister White</li><li>Identifié : +1 pt pour chaque joueur ayant voté pour lui</li></ul></p><br><p>Dans tous les cas, l'imposteur peut tenter de deviner le mot mystère après le vote. S'il devine correctement : +2 pts et il remporte la manche malgré l'élimination. Le classement est basé sur le total de points cumulés.</p>",
    },
    spyfall: {
        gameType: 'SPYFALL' as const,
        label: 'Spyfall',
        mode: 'multi' as const,
        higherIsBetter: true,
        scoreLabel: 'Points',
        description: "Un lieu secret, un espion infiltré — interrogez-vous pour le démasquer (idéal en appel vocal).",
        players: '3 – 8 joueurs',
        rules: "Tout le monde connaît le lieu (et reçoit un rôle) sauf l'espion. À tour de rôle, le joueur actif interroge un autre joueur à l'oral (il le désigne d'un tap), puis le bâton passe à la personne interrogée. Les civils cherchent à démasquer l'espion par des questions fines sans révéler le lieu ; l'espion bluffe et tente de deviner où l'on se trouve. Après le nombre d'échanges prévu (ou un vote demandé par la majorité), tout le monde vote. L'espion peut aussi se déclarer pour tenter sa chance.",
        score: "<p>Espion non démasqué : <ul><li>+3 pts pour l'espion</li></ul></p><br><p>Espion démasqué : <ul><li>+1 pt par civil</li><li>+1 pt bonus si le civil a voté pour l'espion</li></ul></p><br><p>Après avoir été démasqué (ou en se déclarant), l'espion peut deviner le lieu : s'il trouve, +2 pts et il vole la victoire. Le classement est basé sur le total de points cumulés.</p>",
    },
    snake: {
        gameType: 'SNAKE' as const,
        label: 'Snake',
        mode: 'solo' as const,
        higherIsBetter: true,
        scoreLabel: 'Meilleur score',
        description: "Mangez le maximum de pommes sans vous mordre la queue !",
        players: '1 joueur',
        rules: "Dirigez votre serpent avec les flèches directionnelles (ou ZQSD). Mangez les pommes rouges pour grandir et marquer des points. La partie se termine si vous heurtez un mur ou votre propre corps.",
        score: "Chaque pomme rapporte 10 points. Seul votre meilleur score par partie est conservé pour le classement.",
    },
    pacman: {
        gameType: 'PACMAN' as const,
        label: 'Pac-Man',
        mode: 'solo' as const,
        higherIsBetter: true,
        scoreLabel: 'Meilleur score',
        description: "Mangez tous les points en évitant les fantômes !",
        players: '1 joueur',
        rules: "Dirigez Pac-Man avec les flèches (ou ZQSD) pour manger tous les points du labyrinthe. Évitez les fantômes rouges — ils vous coûtent une vie. Les super-gommes vous permettent de les dévorer temporairement.",
        score: "10 pts par point, 50 pts par super-gomme, 200 pts par fantôme mangé. Seul votre meilleur score est conservé.",
    },
    breakout: {
        gameType: 'BREAKOUT' as const,
        label: 'Casse-brique',
        mode: 'solo' as const,
        higherIsBetter: true,
        scoreLabel: 'Meilleur score',
        description: "Cassez toutes les briques avec la balle et la palette !",
        players: '1 joueur',
        rules: "Déplacez la palette pour rebondir la balle et casser les briques. Ramassez les bonus qui tombent. Vous avez 3 vies.",
        score: "10 pts par brique, 20 pts par brique dure. Meilleur score conservé pour le classement.",
    },
    tetris: {
        gameType: 'TETRIS' as const,
        label: 'Tetris',
        mode: 'solo' as const,
        higherIsBetter: true,
        scoreLabel: 'Meilleur score',
        description: "Empilez les pièces et complétez des lignes !",
        players: '1 joueur',
        rules: "Faites tomber et orientez les pièces pour former des lignes horizontales complètes. Une ligne complète est éliminée. La partie se termine quand les pièces atteignent le haut.",
        score: "100 pts par ligne × niveau, 300 pour 2 lignes, 500 pour 3, 800 pour un Tetris (4 lignes). Meilleur score conservé.",
    },
    sutom: {
        gameType: 'SUTOM' as const,
        label: 'Sutom',
        mode: 'solo' as const,
        higherIsBetter: true,
        scoreLabel: 'Meilleur score',
        description: "Devinez le mot mystère en 6 essais — à la française !",
        players: '1 joueur',
        rules: "Un mot français est à deviner ; sa première lettre et son nombre de lettres sont donnés. À chaque essai, tapez un mot de la bonne longueur commençant par cette lettre. Les lettres bien placées s'allument, les lettres présentes mais mal placées sont signalées, les autres sont absentes. Vous avez 6 tentatives.",
        score: "Victoire = (7 − nombre d'essais) × 100 + 25 par lettre du mot. Gagner vite sur un mot long rapporte le plus. Seul votre meilleur score est conservé.",
    },
    space_invaders: {
        gameType: 'SPACE_INVADERS' as const,
        label: 'Space Invaders',
        mode: 'solo' as const,
        higherIsBetter: true,
        scoreLabel: 'Meilleur score',
        description: "Repoussez l'invasion extraterrestre vague après vague !",
        players: '1 joueur',
        rules: "Déplacez votre vaisseau et tirez pour détruire les aliens avant qu'ils n'atteignent le bas. Les rangées du haut valent plus de points. Évitez leurs tirs : vous avez 3 vies. Chaque vague nettoyée en fait surgir une plus rapide.",
        score: "10 à 30 points par alien selon la rangée. Seul votre meilleur score est conservé pour le classement.",
    },
    '2048': {
        gameType: 'GAME_2048' as const,
        label: '2048',
        mode: 'solo' as const,
        higherIsBetter: true,
        scoreLabel: 'Meilleur score',
        description: "Fusionnez les tuiles identiques jusqu'à atteindre 2048 !",
        players: '1 joueur',
        rules: "Glissez les tuiles dans 4 directions ; deux tuiles de même valeur fusionnent en doublant. À chaque coup, une nouvelle tuile (2 ou 4) apparaît. La partie se termine quand plus aucun mouvement n'est possible.",
        score: "Le score augmente de la valeur de chaque tuile fusionnée. Seul votre meilleur score est conservé.",
    },
    flappy_bird: {
        gameType: 'FLAPPY_BIRD' as const,
        label: 'Flappy Bird',
        mode: 'solo' as const,
        higherIsBetter: true,
        scoreLabel: 'Meilleur score',
        description: "Battez des ailes pour passer entre les tuyaux !",
        players: '1 joueur',
        rules: "Appuyez sur Espace ou tapez l'écran pour battre des ailes et faire monter l'oiseau. La gravité le fait redescendre. Évitez les tuyaux et le sol. Un point par tuyau franchi.",
        score: "1 point par tuyau franchi. Seul votre meilleur score est conservé pour le classement.",
    },
    plumber: {
        gameType: 'PLUMBER' as const,
        label: 'Plumber',
        mode: 'solo' as const,
        higherIsBetter: true,
        scoreLabel: 'Meilleur score',
        description: "Courez, sautez, écrasez les ennemis et collectez les pièces !",
        players: '1 joueur',
        rules: "Courez vers la droite, sautez par-dessus les trous et les ennemis. Écrasez les Goombas en leur sautant dessus. Ramassez les champignons (vous donnent une vie supplémentaire) et les fleurs de feu (vous laissent tirer des boules de feu). Mort en touchant un ennemi sans pouvoir ou en tombant dans un trou.",
        score: "1 pt par pièce, 5 pts par ennemi écrasé, bonus de distance et de power-up. Seul votre meilleur score est conservé.",
    },
} as const;

export type GameType = keyof typeof GAME_CONFIG;
export type GameMode = 'solo' | 'both' | 'multi';

export const GAME_LABEL_MAP = Object.fromEntries(
    Object.values(GAME_CONFIG).map(g => [g.gameType, g.label])
) as Record<string, string>;

export const GAME_OPTIONS = Object.entries(GAME_CONFIG).map(([key, g]) => ({
    value: key as GameType,
    label: g.label,
}));

export const LOBBY_GAME_OPTIONS = GAME_OPTIONS.filter(
    g => (GAME_CONFIG[g.value] as { mode: string }).mode !== 'solo'
);

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
    ludo: [2, 3, 4],
    perudo: [2, 3, 4, 5, 6],
    cant_stop: [2, 3, 4],
    mille_bornes: [2, 3, 4],
    impostor: [4, 5, 6, 7, 8],
    spyfall: [3, 4, 5, 6, 7, 8],
    snake: [1],
    pacman: [1],
    breakout: [1],
    tetris: [1],
    sutom: [1],
    space_invaders: [1],
    '2048': [1],
    flappy_bird: [1],
    plumber: [1],
};

export const MIN_PLAYERS: Partial<Record<GameType, number>> = {
    quiz: 1,
    puissance4: 2,
    taboo: 4,
    just_one: 3,
    battleship: 2,
    diamant: 2,
    ludo: 2,
    perudo: 2,
    cant_stop: 2,
    mille_bornes: 2,
    impostor: 4,
    spyfall: 3,
};

export const NO_OPTIONS_GAMES: Partial<Record<GameType, string>> = {
    yahtzee: 'Yahtzee — 2 à 8 joueurs',
    puissance4: 'Puissance 4 — solo (vs bot) ou 2 joueurs.',
    battleship: 'Bataille Navale — solo (vs bot) ou 2 joueurs.',
    just_one: 'Just One — 3 à 7 joueurs.',
    diamant: 'Diamant — 2 à 8 joueurs.',
};

export const BOT_SUPPORTED_GAMES: Set<string> = new Set(['puissance4', 'yahtzee', 'diamant', 'battleship', 'uno', 'skyjow', 'ludo', 'perudo', 'cant_stop', 'mille_bornes']);

// Badges par mode — chaque jeu n'apparaît que dans une seule catégorie
export const SOLO_GAMES: Record<string, { text: string; color: string }> = Object.fromEntries(
    Object.entries(GAME_CONFIG)
        .filter(([, g]) => (g.mode as GameMode) === 'solo')
        .map(([key]) => [key, { text: 'SOLO', color: '#A32D2D' }])
);

export const BOTH_GAMES: Record<string, { text: string; color: string }> = Object.fromEntries(
    Object.entries(GAME_CONFIG)
        .filter(([, g]) => (g.mode as GameMode) === 'both')
        .map(([key]) => [key, { text: 'MIXTE', color: '#7C3AED' }])
);

export const MULTI_GAMES: Record<string, { text: string; color: string }> = Object.fromEntries(
    Object.entries(GAME_CONFIG)
        .filter(([, g]) => (g.mode as GameMode) === 'multi')
        .map(([key]) => [key, { text: 'MULTI', color: '#1D4ED8' }])
);

export const GAME_URL_SLUGS = ['uno', 'skyjow', 'taboo', 'yahtzee', 'puissance4', 'just-one', 'battleship', 'diamant', 'impostor', 'spyfall', 'ludo', 'perudo', 'cant-stop', 'mille-bornes'] as const;

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
    spyfall: (id, gid) => gid ? `/spyfall/${id}/${gid}` : `/spyfall/${id}`,
    ludo: (id, gid) => gid ? `/ludo/${id}/${gid}` : `/ludo/${id}`,
    perudo: (id, gid) => gid ? `/perudo/${id}/${gid}` : `/perudo/${id}`,
    cant_stop: (id, gid) => gid ? `/cant-stop/${id}/${gid}` : `/cant-stop/${id}`,
    mille_bornes: (id, gid) => gid ? `/mille-bornes/${id}/${gid}` : `/mille-bornes/${id}`,
    quiz: (id, gid) => gid ? `/quiz/${id}/${gid}` : `/quiz/${id}`,
};
