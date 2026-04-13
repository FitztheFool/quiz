'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Player {
    userId: string;
    username: string;
}

interface GameWaitingScreenProps {
    icon: string;
    gameName: string;
    lobbyId: string;
    players: Player[];
    myUserId: string;
    hostId?: string;
}

export default function GameWaitingScreen({ icon, gameName, lobbyId, players, myUserId, hostId }: GameWaitingScreenProps) {
    const router = useRouter();
    const [cachedPlayers, setCachedPlayers] = useState<Player[]>([]);

    useEffect(() => {
        const cached = sessionStorage.getItem(`lobby_players_${lobbyId}`);
        if (cached) {
            try { setCachedPlayers(JSON.parse(cached)); } catch { /* ignore */ }
        }
    }, [lobbyId]);

    useEffect(() => {
        if (players.length > 0) {
            sessionStorage.removeItem(`lobby_players_${lobbyId}`);
        }
    }, [players.length, lobbyId]);

    const displayPlayers = players.length > 0 ? players : cachedPlayers;

    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
            {/* Header */}
            <header className="shrink-0 h-14 border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm px-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xl">{icon}</span>
                    <span className="font-semibold">{gameName}</span>
                </div>
                <span className="text-xs text-gray-400 dark:text-white/40 tracking-widest uppercase">En attente</span>
            </header>

            {/* Main */}
            <main className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-sm flex flex-col items-center gap-6">

                    {/* Spinner */}
                    <div className="w-16 h-16 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center shadow-sm">
                        <svg className="w-7 h-7 text-gray-400 dark:text-white/40 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    </div>

                    {/* Title */}
                    <div className="text-center">
                        <h1 className="text-2xl font-bold tracking-tight">Démarrage…</h1>
                        <p className="text-gray-500 dark:text-white/50 text-sm mt-1">
                            {displayPlayers.length} joueur{displayPlayers.length > 1 ? 's' : ''} connecté{displayPlayers.length > 1 ? 's' : ''}
                        </p>
                    </div>

                    {/* Players list */}
                    {displayPlayers.length > 0 && (
                        <div className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden">
                            {displayPlayers.map((p, i) => (
                                <div
                                    key={p.userId}
                                    className={`flex items-center gap-3 px-4 py-3 ${i < displayPlayers.length - 1 ? 'border-b border-gray-100 dark:border-white/5' : ''}`}
                                >
                                    <span className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 shrink-0" />
                                    <span className="flex-1 text-sm font-medium truncate">{p.username}</span>
                                    <div className="flex items-center gap-1.5">
                                        {hostId && p.userId === hostId && (
                                            <span className="text-xs bg-yellow-100 dark:bg-yellow-400/20 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full">host</span>
                                        )}
                                        {p.userId === myUserId && (
                                            <span className="text-xs bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-white/50 px-2 py-0.5 rounded-full">moi</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="w-full flex flex-col gap-2">
                        <button
                            onClick={() => router.push(`/lobby/create/${lobbyId}`)}
                            className="w-full py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-sm hover:bg-gray-700 dark:hover:bg-gray-100 transition"
                        >
                            Retour au lobby
                        </button>
                        <button
                            onClick={() => router.push('/')}
                            className="w-full py-3 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/60 font-semibold text-sm hover:bg-gray-200 dark:hover:bg-white/10 transition"
                        >
                            Quitter
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
