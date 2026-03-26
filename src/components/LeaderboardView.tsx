// src/components/LeaderboardView.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GAME_CONFIG, GAME_COLOR, GameType as Game } from '@/lib/gameConfig';
import Pagination from '@/components/Pagination';
import GameFilterPills, { GameFilter } from '@/components/GameFilterPills';
import LoadingSpinner from '@/components/LoadingSpinner';
import LoadingOverlay from '@/components/LoadingOverlay';


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
    rules?: string;
    score?: string;
}

interface PaginationData {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
const LIMIT = 20;


interface Props {
    game: Game;
}

export default function LeaderboardView({ game }: Props) {
    const { data: session } = useSession();
    const router = useRouter();

    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [config, setConfig] = useState<LeaderboardConfig | null>(null);
    const [pagination, setPagination] = useState<PaginationData | null>(null);
    const [page, setPage] = useState(1);
    const [initialLoading, setInitialLoading] = useState(true);
    const [refetching, setRefetching] = useState(false);

    // On stocke le dernier (game, page) fetché pour éviter tout double appel
    const lastFetch = useRef<{ game: Game; page: number } | null>(null);

    useEffect(() => {
        // Si game a changé, on veut fetcher page 1 — on corrige page si nécessaire
        const targetPage = lastFetch.current?.game !== game ? 1 : page;

        // Déduplique : si on a déjà fetché exactement ce (game, page), on skip
        if (lastFetch.current?.game === game && lastFetch.current?.page === targetPage) return;
        lastFetch.current = { game, page: targetPage };

        // Si page state est désynchronisé (ex: changement de jeu), on le corrige sans re-trigger
        if (page !== targetPage) setPage(targetPage);

        const isFirst = leaderboard.length === 0 && !pagination;
        if (isFirst) setInitialLoading(true);
        else setRefetching(true);

        fetch(`/api/leaderboard/games?game=${game}&page=${targetPage}&limit=${LIMIT}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data) {
                    setLeaderboard(data.leaderboard ?? []);
                    setConfig(data.config ?? null);
                    setPagination(data.pagination ?? null);
                }
            })
            .catch(console.error)
            .finally(() => {
                setInitialLoading(false);
                setRefetching(false);
            });
    }, [game, page]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleGameChange = (f: GameFilter) => {
        if (f === 'ALL') return;
        const key = Object.keys(GAME_CONFIG).find(k => GAME_CONFIG[k as keyof typeof GAME_CONFIG].gameType === f);
        if (key) router.push(`/leaderboard/${key}`);
    };

    const gameType = GAME_CONFIG[game].gameType;
    const activeClassName = GAME_COLOR[gameType]?.badgeActive ?? 'bg-gray-800 text-white border-gray-800';
    const myEntry = leaderboard.find(e => e.userId === session?.user?.id);
    const scoreLabel = config?.scoreLabel ?? GAME_CONFIG[game].scoreLabel;
    const label = config?.label ?? GAME_CONFIG[game].label;

    return (
        <div className="mx-auto max-w-7xl min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6 md:p-8">


                {/* Tabs → GameFilterPills */}
                <div className="mb-6">
                    <GameFilterPills
                        value={gameType}
                        onChange={handleGameChange}
                        showAll={false}
                        activeClassName={activeClassName}
                    />
                </div>

                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-3xl flex-shrink-0">
                        {GAME_CONFIG[game].icon}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leaderboard {label}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {pagination
                                ? `${pagination.total} joueur${pagination.total > 1 ? 's' : ''} classé${pagination.total > 1 ? 's' : ''}`
                                : 'Chargement…'
                            }
                        </p>
                    </div>
                </div>

                {/* Description / Rules / Score */}
                <div className="mb-6 space-y-2">
                    {(config?.description ?? GAME_CONFIG[game].description) && (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-5 py-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">🎮 Description</p>
                            <p className="text-sm text-gray-700 dark:text-gray-200" dangerouslySetInnerHTML={{ __html: config?.description ?? GAME_CONFIG[game].description }} />
                        </div>
                    )}
                    {(config?.rules ?? GAME_CONFIG[game].rules) && (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-5 py-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">📖 Règles</p>
                            <p className="text-sm text-gray-700 dark:text-gray-200" dangerouslySetInnerHTML={{ __html: config?.rules ?? GAME_CONFIG[game].rules }} />
                        </div>
                    )}
                    {(config?.score ?? GAME_CONFIG[game].score) && (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-5 py-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">📊 Calcul des points</p>
                            <p className="text-sm text-gray-700 dark:text-gray-200" dangerouslySetInnerHTML={{ __html: config?.score ?? GAME_CONFIG[game].score }} />
                        </div>
                    )}
                </div>

                {/* Ma position */}
                {myEntry && (
                    <div className="mb-6 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-5 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{MEDAL[myEntry.rank] ?? `#${myEntry.rank}`}</span>
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white">
                                    {myEntry.username} <span className="text-xs text-gray-400 font-normal">(moi)</span>
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{myEntry.detail}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-blue-700">{myEntry.score}</p>
                            <p className="text-xs text-gray-400">{scoreLabel}</p>
                        </div>
                    </div>
                )}

                {/* Tableau */}
                {initialLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <LoadingSpinner fullScreen={false} />
                        <p className="text-sm text-gray-400">Chargement du classement…</p>
                    </div>
                ) : leaderboard.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-4xl mb-3">🏜️</p>
                        <p className="text-gray-600 font-semibold">Aucune partie enregistrée</p>
                        <p className="text-gray-400 text-sm mt-1">Soyez le premier à jouer !</p>
                    </div>
                ) : (
                    <LoadingOverlay loading={refetching}>

                        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
                            <table className="w-full table-fixed divide-y divide-gray-100">
                                <colgroup>
                                    <col style={{ width: '72px' }} />
                                    <col style={{ width: '22%' }} />
                                    <col style={{ width: '16%' }} />
                                    <col />
                                </colgroup>
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rang</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Joueur</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{scoreLabel}</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Détail</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                                    {leaderboard.map(entry => {
                                        const isMe = entry.userId === session?.user?.id;
                                        const isPodium = entry.rank <= 3;
                                        return (
                                            <tr key={entry.userId}
                                                className={`transition-colors ${isMe ? 'bg-blue-50 dark:bg-blue-900/20 font-semibold' : isPodium ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {MEDAL[entry.rank]
                                                        ? <span className="text-xl">{MEDAL[entry.rank]}</span>
                                                        : <span className="text-sm text-gray-500 dark:text-gray-400 font-semibold">#{entry.rank}</span>
                                                    }
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap overflow-hidden">
                                                    <Link href={isMe ? '/dashboard' : `/profil/${entry.username}`}
                                                        className="text-sm font-medium hover:underline text-blue-600 dark:text-blue-400 truncate block">
                                                        {entry.username}
                                                    </Link>
                                                    {isMe && <span className="text-xs opacity-60">(moi)</span>}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                        {entry.score}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 hidden sm:table-cell">
                                                    <span className="text-xs text-gray-700 dark:text-gray-300">{entry.detail}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {pagination && pagination.totalPages > 1 && (
                            <>
                                <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-4">
                                    Page {page}/{pagination.totalPages} · {pagination.total} joueur{pagination.total > 1 ? 's' : ''}
                                </p>
                                <Pagination
                                    currentPage={page}
                                    totalPages={pagination.totalPages}
                                    onPageChange={setPage}
                                />
                            </>
                        )}
                    </LoadingOverlay>
                )}
            </div>
        </div>
    );
}
