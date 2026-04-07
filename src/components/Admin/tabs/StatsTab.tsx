'use client';

import { useEffect, useRef, useState } from 'react';
import Pagination from '@/components/Pagination';
import GameFilterPills, { type GameFilter } from '@/components/GameFilterPills';
import GameStatCards from '@/components/GameStatCards';
import LoadingSpinner from '@/components/LoadingSpinner';
import ActivityTable from '@/components/ActivityTable';
import CollapseSection from '../CollapseSection';
import Link from 'next/link';
import StatChip from '@/components/StatChip';
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

export default function StatsTab({
    stats, loadingStats, loadingActivity,
    activityPeriod, setActivityPeriod,
    activityPage, onActivityPageChange,
    gameFilter, setGameFilter,
    activityUserQuery, setActivityUserQuery,
    onPlayerClick,
}: Props) {
    if (loadingStats && !stats) {
        return <div className="flex items-center justify-center py-16"><LoadingSpinner fullScreen={false} /></div>;
    }
    if (!stats) return null;

    return (
        <div id="admin-stats" className="scroll-mt-24 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatChip label="utilisateurs" value={stats.totals.users} />
                <StatChip label="quiz créés" value={stats.totals.quizzes} />
                <StatChip label="parties jouées" value={Object.values(stats.totals.gameStats).reduce((a, b) => a + b.count, 0)} />
                <StatChip label="points marqués" value={stats.totals.pointsScored} />
            </div>

            {Object.values(stats.totals.gameStats).some(v => v.count > 0) && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                    <CollapseSection title="Statistiques par jeu" defaultOpen>
                        <GameStatCards gameStats={stats.totals.gameStats} hideWinRate defaultExpanded />
                    </CollapseSection>
                </div>
            )}

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                <CollapseSection title="🏆 Quiz les plus joués" defaultOpen={false}>
                    <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                        <table className="w-full text-sm">
                            <thead className="bg-white dark:bg-gray-900">
                                <tr className="text-left">
                                    {['Quiz', 'Questions', 'Parties', 'Score moy.', 'Score max', 'Max possible'].map(h => (
                                        <th key={h} className="px-4 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-center first:text-left">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {stats.topQuizzes.map((quiz, i) => (
                                    <tr key={quiz.id} className="hover:bg-white dark:hover:bg-gray-900 transition-colors">
                                        <td className="px-4 py-2 font-medium">
                                            <Link href={`/quiz/${quiz.id}`} className="text-blue-600 dark:text-blue-400 hover:underline text-xs">{i + 1}. {quiz.title}</Link>
                                        </td>
                                        <td className="px-4 py-2 text-center text-xs text-gray-500 dark:text-gray-400">{quiz.questionCount}</td>
                                        <td className="px-4 py-2 text-center text-xs text-gray-700 dark:text-gray-300 font-semibold">{quiz.playCount}</td>
                                        <td className="px-4 py-2 text-center text-xs text-orange-600 dark:text-orange-400 font-semibold">{quiz.avgScore} pts</td>
                                        <td className="px-4 py-2 text-center text-xs text-green-600 dark:text-green-400 font-semibold">{quiz.maxScore} pts</td>
                                        <td className="px-4 py-2 text-center text-xs text-purple-600 dark:text-purple-400 font-semibold">{quiz.maxPossibleScore} pts</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CollapseSection>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                <CollapseSection title="🕐 Activité récente">
                    <div className="flex flex-wrap gap-2 items-center mb-3">
                        <select
                            value={activityPeriod}
                            onChange={e => setActivityPeriod(Number(e.target.value))}
                            className="text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg px-3 py-1.5 text-gray-600 dark:text-gray-300"
                        >
                            <option value={-1}>Aujourd'hui</option>
                            <option value={1}>Dernières 24h</option>
                            <option value={7}>7 derniers jours</option>
                            <option value={30}>30 derniers jours</option>
                            <option value={0}>Tout</option>
                        </select>

                        <div className="relative">
                            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none text-sm">🔍</span>
                            <input
                                type="text"
                                value={activityUserQuery}
                                onChange={e => setActivityUserQuery(e.target.value)}
                                placeholder="Filtrer par joueur…"
                                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg text-gray-700 dark:text-gray-300 w-48 focus:outline-none focus:ring-2 focus:ring-red-400"
                            />
                            {activityUserQuery && (
                                <button onClick={() => setActivityUserQuery('')} className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-base">×</button>
                            )}
                        </div>

                        {loadingActivity && <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />}

                        {stats.activityMeta && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                                {stats.activityMeta.totalGames} partie{stats.activityMeta.totalGames > 1 ? 's' : ''}
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
