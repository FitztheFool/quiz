// src/components/UserStats.tsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import Pagination from '@/components/Pagination';
import { GAME_EMOJI_MAP, GAME_LABEL_MAP } from '@/lib/gameConfig';
import PlayerModal from '@/components/PlayerModal';
import GameFilterPills, { GameFilter } from '@/components/GameFilterPills';
import GameStatCards from '@/components/GameStatCards';

interface Player {
    username: string;
    score: number;
    placement: number | null;
}

interface RecentActivity {
    gameId: string;
    gameType: string;
    createdAt: string;
    quiz: { id: string; title: string } | null;
    score: number;
    placement: number | null;
    players: Player[];
}

interface Stats {
    user: { id: string; username: string; image: string | null };
    gameStats: Record<string, { count: number; points: number; wins: number }>;
    totalGames: number;
    recentActivity: RecentActivity[];
    pagination: { page: number; pageSize: number; totalGames: number; totalPages: number };
}

const PLACEMENT_EMOJI: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const GAME_BADGE: Record<string, string> = {
    QUIZ: 'bg-blue-100   dark:bg-blue-900/40   text-blue-700   dark:text-blue-400',
    UNO: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',
    TABOO: 'bg-red-100    dark:bg-red-900/40    text-red-700    dark:text-red-400',
    SKYJOW: 'bg-sky-100    dark:bg-sky-900/40    text-sky-700    dark:text-sky-400',
    YAHTZEE: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
    PUISSANCE4: 'bg-rose-100   dark:bg-rose-900/40   text-rose-700   dark:text-rose-400',
    JUST_ONE: 'bg-teal-100   dark:bg-teal-900/40   text-teal-700   dark:text-teal-400',
    BATTLESHIP: 'bg-cyan-100   dark:bg-cyan-900/40   text-cyan-700   dark:text-cyan-400',
    DIAMANT:    'bg-amber-100  dark:bg-amber-900/40  text-amber-700  dark:text-amber-400',
};

const GAME_BADGE_ACTIVE: Record<string, string> = {
    QUIZ: 'bg-blue-600   text-white border-blue-600',
    UNO: 'bg-orange-500 text-white border-orange-500',
    TABOO: 'bg-red-600    text-white border-red-600',
    SKYJOW: 'bg-sky-500    text-white border-sky-500',
    YAHTZEE: 'bg-purple-600 text-white border-purple-600',
    PUISSANCE4: 'bg-rose-600   text-white border-rose-600',
    JUST_ONE: 'bg-teal-600   text-white border-teal-600',
    BATTLESHIP: 'bg-cyan-600   text-white border-cyan-600',
    DIAMANT:    'bg-amber-500  text-white border-amber-500',
};

function CollapseSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div>
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2 w-full text-left mb-3 group"
            >
                <span className="text-lg font-bold text-gray-800 dark:text-white">{title}</span>
                <span className={`ml-1 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`}>
                    ▾
                </span>
            </button>
            {open && children}
        </div>
    );
}

interface Props {
    username: string;
    currentUsername?: string;
}

export default function UserStats({ username, currentUsername }: Props) {
    const [stats, setStats] = useState<Stats | null>(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [refetching, setRefetching] = useState(false);
    const [page, setPage] = useState(1);
    const [gameFilter, setGameFilter] = useState<GameFilter>('ALL');
    const [modalGame, setModalGame] = useState<RecentActivity | null>(null);

    const fetchStats = useCallback(async (p: number, filter: GameFilter, isInitial = false) => {
        if (isInitial) setInitialLoading(true);
        else setRefetching(true);
        try {
            const params = new URLSearchParams({ page: String(p) });
            if (filter !== 'ALL') params.set('gameType', filter);
            const res = await fetch(`/api/user/${username}/stats?${params}`);
            if (res.ok) setStats(await res.json());
        } finally {
            if (isInitial) setInitialLoading(false);
            else setRefetching(false);
        }
    }, [username]);

    useEffect(() => { fetchStats(1, 'ALL', true); }, [fetchStats]);

    const handlePageChange = (p: number) => {
        setPage(p);
        fetchStats(p, gameFilter);
    };

    const handleFilterChange = (f: GameFilter) => {
        setGameFilter(f);
        setPage(1);
        fetchStats(1, f);
    };

    const activeClassName = gameFilter !== 'ALL' && GAME_BADGE_ACTIVE[gameFilter]
        ? GAME_BADGE_ACTIVE[gameFilter]
        : 'bg-gray-800 text-white border-gray-800 dark:bg-white dark:text-gray-900 dark:border-white';

    if (initialLoading) return (
        <div className="flex items-center justify-center py-12">
            <LoadingSpinner fullScreen={false} />
        </div>
    );

    if (!stats) return <p className="text-gray-500 text-sm">Impossible de charger les statistiques.</p>;

    return (
        <div className="space-y-8">

            {/* Statistiques — repliable */}
            <CollapseSection title="🎮 Statistiques">
                <GameStatCards gameStats={Object.fromEntries(Object.entries(stats.gameStats).filter(([, v]) => v.count > 0))} />
            </CollapseSection>

            {/* Activité récente — repliable */}
            <CollapseSection title="🕐 Activité récente">
                <div className="mt-3 mb-4">
                    <GameFilterPills
                        value={gameFilter}
                        onChange={handleFilterChange}
                        activeClassName={activeClassName}
                    />
                </div>

                <div className={`relative transition-opacity duration-150 ${refetching ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    {refetching && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center">
                            <LoadingSpinner fullScreen={false} />
                        </div>
                    )}

                    {stats.recentActivity.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Aucune partie jouée pour l'instant.</p>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
                                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            {['Jeu', 'Quiz', 'Score', 'Placement', 'Joueurs', 'Date'].map(h => (
                                                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                                        {stats.recentActivity.map((a) => (
                                            <tr key={a.gameId} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${GAME_BADGE[a.gameType] ?? 'bg-gray-100 text-gray-600'}`}>
                                                        {GAME_EMOJI_MAP[a.gameType] ?? '🎮'} {GAME_LABEL_MAP[a.gameType] ?? a.gameType}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    {a.quiz ? (
                                                        <Link href={`/quiz/${a.quiz.id}`} className="text-blue-600 dark:text-blue-400 hover:underline text-xs">{a.quiz.title}</Link>
                                                    ) : (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <span className="font-bold text-gray-900 dark:text-white">{a.score}</span>
                                                    <span className="text-xs text-gray-400 ml-1">pts</span>
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-center">
                                                    {a.placement != null
                                                        ? <span className="text-base">{PLACEMENT_EMOJI[a.placement] ?? `#${a.placement}`}</span>
                                                        : <span className="text-gray-400">—</span>}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    {a.players.length > 0 ? (
                                                        <button
                                                            onClick={() => setModalGame(a)}
                                                            className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                        >
                                                            <span>👥</span>
                                                            <span>{a.players.length}</span>
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-400">
                                                    {new Date(a.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                                    {' '}
                                                    {new Date(a.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {(stats.pagination?.totalPages ?? 0) > 1 && (
                                <Pagination currentPage={page} totalPages={stats.pagination.totalPages} onPageChange={handlePageChange} />
                            )}
                        </>
                    )}
                </div>
            </CollapseSection>

            {modalGame && (
                <PlayerModal
                    gameId={modalGame.gameId}
                    players={modalGame.players}
                    onClose={() => setModalGame(null)}
                />
            )}
        </div>
    );
}
