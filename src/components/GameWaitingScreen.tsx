'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StarIcon } from '@heroicons/react/24/solid';
import GameIcon from './GameIcon';
import UserAvatar from './UserAvatar';

interface Player {
    userId: string;
    username: string;
    image?: string | null;
}

interface GameWaitingScreenProps {
    gameType: string;
    gameName: string;
    lobbyId: string;
    players: Player[];
    myUserId: string;
    hostId?: string;
}

export default function GameWaitingScreen({ gameType, gameName, lobbyId, players, myUserId, hostId }: GameWaitingScreenProps) {
    const router = useRouter();
    const [cachedPlayers] = useState<Player[]>(() => {
        try {
            const cached = sessionStorage.getItem(`lobby_players_${lobbyId}`);
            return cached ? JSON.parse(cached) : [];
        } catch { return []; }
    });

    useEffect(() => {
        if (players.length > 0) {
            sessionStorage.removeItem(`lobby_players_${lobbyId}`);
        }
    }, [players.length, lobbyId]);

    const displayPlayers = players.length > 0 ? players : cachedPlayers;

    return (
        <div
            className="min-h-dvh flex flex-col text-gray-900 dark:text-white overflow-hidden"
            style={{
                background: `
                    radial-gradient(circle at 50% 18%, rgba(220,38,38,0.10), transparent 55%),
                    radial-gradient(circle at 50% 92%, rgba(245,158,11,0.07), transparent 55%)
                `,
            }}
        >
            <style>{`
                @keyframes gws-fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes gws-ring { 0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.45), 0 8px 32px rgba(220,38,38,0.25); } 50% { box-shadow: 0 0 0 14px rgba(220,38,38,0), 0 8px 32px rgba(220,38,38,0.45); } }
                @keyframes gws-pulse-dot { 0%, 80%, 100% { opacity: 0.25; transform: scale(0.7); } 40% { opacity: 1; transform: scale(1); } }
                @keyframes gws-live { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
            `}</style>

            {/* Header */}
            <header className="shrink-0 h-14 border-b border-gray-200/60 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] backdrop-blur-sm px-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" style={{ animation: 'gws-live 1.6s ease-in-out infinite' }} />
                    <span className="text-[10px] font-black tracking-[0.3em] text-gray-500 dark:text-gray-400 uppercase">Kwizar</span>
                </div>
                <span className="text-xs text-gray-400 dark:text-white/40 tracking-widest uppercase font-bold">En attente</span>
            </header>

            {/* Main */}
            <main className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-sm flex flex-col items-center gap-7" style={{ animation: 'gws-fade-up 360ms ease-out' }}>

                    {/* Game icon with pulsing red ring */}
                    <div className="relative">
                        <div
                            className="w-24 h-24 rounded-3xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center"
                            style={{ animation: 'gws-ring 2s ease-in-out infinite' }}
                        >
                            <GameIcon gameType={gameType} className="w-12 h-12 text-white" />
                        </div>
                    </div>

                    {/* Title + game name + waiting dots */}
                    <div className="text-center">
                        <p className="text-xs font-bold tracking-[0.25em] uppercase text-gray-500 dark:text-gray-400 mb-1">{gameName}</p>
                        <h1 className="text-3xl font-black tracking-tight inline-flex items-baseline gap-1">
                            Démarrage
                            <span className="inline-flex items-end gap-0.5 ml-0.5 pb-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" style={{ animation: 'gws-pulse-dot 1.2s ease-in-out infinite' }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" style={{ animation: 'gws-pulse-dot 1.2s ease-in-out 0.2s infinite' }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" style={{ animation: 'gws-pulse-dot 1.2s ease-in-out 0.4s infinite' }} />
                            </span>
                        </h1>
                        <p className="text-gray-500 dark:text-white/50 text-sm mt-2">
                            {displayPlayers.length} joueur{displayPlayers.length > 1 ? 's' : ''} connecté{displayPlayers.length > 1 ? 's' : ''}
                        </p>
                    </div>

                    {/* Players list — avatars with stagger */}
                    {displayPlayers.length > 0 && (
                        <div className="w-full bg-white/80 dark:bg-white/[0.04] border border-gray-200/70 dark:border-white/[0.06] rounded-2xl overflow-hidden backdrop-blur-sm">
                            {displayPlayers.map((p, i) => (
                                <div
                                    key={p.userId}
                                    className={`flex items-center gap-3 px-4 py-3 ${i < displayPlayers.length - 1 ? 'border-b border-gray-100 dark:border-white/[0.04]' : ''}`}
                                    style={{ animation: `gws-fade-up 320ms ease-out ${i * 60}ms backwards` }}
                                >
                                    <UserAvatar
                                        seed={p.userId}
                                        name={p.username}
                                        image={p.image}
                                        size="md"
                                        shape="square"
                                        online
                                    />
                                    <span className="flex-1 text-sm font-semibold truncate">{p.username}</span>
                                    <div className="flex items-center gap-1.5">
                                        {hostId && p.userId === hostId && (
                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold tracking-wider uppercase bg-yellow-100 dark:bg-yellow-400/15 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full">
                                                <StarIcon className="w-3 h-3" /> host
                                            </span>
                                        )}
                                        {p.userId === myUserId && (
                                            <span className="text-[10px] font-bold tracking-wider uppercase bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/60 px-2 py-0.5 rounded-full">moi</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="w-full flex flex-col gap-2 mt-1">
                        <button
                            onClick={() => router.push(`/lobby/create/${lobbyId}`)}
                            className="w-full py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-sm hover:bg-gray-700 dark:hover:bg-gray-100 active:scale-[0.98] transition-all"
                        >
                            Retour au lobby
                        </button>
                        <button
                            onClick={() => router.push('/')}
                            className="w-full py-3 rounded-xl bg-white/60 dark:bg-white/[0.04] border border-gray-200/70 dark:border-white/[0.08] text-gray-500 dark:text-white/60 font-semibold text-sm hover:bg-gray-100 dark:hover:bg-white/[0.08] active:scale-[0.98] transition-all"
                        >
                            Quitter
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
