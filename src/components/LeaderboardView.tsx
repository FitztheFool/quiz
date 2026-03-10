'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

type Game = 'uno' | 'skyjow' | 'taboo' | 'quiz';

interface LeaderboardEntry {
    rank: number;
    userId: string;
    username: string;
    score: number;
    gamesPlayed: number;
    wins?: number;
    detail: string;
}

interface LeaderboardConfig {
    label: string;
    higherIsBetter: boolean;
    scoreLabel: string;
    description: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const DESCRIPTIONS: Record<Game, string> = {
    uno:    'Les points sont calculés selon le placement final : 🥇 1ère place = 20 pts · 🥈 2ème = 13 pts · 🥉 3ème = 6 pts · Autres = 2 pts. Le classement est basé sur le total de points cumulés.',
    skyjow: "À Skyjow, moins de points c'est mieux ! Le classement est basé sur le score moyen par partie (somme des cartes restantes). Les colonnes de 3 cartes identiques sont éliminées. Le déclencheur du dernier tour voit son score doublé s'il n'est pas le meilleur.",
    taboo:  "Le score représente le nombre de mots devinés par ton équipe sur l'ensemble des parties. Un mot deviné ou qui se fait buzzer comme piégé rapporte 10 points à l'équipe en fin de manche.",
    quiz:   'Pour chaque quiz, seul ton meilleur score est comptabilisé. Le score total est la somme de tes meilleurs scores sur tous les quiz complétés.',
};

const SCORE_LABELS: Record<Game, string> = {
    uno: 'Points', skyjow: 'Score moyen', taboo: 'Mots devinés', quiz: 'Score total',
};

const GAME_ICONS: Record<Game, string> = {
    uno: '🃏', skyjow: '🂠', taboo: '🚫', quiz: '🎯',
};

const GAME_LABELS: Record<Game, string> = {
    uno: 'UNO', skyjow: 'Skyjow', taboo: 'Taboo', quiz: 'Quiz',
};

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
const LIMIT = 20;

interface Props {
    game: Game;
}

export default function LeaderboardView({ game }: Props) {
    const { data: session } = useSession();

    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [config, setConfig] = useState<LeaderboardConfig | null>(null);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);

    // Reset page when game changes
    useEffect(() => { setPage(1); }, [game]);

    useEffect(() => {
        setLoading(true);
        setLeaderboard([]);
        setConfig(null);
        setPagination(null);

        fetch(`/api/leaderboard/games?game=${game}&page=${page}&limit=${LIMIT}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data) {
                    setLeaderboard(data.leaderboard ?? []);
                    setConfig(data.config ?? null);
                    setPagination(data.pagination ?? null);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [game, page]);

    const myEntry = leaderboard.find(e => e.userId === session?.user?.id);
    const scoreLabel = config?.scoreLabel ?? SCORE_LABELS[game];
    const label = config?.label ?? GAME_LABELS[game];

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
                <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">

                    {/* Header */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 border border-gray-200 text-3xl flex-shrink-0">
                            {GAME_ICONS[game]}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Leaderboard {label}</h1>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {pagination
                                    ? `${pagination.total} joueur${pagination.total > 1 ? 's' : ''} classé${pagination.total > 1 ? 's' : ''}`
                                    : 'Chargement…'
                                }
                            </p>
                        </div>
                    </div>

                    {/* Description — toujours visible */}
                    <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                            📊 Calcul des points
                        </p>
                        <p className="text-sm text-gray-700">
                            {config?.description ?? DESCRIPTIONS[game]}
                        </p>
                    </div>

                    {/* Ma position */}
                    {myEntry && (
                        <div className="mb-6 rounded-xl border-2 border-blue-200 bg-blue-50 px-5 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{MEDAL[myEntry.rank] ?? `#${myEntry.rank}`}</span>
                                <div>
                                    <p className="font-bold text-gray-900">
                                        {myEntry.username} <span className="text-xs text-gray-400 font-normal">(moi)</span>
                                    </p>
                                    <p className="text-xs text-gray-500">{myEntry.detail}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-blue-700">{myEntry.score}</p>
                                <p className="text-xs text-gray-400">{scoreLabel}</p>
                            </div>
                        </div>
                    )}

                    {/* Tableau */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-400 mb-3" />
                            <p className="text-sm">Chargement du classement…</p>
                        </div>
                    ) : leaderboard.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-4xl mb-3">🏜️</p>
                            <p className="text-gray-600 font-semibold">Aucune partie enregistrée</p>
                            <p className="text-gray-400 text-sm mt-1">Soyez le premier à jouer !</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded-xl border border-gray-100">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Rang</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Joueur</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{scoreLabel}</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Détail</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-50">
                                        {leaderboard.map(entry => {
                                            const isMe = entry.userId === session?.user?.id;
                                            const isPodium = entry.rank <= 3;
                                            return (
                                                <tr key={entry.userId}
                                                    className={`transition-colors ${isMe ? 'bg-blue-50 font-semibold' : isPodium ? 'bg-yellow-50/50' : 'hover:bg-gray-50'}`}>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        {MEDAL[entry.rank]
                                                            ? <span className="text-xl">{MEDAL[entry.rank]}</span>
                                                            : <span className="text-sm text-gray-500 font-semibold">#{entry.rank}</span>
                                                        }
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className={`text-sm ${isMe ? 'text-blue-700' : 'text-gray-800'}`}>
                                                            {entry.username}
                                                            {isMe && <span className="ml-1 text-xs opacity-60">(moi)</span>}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className={`text-sm font-bold ${isPodium || isMe ? 'text-blue-700' : 'text-gray-700'}`}>
                                                            {entry.score}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                                                        <span className="text-xs text-gray-400">{entry.detail}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {pagination && pagination.totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4 px-1">
                                    <p className="text-xs text-gray-400">
                                        Page {pagination.page}/{pagination.totalPages} · {pagination.total} joueur{pagination.total > 1 ? 's' : ''}
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setPage(p => p - 1)}
                                            disabled={page === 1}
                                            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                                        >
                                            ← Précédent
                                        </button>
                                        <button
                                            onClick={() => setPage(p => p + 1)}
                                            disabled={page === pagination.totalPages}
                                            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                                        >
                                            Suivant →
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
        </div>
        </div>
    );
}
