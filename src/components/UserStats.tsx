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
import StatChip from '@/components/StatChip';
import LoadingOverlay from '@/components/LoadingOverlay';
import ActivityTable, { type ActivityRow } from '@/components/ActivityTable';

interface Stats {
    user: { id: string; username: string; image: string | null };
    gameStats: Record<string, { count: number; points: number; wins: number }>;
    totalGames: number;
    recentActivity: ActivityRow[];
    pagination: { page: number; pageSize: number; totalGames: number; totalPages: number };
}

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
    const [modalGame, setModalGame] = useState<ActivityRow | null>(null);

    const fetchStats = useCallback(
        async (p: number, filter: GameFilter, isInitial = false) => {
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
        },
        [username],
    );

    useEffect(() => { fetchStats(1, 'ALL', true); }, [fetchStats]);

    const handlePageChange = (p: number) => { setPage(p); fetchStats(p, gameFilter); };
    const handleFilterChange = (f: GameFilter) => { setGameFilter(f); setPage(1); fetchStats(1, f); };

    if (initialLoading) return (
        <div className="flex items-center justify-center py-16">
            <LoadingSpinner fullScreen={false} />
        </div>
    );

    if (!stats) return <p className="text-gray-400 dark:text-gray-500 text-sm">Impossible de charger les statistiques.</p>;

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
                <StatChip
                    value={stats.totalGames}
                    label="parties jouées"
                    className="bg-white dark:bg-gray-900"
                />
                <StatChip
                    value={Object.keys(activeGameStats).length}
                    label="jeux différents"
                    className="bg-white dark:bg-gray-900"
                />

                {bestGame ? (
                    <StatChip
                        value={`${GAME_EMOJI_MAP[bestGame[0]]} ${GAME_LABEL_MAP[bestGame[0]] ?? bestGame[0]}`}
                        label="meilleur jeu"
                        className="bg-white dark:bg-gray-900"
                    />
                ) : <div />}

                {lastActivity ? (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                            Dernière partie : {new Date(lastActivity.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(lastActivity.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                ) : worstGame && worstGame[0] !== bestGame?.[0] ? (
                    <StatChip
                        value={`${GAME_EMOJI_MAP[worstGame[0]]} ${GAME_LABEL_MAP[worstGame[0]] ?? worstGame[0]}`}
                        label="à améliorer"
                        className="bg-white dark:bg-gray-900"
                    />
                ) : <div />}
            </div>

            {/* ── Statistiques par jeu ── */}
            {Object.keys(activeGameStats).length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                        Statistiques par jeu
                    </h2>
                    <GameStatCards gameStats={activeGameStats} />
                </div>
            )}

            {/* ── Activité récente ── */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Activité récente
                    </h2>
                    <GameFilterPills
                        value={gameFilter}
                        onChange={handleFilterChange}
                        activeClassName="bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white"
                        inactiveClassName="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    />
                </div>

                {/* ↓ Replaced inline <table> + loading logic with shared components */}
                <LoadingOverlay loading={refetching}>
                    {stats.recentActivity.length === 0 ? (
                        <p className="text-gray-400 dark:text-gray-500 text-sm py-4 text-center">
                            Aucune partie jouée pour l'instant.
                        </p>
                    ) : (
                        <>
                            <ActivityTable
                                rows={stats.recentActivity}
                                variant="user"
                                onPlayerClick={(row) => setModalGame(row)}
                                emptyLabel="Aucune partie jouée pour l'instant."
                            />
                            {(stats.pagination?.totalPages ?? 0) > 1 && (
                                <Pagination
                                    currentPage={page}
                                    totalPages={stats.pagination.totalPages}
                                    onPageChange={handlePageChange}
                                />
                            )}
                        </>
                    )}
                </LoadingOverlay>
            </div>

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
