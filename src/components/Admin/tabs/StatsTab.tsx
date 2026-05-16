'use client';

import { useEffect, useRef, useState } from 'react';
import {
    MagnifyingGlassIcon,
    UsersIcon,
    PuzzlePieceIcon,
    TrophyIcon,
    StarIcon,
    XMarkIcon,
    Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { plural } from '@/lib/utils';
import Pagination from '@/components/Pagination';
import GameFilterPills, { type GameFilter } from '@/components/GameFilterPills';
import GameStatCards from '@/components/GameStatCards';
import LoadingSpinner from '@/components/LoadingSpinner';
import ActivityTable from '@/components/ActivityTable';
import CollapseSection from '../CollapseSection';
import Link from 'next/link';
import type { AdminStats } from '../types';

interface Props {
    stats: AdminStats | null;
    loadingStats: boolean;
    loadingActivity: boolean;
    activityPeriod: number;
    setActivityPeriod: (v: number) => void;
    activityPage: number;
    onActivityPageChange: (p: number) => void;
    gameFilter: GameFilter;
    setGameFilter: (f: GameFilter) => void;
    activityUserQuery: string;
    setActivityUserQuery: (q: string) => void;
    onPlayerClick: (row: any) => void;
}

const STAT_CARDS: { key: string; label: (n: number) => string; icon: React.FC<{ className?: string }>; color: string; bg: string }[] = [
    { key: 'users',   label: n => plural(n, 'Utilisateur', 'Utilisateurs'),  icon: UsersIcon,       color: 'text-blue-500   dark:text-blue-400',   bg: 'bg-blue-50   dark:bg-blue-900/20' },
    { key: 'quizzes', label: n => plural(n, 'Quiz créé', 'Quiz créés'),       icon: PuzzlePieceIcon, color: 'text-violet-500 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' },
    { key: 'games',   label: n => plural(n, 'Partie jouée', 'Parties jouées'),icon: TrophyIcon,      color: 'text-amber-500  dark:text-amber-400',  bg: 'bg-amber-50  dark:bg-amber-900/20' },
    { key: 'points',  label: n => plural(n, 'Point marqué', 'Points marqués'),icon: StarIcon,        color: 'text-green-500  dark:text-green-400',  bg: 'bg-green-50  dark:bg-green-900/20' },
    { key: 'gameTypes', label: n => plural(n, 'Jeu disponible', 'Jeux disponibles'), icon: Squares2X2Icon, color: 'text-pink-500 dark:text-pink-400', bg: 'bg-pink-50 dark:bg-pink-900/20' },
];

export default function StatsTab({
    stats, loadingStats, loadingActivity,
    activityPeriod, setActivityPeriod,
    activityPage, onActivityPageChange,
    gameFilter, setGameFilter,
    activityUserQuery, setActivityUserQuery,
    onPlayerClick,
}: Props) {
    if (loadingStats && !stats) {
        return <div className="flex items-center justify-center py-20"><LoadingSpinner fullScreen={false} message="Chargement..." /></div>;
    }
    if (!stats) return null;

    const totalGames = Object.values(stats.totals.gameStats).reduce((a, b) => a + b.count, 0);

    const statValues: Record<string, number> = {
        users: stats.totals.users,
        quizzes: stats.totals.quizzes,
        games: totalGames,
        points: stats.totals.pointsScored,
        gameTypes: Object.values(stats.totals.gameStats).filter(v => v.count > 0).length,
    };

    return (
        <div id="admin-stats" className="scroll-mt-24 space-y-5">

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {STAT_CARDS.map(({ key, label, icon: Icon, color, bg }) => (
                    <div key={key} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label(statValues[key])}</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 tabular-nums">
                                    {statValues[key].toLocaleString('fr-FR')}
                                </p>
                            </div>
                            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                                <Icon className={`w-5 h-5 ${color}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Stats par jeu */}
            {Object.values(stats.totals.gameStats).some(v => v.count > 0) && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                    <CollapseSection title="Statistiques par jeu" defaultOpen={false}>
                        <GameStatCards gameStats={stats.totals.gameStats} hideWinRate defaultExpanded />
                    </CollapseSection>
                </div>
            )}

            {/* Top quiz */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                <CollapseSection title="Quiz les plus joués" defaultOpen={false}>
                    <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700 mt-1">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900 text-left">
                                    {['Quiz', 'Questions', 'Parties', 'Score moy.', 'Score max', 'Max possible'].map(h => (
                                        <th key={h} className="px-4 py-2.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider first:text-left text-center">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {stats.topQuizzes.map((quiz, i) => (
                                    <tr key={quiz.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-4 py-2.5 font-medium">
                                            <Link href={`/quiz/${quiz.id}`} className="text-blue-600 dark:text-blue-400 hover:underline text-xs">{i + 1}. {quiz.title}</Link>
                                        </td>
                                        <td className="px-4 py-2.5 text-center text-xs text-gray-500 dark:text-gray-400 tabular-nums">{quiz.questionCount}</td>
                                        <td className="px-4 py-2.5 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 tabular-nums">{quiz.playCount}</td>
                                        <td className="px-4 py-2.5 text-center text-xs font-semibold text-amber-600 dark:text-amber-400 tabular-nums">{quiz.avgScore} pts</td>
                                        <td className="px-4 py-2.5 text-center text-xs font-semibold text-green-600 dark:text-green-400 tabular-nums">{quiz.maxScore} pts</td>
                                        <td className="px-4 py-2.5 text-center text-xs font-semibold text-violet-600 dark:text-violet-400 tabular-nums">{quiz.maxPossibleScore} pts</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CollapseSection>
            </div>

            {/* Activité */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                <CollapseSection title="Activité récente">
                    <div className="flex flex-wrap gap-2 items-center mb-3">
                        <select
                            value={activityPeriod}
                            onChange={e => setActivityPeriod(Number(e.target.value))}
                            className="text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg px-3 py-1.5 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-400"
                        >
                            <option value={-1}>Aujourd'hui</option>
                            <option value={1}>Dernières 24h</option>
                            <option value={7}>7 derniers jours</option>
                            <option value={30}>30 derniers jours</option>
                            <option value={0}>Tout</option>
                        </select>

                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute inset-y-0 left-2.5 my-auto w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                value={activityUserQuery}
                                onChange={e => setActivityUserQuery(e.target.value)}
                                placeholder="Filtrer par joueur…"
                                className="pl-8 pr-8 py-1.5 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg text-gray-700 dark:text-gray-300 w-44 focus:outline-none focus:ring-2 focus:ring-red-400"
                            />
                            {activityUserQuery && (
                                <button onClick={() => setActivityUserQuery('')} className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                    <XMarkIcon className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {loadingActivity && <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-red-500" />}

                        {stats.activityMeta && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto tabular-nums">
                                {stats.activityMeta.totalGames.toLocaleString('fr-FR')} partie{stats.activityMeta.totalGames > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    <div className="mb-3">
                        <GameFilterPills
                            value={gameFilter}
                            onChange={setGameFilter}
                            activeClassName="bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white"
                            inactiveClassName="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                        />
                    </div>

                    <ActivityTable rows={stats.recentActivity} variant="admin" onPlayerClick={onPlayerClick} />

                    {stats.activityMeta?.totalPages > 1 && (
                        <Pagination currentPage={activityPage} totalPages={stats.activityMeta.totalPages} onPageChange={onActivityPageChange} />
                    )}
                </CollapseSection>
            </div>
        </div>
    );
}
