// src/components/GameStatCards.tsx
'use client';
import { GAME_EMOJI_MAP, GAME_LABEL_MAP, GAME_COLOR } from '@/lib/gameConfig';

interface GameStat {
    count: number;
    points: number;
    wins?: number;
    rounds?: number;
    correctAnswers?: number;
    totalAnswers?: number;
}

interface Props {
    gameStats: Record<string, GameStat>;
    columns?: 4 | 6;
}

function fmt(n: number) {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function getSecondaryStat(type: string, stat: GameStat): { value: string | number; label: string } {
    const { points, count, wins = 0 } = stat;
    const avg = count > 0 ? Math.round(points / count) : 0;

    switch (type) {
        case 'SKYJOW':
        case 'YAHTZEE':
        case 'DIAMANT':
            return { value: fmt(avg), label: 'moy/partie' };
        case 'JUST_ONE':
            return { value: `${avg}/13`, label: 'moy/partie' };
        case 'PUISSANCE4':
        case 'BATTLESHIP':
            return { value: wins, label: wins === 1 ? 'victoire' : 'victoires' };
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
        return { pct, label: `${pct}% exact.`, wins: null, color };
    }

    const NO_WINRATE = new Set(['YAHTZEE', 'DIAMANT', 'JUST_ONE']);
    if (NO_WINRATE.has(type)) return null;

    const pct = Math.round((wins / count) * 100);
    const color = pct >= 60 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500';
    const NO_WINS_COUNTER = new Set(['PUISSANCE4', 'BATTLESHIP']);
    return { pct, label: `${pct}% vict.`, wins: NO_WINS_COUNTER.has(type) ? null : wins, color };
}

export default function GameStatCards({ gameStats }: Props) {
    if (Object.keys(gameStats).length === 0) {
        return <p className="text-gray-400 dark:text-gray-500 text-sm">Aucune statistique disponible.</p>;
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(gameStats)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([type, stat]) => {
                    const c = GAME_COLOR[type]?.card ?? {
                        border: 'border-gray-200 dark:border-gray-700',
                        bg: 'bg-gray-50 dark:bg-gray-800/50',
                        label: 'text-gray-600 dark:text-gray-400',
                    };
                    const secondary = getSecondaryStat(type, stat);
                    const bar = getBar(type, stat);

                    return (
                        <div key={type} className={`rounded-xl border ${c.border} ${c.bg} p-3`}>
                            {/* Header */}
                            <div className="flex items-center justify-between gap-1 mb-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-base leading-none">{GAME_EMOJI_MAP[type] ?? '🎮'}</span>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider truncate ${c.label}`}>
                                        {GAME_LABEL_MAP[type] ?? type}
                                    </span>
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
                                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{bar.wins === 1 ? 'victoire' : 'victoires'}</div>
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
    );
}
