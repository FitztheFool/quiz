// src/components/PlayerModal.tsx
'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';

const PLACEMENT_EMOJI: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

interface Player {
    username: string;
    score: number;
    placement: number | null;
    abandon?: boolean;
    afk?: boolean;
    isBot?: boolean;
}

interface PlayerModalProps {
    gameId: string;
    players: Player[];
    onClose: () => void;
}

export default function PlayerModal({ gameId, players, onClose }: PlayerModalProps) {
    const { data: session } = useSession();

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-80 max-w-full"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 dark:text-white">
                        👥 Joueurs de la partie
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
                    >
                        ×
                    </button>
                </div>
                <div className="space-y-2">
                    {players.map((p, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                            <div className="flex items-center gap-2">
                                <span className="text-base">
                                    {p.abandon ? '🚫' : p.afk ? '⏳' : p.placement != null ? (PLACEMENT_EMOJI[p.placement] ?? `#${p.placement}`) : ''}
                                </span>
                                {p.isBot ? (
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{p.username}</span>
                                ) : (
                                    <Link
                                        href={session?.user?.username === p.username ? '/dashboard' : `/user/${p.username}`}
                                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                        onClick={onClose}
                                    >
                                        {p.username}
                                    </Link>
                                )}
                            </div>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {p.score} <span className="text-xs text-gray-400 font-normal">pts</span>
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
