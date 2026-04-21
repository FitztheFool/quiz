// src/components/GameScoreLeaderboard.tsx
import { NoSymbolIcon, ClockIcon } from '@heroicons/react/24/outline';

function RankBadge({ rank }: { rank: number }) {
    if (rank === 0) return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-bold">1</span>
    );
    if (rank === 1) return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs font-bold">2</span>
    );
    if (rank === 2) return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-200 dark:bg-orange-900/50 text-orange-800 dark:text-orange-400 text-xs font-bold">3</span>
    );
    return <span className="inline-flex items-center justify-center w-7 h-7 text-xs font-semibold text-gray-400">{rank + 1}</span>;
}

export interface GameScoreEntry {
    userId: string;
    username: string;
    score: string;
    subScore?: string;
    badges?: string[];
    disqualified?: boolean;
}

export default function GameScoreLeaderboard({ entries, myUserId }: { entries: GameScoreEntry[]; myUserId: string }) {
    let rankIndex = 0;
    return (
        <div className="space-y-2">
            {entries.map((p) => {
                const isFirst = !p.disqualified && rankIndex === 0;
                const rank = p.disqualified ? null : rankIndex++;
                return (
                    <div
                        key={p.userId}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                            isFirst
                                ? 'bg-amber-400/20 border-amber-400/50'
                                : p.disqualified
                                    ? 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60'
                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            {p.disqualified ? (
                                p.badges?.includes('AFK')
                                    ? <ClockIcon className="w-5 h-5 text-gray-400" />
                                    : <NoSymbolIcon className="w-5 h-5 text-gray-400" />
                            ) : (
                                <RankBadge rank={rank!} />
                            )}
                            <span className={`font-bold ${p.userId === myUserId ? 'text-amber-600 dark:text-amber-300' : 'text-gray-800 dark:text-white'}`}>
                                {p.username}{p.userId === myUserId && ' (moi)'}
                            </span>
                            {p.badges?.map((badge) => (
                                <span key={badge} className={`text-xs px-1.5 py-0.5 rounded ${
                                    badge === 'AFK' ? 'bg-red-500/30 text-red-400' : 'bg-orange-500/30 text-orange-400'
                                }`}>{badge}</span>
                            ))}
                        </div>
                        <div className="text-right">
                            <span className={`font-black text-xl ${isFirst ? 'text-amber-500 dark:text-amber-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                {p.score}
                            </span>
                            {p.subScore && <div className="text-xs text-gray-400 dark:text-gray-500 font-normal mt-0.5">{p.subScore}</div>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
