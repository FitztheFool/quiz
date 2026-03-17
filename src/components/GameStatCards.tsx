'use client';
import { GAME_EMOJI_MAP } from '@/lib/gameConfig';

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

const GAME_BADGE: Record<string, string> = {
    QUIZ: 'bg-blue-100   dark:bg-blue-900/40   text-blue-700   dark:text-blue-400',
    UNO: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',
    TABOO: 'bg-red-100    dark:bg-red-900/40    text-red-700    dark:text-red-400',
    SKYJOW: 'bg-sky-100    dark:bg-sky-900/40    text-sky-700    dark:text-sky-400',
    YAHTZEE: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
    PUISSANCE4: 'bg-rose-100   dark:bg-rose-900/40   text-rose-700   dark:text-rose-400',
};

export default function GameStatCards({ gameStats, columns = 4 }: Props) {
    if (Object.keys(gameStats).length === 0) {
        return <p className="text-gray-500 dark:text-gray-400 text-sm">Aucune statistique disponible.</p>;
    }

    const pct = columns === 6 ? '16.666%' : '25%';

    return (
        <div className="flex flex-wrap justify-center gap-3">
            {Object.entries(gameStats)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([type, { count, points, wins, rounds }]) => (
                    <div
                        key={type}
                        className={`${GAME_BADGE[type] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'} border rounded-xl p-3.5 flex items-center gap-3.5`}
                        style={{ width: `calc(${pct} - 10px)`, minWidth: 180 }}
                    >
                        <div className="text-2xl flex-shrink-0">{GAME_EMOJI_MAP[type] ?? '🎮'}</div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold uppercase tracking-widest opacity-70 mb-1.5">{type}</div>
                            <div className="flex items-center gap-3">

                                {/* Colonne gauche : parties + manches pour Taboo */}
                                <div>
                                    <div className="text-lg font-bold tabular-nums leading-none">{count.toLocaleString()}</div>
                                    <div className="text-[11px] opacity-60 mt-0.5">parties</div>
                                    {type === 'TABOO' && rounds !== undefined && rounds > 0 && (
                                        <>
                                            <div className="text-lg font-bold tabular-nums leading-none mt-1">{rounds.toLocaleString()}</div>
                                            <div className="text-[11px] opacity-60 mt-0.5">manches</div>
                                        </>
                                    )}
                                </div>

                                <div className="w-px self-stretch opacity-20 bg-current" />

                                {/* Colonne droite : points + % victoires */}
                                <div>
                                    <div className="text-lg font-bold tabular-nums leading-none">{points.toLocaleString()}</div>
                                    <div className="text-[11px] opacity-60 mt-0.5">points</div>
                                    {wins !== undefined && count > 0 && (
                                        <div className={`text-xs font-bold mt-1 ${wins / count >= 0.6
                                            ? 'text-green-400'
                                            : wins / count >= 0.4
                                                ? 'text-yellow-400'
                                                : 'text-red-400'
                                            }`}>
                                            {Math.round((wins / count) * 100)}% victoires
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    </div>
                ))}
        </div>
    );
}
