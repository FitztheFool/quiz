// src/components/GameStatCards.tsx
'use client';
import { GAME_EMOJI_MAP, GAME_LABEL_MAP, GAME_COLOR } from '@/lib/gameConfig';

interface GameStat {
    count: number;
    points: number;
    wins?: number;
    rounds?: number;
}

interface Props {
    gameStats: Record<string, GameStat>;
    columns?: 4 | 6;
}


export default function GameStatCards({ gameStats }: Props) {
    if (Object.keys(gameStats).length === 0) {
        return <p className="text-gray-400 dark:text-gray-500 text-sm">Aucune statistique disponible.</p>;
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(gameStats)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([type, { count, points, wins, rounds }]) => {
                    const c = GAME_COLOR[type]?.card ?? {
                        border: 'border-gray-200 dark:border-gray-700',
                        bg: 'bg-gray-50 dark:bg-gray-800/50',
                        label: 'text-gray-600 dark:text-gray-400',
                    };
                    const NO_WINRATE = new Set(['QUIZ', 'YAHTZEE', 'DIAMANT', 'JUST_ONE']);
                    const pct = wins !== undefined && count > 0 && !NO_WINRATE.has(type)
                        ? Math.round((wins / count) * 100)
                        : null;
                    const barColor = pct !== null
                        ? pct >= 60 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                        : '';

                    return (
                        <div key={type} className={`rounded-xl border ${c.border} ${c.bg} p-3`}>
                            {/* Header: emoji + label + % */}
                            <div className="flex items-center justify-between gap-1 mb-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-base leading-none">{GAME_EMOJI_MAP[type] ?? '🎮'}</span>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider truncate ${c.label}`}>
                                        {GAME_LABEL_MAP[type] ?? type}
                                    </span>
                                </div>
                                {pct !== null && (
                                    <span className={`text-xs font-bold shrink-0 ${c.label}`}>{pct}%</span>
                                )}
                            </div>

                            {/* Stats: count | points */}
                            <div className="flex items-end gap-3">
                                <div>
                                    <div className="text-xl font-bold text-gray-900 dark:text-white leading-none">{count}</div>
                                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                                        partie{count > 1 ? 's' : ''}
                                        {type === 'TABOO' && rounds !== undefined && rounds > 0 ? ` · ${rounds}m` : ''}
                                    </div>
                                </div>
                                <div className="w-px self-stretch bg-gray-200 dark:bg-gray-700" />
                                <div>
                                    <div className="text-xl font-bold text-gray-900 dark:text-white leading-none">{points >= 1000 ? `${(points / 1000).toFixed(1)}k` : points}</div>
                                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">pts</div>
                                </div>
                            </div>

                            {/* Win % bar */}
                            {pct !== null && (
                                <div className="mt-2.5 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                                </div>
                            )}
                        </div>
                    );
                })}
        </div>
    );
}
