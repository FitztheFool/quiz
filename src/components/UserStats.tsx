// src/components/UserStats.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import Pagination from '@/components/Pagination';
import { GAME_LABEL_MAP } from '@/lib/gameConfig';
import GameIcon from '@/components/GameIcon';
import PlayerModal from '@/components/PlayerModal';
import GameFilterPills, { GameFilter } from '@/components/GameFilterPills';
import GameStatCards from '@/components/GameStatCards';
import StatChip from '@/components/StatChip';
import LoadingOverlay from '@/components/LoadingOverlay';
import ActivityTable, { type ActivityRow } from '@/components/ActivityTable';

interface Stats {
    user: { id: string; username: string; image: string | null };
    gameStats: Record<string, { count: number; points: number; wins: number; rounds: number; correctAnswers: number; totalAnswers: number; bestScore: number; bestLevel: number }>;
    totalGames: number;
    recentActivity: ActivityRow[];
    pagination: { page: number; pageSize: number; totalGames: number; totalPages: number };
}

interface Props {
    username: string;
}

export default function UserStats({ username }: Props) {
    const [stats, setStats] = useState<Stats | null>(null);
    const [ranks, setRanks] = useState<Record<string, number>>({});
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

    useEffect(() => {
        fetch(`/api/user/${username}/ranks`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data?.ranks) setRanks(data.ranks); });
    }, [username]);

    const handlePageChange = (p: number) => { setPage(p); fetchStats(p, gameFilter); };
    const handleFilterChange = (f: GameFilter) => { setGameFilter(f); setPage(1); fetchStats(1, f); };

    if (initialLoading) return (
        <div className="flex items-center justify-center py-16">
            <LoadingSpinner fullScreen={false} message="Chargement des statistiques..." />
        </div>
    );

    if (!stats) return <p className="text-gray-600 dark:text-white text-sm">Impossible de charger les statistiques.</p>;

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
                    label={Object.keys(activeGameStats).length <= 1 ? 'jeu différent' : 'jeux différents'}
                    className="bg-white dark:bg-gray-900"
                />

                {stats.totalGames > 0 && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3">
                        <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">Classement</div>
                        {Object.keys(ranks).length > 0 ? (
                            <div className="space-y-1.5 mt-1">
                                {Object.entries(ranks)
                                    .sort((a, b) => a[1] - b[1])
                                    .slice(0, 3)
                                    .map(([type, r]) => (
                                        <div key={type} className="flex items-center gap-2">
                                            {r <= 3 ? (
                                                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 ${r === 1 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : r === 2 ? 'bg-gray-100 dark:bg-gray-700 text-gray-500' : 'bg-orange-700 text-orange-50'}`}>{r}</span>
                                            ) : (
                                                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-5 text-center shrink-0">#{r}</span>
                                            )}
                                            <div className="flex items-center gap-1 min-w-0">
                                                <GameIcon gameType={type} className="w-3.5 h-3.5 shrink-0 text-gray-500 dark:text-gray-400" />
                                                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{GAME_LABEL_MAP[type] ?? type}</span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <p className="text-sm font-semibold text-gray-400 dark:text-gray-500 mt-1">—</p>
                        )}
                    </div>
                )}

                {lastActivity ? (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3">
                        <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Dernière partie</div>
                        <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white">
                            <GameIcon gameType={lastActivity.gameType} className="w-4 h-4" />
                            {GAME_LABEL_MAP[lastActivity.gameType] ?? lastActivity.gameType}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {new Date(lastActivity.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {new Date(lastActivity.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                ) : <div />}
            </div>

            {/* ── Statistiques par jeu ── */}
            {Object.keys(activeGameStats).length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-white mb-3">
                        Statistiques par jeu
                    </h2>
                    <GameStatCards gameStats={activeGameStats} ranks={ranks} />
                </div>
            )}

            {/* ── Activité récente ── */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-white">
                        Activité récente
                    </h2>
                    <GameFilterPills
                        value={gameFilter}
                        onChange={handleFilterChange}
                        activeClassName="bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white"
                        inactiveClassName="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        allowedGameTypes={Object.keys(activeGameStats)}
                    />
                </div>

                {/* ↓ Replaced inline <table> + loading logic with shared components */}
                <LoadingOverlay loading={refetching}>
                    {stats.recentActivity.length === 0 ? (
                        <p className="text-gray-600 dark:text-white text-sm py-4 text-center">
                            Aucune partie jouée pour l'instant.
                        </p>
                    ) : (
                        <>
                            <ActivityTable
                                rows={stats.recentActivity}
                                variant="user"
                                onPlayerClick={(row) => setModalGame(row)}
                                emptyLabel="Aucune partie jouée pour l'instant."
                                showQuiz={gameFilter === 'ALL' || gameFilter === 'QUIZ'}
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
