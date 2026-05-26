// src/components/PlayerModal.tsx
'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { UsersIcon, XMarkIcon, NoSymbolIcon, ClockIcon, CpuChipIcon } from '@heroicons/react/24/outline';

function RankBadge({ placement }: { placement: number }) {
    if (placement === 1) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-bold">1</span>;
    if (placement === 2) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs font-bold">2</span>;
    if (placement === 3) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-bold">3</span>;
    return <span className="text-xs text-gray-400 font-semibold">#{placement}</span>;
}

interface Player {
    username: string;
    score: number;
    placement: number | null;
    team?: number | null;
    abandon?: boolean;
    afk?: boolean;
    isBot?: boolean;
}

const TEAM_LABEL: Record<number, string> = { 0: 'Ambre', 1: 'Verte' };
const TEAM_DOT: Record<number, string> = { 0: 'bg-primary-500', 1: 'bg-felt-600' };

function TeamBadge({ team }: { team: number }) {
    return (
        <span title={`Équipe ${TEAM_LABEL[team] ?? team}`} className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-full px-1.5 py-0.5">
            <span className={`w-2 h-2 rounded-full ${TEAM_DOT[team] ?? 'bg-gray-400'}`} />{TEAM_LABEL[team] ?? `Éq. ${team}`}
        </span>
    );
}

interface PlayerModalProps {
    gameId: string;
    players: Player[];
    onClose: () => void;
}

export default function PlayerModal({ gameId, players, onClose }: PlayerModalProps) {
    const { data: session } = useSession();

    // Recalcule les placements côté client en gérant les ex-æquo
    // Règle : même score = même rang, le rang suivant est sauté (1, 1, 3...)
    const activePlayers = players.filter(x => !x.abandon && !x.afk && x.placement != null);

    const playersWithRank = players
        .map((p) => {
            if (p.abandon || p.afk || p.placement == null) return p;

            // Rang = nombre de joueurs actifs avec un score strictement supérieur + 1
            const rank = activePlayers.filter(x => x.score > p.score).length + 1;

            return { ...p, placement: rank };
        })
        .sort((a, b) => {
            const aOut = a.abandon || a.afk;
            const bOut = b.abandon || b.afk;
            if (aOut !== bOut) return aOut ? 1 : -1;
            const ap = a.placement ?? Number.MAX_SAFE_INTEGER;
            const bp = b.placement ?? Number.MAX_SAFE_INTEGER;
            if (ap !== bp) return ap - bp;
            return b.score - a.score;
        });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-80 max-w-full" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <UsersIcon className="w-4 h-4" />
                        Joueurs de la partie
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>
                <div className="space-y-2">
                    {playersWithRank.map((p, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                            <div className="flex items-center gap-2">
                                <span className="flex items-center">
                                    {p.abandon
                                        ? <NoSymbolIcon className="w-4 h-4 text-gray-400" />
                                        : p.afk
                                            ? <ClockIcon className="w-4 h-4 text-gray-400" />
                                            : p.placement != null
                                                ? <RankBadge placement={p.placement} />
                                                : null
                                    }
                                </span>
                                {p.isBot ? (
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        {p.username}
                                        <CpuChipIcon className="w-3 h-3 text-gray-400" />
                                    </span>
                                ) : (
                                    <Link
                                        href={session?.user?.username === p.username ? '/dashboard' : `/user/${p.username}`}
                                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                        onClick={onClose}
                                    >
                                        {p.username}
                                    </Link>
                                )}
                                {p.team != null && <TeamBadge team={p.team} />}
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
