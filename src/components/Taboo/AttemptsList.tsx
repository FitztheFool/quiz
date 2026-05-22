import type { RefObject } from 'react';

export interface Attempt { word: string; userId: string; username: string }

interface Props {
    attempts: Attempt[];
    refEl?: RefObject<HTMLDivElement>;
}

export default function AttemptsList({ attempts, refEl }: Props) {
    if (attempts.length === 0) return (
        <p className="text-gray-400 dark:text-white/20 text-xs text-center py-2">Aucune tentative…</p>
    );
    return (
        <div className="space-y-1 max-h-40 overflow-y-auto w-full">
            {attempts.map((a, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/60">
                    <span className="font-mono font-bold">{a.word}</span>
                    <span className="text-xs opacity-50">{a.username}</span>
                </div>
            ))}
            {refEl && <div ref={refEl} />}
        </div>
    );
}
