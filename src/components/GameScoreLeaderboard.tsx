// src/components/GameScoreLeaderboard.tsx

const MEDAL: Record<number, string> = { 0: '🥇', 1: '🥈', 2: '🥉' };

export interface GameScoreEntry {
    userId: string;
    username: string;
    score: string;
    badges?: string[];
    disqualified?: boolean;
}

export default function GameScoreLeaderboard({
    entries,
    myUserId,
}: {
    entries: GameScoreEntry[];
    myUserId: string;
}) {
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
                            <span className="text-2xl">
                                {p.disqualified ? '🚫' : (MEDAL[rank!] ?? `${rank! + 1}.`)}
                            </span>
                            <span className={`font-bold ${p.userId === myUserId ? 'text-amber-600 dark:text-amber-300' : 'text-gray-800 dark:text-white'}`}>
                                {p.username}{p.userId === myUserId && ' (moi)'}
                            </span>
                            {p.badges?.map((badge) => (
                                <span key={badge} className={`text-xs px-1.5 py-0.5 rounded ${
                                    badge === 'AFK'
                                        ? 'bg-red-500/30 text-red-400'
                                        : 'bg-orange-500/30 text-orange-400'
                                }`}>{badge}</span>
                            ))}
                        </div>
                        <span className={`font-black text-xl ${isFirst ? 'text-amber-500 dark:text-amber-400' : 'text-gray-600 dark:text-gray-300'}`}>
                            {p.score}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
