// src/components/GameStatCards.tsx
'use client';
import { useState } from 'react';
import { GAME_EMOJI_MAP, GAME_LABEL_MAP } from '@/lib/gameConfig';
import { GAME_COLOR } from '@/lib/gameColor';
import { plural } from '@/lib/utils';

interface GameStat {
    count: number;
    points: number;
    wins?: number;
    rounds?: number;
    correctAnswers?: number;
    totalAnswers?: number;
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

interface Props {
    gameStats: Record<string, GameStat>;
    ranks?: Record<string, number>;
    columns?: 4 | 6;
    hideWinRate?: boolean;
    defaultExpanded?: boolean;
}

function fmt(n: number) {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function getSecondaryStat(type: string, stat: GameStat, hideWinRate = false): { value: string | number; label: string } {
    const { points, count, wins = 0 } = stat;
    const avg = count > 0 ? Math.round(points / count) : 0;

    switch (type) {
        case 'SKYJOW':
            return { value: fmt(avg), label: 'moy/partie' };
        case 'YAHTZEE':
        case 'DIAMANT':
            return { value: fmt(avg), label: 'moy/partie' };
        case 'JUST_ONE': {
            const { correctAnswers = 0, count } = stat;
            const avg = count > 0 ? (correctAnswers / count).toFixed(1) : '0';
            return { value: `${avg}/13`, label: 'moy. bonnes rép.' };
        }
        case 'PUISSANCE4':
        case 'BATTLESHIP':
            if (hideWinRate) return { value: '', label: '' };
            return { value: wins, label: plural(wins, 'victoire', 'victoires') };
        case 'QUIZ': {
            const { correctAnswers = 0, totalAnswers = 0 } = stat;
            const avgCorrect = count > 0 ? Math.round(correctAnswers / count) : 0;
            const avgTotal = count > 0 ? Math.round(totalAnswers / count) : 0;
            return { value: `${avgCorrect}/${avgTotal}`, label: 'moy. bonnes rép.' };
        }
        default:
            return { value: fmt(points), label: 'pts' };
    }
}

function getBar(type: string, stat: GameStat): { pct: number; label: string; wins: number | null; color: string } | null {
    const { count, wins = 0, correctAnswers = 0, totalAnswers = 0 } = stat;
    if (count === 0) return null;

    if (type === 'QUIZ') {
        if (totalAnswers === 0) return null;
        const pct = Math.round((correctAnswers / totalAnswers) * 100);
        const color = pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';
        const NO_WINS_COUNTER = new Set(['PUISSANCE4', 'BATTLESHIP']);
        return { pct, label: `${pct}% vict.`, wins: NO_WINS_COUNTER.has(type) ? null : wins, color };
    }

    const NO_WINRATE = new Set(['JUST_ONE']);
    if (NO_WINRATE.has(type)) return null;

    const pct = Math.round((wins / count) * 100);
    const color = pct >= 60 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500';
    const NO_WINS_COUNTER = new Set(['PUISSANCE4', 'BATTLESHIP']);
    return { pct, label: `${pct}% vict.`, wins: NO_WINS_COUNTER.has(type) ? null : wins, color };
}

const PAGE = 4;

export default function GameStatCards({ gameStats, ranks = {}, hideWinRate = false, defaultExpanded = false }: Props) {
    const [visibleCount, setVisibleCount] = useState(() => defaultExpanded ? Infinity : PAGE);

    if (Object.keys(gameStats).length === 0) {
        return <p className="text-gray-400 dark:text-gray-500 text-sm">Aucune statistique disponible.</p>;
    }

    const sorted = Object.entries(gameStats).sort((a, b) => b[1].count - a[1].count);
    const visible = sorted.slice(0, visibleCount === Infinity ? sorted.length : visibleCount);

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {visible.map(([type, stat]) => {
                    const c = GAME_COLOR[type]?.card ?? {
                        border: 'border-gray-200 dark:border-gray-700',
                        bg: 'bg-gray-50 dark:bg-gray-800/50',
                        label: 'text-gray-600 dark:text-gray-400',
                    };
                    const secondary = getSecondaryStat(type, stat, hideWinRate);
                    const bar = hideWinRate ? null : getBar(type, stat);

                    const medal = MEDAL[ranks[type]];
                    return (
                        <div key={type} className={`rounded-xl border ${c.border} ${c.bg} p-3`}>
                            {/* Header */}
                            <div className="flex items-center justify-between gap-1 mb-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-base leading-none">{GAME_EMOJI_MAP[type] ?? '🎮'}</span>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider truncate ${c.label}`}>
                                        {GAME_LABEL_MAP[type] ?? type}
                                    </span>
                                    {medal && <span className="text-sm leading-none shrink-0">{medal}</span>}
                                </div>
                                {bar && (
                                    <span className={`text-xs font-bold shrink-0 ${c.label}`}>{bar.label}</span>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="flex items-end justify-between gap-3">
                                <div className="flex items-end gap-3">
                                    <div>
                                        <div className="text-xl font-bold text-gray-900 dark:text-white leading-none">{stat.count}</div>
                                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                                            {type === 'TABOO' && stat.rounds && stat.rounds > 0
                                                ? `parties · ${stat.rounds}m`
                                                : `partie${stat.count > 1 ? 's' : ''}`}
                                        </div>
                                    </div>
                                    <div className="w-px self-stretch bg-gray-200 dark:bg-gray-700" />
                                    <div>
                                        <div className="text-xl font-bold text-gray-900 dark:text-white leading-none">{secondary.value}</div>
                                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{secondary.label}</div>
                                    </div>
                                </div>
                                {bar?.wins !== null && bar?.wins !== undefined && (
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-gray-900 dark:text-white leading-none">{bar.wins}</div>
                                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{plural(bar.wins, 'victoire', 'victoires')}</div>
                                    </div>
                                )}
                            </div>

                            {/* Bar */}
                            {bar && (
                                <div className="mt-2.5 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${bar.color} transition-all`} style={{ width: `${bar.pct}%` }} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex gap-4">
                {!defaultExpanded && visibleCount < sorted.length && (
                    <button
                        onClick={() => setVisibleCount(v => v + PAGE)}
                        className="text-xs text-gray-400 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        Afficher plus ({visibleCount}/{sorted.length}) ↓
                    </button>
                )}
                {!defaultExpanded && visibleCount > PAGE && (
                    <button
                        onClick={() => setVisibleCount(v => v - PAGE)}
                        className="text-xs text-gray-400 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        Afficher moins ↑
                    </button>
                )}
            </div>
        </div>
    );
}
