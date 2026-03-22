// src/components/UserStats.tsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import Pagination from '@/components/Pagination';
import { GAME_EMOJI_MAP, GAME_LABEL_MAP, GAME_COLOR } from '@/lib/gameConfig';
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


interface Props {
    username: string;
    currentUsername?: string;
}

export default function UserStats({ username }: Props) {
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

    const handlePageChange = (p: number) => { setPage(p); fetchStats(p, gameFilter); };
    const handleFilterChange = (f: GameFilter) => { setGameFilter(f); setPage(1); fetchStats(1, f); };

    if (initialLoading) return (
        <div className="flex items-center justify-center py-16">
            <LoadingSpinner fullScreen={false} />
        </div>
    );

    if (!stats) return <p className="text-gray-400 dark:text-gray-500 text-sm">Impossible de charger les statistiques.</p>;

    // Synthèse — tri par taux de victoire
    const gamesWithRate = Object.entries(stats.gameStats)
        .filter(([, v]) => v.count > 0)
        .sort((a, b) => {
            const ra = a[1].wins ? a[1].wins / a[1].count : 0;
            const rb = b[1].wins ? b[1].wins / b[1].count : 0;
            return rb - ra;
        });
    const bestGame = gamesWithRate[0] ?? null;
    const worstGame = gamesWithRate.length > 1 ? gamesWithRate[gamesWithRate.length - 1] : null;
    const lastActivity = stats.recentActivity[0] ?? null;
    const activeGameStats = Object.fromEntries(Object.entries(stats.gameStats).filter(([, v]) => v.count > 0));

    return (
        <div className="space-y-4">

            {/* ── Chips d'aperçu ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalGames}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">parties jouées</div>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{Object.keys(activeGameStats).length}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">jeux différents</div>
                </div>
                {bestGame && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3">
                        <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
                            {GAME_EMOJI_MAP[bestGame[0]]} {GAME_LABEL_MAP[bestGame[0]] ?? bestGame[0]}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">meilleur jeu</div>
                    </div>
                )}
                {lastActivity ? (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                            {new Date(lastActivity.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {new Date(lastActivity.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                ) : worstGame && worstGame[0] !== bestGame?.[0] ? (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3">
                        <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
                            {GAME_EMOJI_MAP[worstGame[0]]} {GAME_LABEL_MAP[worstGame[0]] ?? worstGame[0]}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">à améliorer</div>
                    </div>
                ) : null}
            </div>

            {/* ── Statistiques par jeu ── */}
            {Object.keys(activeGameStats).length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Statistiques par jeu</h2>
                    <GameStatCards gameStats={activeGameStats} />
                </div>
            )}

            {/* ── Activité récente ── */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Activité récente</h2>
                    <GameFilterPills
                        value={gameFilter}
                        onChange={handleFilterChange}
                        activeClassName="bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white"
                        inactiveClassName="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    />
                </div>

                <div className={`relative transition-opacity duration-150 ${refetching ? 'opacity-50 pointer-events-none' : ''}`}>
                    {refetching && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center">
                            <LoadingSpinner fullScreen={false} />
                        </div>
                    )}

                    {stats.recentActivity.length === 0 ? (
                        <p className="text-gray-400 dark:text-gray-500 text-sm py-4 text-center">Aucune partie jouée pour l'instant.</p>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-800/60">
                                        <tr>
                                            {['Jeu', 'Quiz', 'Score', 'Place', 'Joueurs', 'Date'].map(h => (
                                                <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                        {stats.recentActivity.map((a) => (
                                            <tr key={a.gameId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${GAME_COLOR[a.gameType]?.badge ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                                                        {GAME_EMOJI_MAP[a.gameType] ?? '🎮'} {GAME_LABEL_MAP[a.gameType] ?? a.gameType}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap max-w-[140px]">
                                                    {a.quiz ? (
                                                        <Link href={`/quiz/${a.quiz.id}`} className="text-blue-600 dark:text-blue-400 hover:underline text-xs truncate block">{a.quiz.title}</Link>
                                                    ) : (
                                                        <span className="text-gray-300 dark:text-gray-600">—</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <span className="font-semibold text-gray-900 dark:text-white text-xs">{a.score}</span>
                                                    <span className="text-[10px] text-gray-400 ml-0.5">pts</span>
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-center text-sm">
                                                    {a.placement != null
                                                        ? <span>{PLACEMENT_EMOJI[a.placement] ?? `#${a.placement}`}</span>
                                                        : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    {a.players.length > 0 ? (
                                                        <button
                                                            onClick={() => setModalGame(a)}
                                                            className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                        >
                                                            👥 {a.players.length}
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-300 dark:text-gray-600">—</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-[10px] text-gray-400 dark:text-gray-500">
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
            </div>

            {modalGame && (
                <PlayerModal gameId={modalGame.gameId} players={modalGame.players} onClose={() => setModalGame(null)} />
            )}
        </div>
    );
}
