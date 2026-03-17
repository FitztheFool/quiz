export const GAME_CONFIG = {
    uno: {
        gameType: 'UNO' as const,
        label: 'UNO',
        icon: '🃏',
        higherIsBetter: true,
        scoreLabel: 'Points',
        description: 'Les points sont calculés selon le placement final : 🥇 1ère place = 20 pts · 🥈 2ème = 13 pts · 🥉 3ème = 6 pts · Autres = 2 pts. Le classement est basé sur le total de points cumulés.',
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
        scoreLabel: 'Victoires',
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
        scoreLabel: 'Points',
        description: 'Classement basé sur le nombre de victoires cumulées. Chaque victoire rapporte 10 points. En cas de match nul, aucun point n\'est attribué.',
    },
} as const;

export const GAME_EMOJI_MAP = Object.fromEntries(
    Object.values(GAME_CONFIG).map(g => [g.gameType, g.icon])
) as Record<string, string>;
